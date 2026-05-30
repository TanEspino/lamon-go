import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Text, TouchableOpacity, View, ScrollView, Pressable, useWindowDimensions, StyleSheet, Modal, FlatList, Platform, TextInput, KeyboardAvoidingView, Animated } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useColorScheme } from 'nativewind';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useAlert, CustomAlert } from '../context/AlertContext';
import { LinearGradient } from 'expo-linear-gradient';

// Dictionary of currency symbols for common global currencies
const CURRENCY_SYMBOLS = {
    PHP: '₱',
    USD: '$',
    JPY: '¥',
    EUR: '€',
    GBP: '£',
    AUD: 'A$',
    CAD: 'C$',
    SGD: 'S$',
    HKD: 'HK$',
    CNY: '¥',
    KRW: '₩',
    INR: '₹',
    IDR: 'Rp',
    MYR: 'RM',
    THB: '฿',
    VND: '₫',
    AED: 'د.إ',
    BRL: 'R$',
    CHF: 'CHF',
    MXN: 'Mex$',
    NZD: 'NZ$',
    SAR: 'SR',
    TRY: '₺',
    TWD: 'NT$',
    ZAR: 'R'
};

const formatPriceDisplay = (priceVal, currencyCode) => {
    const numericPrice = parseFloat(priceVal);
    if (isNaN(numericPrice)) return '';
    const formattedPrice = numericPrice.toFixed(2);
    const code = (currencyCode || 'PHP').toUpperCase();
    const symbol = CURRENCY_SYMBOLS[code] || code;
    return `${symbol} ${formattedPrice}`;
};

// Module-level global flags to avoid spamming table existence checks across multiple card mounts
let globalDbChecked = false;
let globalDbAvailable = true;

export default function ReviewCard({ review, onPress, onDelete, onEdit, onRestaurantPress, onProfilePress, onSavePress, isSaved, feedType = 'discover' }) {
    const { width: windowWidth } = useWindowDimensions();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { user, profile } = useAuth();
    const { showAlert } = useAlert();

    // Responsive card width computation for immediate correct sizing
    const fallbackWidth = Math.min(windowWidth, 600);
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

    const containerStyle = isDark ? styles.containerDark : styles.containerLight;
    const textThemeStyle = isDark ? styles.textDark : styles.textLight;
    const subtextThemeStyle = isDark ? styles.subtextDark : styles.subtextLight;
    const ratingBadgeStyle = isRecommended 
        ? styles.ratingBadgeRecommended 
        : (isDark ? styles.ratingBadgeNormalDark : styles.ratingBadgeNormalLight);
    const ratingTextStyle = isRecommended 
        ? styles.ratingTextRecommended 
        : (isDark ? styles.ratingTextNormalDark : styles.ratingTextNormalLight);
    const priceTextStyle = isDark ? styles.priceTextDark : styles.priceTextLight;
    const bodyTextStyle = isDark ? styles.bodyTextDark : styles.bodyTextLight;
    const footerStyle = isDark ? styles.footerDark : styles.footerLight;
    const recommendedBadgeStyle = isDark ? styles.recommendedBadgeDark : styles.recommendedBadgeLight;
    const recommendedBadgeTextStyle = isDark ? styles.recommendedBadgeTextDark : styles.recommendedBadgeTextLight;

    return (
        <Pressable 
            onPress={onPress}
            style={[styles.container, containerStyle]}
        >
            {/* 1. Media Container with Overlaid Premium Header (Unified & Premium Overlay) */}
            <View style={styles.mediaContainer}>
                <View 
                    onLayout={handleLayout}
                    className="overflow-hidden bg-gray-100 dark:bg-zinc-800 relative w-full"
                    style={{ aspectRatio: 4/5, paddingHorizontal: 0, marginHorizontal: 0, paddingLeft: 0, paddingRight: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}
                >
                    {photos.length > 0 ? (
                        <View style={{ width: '100%', height: '100%', paddingHorizontal: 0, marginHorizontal: 0, position: 'relative' }}>
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
                                    <View key={index} style={{ width: cardWidth || '100%', height: '100%', paddingHorizontal: 0, marginHorizontal: 0, overflow: 'hidden' }}>
                                        <Image
                                            source={{ uri }}
                                            style={styles.mediaImage}
                                            resizeMode="cover"
                                        />
                                    </View>
                                ))}
                            </ScrollView>

                            {/* Left Chevron Button */}
                            {photos.length > 1 && activeIndex > 0 && (
                                <Pressable
                                    onPress={() => scrollToImage(activeIndex - 1)}
                                    className="absolute left-3 top-1/2 -mt-5 bg-zinc-950/40 rounded-full p-2 items-center justify-center"
                                    style={{ zIndex: 10 }}
                                >
                                    <Ionicons name="chevron-back" size={16} color="white" />
                                </Pressable>
                            )}

                            {/* Right Chevron Button */}
                            {photos.length > 1 && activeIndex < photos.length - 1 && (
                                <Pressable
                                    onPress={() => scrollToImage(activeIndex + 1)}
                                    className="absolute right-3 top-1/2 -mt-5 bg-zinc-950/40 rounded-full p-2 items-center justify-center"
                                    style={{ zIndex: 10 }}
                                >
                                    <Ionicons name="chevron-forward" size={16} color="white" />
                                </Pressable>
                            )}

                            {/* Dot Indicators */}
                            {photos.length > 1 && (
                                <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-1.5" style={{ zIndex: 10 }}>
                                    {photos.map((_, index) => (
                                        <Pressable
                                            key={index}
                                            onPress={() => scrollToImage(index)}
                                            className={`h-1.5 rounded-full ${index === activeIndex ? 'w-3 bg-white' : 'w-1.5 bg-white/50'}`}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>
                    ) : (
                        <Image
                            source={{ uri: 'https://placehold.co/600x800/png?text=Food' }}
                            style={styles.mediaImage}
                            resizeMode="cover"
                        />
                    )}

                    {/* Overlaid Premium Frameless Header directly on the Food Image */}
                    <View style={styles.headerOverlay}>
                        <LinearGradient
                            colors={['rgba(0, 0, 0, 0.7)', 'transparent']}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 100, // Must be tall enough to fade smoothly
                                borderTopLeftRadius: 24, // Matches the image container rounded top edges
                                borderTopRightRadius: 24,
                            }}
                        />
                        <TouchableOpacity 
                            onPress={onProfilePress}
                            disabled={!onProfilePress || feedType === 'profile'}
                            style={styles.headerLeft}
                            activeOpacity={0.7}
                        >
                            {feedType !== 'profile' && (
                                <Image 
                                    source={{ uri: avatarUrl }} 
                                    style={styles.overlayAvatar} 
                                />
                            )}
                            <View>
                                {feedType !== 'profile' && (
                                    <Text style={styles.overlayUsername}>@{review.username || 'Guest'}</Text>
                                )}
                                <View style={styles.overlayDateRow}>
                                    <Text style={styles.overlayDateText}>{dateString}</Text>
                                    <Text style={styles.overlayDateBullet}> • </Text>
                                    <Ionicons 
                                        name="people" 
                                        size={12} 
                                        color="#ffffff" 
                                    />
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* Right-aligned recommended badge */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {review.visibility === 'recommended' && (
                                <View style={[styles.recommendedBadge, recommendedBadgeStyle]}>
                                    <Text style={[styles.recommendedBadgeText, recommendedBadgeTextStyle]}>
                                        CHOWMATE RECO
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </View>

            {/* 2. Anchored details block next to continuous vertical teal bar */}
            <View style={styles.contentRow}>
                {/* Continuous Vertical Teal Bar */}
                <View style={styles.continuousTealBar} />

                {/* Right side text flow: Title, Rating, Location, Price */}
                <View style={styles.contentRight}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.dishTitle, textThemeStyle]}>
                            {review.dish_name}
                        </Text>
                        
                        {/* Premium dynamic rating pill badge */}
                        <View style={[styles.ratingBadge, ratingBadgeStyle]}>
                            <Ionicons 
                                name="star" 
                                size={12} 
                                color="#FFFFFF" // Solid white star in both modes
                                style={styles.ratingStarIcon} 
                            />
                            <Text style={[styles.ratingText, ratingTextStyle]}>
                                {review.rating !== undefined ? parseInt(review.rating) : 5}
                            </Text>
                        </View>
                    </View>

                    {/* Location / Price Row */}
                    <View style={styles.locationPriceRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                            <Ionicons 
                                name="location-outline" 
                                size={12} 
                                color={isDark ? '#A1A1AA' : '#71717a'} 
                                style={styles.locationIcon}
                            />
                            <Text style={[styles.locationText, subtextThemeStyle, { flexShrink: 1 }]}>
                                {review.restaurant_name}
                            </Text>
                        </View>
                        {!!review.price && (
                            <>
                                <Text style={[styles.bulletText, subtextThemeStyle, { marginHorizontal: 4 }]}> • </Text>
                                <Text style={[styles.priceText, priceTextStyle]}>
                                    {formatPriceDisplay(review.price, review.currency)}
                                </Text>
                            </>
                        )}
                    </View>
                </View>
            </View>

            {/* Body Text / Caption (Perfect layout outside of vertical teal bar) */}
            {!!review.notes && (
                <View style={styles.bodyContainer}>
                    <Text 
                        numberOfLines={isExpanded ? undefined : 2}
                        style={[styles.bodyText, bodyTextStyle]}
                    >
                        {review.notes}
                    </Text>
                    {review.notes && review.notes.length > 100 && (
                        <TouchableOpacity 
                            onPress={() => setIsExpanded(!isExpanded)}
                            style={styles.readMoreButton}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.readMoreText}>
                                {isExpanded ? 'SHOW LESS' : 'READ MORE'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* 3. Footer Interaction Row (Now perfectly aligned outside of the teal bar flow at the bottom) */}
            <View style={[styles.footer, footerStyle]}>
                <View style={styles.footerLeft}>
                    {/* Teal circle Rate Dish Button - Only visible on Home Feed & Not for own reviews */}
                    {feedType === 'home' && review.user_id !== user?.id && (
                        <TouchableOpacity 
                            onPress={openRateDishSheet}
                            style={[
                                styles.tealCircleBadge, 
                                hasUserRated 
                                    ? { backgroundColor: isDark ? '#061825' : '#E0F7F6' } 
                                    : { backgroundColor: isDark ? '#31394D' : '#f1f5f9' }
                            ]}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons 
                                name={hasUserRated ? "star-plus" : "star-plus-outline"} 
                                size={21} 
                                color={hasUserRated ? "#00D2C4" : (isDark ? "#FFFFFF" : "#71717a")} 
                            />
                        </TouchableOpacity>
                    )}

                    {/* Modern light turquoise Consensus verdicts list button */}
                    {hasConsensus && (
                        <TouchableOpacity 
                            onPress={openConsensusSheet}
                            style={styles.groupPillBadge} 
                            activeOpacity={0.8}
                        >
                            <Ionicons name="people" size={13} color="#00D2C4" style={{ marginRight: 3 }} />
                            <Text style={styles.groupPillText}>{averageRating}</Text>
                            <Ionicons name="chevron-forward" size={11} color="#00D2C4" style={{ marginLeft: 2 }} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Right-aligned footer actions: Bookmark and relocated Edit/Delete controls */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* bookmark interaction - solid red bookmark banner */}
                    {onSavePress && (
                        <TouchableOpacity 
                            onPress={onSavePress}
                            style={styles.saveButton}
                            activeOpacity={0.7}
                        >
                            <Ionicons 
                                name={isSaved ? "bookmark" : "bookmark-outline"} 
                                size={25} 
                                color={isSaved ? '#E11D48' : (isDark ? '#ffffff' : '#000000')} 
                            />
                        </TouchableOpacity>
                    )}

                    {/* Edit / Delete actions placed next to the bookmark icon with easy tapping layout */}
                    {(onEdit || onDelete) && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
                            {onEdit && (
                                <TouchableOpacity 
                                    onPress={onEdit} 
                                    style={{ 
                                        padding: 8, 
                                        borderRadius: 20, 
                                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                                        marginRight: 8
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="create-outline" size={18} color={isDark ? '#FFFFFF' : '#1C1C1E'} />
                                </TouchableOpacity>
                            )}
                            {onDelete && (
                                <TouchableOpacity 
                                    onPress={onDelete} 
                                    style={{ 
                                        padding: 8, 
                                        borderRadius: 20, 
                                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)'
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </View>

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
                feedType={feedType}
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
        </Pressable>
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
    const { showAlert } = useAlert();
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
            showAlert("Star Rating Required ⭐️", "Please select a star rating between 1 and 5 to rate this dish!");
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
                    <View style={[styles.sheetContainer, { backgroundColor: isDark ? '#0B1326' : '#ffffff', height: 'auto', maxHeight: 520, paddingBottom: Platform.OS === 'ios' ? 40 : 30, width: '100%' }]}>
                        {/* Handlebar */}
                        <View style={[styles.handlebar, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#e5e5ea' }]} />
                        
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
                        <View style={[styles.commentInputContainer, { borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#e5e5ea', backgroundColor: isDark ? '#09111E' : '#f9f9f9' }]}>
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
            <CustomAlert />
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
    onRemoveRating,
    feedType
}) {

    const { showAlert } = useAlert();
    const { height: windowHeight } = useWindowDimensions();
    const sheetMaxHeight = windowHeight * 0.85;

    const handleRemovePress = () => {
        showAlert(
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
                            backgroundColor: isDark ? '#0B1326' : '#ffffff', 
                            width: '100%',
                            height: sheetMaxHeight,
                            paddingBottom: Platform.OS === 'ios' ? 30 : 20,
                        }
                    ]}>
                        {/* Handlebar */}
                        <View style={[styles.handlebar, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#e5e5ea' }]} />
                        
                        {/* Header Row */}
                        <View style={styles.headerRow}>
                            <Text style={[styles.headerTitle, { color: isDark ? '#ffffff' : '#000000' }]}>Chowmate Verdict</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close-circle" size={24} color="#8e8e93" />
                            </TouchableOpacity>
                        </View>

                        {/* Reviews List with Header Component for Distribution & Title */}
                        <FlatList
                            style={{ flex: 1 }}
                            ListHeaderComponent={
                                <View>
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
                                                <View style={[styles.progressTrack, { backgroundColor: isDark ? '#09111E' : '#f2f2f7' }]}>
                                                    <View style={[styles.progressFill, { width: getStarPercentage(5) }]} />
                                                </View>
                                            </View>
                                            {/* 4 Star Progress Bar */}
                                            <View style={styles.progressBarRow}>
                                                <Text style={[styles.starLabel, { color: isDark ? '#8e8e93' : '#52525b' }]}>4 ★</Text>
                                                <View style={[styles.progressTrack, { backgroundColor: isDark ? '#09111E' : '#f2f2f7' }]}>
                                                    <View style={[styles.progressFill, { width: getStarPercentage(4) }]} />
                                                </View>
                                            </View>
                                            {/* 3 Star Progress Bar */}
                                            <View style={styles.progressBarRow}>
                                                <Text style={[styles.starLabel, { color: isDark ? '#8e8e93' : '#52525b' }]}>3 ★</Text>
                                                <View style={[styles.progressTrack, { backgroundColor: isDark ? '#09111E' : '#f2f2f7' }]}>
                                                    <View style={[styles.progressFill, { width: getStarPercentage(3) }]} />
                                                </View>
                                            </View>
                                            {/* 2 Star Progress Bar */}
                                            <View style={styles.progressBarRow}>
                                                <Text style={[styles.starLabel, { color: isDark ? '#8e8e93' : '#52525b' }]}>2 ★</Text>
                                                <View style={[styles.progressTrack, { backgroundColor: isDark ? '#09111E' : '#f2f2f7' }]}>
                                                    <View style={[styles.progressFill, { width: getStarPercentage(2) }]} />
                                                </View>
                                            </View>
                                            {/* 1 Star Progress Bar */}
                                            <View style={styles.progressBarRow}>
                                                <Text style={[styles.starLabel, { color: isDark ? '#8e8e93' : '#52525b' }]}>1 ★</Text>
                                                <View style={[styles.progressTrack, { backgroundColor: isDark ? '#09111E' : '#f2f2f7' }]}>
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
                                </View>
                            }
                            data={reviews}
                            keyExtractor={item => item.id}
                            ItemSeparatorComponent={() => <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#e5e5ea' }]} />}
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
                                            <View style={[styles.reviewerRatingRow, { backgroundColor: isDark ? '#151C2E' : '#f2f2f7' }]}>
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
                        {hasUserRated && feedType !== 'discover' && (
                            <TouchableOpacity 
                                onPress={handleRemovePress}
                                style={[styles.removeButton, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#e5e5ea' }]}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.removeButtonText}>Remove My Rating</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
            <CustomAlert />
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
        borderRadius: 24, // High fidelity rounded corners
        overflow: 'hidden',
        alignItems: 'stretch',
        elevation: 3,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        marginHorizontal: 16, // Beautiful screen space inset from phone borders
    },
    containerLight: {
        backgroundColor: '#FFFFFF',
    },
    containerDark: {
        backgroundColor: '#151C2E', // Slightly lighter navy for elegant separation without border outline
    },
    textLight: {
        color: '#111827',
    },
    textDark: {
        color: '#FFFFFF', // White text for night mode
    },
    subtextLight: {
        color: '#4B5563',
    },
    subtextDark: {
        color: '#A1A1AA', // Off-white/Light Grey secondary metadata
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    username: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'android' ? 'Inter-SemiBold' : 'Inter',
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '400',
        color: '#8E8E93',
        fontFamily: Platform.OS === 'android' ? 'Inter-Regular' : 'Inter',
    },
    headerPeopleIcon: {
        marginLeft: 6,
    },
    // Frameless Header Overlay styles directly over food photo
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 20, // Breathing room at the top
        paddingBottom: 16, // Cohesive bottom vertical padding
        borderTopLeftRadius: 24, // Blend perfectly with image container
        borderTopRightRadius: 24,
        zIndex: 20,
    },
    overlayAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        marginRight: 10,
        borderWidth: 1.5,
        borderColor: '#ffffff', // Clean white border on photo
    },
    overlayUsername: {
        fontSize: 14,
        fontWeight: 'bold', // Bold weight to pop out
        color: '#FFFFFF', // Pure white (#FFFFFF)
        fontFamily: Platform.OS === 'android' ? 'Inter-Bold' : 'Inter',
        lineHeight: 18, // Extra breathing room line-height
        textShadowColor: 'rgba(0, 0, 0, 0.8)', // Distinct text shadow for micro-contrast
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    overlayDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 3,
    },
    overlayDateText: {
        fontSize: 11, // Slightly smaller regular weight
        fontWeight: 'normal', // Regular weight / normal
        color: 'rgba(255, 255, 255, 0.85)', // Softer white
        fontFamily: Platform.OS === 'android' ? 'Inter-Regular' : 'Inter',
        textShadowColor: 'rgba(0, 0, 0, 0.8)', // Distinct text shadow for micro-contrast
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    overlayDateBullet: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.85)', // Softer white bullet
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    overlayActionButton: {
        padding: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Circular dark semi-transparent backdrop for actions
        borderRadius: 20,
    },
    recommendedBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: '#FFFFFF', // High-contrast White Background
    },
    recommendedBadgeLight: {},
    recommendedBadgeDark: {},
    recommendedBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        fontFamily: Platform.OS === 'android' ? 'Inter-Bold' : 'Inter',
        color: '#000000', // Pure Black text inside
    },
    recommendedBadgeTextLight: {
        color: '#000000',
    },
    recommendedBadgeTextDark: {
        color: '#000000',
    },
    mediaContainer: {
        width: '100%',
        aspectRatio: 4/5,
        paddingHorizontal: 0,
        marginHorizontal: 0,
        paddingLeft: 0,
        paddingRight: 0,
        borderTopLeftRadius: 24,  // Round top-left corner to match card
        borderTopRightRadius: 24, // Round top-right corner to match card
        overflow: 'hidden',
    },
    mediaImage: {
        width: '100%',
        height: '100%',
        alignSelf: 'stretch',
        borderTopLeftRadius: 24,  // Round top-left corner to match card
        borderTopRightRadius: 24, // Round top-right corner to match card
    },
    contentRow: {
        flexDirection: 'row',
        paddingHorizontal: 16, // Beautiful spacing inside card borders
        paddingTop: 16,
        paddingBottom: 4,
    },
    continuousTealBar: {
        width: 4,
        backgroundColor: '#00D2C4',
        borderRadius: 2.5,
        marginRight: 12,
        alignSelf: 'stretch',
    },
    contentRight: {
        flex: 1,
    },
    infoBlockContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    infoBlockTealBar: {
        width: 5,
        backgroundColor: '#00D2C4',
        borderRadius: 2.5,
        marginRight: 12,
        alignSelf: 'stretch',
    },
    infoBlockContent: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    dishTitle: {
        fontSize: 18,
        fontWeight: '600',
        fontFamily: Platform.OS === 'android' ? 'PlayfairDisplay-SemiBold' : 'Playfair Display',
        color: '#1C1C1E',
        flex: 1,
        paddingRight: 12,
        lineHeight: 22,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    ratingBadgeNormalLight: {
        backgroundColor: '#F2F2F7',
    },
    ratingBadgeNormalDark: {
        backgroundColor: '#31394D', // Surface Bright lighter navy
    },
    ratingBadgeRecommended: {
        backgroundColor: '#E11D48',
    },
    ratingStarIcon: {
        marginRight: 4,
    },
    ratingText: {
        fontSize: 15,
        fontWeight: '700',
        fontFamily: Platform.OS === 'android' ? 'Inter-Bold' : 'Inter',
    },
    ratingTextNormalLight: {
        color: '#1C1C1E',
    },
    ratingTextNormalDark: {
        color: '#FFFFFF', // High-contrast white text in night mode
    },
    ratingTextRecommended: {
        color: '#FFFFFF',
    },
    locationPriceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    locationIcon: {
        marginRight: 4,
    },
    locationText: {
        fontSize: 14,
        fontWeight: '500',
        fontFamily: Platform.OS === 'android' ? 'Inter-Medium' : 'Inter',
        color: '#666666',
    },
    bulletText: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    priceText: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: Platform.OS === 'android' ? 'Inter-SemiBold' : 'Inter',
        color: '#1C1C1E',
    },
    priceTextLight: {
        color: '#111827',
    },
    priceTextDark: {
        color: '#A1A1AA', // Off-white/light grey secondary price metadata
    },
    bodyContainer: {
        marginTop: 8,
        paddingLeft: 32,
        paddingRight: 16,
    },
    bodyText: {
        fontSize: 15,
        lineHeight: 24,
        fontWeight: '400',
        fontFamily: Platform.OS === 'android' ? 'Inter-Regular' : 'Inter',
        color: '#333333',
    },
    bodyTextLight: {
        color: '#374151',
    },
    bodyTextDark: {
        color: '#E5E5EA', // Editorial soft off-white text color
    },
    readMoreButton: {
        marginTop: 6,
        alignSelf: 'flex-start',
    },
    readMoreText: {
        fontSize: 13,
        color: '#00D2C4',
        fontWeight: '700',
        fontFamily: Platform.OS === 'android' ? 'Inter-SemiBold' : 'Inter',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingLeft: 32, // Align perfectly with the text above
        paddingRight: 16,
        paddingTop: 12,      // Beautiful spacing from description caption
        paddingBottom: 16,
    },
    footerLight: {
        // completely remove grey border for continuous whitespace flow
    },
    footerDark: {
        // completely remove grey border for continuous whitespace flow
    },
    footerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tealCircleBadge: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#00D2C4',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupPillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 210, 196, 0.12)', // Light turquoise background
        paddingHorizontal: 10,
        height: 30,
        borderRadius: 15,
        marginLeft: 8,
    },
    groupPillText: {
        color: '#00D2C4', // Turquoise text color
        fontWeight: '850',
        fontSize: 12.5,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    saveButton: {
        padding: 4,
    },
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
