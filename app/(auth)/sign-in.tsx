import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSignIn, useOAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Type definitions for Clerk errors
interface ClerkError {
  errors?: Array<{
    message: string;
    code?: string;
    longMessage?: string;
  }>;
}

export default function SignInScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // OAuth hooks for sign in
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startMicrosoftOAuth } = useOAuth({ strategy: 'oauth_microsoft' });

  const handleSubmit = async () => {
    if (!isLoaded || !setActive) return;

    // Basic validation
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (email.includes(' ') || password.includes(' ')) {
      Alert.alert('Error', 'Email and password cannot contain spaces');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password: password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', 'Sign in failed. Please check your credentials.');
      }
    } catch (err: unknown) {
      console.error('Sign in error:', err);
      
      let errorMessage = 'An error occurred during sign in. Please try again.';
      
      // Type-safe error handling
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkError = err as ClerkError;
        errorMessage = clerkError.errors?.[0]?.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      Alert.alert(
        'Sign In Failed',
        errorMessage
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isLoaded) return;

    setIsLoading(true);

    try {
      const { createdSessionId, setActive } = await startGoogleOAuth();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/(tabs)');
      } else {
        throw new Error('Google sign in incomplete');
      }
    } catch (err: unknown) {
      console.error('Google OAuth error:', err);
      
      // Check if it's a cancellation (user closed the OAuth flow)
      if (err instanceof Error && (err.message.includes('cancelled') || err.message.includes('user_cancelled'))) {
        return;
      }

      let errorMessage = 'Failed to sign in with Google. Please try again.';
      
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkError = err as ClerkError;
        errorMessage = clerkError.errors?.[0]?.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      Alert.alert(
        'Google Sign In Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    if (!isLoaded) return;

    setIsLoading(true);

    try {
      const { createdSessionId, setActive } = await startMicrosoftOAuth();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/(tabs)');
      } else {
        throw new Error('Microsoft sign in incomplete');
      }
    } catch (err: unknown) {
      console.error('Microsoft OAuth error:', err);
      
      // Check if it's a cancellation (user closed the OAuth flow)
      if (err instanceof Error && (err.message.includes('cancelled') || err.message.includes('user_cancelled'))) {
        return;
      }

      let errorMessage = 'Failed to sign in with Microsoft. Please try again.';
      
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkError = err as ClerkError;
        errorMessage = clerkError.errors?.[0]?.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      Alert.alert(
        'Microsoft Sign In Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Background Gradient */}
      <LinearGradient
        colors={['#EEF2FF', '#E0E7FF', '#F5F3FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow"
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 pt-16 pb-10">
            {/* Header */}
            <View className="mb-8">
              <Text className="text-3xl font-bold text-gray-900 mb-2 text-center">
                Welcome Back to FimPay
              </Text>
              <Text className="text-base text-gray-600 text-center">
                Sign in to your FimPay account
              </Text>
            </View>

            {/* OAuth Buttons */}
            <View className="flex-row gap-3 mb-6">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center py-4 bg-white rounded-xl border border-gray-200 shadow-sm"
                onPress={handleGoogleSignIn}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <Text className="text-base font-semibold text-gray-900 ml-2">Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center py-4 bg-white rounded-xl border border-gray-200 shadow-sm"
                onPress={handleMicrosoftSignIn}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-microsoft" size={20} color="#00A4EF" />
                <Text className="text-base font-semibold text-gray-900 ml-2">Microsoft</Text>
              </TouchableOpacity>
            </View>

            {/* Separator */}
            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-px bg-gray-300" />
              <Text className="mx-4 text-sm text-gray-500 uppercase">Or continue with email</Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            {/* Form Card */}
            <View className="bg-white rounded-2xl p-6 shadow-lg">
              {/* Email */}
              <View className="mb-5">
                <Text className="text-sm font-semibold text-gray-900 mb-2">
                  Email Address
                </Text>
                <View className="flex-row items-center bg-gray-50 rounded-lg px-3 border border-gray-200">
                  <Ionicons name="mail-outline" size={20} color="#9ca3af" />
                  <TextInput
                    className="flex-1 py-3.5 px-2 text-base text-gray-900"
                    placeholder="Enter your email"
                    placeholderTextColor="#9ca3af"
                    value={email}
                    onChangeText={(text) => setEmail(text.replace(/\s/g, ''))}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    editable={!isLoading}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Password */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-900 mb-2">Password</Text>
                <View className="flex-row items-center bg-gray-50 rounded-lg px-3 border border-gray-200">
                  <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                  <TextInput
                    className="flex-1 py-3.5 px-2 text-base text-gray-900"
                    placeholder="Enter your password"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={(text) => setPassword(text.replace(/\s/g, ''))}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    returnKeyType="done"
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)} 
                    className="p-1"
                    disabled={isLoading}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                className={`py-3.5 rounded-lg ${
                  !email || !password || isLoading
                    ? 'bg-indigo-300'
                    : 'bg-indigo-600'
                }`}
                onPress={handleSubmit}
                disabled={!email || !password || isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text className="text-white text-base font-semibold ml-2">
                      Signing in...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-white text-base font-semibold text-center">
                    Sign in
                  </Text>
                )}
              </TouchableOpacity>

              {/* Forgot Password Link */}
              <TouchableOpacity className="mt-4">
                <Text className="text-sm text-indigo-600 text-center font-semibold">
                  Forgot your password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sign Up Link */}
            <View className="flex-row justify-center items-center mt-8 pt-6 border-t border-gray-200">
              <Text className="text-sm text-gray-600">Don't have an account?</Text>
              <TouchableOpacity 
                onPress={() => router.push('/sign-up')} 
                className="ml-1"
                disabled={isLoading}
              >
                <Text className="text-sm font-semibold text-indigo-600">Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}