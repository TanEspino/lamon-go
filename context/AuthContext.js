import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter, useSegments } from 'expo-router';
import { Platform, Alert, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '../utils/registerForPushNotificationsAsync';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [activeDiscoverUser, setActiveDiscoverUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);
    const [buddyCount, setBuddyCount] = useState(0);
    const [unseenAcceptanceCount, setUnseenAcceptanceCount] = useState(0);
    const [unseenRecommendationsCount, setUnseenRecommendationsCount] = useState(0);
    const [toast, setToast] = useState({ visible: false, title: '', message: '', type: 'success' });
    const router = useRouter();
    const segments = useSegments();
    const pendingCountRef = useRef(0);
    const buddyIdsRef = useRef([]);
    const isFirstLoadRef = useRef(true);
    const isWebSocketConnectedRef = useRef(false);
    const isAppActiveRef = useRef(true);

    const showToast = (title, message, type = 'success') => {
        setToast({ visible: true, title, message, type });
        // Auto hide after 4 seconds
        setTimeout(() => {
            setToast(prev => ({ ...prev, visible: false }));
        }, 4000);
    };

    const clearUnseenAcceptance = () => {
        setUnseenAcceptanceCount(0);
    };

    const clearUnseenRecommendations = async () => {
        setUnseenRecommendationsCount(0);
    };

    useEffect(() => {
        pendingCountRef.current = pendingCount;
    }, [pendingCount]);

    // Helper to trigger system-level push notifications in local drawer tray on Web (Mobile is fully server-driven now)
    const triggerPushNotification = async (title, body, screenPath) => {
        if (Platform.OS === 'web') {
            try {
                if ('Notification' in window) {
                    if (Notification.permission === 'granted') {
                        new Notification(title, { body });
                    } else if (Notification.permission !== 'denied') {
                        const permission = await Notification.requestPermission();
                        if (permission === 'granted') {
                            new Notification(title, { body });
                        }
                    }
                }
            } catch (err) {
                console.error("Web native notification failed:", err);
            }
            return;
        }
        
        // On iOS & Android, all foreground/background push notifications are now
        // reactive and driven 100% by our Deno Server-Side Push Engine. 
        // We return early here to prevent duplicate banner collisions on mobile devices!
        return;
    };

    // Request permissions immediately on mount/login to register in system settings (important for iOS/iPadOS)
    const requestNotificationsPermission = async () => {
        if (Platform.OS === 'web') {
            try {
                if ('Notification' in window) {
                    if (Notification.permission === 'granted') {
                        return;
                    }
                    if (Notification.permission !== 'denied') {
                        // Bind to a single click gesture anywhere on the window to bypass programmatic blocks!
                        const requestOnGesture = async () => {
                            try {
                                await Notification.requestPermission();
                            } catch (e) {
                                console.error("Gesture permission request failed:", e);
                            }
                            window.removeEventListener('click', requestOnGesture);
                        };
                        window.addEventListener('click', requestOnGesture);
                    }
                }
            } catch (err) {
                console.error("Error requesting browser notification permission:", err);
            }
            return;
        }
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync({
                    ios: {
                        allowAlert: true,
                        allowBadge: true,
                        allowSound: true,
                    },
                });
                finalStatus = status;
            }
            console.log("🔔 Notifications permission status:", finalStatus);

            // Register default notification channel for Android device tray
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F71',
                });
            }
        } catch (e) {
            console.error("Error requesting notifications permissions:", e);
        }
    };

    const registerPushNotifications = async (userId) => {
        try {
            const token = await registerForPushNotificationsAsync();
            if (token) {
                console.log(`Saving Expo Push Token for user ${userId}:`, token);
                const { error } = await supabase
                    .from('profiles')
                    .update({ expo_push_token: token })
                    .eq('id', userId);
                
                if (error) {
                    console.error('Error saving Expo Push Token to profiles:', error);
                } else {
                    console.log('Expo Push Token successfully saved to profile!');
                    updateProfileLocal({ expo_push_token: token });
                }
            }
        } catch (e) {
            console.error('Error registering for push notifications:', e);
        }
    };

    const handleRegisterPushNotifications = async (userId) => {
        if (Platform.OS === 'web') {
            await requestNotificationsPermission();
            return;
        }
        await registerPushNotifications(userId);
    };

    // Handle push notification responses (when user taps/clicks a notification banner)
    useEffect(() => {
        if (Platform.OS === 'web') return;

        // Check if the app was cold-started from a tapped notification
        Notifications.getLastNotificationResponseAsync().then(response => {
            if (response) {
                const data = response?.notification?.request?.content?.data;
                let screenPath = data?.url;
                console.log('🎯 App cold-started from push notification click:', data);
                if (screenPath && screenPath.startsWith('/single-post')) {
                    screenPath = '/notifications';
                }
                if (screenPath) {
                    setTimeout(() => {
                        try {
                            router.push(screenPath);
                        } catch (e) {
                            console.error('Failed to cold-start redirect:', e);
                        }
                    }, 800);
                }
            }
        });

        const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response?.notification?.request?.content?.data;
            let screenPath = data?.url;
            console.log('🎯 User clicked push notification banner with data:', data);
            
            // Override recommended dish notification tap redirection to target notifications list
            if (screenPath && screenPath.startsWith('/single-post')) {
                screenPath = '/notifications';
            }
            
            if (screenPath) {
                try {
                    router.push(screenPath);
                } catch (e) {
                    console.error('Failed to redirect from notification tap:', e);
                }
            }
        });

        return () => responseSub.remove();
    }, []);

    // Listen for Auth State Changes
    useEffect(() => {
        const fetchSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.warn("Session fetch error on startup, clearing:", error.message);
                    // Force complete clear of corrupted storage to resolve Expo Go refresh loops
                    await supabase.auth.signOut();
                    setSession(null);
                    setUser(null);
                } else {
                    setSession(session);
                    setUser(session ? session.user : null);
                    if (session) {
                        await fetchProfile(session.user.id);
                        handleRegisterPushNotifications(session.user.id);
                    }
                }
            } catch (err) {
                const isNetworkError = err?.message?.includes('Network request failed') || err?.toString()?.includes('Network request failed');
                if (isNetworkError) {
                    console.log("⚠️ Network request failed during session fetch, maintaining active session state.");
                } else {
                    console.log("⚠️ Session fetch crash, clearing auth storage:", err.message || err);
                    try {
                        await supabase.auth.signOut();
                    } catch (_) {}
                    setSession(null);
                    setUser(null);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            setUser(session ? session.user : null);
            if (session) {
                await fetchProfile(session.user.id);
                handleRegisterPushNotifications(session.user.id);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.log('⚠️ Network/Fetch error fetching profile:', error.message || error);
        } else {
            setProfile(data);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const updateProfileLocal = (updates) => {
        setProfile(prev => ({...prev, ...updates}));
    };

    const fetchBuddyStats = async (userId, force = false) => {
        const activeId = userId || user?.id;
        if (!activeId) return;
        
        // Freeze background fetches completely if app is in background/inactive (unless forced by WebSocket real-time event)
        if (!isAppActiveRef.current && !force) return;

        try {
            // 1. Fetch pending requests count
            const { count: pCount, error: pError } = await supabase
                .from('buddies')
                .select('*', { count: 'exact', head: true })
                .eq('receiver_id', activeId)
                .eq('status', 'pending');
            
            if (!pError && pCount !== null) {
                const prevCount = pendingCountRef.current;
                
                // Strict check: Only set state if the count is different!
                if (pCount !== prevCount) {
                    setPendingCount(pCount);
                }

                // If the count has increased and this is NOT the initial app load,
                // query the latest requester's details and trigger a local push notification banner!
                if (pCount > prevCount && !isFirstLoadRef.current) {
                    try {
                        const { data: latestReq, error: reqErr } = await supabase
                            .from('buddies')
                            .select('requester_id')
                            .eq('receiver_id', activeId)
                            .eq('status', 'pending')
                            .order('created_at', { ascending: false })
                            .limit(1);

                        if (!reqErr && latestReq && latestReq.length > 0) {
                            const { data: reqProf } = await supabase
                                .from('profiles')
                                .select('username')
                                .eq('id', latestReq[0].requester_id)
                                .single();

                            if (reqProf) {
                                const title = "🍕 New Chowmate Request!";
                                const msg = `@${reqProf.username} wants to connect with you in lamon.go!`;
                                triggerPushNotification(title, msg, '/notifications');
                                showToast(title, msg, 'success');
                            }
                        }
                    } catch (notificationError) {
                        console.error("Error triggering notification from stats fetch:", notificationError);
                    }
                }
            }

            // 2. Fetch accepted buddies count and check delta
            const { data: bData, error: bError } = await supabase
                .from('buddies')
                .select('id, requester_id, receiver_id')
                .eq('status', 'accepted')
                .or(`requester_id.eq.${activeId},receiver_id.eq.${activeId}`);
            
            if (!bError && bData) {
                const newIds = bData.map(item => item.id);
                const prevIds = buddyIdsRef.current || [];

                // If it is NOT the first load, check if there are any new IDs in newIds that weren't in prevIds
                if (!isFirstLoadRef.current) {
                    const newlyAdded = bData.filter(item => !prevIds.includes(item.id));
                    
                    for (const relation of newlyAdded) {
                        try {
                            const isRequester = relation.requester_id === activeId;
                            
                            // ONLY trigger notifications if WE are the requester (i.e., the other user accepted OUR request).
                            // If we are the receiver, we accepted the request ourselves, so no notification is needed.
                            if (isRequester) {
                                const buddyId = relation.receiver_id;
                                
                                // Fetch the buddy's profile username
                                const { data: buddyProfile } = await supabase
                                    .from('profiles')
                                    .select('username')
                                    .eq('id', buddyId)
                                    .single();
                                    
                                if (buddyProfile) {
                                    const title = "🎉 Chowmate Connected!";
                                    const msg = `@${buddyProfile.username} accepted your Chowmate request! Let's eat!`;
                                    triggerPushNotification(title, msg, '/profile');
                                    
                                    showToast(title, msg, 'success');
                                    setUnseenAcceptanceCount(prev => prev + 1);
                                }
                            }
                        } catch (err) {
                            console.error("Error showing new connection notification on poll delta:", err);
                        }
                    }
                }

                // Strict check: Only set state if the total buddy count has changed!
                const prevIdsCount = buddyIdsRef.current.length;
                if (bData.length !== prevIdsCount) {
                    setBuddyCount(bData.length);
                }
                buddyIdsRef.current = newIds;
            }

            // 3. Fetch recommended posts count from notifications table
            const { count: recCount, error: recErr } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', activeId)
                .eq('type', 'recommended')
                .eq('is_read', false);

            if (!recErr && recCount !== null) {
                setUnseenRecommendationsCount(recCount);
            }
            
            // Once a successful stats load is complete, toggle first load flag to false
            isFirstLoadRef.current = false;
        } catch (e) {
            // Log standby/offline network drops cleanly without developer Red Box interrupts
            console.log("⚠️ Offline/Standby in fetchBuddyStats:", e.message || e);
        }
    };

    // Global real-time listener for buddies with Active Tab and WebSocket Priority guards
    useEffect(() => {
        if (!user?.id) {
            setPendingCount(0);
            setBuddyCount(0);
            isFirstLoadRef.current = true;
            buddyIdsRef.current = [];
            isWebSocketConnectedRef.current = false;
            return;
        }

        // Reset first load tracking whenever the active logged-in user changes
        isFirstLoadRef.current = true;
        buddyIdsRef.current = [];
        isWebSocketConnectedRef.current = false;
        isAppActiveRef.current = true;

        // Fetch initial stats immediately on login
        fetchBuddyStats(user.id);

        const buddiesSubscription = supabase
            .channel('buddies-global-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'buddies' },
                async (payload) => {
                    console.log("🔔 Global real-time buddies update received:", payload);
                    
                    // Refresh stats badge count immediately, forcing it even if tab/app is currently in background
                    fetchBuddyStats(user.id, true);

                    // 1. If a new request is sent to us, show system push notification + in-app alert!
                    if (
                        payload.eventType === 'INSERT' && 
                        payload.new && 
                        payload.new.receiver_id === user.id &&
                        payload.new.status === 'pending'
                    ) {
                        try {
                            const requesterId = payload.new.requester_id;
                            const { data: requesterProfile } = await supabase
                                .from('profiles')
                                .select('username')
                                .eq('id', requesterId)
                                .single();

                            if (requesterProfile) {
                                const title = "🍕 New Chowmate Request!";
                                const msg = `@${requesterProfile.username} wants to connect with you in lamon.go!`;

                                // Trigger OS level system push notification
                                triggerPushNotification(title, msg, '/notifications');

                                showToast(title, msg, 'success');
                            }
                        } catch (e) {
                            console.error("Error showing in-app notification:", e);
                        }
                    }

                    // 2. If a request we sent is accepted, notify the requester (us)!
                    if (
                        payload.eventType === 'UPDATE' &&
                        payload.new &&
                        payload.new.status === 'accepted' &&
                        payload.new.requester_id === user.id
                    ) {
                        try {
                            const receiverId = payload.new.receiver_id;
                            const { data: receiverProfile } = await supabase
                                .from('profiles')
                                .select('username')
                                .eq('id', receiverId)
                                .single();

                            if (receiverProfile) {
                                const title = "🎉 Chowmate Connected!";
                                const msg = `@${receiverProfile.username} accepted your Chowmate request! Let's eat!`;

                                // Trigger OS level system push notification
                                triggerPushNotification(title, msg, '/profile');

                                showToast(title, msg, 'success');
                                setUnseenAcceptanceCount(prev => prev + 1);
                            }
                        } catch (e) {
                            console.error("Error showing connection acceptance notification:", e);
                        }
                    }
                }
            )
            .subscribe((status) => {
                const isConnected = (status === 'SUBSCRIBED');
                console.log(`🔌 Supabase buddies realtime WebSocket connection status: ${status}`);
                isWebSocketConnectedRef.current = isConnected;
            });

        const reviewsSubscription = supabase
            .channel('reviews-global-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'reviews' },
                async (payload) => {
                    console.log("🔔 Global real-time reviews update received:", payload);
                    
                    // If a recommended review is added, updated, or deleted, refetch stats
                    const isNewRec = payload.eventType === 'INSERT' && payload.new && payload.new.visibility === 'recommended';
                    const isUpdatedRec = payload.eventType === 'UPDATE' && payload.new && (payload.new.visibility === 'recommended' || (payload.old && payload.old.visibility === 'recommended'));
                    const isDeletedRec = payload.eventType === 'DELETE' && (payload.old && payload.old.visibility === 'recommended');
                    
                    if (isNewRec || isUpdatedRec || isDeletedRec) {
                        fetchBuddyStats(user.id, true);
                    }
                }
            )
            .subscribe();

        // Backup poll interval to fetch stats in the background (Mobile only failsafe)
        // Queries the database on a safe 60-second cycle as a solid fallback heartbeat,
        // in case the WebSocket is silent, firewalled, or Postgres Realtime is disabled on the backend.
        let backupPoll;
        if (Platform.OS !== 'web') {
            backupPoll = setInterval(() => {
                // Quota Guard: Completely freeze polling if App/Tab is in the background
                if (!isAppActiveRef.current) return;
                
                console.log("📡 Running backup HTTP stats poll.");
                fetchBuddyStats(user.id);
            }, 60000);
        }

        // Combined App/Tab Visibility Focus Listener
        const handleVisibilityChange = () => {
            if (Platform.OS === 'web' && typeof document !== 'undefined') {
                const isActive = (document.visibilityState === 'visible');
                console.log(`🖥️ Web tab visibility state changed: ${document.visibilityState} (Active: ${isActive})`);
                isAppActiveRef.current = isActive;
                if (isActive) {
                    // Instantly sync once on returning
                    fetchBuddyStats(user.id);
                }
            }
        };

        const handleAppStateChange = (nextAppState) => {
            const isActive = (nextAppState === 'active');
            console.log(`📱 Mobile app state changed: ${nextAppState} (Active: ${isActive})`);
            isAppActiveRef.current = isActive;
            if (isActive) {
                // Instantly sync once on returning
                fetchBuddyStats(user.id);
            }
        };

        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }
        const appStateSub = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            supabase.removeChannel(buddiesSubscription);
            supabase.removeChannel(reviewsSubscription);
            if (backupPoll) clearInterval(backupPoll);
            if (Platform.OS === 'web' && typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            }
            appStateSub.remove();
        };
    }, [user?.id]);

    // Protected Route Logic
    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inOnboarding = segments[0] === 'onboarding';
        const isPublicRoute = segments[0] === 'privacy-policy' || segments[0] === 'terms-of-service';

        if (!user && !inAuthGroup && !isPublicRoute) {
            // Not logged in -> go to sign in
            router.replace('/(auth)/sign-in');
        } else if (user && !isPublicRoute) {
            // Determine if the user is fresh without a username setup
            const isFreshUser = profile && !profile.username;
            
            if (isFreshUser && !inOnboarding) {
                router.replace('/onboarding');
            } else if (!isFreshUser && inAuthGroup) {
                // Logged in and setup complete -> go to tabs (from sign-in)
                router.replace('/(tabs)');
            }
        } 
    }, [user, loading, segments, profile]);

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, signOut, fetchProfile, updateProfileLocal, pendingCount, buddyCount, fetchBuddyStats, unseenAcceptanceCount, clearUnseenAcceptance, unseenRecommendationsCount, clearUnseenRecommendations, toast, setToast, showToast, activeDiscoverUser, setActiveDiscoverUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
