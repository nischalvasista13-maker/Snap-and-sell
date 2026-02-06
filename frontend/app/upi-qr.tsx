import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  image: string;
}

export default function UpiQr() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const total = params.total as string;
  const cartJson = params.cartJson as string;
  
  const [upiId, setUpiId] = useState('');
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/settings`);
      setUpiId(response.data.upiId || '');
      setShopName(response.data.shopName || '');
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load UPI settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentReceived = async () => {
    if (processing) return;
    
    Alert.alert(
      'Confirm Payment',
      'Have you received the payment?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Yes, Received',
          onPress: async () => {
            setProcessing(true);
            try {
              const cart: CartItem[] = JSON.parse(cartJson);
              
              const saleData = {
                items: cart,
                total: Number(total),
                paymentMethod: 'upi'
              };

              await axios.post(`${BACKEND_URL}/api/sales`, saleData);
              
              // Clear cart
              await AsyncStorage.removeItem('cart');
              
              // Navigate to success
              router.replace({
                pathname: '/success',
                params: { 
                  total: total,
                  method: 'upi'
                }
              });
            } catch (error) {
              console.error('Error processing sale:', error);
              Alert.alert('Error', 'Failed to process sale. Please try again.');
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  // Generate UPI payment string
  const generateUpiString = () => {
    if (!upiId) return 'upi://pay';
    
    const payeeName = shopName.replace(/\s+/g, '%20');
    return `upi://pay?pa=${upiId}&pn=${payeeName}&am=${total}&cu=INR`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>UPI Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount to Pay</Text>
          <Text style={styles.amount}>₹{Number(total).toFixed(2)}</Text>
        </View>

        {/* QR Code Section */}
        <View style={styles.qrContainer}>
          {upiId ? (
            <>
              <Text style={styles.qrTitle}>Scan QR Code to Pay</Text>
              <View style={styles.qrWrapper}>
                <QRCode
                  value={generateUpiString()}
                  size={250}
                  backgroundColor="#FFF"
                  color="#1A1A1A"
                />
              </View>
              <Text style={styles.upiIdText}>{upiId}</Text>
              <Text style={styles.instructionText}>
                Ask customer to scan this QR code with any UPI app
              </Text>
            </>
          ) : (
            <View style={styles.noUpiContainer}>
              <Ionicons name="alert-circle-outline" size={80} color="#FF9500" />
              <Text style={styles.noUpiTitle}>No UPI ID Configured</Text>
              <Text style={styles.noUpiText}>
                Please add your UPI ID in settings to accept UPI payments
              </Text>
            </View>
          )}
        </View>

        {/* Waiting Indicator */}
        <View style={styles.waitingCard}>
          <View style={styles.waitingIcon}>
            <Ionicons name="time-outline" size={24} color="#007AFF" />
          </View>
          <Text style={styles.waitingText}>Waiting for customer to complete payment</Text>
        </View>
      </View>

      {/* Footer Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.confirmButton, processing && styles.confirmButtonDisabled]}
          onPress={handlePaymentReceived}
          disabled={processing}
          activeOpacity={0.8}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFF" />
              <Text style={styles.confirmButtonText}>Payment Received</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={processing}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
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
    alignItems: 'center',
  },
  amountCard: {
    width: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  amountLabel: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
  amount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
  },
  qrContainer: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 24,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EEE',
    marginBottom: 16,
  },
  upiIdText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  noUpiContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noUpiTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  noUpiText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  waitingCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  waitingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  footer: {
    backgroundColor: '#FFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    gap: 12,
  },
  confirmButton: {
    flexDirection: 'row',
    backgroundColor: '#34C759',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});
