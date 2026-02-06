import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

interface Product {
  _id: string;
  name: string;
  price: number;
  stock: number;
  images: string[];
  category?: string;
  size?: string;
  color?: string;
}

export default function Inventory() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const handleDeleteProduct = async (productId: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${BACKEND_URL}/api/products/${productId}`);
              loadProducts();
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const calculateTotalValue = () => {
    return products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  };

  const getLowStockCount = () => {
    return products.filter(p => p.stock <= 5).length;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inventory</Text>
          <TouchableOpacity onPress={() => router.push('/add-stock')}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5856D6" />
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
        <Text style={styles.headerTitle}>Inventory</Text>
        <TouchableOpacity onPress={() => router.push('/add-stock')}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{products.length}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>₹{calculateTotalValue().toFixed(0)}</Text>
          <Text style={styles.statLabel}>Total Value</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, getLowStockCount() > 0 && styles.warningText]}>
            {getLowStockCount()}
          </Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={80} color="#CCC" />
            <Text style={styles.emptyText}>No products in inventory</Text>
            <Text style={styles.emptySubtext}>Add your first product to get started</Text>
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={() => router.push('/add-stock')}
            >
              <Text style={styles.addButtonText}>Add Product</Text>
            </TouchableOpacity>
          </View>
        ) : (
          products.map((product) => (
            <View key={product._id} style={styles.productCard}>
              <Image 
                source={{ uri: product.images[0] }} 
                style={styles.productImage}
              />
              
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                
                <View style={styles.productDetails}>
                  {product.category && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{product.category}</Text>
                    </View>
                  )}
                  {product.size && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{product.size}</Text>
                    </View>
                  )}
                  {product.color && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{product.color}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.productFooter}>
                  <Text style={styles.productPrice}>₹{product.price.toFixed(2)}</Text>
                  <Text style={[
                    styles.productStock,
                    product.stock <= 5 && styles.lowStock,
                    product.stock === 0 && styles.outOfStock
                  ]}>
                    Stock: {product.stock}
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteProduct(product._id)}
              >
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))
        )}
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
    backgroundColor: '#5856D6',
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  warningText: {
    color: '#FF3B30',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  productCard: {
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
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  productDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    color: '#666',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5856D6',
  },
  productStock: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
  },
  lowStock: {
    color: '#FF9500',
  },
  outOfStock: {
    color: '#FF3B30',
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#5856D6',
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