import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function ReviewDetailScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();

    const {
        dish_name,
        restaurant_name,
        rating,
        verdict,
        photo_url,
        notes,
        price,
        date_ordered,
        username,
        avatar_url,
    } = params;

    // Handle photos array from params (might be stringified or individual params)
    let photos = [];
    if (params.photos) {
        try {
            photos = JSON.parse(params.photos);
        } catch (e) {
            photos = Array.isArray(params.photos) ? params.photos : params.photos.split(',');
        }
    } else if (photo_url) {
        photos = [photo_url];
    }

    const renderStars = (rating) => {
        return (
            <View className="flex-row">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                        key={star}
                        name={star <= Number(rating) ? "star" : "star-outline"}
                        size={20}
                        color="#FBBF24"
                    />
                ))}
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Stack.Screen
                options={{
                    headerTitle: restaurant_name || 'Review',
                    headerRight: () => (
                        (user?.id === params.user_id) ? (
                            <TouchableOpacity onPress={() => router.push({ pathname: '/modal', params: params })}>
                                <Text className="text-blue-600 font-bold text-lg">Edit</Text>
                            </TouchableOpacity>
                        ) : null
                    ),
                }}
            />

            <ScrollView className="flex-1">
                {/* Hero Image - ScrollView */}
                <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    className="w-full h-80 bg-gray-100"
                >
                    {(photos.length > 0 ? photos : ['https://placehold.co/600x400/png?text=Food']).map((photo, index) => (
                        <Image
                            key={index}
                            source={{ uri: photo }}
                            className="w-screen h-80 bg-gray-100"
                            resizeMode="cover"
                        />
                    ))}
                </ScrollView>

                <View className="p-6">
                    {/* Header Info */}
                    <View className="flex-row items-center mb-6">
                        <Image
                            source={{ uri: avatar_url || 'https://placehold.co/100x100/png?text=U' }}
                            className="w-12 h-12 rounded-full bg-gray-200 mr-4"
                        />
                        <View>
                            <Text className="font-bold text-lg text-gray-900">{username || 'User'}</Text>
                            <Text className="text-gray-500">{date_ordered}</Text>
                        </View>
                    </View>

                    {/* Main Content */}
                    <View className="mb-6">
                        <View className="flex-row justify-between items-start mb-2">
                            <View>
                                <Text className="text-2xl font-bold text-gray-900 mb-1">{dish_name}</Text>
                                <Text className="text-lg text-gray-600 font-medium">{restaurant_name}</Text>
                            </View>
                            <View className="bg-yellow-100 px-3 py-1 rounded-lg">
                                <Text className="text-2xl font-bold text-primary">${price}</Text>
                            </View>
                        </View>

                        <View className="flex-row items-center mt-2 mb-4">
                            {renderStars(rating)}
                            {/* Verdict removed per request */}
                        </View>

                        {notes ? (
                            <View className="bg-gray-50 p-4 rounded-xl">
                                <Text className="text-gray-800 text-lg leading-7 italic">"{notes}"</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
