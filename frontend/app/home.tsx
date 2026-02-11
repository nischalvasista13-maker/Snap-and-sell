import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from './utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';



export default function Home() {
  const router = useRouter();
  const [shopName, setShopName] = useState('');
  const [todaySales, setTodaySales] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  // Update last active time whenever this screen is focused
  useFocusEffect(
    React.useCallback(() => {
      updateLastActiveTime();
    }, [])
  );

  const updateLastActiveTime = async () => {
    try {
      await AsyncStorage.setItem('lastActiveTime', Date.now().toString());
    } catch (error) {
      console.error('Error updating last active time:', error);
    }
  };

  const loadData = async () => {
    try {
      // Get settings
      const settingsRes = await api.get(`/api/settings`);
      if (settingsRes.data.shopName) {
        setShopName(settingsRes.data.shopName);
      }

      // Get today's sales
      const salesRes = await api.get(`/api/sales/today`);
      const total = salesRes.data.reduce((sum: number, sale: any) => sum + sale.total, 0);
      setTodaySales(total);

      // Get products count
      const productsRes = await api.get(`/api/products`);
      setTotalProducts(productsRes.data.length);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const MenuCard = ({ icon, title, subtitle, color, onPress }: any) => (
    <TouchableOpacity 
      style={[styles.menuCard, { backgroundColor: color }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={40} color="#FFF" />
      <Text style={styles.menuTitle}>{title}</Text>
      <Text style={styles.menuSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{shopName || 'POS System'}</Text>
          <Text style={styles.headerSubtitle}>Home Dashboard</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="cash-outline" size={32} color="#34C759" />
            <Text style={styles.statValue}>₹{todaySales.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Today's Sales</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="cube-outline" size={32} color="#007AFF" />
            <Text style={styles.statValue}>{totalProducts}</Text>
            <Text style={styles.statLabel}>Total Products</Text>
          </View>
        </View>

        {/* Main Menu */}
        <View style={styles.menuContainer}>
          <MenuCard 
            icon="add-circle"
            title="Add Stock"
            subtitle="Add new products"
            color="#007AFF"
            onPress={() => router.push('/add-stock')}
          />
          
          <MenuCard 
            icon="cart"
            title="Sell Items"
            subtitle="Start selling"
            color="#34C759"
            onPress={() => router.push('/sell')}
          />
          
          <MenuCard 
            icon="time"
            title="Today's Sales"
            subtitle="View sales report"
            color="#FF9500"
            onPress={() => router.push('/today-sales')}
          />
          
          <MenuCard 
            icon="grid"
            title="Inventory"
            subtitle="View all products"
            color="#5856D6"
            onPress={() => router.push('/inventory')}
          />
        </View>
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
    backgroundColor: '#007AFF',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  menuContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 12,
    textAlign: 'center',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },
});