import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState, useEffect } from 'react';
import { FlatList, Image, SafeAreaView, Text, TouchableOpacity, View, useWindowDimensions, RefreshControl, ActivityIndicator } from 'react-native';
import { useScrollToTop } from '@react-navigation/native';
import ReviewCard from '../../components/ReviewCard';
import { useReviews } from '../../context/ReviewsContext';
import { useAuth } from '../../context/AuthContext';
import { useColorScheme } from 'nativewind';
import { supabase } from '../../lib/supabase';

export default function FeedScreen() {
    const { reviews, fetchReviews, savedReviewIds, toggleSaveReview } = useReviews();
    const { user, profile, showToast, setActiveDiscoverUser } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 600;
    const flatListRef = useRef(null);
    const [showScrollTop, setShowScrollTop] = useState(false);

    const [posts, setPosts] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const lastRefreshRef = useRef(0);

    // Sync Home feed posts in real-time with global reviews context without wiping buddy posts
    useEffect(() => {
        if (!user || !reviews) return;
        
        setPosts(prevPosts => {
            // 1. Filter out user's posts that are no longer present in reviews (handles deletion)
            const activeUserReviewIds = new Set(reviews.map(r => r.id));
            let updated = prevPosts.filter(p => p.user_id !== user.id || activeUserReviewIds.has(p.id));
            
            // 2. Map of reviews from context for easy lookup
            const reviewsMap = new Map(reviews.map(r => [r.id, r]));
            
            // 3. Update existing user posts in updated (handles editing)
            updated = updated.map(p => {
                if (p.user_id === user.id && reviewsMap.has(p.id)) {
                    const latest = reviewsMap.get(p.id);
                    return {
                        ...p,
                        dish_name: latest.dish_name,
                        restaurant_name: latest.restaurant_name,
                        rating: latest.rating,
                        price: latest.price,
                        currency: latest.currency,
                        notes: latest.notes,
                        photo_url: latest.photo_url,
                        photos: latest.photos,
                        visibility: latest.visibility
                    };
                }
                return p;
            });
            
            // 4. Find new reviews in context that are not in updated (handles creation)
            const existingIds = new Set(updated.map(p => p.id));
            const newReviews = reviews.filter(r => !existingIds.has(r.id));
            
            const merged = newReviews.length > 0 ? [...newReviews, ...updated] : updated;
            return merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        });
    }, [reviews, user?.id, profile]);

    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    
    // Automatically scroll to top when the active tab icon is tapped
    useScrollToTop(flatListRef);

    const formatReviews = (data) => {
        return (data || []).map(r => {
            const parsedPhotos = r.image_url ? r.image_url.split(',').map(u => u.trim()).filter(Boolean) : [];
            return {
                id: r.id,
                user_id: r.user_id,
                username: r.profiles?.username || r.profiles?.full_name || 'Guest',
                avatar_url: r.profiles?.avatar_url || '',
                restaurant_name: r.restaurant_name,
                dish_name: r.dish_name,
                rating: r.rating,
                price: r.price,
                currency: r.currency,
                notes: r.caption,
                photo_url: parsedPhotos[0] || '',
                photos: parsedPhotos,
                created_at: r.created_at,
                visibility: r.visibility || 'shared'
            };
        });
    };

    const fetchBuddyIds = async () => {
        if (!user) return [user?.id];
        try {
            const { data, error } = await supabase
                .from('buddies')
                .select('requester_id, receiver_id')
                .eq('status', 'accepted')
                .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
            
            let ids = [user.id];
            if (!error && data) {
                data.forEach(b => {
                    if (b.requester_id !== user.id) ids.push(b.requester_id);
                    if (b.receiver_id !== user.id) ids.push(b.receiver_id);
                });
            }
            return ids;
        } catch (err) {
            console.error("Error getting buddies ids:", err);
            return [user?.id];
        }
    };

    const loadInitialFeed = async (silent = false) => {
        if (!user) return;
        if (!silent) setRefreshing(true);
        try {
            const buddyIds = await fetchBuddyIds();
            const { data, error } = await supabase
                .from('reviews')
                .select('*, profiles:user_id(username, avatar_url, full_name)')
                .in('user_id', buddyIds)
                .order('created_at', { ascending: false })
                .limit(21);

            if (error) throw error;

            const formatted = formatReviews(data);
            setPosts(formatted);
            setHasMore(data.length === 21);
        } catch (err) {
            console.error("Failed to load feed:", err);
        } finally {
            setRefreshing(false);
        }
    };

    const loadMorePosts = async () => {
        if (loadingMore || !hasMore || posts.length === 0 || !user) return;
        setLoadingMore(true);
        try {
            const lastPost = posts[posts.length - 1];
            const buddyIds = await fetchBuddyIds();
            
            const { data, error } = await supabase
                .from('reviews')
                .select('*, profiles:user_id(username, avatar_url, full_name)')
                .in('user_id', buddyIds)
                .lt('created_at', lastPost.created_at)
                .order('created_at', { ascending: false })
                .limit(21);

            if (error) throw error;

            const formatted = formatReviews(data);
            setPosts(prev => [...prev, ...formatted]);
            setHasMore(data.length === 21);
        } catch (err) {
            console.error("Failed to load more posts:", err);
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        if (user?.id) {
            loadInitialFeed();
        }
    }, [user?.id]);
    const handleManualRefresh = async () => {
        const now = Date.now();
        const diff = now - lastRefreshRef.current;
        if (diff < 60000) {
            const secondsLeft = Math.ceil((60000 - diff) / 1000);
            if (showToast) {
                showToast("Feed Up to Date", `Please wait ${secondsLeft}s before refreshing again! ⏳`, "success");
            }
            return;
        }
        setRefreshing(true);
        // Reload all feed posts (buddy + own posts) and refresh context reviews
        await Promise.all([
            loadInitialFeed(true),
            fetchReviews()
        ]);
        setRefreshing(false);
        lastRefreshRef.current = Date.now();
    };
    const handleProfilePress = (authorId) => {
        if (authorId === user?.id) {
            router.push('/(tabs)/profile');
        } else {
            if (setActiveDiscoverUser) {
                setActiveDiscoverUser(authorId);
            }
            router.push('/(tabs)/discover');
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950">
            {/* Custom Logo Header with Refresh Icon */}
            <View className="flex-row items-center justify-between px-4 bg-gray-100 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800" style={{ height: 60, width: '100%' }}>
                <View style={{ width: 40 }} />
                <Image
                    key={isDark ? 'dark' : 'light'}
                    source={isDark ? require('../../assets/logo_profile_dark.png') : require('../../assets/logo_profile.png')}
                    style={{ width: 140, height: 40, alignSelf: 'center' }}
                    resizeMode="contain"
                />
                <TouchableOpacity 
                    onPress={handleManualRefresh}
                    className="p-2 rounded-full active:bg-gray-200 dark:active:bg-zinc-850"
                    disabled={refreshing}
                >
                    <Ionicons 
                        name="refresh" 
                        size={22} 
                        color={refreshing ? (isDark ? '#52525B' : '#A1A1AA') : (isDark ? '#F4F4F5' : '#18181B')} 
                    />
                </TouchableOpacity>
            </View>
            <FlatList
                ref={flatListRef}
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <ReviewCard
                        review={item}
                        onRestaurantPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: item.restaurant_id || 'mock', name: item.restaurant_name } })}
                        onProfilePress={() => handleProfilePress(item.user_id)}
                        isSaved={savedReviewIds.includes(item.id)}
                        onSavePress={() => toggleSaveReview(item.id)}
                    />
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleManualRefresh}
                        colors={["#E11D48"]}
                        tintColor="#E11D48"
                    />
                }
                onEndReached={loadMorePosts}
                onEndReachedThreshold={0.5}
                ListFooterComponent={() => loadingMore ? (
                    <View className="py-6 items-center justify-center">
                        <ActivityIndicator size="small" color="#E11D48" />
                    </View>
                ) : null}
                ListEmptyComponent={() => (
                    <View className="flex-1 items-center justify-center px-8 py-16">
                        {/* Elegant Icon in Turquoise */}
                        <Ionicons 
                            name="restaurant-outline" 
                            size={64} 
                            color="#40E0D0" 
                            style={{ marginBottom: 12 }}
                        />
                        
                        {/* Clean, Subtle Grey Message */}
                        <Text className="text-base font-bold tracking-tight text-neutral-500 dark:text-zinc-400 text-center mb-6">
                            Ready for the first bite?
                        </Text>
                        
                        {/* Compact Premium Red Button */}
                        <TouchableOpacity
                            onPress={() => router.push('/modal')}
                            className="bg-primary px-5 py-2.5 rounded-xl flex-row items-center justify-center shadow-md"
                            style={{ 
                                shadowColor: '#E11D48', 
                                shadowOffset: { width: 0, height: 2 }, 
                                shadowOpacity: 0.15, 
                                shadowRadius: 4,
                                elevation: 3
                            }}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="add-circle" size={16} color="white" style={{ marginRight: 6 }} />
                            <Text className="text-white font-extrabold text-xs tracking-wider uppercase">
                                Drop A Dish
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
                contentContainerStyle={[
                    posts.length === 0 ? { flexGrow: 1 } : {},
                    { 
                        paddingBottom: 100, 
                        width: '100%', 
                        maxWidth: 600, 
                        alignSelf: 'center' 
                    }
                ]}
                showsVerticalScrollIndicator={false}
                onScroll={(e) => {
                    const offsetY = e.nativeEvent.contentOffset.y;
                    setShowScrollTop(offsetY > 300);
                }}
                scrollEventThrottle={16}
            />

            {/* Scroll to Top Button */}
            {showScrollTop && isLargeScreen && (
                <TouchableOpacity
                    onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
                    className="absolute bottom-6 right-6 bg-turquoise w-12 h-12 rounded-full items-center justify-center shadow-lg"
                    style={{ elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="arrow-up" size={24} color="black" />
                </TouchableOpacity>
            )}
            {/* Mobile Floating Action Button (FAB) - Visible only on mobile screens */}
            {!isLargeScreen && (
                <TouchableOpacity 
                    onPress={() => router.push('/modal')}
                    className="absolute bottom-6 right-6 bg-[#E11D48] w-14 h-14 rounded-full items-center justify-center shadow-lg"
                    style={{ 
                        elevation: 6,
                        shadowColor: '#E11D48',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 6,
                        zIndex: 999
                    }}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={28} color="white" />
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
}
