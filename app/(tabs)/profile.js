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

    // View Mode State
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [targetIndex, setTargetIndex] = useState(null);
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
                        <TouchableOpacity className="mr-4" onPress={signOut}>
                            <Ionicons name="log-out-outline" size={28} color="black" />
                        </TouchableOpacity>
                    )
                }}
            />

            <FlatList
                ref={flatListRef}
                key={viewMode} // Force re-render when changing columns
                ListHeaderComponent={() => (
                    <View className="bg-white pb-4">
                        {/* Top Section: Avatar + Stats */}
                        <View className="flex-row items-center px-4 py-2">
                            {/* Avatar */}
                            <View className="mr-6">
                                <Image
                                    source={{ uri: profile.avatar_url || 'https://placehold.co/100x100/png?text=User' }}
                                    className="w-20 h-20 rounded-full bg-gray-200 border border-gray-100"
                                />
                            </View>

                            {/* Stats */}
                            <View className="flex-1 flex-row justify-between mr-4">
                                <View className="items-center">
                                    <Text className="font-bold text-lg text-gray-900">{myReviews.length}</Text>
                                    <Text className="text-gray-900 text-xs">Posts</Text>
                                </View>
                                <View className="items-center">
                                    <Text className="font-bold text-lg text-gray-900">0</Text>
                                    <Text className="text-gray-900 text-xs">Followers</Text>
                                </View>
                                <View className="items-center">
                                    <Text className="font-bold text-lg text-gray-900">0</Text>
                                    <Text className="text-gray-900 text-xs">Following</Text>
                                </View>
                            </View>
                        </View>

                        {/* Bio Section */}
                        <View className="px-4 mt-2">
                            <Text className="font-bold text-gray-900 text-sm mb-1">{profile.username}</Text>
                            {profile.bio ? <Text className="text-gray-900 text-sm mb-1">{profile.bio}</Text> : null}
                            {profile.website ? <Text className="text-blue-900 text-sm">{profile.website}</Text> : null}
                        </View>

                        {/* Action Buttons */}
                        <View className="flex-row px-4 mt-4 space-x-2">
                            <TouchableOpacity 
                                onPress={() => router.push('/onboarding')}
                                className="flex-1 bg-gray-100 py-1.5 rounded-md items-center"
                            >
                                <Text className="font-semibold text-gray-900 text-sm">Edit profile</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                className="flex-1 bg-red-100 py-1.5 rounded-md items-center"
                                onPress={async () => {
                                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                                    await AsyncStorage.removeItem('hasCompletedOnboarding');
                                    router.replace('/onboarding');
                                }}
                            >
                                <Text className="font-semibold text-red-600 text-sm">Reset Onboarding</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Tab Icons (Grid vs List) */}
                        <View className="flex-row justify-around mt-6 border-t border-gray-200 pt-2">
                            <TouchableOpacity
                                className={`items-center w-1/2 pb-2 ${viewMode === 'grid' ? 'border-b-2 border-black' : ''}`}
                                onPress={() => setViewMode('grid')}
                            >
                                <Ionicons name="grid" size={24} color={viewMode === 'grid' ? 'black' : '#9CA3AF'} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`items-center w-1/2 pb-2 ${viewMode === 'list' ? 'border-b-2 border-black' : ''}`}
                                onPress={() => setViewMode('list')}
                            >
                                <Ionicons name="list" size={26} color={viewMode === 'list' ? 'black' : '#9CA3AF'} />
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
                onScrollToIndexFailed={(info) => {
                    const wait = new Promise(resolve => setTimeout(resolve, 500));
                    wait.then(() => {
                        flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
                    });
                }}
            />
        </SafeAreaView>
    );
}
