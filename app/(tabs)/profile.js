import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Alert, Dimensions, FlatList, Image, SafeAreaView, Text, TouchableOpacity, View, Platform, useWindowDimensions, Modal, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useReviews } from '../../context/ReviewsContext';
import ReviewCard from '../../components/ReviewCard';
import { useColorScheme } from 'nativewind';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
    const router = useRouter();
    const { reviews, deleteReview } = useReviews();
    const { profile, user, signOut, pendingCount, buddyCount, fetchBuddyStats, unseenAcceptanceCount, unseenRecommendationsCount, setActiveDiscoverUser } = useAuth();

    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    // States for viewing/deleting Chowmates list modal
    const [showBuddiesModal, setShowBuddiesModal] = useState(false);
    const [buddiesList, setBuddiesList] = useState([]);
    const [buddiesTab, setBuddiesTab] = useState('active'); // 'active' or 'pending'
    const [loadingBuddies, setLoadingBuddies] = useState(false);
    const [confirmDeleteData, setConfirmDeleteData] = useState(null); // { buddyId, buddyUsername }

    const openBuddiesList = () => {
        setShowBuddiesModal(true);
        setBuddiesTab('active');
        fetchBuddies();
    };

    const fetchBuddies = async () => {
        if (!user?.id) return;
        setLoadingBuddies(true);
        try {
            const { data, error } = await supabase
                .from('buddies')
                .select(`
                    id,
                    requester_id,
                    receiver_id,
                    status,
                    requester:profiles!requester_id(id, username, full_name, avatar_url),
                    receiver:profiles!receiver_id(id, username, full_name, avatar_url)
                `)
                .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

            if (error) throw error;

            const projectedBuddies = (data || []).map(item => {
                const isRequester = item.requester_id === user.id;
                const buddyProfile = isRequester ? item.receiver : item.requester;
                return {
                    buddyId: item.id,
                    status: item.status,
                    isOutgoingPending: item.status === 'pending' && isRequester,
                    isIncomingPending: item.status === 'pending' && !isRequester,
                    profile: buddyProfile
                };
            }).filter(b => b.profile !== null);

            setBuddiesList(projectedBuddies);
        } catch (e) {
            console.error("Error fetching buddies list:", e);
        } finally {
            setLoadingBuddies(false);
        }
    };

    const executeDelete = async (buddyId) => {
        try {
            const { error } = await supabase
                .from('buddies')
                .delete()
                .eq('id', buddyId);

            if (error) throw error;

            // Update local projected list
            setBuddiesList(prev => prev.filter(b => b.buddyId !== buddyId));
            
            // Refresh global buddy stats
            fetchBuddyStats();
            
            // Refresh buddies list to be sure
            fetchBuddies();
        } catch (e) {
            console.error("Error deleting buddy:", e);
            Alert.alert("Error", "Could not remove Chowmate.");
        }
    };

    const executeAccept = async (buddyId) => {
        try {
            const { error } = await supabase
                .from('buddies')
                .update({ status: 'accepted' })
                .eq('id', buddyId);

            if (error) throw error;
            
            // Re-fetch buddies list
            fetchBuddies();
            
            // Refresh global buddy stats
            fetchBuddyStats();
        } catch (e) {
            console.error("Error accepting buddy request:", e);
            Alert.alert("Error", "Could not accept Chowmate request.");
        }
    };

    const handleDeleteBuddy = (buddyId, buddyUsername, isPending) => {
        setConfirmDeleteData({ buddyId, buddyUsername, isPending });
    };

    // Automatically refetch buddy stats whenever the profile page is focused/navigated to
    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                fetchBuddyStats();
            }
        }, [user?.id, fetchBuddyStats])
    );

    // Filter reviews for current user
    const myReviews = reviews.filter(r => r.user_id === user?.id);

    // Dashboard Analytics
    const totalReviews = myReviews.length;
    const fiveStarCount = myReviews.filter(r => r.rating === 5).length;
    const uniquePlaces = new Set(myReviews.filter(r => r.restaurant_name).map(r => r.restaurant_name)).size;

    // View Mode State
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [targetIndex, setTargetIndex] = useState(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const flatListRef = useRef(null);

    useEffect(() => {
        if (viewMode === 'list' && targetIndex !== null && flatListRef.current) {
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                    index: targetIndex,
                    animated: true,
                    viewPosition: 0,
                });
                setTargetIndex(null);
            }, 100);
        }
    }, [viewMode, targetIndex]);

    // Calculate grid item size (accounting for the left sidebar on all resolutions and root layout maxWidth of 600px)
    const { width: windowWidth } = useWindowDimensions();
    const isLargeScreen = windowWidth >= 600;
    const maxAppWidth = 600;

    // Use onLayout measured container width for perfect accuracy, falling back to initial estimate
    const [measuredWidth, setMeasuredWidth] = useState(() => {
        const initialEstimate = isLargeScreen ? maxAppWidth - 48 : windowWidth;
        return initialEstimate;
    });

    // Update measuredWidth when window dimensions change
    useEffect(() => {
        const initialEstimate = isLargeScreen ? maxAppWidth - 48 : windowWidth;
        setMeasuredWidth(initialEstimate);
    }, [windowWidth, isLargeScreen]);

    const handleLayout = (event) => {
        const { width: layoutWidth } = event.nativeEvent.layout;
        if (layoutWidth > 0 && Math.abs(layoutWidth - measuredWidth) > 1) {
            setMeasuredWidth(layoutWidth);
        }
    };

    // Calculate dynamic columns based on ACTUAL measured layout width:
    // - Narrow Mobile (< 360px): 2 columns (ultra-compact)
    // - Standard Mobile (360px - 480px): 3 columns
    // - Wide Screens / Tablets (> 480px): 4 columns
    const numColumns = measuredWidth > 480 ? 4 : (measuredWidth >= 360 ? 3 : 2);

    // Calculate item size with a safe margin to completely prevent subpixel rounding wraps
    const itemSize = measuredWidth / numColumns - 0.5;

    const getFlatListData = () => {
        if (myReviews.length === 0) return [];
        if (viewMode === 'grid') return [{ id: 'grid-wrap', isGrid: true }];
        return myReviews;
    };

    const handleDelete = (id) => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm("Are you sure you want to delete this post?");
            if (confirmed) {
                deleteReview(id);
            }
        } else {
            Alert.alert(
                "Delete Post",
                "Are you sure you want to delete this post?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => deleteReview(id) }
                ]
            );
        }
    };

    const renderListItem = ({ item }) => (
        <ReviewCard 
            review={item}
            onRestaurantPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: item.restaurant_id || 'mock', name: item.restaurant_name } })}
            onDelete={() => handleDelete(item.id)}
            onEdit={() => router.push({ pathname: '/modal', params: item })}
        />
    );

    const renderFlatListItem = ({ item }) => {
        if (item.isGrid) {
            return (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
                    {myReviews.map((review, idx) => (
                        <TouchableOpacity
                            key={review.id}
                            onPress={() => {
                                setTargetIndex(idx);
                                setViewMode('list');
                            }}
                            activeOpacity={0.8}
                            className="border-r border-b border-gray-200 dark:border-zinc-900 relative"
                            style={{ width: itemSize, height: itemSize }}
                        >
                            <Image
                                source={{ uri: (review.photos && review.photos[0]) || review.photo_url || 'https://placehold.co/200x200/png?text=Food' }}
                                className="w-full h-full bg-gray-200 dark:bg-zinc-800"
                                resizeMode="cover"
                            />
                            {review.photos && review.photos.length > 1 && (
                                <View 
                                    style={{
                                        position: 'absolute',
                                        top: 4,
                                        left: 4,
                                        zIndex: 10
                                    }}
                                >
                                    <Ionicons name="images" size={16} color="white" style={{ textShadowColor: 'black', textShadowRadius: 1 }} />
                                </View>
                            )}
                            {review.visibility === 'recommended' && (
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
                    ))}
                </View>
            );
        }
        return renderListItem({ item });
    };

    if (!profile) return null; // Or loading spinner

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950">
            <View 
                onLayout={handleLayout}
                style={{ flex: 1, width: '100%', maxWidth: maxAppWidth, alignSelf: 'center', position: 'relative' }}
            >
                {/* Custom Header Container (Static at the top!) */}
                <View className="bg-gray-100 dark:bg-zinc-950 items-center justify-center border-b border-gray-200 dark:border-zinc-800 relative" style={{ height: 60, width: '100%', zIndex: 10 }}>
                    {/* Left Side QR Button */}
                    <View style={{ position: 'absolute', left: 16, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity 
                            onPress={() => router.push('/qr-code')}
                            activeOpacity={0.7}
                            accessibilityLabel="Chowmate QR Code & Scanner"
                        >
                            <Ionicons name="qr-code-outline" size={25} color={isDark ? 'white' : 'black'} />
                        </TouchableOpacity>
                    </View>

                    {/* Centered Logo */}
                    <Image
                        key={isDark ? 'dark' : 'light'}
                        source={isDark ? require('../../assets/logo_profile_dark.png') : require('../../assets/logo_profile.png')}
                        style={{ width: 160, height: 45, alignSelf: 'center' }}
                        resizeMode="contain"
                    />

                    {/* Right Side Buttons (Notifications and Log Out) */}
                    <View style={{ position: 'absolute', right: 16, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity 
                            onPress={() => router.push('/notifications')}
                            style={{ marginRight: 14, position: 'relative' }}
                            activeOpacity={0.7}
                            accessibilityLabel="Notifications"
                        >
                            <Ionicons name="notifications-outline" size={26} color={isDark ? 'white' : 'black'} />
                            {(pendingCount + unseenAcceptanceCount + unseenRecommendationsCount) > 0 && (
                                <View className="absolute -top-1 -right-1 bg-rose-500 rounded-full w-4 h-4 items-center justify-center">
                                    <Text className="text-white text-[8px] font-black text-center" style={{ lineHeight: 11 }}>{pendingCount + unseenAcceptanceCount + unseenRecommendationsCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={signOut}
                            activeOpacity={0.7}
                            accessibilityLabel="Log Out"
                        >
                            <Ionicons name="log-out-outline" size={26} color={isDark ? 'white' : 'black'} />
                        </TouchableOpacity>
                    </View>
                </View>

                <FlatList
                ref={flatListRef}
                key={viewMode}
                ListHeaderComponent={() => (
                    <View className="bg-gray-50 dark:bg-zinc-950 pb-4">
                        {/* Top Section: Dashboard Header Details */}
                        <View className="bg-gray-50 dark:bg-zinc-950 pb-4 pt-4 px-5 border-b border-gray-200 dark:border-zinc-800">
                            {/* Centered Identity Row (Avatar + Bio) */}
                            <View className="flex-row items-center justify-center mb-4 mt-2 px-4">
                                {/* Avatar */}
                                <View className="mr-5">
                                    <View className="p-1 rounded-full border-[2px] border-turquoise">
                                        <Image
                                            source={{ uri: profile.avatar_url || 'https://placehold.co/100x100/png?text=User' }}
                                            className="w-20 h-20 rounded-full bg-gray-100 dark:bg-zinc-800"
                                        />
                                    </View>
                                </View>

                                {/* Username & Bio */}
                                <View className="flex-col justify-center flex-shrink items-start" style={{ maxWidth: 200 }}>
                                    <View className="flex-row items-center mb-1">
                                        <Text className="font-extrabold text-xl text-gray-900 dark:text-white tracking-tight" numberOfLines={1}>
                                            @{profile.username}
                                        </Text>
                                    </View>
                                    {profile.bio ? (
                                        <View className="bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 shadow-sm">
                                            <Text className="text-gray-600 dark:text-zinc-300 text-xs font-medium leading-tight italic" numberOfLines={3}>
                                                {profile.bio}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                            </View>
  
                            {/* Stats Row */}
                            <View className="flex-row justify-between items-center mb-4 px-2">
                                {/* Reviews Widget */}
                                <View className="bg-white dark:bg-zinc-900 py-2 px-1 rounded-xl flex-1 mr-1.5 items-center justify-center border border-gray-200 dark:border-zinc-800 shadow-sm">
                                    <Ionicons name="document-text-outline" size={16} color={isDark ? '#A3A3A3' : '#4B5563'} style={{ marginBottom: 2 }} />
                                    <Text className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{totalReviews}</Text>
                                    <Text className="text-gray-500 dark:text-zinc-400 text-[9px] font-bold uppercase tracking-wider">Reviews</Text>
                                </View>
                                
                                {/* 5 Stars Widget */}
                                <View className="bg-white dark:bg-zinc-900 py-2 px-1 rounded-xl flex-1 mx-1 items-center justify-center border border-gray-200 dark:border-zinc-800 shadow-sm">
                                    <Ionicons name="star" size={16} color="#14B8A6" style={{ marginBottom: 2 }} />
                                    <Text className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{fiveStarCount}</Text>
                                    <Text className="text-gray-500 dark:text-zinc-400 text-[9px] font-bold uppercase tracking-wider">5 Stars</Text>
                                </View>
                                
                                {/* Places Widget */}
                                <View className="bg-white dark:bg-zinc-900 py-2 px-1 rounded-xl flex-1 mx-1 items-center justify-center border border-gray-200 dark:border-zinc-800 shadow-sm">
                                    <Ionicons name="map-outline" size={16} color={isDark ? '#A3A3A3' : '#4B5563'} style={{ marginBottom: 2 }} />
                                    <Text className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{uniquePlaces}</Text>
                                    <Text className="text-gray-500 dark:text-zinc-400 text-[9px] font-bold uppercase tracking-wider">Places</Text>
                                </View>

                                {/* Buddies Widget (Clickable to view list modal) */}
                                <TouchableOpacity 
                                    onPress={openBuddiesList}
                                    className="bg-white dark:bg-zinc-900 py-2 px-1 rounded-xl flex-1 ml-1.5 items-center justify-center border border-gray-200 dark:border-zinc-800 shadow-sm"
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="people-outline" size={16} color="#E11D48" style={{ marginBottom: 2 }} />
                                    <Text className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{buddyCount}</Text>
                                    <Text className="text-gray-500 dark:text-zinc-400 text-[9px] font-bold uppercase tracking-wider">Chowmates</Text>
                                </TouchableOpacity>
                            </View>
  
                            {/* Edit Profile Action Button */}
                            <TouchableOpacity 
                                onPress={() => router.push('/onboarding')}
                                className="bg-white dark:bg-zinc-900 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 items-center justify-center flex-row shadow-sm self-center"
                                style={{ width: '95%' }}
                                activeOpacity={0.8}
                            >
                                <Text className="font-bold text-gray-900 dark:text-white text-sm">Edit Profile</Text>
                            </TouchableOpacity>
                        </View>
 
                        {/* Action buttons removed - Edit is now in the top right header */}
                        
                        {/* View Mode Toggle (Differentiated from IG) */}
                        <View className="flex-row justify-center mt-3 bg-gray-200 dark:bg-zinc-900 mx-5 rounded-xl p-1 mb-2">
                            <TouchableOpacity
                                className={`flex-1 flex-row justify-center items-center py-2 rounded-lg ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-800 shadow-sm' : ''}`}
                                onPress={() => setViewMode('grid')}
                            >
                                <Ionicons name="apps-outline" size={16} color={viewMode === 'grid' ? (isDark ? 'white' : 'black') : (isDark ? '#A3A3A3' : '#6B7280')} style={{ marginRight: 6 }} />
                                <Text className={`font-semibold text-sm ${viewMode === 'grid' ? 'text-black dark:text-white' : 'text-gray-500 dark:text-zinc-400'}`}>Gallery</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`flex-1 flex-row justify-center items-center py-2 rounded-lg ${viewMode === 'list' ? 'bg-white dark:bg-zinc-800 shadow-sm' : ''}`}
                                onPress={() => setViewMode('list')}
                            >
                                <Ionicons name="reader-outline" size={16} color={viewMode === 'list' ? (isDark ? 'white' : 'black') : (isDark ? '#A3A3A3' : '#6B7280')} style={{ marginRight: 6 }} />
                                <Text className={`font-semibold text-sm ${viewMode === 'list' ? 'text-black dark:text-white' : 'text-gray-500 dark:text-zinc-400'}`}>Reviews</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                data={getFlatListData()}
                keyExtractor={(item) => item.id}
                renderItem={renderFlatListItem}
                numColumns={1}
                ListEmptyComponent={() => (
                    <View className="items-center justify-center px-8 py-10">
                        {/* Elegant Icon in Turquoise */}
                        <Ionicons 
                            name="images-outline" 
                            size={56} 
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
                contentContainerStyle={myReviews.length === 0 ? { flexGrow: 1, paddingBottom: 40 } : { paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                onScroll={(e) => {
                    const offsetY = e.nativeEvent.contentOffset.y;
                    setShowScrollTop(offsetY > 300);
                }}
                scrollEventThrottle={16}
                onScrollToIndexFailed={(info) => {
                    const wait = new Promise(resolve => setTimeout(resolve, 500));
                    wait.then(() => {
                        flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
                    });
                }}
            />

            {/* Scroll to Top Button */}
            {showScrollTop && (
                <TouchableOpacity
                    onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
                    className="absolute bottom-6 right-6 bg-turquoise w-12 h-12 rounded-full items-center justify-center shadow-lg"
                    style={{ elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="arrow-up" size={24} color="black" />
                </TouchableOpacity>
            )}
            </View>

            {/* Chowmates List Modal */}
            <Modal
                visible={showBuddiesModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowBuddiesModal(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <View 
                        style={{ 
                            width: '100%', 
                            maxWidth: maxAppWidth, 
                            height: '75%', 
                            backgroundColor: isDark ? '#09090B' : '#FFFFFF', 
                            borderTopLeftRadius: 28, 
                            borderTopRightRadius: 28,
                            paddingBottom: 24,
                            borderTopWidth: 1,
                            borderColor: isDark ? '#27272A' : '#E5E7EB'
                        }}
                    >
                        {/* Modal Header */}
                        <View 
                            style={{ 
                                flexDirection: 'row', 
                                alignItems: 'center', 
                                paddingHorizontal: 20, 
                                height: 64, 
                                borderBottomWidth: 1, 
                                borderColor: isDark ? '#27272A' : '#E5E7EB',
                                justifyContent: 'space-between'
                            }}
                        >
                            <Text style={{ fontSize: 18, fontWeight: '900', color: isDark ? '#FFFFFF' : '#111827' }}>
                                My Chowmates
                            </Text>
                            <TouchableOpacity 
                                onPress={() => setShowBuddiesModal(false)}
                                style={{ padding: 6, borderRadius: 20, backgroundColor: isDark ? '#27272A' : '#F3F4F6' }}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="close" size={20} color={isDark ? '#F4F4F5' : '#18181B'} />
                            </TouchableOpacity>
                        </View>

                        {/* Tab Segment Control */}
                        <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#18181B' : '#F3F4F6', marginHorizontal: 20, marginVertical: 10, borderRadius: 14, padding: 2, borderWidth: 1, borderColor: isDark ? '#27272A' : '#E5E7EB' }}>
                            <TouchableOpacity
                                onPress={() => setBuddiesTab('active')}
                                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: buddiesTab === 'active' ? (isDark ? '#27272A' : '#FFFFFF') : 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: buddiesTab === 'active' ? 2 : 0 }, shadowOpacity: buddiesTab === 'active' ? 0.08 : 0, shadowRadius: 3, elevation: buddiesTab === 'active' ? 2 : 0 }}
                                activeOpacity={0.8}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '800', color: buddiesTab === 'active' ? (isDark ? '#FFFFFF' : '#111827') : (isDark ? '#A1A1AA' : '#6B7280') }}>
                                    Active ({buddiesList.filter(b => b.status === 'accepted').length})
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setBuddiesTab('pending')}
                                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: buddiesTab === 'pending' ? (isDark ? '#27272A' : '#FFFFFF') : 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: buddiesTab === 'pending' ? 2 : 0 }, shadowOpacity: buddiesTab === 'pending' ? 0.08 : 0, shadowRadius: 3, elevation: buddiesTab === 'pending' ? 2 : 0 }}
                                activeOpacity={0.8}
                            >
                                <Text style={{ fontSize: 13, fontWeight: '800', color: buddiesTab === 'pending' ? (isDark ? '#FFFFFF' : '#111827') : (isDark ? '#A1A1AA' : '#6B7280') }}>
                                    Pending ({buddiesList.filter(b => b.status === 'pending').length})
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Modal List Content */}
                        {loadingBuddies ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#E11D48" />
                            </View>
                        ) : (
                            <FlatList
                                data={buddiesList.filter(b => buddiesTab === 'active' ? b.status === 'accepted' : b.status === 'pending')}
                                keyExtractor={(item) => item.buddyId}
                                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40 }}
                                renderItem={({ item }) => (
                                    <View 
                                        style={{ 
                                            flexDirection: 'row', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between', 
                                            paddingVertical: 14, 
                                            borderBottomWidth: 1, 
                                            borderColor: isDark ? '#1C1C1E' : '#F3F4F6' 
                                        }}
                                    >
                                        {item.status === 'accepted' ? (
                                            <TouchableOpacity 
                                                onPress={() => {
                                                    setShowBuddiesModal(false);
                                                    if (setActiveDiscoverUser) {
                                                        setActiveDiscoverUser(item.profile.id);
                                                    }
                                                    router.push('/(tabs)/discover');
                                                }}
                                                activeOpacity={0.7}
                                                style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 }}
                                            >
                                                <View style={{ padding: 2, borderRadius: 9999, borderWidth: 1.5, borderColor: '#40E0D0', marginRight: 12 }}>
                                                    <Image
                                                        source={{ uri: item.profile.avatar_url || 'https://placehold.co/100x100/png?text=User' }}
                                                        style={{ width: 44, height: 44, borderRadius: 22 }}
                                                    />
                                                </View>
                                                <View style={{ flexShrink: 1 }}>
                                                    <Text 
                                                        style={{ fontSize: 15, fontWeight: '800', color: isDark ? '#FFFFFF' : '#111827' }}
                                                        numberOfLines={1}
                                                    >
                                                        @{item.profile.username || 'Guest'}
                                                    </Text>
                                                    {item.profile.full_name && (
                                                        <Text 
                                                            style={{ fontSize: 12, color: isDark ? '#A1A1AA' : '#6B7280', marginTop: 1 }}
                                                            numberOfLines={1}
                                                        >
                                                            {item.profile.full_name}
                                                        </Text>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        ) : (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 }}>
                                                <View style={{ padding: 2, borderRadius: 9999, borderWidth: 1.5, borderColor: item.isOutgoingPending ? '#F59E0B' : '#06B6D4', marginRight: 12 }}>
                                                    <Image
                                                        source={{ uri: item.profile.avatar_url || 'https://placehold.co/100x100/png?text=User' }}
                                                        style={{ width: 44, height: 44, borderRadius: 22 }}
                                                    />
                                                </View>
                                                <View style={{ flexShrink: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <Text 
                                                            style={{ fontSize: 15, fontWeight: '800', color: isDark ? '#FFFFFF' : '#111827' }}
                                                            numberOfLines={1}
                                                        >
                                                            @{item.profile.username || 'Guest'}
                                                        </Text>
                                                        <View style={{ backgroundColor: item.isOutgoingPending ? (isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.08)') : (isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.08)'), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 }}>
                                                            <Text style={{ fontSize: 9, fontWeight: '700', color: item.isOutgoingPending ? '#F59E0B' : '#06B6D4' }}>
                                                                {item.isOutgoingPending ? 'Sent' : 'Received'}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    {item.profile.full_name && (
                                                        <Text 
                                                            style={{ fontSize: 12, color: isDark ? '#A1A1AA' : '#6B7280', marginTop: 1 }}
                                                            numberOfLines={1}
                                                        >
                                                            {item.profile.full_name}
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>
                                        )}

                                        {/* Action Button depending on Status & Direction */}
                                        {item.status === 'pending' ? (
                                            item.isOutgoingPending ? (
                                                <TouchableOpacity
                                                    onPress={() => handleDeleteBuddy(item.buddyId, item.profile.username, true)}
                                                    style={{ 
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        backgroundColor: isDark ? 'rgba(161, 161, 170, 0.15)' : 'rgba(113, 113, 122, 0.08)', 
                                                        paddingVertical: 8, 
                                                        paddingHorizontal: 12, 
                                                        borderRadius: 10 
                                                    }}
                                                    activeOpacity={0.8}
                                                >
                                                    <Ionicons name="close-circle-outline" size={14} color={isDark ? '#A1A1AA' : '#71717A'} style={{ marginRight: 4 }} />
                                                    <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? '#A1A1AA' : '#71717A' }}>Cancel</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <TouchableOpacity
                                                        onPress={() => handleDeleteBuddy(item.buddyId, item.profile.username, true)}
                                                        style={{ 
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)', 
                                                            paddingVertical: 8, 
                                                            paddingHorizontal: 10, 
                                                            borderRadius: 10,
                                                            marginRight: 8
                                                        }}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Ionicons name="close" size={14} color="#EF4444" style={{ marginRight: 2 }} />
                                                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#EF4444' }}>Decline</Text>
                                                    </TouchableOpacity>
                                                    
                                                    <TouchableOpacity
                                                        onPress={() => executeAccept(item.buddyId)}
                                                        style={{ 
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            backgroundColor: '#14B8A6', 
                                                            paddingVertical: 8, 
                                                            paddingHorizontal: 12, 
                                                            borderRadius: 10 
                                                        }}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginRight: 2 }} />
                                                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>Accept</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )
                                        ) : (
                                            <TouchableOpacity
                                                onPress={() => handleDeleteBuddy(item.buddyId, item.profile.username, false)}
                                                style={{ 
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)', 
                                                    paddingVertical: 8, 
                                                    paddingHorizontal: 12, 
                                                    borderRadius: 10 
                                                }}
                                                activeOpacity={0.8}
                                            >
                                                <Ionicons name="trash-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#EF4444' }}>Remove</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                                ListEmptyComponent={() => (
                                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 20 }}>
                                        <Ionicons 
                                            name={buddiesTab === 'active' ? "people-outline" : "paper-plane-outline"} 
                                            size={48} 
                                            color={isDark ? '#3F3F46' : '#D1D5DB'} 
                                            style={{ marginBottom: 12 }} 
                                        />
                                        <Text style={{ fontSize: 15, fontWeight: '800', color: isDark ? '#A1A1AA' : '#6B7280', textAlign: 'center' }}>
                                            {buddiesTab === 'active' 
                                                ? "No Chowmates connected yet." 
                                                : "No pending requests."}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: isDark ? '#71717A' : '#9CA3AF', textAlign: 'center', marginTop: 4, lineHeight: 16 }}>
                                            {buddiesTab === 'active' 
                                                ? "Scan a friend's QR code on their profile to start sharing reviews in real-time!" 
                                                : "When you send a request or someone sends one to you, they'll show up here."}
                                        </Text>
                                    </View>
                                )}
                            />
                        )}

                        {/* Custom Premium Confirm Delete Overlay inside Buddies Modal Container to avoid Nested Modal collisions */}
                        {confirmDeleteData !== null && (
                            <View 
                                style={{ 
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    backgroundColor: 'rgba(0,0,0,0.6)', 
                                    justifyContent: 'center', 
                                    alignItems: 'center', 
                                    paddingHorizontal: 24,
                                    zIndex: 9999,
                                    borderTopLeftRadius: 28, 
                                    borderTopRightRadius: 28,
                                }}
                            >
                                <View 
                                    style={{ 
                                        width: '100%', 
                                        maxWidth: 300, 
                                        backgroundColor: isDark ? '#18181B' : '#FFFFFF', 
                                        borderRadius: 24, 
                                        padding: 24, 
                                        borderWidth: 1,
                                        borderColor: isDark ? '#27272A' : '#E5E7EB',
                                        alignItems: 'center',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 10 },
                                        shadowOpacity: 0.25,
                                        shadowRadius: 15,
                                        elevation: 10
                                    }}
                                >
                                    <View style={{ width: 56, height: 56, backgroundColor: confirmDeleteData.isPending ? (isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.08)') : (isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)'), borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                        <Ionicons name={confirmDeleteData.isPending ? "close-circle-outline" : "trash-outline"} size={26} color={confirmDeleteData.isPending ? "#F59E0B" : "#EF4444"} />
                                    </View>
                                    
                                    <Text style={{ fontSize: 18, fontWeight: '900', color: isDark ? '#FFFFFF' : '#111827', marginBottom: 8, textAlign: 'center' }}>
                                        {confirmDeleteData.isPending ? "Cancel Request?" : "Remove Chowmate?"}
                                    </Text>
                                    
                                    <Text style={{ fontSize: 14, color: isDark ? '#A1A1AA' : '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
                                        {confirmDeleteData.isPending ? (
                                            <>Are you sure you want to cancel your pending Chowmate request to <Text style={{ fontWeight: '800', color: isDark ? '#FFFFFF' : '#111827' }}>@{confirmDeleteData?.buddyUsername}</Text>?</>
                                        ) : (
                                            <>Are you sure you want to remove <Text style={{ fontWeight: '800', color: isDark ? '#FFFFFF' : '#111827' }}>@{confirmDeleteData?.buddyUsername}</Text> from your Chowmates?</>
                                        )}
                                    </Text>
                                    
                                    <View style={{ flexDirection: 'row', width: '100%' }}>
                                        <TouchableOpacity
                                            onPress={() => setConfirmDeleteData(null)}
                                            style={{
                                                flex: 1,
                                                backgroundColor: isDark ? '#27272A' : '#F3F4F6',
                                                paddingVertical: 12,
                                                borderRadius: 14,
                                                alignItems: 'center',
                                                marginRight: 8
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={{ fontWeight: '800', color: isDark ? '#D4D4D8' : '#4B5563', fontSize: 14 }}>
                                                Cancel
                                            </Text>
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity
                                            onPress={async () => {
                                                if (confirmDeleteData) {
                                                    await executeDelete(confirmDeleteData.buddyId);
                                                    setConfirmDeleteData(null);
                                                }
                                            }}
                                            style={{
                                                flex: 1,
                                                backgroundColor: confirmDeleteData.isPending ? '#F59E0B' : '#E11D48',
                                                paddingVertical: 12,
                                                borderRadius: 14,
                                                alignItems: 'center',
                                                marginLeft: 8
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={{ fontWeight: '800', color: '#FFFFFF', fontSize: 14 }}>
                                                {confirmDeleteData.isPending ? "Confirm" : "Remove"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
