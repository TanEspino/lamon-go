import { Ionicons } from '@expo/vector-icons';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function ReviewCard({ review, onPress, onDelete, onEdit, onRestaurantPress }) {
    const { user } = useAuth();

    // Format the date nicely
    const dateString = new Date(review.created_at || Date.now()).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    // Fallback avatar URL (high-quality placeholder)
    const avatarUrl = review.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80';

    return (
        <View className="bg-white mb-6 pb-4">
            {/* Header: Dish Name at the Top & Restaurant Below */}
            <View className="px-5 pt-4 pb-3 flex-row justify-between items-start">
                <View className="flex-1">
                    {/* Dish Name */}
                    <View className="flex-row items-center space-x-2 mb-0">
                        <Ionicons name="restaurant-outline" size={18} color="#737373" style={{ marginTop: 2 }} />
                        <Text className="text-2xl font-semibold text-neutral-800 capitalize tracking-tight flex-1" style={{ fontFamily: 'serif', lineHeight: 28 }}>
                            {review.dish_name}
                        </Text>
                    </View>
                    
                    {/* Restaurant Location */}
                    <View className="flex-row items-center mt-0">
                        <Ionicons name="location-outline" size={14} color="#6B7280" />
                        <Text className="text-gray-500 font-bold text-sm pl-1">
                            {review.restaurant_name}
                        </Text>
                    </View>
                </View>

                {/* Edit & Delete Action Buttons */}
                <View className="flex-row items-center space-x-2 mt-1">
                    {onEdit && (
                        <TouchableOpacity onPress={onEdit} className="p-1.5 bg-gray-50 rounded-full">
                            <Ionicons name="create-outline" size={16} color="black" />
                        </TouchableOpacity>
                    )}
                    {onDelete && (
                        <TouchableOpacity onPress={onDelete} className="p-1.5 bg-red-50 rounded-full">
                            <Ionicons name="trash-outline" size={16} color="red" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Hero Image - Polaroid Style */}
            <View className="px-4">
                <View className="rounded-3xl overflow-hidden bg-gray-100 shadow-sm relative w-full aspect-[4/5]">
                    <Image
                        source={{ uri: review.photo_url || 'https://placehold.co/600x800/png?text=Food' }}
                        className="w-full h-full"
                        resizeMode="cover"
                    />

                    {/* Rating Tag */}
                    <View className="absolute bottom-3 left-3 bg-gray-900/90 px-3 py-1.5 rounded-full flex-row items-center shadow-md">
                        <Ionicons name="star" size={12} color="white" style={{ marginRight: 2 }} />
                        <Text className="font-extrabold text-xs text-white">{review.rating}.0</Text>
                    </View>

                    {/* Price Tag */}
                    {review.price && (
                        <View className="absolute bottom-3 right-3 bg-[#E11D48] px-3 py-1.5 rounded-full shadow-md">
                            <Text className="font-extrabold text-xs text-white">
                                {review.currency || 'PHP'} {parseFloat(review.price).toFixed(2)}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Content: Caption & Date */}
            <View className="px-5 pt-4">
                {/* Notes / Review Description with Left Accent Bar */}
                {review.notes && (
                    <View className="border-l-4 border-cyan-400 pl-3 py-0.5 mb-0.5">
                        <Text className="text-gray-800 text-base leading-relaxed italic" style={{ fontFamily: 'serif' }}>
                            "{review.notes}"
                        </Text>
                    </View>
                )}

                {/* Date */}
                <Text className="text-gray-400 text-xs font-semibold uppercase tracking-widest mt-0">
                    {dateString}
                </Text>
            </View>
        </View>
    );
}
