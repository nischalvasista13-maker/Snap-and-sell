import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as ImageManipulator from 'expo-image-manipulator';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Sell() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState<any>(null);
  const [capturing, setCapturing] = useState(false);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#34C759" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera" size={80} color="#34C759" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>We need camera access to identify products</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef && !capturing) {
      setCapturing(true);
      try {
        const photo = await cameraRef.takePictureAsync({
          quality: 0.5,
          base64: false,
        });
        
        // Compress and resize image
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 800 } }],
          { 
            compress: 0.6, 
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true 
          }
        );
        
        // Navigate to item match selection
        router.push({
          pathname: '/item-match',
          params: { imageData: `data:image/jpeg;base64,${manipulatedImage.base64}` }
        });
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to capture image');
        setCapturing(false);
      }
    }
  };

  const skipCamera = () => {
    router.push('/item-match');
  };

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        ref={setCameraRef}
        facing="back"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sell Item</Text>
          <TouchableOpacity style={styles.headerButton} onPress={skipCamera}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Guide Frame */}
        <View style={styles.guideContainer}>
          <View style={styles.guideFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.guideText}>Capture product image to find matches</Text>
          <Text style={styles.guideSubtext}>Or skip to browse all products</Text>
        </View>

        {/* Capture Button */}
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.captureButton}
            onPress={takePicture}
            disabled={capturing}
            activeOpacity={0.8}
          >
            {capturing ? (
              <ActivityIndicator size="large" color="#FFF" />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerButton: {
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  skipText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  guideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#34C759',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  guideText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  guideSubtext: {
    color: '#FFF',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.8,
  },
  controls: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(52, 199, 89, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#34C759',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#34C759',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F5F5F5',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 24,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#34C759',
    fontSize: 16,
  },
});