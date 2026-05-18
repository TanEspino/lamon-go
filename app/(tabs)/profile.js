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

    // Calculate grid item size (accounting for the 600px max-width on Web)
    const { width } = useWindowDimensions();
    const containerWidth = Math.min(width, 600);
    const itemSize = containerWidth / 3;

    const renderGridItem = ({ item, index }) => (
        <TouchableOpacity
            onPress={() => {
                setTargetIndex(index);
                setViewMode('list');
            }}
            activeOpacity={0.8}
            className="border-r border-b border-white relative"
            style={{ width: itemSize, height: itemSize }}
        >
            <Image
                source={{ uri: (item.photos && item.photos[0]) || item.photo_url || 'https://placehold.co/200x200/png?text=Food' }}
                className="w-full h-full bg-gray-200"
                resizeMode="cover"
            />
            {item.photos && item.photos.length > 1 && (
                <View className="absolute top-1 right-1">
                    <Ionicons name="images" size={16} color="white" style={{ textShadowColor: 'black', textShadowRadius: 1 }} />
                </View>
            )}
        </TouchableOpacity>
    );

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

    if (!profile) return null; // Or loading spinner

    return (
        <SafeAreaView className="flex-1 bg-white">
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

            <FlatList
                ref={flatListRef}
                key={viewMode} // Force re-render when changing columns
                ListHeaderComponent={() => (
                    <View className="bg-gray-100 pb-4">
                        {/* Top Section: Dashboard Header */}
                        <View className="bg-gray-100 pb-4 pt-2 px-5 border-b border-gray-200">
                            {/* Top Header Bar: Logo & Actions */}
                            <View className="flex-row justify-between items-center mb-4 mt-2">
                                <View style={{ width: 26 }} /> {/* Spacer to precisely center logo */}
                                <Image
                                    source={require('../../assets/logo_profile.png')}
                                    style={{ width: 150, height: 45 }}
                                    resizeMode="contain"
                                />
                                <TouchableOpacity onPress={signOut}>
                                    <Ionicons name="log-out-outline" size={26} color="black" />
                                </TouchableOpacity>
                            </View>

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
                        
                        {/* Tab Icons (Grid vs List) */}
                        <View className="flex-row justify-center mt-2 bg-gray-50 mx-6 rounded-xl p-1">
                            <TouchableOpacity
                                className={`flex-1 items-center py-2 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                                onPress={() => setViewMode('grid')}
                            >
                                <Ionicons name="grid" size={20} color={viewMode === 'grid' ? 'black' : '#9CA3AF'} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`flex-1 items-center py-2 rounded-lg ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                                onPress={() => setViewMode('list')}
                            >
                                <Ionicons name="list" size={22} color={viewMode === 'list' ? 'black' : '#9CA3AF'} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                data={myReviews}
                keyExtractor={(item) => item.id}
                renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
                numColumns={viewMode === 'grid' ? 3 : 1}
                contentContainerStyle={{ paddingBottom: 20 }}
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
        </SafeAreaView>
    );
}
