import { View, Text, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession(); // Handle redirect on web

export default function SignInScreen() {
    const [loading, setLoading] = useState(false);

    const handleOAuth = async (provider) => {
        setLoading(true);
        try {
            console.log(`Attempting to sign in with ${provider}...`);

            // 1. Create a redirect URL that points back to the app
            const redirectUrl = Linking.createURL('/auth/callback');
            console.log('Redirect URI:', redirectUrl);

            // 2. Start the OAuth flow with Supabase
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true, // We will handle opening the browser
                }
            });

            console.log("OAuth Result:", { data, error });

            if (error) throw error;
            if (!data?.url) throw new Error("No URL returned from Supabase OAuth.");

            // 3. Open the browser
            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
            console.log('WebBrowser result:', result);

            if (result.type === 'success' && result.url) {
                // 4. Parse the URL to get the session/tokens
                // Supabase usually puts the tokens in the hash fragment or query params
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: extractParam(result.url, 'access_token'),
                    refresh_token: extractParam(result.url, 'refresh_token'),
                });

                if (sessionError) throw sessionError;
                // Session is set, AuthContext should pick it up and redirect
            }

        } catch (error) {
            console.error("OAuth Exception:", error);
            Alert.alert('OAuth Error', error.message || "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    // Helper to extract params from URL hash or query
    const extractParam = (url, param) => {
        const regex = new RegExp(`[?&#]${param}=([^&#]*)`);
        const results = regex.exec(url);
        return results ? decodeURIComponent(results[1]) : null;
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white justify-center px-8"
        >
            <View className="items-center mb-16">
                <Ionicons name="fast-food" size={80} color="black" />
                <Text className="text-4xl font-bold mt-4 tracking-tighter">LamonGo</Text>
                <Text className="text-gray-500 mt-2 italic text-lg">Gotta eat 'em all</Text>
            </View>

            <View className="space-y-4">
                <TouchableOpacity
                    onPress={() => handleOAuth('google')}
                    className="flex-row items-center justify-center bg-white border border-gray-200 p-4 rounded-xl space-x-3 shadow-sm"
                >
                    <Ionicons name="logo-google" size={24} color="#DB4437" />
                    <Text className="font-semibold text-gray-700 text-lg">Continue with Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => handleOAuth('apple')}
                    className="flex-row items-center justify-center bg-black p-4 rounded-xl space-x-3 shadow-sm"
                >
                    <Ionicons name="logo-apple" size={24} color="white" />
                    <Text className="font-semibold text-white text-lg">Continue with Apple</Text>
                </TouchableOpacity>
            </View>

            <View className="mt-12 items-center">
                <Text className="text-xs text-center text-gray-400">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}
