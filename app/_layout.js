import '../lib/theme-init';
import 'react-native-reanimated';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '../global.css';


import { useColorScheme } from 'nativewind';
import { View, ActivityIndicator, Platform, Text, TouchableOpacity, Animated } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Set up the notification handler immediately at the root level (outside component definition)
// to guarantee foreground alerts display perfectly on iOS/Android in Expo Go/Native Mobile!
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldMutateBadge: true,
    }),
  });
}

import { AuthProvider, useAuth } from '../context/AuthContext';
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
              <RootLayoutContent />
            </ReviewsProvider>
          </AuthProvider>
        </View>
      </View>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

function RootLayoutContent() {
  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'transparentModal', headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
        <Stack.Screen name="restaurant/[id]" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="privacy-policy" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="terms-of-service" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="qr-code" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="scan-qr" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="notifications" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
      <GlobalToast />
    </View>
  );
}

function GlobalToast() {
  const { toast, setToast } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const slideAnim = useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    if (toast && toast.visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 8
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 250,
        useNativeDriver: true
      }).start();
    }
  }, [toast?.visible]);

  if (!toast || !toast.visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20,
        left: 16,
        right: 16,
        transform: [{ translateY: slideAnim }],
        zIndex: 99999,
        elevation: 99,
      }}
    >
      <View
        style={{
          backgroundColor: isDark ? 'rgba(24, 24, 27, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: isDark ? '#27272A' : '#E5E7EB',
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 5,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            backgroundColor: toast.type === 'success' ? 'rgba(20, 184, 166, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12
          }}
        >
          <Ionicons
            name={toast.type === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
            size={22}
            color={toast.type === 'success' ? '#14B8A6' : '#EF4444'}
          />
        </View>

        <View style={{ flex: 1, marginRight: 8 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '900',
              color: isDark ? '#FFFFFF' : '#111827',
              marginBottom: 2
            }}
          >
            {toast.title}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: isDark ? '#D4D4D8' : '#4B5563',
              lineHeight: 16
            }}
          >
            {toast.message}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setToast(prev => ({ ...prev, visible: false }))}
          style={{ padding: 6, borderRadius: 12, backgroundColor: isDark ? '#27272A' : '#F3F4F6' }}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={16} color={isDark ? '#A1A1AA' : '#52525B'} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

