import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

export default function OnboardingScreen() {
    const { updateProfileLocal, profile } = useAuth();
    const router = useRouter();
    const [username, setUsername] = useState(profile?.username || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);

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

        try {
            // Update the auth context so it reflects immediately on the profile page
            updateProfileLocal({
                username,
                bio,
                avatar_url: avatarUrl || 'https://placehold.co/150x150/png?text=User',
            });

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
            Alert.alert('Error', "Failed to complete setup. Please try again.");
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
                <Pressable onPress={handleSave}>
                    <Text className="text-primary font-bold text-base">Complete</Text>
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
                        <View className="flex-row items-center py-4 border-b border-gray-100">
                            <View className="w-8 items-center mr-3">
                                <Ionicons name="person-outline" size={24} color="#262626" />
                            </View>
                            <TextInput
                                value={username}
                                onChangeText={setUsername}
                                placeholder="Username..."
                                placeholderTextColor="#9CA3AF"
                                autoCapitalize="none"
                                className="flex-1 text-base text-black"
                            />
                        </View>

                        {/* Bio */}
                        <View className="flex-row items-center py-4 border-b border-gray-100">
                            <View className="w-8 items-center mr-3">
                                <Ionicons name="document-text-outline" size={24} color="#262626" />
                            </View>
                            <TextInput
                                value={bio}
                                onChangeText={setBio}
                                placeholder="Write a short bio..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                className="flex-1 text-base text-black"
                            />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
