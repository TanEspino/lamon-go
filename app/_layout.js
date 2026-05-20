import '../lib/theme-init';
import 'react-native-reanimated';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '../global.css';


import { useColorScheme } from 'nativewind';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const unstable_settings = {
  anchor: '(tabs)',
};

import { AuthProvider } from '../context/AuthContext';
import { ReviewsProvider } from '../context/ReviewsContext';

export default function RootLayout() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        let savedTheme;
        if (Platform.OS === 'web') {
          savedTheme = typeof window !== 'undefined' && window.localStorage 
            ? window.localStorage.getItem('theme-preference')
            : null;
        } else {
          savedTheme = await AsyncStorage.getItem('theme-preference');
        }
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setColorScheme(savedTheme);
        }
      } catch (e) {
        console.log('Error loading theme preference:', e);
      } finally {
        setThemeLoaded(true);
      }
    };
    loadTheme();
  }, []);

  if (!themeLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? '#09090b' : '#f9fafb' }}>
        <ActivityIndicator size="large" color="#E11D48" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View className="flex-1 bg-gray-50 dark:bg-zinc-950">
        <View className="flex-1 w-full max-w-[600px] self-center bg-white dark:bg-zinc-900 border-l border-r border-gray-200 dark:border-zinc-800">
          <AuthProvider>
            <ReviewsProvider>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'transparentModal', headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
                <Stack.Screen name="restaurant/[id]" options={{ presentation: 'card', headerShown: false }} />
              </Stack>
            </ReviewsProvider>
          </AuthProvider>
        </View>
      </View>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

