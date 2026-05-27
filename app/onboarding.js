import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View, Switch } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import { useColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { prepareUploadPayload } from '../utils/uploadHelper';
import { useAlert } from '../context/AlertContext';

export default function OnboardingScreen() {
    const { updateProfileLocal, profile, user, fetchProfile } = useAuth();
    const router = useRouter();
    const { showAlert } = useAlert();
    const [username, setUsername] = useState(profile?.username || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
    const [isSaving, setIsSaving] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    const { colorScheme, setColorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const toggleTheme = async () => {
        const nextScheme = isDark ? 'light' : 'dark';
        setColorScheme(nextScheme);
        try {
            if (Platform.OS === 'web') {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem('theme-preference', nextScheme);
                }
            } else {
                await AsyncStorage.setItem('theme-preference', nextScheme);
            }
        } catch (e) {
            console.log('Error saving theme preference:', e);
        }
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setAvatarUrl(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!username.trim()) {
            showAlert("Required", "Please provide a username.");
            return;
        }

        const usernameRegex = /^[a-zA-Z0-9._]+$/;
        if (!usernameRegex.test(username)) {
            showAlert("Invalid Username", "Username can only contain letters, numbers, periods, and underscores. No spaces allowed.");
            return;
        }

        if (!user) {
            showAlert("Error", "You must be logged in to save a profile.");
            return;
        }

        setIsSaving(true);

        try {
            let finalAvatarUrl = avatarUrl;

            // 1. If the user selected a new local image, compress and upload it!
            if (avatarUrl && !avatarUrl.startsWith('http')) {
                // FORCE COMPRESSION
                const manipulatedImage = await ImageManipulator.manipulateAsync(
                    avatarUrl,
                    [{ resize: { width: 500 } }], // Shrink to 500px for avatars
                    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                );

                const uploadPayload = await prepareUploadPayload(manipulatedImage.uri);
                const fileExt = 'jpg';
                const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
                
                // Upload to Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('review-images')
                    .upload(fileName, uploadPayload, { contentType: `image/${fileExt}` });
                    
                if (uploadError) throw uploadError;
                
                // Get Public URL
                const { data: publicData } = supabase.storage
                    .from('review-images')
                    .getPublicUrl(uploadData.path);
                    
                finalAvatarUrl = publicData.publicUrl;

                // 2. GARBAGE COLLECTION: Delete the old custom avatar if it existed in our bucket!
                if (profile?.avatar_url && profile.avatar_url.includes('review-images')) {
                    const oldFileName = profile.avatar_url.split('/').pop();
                    if (oldFileName) {
                        // Fire and forget, don't crash if it fails
                        supabase.storage.from('review-images').remove([oldFileName]).catch(e => console.log(e));
                    }
                }
            }

            // 3. Update Database `profiles` table
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    username,
                    bio,
                    avatar_url: finalAvatarUrl || 'https://placehold.co/150x150/png?text=User'
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 4. Force Global Context Sync
            await fetchProfile(user.id);

            // Mark onboarding as completed in local storage
            if (Platform.OS === 'web') {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem('hasCompletedOnboarding', 'true');
                }
            } else {
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
            }
            
            // Redirect properly based on context
            if (router.canGoBack()) {
                router.back(); // Go back to profile if editing
            } else {
                router.replace('/(tabs)'); // Go to home if initial onboarding
            }
        } catch (error) {
            console.error("Onboarding Error:", error);
            showAlert('Error', error.message || "Failed to save profile.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900">
            {/* Header */}
            <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
                {router.canGoBack() ? (
                    <Pressable onPress={() => router.back()} className="w-10">
                        <Ionicons name="close-outline" size={28} color={isDark ? "#F3F4F6" : "#262626"} />
                    </Pressable>
                ) : (
                    <View className="w-10" />
                )}
                <Text className="text-base font-bold text-black dark:text-white">{router.canGoBack() ? 'Edit Profile' : 'Profile Setup'}</Text>
                <Pressable onPress={handleSave} disabled={isSaving}>
                    <Text className={`font-bold text-base ${isSaving ? 'text-gray-400 dark:text-zinc-500' : 'text-primary'}`}>
                        {isSaving ? 'Saving...' : 'Complete'}
                    </Text>
                </Pressable>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
                className="flex-1"
            >
                <ScrollView className="flex-1 bg-white dark:bg-zinc-900" contentContainerStyle={{ paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
                    {/* Key Visual / Photo Area */}
                    <View className="w-full bg-gray-50 dark:bg-zinc-950 py-10 items-center justify-center border-b border-gray-100 dark:border-zinc-800 relative">
                        <Pressable onPress={pickImage} className="relative">
                            <Image
                                source={{ uri: avatarUrl || 'https://placehold.co/150x150/png?text=Add+Photo' }}
                                className="w-32 h-32 rounded-full bg-gray-200 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 shadow-sm"
                                resizeMode="cover"
                            />
                            <View className="absolute bottom-0 right-0 bg-primary p-2 rounded-full border-2 border-white dark:border-zinc-900">
                                <Ionicons name="camera" size={20} color="white" />
                            </View>
                        </Pressable>
                        <Text className="text-gray-400 dark:text-zinc-400 font-medium mt-4">Set Profile Picture</Text>
                    </View>

                    {/* Form Fields - Instagram Style List */}
                    <View className="px-4 py-2">
                        {/* Username */}
                        <View className={`py-2 border-b ${focusedField === 'username' ? 'border-blue-500' : 'border-gray-100 dark:border-zinc-800'}`}>
                            <View className="flex-row items-center">
                                <View className="w-8 items-center mr-3">
                                    <Ionicons 
                                        name="person-outline" 
                                        size={24} 
                                        color={focusedField === 'username' ? '#3B82F6' : (isDark ? '#A3A3A3' : '#262626')} 
                                    />
                                </View>
                                <TextInput
                                    value={username}
                                    onChangeText={(text) => setUsername(text.replace(/[^a-zA-Z0-9._]/g, ''))}
                                    placeholder="Username..."
                                    placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                                    autoCapitalize="none"
                                    maxLength={20}
                                    className="flex-1 text-base text-black dark:text-white py-2"
                                    onFocus={() => setFocusedField('username')}
                                    onBlur={() => setFocusedField(null)}
                                    style={{ outlineStyle: 'none' }}
                                />
                            </View>
                            <Text className="text-right text-[10px] text-gray-400 dark:text-zinc-500 mt-1">{username.length}/20</Text>
                        </View>

                        {/* Bio */}
                        <View className={`py-2 border-b ${focusedField === 'bio' ? 'border-blue-500' : 'border-gray-100 dark:border-zinc-800'}`}>
                            <View className="flex-row items-center">
                                <View className="w-8 items-center mr-3">
                                    <Ionicons 
                                        name="document-text-outline" 
                                        size={24} 
                                        color={focusedField === 'bio' ? '#3B82F6' : (isDark ? '#A3A3A3' : '#262626')} 
                                    />
                                </View>
                                <TextInput
                                    value={bio}
                                    onChangeText={setBio}
                                    placeholder="Write a short bio..."
                                    placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                                    multiline
                                    maxLength={80}
                                    className="flex-1 text-base text-black dark:text-white py-2"
                                    onFocus={() => setFocusedField('bio')}
                                    onBlur={() => setFocusedField(null)}
                                    style={{ outlineStyle: 'none' }}
                                />
                            </View>
                            <Text className="text-right text-[10px] text-gray-400 dark:text-zinc-500 mt-1">{bio.length}/80</Text>
                        </View>

                        {/* Night Mode Toggle Switch */}
                        <View className="py-4 border-b border-gray-100 dark:border-zinc-800 flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <View className="w-8 items-center mr-3">
                                    <Ionicons 
                                        name={isDark ? "moon" : "moon-outline"} 
                                        size={24} 
                                        color={isDark ? "#FBBF24" : "#262626"} 
                                    />
                                </View>
                                <View>
                                    <Text className="text-base font-semibold text-black dark:text-white">Night Mode</Text>
                                    <Text className="text-xs text-gray-400 dark:text-zinc-400">Embrace the dark side</Text>
                                </View>
                            </View>
                            <Switch
                                value={isDark}
                                onValueChange={toggleTheme}
                                trackColor={{ false: '#D1D5DB', true: '#E11D48' }}
                                thumbColor={isDark ? '#FFFFFF' : '#F3F4F6'}
                            />
                        </View>

                        {/* Legal Links Section */}
                        <View className="mt-8 border-t border-gray-100 dark:border-zinc-800 pt-5">
                            <Text className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2 px-1">
                                Legal & Documents
                            </Text>
                            
                            {/* Terms of Service Link */}
                            <Pressable 
                                onPress={() => router.push('/terms-of-service')}
                                className="py-3.5 border-b border-gray-100 dark:border-zinc-800 flex-row items-center justify-between px-1"
                            >
                                <View className="flex-row items-center">
                                    <Ionicons name="document-text-outline" size={20} color={isDark ? "#A3A3A3" : "#262626"} style={{ marginRight: 12 }} />
                                    <Text className="text-base font-semibold text-black dark:text-white">Terms of Service</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={isDark ? "#71717A" : "#9CA3AF"} />
                            </Pressable>

                            {/* Privacy Policy Link */}
                            <Pressable 
                                onPress={() => router.push('/privacy-policy')}
                                className="py-3.5 border-b border-gray-100 dark:border-zinc-800 flex-row items-center justify-between px-1"
                            >
                                <View className="flex-row items-center">
                                    <Ionicons name="shield-checkmark-outline" size={20} color={isDark ? "#A3A3A3" : "#262626"} style={{ marginRight: 12 }} />
                                    <Text className="text-base font-semibold text-black dark:text-white">Privacy Policy</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={isDark ? "#71717A" : "#9CA3AF"} />
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
