import 'react-native-reanimated';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '../global.css';

import { useColorScheme, View, ActivityIndicator } from 'react-native';

export const unstable_settings = {
  anchor: '(tabs)',
};

import { AuthProvider } from '../context/AuthContext';
import { ReviewsProvider } from '../context/ReviewsContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

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
                <Stack.Screen name="modal" options={{ presentation: 'transparentModal', headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
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
