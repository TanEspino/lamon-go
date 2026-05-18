import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function ReviewCard({ review, onPress, onDelete, onEdit, onRestaurantPress }) {
    const { profile } = useAuth();
    // review object structure based on schema:
    // { dish_name, restaurant_name, rating, verdict, photo_url, username, avatar_url, created_at, notes, price }

    return (
        <View className="bg-white mb-6">
            {/* Header: Dish and Restaurant */}
            <View className="flex-row items-start px-5 pt-4 pb-3">
                <View className="flex-1 justify-center">
                    <Text 
                        className="font-bold text-gray-900 text-2xl tracking-widest capitalize mb-1"
                        style={{ fontFamily: 'serif' }}
                    >
                        {review.dish_name}
                    </Text>
                    <TouchableOpacity onPress={onRestaurantPress} className="mt-0.5">
                        <Text className="text-gray-500 font-medium text-sm flex-row items-center">
                            <Ionicons name="location-outline" size={12} color="#6B7280" /> {review.restaurant_name}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View className="flex-row items-center space-x-2 ml-2">
                    {onEdit && (
                        <TouchableOpacity onPress={onEdit} className="p-1.5 bg-gray-50 rounded-full">
                            <Ionicons name="create-outline" size={18} color="black" />
                        </TouchableOpacity>
                    )}
                    {onDelete && (
                        <TouchableOpacity onPress={onDelete} className="p-1.5 bg-red-50 rounded-full">
                            <Ionicons name="trash-outline" size={18} color="red" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Hero Image - Polaroid Style */}
            <View className="px-4">
                <View className="rounded-3xl overflow-hidden bg-gray-100 shadow-sm relative w-full aspect-[4/5]">
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        className="w-full h-full"
                    >
                        {(review.photos && review.photos.length > 0 ? review.photos : [review.photo_url]).map((photo, index) => (
                            <Image
                                key={index}
                                source={{ uri: photo || 'https://placehold.co/600x800/png?text=Food' }}
                                className="w-screen aspect-[4/5]"
                                style={{ width: require('react-native').Dimensions.get('window').width - 32 }}
                                resizeMode="cover"
                            />
                        ))}
                    </ScrollView>

                    {/* Multi-photo Indicator */}
                    {review.photos && review.photos.length > 1 && (
                        <View className="absolute top-3 right-3 bg-black/40 px-2 py-1 rounded-full">
                            <Ionicons name="images" size={14} color="white" />
                        </View>
                    )}

                    {/* High-Contrast Overlays */}
                    <View className="absolute bottom-3 left-3 bg-gray-900 px-3 py-1.5 rounded-full flex-row items-center shadow-md">
                        <Ionicons name="star" size={14} color="white" />
                        <Text className="font-bold ml-1 text-xs text-white">{review.rating}.0</Text>
                    </View>

                    {review.price && (
                        <View className="absolute bottom-3 right-3 bg-primary px-3 py-1.5 rounded-full shadow-md">
                            <Text className="font-bold text-xs text-white">{review.currency || 'PHP'} {parseFloat(review.price).toFixed(2)}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Content / Notes */}
            <View className="px-5 pt-4 pb-4">
                {review.notes && (
                    <View className="border-l-4 border-turquoise pl-3 mb-3 ml-1">
                        <Text className="text-gray-800 text-base leading-6 italic" style={{ fontFamily: 'serif' }}>
                            "{review.notes}"
                        </Text>
                    </View>
                )}
                <Text className="text-gray-400 text-xs font-medium uppercase tracking-wider ml-1">
                    {new Date(review.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
            </View>
        </View>
    );
}
