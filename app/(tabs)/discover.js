import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState, useEffect, useRef } from 'react';
import { FlatList, SafeAreaView, Text, View, ScrollView, TouchableOpacity, Image, ActivityIndicator, TextInput, Animated, Pressable, LayoutAnimation, Platform, UIManager, Easing } from 'react-native';
import ReviewCard from '../../components/ReviewCard';
import SearchBarHeader from '../../components/SearchBarHeader';
import { useAuth } from '../../context/AuthContext';
import { useReviews } from '../../context/ReviewsContext';
import { useColorScheme } from 'nativewind';
import { supabase } from '../../lib/supabase';

// Enable LayoutAnimation on Android for hardware-accelerated transitions
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function DiscoverScreen() {
    const router = useRouter();
    const { savedReviewIds, toggleSaveReview } = useReviews();
    const { user, profile: myProfile, activeDiscoverUser, setActiveDiscoverUser, showToast } = useAuth();

    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    // State
    const [activeLens, setActiveLens] = useState('all'); // 'all', 'me', 'saved', or 'buddy_UUID'
    const [buddiesList, setBuddiesList] = useState([]); // All friends
    const [topChowmates, setTopChowmates] = useState([]); // Dynamic sorted friends
    const [bumpedChowmates, setBumpedChowmates] = useState([]); // Selected from [More]
    const [profileStats, setProfileStats] = useState({ dishes: 0, restaurants: 0 });
    const [activeProfile, setActiveProfile] = useState(null); // Active buddy profile for header
    
    const [vaultPosts, setVaultPosts] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('dish'); // 'dish' or 'restaurant'
    const [ratingFilter, setRatingFilter] = useState(null); // null means "All"

    // [More] Bottom Sheet Custom Animation States
    const [showMoreSheet, setShowMoreSheet] = useState(false);
    const [buddySearchQuery, setBuddySearchQuery] = useState('');
    const sheetSlideAnim = useRef(new Animated.Value(600)).current;
    const sheetOpacityAnim = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef(null);
    const switcherScrollViewRef = useRef(null);

    // Scroll state helpers for premium collapsible header & scroll to top
    const [hasScrolledSwitcher, setHasScrolledSwitcher] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const lastScrollY = useRef(0);
    const [hasRecommendedPosts, setHasRecommendedPosts] = useState(false);
    const headerCollapseAnim = useRef(new Animated.Value(1)).current; // 1 = expanded, 0 = collapsed

    const [scrollX, setScrollX] = useState(0);
    const [contentWidth, setContentWidth] = useState(0);
    const [layoutWidth, setLayoutWidth] = useState(0);

    // Looping sequence for swipable switcher hint (pulsing & bouncing)
    const swipeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(swipeAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true
                }),
                Animated.timing(swipeAnim, {
                    toValue: 0,
                    duration: 1000,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true
                })
            ])
        ).start();
    }, []);

    const swipeTranslateX = swipeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-3, 3]
    });

    const swipeTranslateXLeft = swipeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [3, -3]
    });

    const swipeOpacity = swipeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.6, 1.0]
    });

    const handleScrollLeft = () => {
        const targetX = Math.max(0, scrollX - 180);
        switcherScrollViewRef.current?.scrollTo({ x: targetX, animated: true });
    };

    const handleScrollRight = () => {
        const targetX = Math.min(contentWidth - layoutWidth, scrollX + 180);
        switcherScrollViewRef.current?.scrollTo({ x: targetX, animated: true });
    };

    const handleSwipeArrowPress = () => {
        switcherScrollViewRef.current?.scrollTo({ x: 180, animated: true });
        setHasScrolledSwitcher(true);
    };

    // Smooth sliding height & translateY collapsing driven on JS thread
    useEffect(() => {
        Animated.timing(headerCollapseAnim, {
            toValue: isHeaderCollapsed ? 0 : 1,
            duration: 350,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: false
        }).start();
    }, [isHeaderCollapsed]);

    const checkRecommendedPosts = async () => {
        if (!user) return;
        try {
            const { count, error } = await supabase
                .from('reviews')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('visibility', 'recommended');
            if (!error && count !== null) {
                setHasRecommendedPosts(count > 0);
            }
        } catch (err) {
            console.error("Error checking recommended posts:", err);
        }
    };

    // Fetch buddy IDs helper
    const getBuddyIds = async () => {
        if (!user) return [];
        try {
            const { data, error } = await supabase
                .from('buddies')
                .select('requester_id, receiver_id')
                .eq('status', 'accepted')
                .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
            
            let ids = [];
            if (!error && data) {
                data.forEach(b => {
                    if (b.requester_id !== user.id) ids.push(b.requester_id);
                    if (b.receiver_id !== user.id) ids.push(b.receiver_id);
                });
            }
            return ids;
        } catch (err) {
            console.error("Failed to get buddy IDs:", err);
            return [];
        }
    };

    // Load static buddies list and dynamic top 4 recency list
    const initBuddiesAndLenses = async () => {
        if (!user) return;
        checkRecommendedPosts();
        try {
            const buddyIds = await getBuddyIds();
            if (buddyIds.length === 0) return;

            // Fetch complete buddies profiles
            const { data: profiles, error: pErr } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, full_name')
                .in('id', buddyIds);
            
            if (!pErr && profiles) {
                setBuddiesList(profiles);
            }

            // Fetch top active chowmates (sorted by latest 5-star review date)
            const { data: recencyData, error: rErr } = await supabase
                .from('reviews')
                .select('user_id, created_at')
                .eq('rating', 5)
                .in('user_id', buddyIds)
                .order('created_at', { ascending: false });

            if (!rErr && recencyData) {
                const uniqueUserIds = [];
                recencyData.forEach(item => {
                    if (!uniqueUserIds.includes(item.user_id)) {
                        uniqueUserIds.push(item.user_id);
                    }
                });

                // Top 4 Chowmates
                const topUserIds = uniqueUserIds.slice(0, 4);
                // Also add other buddies to complete top list if < 4
                buddyIds.forEach(id => {
                    if (topUserIds.length < 4 && !topUserIds.includes(id)) {
                        topUserIds.push(id);
                    }
                });

                const sortedProfiles = topUserIds
                    .map(id => profiles.find(p => p.id === id))
                    .filter(Boolean);

                setTopChowmates(sortedProfiles);
            }
        } catch (err) {
            console.error("Failed to initialize lenses:", err);
        }
    };

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

    // Load vault data based on active lens
    const loadVault = async (silent = false) => {
        if (!user) return;
        checkRecommendedPosts();
        if (!silent) setRefreshing(true);
        try {
            let query = supabase
                .from('reviews')
                .select('*, profiles:user_id(username, avatar_url, full_name)')
                .order('created_at', { ascending: false })
                .limit(21);

            if (activeLens === 'all') {
                const buddyIds = await getBuddyIds();
                buddyIds.push(user.id);
                query = query.in('user_id', buddyIds);
            } else if (activeLens === 'me') {
                query = query.eq('user_id', user.id);
            } else if (activeLens === 'saved') {
                const { data: savedData, error: savedErr } = await supabase
                    .from('saved_posts')
                    .select('post_id')
                    .eq('user_id', user.id);
                
                if (savedErr) throw savedErr;
                const savedIds = (savedData || []).map(d => d.post_id);
                if (savedIds.length === 0) {
                    setVaultPosts([]);
                    setHasMore(false);
                    setRefreshing(false);
                    return;
                }
                query = query.in('id', savedIds);
            } else if (activeLens === 'chowmate_recos') {
                const buddyIds = await getBuddyIds();
                if (buddyIds.length === 0) {
                    setVaultPosts([]);
                    setHasMore(false);
                    setRefreshing(false);
                    return;
                }
                query = query.in('user_id', buddyIds).eq('visibility', 'recommended');
            } else if (activeLens === 'recommended') {
                query = query.eq('user_id', user.id).eq('visibility', 'recommended');
            } else if (activeLens.startsWith('buddy_')) {
                const buddyId = activeLens.split('_')[1];
                query = query.eq('user_id', buddyId);
            }

            const { data, error } = await query;
            if (error) throw error;

            const formatted = formatReviews(data);
            setVaultPosts(formatted);
            setHasMore(data.length === 21);
        } catch (err) {
            console.error("Failed to load vault:", err);
        } finally {
            setRefreshing(false);
        }
    };

    // Load next page
    const loadMoreVault = async () => {
        if (loadingMore || !hasMore || vaultPosts.length === 0 || !user) return;
        setLoadingMore(true);
        try {
            const lastPost = vaultPosts[vaultPosts.length - 1];
            let query = supabase
                .from('reviews')
                .select('*, profiles:user_id(username, avatar_url, full_name)')
                .lt('created_at', lastPost.created_at)
                .order('created_at', { ascending: false })
                .limit(21);

            if (activeLens === 'all') {
                const buddyIds = await getBuddyIds();
                buddyIds.push(user.id);
                query = query.in('user_id', buddyIds);
            } else if (activeLens === 'me') {
                query = query.eq('user_id', user.id);
            } else if (activeLens === 'saved') {
                const { data: savedData } = await supabase
                    .from('saved_posts')
                    .select('post_id')
                    .eq('user_id', user.id);
                const savedIds = (savedData || []).map(d => d.post_id);
                query = query.in('id', savedIds);
            } else if (activeLens === 'chowmate_recos') {
                const buddyIds = await getBuddyIds();
                query = query.in('user_id', buddyIds).eq('visibility', 'recommended');
            } else if (activeLens === 'recommended') {
                query = query.eq('user_id', user.id).eq('visibility', 'recommended');
            } else if (activeLens.startsWith('buddy_')) {
                const buddyId = activeLens.split('_')[1];
                query = query.eq('user_id', buddyId);
            }

            const { data, error } = await query;
            if (error) throw error;

            const formatted = formatReviews(data);
            setVaultPosts(prev => [...prev, ...formatted]);
            setHasMore(data.length === 21);
        } catch (err) {
            console.error("Failed to load more vault:", err);
        } finally {
            setLoadingMore(false);
        }
    };

    // Keep dynamic buddies profile details sync'd for headers
    const loadHeaderProfileDetails = async () => {
        if (activeLens === 'me' || activeLens === 'recommended') {
            setActiveProfile(myProfile);
            loadProfileStats(user.id);
        } else if (activeLens.startsWith('buddy_')) {
            const buddyId = activeLens.split('_')[1];
            const profile = buddiesList.find(b => b.id === buddyId) || bumpedChowmates.find(b => b.id === buddyId);
            if (profile) {
                setActiveProfile(profile);
            } else {
                // Fetch profile
                const { data } = await supabase.from('profiles').select('*').eq('id', buddyId).single();
                if (data) setActiveProfile(data);
            }
            loadProfileStats(buddyId);
        } else {
            setActiveProfile(null);
        }
    };

    const loadProfileStats = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select('restaurant_name')
                .eq('user_id', userId);
            if (!error && data) {
                const uniqueRestaurants = new Set(data.map(d => d.restaurant_name.trim().toLowerCase())).size;
                setProfileStats({ dishes: data.length, restaurants: uniqueRestaurants });
            }
        } catch (err) {
            console.log("Failed to load stats:", err);
        }
    };

    // Trigger loader on lens mount
    useEffect(() => {
        initBuddiesAndLenses();
    }, [user?.id]);

    // Cinematic crossfade transition when active lens changes
    const contentOpacityAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // 1. Fade out FlatList content
        Animated.timing(contentOpacityAnim, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true
        }).start(() => {
            // 2. Load the new vault data
            loadVault(true).then(() => {
                // 3. Fade FlatList content back in
                Animated.timing(contentOpacityAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true
                }).start();
            });
            loadHeaderProfileDetails();
        });
    }, [activeLens, user?.id]);

    const handleSavePress = async (postId) => {
        try {
            await toggleSaveReview(postId);
            // Immediately filter out from local state when in Saved Vault
            if (activeLens === 'saved') {
                setVaultPosts(prev => prev.filter(p => p.id !== postId));
            }
        } catch (err) {
            console.error("Failed to toggle save:", err);
        }
    };

    // Handle deep routing from Home tab
    useEffect(() => {
        if (activeDiscoverUser) {
            const targetId = activeDiscoverUser;
            setActiveDiscoverUser(null); // Reset immediately

            // Refresh buddies list to guarantee newly accepted buddies are sync'd
            initBuddiesAndLenses();

            if (targetId === user?.id) {
                setActiveLens('me');
            } else {
                // Force load buddy profile into switcher to prevent rendering delay
                supabase.from('profiles').select('*').eq('id', targetId).single()
                    .then(({ data }) => {
                        if (data) {
                            setBumpedChowmates(prev => {
                                const exist = prev.some(p => p.id === targetId);
                                if (!exist) {
                                    return [data, ...prev];
                                }
                                return prev;
                            });
                        }
                    });
                setActiveLens(`buddy_${targetId}`);
            }
        }
    }, [activeDiscoverUser]);

    // Combined unique lenses in top switcher row
    const switcherLenses = useMemo(() => {
        const list = [
            { id: 'all', label: 'All', icon: 'globe-outline', iconType: 'ionicons' },
            { id: 'me', label: 'Me', icon: 'person-outline', iconType: 'ionicons' },
            { id: 'saved', label: 'Saved', icon: 'bookmark-outline', iconType: 'ionicons' },
            { id: 'chowmate_recos', label: 'Chowmate Recos', icon: 'star-outline', iconType: 'ionicons' },
            ...(hasRecommendedPosts ? [{ id: 'recommended', label: 'My Recos', icon: 'chef-hat', iconType: 'material' }] : []),
        ];

        // If a dynamic buddy is selected, append their lens to switcher dynamically
        if (activeLens.startsWith('buddy_')) {
            const buddyId = activeLens.split('_')[1];
            const buddyProfile = buddiesList.find(b => b.id === buddyId) || bumpedChowmates.find(b => b.id === buddyId);
            list.push({ 
                id: `buddy_${buddyId}`, 
                label: buddyProfile ? (buddyProfile.username || buddyProfile.full_name) : 'Loading...', 
                avatar: buddyProfile ? buddyProfile.avatar_url : null 
            });
        }

        return list;
    }, [activeLens, buddiesList, bumpedChowmates, hasRecommendedPosts]);

    // Local Search & Rating Filters
    const filteredReviews = useMemo(() => {
        let result = vaultPosts || [];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (searchType === 'dish') {
                result = result.filter(r => r.dish_name && r.dish_name.toLowerCase().includes(query));
            } else {
                result = result.filter(r => r.restaurant_name && r.restaurant_name.toLowerCase().includes(query));
            }
        }

        // Rating Filter
        if (ratingFilter !== null) {
            result = result.filter(r => r.rating && Math.round(r.rating) === ratingFilter);
        }

        return result;
    }, [vaultPosts, searchQuery, ratingFilter, searchType]);

    // Bottom Sheet animations helpers
    const openMoreSheet = () => {
        setShowMoreSheet(true);
        setBuddySearchQuery('');
        Animated.parallel([
            Animated.timing(sheetSlideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
            Animated.timing(sheetOpacityAnim, { toValue: 1, duration: 250, useNativeDriver: true })
        ]).start();
    };

    const closeMoreSheet = () => {
        Animated.parallel([
            Animated.timing(sheetSlideAnim, { toValue: 600, duration: 280, useNativeDriver: true }),
            Animated.timing(sheetOpacityAnim, { toValue: 0, duration: 220, useNativeDriver: true })
        ]).start(() => setShowMoreSheet(false));
    };

    const selectMoreBuddy = (buddy) => {
        // Add to bumped state to display in switcher row
        setBumpedChowmates(prev => {
            const exist = prev.some(p => p.id === buddy.id);
            if (exist) return prev;
            return [buddy, ...prev];
        });
        setActiveLens(`buddy_${buddy.id}`);
        closeMoreSheet();
    };

    // Filter buddies list in bottom sheet search
    const filteredBuddies = useMemo(() => {
        if (!buddySearchQuery) return buddiesList;
        const q = buddySearchQuery.toLowerCase();
        return buddiesList.filter(b => 
            (b.username && b.username.toLowerCase().includes(q)) || 
            (b.full_name && b.full_name.toLowerCase().includes(q))
        );
    }, [buddiesList, buddySearchQuery]);

    const handleGridItemPress = (item) => {
        const itemIndex = filteredReviews.findIndex(r => r.id === item.id);
        setViewMode('list');
        
        // Wait for FlatList to remount in list mode, then scroll to index
        setTimeout(() => {
            if (flatListRef.current) {
                try {
                    flatListRef.current.scrollToIndex({
                        index: itemIndex !== -1 ? itemIndex : 0,
                        animated: true,
                        viewPosition: 0
                    });
                } catch (err) {
                    console.log("Scroll to index failed initial attempt:", err);
                }
            }
        }, 120);
    };

    // Grid photo render
    const renderGridItem = (item) => {
        const photos = Array.isArray(item.photos) 
            ? item.photos 
            : (item.photo_url ? String(item.photo_url).split(',').map(u => u.trim()).filter(Boolean) : []);
        const photo = photos[0] || 'https://placehold.co/300x300/png?text=Food';

        return (
            <TouchableOpacity 
                onPress={() => handleGridItemPress(item)}
                style={{ flex: 1/3, aspectRatio: 1, padding: 1 }}
                activeOpacity={0.85}
            >
                <Image 
                    source={{ uri: photo }} 
                    style={{ width: '100%', height: '100%' }} 
                    resizeMode="cover"
                />
                {item.visibility === 'recommended' && (
                    <View 
                        className="bg-amber-400 p-0.5 rounded-full shadow-sm"
                        style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            zIndex: 10
                        }}
                    >
                        <Ionicons name="star" size={10} color="black" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const handleRestaurantPress = (restaurantId, restaurantName) => {
        router.push({
            pathname: '/restaurant/[id]',
            params: { id: restaurantId || 'mock', name: restaurantName }
        });
    };

    const handleProfilePress = (authorId) => {
        if (authorId === user?.id) {
            setActiveLens('me');
        } else {
            setActiveLens(`buddy_${authorId}`);
        }
    };

    const renderLensButton = (lens) => {
        if (!lens) return null;
        const isActive = activeLens === lens.id;
        return (
            <TouchableOpacity
                key={lens.id}
                onPress={() => setActiveLens(lens.id)}
                className={`flex-row items-center px-4 py-2 mr-2.5 rounded-full border ${isActive ? 'bg-zinc-900 border-zinc-900 dark:bg-zinc-100 dark:border-zinc-100' : 'bg-gray-50 border-gray-200 dark:bg-zinc-900 dark:border-zinc-800'}`}
                activeOpacity={0.8}
            >
                {lens.avatar ? (
                    <Image source={{ uri: lens.avatar }} className="w-4 h-4 rounded-full mr-1.5" />
                ) : lens.icon ? (
                    lens.iconType === 'ionicons' ? (
                        <Ionicons name={lens.icon} size={13} color={isActive ? (isDark ? '#000000' : '#FFFFFF') : '#9CA3AF'} style={{ marginRight: 6 }} />
                    ) : (
                        <MaterialCommunityIcons name={lens.icon} size={14} color={isActive ? (isDark ? '#000000' : '#FFFFFF') : '#9CA3AF'} style={{ marginRight: 6 }} />
                    )
                ) : null}
                <Text className={`text-xs font-black uppercase tracking-wider ${isActive ? 'text-white dark:text-zinc-950' : 'text-gray-600 dark:text-zinc-300'}`}>
                    {lens.label}
                </Text>
            </TouchableOpacity>
        );
    };

    const profileHeaderHeight = headerCollapseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 76]
    });

    const SEARCH_HEADER_HEIGHT = Platform.OS === 'web' ? 142 : 136;

    const searchHeaderHeight = headerCollapseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, SEARCH_HEADER_HEIGHT]
    });

    const profileHeaderTranslateY = headerCollapseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-76, 0]
    });

    const searchHeaderTranslateY = headerCollapseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-SEARCH_HEADER_HEIGHT, 0]
    });

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950">
            <View style={{ flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center' }}>
                
                {/* Custom Logo Header */}
                <View className="flex-row items-center justify-center bg-gray-100 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800" style={{ height: 60, width: '100%' }}>
                    <Image
                        key={isDark ? 'dark' : 'light'}
                        source={isDark ? require('../../assets/logo_profile_dark.png') : require('../../assets/logo_profile.png')}
                        style={{ width: 140, height: 40, alignSelf: 'center' }}
                        resizeMode="contain"
                    />
                </View>

                {/* Horizontal Context Switcher */}
                <View className="py-3 border-b border-gray-100 dark:border-zinc-900 bg-white dark:bg-zinc-950 relative">
                    <ScrollView 
                        ref={switcherScrollViewRef}
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 12, paddingRight: 40 }}
                        onScroll={(e) => {
                            const x = e.nativeEvent.contentOffset.x;
                            setScrollX(x);
                            if (x > 10) {
                                setHasScrolledSwitcher(true);
                            } else {
                                setHasScrolledSwitcher(false);
                            }
                        }}
                        onContentSizeChange={(w, h) => setContentWidth(w)}
                        onLayout={(e) => setLayoutWidth(e.nativeEvent.layout.width)}
                        scrollEventThrottle={16}
                    >
                        {/* 0.5. Active Selected Chowmate Lens (At the LEFT most, before ALL) */}
                        {switcherLenses.filter(l => l.id.startsWith('buddy_')).map(lens => renderLensButton(lens))}

                        {/* 1. All */}
                        {renderLensButton(switcherLenses.find(l => l.id === 'all'))}
                        
                        {/* 2. Me */}
                        {renderLensButton(switcherLenses.find(l => l.id === 'me'))}

                        {/* 3. Chowmates (Inline Button) */}
                        <TouchableOpacity
                            onPress={openMoreSheet}
                            className="flex-row items-center px-4 py-2 mr-2.5 rounded-full border bg-gray-50 border-gray-200 dark:bg-zinc-900 dark:border-zinc-800"
                            activeOpacity={0.8}
                        >
                            <Ionicons name="people-outline" size={13} color={isDark ? '#F4F4F5' : '#4B5563'} style={{ marginRight: 6 }} />
                            <Text className="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-zinc-300">
                                Chowmates
                            </Text>
                        </TouchableOpacity>

                        {/* 4. Saved */}
                        {renderLensButton(switcherLenses.find(l => l.id === 'saved'))}

                        {/* 4.5. Chowmate Recos */}
                        {renderLensButton(switcherLenses.find(l => l.id === 'chowmate_recos'))}

                        {/* 5. My Recos (if active/present) */}
                        {switcherLenses.find(l => l.id === 'recommended') && renderLensButton(switcherLenses.find(l => l.id === 'recommended'))}
                    </ScrollView>
                    {scrollX > 10 && (
                        <TouchableOpacity
                            onPress={handleScrollLeft}
                            activeOpacity={0.8}
                            style={{ 
                                position: 'absolute',
                                left: 12,
                                top: 11,
                                zIndex: 10,
                                elevation: 4
                            }}
                        >
                            <Animated.View 
                                className="shadow-lg rounded-full w-9 h-9 items-center justify-center border border-[#20B2AA] dark:border-[#20B2AA]"
                                style={{ 
                                    opacity: swipeOpacity,
                                    transform: [{ translateX: swipeTranslateXLeft }],
                                    backgroundColor: '#40E0D0'
                                }}
                            >
                                <Ionicons name="chevron-back" size={18} color="#0F172A" />
                            </Animated.View>
                        </TouchableOpacity>
                    )}
                    {contentWidth > layoutWidth && scrollX < contentWidth - layoutWidth - 10 && (
                        <TouchableOpacity
                            onPress={handleScrollRight}
                            activeOpacity={0.8}
                            style={{ 
                                position: 'absolute',
                                right: 12,
                                top: 11,
                                zIndex: 10,
                                elevation: 4
                            }}
                        >
                            <Animated.View 
                                className="shadow-lg rounded-full w-9 h-9 items-center justify-center border border-[#20B2AA] dark:border-[#20B2AA]"
                                style={{ 
                                    opacity: swipeOpacity,
                                    transform: [{ translateX: swipeTranslateX }],
                                    backgroundColor: '#40E0D0'
                                }}
                            >
                                <Ionicons name="chevron-forward" size={18} color="#0F172A" />
                            </Animated.View>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Collapsible Dynamic Profile Header */}
                {activeProfile && (activeLens === 'me' || activeLens === 'recommended' || activeLens.startsWith('buddy_')) && (
                    <Animated.View 
                        style={{ 
                            height: profileHeaderHeight, 
                            opacity: headerCollapseAnim, 
                            transform: [{ translateY: profileHeaderTranslateY }],
                            overflow: 'hidden' 
                        }}
                    >
                        <View className="flex-row items-center justify-center px-4 border-b border-gray-100 dark:border-zinc-900 bg-gray-50/95 dark:bg-zinc-900/95" style={{ height: 76 }}>
                            <Image
                                source={{ uri: activeProfile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80' }}
                                className="w-10 h-10 rounded-full border-2 border-primary shadow-sm"
                            />
                            <View className="mx-3.5 items-center justify-center">
                                <View className="flex-row items-center gap-1.5 justify-center">
                                    <Text className="text-sm font-extrabold text-neutral-800 dark:text-white leading-tight text-center" numberOfLines={1}>
                                        {activeProfile.full_name || `@${activeProfile.username}`}
                                    </Text>
                                    {/* Chowmate Indicator */}
                                    <View className="bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-950/50">
                                        <Text className="text-emerald-700 dark:text-emerald-400 text-[8px] font-black uppercase tracking-wider">
                                            {activeLens === 'me' ? 'You' : activeLens === 'recommended' ? 'My Recos' : 'Chowmates'}
                                        </Text>
                                    </View>
                                </View>
                                {activeProfile.username && activeProfile.full_name && (
                                    <Text className="text-gray-400 dark:text-zinc-500 text-[10px] font-bold text-center mt-0.5">
                                        @{activeProfile.username}
                                    </Text>
                                )}
                            </View>
                            
                            {/* Premium compact stats badge with icons */}
                            <View className="flex-row items-center gap-2.5 bg-white dark:bg-zinc-800/80 px-3.5 py-1.5 rounded-xl border border-gray-100 dark:border-zinc-800/80 shadow-sm">
                                <View className="flex-row items-center gap-1.5">
                                    <Ionicons name="fast-food-outline" size={20} color="#E11D48" />
                                    <Text 
                                        className="text-gray-900 dark:text-white font-black leading-tight"
                                        style={{ fontSize: 18, fontWeight: '900' }}
                                    >
                                        {profileStats.dishes}
                                    </Text>
                                </View>
                                <View className="w-[1px] h-5 bg-gray-200 dark:bg-zinc-700" />
                                <View className="flex-row items-center gap-1.5">
                                    <Ionicons name="location-outline" size={20} color="#14B8A6" />
                                    <Text 
                                        className="text-gray-900 dark:text-white font-black leading-tight"
                                        style={{ fontSize: 18, fontWeight: '900' }}
                                    >
                                        {profileStats.restaurants}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* High-Speed Search Filters Component */}
                <Animated.View 
                    style={{ 
                        height: searchHeaderHeight, 
                        opacity: headerCollapseAnim, 
                        transform: [{ translateY: searchHeaderTranslateY }],
                        overflow: 'hidden' 
                    }}
                >
                    <SearchBarHeader
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        ratingFilter={ratingFilter}
                        setRatingFilter={setRatingFilter}
                        searchType={searchType}
                        setSearchType={setSearchType}
                    />
                </Animated.View>

                {/* View Mode Toggle Segmented Row */}
                <View className="flex-row justify-between items-center px-4 py-2 border-b border-gray-100 dark:border-zinc-900 bg-gray-50 dark:bg-zinc-950">
                    {activeLens !== 'all' ? (
                        <Text className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                            {activeLens === 'saved' ? 'Saved Vault' : activeLens === 'me' ? 'My Vault' : activeLens === 'recommended' ? 'My Recos' : activeLens === 'chowmate_recos' ? 'Chowmate Recos' : 'Friend Vault'} ({filteredReviews.length})
                        </Text>
                    ) : (
                        <View />
                    )}
                    <View className="flex-row bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl">
                        <TouchableOpacity 
                            onPress={() => setViewMode('grid')}
                            className={`p-2.5 rounded-lg ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''}`}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="grid" size={18} color={viewMode === 'grid' ? (isDark ? 'white' : 'black') : (isDark ? '#A1A1AA' : '#6B7280')} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => setViewMode('list')}
                            className={`p-2.5 rounded-lg ${viewMode === 'list' ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''}`}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="list" size={18} color={viewMode === 'list' ? (isDark ? 'white' : 'black') : (isDark ? '#A1A1AA' : '#6B7280')} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Visual Vault Grid / List Feed */}
                <Animated.View style={{ flex: 1, opacity: contentOpacityAnim }}>
                    <FlatList
                        ref={flatListRef}
                        key={viewMode}
                        data={filteredReviews}
                        numColumns={viewMode === 'grid' ? 3 : 1}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => {
                            if (viewMode === 'grid') {
                                return renderGridItem(item);
                            }
                            return (
                                <ReviewCard
                                    review={item}
                                    onRestaurantPress={() => handleRestaurantPress(item.restaurant_id, item.restaurant_name)}
                                    onProfilePress={() => handleProfilePress(item.user_id)}
                                    isSaved={savedReviewIds.includes(item.id)}
                                    onSavePress={() => handleSavePress(item.id)}
                                />
                            );
                        }}
                    onEndReached={loadMoreVault}
                    onEndReachedThreshold={0.5}
                    onScroll={(e) => {
                        const yOffset = e.nativeEvent.contentOffset.y;
                        const contentHeight = e.nativeEvent.contentSize.height;
                        const layoutHeight = e.nativeEvent.layoutMeasurement.height;
                        const isScrollable = filteredReviews.length >= 3 && contentHeight > layoutHeight + 100;
                        
                        // Scroll to top button visibility threshold
                        if (yOffset > 300) {
                            setShowScrollTop(true);
                        } else {
                            setShowScrollTop(false);
                        }

                        // Collapsing header logic based on scroll direction with native stability
                        if (isScrollable && yOffset > 120 && yOffset > lastScrollY.current + 15) {
                            if (!isHeaderCollapsed) setIsHeaderCollapsed(true);
                        } else if (yOffset < lastScrollY.current - 25 || yOffset < 40) {
                            if (isHeaderCollapsed) setIsHeaderCollapsed(false);
                        }
                        lastScrollY.current = yOffset;
                    }}
                    scrollEventThrottle={16}
                    onScrollToIndexFailed={(info) => {
                        setTimeout(() => {
                            try {
                                flatListRef.current?.scrollToIndex({
                                    index: info.index,
                                    animated: true,
                                    viewPosition: 0
                                });
                            } catch (e) {
                                console.log("onScrollToIndexFailed scroll fallback failed:", e);
                            }
                        }, 80);
                    }}
                    ListFooterComponent={() => loadingMore ? (
                        <View className="py-6 items-center justify-center">
                            <ActivityIndicator size="small" color="#E11D48" />
                        </View>
                    ) : null}
                    ListEmptyComponent={() => (
                        <View className="flex-1 items-center justify-center py-20 px-8">
                            <View className="bg-gray-50 dark:bg-zinc-800 p-6 rounded-full mb-4">
                                <Ionicons name="search-outline" size={48} color={isDark ? '#71717A' : '#9CA3AF'} />
                            </View>
                            <Text className="text-lg font-extrabold text-gray-900 dark:text-white mb-2">No Hits Found</Text>
                            <Text className="text-gray-400 dark:text-zinc-500 text-center text-sm">
                                {searchQuery ? `We couldn't find any recommendations for "${searchQuery}" in this vault.` : "No dishes here yet. Time to start building your hitlist."}
                            </Text>
                        </View>
                    )}
                    contentContainerStyle={{ paddingBottom: 120 }}
                />
                </Animated.View>
            </View>

            {/* Scroll-to-Top Floating Arrow Button (Turquoise) */}
            {showScrollTop && viewMode === 'list' && (
                <TouchableOpacity
                    onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
                    className="bg-turquoise border border-teal-400 dark:border-teal-300"
                    style={{ 
                        position: 'absolute',
                        bottom: 96,
                        right: 20,
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        elevation: 6
                    }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="arrow-up" size={22} color="#0F172A" />
                </TouchableOpacity>
            )}

            {/* Custom Interactive Bottom Sheet Modal for [More] Chowmates */}
            {showMoreSheet && (
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
                    {/* Backdrop */}
                    <Pressable onPress={closeMoreSheet} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                        <Animated.View 
                            style={{ 
                                opacity: sheetOpacityAnim, 
                                width: '100%', 
                                height: '100%', 
                                backgroundColor: 'rgba(0, 0, 0, 0.6)' 
                            }} 
                        />
                    </Pressable>

                    {/* Animated Sheet Card */}
                    <Animated.View 
                        style={{ 
                            position: 'absolute',
                            bottom: 0,
                            transform: [{ translateY: sheetSlideAnim }],
                            height: '55%',
                            width: '100%',
                            maxWidth: 600,
                            alignSelf: 'center',
                            backgroundColor: isDark ? '#18181B' : '#FFFFFF',
                            borderTopLeftRadius: 28,
                            borderTopRightRadius: 28,
                            overflow: 'hidden',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 10,
                            elevation: 10
                        }}
                    >
                        {/* Grab bar */}
                        <View className="items-center py-3">
                            <View className="w-10 h-1 bg-gray-200 dark:bg-zinc-700 rounded-full" />
                        </View>

                        {/* Sticky Search bar header */}
                        <View className="px-5 pb-3 border-b border-gray-100 dark:border-zinc-800">
                            <Text className="text-base font-extrabold text-neutral-800 dark:text-white mb-2.5">
                                Select Chowmate Vault
                            </Text>
                            <View className="flex-row items-center bg-gray-100 dark:bg-zinc-800 px-3.5 py-2.5 rounded-xl">
                                <Ionicons name="search-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                                <TextInput
                                    value={buddySearchQuery}
                                    onChangeText={setBuddySearchQuery}
                                    placeholder="Search Chowmates..."
                                    placeholderTextColor="#9CA3AF"
                                    className="flex-1 text-sm text-neutral-800 dark:text-white"
                                    style={{ outlineStyle: 'none' }}
                                />
                                {buddySearchQuery ? (
                                    <TouchableOpacity onPress={() => setBuddySearchQuery('')}>
                                        <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>

                        {/* Friends list */}
                        <FlatList
                            data={filteredBuddies}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    onPress={() => selectMoreBuddy(item)}
                                    className="flex-row items-center px-5 py-3 border-b border-gray-50 dark:border-zinc-800"
                                    activeOpacity={0.7}
                                >
                                    <Image
                                        source={{ uri: item.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80' }}
                                        className="w-10 h-10 rounded-full mr-3.5 border border-gray-100 dark:border-zinc-800"
                                    />
                                    <View className="flex-1">
                                        <Text className="font-extrabold text-neutral-800 dark:text-white text-sm">
                                            {item.full_name || `@${item.username}`}
                                        </Text>
                                        <Text className="text-gray-400 dark:text-zinc-500 text-xs font-bold mt-0.5">
                                            @{item.username || 'guest'}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={() => (
                                <View className="items-center justify-center py-10 px-8">
                                    <Ionicons name="people-outline" size={32} color="#9CA3AF" style={{ marginBottom: 8 }} />
                                    <Text className="text-gray-400 dark:text-zinc-500 text-sm font-bold text-center">
                                        No Chowmates found
                                    </Text>
                                </View>
                            )}
                            contentContainerStyle={{ paddingBottom: 50 }}
                        />
                    </Animated.View>
                </View>
            )}
        </SafeAreaView>
    );
}
