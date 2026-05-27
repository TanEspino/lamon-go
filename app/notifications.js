import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, Text, TouchableOpacity, View, Animated, FlatList, Image, Alert, Platform, AppState } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useReviews } from '../context/ReviewsContext'; // To trigger feed refresh if needed
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

export default function NotificationsScreen({ isTab = false }) {
    const router = useRouter();
    const { user, fetchBuddyStats, clearUnseenAcceptance, unseenRecommendationsCount, clearUnseenRecommendations, showToast, setActiveDiscoverUser } = useAuth();
    const { fetchReviews } = useReviews(); // Used to refetch reviews after accepting a buddy
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [requests, setRequests] = useState([]);
    const [recentConnections, setRecentConnections] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [clickedNotificationIds, setClickedNotificationIds] = useState([]);

    // Load clicked notification IDs from AsyncStorage on mount
    useEffect(() => {
        const loadClickedIds = async () => {
            try {
                const stored = await AsyncStorage.getItem('clicked_notification_ids');
                if (stored) {
                    setClickedNotificationIds(JSON.parse(stored));
                }
            } catch (e) {
                console.error("Error loading clicked notifications:", e);
            }
        };
        loadClickedIds();
    }, []);

    const markAsClicked = async (id) => {
        try {
            if (clickedNotificationIds.includes(id)) return;
            const updated = [...clickedNotificationIds, id];
            setClickedNotificationIds(updated);
            await AsyncStorage.setItem('clicked_notification_ids', JSON.stringify(updated));
        } catch (e) {
            console.error("Error saving clicked notification:", e);
        }
    };

    const handleProfilePress = (buddyId) => {
        if (!buddyId) return;
        if (buddyId === user?.id) {
            if (isTab) {
                router.push('/(tabs)/profile');
            } else {
                Animated.parallel([
                    Animated.timing(slideAnim, { toValue: 150, duration: 250, useNativeDriver: true }),
                    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true })
                ]).start(() => {
                    if (router.canGoBack()) router.back();
                    router.push('/(tabs)/profile');
                });
            }
        } else {
            if (setActiveDiscoverUser) {
                setActiveDiscoverUser(buddyId);
            }
            if (isTab) {
                router.push('/(tabs)/discover');
            } else {
                Animated.parallel([
                    Animated.timing(slideAnim, { toValue: 150, duration: 250, useNativeDriver: true }),
                    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true })
                ]).start(() => {
                    if (router.canGoBack()) router.back();
                    router.push('/(tabs)/discover');
                });
            }
        }
    };

    const requestsRef = useRef([]);
    const recentConnectionsRef = useRef([]);
    const recommendationsRef = useRef([]);

    useEffect(() => {
        requestsRef.current = requests;
    }, [requests]);

    useEffect(() => {
        recentConnectionsRef.current = recentConnections;
    }, [recentConnections]);

    useEffect(() => {
        recommendationsRef.current = recommendations;
    }, [recommendations]);

    // Animation values
    const slideAnim = useRef(new Animated.Value(isTab ? 0 : 150)).current;
    const fadeAnim = useRef(new Animated.Value(isTab ? 1 : 0)).current;

    useEffect(() => {
        if (!isTab) {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
            ]).start();
        }

        fetchNotifications();
        if (clearUnseenAcceptance) {
            clearUnseenAcceptance();
        }
        if (clearUnseenRecommendations) {
            clearUnseenRecommendations();
        }

        if (!user?.id) return;

        // Register Realtime listener for buddies updates to dynamically refresh the screen
        const buddiesSubscription = supabase
            .channel('notifications-screen-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'buddies' },
                async (payload) => {
                    console.log("🔔 Notifications screen real-time update:", payload);
                    // Pass true to execute background sync silently, and force = true to bypass visibility guards
                    fetchNotifications(true, true);
                }
            )
            .subscribe();

        // 15-second lazy backup polling loop (reduced frequency to conserve API quota, Mobile only)
        let pollInterval;
        if (Platform.OS !== 'web') {
            pollInterval = setInterval(() => {
                // Pass true to execute background sync silently (Blink-Free!)
                fetchNotifications(true);
            }, 15000);
        }

        // Combined App/Tab Visibility Focus Listener for Notifications Screen
        const handleVisibilityChange = () => {
            if (Platform.OS === 'web' && typeof document !== 'undefined') {
                const isActive = (document.visibilityState === 'visible');
                console.log(`🖥️ Notifications tab visibility state changed: ${document.visibilityState} (Active: ${isActive})`);
                if (isActive) {
                    fetchNotifications(true);
                }
            }
        };

        const handleAppStateChange = (nextAppState) => {
            const isActive = (nextAppState === 'active');
            console.log(`📱 Notifications app state changed: ${nextAppState} (Active: ${isActive})`);
            if (isActive) {
                fetchNotifications(true);
            }
        };

        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }
        const appStateSub = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            supabase.removeChannel(buddiesSubscription);
            if (pollInterval) clearInterval(pollInterval);
            if (Platform.OS === 'web' && typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            }
            appStateSub.remove();
        };
    }, [user?.id]);

    const fetchNotifications = async (isBackground = false, force = false) => {
        if (!user) return;
        
        // Quota Guard: Skip background network calls completely if screen is minimized (unless forced by real-time event)
        if (isBackground && !force && Platform.OS === 'web' && typeof document !== 'undefined' && document.visibilityState !== 'visible') {
            return;
        }

        // Only show full-screen loader on initial mount, not during background refreshes
        if (!isBackground) setLoading(true);

        try {
            // 1. Fetch pending incoming requests
            const { data: pendingData, error: pendingErr } = await supabase
                .from('buddies')
                .select('id, created_at, requester:profiles!requester_id(id, username, full_name, avatar_url)')
                .eq('receiver_id', user.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (pendingErr) throw pendingErr;

            // 2. Fetch recently accepted connections (active buddies)
            const { data: acceptedData, error: acceptedErr } = await supabase
                .from('buddies')
                .select(`
                    id, 
                    created_at, 
                    status,
                    requester_id,
                    receiver_id,
                    requester:profiles!requester_id(id, username, full_name, avatar_url),
                    receiver:profiles!receiver_id(id, username, full_name, avatar_url)
                `)
                .eq('status', 'accepted')
                .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .order('created_at', { ascending: false })
                .limit(10);

            if (acceptedErr) throw acceptedErr;

            // Transform accepted connections and extract buddyIds for recommendations
            const buddyIds = [];
            const processedAccepted = (acceptedData || []).map(item => {
                const isRequester = item.requester_id === user.id;
                const buddyProfile = isRequester ? item.receiver : item.requester;
                if (buddyProfile) {
                    buddyIds.push(buddyProfile.id);
                }
                return {
                    id: item.id,
                    created_at: item.created_at,
                    status: 'accepted',
                    profile: buddyProfile,
                    isOutgoingAcceptance: isRequester
                };
            }).filter(item => item.profile !== null);

            // 3. Fetch recent recommended posts from ALL accepted buddies
            let processedRecommendations = [];
            const { data: allBuddies, error: allBuddiesErr } = await supabase
                .from('buddies')
                .select('requester_id, receiver_id')
                .eq('status', 'accepted')
                .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

            if (!allBuddiesErr && allBuddies) {
                const allBuddyIds = [];
                allBuddies.forEach(b => {
                    if (b.requester_id !== user.id) allBuddyIds.push(b.requester_id);
                    if (b.receiver_id !== user.id) allBuddyIds.push(b.receiver_id);
                });

                if (allBuddyIds.length > 0) {
                    const { data: recData, error: recErr } = await supabase
                        .from('reviews')
                        .select('id, created_at, dish_name, user_id, profiles:user_id(id, username, full_name, avatar_url)')
                        .eq('visibility', 'recommended')
                        .in('user_id', allBuddyIds)
                        .order('created_at', { ascending: false })
                        .limit(15);

                    if (!recErr && recData) {
                        processedRecommendations = recData.map(item => ({
                            id: `rec_${item.id}`,
                            postId: item.id,
                            created_at: item.created_at,
                            status: 'recommended',
                            profile: item.profiles,
                            dish_name: item.dish_name
                        }));
                    }
                }
            }

            // Blink-Free Guard: Compare array contents strictly by row IDs and statuses
            const arraysAreEqual = (arr1, arr2) => {
                if (arr1.length !== arr2.length) return false;
                return arr1.every((val, index) => val.id === arr2[index].id && val.status === arr2[index].status);
            };

            // Only update states if lists are actually modified, preserving avatar image caches
            if (!arraysAreEqual(pendingData || [], requestsRef.current)) {
                setRequests(pendingData || []);
            }
            if (!arraysAreEqual(processedAccepted, recentConnectionsRef.current)) {
                setRecentConnections(processedAccepted);
            }
            if (!arraysAreEqual(processedRecommendations, recommendationsRef.current)) {
                setRecommendations(processedRecommendations);
            }
        } catch (error) {
            // Standard network failures are expected on mobile when coming back from sleep/idle.
            // Log as warning to prevent triggering annoying Red Screen developer LogBox notifications.
            console.log("⚠️ Standby/Network offline during notifications fetch:", error.message || error);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: 150, duration: 250, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true })
        ]).start(() => {
            if (router.canGoBack()) router.back();
            else router.replace('/');
        });
    };

    const handleAccept = async (requestId) => {
        try {
            const requestItem = requests.find(r => r.id === requestId);
            const buddyUsername = requestItem?.requester?.username || "Guest";

            const { error } = await supabase
                .from('buddies')
                .update({ status: 'accepted' })
                .eq('id', requestId);

            if (error) throw error;
            
            // Remove from list
            setRequests(prev => prev.filter(r => r.id !== requestId));
            
            // Refresh reviews feed to include new buddy's posts
            fetchReviews();
            
            // Refresh stats badge count immediately
            fetchBuddyStats();

            if (showToast) {
                showToast("🎉 Chowmate Connected!", `@${buddyUsername} is now your Chowmate! Let's eat! 🍕`, "success");
            }
        } catch (error) {
            console.error("Error accepting request:", error);
            if (showToast) {
                showToast("Error", "Could not accept request.", "error");
            } else {
                Alert.alert("Error", "Could not accept request.");
            }
        }
    };

    const handleReject = async (requestId) => {
        try {
            const requestItem = requests.find(r => r.id === requestId);
            const buddyUsername = requestItem?.requester?.username || "Guest";

            const { error } = await supabase
                .from('buddies')
                .delete()
                .eq('id', requestId);
                
            if (error) throw error;
            
            // Remove from list
            setRequests(prev => prev.filter(r => r.id !== requestId));
            
            // Refresh stats badge count immediately
            fetchBuddyStats();

            if (showToast) {
                showToast("Declined", `Declined buddy request from @${buddyUsername}.`, "success");
            }
        } catch (error) {
            console.error("Error rejecting request:", error);
            if (showToast) {
                showToast("Error", "Could not reject request.", "error");
            } else {
                Alert.alert("Error", "Could not reject request.");
            }
        }
    };

    const getCombinedData = () => {
        const data = [];
        if (requests.length > 0) {
            data.push({ id: 'pending-header', isHeader: true, title: 'Pending Requests' });
            data.push(...requests.map(r => ({ ...r, type: 'pending' })));
        }
        if (recommendations.length > 0) {
            data.push({ id: 'recommendations-header', isHeader: true, title: 'Chowmate Recommendations' });
            data.push(...recommendations.map(r => ({ ...r, type: 'recommended' })));
        }
        if (recentConnections.length > 0) {
            data.push({ id: 'recent-header', isHeader: true, title: 'Recent Activity' });
            data.push(...recentConnections.map(c => ({ ...c, type: 'accepted' })));
        }
        return data;
    };

    const renderItem = ({ item }) => {
        if (item.isHeader) {
            return (
                <View className="pt-6 pb-2 border-b border-gray-100 dark:border-zinc-900 mb-2">
                    <Text className="text-xs font-black uppercase tracking-wider text-rose-500">
                        {item.title}
                    </Text>
                </View>
            );
        }

        if (item.type === 'pending') {
            const profile = item.requester;
            if (!profile) return null;

            return (
                <View className="flex-row items-center justify-between py-3 border-b border-gray-50 dark:border-zinc-900/50">
                    <View className="flex-row items-center flex-1 pr-4">
                        <Image
                            source={{ uri: profile.avatar_url || 'https://placehold.co/100x100/png?text=User' }}
                            className="w-11 h-11 rounded-full mr-3 border border-gray-200 dark:border-zinc-700"
                        />
                        <View className="flex-shrink">
                            <Text className="font-bold text-gray-900 dark:text-white text-sm" numberOfLines={1}>
                                @{profile.username || 'Guest'}
                            </Text>
                            <Text className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                wants to be your Chowmate.
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row space-x-2">
                        <TouchableOpacity 
                            onPress={() => handleReject(item.id)}
                            className="bg-gray-100 dark:bg-zinc-800 p-1.5 rounded-full mr-1.5"
                        >
                            <Ionicons name="close" size={18} color={isDark ? '#D4D4D8' : '#52525B'} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => handleAccept(item.id)}
                            className="bg-primary p-1.5 rounded-full"
                        >
                            <Ionicons name="checkmark" size={18} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        if (item.type === 'recommended') {
            const profile = item.profile;
            if (!profile) return null;
            const isClicked = clickedNotificationIds.includes(item.id);

            return (
                <TouchableOpacity 
                    onPress={async () => {
                        // 1. Mark as clicked locally & persist in AsyncStorage
                        await markAsClicked(item.id);
                        
                        // 2. Clear app-level unseen recommendations count
                        if (clearUnseenRecommendations) {
                            await clearUnseenRecommendations();
                        }
                        
                        // 3. Clear OS-level push notifications from device tray
                        if (Platform.OS !== 'web') {
                            try {
                                await Notifications.dismissAllNotificationsAsync();
                            } catch (e) {
                                console.log("Failed to clear OS tray notifications:", e);
                            }
                        }
                        
                        // 4. Redirect to the single post view
                        router.push({
                            pathname: '/single-post',
                            params: { id: item.postId }
                        });
                    }}
                    className={`flex-row items-center justify-between py-3.5 border-b border-gray-50 dark:border-zinc-900/50 px-3.5 -mx-3.5 ${!isClicked ? 'bg-rose-500/[0.04] dark:bg-rose-500/[0.06] border-l-[4px] border-l-rose-500' : 'bg-transparent border-l-[4px] border-l-transparent'}`}
                    activeOpacity={0.75}
                >
                    <View className="flex-row items-center flex-1 pr-2">
                        <View className="relative">
                            <Image
                                source={{ uri: profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80' }}
                                className="w-11 h-11 rounded-full mr-3 border border-gray-200 dark:border-zinc-700"
                            />
                            <View className="absolute bottom-0 right-2 bg-amber-500 rounded-full p-0.5 border border-white dark:border-zinc-950">
                                <MaterialCommunityIcons name="chef-hat" size={10} color="white" />
                            </View>
                        </View>
                        <View className="flex-shrink flex-1">
                            <Text className={`font-bold text-sm ${!isClicked ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-zinc-400'}`} numberOfLines={1}>
                                @{profile.username || 'Guest'}
                            </Text>
                            <Text className={`text-xs mt-0.5 ${!isClicked ? 'text-gray-600 dark:text-zinc-300' : 'text-gray-400 dark:text-zinc-500'}`} numberOfLines={1}>
                                recommended: <Text className={`font-semibold ${!isClicked ? 'text-rose-500' : 'text-rose-500/70'}`}>{item.dish_name}</Text> 👨‍🍳
                            </Text>
                        </View>
                    </View>
                    <View className="flex-row items-center">
                        {!isClicked && (
                            <View className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-2.5 shadow-sm" />
                        )}
                        <Ionicons name="chevron-forward" size={16} color={!isClicked ? '#E11D48' : '#9CA3AF'} />
                    </View>
                </TouchableOpacity>
            );
        }

        if (item.type === 'accepted') {
            const profile = item.profile;
            if (!profile) return null;
            const isClicked = clickedNotificationIds.includes(item.id);

            return (
                <TouchableOpacity 
                    onPress={() => {
                        // Mark as clicked
                        markAsClicked(item.id);
                    }}
                    className={`flex-row items-center justify-between py-3.5 border-b border-gray-50 dark:border-zinc-900/50 px-3.5 -mx-3.5 ${!isClicked ? 'bg-teal-500/[0.04] dark:bg-teal-500/[0.06] border-l-[4px] border-l-teal-500' : 'bg-transparent border-l-[4px] border-l-transparent'}`}
                    activeOpacity={0.75}
                >
                    <View className="flex-row items-center flex-1 pr-2">
                        <View className="relative">
                            <Image
                                source={{ uri: profile.avatar_url || 'https://placehold.co/100x100/png?text=User' }}
                                className="w-11 h-11 rounded-full mr-3 border border-gray-200 dark:border-zinc-700"
                            />
                            <View className="absolute bottom-0 right-2 bg-emerald-500 rounded-full p-0.5 border border-white dark:border-zinc-950">
                                <Ionicons name="people" size={10} color="white" />
                            </View>
                        </View>
                        <View className="flex-shrink">
                            <Text className={`font-bold text-sm ${!isClicked ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-zinc-400'}`} numberOfLines={1}>
                                @{profile.username || 'Guest'}
                            </Text>
                            <Text className={`text-xs mt-0.5 ${!isClicked ? 'text-gray-600 dark:text-zinc-300' : 'text-gray-400 dark:text-zinc-500'}`}>
                                {item.isOutgoingAcceptance 
                                    ? "accepted your request! Let's eat! 🍕" 
                                    : "is now your Chowmate! Let's eat! 🍕"}
                            </Text>
                        </View>
                    </View>
                    <View className="flex-row items-center">
                        {!isClicked && (
                            <View className="w-2.5 h-2.5 rounded-full bg-teal-500 mr-2.5 shadow-sm" />
                        )}
                    </View>
                </TouchableOpacity>
            );
        }

        return null;
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950">
            <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                {/* Header */}
                <View 
                    className="flex-row items-center px-4 border-b border-gray-200 dark:border-zinc-800" 
                    style={{ 
                        height: 60,
                        backgroundColor: isDark ? '#09090b' : '#f3f4f6'
                    }}
                >
                    {!isTab && (
                        <TouchableOpacity onPress={handleClose} className="p-2 -ml-2 rounded-full active:bg-gray-200 dark:active:bg-zinc-800">
                            <Ionicons name="close" size={26} color={isDark ? '#F4F4F5' : '#18181B'} />
                        </TouchableOpacity>
                    )}
                    <Text className="text-lg font-bold text-gray-900 dark:text-zinc-50 ml-3">Notifications</Text>
                </View>

                {/* Content */}
                <FlatList
                    data={getCombinedData()}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }}
                    ListEmptyComponent={() => (
                        <View className="items-center justify-center py-20 px-8">
                            <Ionicons name="notifications-off-outline" size={48} color={isDark ? '#52525B' : '#A1A1AA'} style={{ marginBottom: 12 }} />
                            <Text className="text-base font-bold text-gray-500 dark:text-zinc-400 text-center">
                                No new notifications.
                            </Text>
                            <Text className="text-sm text-gray-400 dark:text-zinc-500 text-center mt-2">
                                When someone scans your QR code to add you, their request or recent connection will appear here.
                            </Text>
                        </View>
                    )}
                />
            </Animated.View>
        </SafeAreaView>
    );
}
