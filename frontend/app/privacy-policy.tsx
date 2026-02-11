import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.effectiveDate}>Effective Date: 9th Feb 2026</Text>
        
        <Text style={styles.intro}>
          SaleMate ("we", "our", or "us") is a mobile Point of Sale (POS) application designed to help retailers manage billing, inventory, and sales. This Privacy Policy explains how we collect, use, and protect user data.
        </Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        
        <Text style={styles.subTitle}>a. Personal Information</Text>
        <Text style={styles.text}>
          • Phone Number - Collected optionally during checkout for:{'\n'}
          • Credit (udhaar) sales tracking{'\n'}
          • Sending bills via WhatsApp (user-initiated)
        </Text>

        <Text style={styles.subTitle}>b. Product & Inventory Data</Text>
        <Text style={styles.text}>
          • Product images captured using the camera or selected from the gallery{'\n'}
          • Product names, prices, sizes, and stock quantities
        </Text>

        <Text style={styles.subTitle}>c. Sales & Transaction Data</Text>
        <Text style={styles.text}>
          • Sale items and amounts{'\n'}
          • Payment modes (Cash, UPI, Card, Credit){'\n'}
          • Discounts applied{'\n'}
          • Date and time of transactions
        </Text>

        <Text style={styles.subTitle}>d. App Usage Data</Text>
        <Text style={styles.text}>
          • App interactions related to billing, inventory, and reports{'\n'}
          • Crash logs (for app stability and improvement)
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use the Data</Text>
        <Text style={styles.text}>
          We use collected data solely to:{'\n'}
          • Enable billing and checkout{'\n'}
          • Manage inventory and stock levels{'\n'}
          • Track credit (udhaar) sales{'\n'}
          • Generate sales reports and summaries{'\n'}
          • Send bills via WhatsApp when requested by the user{'\n'}
          • Improve app performance and reliability
        </Text>

        <Text style={styles.sectionTitle}>3. Data Sharing</Text>
        <Text style={styles.text}>
          SaleMate does not sell, rent, or share user data with third parties.{'\n\n'}
          Data is not used for advertising, marketing, or profiling.
        </Text>

        <Text style={styles.sectionTitle}>4. Data Security</Text>
        <Text style={styles.text}>
          • All data transmitted between the app and servers is encrypted in transit (HTTPS/TLS).{'\n'}
          • Reasonable technical and organizational measures are used to protect stored data.
        </Text>

        <Text style={styles.sectionTitle}>5. Data Retention</Text>
        <Text style={styles.text}>
          Data such as inventory, sales records, and phone numbers is stored only as long as required to provide app functionality.{'\n\n'}
          Users may request deletion of their account and associated data at any time.
        </Text>

        <Text style={styles.sectionTitle}>6. Account & Data Deletion</Text>
        <Text style={styles.text}>
          Users can request deletion of their SaleMate account and all associated data by contacting us:{'\n\n'}
          Email: salemate9@gmail.com{'\n\n'}
          Please include:{'\n'}
          • Registered username{'\n'}
          • Store name (if applicable){'\n\n'}
          Deletion requests will be processed within 7 working days.
        </Text>

        <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
        <Text style={styles.text}>
          SaleMate is intended for business use only and is not designed for children under the age of 18.{'\n\n'}
          We do not knowingly collect data from children.
        </Text>

        <Text style={styles.sectionTitle}>8. Permissions Used</Text>
        <Text style={styles.text}>
          SaleMate may request:{'\n'}
          • Camera access – to capture product images{'\n'}
          • Media access – to select product images from gallery{'\n\n'}
          These permissions are used strictly for app functionality.
        </Text>

        <Text style={styles.sectionTitle}>9. Changes to This Privacy Policy</Text>
        <Text style={styles.text}>
          We may update this Privacy Policy from time to time.{'\n\n'}
          Any changes will be reflected on this page with an updated effective date.
        </Text>

        <Text style={styles.sectionTitle}>10. Contact Us</Text>
        <Text style={styles.text}>
          If you have any questions about this Privacy Policy or data practices, contact us at:{'\n\n'}
          Email: salemate9@gmail.com
        </Text>

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
  effectiveDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  intro: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 20,
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginBottom: 8,
  },
  bottomSpacer: {
    height: 40,
  },
});
