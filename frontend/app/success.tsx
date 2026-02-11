import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from './utils/api';



export default function Success() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const total = params.total as string;
  const method = params.method as string;
  const saleId = params.saleId as string;
  const customerPhone = params.customerPhone as string;
  const discount = parseFloat(params.discount as string) || 0;
  const originalTotal = parseFloat(params.originalTotal as string) || parseFloat(total);
  
  const [shopName, setShopName] = useState('Your Store');
  const [saleItems, setSaleItems] = useState<Array<{productName: string; quantity: number; price: number}>>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load shop name
      const settingsRes = await api.get(`/api/settings`);
      if (settingsRes.data?.shopName) {
        setShopName(settingsRes.data.shopName);
      }
      
      // Load sale details if we have saleId
      if (saleId) {
        const saleRes = await api.get(`/api/sales/${saleId}`);
        if (saleRes.data?.items) {
          setSaleItems(saleRes.data.items);
        }
      }
    } catch (error) {
      console.log('Error loading data:', error);
    }
  };

  const goHome = () => {
    router.replace('/home');
  };

  const viewSales = () => {
    router.replace('/today-sales');
  };

  const generateBillText = () => {
    const date = new Date().toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let bill = `🧾 *${shopName}*\n`;
    bill += `━━━━━━━━━━━━━━━\n`;
    bill += `📅 ${date}\n`;
    if (saleId) {
      bill += `🔖 Order: #${saleId.slice(-6).toUpperCase()}\n`;
    }
    bill += `━━━━━━━━━━━━━━━\n\n`;
    
    bill += `*Items:*\n`;
    if (saleItems.length > 0) {
      saleItems.forEach(item => {
        bill += `• ${item.productName} x${item.quantity}\n`;
        bill += `   ₹${(item.price * item.quantity).toFixed(2)}\n`;
      });
    } else {
      bill += `(Items details in receipt)\n`;
    }
    
    bill += `\n━━━━━━━━━━━━━━━\n`;
    
    if (discount > 0) {
      bill += `Subtotal: ₹${originalTotal.toFixed(2)}\n`;
      bill += `Discount: -₹${discount.toFixed(2)}\n`;
      bill += `━━━━━━━━━━━━━━━\n`;
    }
    
    bill += `*TOTAL: ₹${Number(total).toFixed(2)}*\n`;
    bill += `Payment: ${method?.toUpperCase()}\n`;
    bill += `━━━━━━━━━━━━━━━\n\n`;
    bill += `Thank you for shopping! 🙏`;
    
    return bill;
  };

  const sendWhatsAppBill = async () => {
    if (!customerPhone) {
      Alert.alert('No Phone Number', 'Customer WhatsApp number was not provided');
      return;
    }

    const billText = generateBillText();
    const encodedMessage = encodeURIComponent(billText);
    const whatsappUrl = `https://wa.me/${customerPhone}?text=${encodedMessage}`;
    
    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('Error', 'WhatsApp is not installed on this device');
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert('Error', 'Failed to open WhatsApp');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={100} color="#34C759" />
        </View>

        <Text style={styles.title}>Sale Completed!</Text>
        <Text style={styles.subtitle}>Transaction successful</Text>

        <View style={styles.detailsCard}>
          {saleId && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Order ID</Text>
                <Text style={styles.orderId}>#{saleId.slice(-6).toUpperCase()}</Text>
              </View>
              <View style={styles.divider} />
            </>
          )}
          
          {discount > 0 && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Subtotal</Text>
                <Text style={styles.detailValue}>₹{originalTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Discount</Text>
                <Text style={styles.discountValue}>-₹{discount.toFixed(2)}</Text>
              </View>
              <View style={styles.divider} />
            </>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount Paid</Text>
            <Text style={styles.detailValue}>₹{Number(total).toFixed(2)}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>{method?.toUpperCase()}</Text>
          </View>
        </View>

        {/* WhatsApp Button */}
        {customerPhone && (
          <TouchableOpacity 
            style={styles.whatsappButton}
            onPress={sendWhatsAppBill}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={22} color="#FFF" />
            <Text style={styles.whatsappButtonText}>Send Bill on WhatsApp</Text>
          </TouchableOpacity>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={goHome}
            activeOpacity={0.8}
          >
            <Ionicons name="home" size={20} color="#FFF" />
            <Text style={styles.primaryButtonText}>Back to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={viewSales}
            activeOpacity={0.8}
          >
            <Ionicons name="receipt" size={20} color="#007AFF" />
            <Text style={styles.secondaryButtonText}>View Today's Sales</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    marginBottom: 32,
  },
  detailsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 8,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    width: '100%',
    gap: 10,
  },
  whatsappButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
