import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, Switch, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import * as ImageManipulator from 'expo-image-manipulator';
import { useColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { prepareUploadPayload } from '../utils/uploadHelper';
import { useAlert } from '../context/AlertContext';
import { validateUsernameFormat, checkUsernameExists, updateUsername } from '../utils/usernameHelper';

export default function OnboardingScreen() {
    const { updateProfileLocal, profile, user, fetchProfile } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();
    const [username, setUsername] = useState(profile?.username || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
    const [isSaving, setIsSaving] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [usernameError, setUsernameError] = useState('');
    const [usernameChecking, setUsernameChecking] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState(false);

    const { colorScheme, setColorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Calculate username change cooldown limit (30 days) on mount / render
    const getCooldownDaysLeft = () => {
        if (!profile?.last_username_change) return 0;
        const lastChange = new Date(profile.last_username_change);
        const now = new Date();
        const diffMs = now - lastChange;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const cooldownDays = 30;
        
        if (diffDays < cooldownDays) {
            return cooldownDays - diffDays;
        }
        return 0;
    };

    const daysLeft = getCooldownDaysLeft();
    const isCooldownActive = daysLeft > 0;

    // Debounced real-time username validation and database availability check
    useEffect(() => {
        if (isCooldownActive) {
            setUsernameError('');
            setUsernameAvailable(false);
            setUsernameChecking(false);
            return;
        }

        if (!username || !username.trim()) {
            setUsernameError('');
            setUsernameAvailable(false);
            setUsernameChecking(false);
            return;
        }

        const formatted = username.trim().toLowerCase();

        // If it is the user's current username, it is available by default
        if (formatted === profile?.username) {
            setUsernameError('');
            setUsernameAvailable(true);
            setUsernameChecking(false);
            return;
        }

        // 1. Instant client-side format validation
        const formatErr = validateUsernameFormat(formatted);
        if (formatErr) {
            setUsernameError(formatErr);
            setUsernameAvailable(false);
            setUsernameChecking(false);
            return;
        }

        // Format is valid, reset errors and set loading state for database check
        setUsernameError('');
        setUsernameChecking(true);

        const debounceTimer = setTimeout(async () => {
            try {
                const exists = await checkUsernameExists(formatted);
                if (exists) {
                    setUsernameError('Username is already taken 😔');
                    setUsernameAvailable(false);
                } else {
                    setUsernameError('');
                    setUsernameAvailable(true);
                }
            } catch (err) {
                console.error("Error during debounced availability check:", err);
            } finally {
                setUsernameChecking(false);
            }
        }, 800);

        return () => clearTimeout(debounceTimer);
    }, [username, profile?.username]);

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

        const formattedUsername = username.trim().toLowerCase();

        // Validate format
        const formatErr = validateUsernameFormat(formattedUsername);
        if (formatErr) {
            showAlert("Invalid Username", formatErr);
            return;
        }

        // If validation errors are present in real-time checking, prevent save
        if (usernameError && formattedUsername !== profile?.username) {
            showAlert("Validation Error", usernameError);
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

            // 3. Update Database profiles username and cooldown check first if it changed
            if (formattedUsername !== profile?.username) {
                await updateUsername(formattedUsername, user.id);
            }

            // 4. Update remaining profile fields
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    bio,
                    avatar_url: finalAvatarUrl || 'https://placehold.co/150x150/png?text=User'
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 5. Force Global Context Sync
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
        <View style={{ flex: 1, backgroundColor: isDark ? '#0B1326' : '#FFFFFF' }}>
            {/* Header */}
            <View 
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    height: 56 + insets.top,
                    paddingTop: insets.top,
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
                    backgroundColor: isDark ? '#0B1326' : '#FFFFFF',
                }}
            >
                {router.canGoBack() ? (
                    <Pressable onPress={() => router.back()} style={{ width: 40 }}>
                        <Ionicons name="close-outline" size={28} color={isDark ? "#F3F4F6" : "#262626"} />
                    </Pressable>
                ) : (
                    <View style={{ width: 40 }} />
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
                <ScrollView style={{ flex: 1, backgroundColor: isDark ? '#0B1326' : '#FFFFFF' }} contentContainerStyle={{ paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
                    {/* Key Visual / Photo Area */}
                    <View 
                        style={{
                            width: '100%',
                            backgroundColor: isDark ? '#09111E' : '#F9FAFB',
                            paddingVertical: 40,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderBottomWidth: 1,
                            borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6',
                            position: 'relative',
                        }}
                    >
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
                        <View 
                            style={{
                                paddingVertical: 8,
                                borderBottomWidth: 1,
                                borderBottomColor: focusedField === 'username' ? '#3B82F6' : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6'),
                                backgroundColor: isCooldownActive ? (isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)') : 'transparent',
                                borderRadius: isCooldownActive ? 8 : 0,
                                paddingHorizontal: isCooldownActive ? 8 : 0,
                            }}
                        >
                            <View className="flex-row items-center">
                                <View className="w-8 items-center mr-3">
                                    <Ionicons 
                                        name="person-outline" 
                                        size={24} 
                                        color={isCooldownActive ? (isDark ? '#52525B' : '#A1A1AA') : (focusedField === 'username' ? '#3B82F6' : (isDark ? '#A3A3A3' : '#262626'))} 
                                    />
                                </View>
                                <TextInput
                                    value={username}
                                    onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-zA-Z0-9._]/g, ''))}
                                    placeholder="Username..."
                                    placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                                    autoCapitalize="none"
                                    maxLength={15}
                                    editable={!isCooldownActive}
                                    className={`flex-1 text-base py-2 ${isCooldownActive ? 'text-gray-400 dark:text-zinc-500 font-medium' : 'text-black dark:text-white'}`}
                                    onFocus={() => setFocusedField('username')}
                                    onBlur={() => setFocusedField(null)}
                                    style={{ outlineStyle: 'none' }}
                                />
                            </View>
                            <View className="flex-row justify-between items-center mt-1">
                                <View className="flex-1">
                                    {/* Real-time username validation status or Cooldown Indicator */}
                                    {isCooldownActive ? (
                                        <View className="flex-row items-center mt-0.5 pl-1 pr-4">
                                            <Ionicons name="lock-closed" size={13} color={isDark ? "#71717A" : "#8E8E93"} style={{ marginRight: 6 }} />
                                            <Text className="text-[11px] text-gray-500 dark:text-zinc-400 leading-normal">
                                                You recently changed your username. You can change it again in <Text className="font-extrabold text-gray-700 dark:text-zinc-200">{daysLeft} day{daysLeft === 1 ? '' : 's'}</Text>.
                                            </Text>
                                        </View>
                                    ) : usernameChecking ? (
                                        <View className="flex-row items-center mt-0.5 pl-1">
                                            <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 6 }} />
                                            <Text className="text-[11px] text-blue-500 font-medium">Checking availability...</Text>
                                        </View>
                                    ) : usernameError ? (
                                        <View className="flex-row items-center mt-0.5 pl-1">
                                            <Ionicons name="close-circle" size={13} color="#EF4444" style={{ marginRight: 6 }} />
                                            <Text className="text-[11px] text-red-500 font-semibold">{usernameError}</Text>
                                        </View>
                                    ) : usernameAvailable && username.trim() !== '' && username.trim().toLowerCase() !== profile?.username ? (
                                        <View className="flex-row items-center mt-0.5 pl-1">
                                            <Ionicons name="checkmark-circle" size={13} color="#10B981" style={{ marginRight: 6 }} />
                                            <Text className="text-[11px] text-emerald-500 font-semibold">Username is available! ✨</Text>
                                        </View>
                                    ) : null}
                                </View>
                                {!isCooldownActive && (
                                    <Text className="text-right text-[10px] text-gray-400 dark:text-zinc-500 pl-2">{username.length}/15</Text>
                                )}
                            </View>
                        </View>

                        {/* Bio */}
                        <View 
                            style={{
                                paddingVertical: 8,
                                borderBottomWidth: 1,
                                borderBottomColor: focusedField === 'bio' ? '#3B82F6' : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6'),
                            }}
                        >
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

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
