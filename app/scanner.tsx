import { Stack } from 'expo-router';
import * as React from 'react';
import { View, TouchableOpacity, Alert, StyleSheet, Dimensions } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ScanLine, Camera, QrCode, CreditCard, Smartphone } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ScannerScreen() {
  const [scanMode, setScanMode] = React.useState<'qr' | 'card' | 'receipt'>('qr');
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    // Camera permissions are still loading
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-center mb-4">We need your permission to show the camera</Text>
        <Button onPress={requestPermission}>
          <Text>Grant Permission</Text>
        </Button>
      </View>
    );
  }

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    Alert.alert(`Bar code with type ${type} and data ${data} has been scanned!`);
    // Here you can process the scanned data, e.g., send to backend
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Scanner',
          headerStyle: { backgroundColor: '#6366f1' },
          headerTintColor: '#ffffff',
        }}
      />
      <View className="flex-1 bg-gray-50">
        {/* Camera View */}
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          onBarcodeScanned={scanMode === 'qr' ? handleBarCodeScanned : undefined}
        >
          <View className="flex-1 relative">
            {/* Scan Frame Overlay */}
            <View className="absolute inset-0 items-center justify-center pointer-events-none">
              <View className="w-64 h-64 border-2 border-blue-400 rounded-lg">
                <View className="absolute -top-1 -left-1 w-6 h-6 border-l-2 border-t-2 border-blue-400 rounded-tl-lg" />
                <View className="absolute -top-1 -right-1 w-6 h-6 border-r-2 border-t-2 border-blue-400 rounded-tr-lg" />
                <View className="absolute -bottom-1 -left-1 w-6 h-6 border-l-2 border-b-2 border-blue-400 rounded-bl-lg" />
                <View className="absolute -bottom-1 -right-1 w-6 h-6 border-r-2 border-b-2 border-blue-400 rounded-br-lg" />
              </View>
            </View>
          </View>
        </CameraView>

        {/* Scan Mode Selector */}
        <View className="bg-white px-4 py-3 border-t border-gray-200">
          <View className="flex-row justify-around">
            <TouchableOpacity
              className={`items-center px-3 py-2 rounded-lg ${scanMode === 'qr' ? 'bg-blue-100' : ''}`}
              onPress={() => setScanMode('qr')}
            >
              <QrCode size={24} color={scanMode === 'qr' ? '#3b82f6' : '#6b7280'} />
              <Text className={`text-xs mt-1 ${scanMode === 'qr' ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                QR Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`items-center px-3 py-2 rounded-lg ${scanMode === 'card' ? 'bg-blue-100' : ''}`}
              onPress={() => setScanMode('card')}
            >
              <CreditCard size={24} color={scanMode === 'card' ? '#3b82f6' : '#6b7280'} />
              <Text className={`text-xs mt-1 ${scanMode === 'card' ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                Card
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`items-center px-3 py-2 rounded-lg ${scanMode === 'receipt' ? 'bg-blue-100' : ''}`}
              onPress={() => setScanMode('receipt')}
            >
              <Smartphone size={24} color={scanMode === 'receipt' ? '#3b82f6' : '#6b7280'} />
              <Text className={`text-xs mt-1 ${scanMode === 'receipt' ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                Receipt
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="bg-white px-4 py-4">
          <Button
            onPress={() => Alert.alert('Scan', `Scanning ${scanMode}...`)}
            className="w-full mb-3"
          >
            <ScanLine size={20} color="#ffffff" />
            <Text className="text-white font-semibold ml-2">
              Scan {scanMode === 'qr' ? 'QR Code' : scanMode === 'card' ? 'Card' : 'Receipt'}
            </Text>
          </Button>

          <View className="flex-row space-x-2">
            <Button
              onPress={() => Alert.alert('Manual Entry', 'Manual entry coming soon!')}
              variant="outline"
              className="flex-1"
            >
              <Text className="text-gray-700">Manual Entry</Text>
            </Button>

            <Button
              onPress={() => Alert.alert('History', 'Scan history coming soon!')}
              variant="outline"
              className="flex-1"
            >
              <Text className="text-gray-700">History</Text>
            </Button>
          </View>
        </View>

        {/* Demo Info Card */}
        <View className="px-4 pb-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Demo Features</CardTitle>
            </CardHeader>
            <CardContent>
              <Text className="text-sm text-gray-600 leading-5">
                • QR Code scanning for payments{'\n'}
                • Card number capture for transactions{'\n'}
                • Receipt scanning for expense tracking{'\n'}
                • Manual entry fallback{'\n'}
                • Scan history and favorites
              </Text>
            </CardContent>
          </Card>
        </View>
      </View>
    </>
  );
}