import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from './utils/api';



interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  image: string;
  // Discount tracking
  itemTotal?: number;
  discountAmount?: number;
  finalPaidAmount?: number;
}

interface Sale {
  _id: string;
  items: SaleItem[];
  total: number;
  paymentMethod: string;
  timestamp: string;
  discountAmount?: number;
}

interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;  // Original unit price
  finalPaidPrice: number;  // Discounted unit price (for refund)
  maxQuantity: number;
}

export default function ReturnScreen() {
  const router = useRouter();
  const { saleId } = useLocalSearchParams<{ saleId: string }>();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadSaleAndReturns();
  }, [saleId]);

  const loadSaleAndReturns = async () => {
    try {
      const [saleRes, returnsRes] = await Promise.all([
        api.get(`/api/sales/${saleId}`),
        api.get(`/api/returns/by-sale/${saleId}`)
      ]);
      
      const saleData = saleRes.data;
      const existingReturns = returnsRes.data;
      
      // Calculate already returned quantities
      const returnedQuantities: Record<string, number> = {};
      existingReturns.forEach((ret: any) => {
        ret.items.forEach((item: any) => {
          returnedQuantities[item.productId] = (returnedQuantities[item.productId] || 0) + item.quantity;
        });
      });
      
      // Initialize return items with available quantities
      // Use finalPaidAmount for refund calculation (respects discount)
      const items: ReturnItem[] = saleData.items.map((item: SaleItem) => {
        const remainingQty = item.quantity - (returnedQuantities[item.productId] || 0);
        // Calculate per-unit final paid price
        const finalPaidPrice = item.finalPaidAmount 
          ? item.finalPaidAmount / item.quantity 
          : item.price;  // Fallback to original price if no discount
        
        return {
          productId: item.productId,
          productName: item.productName,
          quantity: 0,
          price: item.price,  // Original price (for display)
          finalPaidPrice: finalPaidPrice,  // Discounted price (for refund)
          maxQuantity: remainingQty
        };
      }).filter((item: ReturnItem) => item.maxQuantity > 0);
      
      setSale(saleData);
      setReturnItems(items);
    } catch (error) {
      console.error('Error loading sale:', error);
      Alert.alert('Error', 'Failed to load sale details');
    } finally {
      setLoading(false);
    }
  };

  const updateReturnQuantity = (productId: string, change: number) => {
    setReturnItems(items =>
      items.map(item => {
        if (item.productId === productId) {
          const newQty = Math.max(0, Math.min(item.maxQuantity, item.quantity + change));
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const calculateReturnTotal = () => {
    // Use finalPaidPrice (discounted) for refund calculation
    return returnItems.reduce((sum, item) => sum + (item.finalPaidPrice * item.quantity), 0);
  };

  const hasSelectedItems = () => {
    return returnItems.some(item => item.quantity > 0);
  };

  const handleSubmitReturn = async () => {
    if (!hasSelectedItems()) {
      Alert.alert('Error', 'Please select at least one item to return');
      return;
    }

    Alert.alert(
      'Confirm Return',
      `Are you sure you want to return these items?\n\nRefund Amount: ₹${calculateReturnTotal().toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm Return',
          style: 'destructive',
          onPress: submitReturn
        }
      ]
    );
  };

  const submitReturn = async () => {
    setSubmitting(true);
    try {
      const returnData = {
        originalSaleId: saleId,
        items: returnItems
          .filter(item => item.quantity > 0)
          .map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,  // Original price (for reference)
            finalPaidPrice: item.finalPaidPrice  // Discounted price (for refund)
          })),
        returnTotal: calculateReturnTotal(),  // Based on discounted prices
        reason: reason || 'Customer return',
        type: 'return'
      };

      await api.post(`/api/returns`, returnData);
      
      Alert.alert(
        'Return Successful',
        `Refund of ₹${calculateReturnTotal().toFixed(2)} processed.\nInventory has been updated.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error processing return:', error);
      Alert.alert('Error', 'Failed to process return. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Process Return</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F44336" />
        </View>
      </View>
    );
  }

  if (!sale || returnItems.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Process Return</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={60} color="#4CAF50" />
          <Text style={styles.emptyText}>All items have been returned</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Process Return</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Instructions */}
        <View style={styles.instructionCard}>
          <Ionicons name="information-circle" size={24} color="#2196F3" />
          <Text style={styles.instructionText}>
            Select the quantity of each item to return. Inventory will be automatically updated.
          </Text>
        </View>

        {/* Items to Return */}
        <Text style={styles.sectionTitle}>Select Items to Return</Text>
        
        {returnItems.map((item, index) => (
          <View key={index} style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.productName}</Text>
              {/* Show discounted price if different from original */}
              {item.finalPaidPrice < item.price ? (
                <View style={styles.priceRow}>
                  <Text style={styles.originalPrice}>₹{item.price.toFixed(2)}</Text>
                  <Text style={styles.discountedPrice}>₹{item.finalPaidPrice.toFixed(2)} each</Text>
                </View>
              ) : (
                <Text style={styles.itemPrice}>₹{item.price.toFixed(2)} each</Text>
              )}
              <Text style={styles.availableText}>
                Available to return: {item.maxQuantity}
              </Text>
            </View>
            
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={[styles.qtyButton, item.quantity === 0 && styles.qtyButtonDisabled]}
                onPress={() => updateReturnQuantity(item.productId, -1)}
                disabled={item.quantity === 0}
              >
                <Ionicons name="remove" size={20} color={item.quantity === 0 ? '#CCC' : '#F44336'} />
              </TouchableOpacity>
              
              <Text style={styles.qtyValue}>{item.quantity}</Text>
              
              <TouchableOpacity
                style={[styles.qtyButton, item.quantity >= item.maxQuantity && styles.qtyButtonDisabled]}
                onPress={() => updateReturnQuantity(item.productId, 1)}
                disabled={item.quantity >= item.maxQuantity}
              >
                <Ionicons name="add" size={20} color={item.quantity >= item.maxQuantity ? '#CCC' : '#F44336'} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Reason Input */}
        <Text style={styles.sectionTitle}>Return Reason (Optional)</Text>
        <TextInput
          style={styles.reasonInput}
          placeholder="e.g., Wrong size, Defective item..."
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={2}
        />

        {/* Summary */}
        {hasSelectedItems() && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items Selected</Text>
              <Text style={styles.summaryValue}>
                {returnItems.reduce((sum, item) => sum + item.quantity, 0)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Refund Amount</Text>
              <Text style={styles.refundAmount}>₹{calculateReturnTotal().toFixed(2)}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, !hasSelectedItems() && styles.submitButtonDisabled]}
          onPress={handleSubmitReturn}
          disabled={!hasSelectedItems() || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="return-down-back" size={20} color="#FFF" />
              <Text style={styles.submitButtonText}>
                Process Return {hasSelectedItems() && `(₹${calculateReturnTotal().toFixed(2)})`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F44336',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#FF9500',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  instructionCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    gap: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  itemPrice: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: 13,
    color: '#34C759',
    fontWeight: '500',
  },
  availableText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonDisabled: {
    backgroundColor: '#F5F5F5',
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    minWidth: 30,
    textAlign: 'center',
  },
  reasonInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 20,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 12,
  },
  refundAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  submitButton: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
