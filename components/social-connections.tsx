import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSSO, type StartSSOFlowParams } from '@clerk/clerk-expo';
import * as AuthSession from 'expo-auth-session';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Image, Platform, View, Text, type ImageSourcePropType } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

type SocialConnectionStrategy = Extract<
  StartSSOFlowParams['strategy'],
  'oauth_google' | 'oauth_facebook'
>;

const SOCIAL_CONNECTION_STRATEGIES: {
  type: SocialConnectionStrategy;
  source: ImageSourcePropType;
  useTint?: boolean;
  name: string;
}[] = [
  {
    type: 'oauth_google',
    source: { uri: 'https://img.clerk.com/static/google.png?width=160' },
    useTint: false,
    name: 'Google',
  },
  {
    type: 'oauth_facebook',
    source: { uri: 'https://img.clerk.com/static/facebook.png?width=160' },
    useTint: false,
    name: 'Facebook',
  },
];

export function SocialConnections() {
  useWarmUpBrowser();
  const { colorScheme } = useColorScheme();
  const { startSSOFlow } = useSSO();

  function onSocialLoginPress(strategy: SocialConnectionStrategy) {
    return async () => {
      try {
        // Start the authentication process by calling `startSSOFlow()`
        const { createdSessionId, setActive, signIn } = await startSSOFlow({
          strategy,
          // For web, defaults to current path
          // For native, you must pass a scheme, like AuthSession.makeRedirectUri({ scheme, path })
          // For more info, see https://docs.expo.dev/versions/latest/sdk/auth-session/#authsessionmakeredirecturioptions
          redirectUrl: AuthSession.makeRedirectUri(),
        });

        // If sign in was successful, set the active session
        if (createdSessionId && setActive) {
          setActive({ session: createdSessionId });
          return;
        }

        // TODO: Handle other statuses
        // If there is no `createdSessionId`,
        // there are missing requirements, such as MFA
        // Use the `signIn` or `signUp` returned from `startSSOFlow`
        // to handle next steps
      } catch (err) {
        // See https://go.clerk.com/mRUDrIe for more info on error handling
        console.error(JSON.stringify(err, null, 2));
      }
    };
  }

  return (
    <View className="gap-2 sm:flex-row sm:gap-3">
        {SOCIAL_CONNECTION_STRATEGIES.map(
          (conn: { type: SocialConnectionStrategy; source: ImageSourcePropType; useTint?: boolean; name: string }) => {
            return (
              <Button
                key={conn.type}
                variant="outline"
                size="sm"
                className="sm:flex-1 flex-row gap-3.5 justify-center"
                onPress={onSocialLoginPress(conn.type)}>
                <Image
                  className={cn('size-4', conn.useTint && Platform.select({ web: 'dark:invert' }))}
                  tintColor={Platform.select({
                    native: conn.useTint ? (colorScheme === 'dark' ? 'white' : 'black') : undefined,
                  })}
                  source={conn.source}
                />
                <Text className={cn('text-sm', colorScheme === 'dark' ? 'text-white' : 'text-muted-foreground')}>Continue with {conn.name}</Text>
              </Button>
            );
          },
        )}
    </View>
  );
}

const useWarmUpBrowser = Platform.select({
  web: () => {},
  default: () => {
    React.useEffect(() => {
      // Preloads the browser for Android devices to reduce authentication load time
      // See: https://docs.expo.dev/guides/authentication/#improving-user-experience
      void WebBrowser.warmUpAsync();
      return () => {
        // Cleanup: closes browser when component unmounts
        void WebBrowser.coolDownAsync();
      };
    }, []);
  },
});