import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { FlatList, Image, SafeAreaView, TouchableOpacity, View } from 'react-native';
import ReviewCard from '../../components/ReviewCard';
import { useReviews } from '../../context/ReviewsContext';

export default function FeedScreen() {
    const { reviews, deleteReview } = useReviews();
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Stack.Screen
                options={{
                    headerTitle: '', // clear title
                    headerLeft: () => (
                        <View style={{ marginLeft: 16, width: 120, height: 40, justifyContent: 'center' }}>
                            <Image
                                source={require('../../assets/images/logo.png')}
                                style={{ width: 110, height: 35 }}
                                resizeMode="contain"
                            />
                        </View>
                    ),
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: 'white' },

                }}
            />
            < FlatList
                data={reviews}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <ReviewCard
                        review={item}
                        onRestaurantPress={() => router.push({ pathname: '/restaurant/[id]', params: { id: item.restaurant_id || 'mock', name: item.restaurant_name } })}
                    />
                )}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            />

            {/* Floating Action Button */}
            <TouchableOpacity
                onPress={() => router.push('/modal')}
                className="absolute bottom-6 right-6 bg-black w-14 h-14 rounded-full items-center justify-center shadow-lg"
                activeOpacity={0.8}
            >
                <Ionicons name="add" size={32} color="white" />
            </TouchableOpacity>
        </SafeAreaView >
    );
}
