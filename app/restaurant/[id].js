import { View, Text, FlatList, SafeAreaView, Image } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import ReviewCard from '../../components/ReviewCard';
import { Ionicons } from '@expo/vector-icons';

// Mock Data (Shared/Duplicated for MVP ease - in real app, fetch from DB)
const MOCK_REVIEWS = [
    {
        id: '1',
        username: 'foodie_jane',
        avatar_url: 'https://placehold.co/100x100/png?text=J',
        dish_name: 'Truffle Carbonara',
        restaurant_name: 'Pasta Palace',
        rating: 5,
        verdict: 'Must Order Again',
        photo_url: 'https://placehold.co/600x400/png?text=Pasta',
        notes: 'Absolutely delicious, creamy but not heavy.',
        created_at: '2023-10-27T10:00:00Z',
    },
    {
        id: '4',
        username: 'salad_sally',
        avatar_url: 'https://placehold.co/100x100/png?text=Sa',
        dish_name: 'Caesar Salad',
        restaurant_name: 'Pasta Palace',
        rating: 3,
        verdict: 'Okay',
        photo_url: 'https://placehold.co/600x400/png?text=Salad',
        notes: 'Standard salad. Croutons were stale.',
        created_at: '2023-10-24T18:00:00Z',
    },
    {
        id: '2',
        username: 'burger_king_kong',
        avatar_url: 'https://placehold.co/100x100/png?text=B',
        dish_name: 'Double Cheeseburger',
        restaurant_name: 'Burger Barn',
        rating: 4,
        verdict: 'Must Order Again',
        photo_url: 'https://placehold.co/600x400/png?text=Burger',
        notes: 'Juicy and great bun. Fries were extra crispy.',
        created_at: '2023-10-26T12:00:00Z',
    },
];

export default function RestaurantScreen() {
    const { name, id } = useLocalSearchParams();
    const router = useRouter();

    // Filter mock reviews by restaurant name for MVP demo
    const restaurantReviews = MOCK_REVIEWS.filter(r => r.restaurant_name === name);

    const averageRating = restaurantReviews.length > 0
        ? (restaurantReviews.reduce((acc, curr) => acc + curr.rating, 0) / restaurantReviews.length).toFixed(1)
        : 'N/A';

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Stack.Screen options={{ title: name || 'Restaurant', headerBackTitle: 'Back' }} />

            <FlatList
                ListHeaderComponent={() => (
                    <View className="p-6 border-b border-gray-100 bg-gray-50">
                        <Text className="text-3xl font-extrabold text-gray-900 mb-2">{name}</Text>
                        <View className="flex-row items-center mb-4">
                            <Ionicons name="location-outline" size={20} color="gray" />
                            <Text className="text-gray-600 ml-1">123 Food Street, Flavor Town</Text>
                        </View>

                        <View className="flex-row items-center space-x-4">
                            <View className="flex-row items-center bg-yellow-100 px-3 py-1 rounded-full">
                                <Ionicons name="star" size={16} color="#B45309" />
                                <Text className="ml-1 font-bold text-yellow-800">{averageRating} avg</Text>
                            </View>
                            <Text className="text-gray-500">{restaurantReviews.length} reviews</Text>
                        </View>
                    </View>
                )}
                data={restaurantReviews}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View className="px-4 pt-4">
                        <ReviewCard
                            review={item}
                            onPress={() => router.push({ pathname: '/modal', params: item })}
                        // Don't show delete on public view usually, but for MVP keep it simple
                        />
                    </View>
                )}
                contentContainerStyle={{ paddingBottom: 40 }}
                ListEmptyComponent={() => (
                    <View className="p-8 items-center">
                        <Text className="text-gray-400">No reviews found for this place yet.</Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}
