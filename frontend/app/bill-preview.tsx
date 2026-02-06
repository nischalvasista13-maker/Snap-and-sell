import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  image: string;
}

export default function BillPreview() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);

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

  const proceedToPayment = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to proceed');
      return;
    }
    router.push('/payment');
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  return (
    <View style={styles.container}>
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
            {cart.map((item, index) => (
              <View key={index} style={styles.cartItem}>
                <Image source={{ uri: item.image }} style={styles.itemImage} />
                
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.productName}</Text>
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
          </ScrollView>

          {/* Total and Proceed */}
          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>₹{calculateTotal().toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.proceedButton} onPress={proceedToPayment}>
              <Text style={styles.proceedButtonText}>Proceed to Payment</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </>
      )}
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
    padding: 16,
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
    backgroundColor: '#F0F0F0',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  addMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  footer: {
    backgroundColor: '#FFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  proceedButton: {
    flexDirection: 'row',
    backgroundColor: '#34C759',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  proceedButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});