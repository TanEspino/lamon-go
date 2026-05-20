import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, SafeAreaView, Text, View } from 'react-native';
import ReviewCard from '../../components/ReviewCard';
import SearchBarHeader from '../../components/SearchBarHeader';
import { useAuth } from '../../context/AuthContext';
import { useReviews } from '../../context/ReviewsContext';
import { useColorScheme } from 'nativewind';

export default function DiscoverScreen() {
    const router = useRouter();
    const { reviews, deleteReview } = useReviews();
    const { user } = useAuth();

    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    // ... existing function body ...


    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('dish'); // 'dish' or 'restaurant'
    const [ratingFilter, setRatingFilter] = useState(null); // null means "All"

    // Filter Logic
    const filteredReviews = useMemo(() => {
        const safeReviews = reviews || [];

        // 0. If no search query and no rating filter, return empty (Initial State)
        if (!searchQuery && ratingFilter === null) {
            return [];
        }

        // 1. Filter by current user (History)
        let result = safeReviews.filter(r => r && r.user_id === user?.id);

        // 2. Filter by Search Query (Dish OR Restaurant based on type)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (searchType === 'dish') {
                result = result.filter(r => r.dish_name && r.dish_name.toLowerCase().includes(query));
            } else {
                result = result.filter(r => r.restaurant_name && r.restaurant_name.toLowerCase().includes(query));
            }
        }

        // 3. Filter by Rating
        if (ratingFilter !== null) {
            result = result.filter(r => r.rating && Math.round(r.rating) === ratingFilter);
        }

        return result;
    }, [reviews, user, searchQuery, ratingFilter, searchType]);

    const renderInitialState = () => (
        <View className="flex-1 items-center justify-center py-20 px-8 bg-white dark:bg-zinc-900">
            <View className="bg-teal-50 dark:bg-zinc-800 p-6 rounded-full mb-4">
                <Ionicons name="compass-outline" size={64} color="#40E0D0" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">Rediscover Your Food Adventures</Text>
            <Text className="text-gray-500 dark:text-zinc-400 text-center text-base leading-6">
                Search for a dish or restaurant to find that one meal you can't forget.
            </Text>
        </View>
    );

    const renderNoResultsState = () => (
        <View className="flex-1 items-center justify-center py-20 px-8 bg-white dark:bg-zinc-900">
            <View className="bg-gray-50 dark:bg-zinc-800 p-6 rounded-full mb-4">
                <Ionicons name="search-outline" size={48} color={isDark ? '#71717A' : '#9CA3AF'} />
            </View>
            <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Result Found</Text>
            <Text className="text-gray-500 dark:text-zinc-400 text-center">
                We couldn't find any reviews matching "{searchQuery}" with that rating.
            </Text>
        </View>
    );

    // Determine which empty state to show
    const isEmpty = (!searchQuery && ratingFilter === null);

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-zinc-900">
            <View style={{ flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center' }} className="bg-white dark:bg-zinc-900">
                <SearchBarHeader
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    ratingFilter={ratingFilter}
                    setRatingFilter={setRatingFilter}
                    searchType={searchType}
                    setSearchType={setSearchType}
                />
                <FlatList
                    data={filteredReviews}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <ReviewCard
                            review={item}
                            onRestaurantPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: item.restaurant_id || 'mock', name: item.restaurant_name } })}
                        />
                    )}
                    ListEmptyComponent={isEmpty ? renderInitialState : renderNoResultsState}
                    contentContainerStyle={{ paddingBottom: 100 }}
                />
            </View>
        </SafeAreaView>
    );
}
