import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
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
}

interface Sale {
  _id: string;
  items: SaleItem[];
  total: number;
  paymentMethod: string;
  timestamp: string;
  date: string;
}

interface ReturnRecord {
  _id: string;
  originalSaleId: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  returnTotal: number;
  type: string;
  timestamp: string;
}

export default function SaleDetails() {
  const router = useRouter();
  const { saleId } = useLocalSearchParams<{ saleId: string }>();
  const [sale, setSale] = useState<Sale | null>(null);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSaleDetails();
  }, [saleId]);

  const loadSaleDetails = async () => {
    try {
      const [saleRes, returnsRes] = await Promise.all([
        axios.get(`${API_URL}/api/sales/${saleId}`),
        axios.get(`${API_URL}/api/returns/by-sale/${saleId}`)
      ]);
      setSale(saleRes.data);
      setReturns(returnsRes.data);
    } catch (error) {
      console.error('Error loading sale details:', error);
      Alert.alert('Error', 'Failed to load sale details');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getReturnedQuantity = (productId: string) => {
    let returnedQty = 0;
    returns.forEach(ret => {
      ret.items.forEach(item => {
        if (item.productId === productId) {
          returnedQty += item.quantity;
        }
      });
    });
    return returnedQty;
  };

  const canReturn = () => {
    if (!sale) return false;
    // Check if any items can still be returned
    return sale.items.some(item => {
      const returnedQty = getReturnedQuantity(item.productId);
      return item.quantity > returnedQty;
    });
  };

  const handleReturn = () => {
    router.push({
      pathname: '/return',
      params: { saleId: saleId }
    });
  };

  const handleExchange = () => {
    router.push({
      pathname: '/exchange',
      params: { saleId: saleId }
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sale Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9500" />
        </View>
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sale Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#CCC" />
          <Text style={styles.emptyText}>Sale not found</Text>
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
        <Text style={styles.headerTitle}>Sale Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sale Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Date & Time</Text>
              <Text style={styles.infoValue}>{formatDateTime(sale.timestamp)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="card-outline" size={20} color="#666" />
              <Text style={styles.infoLabel}>Payment</Text>
              <Text style={styles.infoValue}>{sale.paymentMethod.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Items List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items Purchased</Text>
          {sale.items.map((item, index) => {
            const returnedQty = getReturnedQuantity(item.productId);
            const remainingQty = item.quantity - returnedQty;
            
            return (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemQty}>
                    Qty: {item.quantity} × ₹{item.price.toFixed(2)}
                  </Text>
                  {returnedQty > 0 && (
                    <View style={styles.returnedBadge}>
                      <Ionicons name="return-down-back" size={12} color="#F44336" />
                      <Text style={styles.returnedText}>
                        {returnedQty} returned
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.itemTotal}>
                  ₹{(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>₹{sale.total.toFixed(2)}</Text>
        </View>

        {/* Returns History */}
        {returns.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Return History</Text>
            {returns.map((ret, index) => (
              <View key={index} style={styles.returnCard}>
                <View style={styles.returnHeader}>
                  <View style={[
                    styles.returnTypeBadge,
                    ret.type === 'exchange' && styles.exchangeBadge
                  ]}>
                    <Text style={styles.returnTypeText}>
                      {ret.type === 'exchange' ? 'EXCHANGE' : 'RETURN'}
                    </Text>
                  </View>
                  <Text style={styles.returnDate}>
                    {formatDateTime(ret.timestamp)}
                  </Text>
                </View>
                {ret.items.map((item, idx) => (
                  <Text key={idx} style={styles.returnItem}>
                    • {item.productName} × {item.quantity}
                  </Text>
                ))}
                <Text style={styles.returnTotal}>
                  Refunded: ₹{ret.returnTotal.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        {canReturn() && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.returnButton}
              onPress={handleReturn}
            >
              <Ionicons name="return-down-back" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Return</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.exchangeButton}
              onPress={handleExchange}
            >
              <Ionicons name="swap-horizontal" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Exchange</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
    backgroundColor: '#FF9500',
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
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 2,
  },
  section: {
    marginBottom: 16,
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
    marginBottom: 8,
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
  itemQty: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  returnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  returnedText: {
    fontSize: 11,
    color: '#F44336',
    marginLeft: 4,
    fontWeight: '500',
  },
  totalCard: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: '#FFF',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  returnCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  returnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  returnTypeBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  exchangeBadge: {
    backgroundColor: '#E3F2FD',
  },
  returnTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F44336',
  },
  returnDate: {
    fontSize: 12,
    color: '#666',
  },
  returnItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  returnTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  returnButton: {
    flex: 1,
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  exchangeButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
