import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  image: string;
  size?: string;
}

interface CheckoutData {
  cart: CartItem[];
  originalTotal: number;
  discount: number;
  discountType: string | null;
  discountValue: number;
  finalTotal: number;
  customerPhone: string | null;
}

export default function Payment() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadCheckoutData();
  }, []);

  const loadCheckoutData = async () => {
    // First try to load checkout data (with discount info)
    const checkoutJson = await AsyncStorage.getItem('checkoutData');
    if (checkoutJson) {
      const data = JSON.parse(checkoutJson);
      setCheckoutData(data);
      setCart(data.cart);
    } else {
      // Fallback to cart only
      const cartJson = await AsyncStorage.getItem('cart');
      if (cartJson) {
        const cartData = JSON.parse(cartJson);
        setCart(cartData);
        const total = cartData.reduce((sum: number, item: CartItem) => sum + (item.price * item.quantity), 0);
        setCheckoutData({
          cart: cartData,
          originalTotal: total,
          discount: 0,
          discountType: null,
          discountValue: 0,
          finalTotal: total,
          customerPhone: null
        });
      }
    }
  };

  const getFinalTotal = () => {
    return checkoutData?.finalTotal || cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const processSale = async () => {
    if (!selectedMethod) {
      Alert.alert('Select Payment Method', 'Please select a payment method to proceed');
      return;
    }

    // If UPI is selected, navigate to UPI QR screen
    if (selectedMethod === 'upi') {
      router.push({
        pathname: '/upi-qr',
        params: {
          total: getFinalTotal().toString(),
          cartJson: JSON.stringify(cart)
        }
      });
      return;
    }

    // For other payment methods, complete directly
    setProcessing(true);
    try {
      const saleData = {
        items: cart,
        total: getFinalTotal(),
        originalTotal: checkoutData?.originalTotal || getFinalTotal(),
        discount: checkoutData?.discount || 0,
        discountType: checkoutData?.discountType || null,
        paymentMethod: selectedMethod,
        customerPhone: checkoutData?.customerPhone || null
      };

      const response = await axios.post(`${BACKEND_URL}/api/sales`, saleData);
      const saleId = response.data._id || response.data.id;
      
      // Clear cart and checkout data
      await AsyncStorage.removeItem('cart');
      await AsyncStorage.removeItem('checkoutData');
      
      // Navigate to success with all data for WhatsApp
      router.replace({
        pathname: '/success',
        params: { 
          total: getFinalTotal().toString(),
          method: selectedMethod,
          saleId: saleId,
          customerPhone: checkoutData?.customerPhone || '',
          discount: (checkoutData?.discount || 0).toString(),
          originalTotal: (checkoutData?.originalTotal || getFinalTotal()).toString()
        }
      });
    } catch (error) {
      console.error('Error processing sale:', error);
      Alert.alert('Error', 'Failed to process sale. Please try again.');
      setProcessing(false);
    }
  };
      Alert.alert('Error', 'Failed to process sale. Please try again.');
      setProcessing(false);
    }
  };

  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: 'cash' },
    { id: 'card', name: 'Card', icon: 'card' },
    { id: 'upi', name: 'UPI', icon: 'phone-portrait' },
    { id: 'credit', name: 'Credit', icon: 'time' },
    { id: 'other', name: 'Other', icon: 'ellipsis-horizontal' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Amount Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Amount</Text>
          <Text style={styles.summaryAmount}>₹{getFinalTotal().toFixed(2)}</Text>
          <Text style={styles.summaryItems}>{cart.length} item(s)</Text>
          {checkoutData && checkoutData.discount > 0 && (
            <View style={styles.discountApplied}>
              <Ionicons name="pricetag" size={14} color="#34C759" />
              <Text style={styles.discountAppliedText}>
                Discount: -₹{checkoutData.discount.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>Select Payment Method</Text>
        <View style={styles.methodsContainer}>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod === method.id && styles.methodCardSelected
              ]}
              onPress={() => setSelectedMethod(method.id)}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={method.icon as any} 
                size={40} 
                color={selectedMethod === method.id ? '#007AFF' : '#666'}
              />
              <Text style={[
                styles.methodName,
                selectedMethod === method.id && styles.methodNameSelected
              ]}>
                {method.name}
              </Text>
              {selectedMethod === method.id && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Complete Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.completeButton, (!selectedMethod || processing) && styles.completeButtonDisabled]}
          onPress={processSale}
          disabled={!selectedMethod || processing}
          activeOpacity={0.8}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Text style={styles.completeButtonText}>Complete Sale</Text>
              <Ionicons name="checkmark-circle" size={24} color="#FFF" />
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
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
  summaryAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
  },
  summaryItems: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  methodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  methodCard: {
    width: '48%',
    aspectRatio: 1.2,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#EEE',
    position: 'relative',
  },
  methodCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  methodNameSelected: {
    color: '#007AFF',
  },
  checkmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    backgroundColor: '#FFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  completeButton: {
    flexDirection: 'row',
    backgroundColor: '#34C759',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});