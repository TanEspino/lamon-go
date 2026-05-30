import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, Text, ScrollView, TouchableOpacity, View, Image, ActivityIndicator, Animated, Pressable, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useReviews } from '../context/ReviewsContext';
import { CustomAlert } from '../context/AlertContext';
import ReviewCard from '../components/ReviewCard';

export default function SinglePostScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { user, showToast } = useAuth();
    const { savedReviewIds, toggleSaveReview } = useReviews();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [loading, setLoading] = useState(true);
    const [post, setPost] = useState(null);
    const [saving, setSaving] = useState(false);

    // Slide-up and fade-in animations
    const slideAnim = useRef(new Animated.Value(600)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Fetch post from Supabase
        const fetchPostDetails = async () => {
            if (!id) {
                setLoading(false);
                return;
            }
            try {
                const { data, error } = await supabase
                    .from('reviews')
                    .select('*, profiles:user_id(username, avatar_url, full_name)')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                
                const parsedPhotos = data.image_url ? data.image_url.split(',').map(u => u.trim()).filter(Boolean) : [];
                setPost({
                    id: data.id,
                    user_id: data.user_id,
                    username: data.profiles?.username || 'Guest',
                    avatar_url: data.profiles?.avatar_url || '',
                    restaurant_name: data.restaurant_name,
                    dish_name: data.dish_name,
                    rating: data.rating,
                    price: data.price,
                    currency: data.currency,
                    notes: data.caption,
                    photos: parsedPhotos,
                    created_at: data.created_at,
                    visibility: data.visibility || 'shared'
                });
            } catch (err) {
                console.error("Error fetching single post details:", err);
                if (showToast) showToast("Error", "Could not load recommendation.", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchPostDetails();

        // Run slide-up animation
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 40,
                friction: 8.5,
                useNativeDriver: true
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true
            })
        ]).start();
    }, [id]);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 800,
                duration: 220,
                useNativeDriver: true
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true
            })
        ]).start(() => {
            router.dismiss();
        });
    };

    const isBookmarked = post ? savedReviewIds.includes(post.id) : false;

    const handleOneTapSave = async () => {
        if (!post || !user) return;
        setSaving(true);
        try {
            await toggleSaveReview(post.id);
            if (showToast) {
                const title = isBookmarked ? "Removed 🔖" : "Saved to Faves! 🔖";
                const message = isBookmarked 
                    ? `Removed "${post.dish_name}" from your saved dishes.`
                    : `Saved "${post.dish_name}"! View it anytime in the Discover Saved Vault!`;
                showToast(title, message, "success");
            }
        } catch (err) {
            console.error("Save recommendation toggle failed:", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' }}>
            {/* Backdrop */}
            <Pressable style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} onPress={handleDismiss}>
                <Animated.View style={{ opacity: opacityAnim, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.6)' }} />
            </Pressable>

            {/* Modal Container */}
            <Animated.View 
                style={{ 
                    height: '85%', 
                    transform: [{ translateY: slideAnim }],
                    width: '100%',
                    maxWidth: 600,
                    alignSelf: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 12,
                    elevation: 12
                }}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#0B1326' : '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }}>
                    {/* Grab handle */}
                    <View style={{ alignItems: 'center', paddingVertical: 10, backgroundColor: isDark ? '#0B1326' : '#FFFFFF' }}>
                        <View style={{ width: 40, height: 4, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#E5E5EA', borderRadius: 2 }} />
                    </View>

                    {/* Header */}
                    <View 
                        style={{ 
                            flexDirection: 'row', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            paddingHorizontal: 20, 
                            paddingBottom: 12, 
                            borderBottomWidth: 1, 
                            borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6', 
                            backgroundColor: isDark ? '#0B1326' : '#FFFFFF' 
                        }}
                    >
                        <TouchableOpacity 
                            onPress={handleDismiss} 
                            style={{ 
                                padding: 6, 
                                borderRadius: 20, 
                                backgroundColor: isDark ? '#27272A' : '#F3F4F6',
                                borderWidth: 1,
                                borderColor: isDark ? '#3F3F46' : '#E5E7EB'
                            }}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="close" size={20} color={isDark ? 'white' : '#18181B'} />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#111827' }}>
                            {post?.visibility === 'recommended' ? 'Chowmate Recommendation' : 'Chowmate Shared Post'}
                        </Text>
                        <View style={{ width: 36 }} />
                    </View>

                    {loading ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#0B1326' : '#FFFFFF' }}>
                            <ActivityIndicator size="large" color="#E11D48" />
                        </View>
                    ) : post ? (
                        <View style={{ flex: 1, backgroundColor: isDark ? '#0B1326' : '#FFFFFF' }}>
                            <ScrollView 
                                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}
                                style={{ backgroundColor: isDark ? '#0B1326' : '#FFFFFF' }}
                                showsVerticalScrollIndicator={false}
                            >
                                <ReviewCard 
                                    review={post}
                                    feedType="discover"
                                    isSaved={isBookmarked}
                                    onSavePress={handleOneTapSave}
                                />
                            </ScrollView>

                            {/* Sticky Bottom Call To Action: Massive 1-Tap Save Button */}
                            <View 
                                style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    paddingHorizontal: 24,
                                    paddingVertical: 16,
                                    backgroundColor: isDark ? '#0B1326' : '#FFFFFF',
                                    borderTopWidth: 1,
                                    borderTopColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingBottom: Platform.OS === 'ios' ? 24 : 16
                                }}
                            >
                                <TouchableOpacity
                                    onPress={handleOneTapSave}
                                    disabled={saving}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 14,
                                        borderRadius: 16,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: isBookmarked ? (isDark ? '#27272A' : '#1F2937') : '#E11D48',
                                        shadowColor: isBookmarked ? '#000' : '#E11D48',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.2,
                                        shadowRadius: 8,
                                        elevation: 4
                                    }}
                                    activeOpacity={0.85}
                                >
                                    {saving ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <>
                                            <Ionicons 
                                                name={isBookmarked ? "bookmark" : "bookmark-outline"} 
                                                size={20} 
                                                color="white" 
                                                style={{ marginRight: 8 }} 
                                            />
                                            <Text style={{ fontWeight: 'bold', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, color: 'white' }}>
                                                {isBookmarked ? 'Saved this Dish!' : 'Save this Dish'}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#0B1326' : '#FFFFFF', paddingHorizontal: 32 }}>
                            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" style={{ marginBottom: 12 }} />
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#FFFFFF' : '#111827', marginBottom: 8 }}>Recommendation Not Found</Text>
                            <Text style={{ fontSize: 14, color: isDark ? '#A1A1AA' : '#6B7280', textAlign: 'center' }}>
                                This recommendation may have been deleted by the owner or is no longer available.
                            </Text>
                        </View>
                    )}
                </SafeAreaView>
            </Animated.View>
            <CustomAlert />
        </View>
    );
}
