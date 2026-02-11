import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from './utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Product {
  _id: string;
  name: string;
  price: number;
  stock: number;
  images: string[];
  category?: string;
  size?: string;
  color?: string;
  createdAt?: string;
}

interface ImageMatch {
  productId: string;
  productName: string;
  similarity: number;
  images: string[];
}

export default function ItemMatch() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const capturedImage = params.imageData as string;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [suggestedProducts, setSuggestedProducts] = useState<ImageMatch[]>([]);
  const [matchMessage, setMatchMessage] = useState('');
  const [hasAttemptedMatch, setHasAttemptedMatch] = useState(false);
  const [isMatching, setIsMatching] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await api.get(`/api/products`);
      const allProducts = response.data;
      setProducts(allProducts);
      
      // If we have a captured image, use backend image matching
      if (capturedImage) {
        await matchImageWithBackend(capturedImage, allProducts);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const matchImageWithBackend = async (imageData: string, allProducts: Product[]) => {
    setHasAttemptedMatch(true);
    setIsMatching(true);
    
    if (allProducts.length === 0) {
      setMatchMessage('No products found. Add some products first.');
      setIsMatching(false);
      return;
    }

    try {
      const response = await api.post('/api/products/match-image', {
        imageData: imageData
      });
      
      const { matches, hasMatch, message } = response.data;
      
      setMatchMessage(message);
      setSuggestedProducts(matches || []);
      
      if (hasMatch && matches.length > 0) {
        // Find the full product from our loaded products
        const topMatch = matches[0];
        const foundProduct = allProducts.find(p => p._id === topMatch.productId);
        if (foundProduct) {
          setMatchedProduct(foundProduct);
        }
      }
    } catch (error) {
      console.error('Error matching image:', error);
      setMatchMessage('Product not found. Search manually.');
    } finally {
      setIsMatching(false);
    }
  };

  const handleSelectProduct = async (product: Product) => {
    if (product.stock <= 0) {
      Alert.alert('Out of Stock', 'This product is currently out of stock');
      return;
    }

    // Get current cart from AsyncStorage
    const cartJson = await AsyncStorage.getItem('cart');
    let cart = cartJson ? JSON.parse(cartJson) : [];

    // Check if product already in cart
    const existingIndex = cart.findIndex((item: any) => item.productId === product._id);
    
    if (existingIndex >= 0) {
      // Increment quantity
      cart[existingIndex].quantity += 1;
    } else {
      // Add new item
      cart.push({
        productId: product._id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        image: product.images[0] || ''
      });
    }

    await AsyncStorage.setItem('cart', JSON.stringify(cart));
    
    // Navigate to bill preview
    router.push('/bill-preview');
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.color?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Organize products: matched product first, then the rest
  const organizedProducts = () => {
    if (matchedProduct) {
      // Remove matched product from list and put it first
      const otherProducts = filteredProducts.filter(p => p._id !== matchedProduct._id);
      return [matchedProduct, ...otherProducts];
    }
    return filteredProducts;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#34C759" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Product</Text>
        <TouchableOpacity onPress={() => router.push('/bill-preview')}>
          <Ionicons name="cart" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Message Banner */}
      {hasAttemptedMatch && capturedImage && (
        <View style={matchedProduct ? styles.successBanner : styles.warningBanner}>
          <Ionicons 
            name={matchedProduct ? "checkmark-circle" : "information-circle"} 
            size={20} 
            color={matchedProduct ? "#34C759" : "#FF9500"} 
          />
          <Text style={matchedProduct ? styles.successText : styles.warningText}>
            {matchedProduct 
              ? "Suggested (based on similarity)" 
              : "Product not found. Select manually."}
          </Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {organizedProducts().length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={80} color="#CCC" />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>Add products from the home screen</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {organizedProducts().map((product) => {
              const isMatched = matchedProduct && product._id === matchedProduct._id;
              
              return (
                <TouchableOpacity
                  key={product._id}
                  style={[
                    styles.productCard,
                    isMatched && styles.productCardMatched
                  ]}
                  onPress={() => handleSelectProduct(product)}
                  activeOpacity={0.8}
                >
                  {isMatched && (
                    <View style={styles.suggestedBadge}>
                      <Ionicons name="star" size={12} color="#FFF" />
                      <Text style={styles.suggestedText}>Suggested</Text>
                    </View>
                  )}
                  
                  <Image 
                    source={{ uri: product.images[0] }} 
                    style={styles.productImage}
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                    <Text style={styles.productPrice}>₹{product.price.toFixed(2)}</Text>
                    <Text style={[styles.productStock, product.stock <= 5 && styles.lowStock]}>
                      Stock: {product.stock}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
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
    backgroundColor: '#34C759',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1A1A',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  productCardMatched: {
    borderWidth: 3,
    borderColor: '#34C759',
    shadowColor: '#34C759',
    shadowOpacity: 0.3,
    elevation: 8,
  },
  suggestedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 10,
  },
  suggestedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  productImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#F0F0F0',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 4,
  },
  productStock: {
    fontSize: 12,
    color: '#666',
  },
  lowStock: {
    color: '#FF3B30',
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
  },
});