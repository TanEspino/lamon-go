import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Text, TouchableOpacity, View, ScrollView, Pressable, useWindowDimensions, StyleSheet, Modal, FlatList, Alert, Platform, TextInput, KeyboardAvoidingView, Animated } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useColorScheme } from 'nativewind';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// Module-level global flags to avoid spamming table existence checks across multiple card mounts
let globalDbChecked = false;
let globalDbAvailable = true;

export default function ReviewCard({ review, onPress, onDelete, onEdit, onRestaurantPress, onProfilePress, onSavePress, isSaved, feedType = 'discover' }) {
    const { width: windowWidth } = useWindowDimensions();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { user, profile } = useAuth();

    // Responsive card width computation for immediate correct sizing
    const fallbackWidth = Math.min(windowWidth, 600) - 32;
    const [cardWidth, setCardWidth] = useState(fallbackWidth);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollViewRef = useRef(null);

    // States for Caption and Bottom Sheets
    const [isExpanded, setIsExpanded] = useState(false);
    const [showReadMore, setShowReadMore] = useState(false);
    const [showConsensusSheet, setShowConsensusSheet] = useState(false);
    const [showRateDishSheet, setShowRateDishSheet] = useState(false);

    // Lightweight Web-Safe Toast State using Animated API
    const [toastMessage, setToastMessage] = useState('');
    const [toastVisible, setToastVisible] = useState(false);
    const toastOpacity = useRef(new Animated.Value(0)).current;

    // Dynamic stats and Database connectivity states
    const [dbAvailable, setDbAvailable] = useState(globalDbAvailable);
    const [dbChecked, setDbChecked] = useState(globalDbChecked);
    const [hasLoadedReviews, setHasLoadedReviews] = useState(false);

    // Consensus reviews local state - pre-populates with user's rating from database if present, starts empty in DB mode, gets populated with mocks in fallback mode
    const [consensusReviews, setConsensusReviews] = useState(() => {
        if (review.user_consensus_rating !== undefined && review.user_consensus_rating !== null) {
            const username = profile?.username || user?.email?.split('@')[0] || 'You';
            const avatar = profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80';
            return [{
                id: `user_init_${review.id}`,
                username,
                avatar,
                rating: parseInt(review.user_consensus_rating),
                comment: review.user_consensus_comment || '',
                isCurrentUser: true
            }];
        }
        return [];
    });

    // Sync user consensus rating from review prop (vital for session load on mount, login/logout, and refresh flows)
    useEffect(() => {
        if (dbAvailable) {
            if (review.user_consensus_rating !== undefined && review.user_consensus_rating !== null) {
                const username = profile?.username || user?.email?.split('@')[0] || 'You';
                const avatar = profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80';
                setConsensusReviews([{
                    id: `user_init_${review.id}`,
                    username,
                    avatar,
                    rating: parseInt(review.user_consensus_rating),
                    comment: review.user_consensus_comment || '',
                    isCurrentUser: true
                }]);
            } else {
                setConsensusReviews([]);
            }
        }
    }, [review.user_consensus_rating, review.user_consensus_comment, review.id, user?.id, profile?.username, dbAvailable]);

    // Sync card width if screen layout changes
    const isRecommended = review.visibility === 'recommended';

    useEffect(() => {
        setCardWidth(fallbackWidth);
    }, [windowWidth]);

    // Check DB availability once globally
    useEffect(() => {
        if (!globalDbChecked) {
            const checkDb = async () => {
                try {
                    const { error } = await supabase
                        .from('consensus_ratings')
                        .select('id')
                        .limit(1);
                    
                    if (error && (error.code === 'PGRST116' || error.message?.includes("does not exist"))) {
                        globalDbAvailable = false;
                        setDbAvailable(false);
                    } else {
                        globalDbAvailable = true;
                        setDbAvailable(true);
                    }
                } catch {
                    globalDbAvailable = false;
                    setDbAvailable(false);
                } finally {
                    globalDbChecked = true;
                    setDbChecked(true);
                }
            };
            checkDb();
        } else {
            setDbAvailable(globalDbAvailable);
            setDbChecked(true);
        }
    }, []);

    // Sync mock reviews if DB is not available
    useEffect(() => {
        if (dbChecked && !dbAvailable) {
            setConsensusReviews([
                {
                    id: '1',
                    username: 'john_doe',
                    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80',
                    rating: 5,
                    comment: 'Absolutely spectacular flavor profile! The balance of spice and texture is perfect.'
                },
                {
                    id: '2',
                    username: 'foodie_girl',
                    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80',
                    rating: 4,
                    comment: 'Very tasty, but a bit rich. Definitely sharing size!'
                },
                {
                    id: '3',
                    username: 'chef_alex',
                    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80',
                    rating: 5,
                    comment: 'High culinary standard. Plating and execution are pristine.'
                }
            ]);
        }
    }, [dbChecked, dbAvailable]);

    const photos = Array.isArray(review.photos) 
        ? review.photos 
        : (review.photo_url 
            ? String(review.photo_url).split(',').map(u => u.trim()).filter(Boolean) 
            : []);

    const handleScroll = (event) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const viewSize = event.nativeEvent.layoutMeasurement.width;
        if (viewSize > 0) {
            const index = Math.round(contentOffset / viewSize);
            setActiveIndex(index);
        }
    };

    const handleLayout = (event) => {
        const layoutWidth = event.nativeEvent.layout.width;
        if (layoutWidth > 0) {
            setCardWidth(layoutWidth);
        }
    };

    const scrollToImage = (index) => {
        if (index >= 0 && index < photos.length && cardWidth > 0) {
            scrollViewRef.current?.scrollTo({ x: index * cardWidth, animated: true });
            setActiveIndex(index);
        }
    };

    // Format the date nicely
    const dateString = new Date(review.created_at || Date.now()).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    // Fallback avatar URL (high-quality placeholder)
    const avatarUrl = review.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80';

    // Interactive Caption height calculation helper
    const handleTextLayout = (e) => {
        if (e.nativeEvent.lines.length > 2) {
            setShowReadMore(true);
        }
    };

    // Trigger Lightweight Web-Safe Toast message
    const showToast = (message) => {
        setToastMessage(message);
        setToastVisible(true);
        
        // Animate in
        Animated.timing(toastOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: Platform.OS !== 'web',
        }).start();

        // Auto-hide after 2.5 seconds (2500ms)
        setTimeout(() => {
            Animated.timing(toastOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: Platform.OS !== 'web',
            }).start(() => {
                setToastVisible(false);
            });
        }, 2500);
    };

    // Lazy load consensus ratings from Supabase when the details sheet opens
    const fetchConsensusRatings = async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('consensus_ratings')
                .select('id, rating, comment, user_id, created_at, profiles:user_id(username, avatar_url)')
                .eq('post_id', review.id);

            if (error) {
                // If table doesn't exist, log warning and rely on local state mock fallbacks gracefully
                if (error.code === 'PGRST116' || error.message?.includes("does not exist")) {
                    console.log("⚠️ Table consensus_ratings does not exist yet. Running in local fallback mode.");
                    setDbAvailable(false);
                    setHasLoadedReviews(true);
                    return;
                }
                throw error;
            }

            const mapped = data.map(item => ({
                id: item.id,
                username: item.profiles?.username || 'Guest',
                avatar: item.profiles?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80',
                rating: item.rating,
                comment: item.comment,
                isCurrentUser: item.user_id === user.id
            }));

            setConsensusReviews(mapped);
            setDbAvailable(true);
            setHasLoadedReviews(true);
        } catch (err) {
            console.log("⚠️ Network/Fetch error in fetchConsensusRatings:", err.message || err);
            setHasLoadedReviews(true);
        }
    };

    useEffect(() => {
        if (showConsensusSheet) {
            fetchConsensusRatings();
        }
    }, [showConsensusSheet, user?.id]);

    // Build the original poster's rating entry to include in statistics & reviews list
    const posterRatingEntry = {
        id: `poster_${review.id}`,
        username: review.username || 'Guest',
        avatar: review.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80',
        rating: review.rating !== undefined ? parseInt(review.rating) : 5,
        comment: review.notes || '',
        isPoster: true
    };

    // Combine poster rating and consensus reviews for true aggregate calculations
    const activeRatingsList = [posterRatingEntry, ...consensusReviews];

    // Determine if there is any consensus rating yet (excluding original poster's rating)
    const hasConsensus = dbChecked && !dbAvailable
        ? true // In mock fallback mode, always showcase consensus ratings
        : (consensusReviews.length > 0 || (review.consensus_count !== undefined && review.consensus_count !== null && parseInt(review.consensus_count) > 0));

    // Calculate dynamic stats including original poster's rating
    const useLiveStats = hasLoadedReviews || (review.consensus_count === undefined || review.consensus_count === null || parseInt(review.consensus_count) === 0);

    const totalCount = useLiveStats
        ? activeRatingsList.length
        : (parseInt(review.consensus_count) + 1);

    const averageRating = useLiveStats
        ? (activeRatingsList.reduce((sum, item) => sum + item.rating, 0) / totalCount).toFixed(1)
        : (review.consensus_average !== undefined && review.consensus_average !== null && parseFloat(review.consensus_average) > 0
            ? ((parseFloat(review.consensus_average) * (totalCount - 1) + posterRatingEntry.rating) / totalCount).toFixed(1)
            : posterRatingEntry.rating.toFixed(1));

    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    activeRatingsList.forEach(item => {
        if (starCounts[item.rating] !== undefined) {
            starCounts[item.rating]++;
        }
    });

    const getStarPercentage = (star) => {
        if (totalCount === 0) return '0%';
        return `${((starCounts[star] / totalCount) * 100).toFixed(0)}%`;
    };

    const openRateDishSheet = () => {
        if (review.user_id === user?.id) {
            if (Platform.OS === 'web') {
                window.alert("You cannot contribute a consensus rating to your own post!");
            } else {
                Alert.alert("Action Blocked 🚫", "You cannot contribute a consensus rating to your own post!");
            }
            return;
        }
        setShowRateDishSheet(true);
    };

    const openConsensusSheet = () => {
        setShowConsensusSheet(true);
    };

    const handleSubmitRating = async (rating, comment) => {
        const username = profile?.username || user?.email?.split('@')[0] || 'You';
        const avatar = profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80';

        // 1. Optimistic Local State Update
        setConsensusReviews(prev => {
            const existingIndex = prev.findIndex(r => r.isCurrentUser || r.username === username);
            if (existingIndex > -1) {
                const updated = [...prev];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    rating,
                    comment,
                    avatar
                };
                return updated;
            } else {
                return [
                    ...prev,
                    {
                        id: `user_${Date.now()}`,
                        username,
                        avatar,
                        rating,
                        comment,
                        isCurrentUser: true
                    }
                ];
            }
        });
        setHasLoadedReviews(true);

        // Automatically close sheets to return the user to the feed
        setShowRateDishSheet(false);
        setShowConsensusSheet(false);

        // 2. Trigger web-safe non-blocking Toast message
        showToast("Rating added to the Chowmate Verdict!");

        // 3. Supabase Database Upsert
        if (user?.id) {
            try {
                const { error } = await supabase
                    .from('consensus_ratings')
                    .upsert({
                        post_id: review.id,
                        user_id: user.id,
                        rating,
                        comment: comment || null
                    }, { onConflict: 'post_id,user_id' });

                if (error) {
                    if (error.message?.includes("does not exist")) {
                        console.log("⚠️ Database write caught: table consensus_ratings does not exist. Defaulting to local memory.");
                    } else {
                        throw error;
                    }
                } else {
                    setDbAvailable(true);
                }
            } catch (err) {
                console.log("⚠️ Supabase error on rating upsert:", err.message || err);
            }
        }
    };

    const handleRemoveRating = async () => {
        const username = profile?.username || user?.email?.split('@')[0] || 'You';

        // 1. Optimistic Local State Delete
        setConsensusReviews(prev => prev.filter(r => !r.isCurrentUser && r.username !== username));

        // Automatically close sheets
        setShowConsensusSheet(false);
        setShowRateDishSheet(false);

        // 2. Trigger web-safe Toast message
        showToast("Your rating has been removed.");

        // 3. Supabase Database Delete
        if (user?.id) {
            try {
                const { error } = await supabase
                    .from('consensus_ratings')
                    .delete()
                    .eq('post_id', review.id)
                    .eq('user_id', user.id);

                if (error) {
                    if (!error.message?.includes("does not exist")) {
                        throw error;
                    }
                }
            } catch (err) {
                console.log("⚠️ Supabase error on rating delete:", err.message || err);
            }
        }
    };

    const usernameStr = profile?.username || user?.email?.split('@')[0] || 'You';
    const hasUserRated = consensusReviews.some(r => r.isCurrentUser || r.username === usernameStr);
    const currentUserRating = consensusReviews.find(r => r.isCurrentUser || r.username === usernameStr);

    return (
        <View className="bg-white dark:bg-zinc-900 mb-6 pb-4 border-b border-gray-100 dark:border-zinc-800">
            {/* Header: User Attribution Row */}
            <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
                <TouchableOpacity 
                    onPress={onProfilePress} 
                    className="flex-row items-center flex-1"
                    activeOpacity={0.7}
                    disabled={!onProfilePress}
                >
                    <Image
                        source={{ uri: avatarUrl }}
                        className="w-10 h-10 rounded-full mr-3 border border-gray-200 dark:border-zinc-700"
                    />
                    <View className="flex-1 pr-2">
                        <Text className="font-extrabold text-neutral-800 dark:text-zinc-50 text-sm">
                            @{review.username || 'Guest'}
                        </Text>
                        <View className="flex-row items-center flex-wrap gap-1.5 mt-0.5">
                            <Text className="text-gray-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                                {dateString}
                            </Text>
                            <Text className="text-gray-300 dark:text-zinc-600 text-[10px]">•</Text>
                            {/* Audience indicator - Minimalist & Premium Icons only */}
                            {review.visibility === 'private' && (
                                <Ionicons 
                                    name="lock-closed" 
                                    size={11} 
                                    color={isDark ? "#A3A3A3" : "#6B7280"} 
                                />
                            )}
                            {(review.visibility === 'shared' || !review.visibility) && (
                                <Ionicons 
                                    name="people" 
                                    size={12} 
                                    color={isDark ? "#A3A3A3" : "#6B7280"} 
                                />
                            )}
                            {review.visibility === 'recommended' && (
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
                </TouchableOpacity>

                {/* Edit & Delete Action Buttons */}
                <View className="flex-row items-center gap-2">
                    {onEdit && (
                        <TouchableOpacity onPress={onEdit} className="p-1.5 bg-gray-50 dark:bg-zinc-800 rounded-full">
                            <Ionicons name="create-outline" size={16} color={isDark ? "white" : "black"} />
                        </TouchableOpacity>
                    )}
                    {onDelete && (
                        <TouchableOpacity onPress={onDelete} className="p-1.5 bg-red-50 dark:bg-red-950 rounded-full">
                            <Ionicons name="trash-outline" size={16} color="red" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Dish & Restaurant Metadata */}
            <View className="px-5 pb-3">
                {/* Dish Name */}
                <View className="flex-row items-center gap-2">
                    <Ionicons name="restaurant-outline" size={16} color={isDark ? "#A3A3A3" : "#737373"} style={{ marginTop: 2 }} />
                    <Text className="text-xl font-bold text-neutral-800 dark:text-white capitalize tracking-tight flex-1" style={{ fontFamily: 'serif', lineHeight: 24 }}>
                        {review.dish_name}
                    </Text>
                </View>
                
                {/* Restaurant Location */}
                <TouchableOpacity 
                    onPress={onRestaurantPress}
                    disabled={!onRestaurantPress}
                    className="flex-row items-center mt-1"
                    activeOpacity={0.7}
                >
                    <Ionicons name="location-outline" size={13} color={isDark ? "#A3A3A3" : "#6B7280"} />
                    <Text className="text-gray-500 dark:text-zinc-400 font-bold text-xs pl-1">
                        {review.restaurant_name}
                    </Text>
                </TouchableOpacity>
            </View>

            <View className="px-4">
                <View 
                    onLayout={handleLayout}
                    className={`rounded-3xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shadow-sm relative w-full aspect-square ${isRecommended ? 'border-2 border-amber-400 dark:border-amber-500' : ''}`}
                >
                    {photos.length > 0 ? (
                        <View className="w-full h-full relative">
                            <ScrollView
                                ref={scrollViewRef}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                showsVerticalScrollIndicator={false}
                                onScroll={handleScroll}
                                scrollEventThrottle={16}
                                style={{ width: '100%', height: '100%' }}
                            >
                                {photos.map((uri, index) => (
                                    <View key={index} style={{ width: cardWidth || 300, height: '100%' }}>
                                        <Image
                                            source={{ uri }}
                                            className="w-full h-full"
                                            resizeMode="cover"
                                        />
                                    </View>
                                ))}
                            </ScrollView>

                            {/* Left Chevron Button */}
                            {photos.length > 1 && activeIndex > 0 && (
                                <Pressable
                                    onPress={() => scrollToImage(activeIndex - 1)}
                                    className="absolute left-3 top-1/2 -mt-5 bg-zinc-900 rounded-full p-2 items-center justify-center"
                                    style={{ zIndex: 10 }}
                                >
                                    <Ionicons name="chevron-back" size={20} color="white" />
                                </Pressable>
                            )}

                            {/* Right Chevron Button */}
                            {photos.length > 1 && activeIndex < photos.length - 1 && (
                                <Pressable
                                    onPress={() => scrollToImage(activeIndex + 1)}
                                    className="absolute right-3 top-1/2 -mt-5 bg-zinc-900 rounded-full p-2 items-center justify-center"
                                    style={{ zIndex: 10 }}
                                >
                                    <Ionicons name="chevron-forward" size={20} color="white" />
                                </Pressable>
                            )}

                            {/* Dot Indicators */}
                            {photos.length > 1 && (
                                <View className="absolute bottom-12 left-0 right-0 flex-row justify-center gap-1.5" style={{ zIndex: 10 }}>
                                    {photos.map((_, index) => (
                                        <Pressable
                                            key={index}
                                            onPress={() => scrollToImage(index)}
                                            className={`h-2 rounded-full ${index === activeIndex ? 'w-4 bg-white' : 'w-2 bg-zinc-400'}`}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>
                    ) : (
                        <Image
                            source={{ uri: 'https://placehold.co/600x800/png?text=Food' }}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    )}

                    {/* TOP RIGHT ZONE: Bookmarking & Rate Action Overlay Container */}
                    <View style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 50 }}>
                        {/* Rate Dish Action Icon - Only on Home Feed & Not for own reviews */}
                        {feedType === 'home' && review.user_id !== user?.id && (
                            <TouchableOpacity
                                onPress={openRateDishSheet}
                                className="bg-zinc-950/85 p-2 rounded-full shadow-md"
                                activeOpacity={0.85}
                                accessibilityLabel="Rate Dish Action"
                            >
                                <MaterialCommunityIcons 
                                    name={hasUserRated ? "star" : "star-plus-outline"} 
                                    size={18} 
                                    color={hasUserRated ? "#00D2C4" : "white"} 
                                />
                            </TouchableOpacity>
                        )}

                        {/* Floating Save/Bookmark Button */}
                        {onSavePress && (
                            <TouchableOpacity
                                onPress={onSavePress}
                                className={`p-2 rounded-full shadow-md ${isSaved ? 'bg-amber-400 dark:bg-amber-500' : 'bg-zinc-950/85'}`}
                                activeOpacity={0.8}
                                accessibilityLabel="Save Review"
                            >
                                <Ionicons 
                                    name={isSaved ? "bookmark" : "bookmark-outline"} 
                                    size={18} 
                                    color={isSaved ? "black" : "white"} 
                                />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* BOTTOM LEFT ZONE: Ratings and Chowmate Verdict Pills Container */}
                    <View style={{ position: 'absolute', bottom: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 50 }}>
                        {/* Poster's Yellow Rating Pill */}
                        <View className={`px-3 py-1.5 rounded-full flex-row items-center shadow-md ${isRecommended ? 'bg-amber-400 dark:bg-amber-500' : 'bg-zinc-900'}`}>
                            <Ionicons name="star" size={12} color={isRecommended ? "black" : "white"} style={{ marginRight: 2 }} />
                            <Text className={`font-extrabold text-xs ${isRecommended ? 'text-zinc-950' : 'text-white'}`}>{review.rating}.0</Text>
                        </View>

                        {/* Chowmate Verdict Average Ratings Pill - Only shown when there are consensus ratings yet (excludes original poster's rating) */}
                        {hasConsensus && (
                            <TouchableOpacity
                                onPress={openConsensusSheet}
                                disabled={feedType === 'profile'}
                                className="px-3 py-1.5 rounded-full flex-row items-center shadow-md"
                                style={{ backgroundColor: '#00D2C4' }}
                                activeOpacity={feedType === 'profile' ? 1.0 : 0.8}
                            >
                                <Ionicons name="people-outline" size={12} color="white" style={{ marginRight: 3 }} />
                                <Text className="font-extrabold text-xs text-white">{averageRating}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Price Tag */}
                    {!!review.price && (
                        <View className="absolute bottom-3 right-3 bg-[#E11D48] px-3 py-1.5 rounded-full shadow-md" style={{ zIndex: 20 }}>
                            <Text className="font-extrabold text-xs text-white">
                                {review.currency || 'PHP'} {parseFloat(review.price).toFixed(2)}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
 
            {/* Content: Caption Notes with Inline Truncation */}
            {!!review.notes && (
                <View className="px-5 pt-3">
                    <View className="border-l-4 border-cyan-400 dark:border-cyan-600 pl-3 py-0.5">
                        <View style={{ marginTop: 8 }}>
                            <Text 
                                ellipsizeMode="tail" 
                                numberOfLines={isExpanded ? undefined : 2} 
                                style={[styles.captionText, { color: isDark ? '#e4e4e7' : '#27272a' }]}
                            >
                                {review.notes}
                            </Text>
                            
                            {review.notes && review.notes.length > 100 && (
                                <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={{ marginTop: 4 }}>
                                    <Text style={{ color: '#888', fontWeight: 'bold' }}>
                                        {isExpanded ? 'Show less' : 'Read more'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            )}

            {/* Custom App Store-style Chowmate Verdict Bottom Sheet */}
            <ConsensusBottomSheet 
                visible={showConsensusSheet} 
                onClose={() => setShowConsensusSheet(false)} 
                isDark={isDark}
                reviews={activeRatingsList}
                averageRating={averageRating}
                totalCount={totalCount}
                starCounts={starCounts}
                getStarPercentage={getStarPercentage}
                hasUserRated={hasUserRated}
                onRemoveRating={handleRemoveRating}
            />

            {/* Premium Rate Dish Scroll-up Form Bottom Sheet */}
            <RateDishBottomSheet
                visible={showRateDishSheet}
                onClose={() => setShowRateDishSheet(false)}
                isDark={isDark}
                onSubmit={handleSubmitRating}
                currentRating={currentUserRating?.rating || 0}
                currentComment={currentUserRating?.comment || ''}
            />

            {/* Premium Absolute Overlay Web-Safe Toast Message Indicator */}
            {toastVisible && (
                <Animated.View 
                    style={[
                        styles.toastContainer,
                        {
                            opacity: toastOpacity,
                            backgroundColor: isDark ? '#27272a' : '#18181b',
                            borderColor: isDark ? '#3f3f46' : '#27272a',
                        }
                    ]}
                >
                    <Ionicons name="checkmark-circle" size={18} color="#00D2C4" style={{ marginRight: 8 }} />
                    <Text style={toastTextThemeStyle(isDark)}>{toastMessage}</Text>
                </Animated.View>
            )}
        </View>
    );
}

// Helper to keep styling dry & clean
const toastTextThemeStyle = (isDark) => ({
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
});

// Premium Rate Dish Slide-Up Bottom Sheet Component
function RateDishBottomSheet({ visible, onClose, isDark, onSubmit, currentRating = 0, currentComment = '' }) {
    const [rating, setRating] = useState(currentRating);
    const [comment, setComment] = useState(currentComment);

    // Sync state when sheet opens
    useEffect(() => {
        if (visible) {
            setRating(currentRating);
            setComment(currentComment);
        }
    }, [visible, currentRating, currentComment]);

    const handleSubmit = () => {
        if (rating === 0) {
            if (Platform.OS === 'web') {
                window.alert("Please select a star rating between 1 and 5 to rate this dish!");
            } else {
                Alert.alert("Star Rating Required ⭐️", "Please select a star rating between 1 and 5 to rate this dish!");
            }
            return;
        }
        onSubmit(rating, comment.trim());
        onClose();
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Pressable style={styles.backdropPressable} onPress={onClose} />
                
                {/* Center the bottom sheet to match the app layout on Web with fixed 600px width limit */}
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ 
                        width: '100%', 
                        maxWidth: 600, 
                        alignSelf: 'center', 
                        marginTop: 'auto',
                        ...Platform.select({
                            web: {
                                marginLeft: 'auto',
                                marginRight: 'auto',
                            }
                        })
                    }}
                >
                    <View style={[styles.sheetContainer, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff', height: 'auto', maxHeight: 520, paddingBottom: Platform.OS === 'ios' ? 40 : 30, width: '100%' }]}>
                        {/* Handlebar */}
                        <View style={[styles.handlebar, { backgroundColor: isDark ? '#3a3a3c' : '#e5e5ea' }]} />
                        
                        {/* Header Row */}
                        <View style={styles.headerRow}>
                            <Text style={[styles.headerTitle, { color: isDark ? '#ffffff' : '#000000' }]}>Chowmate Verdict</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close-circle" size={24} color="#8e8e93" />
                            </TouchableOpacity>
                        </View>

                        {/* Subtitle / Custom Message */}
                        <Text style={[styles.sheetSubtitle, { color: isDark ? '#a1a1aa' : '#71717a' }]}>
                            Tried this exact dish? Drop your own rating and review.
                        </Text>

                        {/* Star Rating Selector */}
                        <View style={styles.starsSelectorContainer}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity 
                                    key={star} 
                                    onPress={() => setRating(star)}
                                    activeOpacity={0.7}
                                    style={styles.starIconWrapper}
                                >
                                    <Ionicons 
                                        name={star <= rating ? "star" : "star-outline"} 
                                        size={38} 
                                        color={star <= rating ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#3a3a3c' : '#d1d1d6')} 
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Comment Input */}
                        <View style={[styles.commentInputContainer, { borderColor: isDark ? '#2c2c2e' : '#e5e5ea', backgroundColor: isDark ? '#2c2c2e' : '#f9f9f9' }]}>
                            <TextInput
                                value={comment}
                                onChangeText={setComment}
                                placeholder="What makes this dish special? (Optional)"
                                placeholderTextColor={isDark ? '#8e8e93' : '#a1a1aa'}
                                maxLength={50}
                                multiline
                                numberOfLines={2}
                                style={[styles.commentInput, { color: isDark ? '#ffffff' : '#000000' }]}
                            />
                            {/* Character Counter */}
                            <Text style={styles.charCounter}>
                                {comment.length} / 50
                            </Text>
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity 
                            onPress={handleSubmit}
                            style={styles.submitButton}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.submitButtonText}>Submit Rating</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

// App Store-style Verdict Bottom Sheet Component (Rebranded to Chowmate Verdict)
function ConsensusBottomSheet({ 
    visible, 
    onClose, 
    isDark, 
    reviews, 
    averageRating, 
    totalCount, 
    starCounts, 
    getStarPercentage, 
    hasUserRated, 
    onRemoveRating 
}) {

    const handleRemovePress = () => {
        // Web-safe absolute overlay confirmation instead of Mobile-only Alert blocks
        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure you want to delete your rating from the verdict?")) {
                onRemoveRating();
            }
        } else {
            Alert.alert(
                "Remove Rating",
                "Are you sure you want to delete your rating from the verdict?",
                [
                    { text: "Cancel", style: "cancel" },
                    { 
                        text: "Remove", 
                        style: "destructive", 
                        onPress: () => {
                            onRemoveRating();
                        } 
                    }
                ]
            );
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Pressable style={styles.backdropPressable} onPress={onClose} />
                
                {/* Center the bottom sheet to match the 600px centered app layout on Web instead of full browser width */}
                <View style={{ 
                    width: '100%', 
                    maxWidth: 600, 
                    alignSelf: 'center', 
                    marginTop: 'auto',
                    ...Platform.select({
                        web: {
                            marginLeft: 'auto',
                            marginRight: 'auto',
                        }
                    })
                }}>
                    <View style={[
                        styles.sheetContainer, 
                        { 
                            backgroundColor: isDark ? '#1c1c1e' : '#ffffff', 
                            width: '100%',
                            ...Platform.select({
                                web: {
                                    height: 750,
                                    maxHeight: '90%',
                                }
                            })
                        }
                    ]}>
                        {/* Handlebar */}
                        <View style={[styles.handlebar, { backgroundColor: isDark ? '#3a3a3c' : '#e5e5ea' }]} />
                        
                        {/* Header Row */}
                        <View style={styles.headerRow}>
                            <Text style={[styles.headerTitle, { color: isDark ? '#ffffff' : '#000000' }]}>Chowmate Verdict</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close-circle" size={24} color="#8e8e93" />
                            </TouchableOpacity>
                        </View>

                        {/* Distribution Stats Row */}
                        <View style={styles.distributionContainer}>
                            <View style={styles.leftColumn}>
                                <Text style={[styles.ratingNumber, { color: isDark ? '#ffffff' : '#000000' }]}>{averageRating}</Text>
                                <View style={styles.starsRow}>
                                    {Array.from({ length: 5 }).map((_, idx) => {
                                        const ratingVal = parseFloat(averageRating) || 0.0;
                                        const starNum = idx + 1;
                                        const starColor = isDark ? '#ffffff' : '#000000'; // Minimalist stars color
                                        if (ratingVal >= starNum) {
                                            return <Ionicons key={idx} name="star" size={14} color={starColor} />;
                                        } else if (ratingVal > starNum - 1) {
                                            return <Ionicons key={idx} name="star-half" size={14} color={starColor} />;
                                        } else {
                                            return <Ionicons key={idx} name="star-outline" size={14} color={starColor} />;
                                        }
                                    })}
                                </View>
                                <Text style={styles.ratingCount}>{totalCount} {totalCount === 1 ? 'Rating' : 'Ratings'}</Text>
                            </View>

                            <View style={styles.rightColumn}>
                                {/* 5 Star Progress Bar */}
                                <View style={styles.progressBarRow}>
                                    <Text style={[styles.starLabel, { color: isDark ? '#8e8e93' : '#52525b' }]}>5 ★</Text>
                                    <View style={[styles.progressTrack, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]}>
                                        <View style={[styles.progressFill, { width: getStarPercentage(5) }]} />
                                    </View>
                                </View>
                                {/* 4 Star Progress Bar */}
                                <View style={styles.progressBarRow}>
                                    <Text style={[styles.starLabel, { color: isDark ? '#8e8e93' : '#52525b' }]}>4 ★</Text>
                                    <View style={[styles.progressTrack, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]}>
                                        <View style={[styles.progressFill, { width: getStarPercentage(4) }]} />
                                    </View>
                                </View>
                                {/* 3 Star Progress Bar */}
                                <View style={styles.progressBarRow}>
                                    <Text style={[styles.starLabel, { color: isDark ? '#8e8e93' : '#52525b' }]}>3 ★</Text>
                                    <View style={[styles.progressTrack, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]}>
                                        <View style={[styles.progressFill, { width: getStarPercentage(3) }]} />
                                    </View>
                                </View>
                                {/* 2 Star Progress Bar */}
                                <View style={styles.progressBarRow}>
                                    <Text style={[styles.starLabel, { color: isDark ? '#8e8e93' : '#52525b' }]}>2 ★</Text>
                                    <View style={[styles.progressTrack, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]}>
                                        <View style={[styles.progressFill, { width: getStarPercentage(2) }]} />
                                    </View>
                                </View>
                                {/* 1 Star Progress Bar */}
                                <View style={styles.progressBarRow}>
                                    <Text style={[styles.starLabel, { color: isDark ? '#8e8e93' : '#52525b' }]}>1 ★</Text>
                                    <View style={[styles.progressTrack, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f7' }]}>
                                        <View style={[styles.progressFill, { width: getStarPercentage(1) }]} />
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Section Title */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={[styles.sectionTitle, { color: isDark ? '#ffffff' : '#000000', marginBottom: 0 }]}>Chowmate Verdicts</Text>
                            {reviews.length > 2 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '900', color: '#00D2C4', textTransform: 'uppercase', letterSpacing: 0.5 }}>Scroll for more</Text>
                                    <Ionicons name="arrow-down-circle-outline" size={12} color="#00D2C4" />
                                </View>
                            )}
                        </View>

                        {/* Reviews List */}
                        <FlatList
                            data={reviews}
                            keyExtractor={item => item.id}
                            ItemSeparatorComponent={() => <View style={[styles.divider, { backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea' }]} />}
                            renderItem={({ item }) => (
                                <View style={styles.reviewItem}>
                                    <Image source={{ uri: item.avatar }} style={styles.reviewAvatar} />
                                    <View style={styles.reviewBody}>
                                        <View style={styles.reviewerHeader}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={[styles.reviewerName, { color: isDark ? '#ffffff' : '#1c1c1e' }]}>@{item.username}</Text>
                                                {item.isPoster && (
                                                    <View style={styles.posterBadge}>
                                                        <Text style={styles.posterBadgeText}>OP</Text>
                                                    </View>
                                                )}
                                                {item.isCurrentUser && (
                                                    <View style={styles.youBadge}>
                                                        <Text style={styles.youBadgeText}>YOU</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View style={styles.reviewerRatingRow}>
                                                <Ionicons name="star" size={10} color={isDark ? '#ffffff' : '#000000'} />
                                                <Text style={[styles.reviewerRatingText, { color: isDark ? '#ffffff' : '#1c1c1e' }]}>{item.rating}.0</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.reviewComment, { color: isDark ? '#a1a1aa' : '#52525b' }]}>{item.comment || "Rated this dish."}</Text>
                                    </View>
                                </View>
                            )}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={true}
                            ListEmptyComponent={() => (
                                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                                    <Text style={{ color: isDark ? '#8e8e93' : '#a1a1aa', fontSize: 13 }}>No verdicts yet. Be the first to drop yours!</Text>
                                </View>
                            )}
                        />

                        {/* Action Area at the Bottom */}
                        {hasUserRated && (
                            <TouchableOpacity 
                                onPress={handleRemovePress}
                                style={[styles.removeButton, { borderTopColor: isDark ? '#2c2c2e' : '#e5e5ea' }]}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.removeButtonText}>Remove My Rating</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
        ...Platform.select({
            web: {
                alignItems: 'center',
            }
        })
    },
    backdropPressable: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    sheetContainer: {
        height: '82%',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 30 : 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
    },
    handlebar: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 15,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    sheetSubtitle: {
        fontSize: 12,
        lineHeight: 16,
        marginBottom: 16,
        textAlign: 'center',
    },
    starsSelectorContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 14,
        gap: 12,
    },
    starIconWrapper: {
        padding: 4,
    },
    commentInputContainer: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 20,
        position: 'relative',
    },
    commentInput: {
        fontSize: 14,
        lineHeight: 20,
        height: 60,
        textAlignVertical: 'top',
        padding: 0,
        ...Platform.select({
            web: {
                outlineStyle: 'none',
            }
        })
    },
    charCounter: {
        position: 'absolute',
        bottom: 8,
        right: 12,
        fontSize: 10,
        fontWeight: 'bold',
        color: '#8e8e93',
    },
    submitButton: {
        backgroundColor: '#00D2C4',
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
        shadowColor: '#00D2C4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 3,
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    distributionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    leftColumn: {
        alignItems: 'center',
        paddingRight: 20,
        borderRightWidth: 1,
        borderRightColor: '#e5e5ea',
        minWidth: 100,
    },
    rightColumn: {
        flex: 1,
        paddingLeft: 20,
    },
    ratingNumber: {
        fontSize: 48,
        fontWeight: '900',
        letterSpacing: -1,
        lineHeight: 52,
    },
    starsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
    },
    ratingCount: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#8e8e93',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    progressBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 3,
    },
    starLabel: {
        fontSize: 11,
        fontWeight: '900',
        width: 28,
        textAlign: 'right',
        marginRight: 8,
    },
    progressTrack: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#00D2C4',
        borderRadius: 3,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: -0.2,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    reviewItem: {
        flexDirection: 'row',
        paddingVertical: 14,
    },
    reviewAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#e5e5ea',
    },
    reviewBody: {
        flex: 1,
    },
    reviewerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    reviewerName: {
        fontSize: 13,
        fontWeight: '950',
    },
    posterBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        borderRadius: 4,
        backgroundColor: 'rgba(235, 160, 0, 0.15)',
    },
    posterBadgeText: {
        color: '#B45309',
        fontSize: 8,
        fontWeight: '950',
        letterSpacing: 0.5,
    },
    youBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        borderRadius: 4,
        backgroundColor: 'rgba(0, 210, 196, 0.15)',
    },
    youBadgeText: {
        color: '#00D2C4',
        fontSize: 8,
        fontWeight: '950',
        letterSpacing: 0.5,
    },
    reviewerRatingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f2f2f7',
        paddingHorizontal: 6,
        paddingVertical: 2.5,
        borderRadius: 6,
    },
    reviewerRatingText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#1c1c1e',
        marginLeft: 2,
    },
    reviewComment: {
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '400',
        letterSpacing: -0.1,
    },
    divider: {
        height: 1,
    },
    listContent: {
        paddingBottom: 20,
    },
    removeButton: {
        borderTopWidth: 1,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    removeButtonText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    toastContainer: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 6,
        zIndex: 9999,
        pointerEvents: 'none',
    },
    captionText: {
        fontSize: 15,
        lineHeight: 22,
        fontStyle: 'italic',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
});
