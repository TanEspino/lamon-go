import { View, Text, TouchableOpacity, Image, KeyboardAvoidingView, Platform, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useColorScheme } from 'nativewind';
import { useRouter, Link } from 'expo-router';
import Constants from 'expo-constants';
import { useAlert } from '../../context/AlertContext';

WebBrowser.maybeCompleteAuthSession(); // Handle redirect on web

const isDevEnvironment = () => {
    // 1. Is it a local dev build?
    if (__DEV__) return true;
    
    // 2. Is it executing inside the Expo Go developer client?
    if (Constants.appOwnership === 'expo') return true;
    
    // 3. Is the bundle served from a local developer machine IP?
    const manifest = Constants.expoConfig || {};
    const hostUri = manifest.hostUri || '';
    if (hostUri.includes('localhost') || hostUri.includes('127.0.0.1') || hostUri.includes('192.168.')) {
        return true;
    }
    
    return false;
};

export default function SignInScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { showAlert } = useAlert();

    // Custom Email Auth Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

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
                    showAlert('Session Error', sessionError.message);
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
            showAlert('OAuth Error', error.message || "An unknown error occurred");
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

    const handleDemoLogin = async () => {
        setLoading(true);
        try {
            console.log("Attempting Anonymous Developer Sign-In...");
            // 1. Try to sign in anonymously (bypasses all email rate limits, TLD rules, and confirmations)
            const { data, error } = await supabase.auth.signInAnonymously({
                options: {
                    data: {
                        full_name: 'Lamon Go Guest',
                        avatar_url: 'https://placehold.co/100x100/png?text=Guest'
                    }
                }
            });

            // 2. If anonymous login is disabled in Supabase, fall back to the test email/password
            if (error) {
                console.warn("Anonymous Sign-In disabled or failed. Falling back to email/password...", error.message);
                
                const demoEmail = 'tester@example.com';
                const demoPassword = 'Password123!';
                
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email: demoEmail,
                    password: demoPassword,
                });
                
                if (signInError) throw signInError;
            }

            console.log("Demo Login Successful!");
        } catch (error) {
            console.error("Demo Login Error:", error);
            const isRateOrConfirmError = error.message?.toLowerCase().includes('rate') || 
                                         error.message?.toLowerCase().includes('exceeded') ||
                                         error.message?.toLowerCase().includes('confirm') ||
                                         error.message?.toLowerCase().includes('verified');

            showAlert(
                "Demo Sign-In Failed",
                `${error.message || "Failed to establish a developer session."}${isRateOrConfirmError ? '\n\n💡 Supabase Developer Workarounds:\n\n1. ENABLE ANONYMOUS AUTH (Recommended):\nIn your Supabase Dashboard, go to Auth -> Providers -> Anonymous and turn it ON. This enables zero-configuration instant sign-in.\n\n2. DISABLE EMAIL CONFIRMATION:\nIn your Supabase Dashboard, go to Auth -> Providers -> Email and turn "Confirm email" OFF to instantly register and sign in test accounts.' : ''}`,
                [{ text: "OK" }]
            );
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async () => {
        if (!email.trim() || !password.trim()) {
            showAlert("Required Fields", "Please enter both email and password.");
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                console.log("Attempting Custom Email Sign-Up...");
                const { data, error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password: password,
                    options: {
                        data: {
                            full_name: email.trim().split('@')[0],
                            avatar_url: `https://placehold.co/100x100/png?text=${encodeURIComponent(email.trim()[0].toUpperCase())}`
                        }
                    }
                });
                
                if (error) throw error;
                
                // If email confirmation is enabled, session might be null
                if (data && !data.session) {
                    showAlert(
                        "Account Created",
                        "Your account has been created!\n\n📧 A confirmation link has been sent to your email. Please verify it to log in, OR you can disable \"Confirm email\" in your Supabase Auth -> Providers -> Email settings to bypass email verification during development.",
                        [{ text: "OK" }]
                    );
                } else {
                    showAlert("Success", "Account created and logged in!");
                }
            } else {
                console.log("Attempting Custom Email Sign-In...");
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password: password,
                });
                
                if (error) throw error;
                console.log("Custom Email Sign-In Successful!");
            }
        } catch (error) {
            console.error("Email Auth Error:", error);
            const isRateLimit = error.message?.toLowerCase().includes('rate') || error.message?.toLowerCase().includes('exceeded');
            
            showAlert(
                isSignUp ? "Sign-Up Failed" : "Sign-In Failed",
                `${error.message || "An authentication error occurred."}${isRateLimit ? '\n\n💡 Tip: To bypass email rate limits, go to your Supabase Dashboard -> Auth -> Providers -> Email, and toggle "Confirm email" to OFF.' : ''}`,
                [{ text: "OK" }]
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: isDark ? '#0B1326' : '#F3F4F6' }}
            className="px-6"
        >
            <ScrollView 
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: 40, paddingBottom: 90 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View className="items-center mb-10 mt-4">
                    <Image 
                        source={isDark ? require('../../assets/logo_profile_dark.png') : require('../../assets/logo_profile.png')} 
                        style={[
                            { width: 280, height: 80 },
                            isDark && Platform.OS === 'web' && { 
                                filter: 'invert(1) hue-rotate(180deg) brightness(1.2)' 
                            }
                        ]} 
                        resizeMode="contain" 
                    />
                    <Text className="text-gray-500 dark:text-zinc-400 mt-2 italic text-lg">Gotta eat 'em all</Text>
                </View>

                <View className="space-y-4">
                    {/* Google OAuth */}
                    <TouchableOpacity
                        onPress={() => handleOAuth('google')}
                        disabled={loading}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isDark ? '#151C2E' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
                            borderRadius: 12,
                            padding: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: isDark ? 0 : 0.05,
                            shadowRadius: 2,
                            elevation: 2,
                            marginBottom: 12,
                        }}
                    >
                        <Ionicons name="logo-google" size={24} color="#DB4437" style={{ marginRight: 8 }} />
                        <Text className="font-semibold text-gray-700 dark:text-zinc-100 text-lg">Continue with Google</Text>
                    </TouchableOpacity>

                    {/* Developer Demo & Custom Email Sign-In (Automatically detected local/development sandbox) */}
                    {isDevEnvironment() && (
                        <>
                            {/* Developer Demo Auth */}
                            <TouchableOpacity
                                onPress={handleDemoLogin}
                                disabled={loading}
                                className="flex-row items-center justify-center bg-primary p-4 rounded-xl space-x-3 shadow-md mb-6"
                            >
                                {loading && !showEmailForm ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Ionicons name="flask" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
                                        <Text className="font-bold text-white text-lg">Developer Demo Sign-In</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* Divider */}
                            <View className="flex-row items-center my-4">
                                <View style={{ flex: 1, height: 1, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB' }} />
                                <Text className="mx-4 text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Or Use Email</Text>
                                <View style={{ flex: 1, height: 1, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB' }} />
                            </View>

                            {/* Custom Email Form Toggle */}
                            {!showEmailForm ? (
                                <TouchableOpacity
                                    onPress={() => setShowEmailForm(true)}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderWidth: 1,
                                        borderStyle: 'dashed',
                                        borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#D1D5DB',
                                        borderRadius: 12,
                                        padding: 16,
                                    }}
                                >
                                    <Ionicons name="mail-outline" size={20} color={isDark ? '#A1A1AA' : '#71717A'} style={{ marginRight: 8 }} />
                                    <Text className="font-medium text-gray-500 dark:text-zinc-400 text-base">Sign In or Create Account with Email</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={{
                                    backgroundColor: isDark ? '#151C2E' : '#FFFFFF',
                                    borderWidth: 1,
                                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
                                    padding: 20,
                                    borderRadius: 16,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: isDark ? 0 : 0.05,
                                    shadowRadius: 4,
                                    elevation: 3,
                                    gap: 16,
                                }}>
                                    <View className="flex-row justify-between items-center mb-2">
                                        <Text className="text-lg font-bold text-gray-800 dark:text-zinc-150">
                                            {isSignUp ? "Create a New Account" : "Sign In with Email"}
                                        </Text>
                                        <TouchableOpacity 
                                            onPress={() => {
                                                setShowEmailForm(false);
                                                setEmail('');
                                                setPassword('');
                                            }}
                                            className="p-1"
                                        >
                                            <Ionicons name="close" size={20} color={isDark ? '#A1A1AA' : '#71717A'} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Email Input */}
                                    <View className="space-y-1">
                                        <Text className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Email Address</Text>
                                        <TextInput
                                            style={{
                                                backgroundColor: isDark ? '#09111E' : '#F9FAFB',
                                                color: isDark ? '#FFFFFF' : '#0B1326',
                                                padding: 12,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#D1D5DB',
                                                fontSize: 16,
                                                fontWeight: '500',
                                                outlineStyle: 'none',
                                            }}
                                            placeholder="your-email@example.com"
                                            placeholderTextColor={isDark ? '#52525B' : '#A1A1AA'}
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            textContentType="emailAddress"
                                            editable={!loading}
                                        />
                                    </View>

                                    {/* Password Input */}
                                    <View className="space-y-1">
                                        <Text className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Password</Text>
                                        <TextInput
                                            style={{
                                                backgroundColor: isDark ? '#09111E' : '#F9FAFB',
                                                color: isDark ? '#FFFFFF' : '#0B1326',
                                                padding: 12,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#D1D5DB',
                                                fontSize: 16,
                                                fontWeight: '500',
                                                outlineStyle: 'none',
                                            }}
                                            placeholder="••••••••"
                                            placeholderTextColor={isDark ? '#52525B' : '#A1A1AA'}
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry
                                            autoCapitalize="none"
                                            textContentType="password"
                                            editable={!loading}
                                        />
                                    </View>

                                    {/* Submit Button */}
                                    <TouchableOpacity
                                        onPress={handleEmailAuth}
                                        disabled={loading}
                                        className="bg-primary p-4 rounded-xl items-center justify-center mt-2 shadow-sm"
                                    >
                                        {loading && showEmailForm ? (
                                            <ActivityIndicator color="#FFFFFF" />
                                        ) : (
                                            <Text className="font-bold text-white text-lg">
                                                {isSignUp ? "Register Account" : "Sign In"}
                                            </Text>
                                        )}
                                    </TouchableOpacity>

                                    {/* Mode Toggle Button */}
                                    <TouchableOpacity
                                        onPress={() => setIsSignUp(!isSignUp)}
                                        disabled={loading}
                                        className="align-center py-2"
                                    >
                                        <Text className="text-sm font-semibold text-primary text-center">
                                            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    )}
                </View>

                {/* Footer terms */}
                <View className="mt-12 flex-row flex-wrap justify-center items-center px-4 mb-4">
                    <Text className="text-xs text-gray-400 dark:text-zinc-500 leading-5">
                        By continuing, you agree to our{' '}
                    </Text>
                    <Link href="/terms-of-service">
                        <Text className="text-xs font-bold text-primary underline leading-5">
                            Terms of Service
                        </Text>
                    </Link>
                    <Text className="text-xs text-gray-400 dark:text-zinc-500 leading-5">
                        {' '}and{' '}
                    </Text>
                    <Link href="/privacy-policy">
                        <Text className="text-xs font-bold text-primary underline leading-5">
                            Privacy Policy
                        </Text>
                    </Link>
                    <Text className="text-xs text-gray-400 dark:text-zinc-500 leading-5">
                        .
                    </Text>
                </View>

            </ScrollView>

            {/* Elegant Company Branding absolutely positioned at the very bottom center */}
            <View 
                style={{ 
                    position: 'absolute', 
                    bottom: Platform.OS === 'web' ? 24 : 32, 
                    left: 0, 
                    right: 0, 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    zIndex: 20
                }}
            >
                <Image 
                    source={require('../../assets/images/tomokan-logo.png')} 
                    style={{ width: 24, height: 24, marginRight: 8 }} 
                    resizeMode="contain" 
                />
                <Text className="text-sm font-black text-gray-500 dark:text-zinc-400 uppercase tracking-widest" style={{ letterSpacing: 2 }}>
                    Tomokan Labs
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}
