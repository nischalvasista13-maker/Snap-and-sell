import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  image: string;
  size?: string;
}

type DiscountType = 'percentage' | 'flat' | null;

export default function BillPreview() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Discount state
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<DiscountType>(null);
  const [discountValue, setDiscountValue] = useState('');
  
  // WhatsApp state
  const [customerPhone, setCustomerPhone] = useState('');

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    const cartJson = await AsyncStorage.getItem('cart');
    if (cartJson) {
      setCart(JSON.parse(cartJson));
    }
  };

  const updateQuantity = async (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }
    
    setCart(newCart);
    await AsyncStorage.setItem('cart', JSON.stringify(newCart));
  };

  const removeItem = async (index: number) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    await AsyncStorage.setItem('cart', JSON.stringify(newCart));
  };

  const addMoreItems = () => {
    router.push('/item-match');
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    const value = parseFloat(discountValue) || 0;
    
    if (!discountType || value <= 0) return 0;
    
    if (discountType === 'percentage') {
      return Math.min(subtotal, (subtotal * value) / 100);
    } else {
      return Math.min(subtotal, value);
    }
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  const clearDiscount = () => {
    setDiscountType(null);
    setDiscountValue('');
    setShowDiscount(false);
  };

  const proceedToPayment = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to proceed');
      return;
    }
    
    // Save checkout data for payment and success screens
    const checkoutData = {
      cart,
      originalTotal: calculateSubtotal(),
      discount: calculateDiscount(),
      discountType: discountType,
      discountValue: discountValue ? parseFloat(discountValue) : 0,
      finalTotal: calculateTotal(),
      customerPhone: customerPhone.trim() || null
    };
    
    await AsyncStorage.setItem('checkoutData', JSON.stringify(checkoutData));
    router.push('/payment');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bill Preview</Text>
        <View style={{ width: 24 }} />
      </View>

      {cart.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#CCC" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity style={styles.addButton} onPress={addMoreItems}>
            <Text style={styles.addButtonText}>Add Items</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Cart Items */}
            {cart.map((item, index) => (
              <View key={index} style={styles.cartItem}>
                <Image source={{ uri: item.image }} style={styles.itemImage} />
                
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  {item.size && <Text style={styles.itemSize}>Size: {item.size}</Text>}
                  <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
                  
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity 
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(index, -1)}
                    >
                      <Ionicons name="remove" size={20} color="#FFF" />
                    </TouchableOpacity>
                    
                    <Text style={styles.quantity}>{item.quantity}</Text>
                    
                    <TouchableOpacity 
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(index, 1)}
                    >
                      <Ionicons name="add" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => removeItem(index)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addMoreButton} onPress={addMoreItems}>
              <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
              <Text style={styles.addMoreText}>Add More Items</Text>
            </TouchableOpacity>

            {/* Discount Section */}
            <View style={styles.sectionCard}>
              <TouchableOpacity 
                style={styles.sectionHeader}
                onPress={() => setShowDiscount(!showDiscount)}
              >
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name="pricetag-outline" size={20} color="#FF9500" />
                  <Text style={styles.sectionTitle}>Apply Discount</Text>
                </View>
                {calculateDiscount() > 0 ? (
                  <TouchableOpacity onPress={clearDiscount}>
                    <Text style={styles.clearText}>Clear</Text>
                  </TouchableOpacity>
                ) : (
                  <Ionicons name={showDiscount ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                )}
              </TouchableOpacity>

              {showDiscount && (
                <View style={styles.discountContent}>
                  {/* Discount Type Toggle */}
                  <View style={styles.discountTypeRow}>
                    <TouchableOpacity
                      style={[
                        styles.discountTypeButton,
                        discountType === 'percentage' && styles.discountTypeButtonActive
                      ]}
                      onPress={() => setDiscountType('percentage')}
                    >
                      <Text style={[
                        styles.discountTypeText,
                        discountType === 'percentage' && styles.discountTypeTextActive
                      ]}>
                        Percentage (%)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.discountTypeButton,
                        discountType === 'flat' && styles.discountTypeButtonActive
                      ]}
                      onPress={() => setDiscountType('flat')}
                    >
                      <Text style={[
                        styles.discountTypeText,
                        discountType === 'flat' && styles.discountTypeTextActive
                      ]}>
                        Flat Amount (₹)
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Discount Value Input */}
                  {discountType && (
                    <View style={styles.discountInputRow}>
                      <TextInput
                        style={styles.discountInput}
                        placeholder={discountType === 'percentage' ? "Enter %" : "Enter ₹"}
                        placeholderTextColor="#999"
                        value={discountValue}
                        onChangeText={setDiscountValue}
                        keyboardType="numeric"
                      />
                      {discountType === 'percentage' && (
                        <Text style={styles.discountSymbol}>%</Text>
                      )}
                      {discountType === 'flat' && (
                        <Text style={styles.discountSymbol}>₹</Text>
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* Show applied discount */}
              {calculateDiscount() > 0 && !showDiscount && (
                <View style={styles.appliedDiscount}>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                  <Text style={styles.appliedDiscountText}>
                    {discountType === 'percentage' ? `${discountValue}%` : `₹${discountValue}`} off applied
                  </Text>
                </View>
              )}
            </View>

            {/* WhatsApp Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                  <Text style={styles.sectionTitle}>Customer WhatsApp</Text>
                </View>
                <Text style={styles.optionalBadge}>Optional</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter WhatsApp number (with country code)"
                placeholderTextColor="#999"
                value={customerPhone}
                onChangeText={setCustomerPhone}
                keyboardType="phone-pad"
              />
              <Text style={styles.phoneHint}>
                e.g., 919876543210 (without + sign)
              </Text>
            </View>

            {/* Bill Summary */}
            <View style={styles.billSummary}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Subtotal</Text>
                <Text style={styles.billValue}>₹{calculateSubtotal().toFixed(2)}</Text>
              </View>
              
              {calculateDiscount() > 0 && (
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>
                    Discount {discountType === 'percentage' ? `(${discountValue}%)` : ''}
                  </Text>
                  <Text style={styles.discountAmount}>-₹{calculateDiscount().toFixed(2)}</Text>
                </View>
              )}
              
              <View style={styles.billDivider} />
              
              <View style={styles.billRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{calculateTotal().toFixed(2)}</Text>
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Proceed Button */}
          <View style={styles.footer}>
            <View style={styles.footerTotal}>
              <Text style={styles.footerTotalLabel}>Pay</Text>
              <Text style={styles.footerTotalValue}>₹{calculateTotal().toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.proceedButton} onPress={proceedToPayment}>
              <Text style={styles.proceedButtonText}>Proceed to Payment</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
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
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  itemSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    minWidth: 24,
    textAlign: 'center',
  },
  deleteButton: {
    padding: 8,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  addMoreText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Section Card Styles
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  clearText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  optionalBadge: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  // Discount Styles
  discountContent: {
    marginTop: 16,
  },
  discountTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  discountTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  discountTypeButtonActive: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  discountTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  discountTypeTextActive: {
    color: '#FFF',
  },
  discountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  discountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    paddingVertical: 12,
  },
  discountSymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  appliedDiscount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  appliedDiscountText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
  },
  // WhatsApp Styles
  phoneInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A1A',
    marginTop: 12,
  },
  phoneHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  // Bill Summary
  billSummary: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 14,
    color: '#666',
  },
  billValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  discountAmount: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    gap: 16,
  },
  footerTotal: {
    flex: 1,
  },
  footerTotalLabel: {
    fontSize: 12,
    color: '#666',
  },
  footerTotalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  proceedButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  proceedButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
