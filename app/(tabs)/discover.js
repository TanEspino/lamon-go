import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { FlatList, SafeAreaView, Text, View, ScrollView, TouchableOpacity, Image, ActivityIndicator, TextInput, Animated, Pressable, LayoutAnimation, Platform, UIManager, Easing } from 'react-native';
import ReviewCard from '../../components/ReviewCard';
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
    const { reviews, savedReviewIds, toggleSaveReview } = useReviews();
    const { user, profile: myProfile, activeDiscoverUser, setActiveDiscoverUser, showToast } = useAuth();

    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    // State
    const [activeLens, setActiveLens] = useState('all'); // 'all', 'me', 'saved', or 'buddy_UUID'
    const activeLensRef = useRef('all');
    useEffect(() => {
        activeLensRef.current = activeLens;
    }, [activeLens]);

    const isDeepRoutingRef = useRef(false);
    const [selectedChowmate, setSelectedChowmate] = useState(null);

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
    const [ratingFilter, setRatingFilter] = useState(null); // null means "All"
    const [showRecosOnly, setShowRecosOnly] = useState(false);
    const [showStarsDropdown, setShowStarsDropdown] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // Compute all unique dishes and restaurants for autocompletion suggestions
    const suggestionsList = useMemo(() => {
        if (!reviews) return [];
        const dishes = reviews.filter(r => r.dish_name).map(r => r.dish_name);
        const restaurants = reviews.filter(r => r.restaurant_name).map(r => r.restaurant_name);
        return Array.from(new Set([...dishes, ...restaurants]));
    }, [reviews]);

    const filteredSuggestions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return [];
        return suggestionsList
            .filter(item => item.toLowerCase().includes(query))
            .slice(0, 5);
    }, [searchQuery, suggestionsList]);

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
    const [hasRecommendedPosts, setHasRecommendedPosts] = useState(false);

    // High performance native velocity collapsable header
    const scrollY = useRef(new Animated.Value(0)).current;
    const headerTranslateY = useRef(new Animated.Value(0)).current;
    const lastScrollY = useRef(0);
    const isHeaderCollapsedRef = useRef(false);

    const hasProfileHeader = activeProfile && (activeLens === 'me' || activeLens.startsWith('buddy_'));
    const COLLAPSIBLE_HEIGHT = 64 + (hasProfileHeader ? 112 : 0) + 64 + 54 + 54;
    const listHeaderHeight = COLLAPSIBLE_HEIGHT;

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

    // High performance native collapsible scroll direction handler
    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        {
            useNativeDriver: true,
            listener: (event) => {
                const currentY = event.nativeEvent.contentOffset.y;
                const delta = currentY - lastScrollY.current;
                lastScrollY.current = currentY;

                // Threshold to trigger back-to-top button
                if (currentY > 300) {
                    setShowScrollTop(true);
                } else {
                    setShowScrollTop(false);
                }

                // Avoid collapsing when rubber banding at the top
                if (currentY <= 0) {
                    if (isHeaderCollapsedRef.current) {
                        isHeaderCollapsedRef.current = false;
                        Animated.spring(headerTranslateY, {
                            toValue: 0,
                            tension: 45,
                            friction: 8,
                            useNativeDriver: true
                        }).start();
                    }
                    return;
                }

                // Scroll down (Hide header)
                if (delta > 8 && currentY > 100) {
                    if (!isHeaderCollapsedRef.current) {
                        isHeaderCollapsedRef.current = true;
                        Animated.timing(headerTranslateY, {
                            toValue: -COLLAPSIBLE_HEIGHT,
                            duration: 220,
                            easing: Easing.out(Easing.ease),
                            useNativeDriver: true
                        }).start();
                    }
                }
                // Scroll up (Reveal header)
                else if (delta < -8) {
                    if (isHeaderCollapsedRef.current) {
                        isHeaderCollapsedRef.current = false;
                        Animated.timing(headerTranslateY, {
                            toValue: 0,
                            duration: 220,
                            easing: Easing.out(Easing.ease),
                            useNativeDriver: true
                        }).start();
                    }
                }
            }
        }
    );

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

    const formatReviews = (data, ratingsMap = {}) => {
        return (data || []).map(r => {
            const parsedPhotos = r.image_url ? r.image_url.split(',').map(u => u.trim()).filter(Boolean) : [];
            const userRating = ratingsMap[r.id];
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
                visibility: r.visibility || 'shared',
                consensus_average: r.consensus_average !== undefined && r.consensus_average !== null ? parseFloat(r.consensus_average) : 0.0,
                consensus_count: r.consensus_count !== undefined && r.consensus_count !== null ? parseInt(r.consensus_count) : 0,
                user_consensus_rating: userRating ? userRating.rating : null,
                user_consensus_comment: userRating ? userRating.comment : '',
            };
        });
    };

    // Load vault data based on active lens
    const loadVault = async (silent = false) => {
        if (!user) return;
        const currentLens = activeLens;
        checkRecommendedPosts();
        if (!silent) setRefreshing(true);
        try {
            let query = supabase
                .from('reviews')
                .select('*, profiles:user_id(username, avatar_url, full_name)')
                .order('created_at', { ascending: false })
                .limit(21);

            if (currentLens === 'all') {
                const buddyIds = await getBuddyIds();
                if (activeLensRef.current !== currentLens) return;
                buddyIds.push(user.id);
                query = query.in('user_id', buddyIds);
                if (showRecosOnly) {
                    query = query.eq('visibility', 'recommended');
                }
            } else if (currentLens === 'me') {
                query = query.eq('user_id', user.id);
                if (showRecosOnly) {
                    query = query.eq('visibility', 'recommended');
                }
            } else if (currentLens === 'saved') {
                const { data: savedData, error: savedErr } = await supabase
                    .from('saved_posts')
                    .select('post_id')
                    .eq('user_id', user.id);
                
                if (activeLensRef.current !== currentLens) return;
                if (savedErr) throw savedErr;
                const savedIds = (savedData || []).map(d => d.post_id);
                if (savedIds.length === 0) {
                    setVaultPosts([]);
                    setHasMore(false);
                    setRefreshing(false);
                    return;
                }
                query = query.in('id', savedIds);
            } else if (currentLens.startsWith('buddy_')) {
                const buddyId = currentLens.split('_')[1];
                query = query.eq('user_id', buddyId);
                if (showRecosOnly) {
                    query = query.eq('visibility', 'recommended');
                }
            }

            // Execute parallel fetch to completely resolve N+1 queries
            const [postsResult, ratingsResult] = await Promise.all([
                query,
                supabase
                    .from('consensus_ratings')
                    .select('post_id, rating, comment')
                    .eq('user_id', user.id)
            ]);

            if (activeLensRef.current !== currentLens) return;
            if (postsResult.error) throw postsResult.error;

            const ratingsMap = {};
            if (!ratingsResult.error && ratingsResult.data) {
                ratingsResult.data.forEach(r => {
                    ratingsMap[r.post_id] = { rating: r.rating, comment: r.comment || '' };
                });
            }

            const formatted = formatReviews(postsResult.data, ratingsMap);
            setVaultPosts(formatted);
            setHasMore(postsResult.data.length === 21);
        } catch (err) {
            console.error("Failed to load vault:", err);
        } finally {
            if (activeLensRef.current === currentLens) {
                setRefreshing(false);
            }
        }
    };

    // Load next page
    const loadMoreVault = async () => {
        if (loadingMore || !hasMore || vaultPosts.length === 0 || !user) return;
        const currentLens = activeLens;
        setLoadingMore(true);
        try {
            const lastPost = vaultPosts[vaultPosts.length - 1];
            let query = supabase
                .from('reviews')
                .select('*, profiles:user_id(username, avatar_url, full_name)')
                .lt('created_at', lastPost.created_at)
                .order('created_at', { ascending: false })
                .limit(21);

            if (currentLens === 'all') {
                const buddyIds = await getBuddyIds();
                if (activeLensRef.current !== currentLens) return;
                buddyIds.push(user.id);
                query = query.in('user_id', buddyIds);
                if (showRecosOnly) {
                    query = query.eq('visibility', 'recommended');
                }
            } else if (currentLens === 'me') {
                query = query.eq('user_id', user.id);
                if (showRecosOnly) {
                    query = query.eq('visibility', 'recommended');
                }
            } else if (currentLens === 'saved') {
                const { data: savedData } = await supabase
                    .from('saved_posts')
                    .select('post_id')
                    .eq('user_id', user.id);
                if (activeLensRef.current !== currentLens) return;
                const savedIds = (savedData || []).map(d => d.post_id);
                query = query.in('id', savedIds);
            } else if (currentLens.startsWith('buddy_')) {
                const buddyId = currentLens.split('_')[1];
                query = query.eq('user_id', buddyId);
                if (showRecosOnly) {
                    query = query.eq('visibility', 'recommended');
                }
            }

            // Execute parallel fetch to completely resolve N+1 queries
            const [postsResult, ratingsResult] = await Promise.all([
                query,
                supabase
                    .from('consensus_ratings')
                    .select('post_id, rating, comment')
                    .eq('user_id', user.id)
            ]);

            if (activeLensRef.current !== currentLens) return;
            if (postsResult.error) throw postsResult.error;

            const ratingsMap = {};
            if (!ratingsResult.error && ratingsResult.data) {
                ratingsResult.data.forEach(r => {
                    ratingsMap[r.post_id] = { rating: r.rating, comment: r.comment || '' };
                });
            }

            const formatted = formatReviews(postsResult.data, ratingsMap);
            setVaultPosts(prev => [...prev, ...formatted]);
            setHasMore(postsResult.data.length === 21);
        } catch (err) {
            console.error("Failed to load more vault:", err);
        } finally {
            if (activeLensRef.current === currentLens) {
                setLoadingMore(false);
            }
        }
    };

    // Keep dynamic buddies profile details sync'd for headers
    const loadHeaderProfileDetails = async () => {
        if (!user) return;
        if (activeLens === 'me' || activeLens === 'recommended') {
            setActiveProfile(myProfile);
            if (user?.id) {
                loadProfileStats(user.id);
            }
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

    // Navigate back to Me tab as default state
    useFocusEffect(
        useCallback(() => {
            if (!isDeepRoutingRef.current && !activeDiscoverUser) {
                setActiveLens('me');
                setSelectedChowmate(null); // Revert Chowmates button back to default
                setViewMode('grid'); // Reset to grid view by default
            }
        }, [activeDiscoverUser])
    );

    // Cinematic crossfade transition when active lens changes
    const contentOpacityAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Expand the header fully on tab switch
        isHeaderCollapsedRef.current = false;
        Animated.spring(headerTranslateY, {
            toValue: 0,
            tension: 40,
            friction: 8,
            useNativeDriver: true
        }).start();

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
    }, [activeLens, user?.id, showRecosOnly]);

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

    const handleSelectRating = (rating) => {
        setRatingFilter(rating);
        setShowStarsDropdown(false);
        if (rating !== null) {
            setShowRecosOnly(false);
        }
    };

    const handleToggleRecos = () => {
        const nextState = !showRecosOnly;
        setShowRecosOnly(nextState);
        if (nextState) {
            setRatingFilter(null);
        }
    };

    const getRatingButtonText = () => {
        if (ratingFilter === null) return 'All';
        if (ratingFilter === 5) return '5';
        if (ratingFilter === 4) return '4+';
        if (ratingFilter === 3) return '3+';
        if (ratingFilter === -2) return '2↓';
        return 'All';
    };

    // Handle deep routing from Home tab
    useEffect(() => {
        if (activeDiscoverUser) {
            isDeepRoutingRef.current = true;
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
                            setSelectedChowmate(data); // Set selected Chowmate to replace Chowmates button
                        }
                    });
                setActiveLens(`buddy_${targetId}`);
            }
            // Reset all search, star and recommendations filters
            setSearchQuery('');
            setRatingFilter(null);
            setShowRecosOnly(false);
            setTimeout(() => {
                isDeepRoutingRef.current = false;
            }, 100);
        }
    }, [activeDiscoverUser]);

    // Combined unique lenses in top switcher row
    const switcherLenses = useMemo(() => {
        const list = [
            { id: 'me', label: 'Me', icon: 'person-outline', iconType: 'ionicons' },
        ];

        // If a Chowmate is selected, it will replace the Chowmates button.
        if (selectedChowmate) {
            list.push({
                id: `buddy_${selectedChowmate.id}`,
                label: `@${selectedChowmate.username || selectedChowmate.full_name}`,
                avatar: selectedChowmate.avatar_url,
                icon: selectedChowmate.avatar_url ? null : 'person-outline',
                iconType: 'ionicons',
                isChowmateButton: true
            });
        } else {
            list.push({
                id: 'chowmates_trigger',
                label: 'Chowmates',
                icon: 'people-outline',
                iconType: 'ionicons',
                isChowmateButton: true
            });
        }

        // Add the rest (with removed emoji icons to keep it clean and minimalist)
        list.push(
            { id: 'all', label: 'All', icon: 'globe-outline', iconType: 'ionicons' },
            { id: 'saved', label: 'Saved', icon: 'bookmark-outline', iconType: 'ionicons' }
        );

        return list;
    }, [selectedChowmate]);

    // Local Search & Rating Filters
    const filteredReviews = useMemo(() => {
        // Special Case: When ALL is selected, show nothing until user searches or filters
        if (activeLens === 'all' && !searchQuery && ratingFilter === null && !showRecosOnly) {
            return [];
        }

        let result = vaultPosts || [];

        // Unified Search: Match either dish name or restaurant name
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(r => 
                (r.dish_name && r.dish_name.toLowerCase().includes(query)) ||
                (r.restaurant_name && r.restaurant_name.toLowerCase().includes(query))
            );
        }

        // Rating Filter: Support range rating (e.g. 5 Stars, 4+ Stars, 3+ Stars, 2 Stars & below)
        if (ratingFilter !== null) {
            if (ratingFilter === 5) {
                result = result.filter(r => r.rating && Math.round(r.rating) === 5);
            } else if (ratingFilter === -2) {
                result = result.filter(r => r.rating && r.rating <= 2);
            } else {
                result = result.filter(r => r.rating && r.rating >= ratingFilter);
            }
        }

        return result;
    }, [vaultPosts, searchQuery, ratingFilter, showRecosOnly, activeLens]);

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
        setSelectedChowmate(buddy); // Set selected Chowmate to replace Chowmates button
        setActiveLens(`buddy_${buddy.id}`);
        // Reset all search filters when a new buddy is selected
        setSearchQuery('');
        setRatingFilter(null);
        setShowRecosOnly(false);
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
                style={{ flex: 1/3, aspectRatio: 1, padding: 6 }}
                activeOpacity={0.85}
            >
                <Image 
                    source={{ uri: photo }} 
                    style={{ width: '100%', height: '100%', borderRadius: 12 }} 
                    resizeMode="cover"
                />
                {item.visibility === 'recommended' && (
                    <View 
                        style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            backgroundColor: '#00D2C4',
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.2,
                            shadowRadius: 1,
                            elevation: 3,
                            zIndex: 10,
                        }}
                    >
                        <Ionicons name="star" size={11} color="#0F172A" />
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

    const handleLensPress = (lensId) => {
        const lens = switcherLenses.find(l => l.id === lensId);
        if (lens && lens.isChowmateButton) {
            openMoreSheet();
        } else {
            setActiveLens(lensId);
            // Reset all search, rating and recos filters when a switcher button is clicked
            setSearchQuery('');
            setRatingFilter(null);
            setShowRecosOnly(false);
            
            // Revert Chowmates button if selecting Me, All, or Saved
            if (lensId === 'me' || lensId === 'all' || lensId === 'saved') {
                setSelectedChowmate(null);
            }
        }
    };

    const renderLensButton = (lens) => {
        if (!lens) return null;
        const isActive = activeLens === lens.id;

        // Custom style computation
        let btnBg = '';
        let btnBorder = '';
        let textColor = '';
        if (isActive) {
            btnBg = '#00D2C4';
            btnBorder = '#00D2C4';
            textColor = '#0F172A';
        } else {
            if (isDark) {
                btnBg = '#151C2E';
                btnBorder = 'rgba(255, 255, 255, 0.1)';
                textColor = '#A1A1AA';
            } else {
                btnBg = '#F3F4F6';
                btnBorder = '#E5E7EB';
                textColor = '#4B5563';
            }
        }

        return (
            <TouchableOpacity
                key={lens.id}
                onPress={() => handleLensPress(lens.id)}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    marginRight: 10,
                    borderRadius: 20,
                    borderWidth: 1,
                    backgroundColor: btnBg,
                    borderColor: btnBorder,
                }}
                activeOpacity={0.8}
            >
                {lens.avatar ? (
                    <Image source={{ uri: lens.avatar }} style={{ width: 16, height: 16, borderRadius: 8, marginRight: 6 }} />
                ) : lens.icon ? (
                    <Ionicons 
                        name={lens.icon} 
                        size={14} 
                        color={textColor} 
                        style={{ marginRight: 6 }} 
                    />
                ) : null}
                <Text style={{
                    fontSize: 12,
                    fontWeight: '900',
                    color: textColor,
                    letterSpacing: 0.5,
                }}>
                    {lens.label}
                </Text>
                {lens.isChowmateButton && (
                    <Ionicons 
                        name="chevron-down" 
                        size={10} 
                        color={textColor} 
                        style={{ marginLeft: 4 }}
                    />
                )}
            </TouchableOpacity>
        );
    };
    return (
        <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-zinc-950" style={{ backgroundColor: isDark ? '#0B1326' : '#F5F5F5' }}>
            {/* Custom Logo Header - Normal static flow identical to other tabs */}
            <View 
                className="" 
                style={{ 
                    height: 60, 
                    width: '100%',
                    backgroundColor: isDark ? '#0B1326' : '#f3f4f6',
                    flexDirection: 'row',
                    alignItems: 'center',
                    position: 'relative',
                    zIndex: 999, 
                    elevation: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB'
                }}
            >
                {/* Logo Wrapper */}
                <View style={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                    <Image
                        key={isDark ? 'dark' : 'light'}
                        source={isDark ? require('../../assets/logo_profile_dark.png') : require('../../assets/logo_profile.png')}
                        style={[
                            { width: 160, height: 45 },
                            isDark && Platform.OS === 'web' && { 
                                filter: 'invert(1) hue-rotate(180deg) brightness(1.2)' 
                            }
                        ]}
                        resizeMode="contain"
                    />
                </View>
                
                {/* Left Actions Wrapper - Empty placeholder for consistent centering */}
                <View style={{ position: 'absolute', left: 16, zIndex: 10 }} />

                {/* Right Actions Wrapper - Empty placeholder for consistent centering */}
                <View style={{ position: 'absolute', right: 16, zIndex: 10 }} />
            </View>

            {/* Main content parent starts exactly below the Logo Header */}
            <View style={{ flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center', position: 'relative', overflow: 'hidden' }}>
                
                {/* Collapsible Header Container */}
                <Animated.View
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 500,
                        transform: [{ translateY: headerTranslateY }],
                        backgroundColor: isDark ? '#0B1326' : '#F5F5F5',
                        borderBottomWidth: 0,
                    }}
                >
                    {/* Horizontal Context Switcher (Row 1) */}
                    <View style={{ height: 64, backgroundColor: isDark ? '#0B1326' : '#F5F5F5', borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#E5E7EB', position: 'relative', justifyContent: 'center' }}>
                        <ScrollView 
                            ref={switcherScrollViewRef}
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 12, paddingRight: 40, alignItems: 'center' }}
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
                            {/* Render Me, Selected Chowmate / Chowmates, All, Saved */}
                            {switcherLenses.map(lens => renderLensButton(lens))}
                        </ScrollView>
                        {scrollX > 10 && (
                            <TouchableOpacity
                                onPress={handleScrollLeft}
                                activeOpacity={0.8}
                                style={{ 
                                    position: 'absolute',
                                    left: 12,
                                    top: 14,
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
                                    top: 14,
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
                    {activeProfile && (activeLens === 'me' || activeLens.startsWith('buddy_')) && (
                        <View style={{ 
                            height: 112, 
                            paddingHorizontal: 16, 
                            paddingVertical: 8,
                            backgroundColor: isDark ? '#0B1326' : '#F5F5F5',
                            justifyContent: 'center',
                        }}>
                            <View style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: isDark ? '#151C2E' : '#FFFFFF',
                                borderRadius: 24,
                                paddingHorizontal: 16,
                                borderWidth: isDark ? 0 : 1,
                                borderColor: '#E5E7EB',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: isDark ? 0 : 0.05,
                                shadowRadius: 8,
                                elevation: 3,
                            }}>
                                <Image
                                    source={{ uri: activeProfile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80' }}
                                    style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: 32,
                                        borderWidth: 2,
                                        borderColor: '#00D2C4',
                                    }}
                                />
                                <View style={{ flex: 1, marginLeft: 16, justifyContent: 'center' }}>
                                    <Text style={{
                                        fontSize: 18,
                                        fontWeight: 'bold',
                                        color: isDark ? '#FFFFFF' : '#0B1326',
                                        marginBottom: 4,
                                    }} numberOfLines={1}>
                                        @{activeProfile.username || 'guest'}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        {/* Dishes Stat */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 18 }}>
                                            <Ionicons name="fast-food" size={16} color="#E11D48" />
                                            <Text style={{
                                                fontSize: 15,
                                                fontWeight: 'bold',
                                                color: isDark ? '#FFFFFF' : '#0B1326',
                                                marginLeft: 6,
                                            }}>
                                                {profileStats.dishes}
                                            </Text>
                                        </View>
                                        {/* Restaurants Stat */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons name="location" size={16} color="#00D2C4" />
                                            <Text style={{
                                                fontSize: 15,
                                                fontWeight: 'bold',
                                                color: isDark ? '#FFFFFF' : '#0B1326',
                                                marginLeft: 6,
                                            }}>
                                                {profileStats.restaurants}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Consolidated Action Row 1: Search Input */}
                    <View style={{
                        height: 64,
                        paddingHorizontal: 16,
                        justifyContent: 'center',
                        backgroundColor: isDark ? '#0B1326' : '#F5F5F5',
                        zIndex: 100,
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: isDark ? '#09111E' : '#E5E7EB',
                            borderRadius: 24,
                            paddingHorizontal: 16,
                            height: 48,
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#D1D5DB',
                            position: 'relative',
                        }}>
                            <Ionicons name="search" size={18} color={isSearchFocused ? "#00D2C4" : (isDark ? "#A1A1AA" : "#6B7280")} />
                            <TextInput
                                value={searchQuery}
                                onChangeText={(text) => {
                                    setSearchQuery(text);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => {
                                    setIsSearchFocused(true);
                                    setShowSuggestions(true);
                                }}
                                onBlur={() => {
                                    setIsSearchFocused(false);
                                    setTimeout(() => setShowSuggestions(false), 200);
                                }}
                                placeholder="Search dishes or restaurants..."
                                placeholderTextColor={isDark ? "#71717A" : "#9CA3AF"}
                                style={{
                                    flex: 1,
                                    marginLeft: 10,
                                    fontSize: 14,
                                    color: isDark ? '#FFFFFF' : '#0B1326',
                                    outlineStyle: 'none',
                                }}
                                autoCapitalize="none"
                                clearButtonMode="while-editing"
                            />

                            {/* Intellisense Autocomplete Suggestions */}
                            {showSuggestions && filteredSuggestions.length > 0 && (
                                <View 
                                    style={{ 
                                        position: 'absolute',
                                        left: 0,
                                        right: 0,
                                        top: 52,
                                        zIndex: 999, 
                                        elevation: 10,
                                        backgroundColor: isDark ? '#151C2E' : '#FFFFFF',
                                        borderWidth: 1,
                                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
                                        borderRadius: 16,
                                        overflow: 'hidden',
                                        shadowColor: '#000', 
                                        shadowOffset: { width: 0, height: 4 }, 
                                        shadowOpacity: 0.1, 
                                        shadowRadius: 10 
                                    }}
                                >
                                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 150 }}>
                                        {filteredSuggestions.map((item, index) => (
                                            <Pressable 
                                                key={index} 
                                                style={({ pressed }) => ({
                                                    paddingHorizontal: 16,
                                                    paddingVertical: 12,
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    borderBottomWidth: index < filteredSuggestions.length - 1 ? 1 : 0,
                                                    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6',
                                                    backgroundColor: pressed ? (isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6') : 'transparent',
                                                })}
                                                onPressIn={() => {
                                                    setSearchQuery(item);
                                                    setShowSuggestions(false);
                                                }}
                                                onPress={() => {
                                                    setSearchQuery(item);
                                                    setShowSuggestions(false);
                                                }}
                                            >
                                                <Ionicons name="search-outline" size={14} color={isDark ? "#A3A3A3" : "#6B7280"} style={{ marginRight: 8 }} />
                                                <Text style={{ fontSize: 13, color: isDark ? '#FFFFFF' : '#0B1326', fontWeight: '600' }} numberOfLines={1}>{item}</Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Consolidated Action Row 2: RECOS & FILTER Capsule Buttons */}
                    <View style={{
                        height: 54,
                        paddingHorizontal: 16,
                        flexDirection: 'row',
                        gap: 12,
                        backgroundColor: isDark ? '#0B1326' : '#F5F5F5',
                        alignItems: 'center',
                        zIndex: 90,
                    }}>
                        <TouchableOpacity
                            onPress={handleToggleRecos}
                            style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: 36,
                                borderRadius: 18,
                                borderWidth: 1.5,
                                borderColor: showRecosOnly ? '#00D2C4' : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#D1D5DB'),
                                backgroundColor: showRecosOnly ? 'rgba(0, 210, 196, 0.08)' : (isDark ? '#151C2E' : '#FFFFFF'),
                            }}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons 
                                name="chef-hat" 
                                size={14} 
                                color={showRecosOnly ? '#00D2C4' : (isDark ? '#A1A1AA' : '#6B7280')} 
                            />
                            <Text style={{
                                fontSize: 11,
                                fontWeight: '900',
                                color: showRecosOnly ? '#00D2C4' : (isDark ? '#A1A1AA' : '#6B7280'),
                                marginLeft: 6,
                                letterSpacing: 1,
                            }}>
                                RECOS
                            </Text>
                        </TouchableOpacity>

                        <View style={{ flex: 1, position: 'relative' }}>
                            {showStarsDropdown && (
                                <Pressable 
                                    style={{
                                        position: 'absolute',
                                        top: -300,
                                        bottom: -1000,
                                        left: -500,
                                        right: -500,
                                        zIndex: 40,
                                        backgroundColor: 'transparent'
                                    }}
                                    onPress={() => setShowStarsDropdown(false)}
                                />
                            )}
                            <TouchableOpacity
                                onPress={() => setShowStarsDropdown(!showStarsDropdown)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: 36,
                                    borderRadius: 18,
                                    borderWidth: 1.5,
                                    borderColor: ratingFilter !== null ? '#00D2C4' : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#D1D5DB'),
                                    backgroundColor: ratingFilter !== null ? 'rgba(0, 210, 196, 0.08)' : (isDark ? '#151C2E' : '#FFFFFF'),
                                    zIndex: 50,
                                }}
                                activeOpacity={0.8}
                            >
                                <Ionicons 
                                    name="star" 
                                    size={13} 
                                    color={ratingFilter !== null ? '#00D2C4' : (isDark ? '#A1A1AA' : '#6B7280')} 
                                />
                                <Text style={{
                                    fontSize: 11,
                                    fontWeight: '900',
                                    color: ratingFilter !== null ? '#00D2C4' : (isDark ? '#A1A1AA' : '#6B7280'),
                                    marginLeft: 5,
                                    marginRight: 3,
                                    letterSpacing: 1,
                                }}>
                                    {ratingFilter !== null ? getRatingButtonText() : 'FILTER'}
                                </Text>
                                <Ionicons 
                                    name="chevron-down" 
                                    size={9} 
                                    color={ratingFilter !== null ? '#00D2C4' : (isDark ? '#A1A1AA' : '#6B7280')} 
                                    style={{ marginLeft: 2 }}
                                />
                            </TouchableOpacity>

                            {/* Stars Dropdown Popover */}
                            {showStarsDropdown && (
                                <View 
                                    style={{ 
                                        position: 'absolute',
                                        right: 0,
                                        top: 40,
                                        width: 140,
                                        backgroundColor: isDark ? '#151C2E' : '#FFFFFF',
                                        borderWidth: 1,
                                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
                                        borderRadius: 16,
                                        overflow: 'hidden',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 12,
                                        zIndex: 100,
                                        elevation: 10,
                                    }}
                                >
                                    <TouchableOpacity
                                        onPress={() => handleSelectRating(null)}
                                        style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6', flexDirection: 'row', alignItems: 'center' }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={{ fontSize: 13, color: isDark ? '#FFFFFF' : '#0B1326', flex: 1 }}>All</Text>
                                        {ratingFilter === null && <Ionicons name="checkmark" size={14} color="#00D2C4" />}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleSelectRating(5)}
                                        style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6', flexDirection: 'row', alignItems: 'center' }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={{ fontSize: 13, color: isDark ? '#FFFFFF' : '#0B1326', flex: 1 }}>5 Stars</Text>
                                        {ratingFilter === 5 && <Ionicons name="checkmark" size={14} color="#00D2C4" />}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleSelectRating(4)}
                                        style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6', flexDirection: 'row', alignItems: 'center' }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={{ fontSize: 13, color: isDark ? '#FFFFFF' : '#0B1326', flex: 1 }}>4+ Stars</Text>
                                        {ratingFilter === 4 && <Ionicons name="checkmark" size={14} color="#00D2C4" />}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleSelectRating(3)}
                                        style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6', flexDirection: 'row', alignItems: 'center' }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={{ fontSize: 13, color: isDark ? '#FFFFFF' : '#0B1326', flex: 1 }}>3+ Stars</Text>
                                        {ratingFilter === 3 && <Ionicons name="checkmark" size={14} color="#00D2C4" />}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleSelectRating(-2)}
                                        style={{ paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={{ fontSize: 13, color: isDark ? '#FFFFFF' : '#0B1326', flex: 1 }}>2↓ Stars</Text>
                                        {ratingFilter === -2 && <Ionicons name="checkmark" size={14} color="#00D2C4" />}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* View Mode Toggle Segmented Row */}
                    <View style={{
                        height: 54,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        backgroundColor: isDark ? '#0B1326' : '#F5F5F5',
                        borderBottomWidth: 1,
                        borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
                    }}>
                        <Text style={{
                            fontSize: 18,
                            fontWeight: 'bold',
                            color: isDark ? '#FFFFFF' : '#0B1326',
                        }}>
                            {activeLens === 'saved' ? 'Saved Menu' : activeLens === 'me' ? 'My Menu' : activeLens === 'all' ? 'Full Menu' : 'Chowmate Menu'}{' '}
                            <Text style={{ color: isDark ? '#A1A1AA' : '#6B7280', fontWeight: '600', fontSize: 15 }}>
                                ({filteredReviews.filter(r => !r.isPlaceholder).length})
                            </Text>
                        </Text>

                        <View style={{
                            flexDirection: 'row',
                            backgroundColor: isDark ? '#151C2E' : '#E5E7EB',
                            padding: 3,
                            borderRadius: 20,
                            alignItems: 'center',
                        }}>
                            <TouchableOpacity 
                                onPress={() => setViewMode('grid')}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: viewMode === 'grid' ? '#00D2C4' : 'transparent',
                                }}
                                activeOpacity={0.8}
                            >
                                <Ionicons 
                                    name="grid" 
                                    size={16} 
                                    color={viewMode === 'grid' ? '#0F172A' : (isDark ? '#A1A1AA' : '#6B7280')} 
                                />
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => setViewMode('list')}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: viewMode === 'list' ? '#00D2C4' : 'transparent',
                                }}
                                activeOpacity={0.8}
                            >
                                <Ionicons 
                                    name="list" 
                                    size={16} 
                                    color={viewMode === 'list' ? '#0F172A' : (isDark ? '#A1A1AA' : '#6B7280')} 
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>

                {/* Visual Vault Grid / List Feed */}
                <Animated.View style={{ flex: 1, opacity: contentOpacityAnim }}>
                    <Animated.FlatList
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
                                    feedType="discover"
                                    onRestaurantPress={() => handleRestaurantPress(item.restaurant_id, item.restaurant_name)}
                                    onProfilePress={() => handleProfilePress(item.user_id)}
                                    isSaved={savedReviewIds.includes(item.id)}
                                    onSavePress={() => handleSavePress(item.id)}
                                />
                            );
                        }}
                    onEndReached={loadMoreVault}
                    onEndReachedThreshold={0.5}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    ListHeaderComponent={() => (
                        <View style={{ height: listHeaderHeight + 16 }} />
                    )}
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
                    ListEmptyComponent={() => {
                        if (activeLens === 'all' && !searchQuery && ratingFilter === null && !showRecosOnly) {
                            return (
                                <View className="flex-1 items-center justify-center py-20 px-8">
                                    <View className="bg-rose-50 dark:bg-rose-950/30 p-6 rounded-full mb-4">
                                        <Ionicons name="restaurant-outline" size={48} color="#E11D48" />
                                    </View>
                                    <Text className="text-xl font-black text-gray-900 dark:text-white mb-2 text-center">What are you craving?</Text>
                                    <Text className="text-gray-500 dark:text-zinc-400 text-center text-sm max-w-xs leading-relaxed">
                                        The whole community's food diary is at your fingertips. Search or filter to start exploring!
                                    </Text>
                                </View>
                            );
                        }
                        return (
                            <View className="flex-1 items-center justify-center py-20 px-8">
                                <View className="bg-gray-50 dark:bg-zinc-800 p-6 rounded-full mb-4">
                                    <Ionicons name="search-outline" size={48} color={isDark ? '#71717A' : '#9CA3AF'} />
                                </View>
                                <Text className="text-lg font-extrabold text-gray-900 dark:text-white mb-2">No Hits Found</Text>
                                <Text className="text-gray-400 dark:text-zinc-500 text-center text-sm">
                                    {searchQuery ? `We couldn't find any recommendations for "${searchQuery}" in this menu.` : "No dishes here yet. Time to start building your hitlist."}
                                </Text>
                            </View>
                        );
                    }}
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
                                Select Chowmate Menu
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
