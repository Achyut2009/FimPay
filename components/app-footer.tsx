import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { HomeIcon, ScanLine, Bot, User } from 'lucide-react-native';
import { Link, usePathname } from 'expo-router';
import * as React from 'react';
import { View, Pressable } from 'react-native';

export function AppFooter() {
  const pathname = usePathname();

  // Define Maroon color for Tailwind (or use hex directly in classes)
  const maroonHex = '#800000';

  // active tab state keeps the tab highlighted on press; syncs with pathname
  const [active, setActive] = React.useState<'home' | 'ai' | 'profile' | 'scanner' | null>(() => {
    if (pathname === '/' || pathname === '/index') return 'home';
    if (pathname === '/profile') return 'profile';
    if (pathname === '/ai') return 'ai';
    if (pathname === '/scanner') return 'scanner';
    return null;
  });

  React.useEffect(() => {
    // keep active in sync when route changes externally
    if (pathname === '/' || pathname === '/index') setActive('home');
    else if (pathname === '/profile') setActive('profile');
    else if (pathname === '/ai') setActive('ai');
    else if (pathname === '/scanner') setActive('scanner');
  }, [pathname]);

  const isHome = active === 'home';
  const isProfile = active === 'profile';
  const isAi = active === 'ai';
  const isScanner = active === 'scanner';


  return (
    <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background pb-safe">
    <View className="mx-auto flex w-full max-w-md flex-row items-center justify-around px-2">
        
        {/* Home Navigation */}
        <Link href="/" asChild>
          <Pressable 
            // android_ripple null removes the gray circle on Android
            android_ripple={{ color: 'transparent' }}
            className="relative flex-1 items-center justify-center py-4"
            onPress={() => setActive('home')}
          >
            <Icon 
              as={HomeIcon} 
              size={24}
              // pass color as a prop (not inside style)
              color={isHome ? maroonHex : '#71717a'}
            />
            
            {/* Underline - Only visible when isHome is true */}
            {isHome && (
              <View 
                className="absolute bottom-0 h-[3px] w-3/5 rounded-t-full"
                style={{ backgroundColor: maroonHex }}
              />
            )}
          </Pressable>
        </Link>

        {/* AI Navigation */}
        <Link href="/ai" asChild>
          <Pressable
            android_ripple={{ color: 'transparent' }}
            className="relative flex-1 items-center justify-center py-4"
            onPress={() => setActive('ai')}
          >
            <Icon
              as={Bot}
              size={24}
              color={isAi ? maroonHex : '#71717a'}
            />

            {isAi && (
              <View
                className="absolute bottom-0 h-[3px] w-3/5 rounded-t-full"
                style={{ backgroundColor: maroonHex }}
              />
            )}
          </Pressable>
        </Link>

        {/* Scanner Navigation */}
        <Link href="/scanner" asChild>
          <Pressable
            android_ripple={{ color: 'transparent' }}
            className="relative flex-1 items-center justify-center py-4"
            onPress={() => setActive('scanner')}
          >
            <Icon
              as={ScanLine}
              size={24}
              color={isScanner ? maroonHex : '#71717a'}
            />

            {isScanner && (
              <View
                className="absolute bottom-0 h-[3px] w-3/5 rounded-t-full"
                style={{ backgroundColor: maroonHex }}
              />
            )}
          </Pressable>
        </Link>

        {/* Profile Navigation */}
        <Link href="/profile" asChild>
          <Pressable
            android_ripple={{ color: 'transparent' }}
            className="relative flex-1 items-center justify-center py-4"
            onPress={() => setActive('profile')}
          >
            <Icon
              as={User}
              size={24}
              color={isProfile ? maroonHex : '#71717a'}
            />

            {isProfile && (
              <View
                className="absolute bottom-0 h-[3px] w-3/5 rounded-t-full"
                style={{ backgroundColor: maroonHex }}
              />
            )}
          </Pressable>
        </Link>
        
      </View>
    </View>
  );
}