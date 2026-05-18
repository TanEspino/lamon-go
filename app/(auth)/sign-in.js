import { View, Text, TouchableOpacity, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession(); // Handle redirect on web

export default function SignInScreen() {
    const [loading, setLoading] = useState(false);

    // Listen for the deep link return from native Safari
    useEffect(() => {
        const handleDeepLink = async (event) => {
            const url = event.url;
            console.log("🔗 DEEP LINK RECEIVED:", url);
            if (url && url.includes('access_token=')) {
                console.log("✅ Token found in URL! Attempting to set Supabase session...");
                const { error: sessionError, data } = await supabase.auth.setSession({
                    access_token: extractParam(url, 'access_token'),
                    refresh_token: extractParam(url, 'refresh_token'),
                });
                
                if (sessionError) {
                    console.error("❌ Session Error:", sessionError);
                    Alert.alert('Session Error', sessionError.message);
                } else {
                    console.log("🎉 Session successfully established!");
                }
            } else {
                console.log("⚠️ URL received, but no access_token found.");
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);
        
        // Check if the app was opened via a deep link while cold
        Linking.getInitialURL().then((url) => {
            console.log("📱 Initial URL on Mount:", url);
            if (url) handleDeepLink({ url });
        });

        return () => subscription.remove();
    }, []);

    const handleOAuth = async (provider) => {
        setLoading(true);
        try {
            console.log(`Attempting to sign in with ${provider} on ${Platform.OS}...`);

            if (Platform.OS === 'web') {
                // WEB FLOW: Standard page redirect
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: provider,
                    options: {
                        redirectTo: window.location.origin
                    }
                });
                if (error) throw error;
                return; // The browser will physically navigate away to Google
            }

            // NATIVE FLOW (iOS/Android)
            // 1. Create a redirect URL that points back to the app
            const redirectUrl = Linking.createURL('');
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

            // 3. Open native Safari instead of in-app WebBrowser to bypass the iOS interception bug
            console.log('Opening native Safari:', data.url);
            await Linking.openURL(data.url);
            
            // The session will be handled by the useEffect event listener when Safari redirects back!

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
            className="flex-1 bg-gray-100 justify-center px-8"
        >
            <View className="items-center mb-16">
                <Image 
                    source={require('../../assets/logo_profile.png')} 
                    style={{ width: 280, height: 80 }} 
                    resizeMode="contain" 
                />
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


            </View>

            <View className="mt-12 items-center">
                <Text className="text-xs text-center text-gray-400">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}
