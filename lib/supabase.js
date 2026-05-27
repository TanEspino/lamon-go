import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// Custom storage wrapper to avoid top-level AsyncStorage import crashing server compilation / SSR on web
const customStorage = {
    getItem: async (key) => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined' && window.localStorage) {
                return window.localStorage.getItem(key);
            }
            return null;
        }
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        return AsyncStorage.getItem(key);
    },
    setItem: async (key, value) => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(key, value);
            }
            return;
        }
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem(key, value);
    },
    removeItem: async (key) => {
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(key);
            }
            return;
        }
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.removeItem(key);
    },
};

// TODO: Replace with your actual Supabase keys
const supabaseUrl = 'https://eywcrltvlwvzwlyzdzty.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5d2NybHR2bHd2endseXpkenR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNTI1ODIsImV4cCI6MjA5NDYyODU4Mn0.J--gAEu4fK4l9pueRJFEhRPKW8jHSoHA5Lxqu-23Big';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: customStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // Only override the lock manager on Web to bypass navigator.locks timer crashes on Expo Web hot reloading.
        // On native mobile (iOS/Android), navigator.locks doesn't exist, so let it use standard built-in locks.
        ...(Platform.OS === 'web' ? {
            lock: async (...args) => {
                const callback = args.find(arg => typeof arg === 'function');
                if (callback) return callback();
                return Promise.resolve();
            }
        } : {})
    },
});


// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
AppState.addEventListener('change', (state) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh();
    } else {
        supabase.auth.stopAutoRefresh();
    }
});
