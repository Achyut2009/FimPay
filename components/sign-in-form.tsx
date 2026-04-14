import { SocialConnections } from '@/components/social-connections';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useSignIn } from '@clerk/clerk-expo';
import { Link, router } from 'expo-router';
import * as React from 'react';
import { Image, type TextInput, View } from 'react-native';

export function SignInForm() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const passwordInputRef = React.useRef<TextInput>(null);
  const [error, setError] = React.useState<{ email?: string; password?: string; general?: string }>({});

  async function onSubmit() {
    if (!isLoaded) {
      return;
    }

    // Clear previous errors
    setError({});

    // Start the sign-in process using the email and password provided
    try {
      const signInAttempt = await signIn.create({
        identifier: email,
        password,
      });

      // If sign-in process is complete, set the created session as active
      // and redirect the user
      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        return;
      }
      // Handle other statuses with a user-friendly message
      console.error('Sign-in status:', signInAttempt.status);
      setError({ general: 'Sign-in incomplete. Please try again or contact support.' });
    } catch (err: any) {
      console.error('Sign-in error:', err);

      // Clerk error handling
      if (err?.errors && Array.isArray(err.errors) && err.errors.length > 0) {
        const firstError = err.errors[0];
        const message = firstError.longMessage || firstError.message || 'An error occurred';
        
        // Check if user registered via SSO/social media and is trying to use email/password
        // Clerk error codes for SSO-only accounts or password not set
        const ssoRelatedCodes = [
          'form_password_incorrect',
          'strategy_for_user_invalid', 
          'external_account_not_found',
          'form_password_not_set'
        ];
        
        const isSSOAccount = ssoRelatedCodes.includes(firstError.code) || 
          message.toLowerCase().includes('password has not been set') ||
          message.toLowerCase().includes('external account') ||
          message.toLowerCase().includes('oauth') ||
          message.toLowerCase().includes('social');
        
        if (firstError.code === 'form_identifier_not_found') {
          setError({ email: message });
        } else if (firstError.code === 'form_password_incorrect' || firstError.code === 'strategy_for_user_invalid' || firstError.code === 'form_password_not_set') {
          // Show a helpful message for users who may have registered via social media
          setError({ 
            general: 'Sign-in failed. If you registered using Google, Apple, or another social account, please use the sign-in options below instead of email and password.' 
          });
        } else if (message.toLowerCase().includes('email') || message.toLowerCase().includes('identifier')) {
          setError({ email: message });
        } else if (message.toLowerCase().includes('password')) {
          // Also check for SSO-related password errors
          setError({ 
            general: 'Sign-in failed. If you registered using Google, Apple, or another social account, please use the sign-in options below instead of email and password.' 
          });
        } else {
          setError({ general: message });
        }
        return;
      }
      
      // Handle standard Error objects
      if (err?.message) {
        setError({ general: err.message });
        return;
      }
      
      // Fallback for unknown error types
      setError({ general: 'Something went wrong. Please try again.' });
    }
  }

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  return (
    <View className="gap-4">
      <Card className="border-border/0 shadow-none sm:border-border sm:shadow-sm sm:shadow-black/5">
        <View className="items-center px-6 mb-2">
          <Image
            source={require('@/assets/images/favicon.png')}
            className="h-32 w-32 rounded"
          />
        </View>
        <CardHeader className="pt-0">
          <CardTitle className="text-center text-xl sm:text-left">Sign in to FimPay</CardTitle>
          <CardDescription className="text-center sm:text-left">
            Welcome back! Please sign in to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="m@example.com"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                onChangeText={setEmail}
                onSubmitEditing={onEmailSubmitEditing}
                returnKeyType="next"
                submitBehavior="submit"
              />
              {error.email ? (
                <Text className="text-sm font-medium text-destructive">{error.email}</Text>
              ) : null}
            </View>
            <View className="gap-1.5">
              <View className="flex-row items-center">
                <Label htmlFor="password">Password</Label>
                <Link asChild href={`/(auth)/forgot-password?email=${email}`}>
                  <Button
                    variant="link"
                    size="sm"
                    className="ml-auto h-4 px-1 py-0 web:h-fit sm:h-4">
                    <Text className="font-normal leading-4">Forgot your password?</Text>
                  </Button>
                </Link>
              </View>
              <Input
                ref={passwordInputRef}
                id="password"
                secureTextEntry
                onChangeText={setPassword}
                returnKeyType="send"
                onSubmitEditing={onSubmit}
              />
              {error.password ? (
                <Text className="text-sm font-medium text-destructive">{error.password}</Text>
              ) : null}
            </View>

            {error.general ? (
              <View className="rounded-md bg-destructive/10 p-3">
                <Text className="text-sm font-medium text-destructive">{error.general}</Text>
              </View>
            ) : null}

            <Button className="w-full" onPress={onSubmit}>
              <Text>Continue</Text>
            </Button>
          </View>
          <Text className="text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/(auth)/sign-up" className="text-sm underline underline-offset-4">
              Sign up
            </Link>
          </Text>
          <View className="flex-row items-center">
            <Separator className="flex-1" />
            <Text className="px-4 text-sm text-muted-foreground">or</Text>
            <Separator className="flex-1" />
          </View>
          <SocialConnections />
        </CardContent>
      </Card>
    </View>
  );
}