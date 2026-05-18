import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function ReviewCard({ review, onPress, onDelete, onEdit, onRestaurantPress }) {
    const { profile } = useAuth();
    // review object structure based on schema:
    // { dish_name, restaurant_name, rating, verdict, photo_url, username, avatar_url, created_at, notes, price }

    return (
        <View className="bg-white mb-4 border-b border-gray-100">
            {/* Header */}
            <View className="flex-row items-center p-3">
                <Image
                    source={{ uri: profile?.avatar_url || 'https://placehold.co/100x100/png?text=U' }}
                    className="w-8 h-8 rounded-full bg-gray-200 border border-gray-100"
                />
                <View className="ml-3 flex-1">
                    <Text className="font-bold text-gray-900 text-sm">{profile?.username || 'User'}</Text>
                </View>
                <View className="flex-row items-center space-x-2">
                    {onEdit && (
                        <TouchableOpacity onPress={onEdit} className="p-1">
                            <Ionicons name="create-outline" size={20} color="black" />
                        </TouchableOpacity>
                    )}
                    {onDelete && (
                        <TouchableOpacity onPress={onDelete} className="p-1">
                            <Ionicons name="trash-outline" size={20} color="red" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Hero Image - Full Width ScrollView */}
            <View>
                <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    className="w-full h-96 bg-gray-100"
                >
                    {(review.photos && review.photos.length > 0 ? review.photos : [review.photo_url]).map((photo, index) => (
                        <Image
                            key={index}
                            source={{ uri: photo || 'https://placehold.co/600x400/png?text=Food' }}
                            className="w-screen h-96 bg-gray-100"
                            resizeMode="cover"
                        />
                    ))}
                </ScrollView>
                {/* Multi-photo Indicator */}
                {review.photos && review.photos.length > 1 && (
                    <View className="absolute top-3 right-3 bg-black/50 px-2 py-1 rounded-full">
                        <Ionicons name="images" size={16} color="white" />
                    </View>
                )}
            </View>



            {/* Content / Caption */}
            <View className="px-3 pt-3 pb-4">
                {/* Line 1: Rating Stars */}
                <View className="flex-row items-center mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                            key={star}
                            name={star <= review.rating ? "star" : "star-outline"}
                            size={24}
                            color="black"
                        />
                    ))}
                </View>

                {/* Line 2: Dish Name (Prominent) */}
                <View>
                    <Text className="font-bold text-primary text-lg mb-1">
                        {review.dish_name}
                    </Text>
                </View>

                {/* Line 3: Restaurant Name and Price */}
                <View className="flex-row justify-between items-center mb-2">
                    <TouchableOpacity onPress={onRestaurantPress}>
                        <Text className="text-gray-700 text-base font-medium">
                            {review.restaurant_name}
                        </Text>
                    </TouchableOpacity>
                    {review.price && (
                        <Text className="text-gray-900 font-semibold bg-gray-100 px-2 py-1 rounded-md text-xs">
                            {review.currency || 'PHP'} {parseFloat(review.price).toFixed(2)}
                        </Text>
                    )}
                </View>

                {/* Line 4: Notes */}
                {review.notes && (
                    <Text className="text-gray-600 text-sm leading-5 mb-2">
                        {review.notes}
                    </Text>
                )}

                <Text className="text-gray-400 text-xs uppercase mt-1">
                    {new Date(review.created_at || Date.now()).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                </Text>

            </View>
        </View>
    );
}
