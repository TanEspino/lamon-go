import React, { useEffect, useRef } from 'react';
import { ScrollView, Text, TouchableOpacity, View, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useAlert, CustomAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function AccountManagementScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const topInset = Platform.OS === 'ios' ? 0 : insets.top;
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { showAlert } = useAlert();
    const { signOut, user, showToast } = useAuth();

    // Animation values
    const slideAnim = useRef(new Animated.Value(150)).current; // Start 150px down
    const fadeAnim = useRef(new Animated.Value(0)).current;     // Start invisible

    useEffect(() => {
        // Slide up and fade in on mount
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 350,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    const handleBack = () => {
        // Slide down and fade out on dismiss, then navigate back
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 150,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start(() => {
            router.back();
        });
    };

    const handleDeleteAccount = () => {
        showAlert(
            "Delete Account Permanently? 🚨",
            "WARNING: This action is irreversible. All of your reviews, post photos, saved locations, and Chowmate friendships will be deleted forever.\n\nDo you want to permanently delete your account?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Permanently Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            if (!user?.id) {
                                throw new Error("No active user session found.");
                            }
                            
                            // Execute actual database deletion via RPC function to prevent foreign key loops
                            const { error } = await supabase.rpc('delete_own_account');
                                
                            if (error) {
                                throw error;
                            }
                            
                            // Log user out (which automatically redirects them back to Sign-In page via AuthStateChangeListener)
                            await signOut();
                            
                            // Show floating success toast instead of a blocking modal that lingers across sessions
                            if (showToast) {
                                showToast("Account Deleted 🗑️", "Your account and all associated data have been permanently deleted.", "success");
                            }
                        } catch (err) {
                            showAlert("Deletion Error", err.message || "Failed to complete account deletion.");
                        }
                    } 
                }
            ]
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0B1326' : '#FFFFFF' }}>
            <Animated.View 
                style={{ 
                    flex: 1, 
                    opacity: fadeAnim, 
                    transform: [{ translateY: slideAnim }] 
                }}
            >
                {/* Premium Navigation Header */}
                <View 
                    style={{ 
                        flexDirection: 'row',
                        alignItems: 'center',
                        height: 56 + topInset,
                        paddingTop: topInset,
                        paddingHorizontal: 16,
                        backgroundColor: isDark ? '#0B1326' : '#FFFFFF',
                        borderBottomWidth: 1,
                        borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB'
                    }}
                >
                    <TouchableOpacity 
                        onPress={handleBack} 
                        style={{ padding: 6, marginLeft: -8 }}
                    >
                        <Ionicons name="chevron-back" size={26} color={isDark ? '#F4F4F5' : '#18181B'} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: isDark ? '#FFFFFF' : '#111827', marginLeft: 8 }}>Account Management</Text>
                </View>

                {/* Main Content Area */}
                <ScrollView 
                    contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 60 }}
                    style={{ backgroundColor: isDark ? '#0B1326' : '#FFFFFF' }}
                    showsVerticalScrollIndicator={true}
                >
                    {/* Section Description */}
                    <Text style={{ fontSize: 24, fontWeight: '800', color: isDark ? '#FFFFFF' : '#111827', letterSpacing: -0.5 }}>
                        Manage Account Info
                    </Text>
                    <Text style={{ fontSize: 14.5, lineHeight: 22, color: isDark ? '#A1A1AA' : '#4B5563', marginTop: 12, marginBottom: 28, fontFamily: Platform.OS === 'android' ? 'Inter-Regular' : 'Inter' }}>
                        Here you can manage your LamonGo profile settings and account data deletion. If you delete your account, your data will be permanently removed.
                    </Text>

                    {/* Delete Section Card */}
                    <View 
                        style={{ 
                            backgroundColor: isDark ? '#151C2E' : '#F9FAFB', 
                            borderRadius: 20, 
                            borderWidth: 1, 
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6',
                            padding: 20,
                            marginBottom: 24
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <Ionicons name="trash-outline" size={22} color="#EF4444" style={{ marginRight: 10 }} />
                            <Text style={{ fontSize: 16, fontWeight: '800', color: isDark ? '#FFFFFF' : '#111827' }}>
                                Delete Account
                            </Text>
                        </View>
                        <Text style={{ fontSize: 13.5, lineHeight: 20, color: isDark ? '#A1A1AA' : '#4B5563', marginBottom: 20, fontFamily: Platform.OS === 'android' ? 'Inter-Regular' : 'Inter' }}>
                            Permanently delete your LamonGo account and all associated food diaries, photos, and Chowmate data. This action cannot be undone.
                        </Text>

                        {/* Outlined/Subtle Red Warning Delete Button */}
                        <TouchableOpacity
                            onPress={handleDeleteAccount}
                            style={{
                                borderHorizontalWidth: 1,
                                borderWidth: 1,
                                borderColor: '#EF4444',
                                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.03)',
                                paddingVertical: 12,
                                borderRadius: 12,
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 14.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Delete Account
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </Animated.View>
            <CustomAlert />
        </View>
    );
}
