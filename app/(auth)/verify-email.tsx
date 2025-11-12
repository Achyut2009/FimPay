import React, { useState, useEffect } from 'react';
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
import { useSignUp } from '@clerk/clerk-expo';
import { useRouter, useLocalSearchParams } from 'expo-router';
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

export default function VerifyEmailScreen() {
  const { isLoaded, setActive, signUp } = useSignUp();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [email, setEmail] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed'>('pending');

  // Get email from params or signUp object
  useEffect(() => {
    if (params.email) {
      setEmail(params.email as string);
    } else if (signUp?.emailAddress) {
      setEmail(signUp.emailAddress);
    }
    
    // Check if signUp exists and is in correct state
    if (signUp) {
      console.log('SignUp status:', signUp.status);
      console.log('SignUp email:', signUp.emailAddress);
    }
  }, [params.email, signUp]);

  // Resend cooldown timer
  useEffect(() => {
    let interval: number | null = null;
    
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000) as unknown as number;
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (!isLoaded || !signUp) {
      Alert.alert('Error', 'System not ready. Please try signing up again.');
      return;
    }

    // Check if signUp is in correct state for verification
    if (signUp.status !== 'missing_requirements') {
      Alert.alert('Error', 'Cannot verify email at this time. Please try signing up again.');
      return;
    }

    if (!code.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    if (code.length !== 6) {
      Alert.alert('Error', 'Verification code must be exactly 6 digits');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting to verify email with code:', code);
      console.log('SignUp status before verification:', signUp.status);
      
      // Complete the sign-up process with email verification
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: code.trim(),
      });

      console.log('Verification result status:', completeSignUp.status);
      console.log('SignUp status after verification:', signUp.status);

      if (completeSignUp.status === 'complete') {
        setVerificationStatus('verified');
        
        // Set the active session - this will log the user in
        if (setActive && completeSignUp.createdSessionId) {
          await setActive({ session: completeSignUp.createdSessionId });
          console.log('Session activated successfully');
          
          Alert.alert(
            'Success! 🎉',
            'Your email has been verified successfully! Welcome to FimPay.',
            [
              {
                text: 'Get Started',
                onPress: () => router.replace('/(tabs)')
              }
            ]
          );
        } else {
          throw new Error('Failed to create session');
        }
      } else {
        // Handle other statuses
        console.log('Unexpected status:', completeSignUp.status);
        throw new Error(`Verification failed with status: ${completeSignUp.status}`);
      }
    } catch (err: unknown) {
      console.error('Verification error details:', err);
      setVerificationStatus('failed');
      
      let errorMessage = 'Failed to verify email. Please check the code and try again.';
      
      // Type-safe error handling
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkError = err as ClerkError;
        if (clerkError.errors && clerkError.errors.length > 0) {
          const firstError = clerkError.errors[0];
          errorMessage = firstError.longMessage || firstError.message || errorMessage;
          
          // Provide user-friendly messages for common errors
          if (firstError.code === 'form_code_incorrect') {
            errorMessage = 'The verification code is incorrect. Please check and try again.';
          } else if (firstError.code === 'form_code_expired') {
            errorMessage = 'The verification code has expired. Please request a new one.';
          } else if (firstError.code === 'verification_failed') {
            errorMessage = 'Verification failed. The code may be invalid or expired.';
          } else if (firstError.code === 'form_identifier_exists') {
            errorMessage = 'This email is already registered. Please sign in instead.';
          }
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
        
        // Handle specific error messages
        if (err.message.includes('already verified')) {
          errorMessage = 'This email is already verified. Please sign in instead.';
        } else if (err.message.includes('expired')) {
          errorMessage = 'The verification code has expired. Please request a new one.';
        }
      }

      Alert.alert('Verification Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded || !signUp || resendCooldown > 0) return;

    // Check if we can resend verification
    if (signUp.status === 'complete') {
      Alert.alert('Already Verified', 'Your email is already verified. Please sign in instead.');
      return;
    }

    setIsResending(true);

    try {
      console.log('Resending verification code to:', email);
      console.log('Current signUp status:', signUp.status);
      
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });

      setResendCooldown(30); // 30 seconds cooldown
      
      Alert.alert(
        'Code Sent! ✅',
        `A new verification code has been sent to ${email}. Please check your inbox and spam folder.`
      );
    } catch (err: unknown) {
      console.error('Resend error:', err);
      
      let errorMessage = 'Failed to resend verification code. Please try again.';
      
      if (err && typeof err === 'object' && 'errors' in err) {
        const clerkError = err as ClerkError;
        errorMessage = clerkError.errors?.[0]?.message || errorMessage;
        
        if (clerkError.errors?.[0]?.code === 'form_identifier_exists') {
          errorMessage = 'This email is already registered and verified. Please sign in instead.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      Alert.alert('Resend Failed', errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleSignInInstead = () => {
    router.replace('/sign-in');
  };

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={{ color: '#6b7280', marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  // If signUp doesn't exist or is in wrong state
  if (!signUp || signUp.status === 'complete') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white', padding: 24 }}>
        <Ionicons name="warning-outline" size={64} color="#f59e0b" />
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginTop: 16, textAlign: 'center' }}>
          Verification Issue
        </Text>
        <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 8, textAlign: 'center', lineHeight: 24 }}>
          {signUp?.status === 'complete' 
            ? 'Your email appears to be already verified. Please sign in instead.'
            : 'Unable to verify email. Please try signing up again.'
          }
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: '#4f46e5', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 24 }}
          onPress={handleSignInInstead}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Sign In Instead</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginTop: 12 }}
          onPress={handleGoBack}
        >
          <Text style={{ color: '#4f46e5', fontSize: 16, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#EEF2FF', '#E0E7FF', '#F5F3FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 }}>
            {/* Header */}
            <View style={{ marginBottom: 32 }}>
              <TouchableOpacity 
                onPress={handleGoBack}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}
              >
                <Ionicons name="arrow-back" size={24} color="#4f46e5" />
                <Text style={{ color: '#4f46e5', fontSize: 18, fontWeight: '600', marginLeft: 8 }}>Back</Text>
              </TouchableOpacity>

              <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
                Verify Your Email
              </Text>
              <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center' }}>
                We sent a verification code to
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#4f46e5', textAlign: 'center', marginTop: 4 }}>
                {email || 'your email'}
              </Text>
            </View>

            {/* Debug Info (remove in production) */}
            {__DEV__ && (
              <View style={{ backgroundColor: '#fef3c7', padding: 12, borderRadius: 8, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#d97706' }}>
                <Text style={{ fontSize: 12, color: '#92400e', fontWeight: '600' }}>Debug Info:</Text>
                <Text style={{ fontSize: 10, color: '#92400e' }}>Status: {signUp.status}</Text>
                <Text style={{ fontSize: 10, color: '#92400e' }}>Email: {email}</Text>
              </View>
            )}

            {/* Instructions */}
            <View style={{ backgroundColor: '#dbeafe', borderRadius: 16, padding: 20, marginBottom: 32, borderWidth: 1, borderColor: '#93c5fd' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
                <Text style={{ color: '#1e40af', fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                  Check your email
                </Text>
              </View>
              <Text style={{ color: '#1e40af', fontSize: 14, lineHeight: 20 }}>
                • Look for an email from FimPay{"\n"}
                • Enter the 6-digit code below{"\n"}
                • The code expires in 10 minutes{"\n"}
                • Check your spam folder if you don't see it
              </Text>
            </View>

            {/* Verification Form */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}>
              {/* Code Input */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
                  Verification Code *
                </Text>
                <TextInput
                  style={{ 
                    fontSize: 24, 
                    fontWeight: 'bold', 
                    textAlign: 'center', 
                    borderBottomWidth: 2, 
                    borderBottomColor: verificationStatus === 'failed' ? '#ef4444' : '#4f46e5', 
                    paddingVertical: 16, 
                    backgroundColor: 'transparent',
                    color: verificationStatus === 'failed' ? '#ef4444' : '#111827'
                  }}
                  placeholder="000000"
                  placeholderTextColor="#9ca3af"
                  value={code}
                  onChangeText={(text) => {
                    setCode(text.replace(/[^0-9]/g, '').slice(0, 6));
                    setVerificationStatus('pending'); // Reset status when user types
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign="center"
                  autoFocus
                  editable={!isLoading}
                  selectionColor="#4f46e5"
                />
                <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 8 }}>
                  Enter the 6-digit code from your email
                </Text>
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={{ 
                  paddingVertical: 14, 
                  borderRadius: 8, 
                  marginBottom: 16,
                  backgroundColor: !code || code.length !== 6 || isLoading ? '#a5b4fc' : '#4f46e5'
                }}
                onPress={handleVerify}
                disabled={!code || code.length !== 6 || isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                      Verifying...
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
                    Verify Email
                  </Text>
                )}
              </TouchableOpacity>

              {/* Resend Code */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#6b7280' }}>
                  Didn't receive the code?{' '}
                </Text>
                <TouchableOpacity 
                  onPress={handleResendCode}
                  disabled={isResending || resendCooldown > 0}
                >
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: '600',
                    color: isResending || resendCooldown > 0 ? '#9ca3af' : '#4f46e5'
                  }}>
                    {isResending 
                      ? 'Sending...' 
                      : resendCooldown > 0 
                        ? `Resend (${resendCooldown}s)`
                        : 'Resend Code'
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Help Section */}
            <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
                Need help?
              </Text>
              
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Ionicons name="mail-outline" size={18} color="#6b7280" style={{ marginTop: 2 }} />
                  <Text style={{ color: '#6b7280', fontSize: 14, marginLeft: 8, flex: 1 }}>
                    <Text style={{ fontWeight: '600' }}>Check spam folder:</Text> Sometimes our emails end up there by mistake.
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Ionicons name="time-outline" size={18} color="#6b7280" style={{ marginTop: 2 }} />
                  <Text style={{ color: '#6b7280', fontSize: 14, marginLeft: 8, flex: 1 }}>
                    <Text style={{ fontWeight: '600' }}>Code expired?</Text> Request a new code using the resend button above.
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Ionicons name="help-circle-outline" size={18} color="#6b7280" style={{ marginTop: 2 }} />
                  <Text style={{ color: '#6b7280', fontSize: 14, marginLeft: 8, flex: 1 }}>
                    <Text style={{ fontWeight: '600' }}>Still having trouble?</Text> Contact support at support@fimpay.com
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}