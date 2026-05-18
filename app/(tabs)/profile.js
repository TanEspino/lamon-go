import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, FlatList, Image, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
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

    // Calculate grid item size
    const screenWidth = Dimensions.get('window').width;
    const itemSize = screenWidth / 3;

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
        Alert.alert(
            "Delete Post",
            "Are you sure you want to delete this post?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteReview(id) }
            ]
        );
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
                    <View className="bg-white pb-4">
                        {/* Top Section: Dashboard Header */}
                        <View className="bg-white pt-2 pb-4 border-b border-gray-100 mb-1">
                            {/* Top Right Actions */}
                            <View className="flex-row justify-end px-5 pt-2">
                                <TouchableOpacity onPress={() => router.push('/onboarding')}>
                                    <Ionicons name="settings-outline" size={24} color="black" />
                                </TouchableOpacity>
                            </View>

                            <View className="items-center px-4">
                                <View className="p-1 rounded-full border-[2.5px] border-turquoise">
                                    <Image
                                        source={{ uri: profile.avatar_url || 'https://placehold.co/100x100/png?text=User' }}
                                        className="w-24 h-24 rounded-full bg-gray-100"
                                    />
                                </View>
                                
                                <Text className="font-bold text-2xl text-gray-900 mt-4">{profile.username}</Text>
                                {profile.bio ? <Text className="text-gray-600 text-center text-sm mt-1 px-8 leading-5">{profile.bio}</Text> : null}
                            </View>

                            {/* Analytics Cards */}
                            <View className="flex-row justify-between px-6 mt-6">
                                <View className="bg-white py-3 px-2 rounded-2xl flex-1 mr-2 shadow-sm items-center border border-gray-100">
                                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Reviews</Text>
                                    <Text className="text-xl font-bold text-primary">{totalReviews}</Text>
                                </View>
                                <View className="bg-white py-3 px-2 rounded-2xl flex-1 mx-1 shadow-sm items-center border border-gray-100">
                                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex-row items-center">
                                        <Ionicons name="star" size={10} color="black" /> 5 STARS
                                    </Text>
                                    <Text className="text-xl font-bold text-gray-900">{fiveStarCount}</Text>
                                </View>
                                <View className="bg-white py-3 px-2 rounded-2xl flex-1 ml-2 shadow-sm items-center border border-gray-100">
                                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Places</Text>
                                    <Text className="text-xl font-bold text-gray-900">{uniquePlaces}</Text>
                                </View>
                            </View>
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
