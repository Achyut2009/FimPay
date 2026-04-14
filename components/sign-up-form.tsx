import { SocialConnections } from '@/components/social-connections';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useSignUp } from '@clerk/clerk-expo';
import { Link, router } from 'expo-router';
import * as React from 'react';
import { Image, TextInput, View } from 'react-native';

export function SignUpForm() {
  const { signUp, isLoaded } = useSignUp();
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  
  const firstNameInputRef = React.useRef<TextInput>(null);
  const lastNameInputRef = React.useRef<TextInput>(null);
  const emailInputRef = React.useRef<TextInput>(null);
  const passwordInputRef = React.useRef<TextInput>(null);
  
  const [error, setError] = React.useState<{ email?: string; password?: string; general?: string }>({});

  async function onSubmit() {
    if (!isLoaded) return;
    
    // Clear previous errors
    setError({});

    try {
      // Start sign-up process
      await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      });

      // Prepare email verification
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      // FIX: Navigation path should exclude the (auth) group
      // Using the object syntax for better type safety
      router.push({
        pathname: "/(auth)/verify-email",
        params: { email: email }
      });

    } catch (err: any) {
      console.error('Sign-up error:', err);
      
      // Clerk error handling
      if (err && err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
        const firstError = err.errors[0];
        const message = firstError.longMessage || firstError.message || 'An error occurred';
        
        if (message.toLowerCase().includes('email') || message.toLowerCase().includes('identifier')) {
          setError({ email: message });
        } else if (message.toLowerCase().includes('password')) {
          setError({ password: message });
        } else {
          setError({ general: message });
        }
      } else if (err?.message) {
        // Handle standard Error objects
        setError({ general: err.message });
      } else if (typeof err === 'string') {
        // Handle string errors
        setError({ general: err });
      } else {
        // Fallback for unknown error types
        setError({ general: 'Something went wrong. Please try again.' });
      }
    }
  }

  function onFirstNameSubmitEditing() {
    lastNameInputRef.current?.focus();
  }

  function onLastNameSubmitEditing() {
    emailInputRef.current?.focus();
  }

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus();
  }

  return (
    <View className="gap-6">
      <Card className="border-border/0 shadow-none sm:border-border sm:shadow-sm sm:shadow-black/5">
        <View className="items-center px-6 mb-2">
          <Image
            source={require('@/assets/images/favicon.png')}
            className="h-32 w-32 rounded"
          />
        </View>
        
        <CardHeader>
          <CardTitle className="text-center text-xl sm:text-left">Create FimPay account</CardTitle>
          <CardDescription className="text-center sm:text-left">
            Welcome! Please fill in the details to get started.
          </CardDescription>
        </CardHeader>

        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="flex-row gap-3">
              <View className="flex-1 gap-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  ref={firstNameInputRef}
                  id="firstName"
                  placeholder="John"
                  autoCapitalize="words"
                  value={firstName}
                  onChangeText={setFirstName}
                  onSubmitEditing={onFirstNameSubmitEditing}
                  returnKeyType="next"
                />
              </View>
              <View className="flex-1 gap-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  ref={lastNameInputRef}
                  id="lastName"
                  placeholder="Doe"
                  autoCapitalize="words"
                  value={lastName}
                  onChangeText={setLastName}
                  onSubmitEditing={onLastNameSubmitEditing}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View className="gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                ref={emailInputRef}
                id="email"
                placeholder="m@example.com"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={onEmailSubmitEditing}
                returnKeyType="next"
              />
              {error.email ? (
                <Text className="text-sm font-medium text-destructive">{error.email}</Text>
              ) : null}
            </View>

            <View className="gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                ref={passwordInputRef}
                id="password"
                secureTextEntry
                value={password}
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
            Already have an account?{' '}
            <Link 
              href="/(auth)/sign-in" 
              dismissTo 
              className="text-sm underline underline-offset-4"
            >
              Sign in
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