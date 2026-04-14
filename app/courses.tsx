import { Stack } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

export default function CoursesScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Courses' }} />
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-lg">Courses Screen</Text>
        <Text className="text-muted-foreground mt-2">Coming soon...</Text>
      </View>
    </>
  );
}