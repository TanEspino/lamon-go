import 'react-native-reanimated';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '../global.css';

import { useColorScheme, View, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const unstable_settings = {
  anchor: '(tabs)',
};

import { AuthProvider } from '../context/AuthContext';
import { ReviewsProvider } from '../context/ReviewsContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const hasCompleted = await AsyncStorage.getItem('hasCompletedOnboarding');
        if (!hasCompleted && segments[0] !== 'onboarding') {
          router.replace('/onboarding');
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsReady(true);
      }
    };

    if (!isReady) {
      // Small timeout ensures router is ready
      setTimeout(() => {
        checkOnboarding();
      }, 100);
    }
  }, [isReady]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ 
          flex: 1, 
          width: '100%', 
          maxWidth: 600, 
          alignSelf: 'center', 
          backgroundColor: 'white',
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: '#E5E7EB' // Soft gray boundary
        }}>
          <AuthProvider>
            <ReviewsProvider>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="restaurant/[id]" options={{ presentation: 'card', headerShown: false }} />
              </Stack>
            </ReviewsProvider>
          </AuthProvider>
        </View>
      </View>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
