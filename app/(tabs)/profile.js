import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, FlatList, Image, SafeAreaView, Text, TouchableOpacity, View, Platform, useWindowDimensions } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useReviews } from '../../context/ReviewsContext';
import ReviewCard from '../../components/ReviewCard';

export default function ProfileScreen() {
    const router = useRouter();
    const { reviews, deleteReview } = useReviews();
    const { profile, user, signOut } = useAuth();

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
                            className="border-r border-b border-white relative"
                            style={{ width: itemSize, height: itemSize }}
                        >
                            <Image
                                source={{ uri: (review.photos && review.photos[0]) || review.photo_url || 'https://placehold.co/200x200/png?text=Food' }}
                                className="w-full h-full bg-gray-200"
                                resizeMode="cover"
                            />
                            {review.photos && review.photos.length > 1 && (
                                <View className="absolute top-1 right-1">
                                    <Ionicons name="images" size={16} color="white" style={{ textShadowColor: 'black', textShadowRadius: 1 }} />
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
        <SafeAreaView className="flex-1 bg-background">
            <Stack.Screen
                options={{
                    title: profile.username || 'Profile',
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: 'white' },
                    headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
                    headerRight: () => (
                        <View className="flex-row items-center mr-4">
                            <TouchableOpacity className="mr-4" onPress={() => router.push('/onboarding')}>
                                <Ionicons name="settings-outline" size={26} color="black" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={signOut}>
                                <Ionicons name="log-out-outline" size={28} color="black" />
                            </TouchableOpacity>
                        </View>
                    )
                }}
            />

            <View 
                onLayout={handleLayout}
                style={{ flex: 1, width: '100%', maxWidth: maxAppWidth, alignSelf: 'center', position: 'relative' }}
            >
                <FlatList
                ref={flatListRef}
                key={viewMode}
                ListHeaderComponent={() => (
                    <View className="bg-gray-100 pb-4">
                        {/* Standardized Logo Header Container */}
                        <View className="bg-gray-100 items-center justify-center border-b border-gray-200 relative" style={{ height: 60, width: '100%' }}>
                            <Image
                                source={require('../../assets/logo_profile.png')}
                                style={{ width: 140, height: 40 }}
                                resizeMode="contain"
                            />
                            <TouchableOpacity 
                                onPress={signOut}
                                style={{ position: 'absolute', right: 16, top: '50%', marginTop: -13 }}
                            >
                                <Ionicons name="log-out-outline" size={26} color="black" />
                            </TouchableOpacity>
                        </View>

                        {/* Top Section: Dashboard Header Details */}
                        <View className="bg-gray-100 pb-4 pt-4 px-5 border-b border-gray-200">
                            {/* Centered Identity Row (Avatar + Bio) */}
                            <View className="flex-row items-center justify-center mb-4 mt-2 px-4">
                                {/* Avatar */}
                                <View className="mr-5">
                                    <View className="p-1 rounded-full border-[2px] border-turquoise">
                                        <Image
                                            source={{ uri: profile.avatar_url || 'https://placehold.co/100x100/png?text=User' }}
                                            className="w-20 h-20 rounded-full bg-gray-100"
                                        />
                                    </View>
                                </View>

                                {/* Username & Bio */}
                                <View className="flex-col justify-center flex-shrink items-start" style={{ maxWidth: 200 }}>
                                    <View className="flex-row items-center mb-1">
                                        <Text className="font-extrabold text-xl text-gray-900 tracking-tight" numberOfLines={1}>
                                            @{profile.username}
                                        </Text>
                                    </View>
                                    {profile.bio ? (
                                        <View className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                            <Text className="text-gray-600 text-xs font-medium leading-tight italic" numberOfLines={3}>
                                                {profile.bio}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                            </View>

                            {/* Stats Row */}
                            <View className="flex-row justify-between items-center mb-4 px-2">
                                {/* Reviews Widget */}
                                <View className="bg-white py-2 px-1 rounded-xl flex-1 mr-2 items-center justify-center border border-gray-200 shadow-sm">
                                    <Ionicons name="document-text-outline" size={16} color="#4B5563" style={{ marginBottom: 2 }} />
                                    <Text className="text-lg font-bold text-gray-900 leading-tight">{totalReviews}</Text>
                                    <Text className="text-gray-500 text-[9px] font-bold uppercase tracking-wider">Reviews</Text>
                                </View>
                                
                                {/* 5 Stars Widget */}
                                <View className="bg-white py-2 px-1 rounded-xl flex-1 mx-1 items-center justify-center border border-gray-200 shadow-sm">
                                    <Ionicons name="star" size={16} color="#14B8A6" style={{ marginBottom: 2 }} />
                                    <Text className="text-lg font-bold text-gray-900 leading-tight">{fiveStarCount}</Text>
                                    <Text className="text-gray-500 text-[9px] font-bold uppercase tracking-wider">5 Stars</Text>
                                </View>
                                
                                {/* Places Widget */}
                                <View className="bg-white py-2 px-1 rounded-xl flex-1 ml-2 items-center justify-center border border-gray-200 shadow-sm">
                                    <Ionicons name="map-outline" size={16} color="#4B5563" style={{ marginBottom: 2 }} />
                                    <Text className="text-lg font-bold text-gray-900 leading-tight">{uniquePlaces}</Text>
                                    <Text className="text-gray-500 text-[9px] font-bold uppercase tracking-wider">Places</Text>
                                </View>
                            </View>

                            {/* Edit Profile Action Button */}
                            <TouchableOpacity 
                                onPress={() => router.push('/onboarding')}
                                className="bg-white py-2.5 rounded-xl border border-gray-200 items-center justify-center flex-row shadow-sm self-center"
                                style={{ width: '95%' }}
                                activeOpacity={0.8}
                            >
                                <Text className="font-bold text-gray-900 text-sm">Edit Profile</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Action buttons removed - Edit is now in the top right header */}
                        
                        {/* View Mode Toggle (Differentiated from IG) */}
                        <View className="flex-row justify-center mt-3 bg-gray-200 mx-5 rounded-xl p-1 mb-2">
                            <TouchableOpacity
                                className={`flex-1 flex-row justify-center items-center py-2 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                                onPress={() => setViewMode('grid')}
                            >
                                <Ionicons name="apps-outline" size={16} color={viewMode === 'grid' ? 'black' : '#6B7280'} style={{ marginRight: 6 }} />
                                <Text className={`font-semibold text-sm ${viewMode === 'grid' ? 'text-black' : 'text-gray-500'}`}>Gallery</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`flex-1 flex-row justify-center items-center py-2 rounded-lg ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                                onPress={() => setViewMode('list')}
                            >
                                <Ionicons name="reader-outline" size={16} color={viewMode === 'list' ? 'black' : '#6B7280'} style={{ marginRight: 6 }} />
                                <Text className={`font-semibold text-sm ${viewMode === 'list' ? 'text-black' : 'text-gray-500'}`}>Reviews</Text>
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
                        <Text className="text-base font-bold tracking-tight text-neutral-400 text-center mb-6">
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
                    <Ionicons name="arrow-up" size={24} color="white" />
                </TouchableOpacity>
            )}
            </View>
        </SafeAreaView>
    );
}
