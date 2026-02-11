import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function DataDeletion() {
  const router = useRouter();

  const handleEmailPress = () => {
    Linking.openURL('mailto:salemate9@gmail.com?subject=Account%20%26%20Data%20Deletion%20Request');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Data Deletion</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <Ionicons name="trash-outline" size={60} color="#FF3B30" />
        </View>

        <Text style={styles.title}>Account & Data Deletion Request</Text>
        
        <Text style={styles.text}>
          If you want to delete your SaleMate account and associated data, please email us with the details below.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Email</Text>
          <TouchableOpacity onPress={handleEmailPress} style={styles.emailButton}>
            <Ionicons name="mail-outline" size={20} color="#007AFF" />
            <Text style={styles.emailText}>salemate9@gmail.com</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Please Include</Text>
          <View style={styles.bulletContainer}>
            <Text style={styles.bullet}>• Registered username</Text>
            <Text style={styles.bullet}>• Store name (if applicable)</Text>
            <Text style={styles.bullet}>• Reason for deletion (optional)</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="time-outline" size={24} color="#007AFF" />
          <Text style={styles.infoText}>
            We will process your request and delete your account and associated data within 7 working days.
          </Text>
        </View>

        <Text style={styles.note}>
          Note: Once deleted, your data cannot be recovered. This includes all sales records, inventory data, and account information.
        </Text>

        <TouchableOpacity style={styles.emailButtonLarge} onPress={handleEmailPress}>
          <Ionicons name="mail" size={24} color="#FFF" />
          <Text style={styles.emailButtonText}>Send Deletion Request</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
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
  iconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emailText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  bulletContainer: {
    gap: 8,
  },
  bullet: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
  },
  note: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
    lineHeight: 20,
  },
  emailButtonLarge: {
    flexDirection: 'row',
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emailButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
