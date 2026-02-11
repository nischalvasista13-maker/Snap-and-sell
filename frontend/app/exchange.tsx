import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from './utils/api';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

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

interface Product {
  _id: string;
  name: string;
  price: number;
  stock: number;
  images: string[];
}

interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;  // Original unit price
  finalPaidPrice: number;  // Discounted unit price (for refund)
  maxQuantity: number;
}

type ExchangeStep = 'select-return' | 'select-new' | 'confirm';

export default function ExchangeScreen() {
  const router = useRouter();
  const { saleId } = useLocalSearchParams<{ saleId: string }>();
  
  const [step, setStep] = useState<ExchangeStep>('select-return');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Return items selection
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  
  // New product selection
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newQuantity, setNewQuantity] = useState(1);

  useEffect(() => {
    loadData();
  }, [saleId]);

  const loadData = async () => {
    try {
      const [saleRes, returnsRes, productsRes] = await Promise.all([
        axios.get(`${API_URL}/api/sales/${saleId}`),
        axios.get(`${API_URL}/api/returns/by-sale/${saleId}`),
        axios.get(`${API_URL}/api/products`)
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
      
      // Initialize return items with discounted prices
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
          finalPaidPrice: finalPaidPrice,  // Discounted price (for exchange calculation)
          maxQuantity: remainingQty
        };
      }).filter((item: ReturnItem) => item.maxQuantity > 0);
      
      setReturnItems(items);
      setProducts(productsRes.data.filter((p: Product) => p.stock > 0));
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
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
    // Use finalPaidPrice (discounted) for exchange credit calculation
    return returnItems.reduce((sum, item) => sum + (item.finalPaidPrice * item.quantity), 0);
  };

  const calculateNewTotal = () => {
    return selectedProduct ? selectedProduct.price * newQuantity : 0;
  };

  const calculatePriceDifference = () => {
    return calculateNewTotal() - calculateReturnTotal();
  };

  const hasSelectedReturnItems = () => {
    return returnItems.some(item => item.quantity > 0);
  };

  const handleContinue = () => {
    if (step === 'select-return') {
      if (!hasSelectedReturnItems()) {
        Alert.alert('Error', 'Please select at least one item to exchange');
        return;
      }
      setStep('select-new');
    } else if (step === 'select-new') {
      if (!selectedProduct) {
        Alert.alert('Error', 'Please select a product to exchange for');
        return;
      }
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'select-new') {
      setStep('select-return');
    } else if (step === 'confirm') {
      setStep('select-new');
    } else {
      router.back();
    }
  };

  const handleSubmitExchange = async () => {
    if (!selectedProduct) return;

    const priceDiff = calculatePriceDifference();
    let message = '';
    
    if (priceDiff > 0) {
      message = `Customer pays: ₹${priceDiff.toFixed(2)}`;
    } else if (priceDiff < 0) {
      message = `Refund to customer: ₹${Math.abs(priceDiff).toFixed(2)}`;
    } else {
      message = 'Even exchange - no payment needed';
    }

    Alert.alert(
      'Confirm Exchange',
      `${message}\n\nProceed with exchange?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: submitExchange }
      ]
    );
  };

  const submitExchange = async () => {
    if (!selectedProduct) return;
    
    setSubmitting(true);
    try {
      // Create the return
      const returnData = {
        originalSaleId: saleId,
        items: returnItems
          .filter(item => item.quantity > 0)
          .map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price
          })),
        returnTotal: calculateReturnTotal(),
        reason: 'Exchange',
        type: 'exchange'
      };

      await axios.post(`${API_URL}/api/returns`, returnData);

      // Create the new sale
      const priceDiff = calculatePriceDifference();
      const newSaleData = {
        items: [{
          productId: selectedProduct._id,
          productName: selectedProduct.name,
          quantity: newQuantity,
          price: selectedProduct.price,
          image: selectedProduct.images?.[0] || ''
        }],
        total: calculateNewTotal(),
        paymentMethod: priceDiff > 0 ? 'Cash' : 'Exchange'
      };

      await axios.post(`${API_URL}/api/sales`, newSaleData);

      const priceDiffText = priceDiff > 0 
        ? `\n\nCollect ₹${priceDiff.toFixed(2)} from customer`
        : priceDiff < 0 
          ? `\n\nRefund ₹${Math.abs(priceDiff).toFixed(2)} to customer`
          : '';

      Alert.alert(
        'Exchange Successful',
        `Exchange completed successfully!${priceDiffText}`,
        [{ text: 'OK', onPress: () => router.push('/today-sales') }]
      );
    } catch (error) {
      console.error('Error processing exchange:', error);
      Alert.alert('Error', 'Failed to process exchange. Please try again.');
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
          <Text style={styles.headerTitle}>Exchange</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'select-return' && 'Select Items to Return'}
          {step === 'select-new' && 'Select New Product'}
          {step === 'confirm' && 'Confirm Exchange'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressBar}>
        <View style={[styles.progressStep, step !== 'select-return' && styles.progressStepComplete]}>
          <Text style={styles.progressText}>1</Text>
        </View>
        <View style={[styles.progressLine, step !== 'select-return' && styles.progressLineComplete]} />
        <View style={[styles.progressStep, step === 'confirm' && styles.progressStepComplete]}>
          <Text style={styles.progressText}>2</Text>
        </View>
        <View style={[styles.progressLine, step === 'confirm' && styles.progressLineComplete]} />
        <View style={styles.progressStep}>
          <Text style={styles.progressText}>3</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Select Return Items */}
        {step === 'select-return' && (
          <>
            <Text style={styles.sectionTitle}>Select items to exchange</Text>
            {returnItems.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemPrice}>₹{item.price.toFixed(2)} each</Text>
                </View>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={[styles.qtyButton, item.quantity === 0 && styles.qtyButtonDisabled]}
                    onPress={() => updateReturnQuantity(item.productId, -1)}
                  >
                    <Ionicons name="remove" size={20} color={item.quantity === 0 ? '#CCC' : '#2196F3'} />
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={[styles.qtyButton, item.quantity >= item.maxQuantity && styles.qtyButtonDisabled]}
                    onPress={() => updateReturnQuantity(item.productId, 1)}
                  >
                    <Ionicons name="add" size={20} color={item.quantity >= item.maxQuantity ? '#CCC' : '#2196F3'} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            
            {hasSelectedReturnItems() && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Return Value</Text>
                <Text style={styles.summaryValue}>₹{calculateReturnTotal().toFixed(2)}</Text>
              </View>
            )}
          </>
        )}

        {/* Step 2: Select New Product */}
        {step === 'select-new' && (
          <>
            <View style={styles.creditBanner}>
              <Ionicons name="wallet" size={20} color="#4CAF50" />
              <Text style={styles.creditText}>Exchange Credit: ₹{calculateReturnTotal().toFixed(2)}</Text>
            </View>

            <Text style={styles.sectionTitle}>Select new product</Text>
            {products.map((product) => (
              <TouchableOpacity
                key={product._id}
                style={[
                  styles.productCard,
                  selectedProduct?._id === product._id && styles.productCardSelected
                ]}
                onPress={() => {
                  setSelectedProduct(product);
                  setNewQuantity(1);
                }}
              >
                {product.images?.[0] && (
                  <Image source={{ uri: product.images[0] }} style={styles.productImage} />
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productPrice}>₹{product.price.toFixed(2)}</Text>
                  <Text style={styles.productStock}>In stock: {product.stock}</Text>
                </View>
                {selectedProduct?._id === product._id && (
                  <Ionicons name="checkmark-circle" size={24} color="#2196F3" />
                )}
              </TouchableOpacity>
            ))}

            {selectedProduct && (
              <View style={styles.quantitySection}>
                <Text style={styles.sectionTitle}>Quantity</Text>
                <View style={styles.quantityRow}>
                  <TouchableOpacity
                    style={[styles.qtyButton, newQuantity <= 1 && styles.qtyButtonDisabled]}
                    onPress={() => setNewQuantity(q => Math.max(1, q - 1))}
                  >
                    <Ionicons name="remove" size={20} color={newQuantity <= 1 ? '#CCC' : '#2196F3'} />
                  </TouchableOpacity>
                  <Text style={styles.qtyValueLarge}>{newQuantity}</Text>
                  <TouchableOpacity
                    style={[styles.qtyButton, newQuantity >= selectedProduct.stock && styles.qtyButtonDisabled]}
                    onPress={() => setNewQuantity(q => Math.min(selectedProduct.stock, q + 1))}
                  >
                    <Ionicons name="add" size={20} color={newQuantity >= selectedProduct.stock ? '#CCC' : '#2196F3'} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && selectedProduct && (
          <>
            <View style={styles.confirmSection}>
              <Text style={styles.confirmTitle}>Items Being Returned</Text>
              {returnItems.filter(i => i.quantity > 0).map((item, idx) => (
                <View key={idx} style={styles.confirmItem}>
                  <Text style={styles.confirmItemName}>{item.productName} × {item.quantity}</Text>
                  <Text style={styles.confirmItemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
                </View>
              ))}
              <View style={styles.confirmTotal}>
                <Text style={styles.confirmTotalLabel}>Return Credit</Text>
                <Text style={styles.confirmTotalValue}>₹{calculateReturnTotal().toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.confirmSection}>
              <Text style={styles.confirmTitle}>New Item</Text>
              <View style={styles.confirmItem}>
                <Text style={styles.confirmItemName}>{selectedProduct.name} × {newQuantity}</Text>
                <Text style={styles.confirmItemPrice}>₹{calculateNewTotal().toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.differenceCard}>
              <Text style={styles.differenceLabel}>
                {calculatePriceDifference() > 0 ? 'Customer Pays' : 
                 calculatePriceDifference() < 0 ? 'Refund to Customer' : 'Even Exchange'}
              </Text>
              <Text style={[
                styles.differenceValue,
                calculatePriceDifference() > 0 && styles.payAmount,
                calculatePriceDifference() < 0 && styles.refundAmount
              ]}>
                ₹{Math.abs(calculatePriceDifference()).toFixed(2)}
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {step === 'confirm' ? (
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleSubmitExchange}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="swap-horizontal" size={20} color="#FFF" />
                <Text style={styles.buttonText}>Complete Exchange</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.continueButton,
              (step === 'select-return' && !hasSelectedReturnItems()) && styles.buttonDisabled,
              (step === 'select-new' && !selectedProduct) && styles.buttonDisabled
            ]}
            onPress={handleContinue}
            disabled={
              (step === 'select-return' && !hasSelectedReturnItems()) ||
              (step === 'select-new' && !selectedProduct)
            }
          >
            <Text style={styles.buttonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
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
    backgroundColor: '#2196F3',
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
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFF',
  },
  progressStep: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStepComplete: {
    backgroundColor: '#2196F3',
  },
  progressText: {
    color: '#FFF',
    fontWeight: '600',
  },
  progressLine: {
    width: 40,
    height: 3,
    backgroundColor: '#E0E0E0',
  },
  progressLineComplete: {
    backgroundColor: '#2196F3',
  },
  content: {
    flex: 1,
    padding: 16,
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
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
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
  qtyValueLarge: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    minWidth: 50,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#1565C0',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  creditBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  creditText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  productCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  productCardSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginTop: 4,
  },
  productStock: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  quantitySection: {
    marginTop: 20,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    gap: 20,
  },
  confirmSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  confirmItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  confirmItemName: {
    fontSize: 15,
    color: '#1A1A1A',
  },
  confirmItemPrice: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  confirmTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 12,
    marginTop: 8,
  },
  confirmTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  confirmTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  differenceCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  differenceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  differenceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  payAmount: {
    color: '#F44336',
  },
  refundAmount: {
    color: '#4CAF50',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  continueButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
