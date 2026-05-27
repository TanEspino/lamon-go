import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, Text, ScrollView, TouchableOpacity, View, Image, ActivityIndicator, Animated, Pressable, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useReviews } from '../context/ReviewsContext';
import { CustomAlert } from '../context/AlertContext';

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
    const [isExpanded, setIsExpanded] = useState(false);

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
                    username: data.profiles?.username || data.profiles?.full_name || 'Guest',
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

    const photos = post?.photos || [];
    const photoUrl = photos[0] || 'https://placehold.co/600x800/png?text=Food';
    const dateString = post?.created_at ? new Date(post.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }) : '';

    return (
        <View className="flex-1 justify-end" style={{ backgroundColor: 'transparent' }}>
            {/* Backdrop */}
            <Pressable className="absolute inset-0" onPress={handleDismiss}>
                <Animated.View style={{ opacity: opacityAnim }} className="w-full h-full bg-black/60" />
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
                <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#18181b' : 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }}>
                    {/* Grab handle */}
                    <View className="items-center py-2.5 bg-white dark:bg-zinc-900">
                        <View className="w-10 h-1 bg-gray-200 dark:bg-zinc-800 rounded-full" />
                    </View>

                    {/* Header */}
                    <View className="flex-row justify-between items-center px-5 pb-3 border-b border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                        <TouchableOpacity 
                            onPress={handleDismiss} 
                            className="p-1.5 rounded-full bg-gray-100 dark:bg-zinc-700 active:bg-gray-200 dark:active:bg-zinc-600 border border-gray-200 dark:border-zinc-600"
                            activeOpacity={0.8}
                        >
                            <Ionicons name="close" size={20} color={isDark ? 'white' : '#18181B'} />
                        </TouchableOpacity>
                        <Text className="text-base font-extrabold text-gray-900 dark:text-white">
                            {post?.visibility === 'recommended' ? 'Chowmate Recommendation' : 'Chowmate Shared Post'}
                        </Text>
                        <View style={{ width: 36 }} />
                    </View>

                    {loading ? (
                        <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-900">
                            <ActivityIndicator size="large" color="#E11D48" />
                        </View>
                    ) : post ? (
                        <View className="flex-1 bg-white dark:bg-zinc-900">
                            <ScrollView 
                                contentContainerStyle={{ paddingBottom: 120 }}
                                showsVerticalScrollIndicator={false}
                            >
                                {/* Author metadata profile header */}
                                <View className="flex-row items-center px-6 py-4">
                                    <Image
                                        source={{ uri: post.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80' }}
                                        className="w-12 h-12 rounded-full mr-4 border border-gray-200 dark:border-zinc-800"
                                    />
                                    <View className="flex-1">
                                        <Text className="text-base font-black text-gray-900 dark:text-white leading-5">
                                            @{post.username}
                                        </Text>
                                        <View className="flex-row items-center flex-wrap gap-1.5 mt-1">
                                            <Text className="text-gray-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                                                {dateString}
                                            </Text>
                                            <Text className="text-gray-300 dark:text-zinc-600 text-[10px]">•</Text>
                                            {post.visibility === 'private' && (
                                                <Ionicons 
                                                    name="lock-closed" 
                                                    size={11} 
                                                    color={isDark ? "#A3A3A3" : "#6B7280"} 
                                                />
                                            )}
                                            {(post.visibility === 'shared' || !post.visibility) && (
                                                <Ionicons 
                                                    name="people" 
                                                    size={12} 
                                                    color={isDark ? "#A3A3A3" : "#6B7280"} 
                                                />
                                            )}
                                            {post.visibility === 'recommended' && (
                                                <View className="flex-row items-center gap-1 border border-amber-500/50 dark:border-amber-500/40 px-2 py-0.5 rounded-full bg-amber-50/20 dark:bg-amber-950/10">
                                                    <MaterialCommunityIcons 
                                                        name="chef-hat" 
                                                        size={11} 
                                                        color={isDark ? "#F59E0B" : "#D97706"} 
                                                    />
                                                    <Text className="text-amber-600 dark:text-amber-500 text-[9px] font-black uppercase tracking-wider">
                                                        Chowmate Recommended
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>

                                {/* Food details card */}
                                <View className="px-5 pb-4">
                                    <View className="flex-row items-start justify-between">
                                        <View className="flex-1 pr-2">
                                            {/* Dish Name */}
                                            <View className="flex-row items-center gap-2">
                                                <Ionicons name="restaurant-outline" size={18} color="#E11D48" />
                                                <Text className="text-2xl font-black text-neutral-800 dark:text-white capitalize flex-1" style={{ fontFamily: 'serif' }}>
                                                    {post.dish_name}
                                                </Text>
                                            </View>
                                            
                                            {/* Restaurant Name */}
                                            <View className="flex-row items-center mt-1.5 pl-0.5">
                                                <Ionicons name="location-outline" size={14} color="#6B7280" />
                                                <Text className="text-gray-500 dark:text-zinc-400 font-bold text-sm pl-1">
                                                    {post.restaurant_name}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Premium Price Tag */}
                                        {!!post.price && (
                                            <View className="bg-primary px-3 py-1.5 rounded-full shadow-sm">
                                                <Text className="font-extrabold text-xs text-white uppercase tracking-wider">
                                                    {post.currency || 'PHP'} {parseFloat(post.price).toFixed(2)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Photo box */}
                                <View className="px-5">
                                    <View className={`rounded-3xl overflow-hidden shadow-md bg-gray-100 dark:bg-zinc-800 relative w-full aspect-square ${post.visibility === 'recommended' ? 'border-2 border-amber-400 dark:border-amber-500' : ''}`}>
                                        <Image
                                            source={{ uri: photoUrl }}
                                            className="w-full h-full"
                                            resizeMode="cover"
                                        />

                                        {/* Rating tag */}
                                        <View className="absolute bottom-4 left-4 bg-gray-950/85 px-3 py-2 rounded-full flex-row items-center shadow-md" style={{ zIndex: 10 }}>
                                            <Ionicons name="star" size={13} color="white" style={{ marginRight: 3 }} />
                                            <Text className="font-extrabold text-xs text-white">{post.rating}.0</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Recommendation notes */}
                                {!!post.notes && (
                                    <View className="px-6 pt-5">
                                        <Text className="text-gray-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5">
                                            Chowmate review notes
                                        </Text>
                                        <View className="border-l-4 border-cyan-400 dark:border-cyan-600 pl-3.5 py-1 bg-cyan-50/20 dark:bg-zinc-900 rounded-r-lg">
                                            <View style={{ marginTop: 4 }}>
                                                <Text 
                                                    ellipsizeMode="tail" 
                                                    numberOfLines={isExpanded ? undefined : 2} 
                                                    className="text-gray-800 dark:text-zinc-200 text-base leading-relaxed italic" 
                                                    style={{ fontFamily: 'serif' }}
                                                >
                                                    "{post.notes}"
                                                </Text>
                                                
                                                {post.notes && post.notes.length > 100 && (
                                                    <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={{ marginTop: 4 }}>
                                                        <Text style={{ color: '#888', fontWeight: 'bold', fontSize: 13 }}>
                                                            {isExpanded ? 'Show less' : 'Read more'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </ScrollView>

                            {/* Sticky Bottom Call To Action: Massive 1-Tap Save Button */}
                            <View 
                                className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-white/95 dark:bg-zinc-900/95 border-t border-gray-100 dark:border-zinc-800 flex-row items-center justify-between"
                                style={{
                                    paddingBottom: Platform.OS === 'ios' ? 24 : 16
                                }}
                            >
                                <TouchableOpacity
                                    onPress={handleOneTapSave}
                                    disabled={saving}
                                    className={`flex-1 py-4 rounded-2xl flex-row items-center justify-center shadow-lg ${isBookmarked ? 'bg-zinc-800 dark:bg-zinc-200' : 'bg-primary'}`}
                                    style={{
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
                                                color={isBookmarked ? (isDark ? 'black' : 'white') : 'white'} 
                                                style={{ marginRight: 8 }} 
                                            />
                                            <Text className={`font-black text-sm uppercase tracking-widest ${isBookmarked ? (isDark ? 'text-black' : 'text-white') : 'text-white'}`}>
                                                {isBookmarked ? 'Saved this Dish!' : 'Save this Dish'}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-900 px-8">
                            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" style={{ marginBottom: 12 }} />
                            <Text className="text-lg font-bold text-gray-900 dark:text-white mb-2">Recommendation Not Found</Text>
                            <Text className="text-gray-400 dark:text-zinc-500 text-center text-sm">
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
