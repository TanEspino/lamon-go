import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import * as ImageManipulator from 'expo-image-manipulator';

export default function OnboardingScreen() {
    const { updateProfileLocal, profile, user, fetchProfile } = useAuth();
    const router = useRouter();
    const [username, setUsername] = useState(profile?.username || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
    const [isSaving, setIsSaving] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
            Alert.alert("Required", "Please provide a username.");
            return;
        }

        const usernameRegex = /^[a-zA-Z0-9._]+$/;
        if (!usernameRegex.test(username)) {
            Alert.alert("Invalid Username", "Username can only contain letters, numbers, periods, and underscores. No spaces allowed.");
            return;
        }

        if (!user) {
            Alert.alert("Error", "You must be logged in to save a profile.");
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

                const response = await fetch(manipulatedImage.uri);
                const blob = await response.blob();
                const fileExt = 'jpg';
                const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
                
                // Upload to Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('review-images')
                    .upload(fileName, blob, { contentType: `image/${fileExt}` });
                    
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
            await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
            
            // Redirect properly based on context
            if (router.canGoBack()) {
                router.back(); // Go back to profile if editing
            } else {
                router.replace('/(tabs)'); // Go to home if initial onboarding
            }
        } catch (error) {
            console.error("Onboarding Error:", error);
            Alert.alert('Error', error.message || "Failed to save profile.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100">
                {router.canGoBack() ? (
                    <Pressable onPress={() => router.back()} className="w-10">
                        <Ionicons name="close-outline" size={28} color="#262626" />
                    </Pressable>
                ) : (
                    <View className="w-10" />
                )}
                <Text className="text-base font-bold text-black">{router.canGoBack() ? 'Edit Profile' : 'Profile Setup'}</Text>
                <Pressable onPress={handleSave} disabled={isSaving}>
                    <Text className={`font-bold text-base ${isSaving ? 'text-gray-400' : 'text-primary'}`}>
                        {isSaving ? 'Saving...' : 'Complete'}
                    </Text>
                </Pressable>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
                className="flex-1"
            >
                <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
                    {/* Key Visual / Photo Area */}
                    <View className="w-full bg-gray-50 py-10 items-center justify-center border-b border-gray-100 relative">
                        <Pressable onPress={pickImage} className="relative">
                            <Image
                                source={{ uri: avatarUrl || 'https://placehold.co/150x150/png?text=Add+Photo' }}
                                className="w-32 h-32 rounded-full bg-gray-200 border-2 border-white shadow-sm"
                                resizeMode="cover"
                            />
                            <View className="absolute bottom-0 right-0 bg-primary p-2 rounded-full border-2 border-white">
                                <Ionicons name="camera" size={20} color="white" />
                            </View>
                        </Pressable>
                        <Text className="text-gray-400 font-medium mt-4">Set Profile Picture</Text>
                    </View>

                    {/* Form Fields - Instagram Style List */}
                    <View className="px-4 py-2">
                        {/* Username */}
                        <View className={`py-2 border-b ${focusedField === 'username' ? 'border-blue-500' : 'border-gray-100'}`}>
                            <View className="flex-row items-center">
                                <View className="w-8 items-center mr-3">
                                    <Ionicons 
                                        name="person-outline" 
                                        size={24} 
                                        color={focusedField === 'username' ? '#3B82F6' : '#262626'} 
                                    />
                                </View>
                                <TextInput
                                    value={username}
                                    onChangeText={(text) => setUsername(text.replace(/[^a-zA-Z0-9._]/g, ''))}
                                    placeholder="Username..."
                                    placeholderTextColor="#9CA3AF"
                                    autoCapitalize="none"
                                    maxLength={20}
                                    className="flex-1 text-base text-black py-2"
                                    onFocus={() => setFocusedField('username')}
                                    onBlur={() => setFocusedField(null)}
                                    style={{ outlineStyle: 'none' }}
                                />
                            </View>
                            <Text className="text-right text-[10px] text-gray-400 mt-1">{username.length}/20</Text>
                        </View>

                        {/* Bio */}
                        <View className={`py-2 border-b ${focusedField === 'bio' ? 'border-blue-500' : 'border-gray-100'}`}>
                            <View className="flex-row items-center">
                                <View className="w-8 items-center mr-3">
                                    <Ionicons 
                                        name="document-text-outline" 
                                        size={24} 
                                        color={focusedField === 'bio' ? '#3B82F6' : '#262626'} 
                                    />
                                </View>
                                <TextInput
                                    value={bio}
                                    onChangeText={setBio}
                                    placeholder="Write a short bio..."
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    maxLength={80}
                                    className="flex-1 text-base text-black py-2"
                                    onFocus={() => setFocusedField('bio')}
                                    onBlur={() => setFocusedField(null)}
                                    style={{ outlineStyle: 'none' }}
                                />
                            </View>
                            <Text className="text-right text-[10px] text-gray-400 mt-1">{bio.length}/80</Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
