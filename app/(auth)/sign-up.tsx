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
import { useSignUp, useOAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';

// Warm up the browser for OAuth
WebBrowser.maybeCompleteAuthSession();

// Type definitions for Clerk errors
interface ClerkError {
  errors?: Array<{
    message: string;
    code?: string;
    longMessage?: string;
  }>;
}

export default function SignUpScreen() {
  const { isLoaded, signUp } = useSignUp();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // OAuth hooks
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startMicrosoftOAuth } = useOAuth({ strategy: 'oauth_microsoft' });

  const handleSubmit = async () => {
    if (!isLoaded) return;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate no spaces in email and password
    if (email.includes(' ') || password.includes(' ')) {
      Alert.alert('Error', 'Email and password cannot contain spaces');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const signUpData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: email.trim(),
        password: password,
      };

      console.log('Attempting to create account with:', { 
        firstName: signUpData.firstName,
        lastName: signUpData.lastName,
        email: signUpData.emailAddress,
        passwordLength: signUpData.password.length 
      });

      // Start the sign-up process
      const result = await signUp.create(signUpData);

      console.log('Sign up result:', result.status);

      // Prepare email verification
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      // Navigate to verification screen
      Alert.alert(
        'Verification Email Sent! ✅',
        `We've sent a verification code to ${email}. Please check your inbox and spam folder.`,
        [
          {
            text: 'Enter Verification Code',
            onPress: () => router.push({
              pathname: '/verify-email',
              params: { email: email.trim() }
            })
          }
        ]
      );

    } catch (err: unknown) {
      console.error('Sign up error details:', err);
      
      let errorMessage = 'An error occurred during sign up. Please try again.';
      
      // Type-safe error handling
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkError = err as ClerkError;
        if (clerkError.errors && clerkError.errors.length > 0) {
          const firstError = clerkError.errors[0];
          errorMessage = firstError.longMessage || firstError.message || errorMessage;
          
          // Provide more user-friendly messages for common errors
          if (firstError.code === 'form_identifier_exists') {
            errorMessage = 'This email address is already registered. Please try signing in instead.';
          } else if (firstError.code === 'form_password_length_too_short') {
            errorMessage = 'Password is too short. Please use at least 8 characters.';
          } else if (firstError.code === 'form_password_pwned') {
            errorMessage = 'This password has been compromised in data breaches. Please choose a different password.';
          } else if (firstError.code === 'form_param_format_invalid') {
            if (firstError.message.includes('email')) {
              errorMessage = 'Please enter a valid email address.';
            }
          }
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      Alert.alert(
        'Sign Up Failed ❌',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!isLoaded) return;

    setIsLoading(true);

    try {
      const { createdSessionId, setActive } = await startGoogleOAuth();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/(tabs)');
      } else {
        throw new Error('Google sign up incomplete');
      }
    } catch (err: unknown) {
      console.error('Google OAuth error:', err);
      
      // Check if it's a cancellation (user closed the OAuth flow)
      if (err instanceof Error && err.message.includes('cancelled')) {
        return;
      }

      let errorMessage = 'Failed to sign up with Google. Please try again.';
      
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkError = err as ClerkError;
        errorMessage = clerkError.errors?.[0]?.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      Alert.alert(
        'Google Sign Up Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftSignUp = async () => {
    if (!isLoaded) return;

    setIsLoading(true);

    try {
      const { createdSessionId, setActive } = await startMicrosoftOAuth();

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/(tabs)');
      } else {
        throw new Error('Microsoft sign up incomplete');
      }
    } catch (err: unknown) {
      console.error('Microsoft OAuth error:', err);
      
      // Check if it's a cancellation (user closed the OAuth flow)
      if (err instanceof Error && err.message.includes('cancelled')) {
        return;
      }

      let errorMessage = 'Failed to sign up with Microsoft. Please try again.';
      
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkError = err as ClerkError;
        errorMessage = clerkError.errors?.[0]?.message || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      Alert.alert(
        'Microsoft Sign Up Failed',
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
        <Text className="text-gray-600 mt-4">Loading...</Text>
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
                Sign Up with FimPay
              </Text>
              <Text className="text-base text-gray-600 text-center">
                Join thousands of users managing their finances with FimPay
              </Text>
            </View>

            {/* OAuth Buttons */}
            <View className="flex-row gap-3 mb-6">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center py-4 bg-white rounded-xl border border-gray-200 shadow-sm"
                onPress={handleGoogleSignUp}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <Text className="text-base font-semibold text-gray-900 ml-2">Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center py-4 bg-white rounded-xl border border-gray-200 shadow-sm"
                onPress={handleMicrosoftSignUp}
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
              <Text className="mx-4 text-sm text-gray-500 uppercase">Or sign up with email</Text>
              <View className="flex-1 h-px bg-gray-300" />
            </View>

            {/* Form Card */}
            <View className="bg-white rounded-2xl p-6 shadow-lg">
              {/* First Name & Last Name Row */}
              <View className="flex-row gap-4 mb-5">
                {/* First Name */}
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900 mb-2">
                    First Name *
                  </Text>
                  <View className="flex-row items-center bg-gray-50 rounded-lg px-3 border border-gray-200">
                    <Ionicons name="person-outline" size={20} color="#9ca3af" />
                    <TextInput
                      className="flex-1 py-3.5 px-2 text-base text-gray-900"
                      placeholder="First name"
                      placeholderTextColor="#9ca3af"
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                      autoCorrect={false}
                      editable={!isLoading}
                      returnKeyType="next"
                    />
                  </View>
                </View>

                {/* Last Name */}
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900 mb-2">
                    Last Name *
                  </Text>
                  <View className="flex-row items-center bg-gray-50 rounded-lg px-3 border border-gray-200">
                    <Ionicons name="person-outline" size={20} color="#9ca3af" />
                    <TextInput
                      className="flex-1 py-3.5 px-2 text-base text-gray-900"
                      placeholder="Last name"
                      placeholderTextColor="#9ca3af"
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                      autoCorrect={false}
                      editable={!isLoading}
                      returnKeyType="next"
                    />
                  </View>
                </View>
              </View>

              {/* Email */}
              <View className="mb-5">
                <Text className="text-sm font-semibold text-gray-900 mb-2">
                  Email Address *
                </Text>
                <View className="flex-row items-center bg-gray-50 rounded-lg px-3 border border-gray-200">
                  <Ionicons name="mail-outline" size={20} color="#9ca3af" />
                  <TextInput
                    className="flex-1 py-3.5 px-2 text-base text-gray-900"
                    placeholder="Enter your email address"
                    placeholderTextColor="#9ca3af"
                    value={email}
                    onChangeText={(text) => setEmail(text.replace(/\s/g, ''))}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    editable={!isLoading}
                    returnKeyType="next"
                    autoComplete="email"
                  />
                </View>
              </View>

              {/* Password */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-900 mb-2">
                  Password *
                </Text>
                <View className="flex-row items-center bg-gray-50 rounded-lg px-3 border border-gray-200">
                  <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                  <TextInput
                    className="flex-1 py-3.5 px-2 text-base text-gray-900"
                    placeholder="Create a password"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={(text) => setPassword(text.replace(/\s/g, ''))}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    returnKeyType="done"
                    autoComplete="password"
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
                <Text className="text-xs text-gray-500 mt-2">
                  Use 8+ characters with a mix of letters, numbers & symbols
                </Text>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                className={`py-3.5 rounded-lg ${
                  !firstName || !lastName || !email || !password || isLoading
                    ? 'bg-indigo-300'
                    : 'bg-indigo-600'
                }`}
                onPress={handleSubmit}
                disabled={!firstName || !lastName || !email || !password || isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text className="text-white text-base font-semibold ml-2">
                      Creating Account...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-white text-base font-semibold text-center">
                    Create Account
                  </Text>
                )}
              </TouchableOpacity>

              {/* Terms Notice */}
              <Text className="text-xs text-gray-500 text-center mt-4">
                By creating an account, you agree to our{' '}
                <Text className="text-indigo-600 font-semibold">Terms of Service</Text> and{' '}
                <Text className="text-indigo-600 font-semibold">Privacy Policy</Text>
              </Text>
            </View>

            {/* Sign In Link */}
            <View className="flex-row justify-center items-center mt-8 pt-6 border-t border-gray-200">
              <Text className="text-sm text-gray-600">Already have an account?</Text>
              <TouchableOpacity 
                onPress={() => router.push('/sign-in')} 
                className="ml-1"
                disabled={isLoading}
              >
                <Text className="text-sm font-semibold text-indigo-600">Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}