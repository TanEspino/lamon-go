import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { FlatList, Image, SafeAreaView, TouchableOpacity, View } from 'react-native';
import { useScrollToTop } from '@react-navigation/native';
import ReviewCard from '../../components/ReviewCard';
import { useReviews } from '../../context/ReviewsContext';
import { useAuth } from '../../context/AuthContext';

export default function FeedScreen() {
    const { reviews } = useReviews();
    const { user } = useAuth();
    const router = useRouter();
    const flatListRef = useRef(null);
    
    // Automatically scroll to top when the active tab icon is tapped
    useScrollToTop(flatListRef);

    // Filter reviews to only show current user's posts (since it's a personal app)
    const myReviews = reviews.filter(r => r.user_id === user?.id);

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Custom Logo Header */}
            <View className="items-center justify-center py-3 bg-gray-100 border-b border-gray-200">
                <Image
                    source={require('../../assets/logo_profile.png')}
                    style={{ width: 150, height: 45 }}
                    resizeMode="contain"
                />
            </View>
            <FlatList
                ref={flatListRef}
                data={myReviews}
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
