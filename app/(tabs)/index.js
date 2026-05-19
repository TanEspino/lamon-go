import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Image, SafeAreaView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useScrollToTop } from '@react-navigation/native';
import ReviewCard from '../../components/ReviewCard';
import { useReviews } from '../../context/ReviewsContext';
import { useAuth } from '../../context/AuthContext';

export default function FeedScreen() {
    const { reviews } = useReviews();
    const { user } = useAuth();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 600;
    const flatListRef = useRef(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    
    // Automatically scroll to top when the active tab icon is tapped
    useScrollToTop(flatListRef);

    // Filter reviews to only show current user's posts (since it's a personal app)
    const myReviews = reviews.filter(r => r.user_id === user?.id);

    return (
        <SafeAreaView className="flex-1 bg-background">
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
                ListEmptyComponent={() => (
                    <View className="flex-1 items-center justify-center px-8 py-16">
                        {/* Elegant Icon in Turquoise */}
                        <Ionicons 
                            name="restaurant-outline" 
                            size={64} 
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
                contentContainerStyle={myReviews.length === 0 ? { flexGrow: 1, paddingBottom: 100 } : { paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                onScroll={(e) => {
                    const offsetY = e.nativeEvent.contentOffset.y;
                    setShowScrollTop(offsetY > 300);
                }}
                scrollEventThrottle={16}
            />

            {/* Scroll to Top Button */}
            {showScrollTop && isLargeScreen && (
                <TouchableOpacity
                    onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
                    className="absolute bottom-6 right-6 bg-turquoise w-12 h-12 rounded-full items-center justify-center shadow-lg"
                    style={{ elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="arrow-up" size={24} color="white" />
                </TouchableOpacity>
            )}
        </SafeAreaView >
    );
}
