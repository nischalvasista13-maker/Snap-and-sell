import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Sale {
  _id: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  paymentMethod: string;
  timestamp: string;
  date: string;
}

interface PaymentSummary {
  totalSales: number;
  cashTotal: number;
  upiTotal: number;
  cardTotal: number;
  creditTotal: number;
  otherTotal: number;
  totalTransactions: number;
  breakdown: Record<string, { total: number; count: number }>;
}

type DateFilter = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';

export default function TodaySales() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<DateFilter>('today');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Payment summary state
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  
  // Custom date range
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    loadSalesAndSummary();
  }, [selectedFilter, startDate, endDate]);

  const getDateRange = () => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (selectedFilter) {
      case 'today':
        start = new Date(today.setHours(0, 0, 0, 0));
        end = new Date(today.setHours(23, 59, 59, 999));
        break;
      case 'yesterday':
        start = new Date(today.setDate(today.getDate() - 1));
        start.setHours(0, 0, 0, 0);
        end = new Date(today);
        end.setHours(23, 59, 59, 999);
        break;
      case 'last7':
        start = new Date(today.setDate(today.getDate() - 7));
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;
      case 'last30':
        start = new Date(today.setDate(today.getDate() - 30));
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  const loadSalesAndSummary = async () => {
    try {
      const { startDate: start, endDate: end } = getDateRange();
      
      // Always use date-range endpoint with explicit dates (even for "Today")
      const [salesResponse, summaryResponse] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/sales/date-range`, {
          params: { start_date: start, end_date: end }
        }),
        axios.get(`${BACKEND_URL}/api/sales/summary`, {
          params: { start_date: start, end_date: end }
        })
      ]);
      
      setSales(salesResponse.data);
      setPaymentSummary(summaryResponse.data);
    } catch (error) {
      console.error('Error loading sales:', error);
      // Reset to empty state on error
      setSales([]);
      setPaymentSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSales();
  };

  const calculateTotalSales = () => {
    return sales.reduce((sum, sale) => sum + sale.total, 0);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getFilterLabel = () => {
    switch (selectedFilter) {
      case 'today': return "Today's Sales";
      case 'yesterday': return "Yesterday's Sales";
      case 'last7': return 'Last 7 Days';
      case 'last30': return 'Last 30 Days';
      case 'custom': return `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`;
    }
  };

  const FilterOption = ({ filter, label, icon }: { filter: DateFilter, label: string, icon: string }) => (
    <TouchableOpacity
      style={[styles.filterOption, selectedFilter === filter && styles.filterOptionSelected]}
      onPress={() => {
        setSelectedFilter(filter);
        if (filter !== 'custom') {
          setShowFilterModal(false);
        }
      }}
      activeOpacity={0.7}
    >
      <Ionicons name={icon as any} size={20} color={selectedFilter === filter ? '#FF9500' : '#666'} />
      <Text style={[styles.filterOptionText, selectedFilter === filter && styles.filterOptionTextSelected]}>
        {label}
      </Text>
      {selectedFilter === filter && <Ionicons name="checkmark" size={20} color="#FF9500" />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sales</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9500" />
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
        <Text style={styles.headerTitle}>Sales</Text>
        <TouchableOpacity onPress={() => setShowFilterModal(true)}>
          <Ionicons name="filter" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Current Filter Display */}
      <TouchableOpacity style={styles.filterBar} onPress={() => setShowFilterModal(true)}>
        <View style={styles.filterBarContent}>
          <Ionicons name="calendar" size={16} color="#FF9500" />
          <Text style={styles.filterBarText}>{getFilterLabel()}</Text>
        </View>
        <Ionicons name="chevron-down" size={16} color="#666" />
      </TouchableOpacity>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="receipt" size={32} color="#FF9500" />
            <Text style={styles.summaryValue}>{sales.length}</Text>
            <Text style={styles.summaryLabel}>Total Sales</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryItem}>
            <Ionicons name="cash" size={32} color="#34C759" />
            <Text style={styles.summaryValue}>₹{calculateTotalSales().toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {sales.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={80} color="#CCC" />
            <Text style={styles.emptyText}>No sales found</Text>
            <Text style={styles.emptySubtext}>Sales for the selected period will appear here</Text>
          </View>
        ) : (
          sales.map((sale, index) => (
            <View key={sale._id} style={styles.saleCard}>
              <View style={styles.saleHeader}>
                <View style={styles.saleNumber}>
                  <Text style={styles.saleNumberText}>#{sales.length - index}</Text>
                </View>
                <View style={styles.saleTime}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.timeText}>{formatTime(sale.timestamp)}</Text>
                </View>
              </View>

              <View style={styles.saleItems}>
                {sale.items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName}>
                      {item.productName} x{item.quantity}
                    </Text>
                    <Text style={styles.itemPrice}>
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.saleFooter}>
                <View style={styles.paymentBadge}>
                  <Ionicons name="card-outline" size={14} color="#007AFF" />
                  <Text style={styles.paymentMethod}>{sale.paymentMethod.toUpperCase()}</Text>
                </View>
                <Text style={styles.saleTotal}>₹{sale.total.toFixed(2)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Sales</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <FilterOption filter="today" label="Today" icon="today" />
              <FilterOption filter="yesterday" label="Yesterday" icon="calendar" />
              <FilterOption filter="last7" label="Last 7 Days" icon="calendar" />
              <FilterOption filter="last30" label="Last 30 Days" icon="calendar" />
              
              <View style={styles.dividerLine} />
              
              <TouchableOpacity
                style={[styles.filterOption, selectedFilter === 'custom' && styles.filterOptionSelected]}
                onPress={() => setSelectedFilter('custom')}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={20} color={selectedFilter === 'custom' ? '#FF9500' : '#666'} />
                <Text style={[styles.filterOptionText, selectedFilter === 'custom' && styles.filterOptionTextSelected]}>
                  Custom Range
                </Text>
                {selectedFilter === 'custom' && <Ionicons name="checkmark" size={20} color="#FF9500" />}
              </TouchableOpacity>

              {selectedFilter === 'custom' && (
                <View style={styles.customDateContainer}>
                  <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
                    <Text style={styles.dateButtonLabel}>Start Date</Text>
                    <Text style={styles.dateButtonValue}>{formatDateDisplay(startDate)}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
                    <Text style={styles.dateButtonLabel}>End Date</Text>
                    <Text style={styles.dateButtonValue}>{formatDateDisplay(endDate)}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.applyButton}
                    onPress={() => {
                      loadSales();
                      setShowFilterModal(false);
                    }}
                  >
                    <Text style={styles.applyButtonText}>Apply Filter</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowStartPicker(Platform.OS === 'ios');
            if (date) setStartDate(date);
          }}
          maximumDate={new Date()}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowEndPicker(Platform.OS === 'ios');
            if (date) setEndDate(date);
          }}
          maximumDate={new Date()}
          minimumDate={startDate}
        />
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
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  filterBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  summaryCard: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    width: 1,
    backgroundColor: '#EEE',
    marginHorizontal: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  saleCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  saleNumber: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  saleNumberText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  saleTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  saleItems: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EEE',
    paddingVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#1A1A1A',
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentMethod: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  saleTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    marginHorizontal: 20,
    borderRadius: 12,
  },
  filterOptionSelected: {
    backgroundColor: '#FFF8F0',
  },
  filterOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  filterOptionTextSelected: {
    color: '#FF9500',
    fontWeight: '600',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#EEE',
    marginHorizontal: 20,
    marginVertical: 8,
  },
  customDateContainer: {
    padding: 20,
    gap: 12,
  },
  dateButton: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonLabel: {
    fontSize: 14,
    color: '#666',
  },
  dateButtonValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  applyButton: {
    backgroundColor: '#FF9500',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
