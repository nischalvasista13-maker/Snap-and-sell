import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from './utils/api';



export default function ItemDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const imageData = params.imageData as string;

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Size-wise quantities
  const [sizeS, setSizeS] = useState('');
  const [sizeM, setSizeM] = useState('');
  const [sizeL, setSizeL] = useState('');
  const [sizeXL, setSizeXL] = useState('');

  const calculateTotalStock = () => {
    const s = parseInt(sizeS) || 0;
    const m = parseInt(sizeM) || 0;
    const l = parseInt(sizeL) || 0;
    const xl = parseInt(sizeXL) || 0;
    return s + m + l + xl;
  };

  const handleSave = async () => {
    if (!name.trim() || !price) {
      Alert.alert('Error', 'Please fill in name and price');
      return;
    }

    if (isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    const totalStock = calculateTotalStock();
    if (totalStock === 0) {
      Alert.alert('Error', 'Please enter quantity for at least one size');
      return;
    }

    const sizeQuantities: {[key: string]: number} = {};
    if (sizeS && parseInt(sizeS) > 0) sizeQuantities['S'] = parseInt(sizeS);
    if (sizeM && parseInt(sizeM) > 0) sizeQuantities['M'] = parseInt(sizeM);
    if (sizeL && parseInt(sizeL) > 0) sizeQuantities['L'] = parseInt(sizeL);
    if (sizeXL && parseInt(sizeXL) > 0) sizeQuantities['XL'] = parseInt(sizeXL);

    setSaving(true);
    try {
      // Set a timeout for the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      await axios.post(
        `${BACKEND_URL}/api/products`, 
        {
          name: name.trim(),
          price: Number(price),
          stock: totalStock,
          category: category.trim(),
          size: '', // Deprecated, kept for compatibility
          sizeQuantities: sizeQuantities,
          color: color.trim(),
          images: [imageData]
        },
        {
          signal: controller.signal,
          timeout: 30000
        }
      );

      clearTimeout(timeoutId);

      Alert.alert('Success', 'Product added successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error saving product:', error);
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        Alert.alert('Timeout', 'Request took too long. Please try again with a smaller image or check your connection.');
      } else if (error.response?.status === 413) {
        Alert.alert('Error', 'Image is too large. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to save product. Please try again.');
      }
    } finally {
      setSaving(false);
    }
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
        <Text style={styles.headerTitle}>New Item Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageData }} style={styles.image} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Blue Denim Jacket"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Price (₹) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Size-wise Quantity Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionLabel}>Size-wise Quantity *</Text>
            <Text style={styles.helpText}>Enter quantity for each size (at least one required)</Text>
            
            <View style={styles.sizeGrid}>
              <View style={styles.sizeInput}>
                <Text style={styles.sizeLabel}>S</Text>
                <TextInput
                  style={styles.sizeField}
                  placeholder="0"
                  value={sizeS}
                  onChangeText={setSizeS}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.sizeInput}>
                <Text style={styles.sizeLabel}>M</Text>
                <TextInput
                  style={styles.sizeField}
                  placeholder="0"
                  value={sizeM}
                  onChangeText={setSizeM}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.sizeInput}>
                <Text style={styles.sizeLabel}>L</Text>
                <TextInput
                  style={styles.sizeField}
                  placeholder="0"
                  value={sizeL}
                  onChangeText={setSizeL}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.sizeInput}>
                <Text style={styles.sizeLabel}>XL</Text>
                <TextInput
                  style={styles.sizeField}
                  placeholder="0"
                  value={sizeXL}
                  onChangeText={setSizeXL}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.totalStock}>
              <Text style={styles.totalStockLabel}>Total Stock:</Text>
              <Text style={styles.totalStockValue}>{calculateTotalStock()}</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Jackets, Shirts, Jeans"
              value={category}
              onChangeText={setCategory}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Color</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Blue, Red, Black"
              value={color}
              onChangeText={setColor}
              autoCapitalize="words"
            />
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Product'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  },
  imageContainer: {
    backgroundColor: '#FFF',
    alignItems: 'center',
    padding: 20,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  row: {
    flexDirection: 'row',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  sizeGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  sizeInput: {
    flex: 1,
    alignItems: 'center',
  },
  sizeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  sizeField: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
    textAlign: 'center',
    width: '100%',
  },
  totalStock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    padding: 12,
    borderRadius: 8,
  },
  totalStockLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  totalStockValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});