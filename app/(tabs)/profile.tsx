import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useUser, useAuth, useClerk } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Settings, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Shield,
  HelpCircle,
  LogOut,
  Trash2,
  X,
  ChevronRight,
  CreditCard,
  Bell,
  Lock
} from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const { session } = useClerk();
  const router = useRouter();
  
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(SCREEN_HEIGHT))[0];

  const openSettings = () => {
    setSettingsVisible(true);
    // Start animation on next frame to ensure modal is mounted
    setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 10);
  };

  const closeSettings = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setSettingsVisible(false);
      setDeleteAccountVisible(false);
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    setDeleteAccountVisible(true);
  };

  const confirmDeleteAccount = async () => {
    try {
      Alert.alert(
        'Account Deletion Initiated',
        'Your account deletion has been done. Any remaining balance of $2,458.75 will be transferred to your registered bank account within 3-5 business days.',
        [{ text: 'OK', onPress: () => signOut() }]
      );
      closeSettings();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const AccountDetailRow = ({ icon: Icon, label, value }: any) => (
    <View className="flex-row items-center py-4 border-b border-gray-100">
      <View className="w-10 items-center">
        <Icon size={20} color="#6b7280" />
      </View>
      <View className="flex-1 ml-4">
        <Text className="text-gray-600 text-sm font-medium">{label}</Text>
        <Text className="text-gray-900 text-base font-semibold mt-1">{value}</Text>
      </View>
    </View>
  );

  const SettingsItem = ({ icon: Icon, title, subtitle, onPress, isDestructive = false }: any) => (
    <TouchableOpacity 
      className="flex-row items-center py-4 border-b border-gray-100"
      onPress={onPress}
    >
      <View className={`w-10 h-10 rounded-lg items-center justify-center ${
        isDestructive ? 'bg-red-50' : 'bg-gray-50'
      }`}>
        <Icon size={20} color={isDestructive ? '#dc2626' : '#374151'} />
      </View>
      <View className="flex-1 ml-4">
        <Text className={`text-base font-semibold ${
          isDestructive ? 'text-red-600' : 'text-gray-900'
        }`}>
          {title}
        </Text>
        {subtitle && (
          <Text className="text-gray-500 text-sm mt-1">{subtitle}</Text>
        )}
      </View>
      <ChevronRight size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 pt-6 pb-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900">Profile</Text>
          <TouchableOpacity 
            onPress={openSettings}
            className="w-10 h-10 items-center justify-center bg-gray-100 rounded-full"
          >
            <Settings size={20} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Your existing profile content remains the same */}
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          className="mx-6 my-6 rounded-3xl shadow-2xl shadow-purple-500/30"
        >
          <View className="p-6">
            <View className="flex-row items-center">
              <View className="w-16 h-16 bg-white/20 rounded-2xl items-center justify-center">
                <User size={28} color="#ffffff" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-white text-xl font-bold">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : 'Complete Your Profile'
                  }
                </Text>
                <Text className="text-white/80 text-base mt-1">
                  {user?.primaryEmailAddress?.emailAddress}
                </Text>
                <Text className="text-white/60 text-sm mt-2">
                  Member since {user?.createdAt ? formatDate(user.createdAt.toString()) : 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Account Details */}
        <View className="bg-white mx-6 rounded-2xl shadow-sm">
          <View className="px-6 py-4 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900">Account Details</Text>
          </View>
          
          <View className="px-2">
            <AccountDetailRow
              icon={User}
              label="Full Name"
              value={user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : 'Not set'
              }
            />
            
            <AccountDetailRow
              icon={Mail}
              label="Email Address"
              value={user?.primaryEmailAddress?.emailAddress || 'N/A'}
            />        
            <AccountDetailRow
              icon={Calendar}
              label="Member Since"
              value={user?.createdAt ? formatDate(user.createdAt.toString()) : 'N/A'}
            />
          </View>
        </View>

        {/* Current Balance */}
        <View className="bg-white mx-6 mt-6 rounded-2xl shadow-sm">
          <View className="px-6 py-4 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900">Current Balance</Text>
          </View>
          <View className="p-6">
            <Text className="text-3xl font-bold text-gray-900">$2,458.75</Text>
            <Text className="text-green-600 text-sm font-medium mt-2">
              + $125.50 this month
            </Text>
          </View>
        </View>

        {/* Security Status */}
        <View className="bg-white mx-6 mt-6 rounded-2xl shadow-sm mb-8">
          <View className="px-6 py-4 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900">Security Status</Text>
          </View>
          <View className="p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-gray-700 font-medium">Two-Factor Authentication</Text>
              <View className="bg-green-100 px-3 py-1 rounded-full">
                <Text className="text-green-700 text-sm font-medium">Active</Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-700 font-medium">Last Login</Text>
              <Text className="text-gray-500 text-sm">
                {session?.lastActiveAt ? formatDate(session.lastActiveAt.toString()) : 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FIXED Settings Modal */}
      <Modal
        visible={settingsVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeSettings}
        statusBarTranslucent={true}
      >
        <View className="flex-1 bg-black/50 justify-end">
          {/* Backdrop that closes modal when tapped */}
          <TouchableOpacity 
            className="absolute top-0 left-0 right-0 bottom-0"
            activeOpacity={1}
            onPress={closeSettings}
          />
          
          <Animated.View 
            className="bg-white rounded-t-3xl overflow-hidden"
            style={{ 
              transform: [{ translateY: slideAnim }],
              maxHeight: SCREEN_HEIGHT * 0.85
            }}
          >
            {/* Drag Handle */}
            <View className="items-center py-3">
              <View className="w-12 h-1 bg-gray-300 rounded-full" />
            </View>

            {/* Header */}
            <View className="flex-row items-center justify-between px-6 pb-4 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-900">Settings</Text>
              <TouchableOpacity 
                onPress={closeSettings}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 30 }}
            >
              {/* Account Settings */}
              <View className="px-6 pt-6">
                <Text className="text-gray-500 text-sm font-medium uppercase mb-4">
                  Account Settings
                </Text>
                
                <SettingsItem
                  icon={User}
                  title="Personal Information"
                  subtitle="Update your name and contact details"
                  onPress={() => Alert.alert('Info', 'Personal information update screen')}
                />
                
                <SettingsItem
                  icon={Lock}
                  title="Security Settings"
                  subtitle="Change password and 2FA"
                  onPress={() => Alert.alert('Info', 'Security settings screen')}
                />
                
                <SettingsItem
                  icon={Bell}
                  title="Notifications"
                  subtitle="Manage your notification preferences"
                  onPress={() => Alert.alert('Info', 'Notification settings screen')}
                />
                
                <SettingsItem
                  icon={CreditCard}
                  title="Payment Methods"
                  subtitle="Manage your linked bank accounts"
                  onPress={() => Alert.alert('Info', 'Payment methods screen')}
                />
              </View>

              {/* Support */}
              <View className="px-6 pt-6">
                <Text className="text-gray-500 text-sm font-medium uppercase mb-4">
                  Support
                </Text>
                
                <SettingsItem
                  icon={HelpCircle}
                  title="Help & Support"
                  subtitle="Get help with your account"
                  onPress={() => Alert.alert('Info', 'Help and support screen')}
                />
                
                <SettingsItem
                  icon={Shield}
                  title="Privacy Policy"
                  subtitle="Learn about our privacy practices"
                  onPress={() => Alert.alert('Info', 'Privacy policy screen')}
                />
              </View>

              {/* Danger Zone */}
              <View className="px-6 pt-6">
                <Text className="text-gray-500 text-sm font-medium uppercase mb-4">
                  Account Actions
                </Text>
                
                <SettingsItem
                  icon={LogOut}
                  title="Sign Out"
                  subtitle="Sign out of your account"
                  onPress={handleSignOut}
                />
                
                <SettingsItem
                  icon={Trash2}
                  title="Delete Account"
                  subtitle="Permanently delete your account"
                  onPress={handleDeleteAccount}
                  isDestructive={true}
                />
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={deleteAccountVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteAccountVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View className="w-12 h-12 bg-red-100 rounded-full items-center justify-center mb-3">
                <Trash2 size={24} color="#dc2626" />
              </View>
              <Text className="text-xl font-bold text-gray-900 text-center">
                Delete Account
              </Text>
            </View>
            
            <Text className="text-gray-600 text-center mb-2">
              Are you sure you want to delete your account? This action cannot be undone.
            </Text>
            
            <Text className="text-green-600 text-sm text-center font-medium mb-4">
              Your current balance of $2,458.75 will be automatically transferred to your registered bank account within 3-5 business days.
            </Text>
            
            <View className="flex-row space-x-3">
              <TouchableOpacity 
                className="flex-1 bg-gray-100 rounded-xl py-3"
                onPress={() => setDeleteAccountVisible(false)}
              >
                <Text className="text-gray-700 font-semibold text-center">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-1 bg-red-600 rounded-xl py-3"
                onPress={confirmDeleteAccount}
              >
                <Text className="text-white font-semibold text-center">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}