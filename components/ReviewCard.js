import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Text, TouchableOpacity, View, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useColorScheme } from 'nativewind';

export default function ReviewCard({ review, onPress, onDelete, onEdit, onRestaurantPress, onProfilePress, onSavePress, isSaved }) {
    const { width: windowWidth } = useWindowDimensions();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Responsive card width computation for immediate correct sizing
    const fallbackWidth = Math.min(windowWidth, 600) - 32;
    const [cardWidth, setCardWidth] = useState(fallbackWidth);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollViewRef = useRef(null);

    // Sync card width if screen layout changes
    const isRecommended = review.visibility === 'recommended';

    useEffect(() => {
        setCardWidth(fallbackWidth);
    }, [windowWidth]);

    const photos = Array.isArray(review.photos) 
        ? review.photos 
        : (review.photo_url 
            ? String(review.photo_url).split(',').map(u => u.trim()).filter(Boolean) 
            : []);

    const handleScroll = (event) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const viewSize = event.nativeEvent.layoutMeasurement.width;
        if (viewSize > 0) {
            const index = Math.round(contentOffset / viewSize);
            setActiveIndex(index);
        }
    };

    const handleLayout = (event) => {
        const layoutWidth = event.nativeEvent.layout.width;
        if (layoutWidth > 0) {
            setCardWidth(layoutWidth);
        }
    };

    const scrollToImage = (index) => {
        if (index >= 0 && index < photos.length && cardWidth > 0) {
            scrollViewRef.current?.scrollTo({ x: index * cardWidth, animated: true });
            setActiveIndex(index);
        }
    };

    // Format the date nicely
    const dateString = new Date(review.created_at || Date.now()).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    // Fallback avatar URL (high-quality placeholder)
    const avatarUrl = review.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80';

    return (
        <View className="bg-white dark:bg-zinc-900 mb-6 pb-4 border-b border-gray-100 dark:border-zinc-800">
            {/* Header: User Attribution Row */}
            <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
                <TouchableOpacity 
                    onPress={onProfilePress} 
                    className="flex-row items-center flex-1"
                    activeOpacity={0.7}
                    disabled={!onProfilePress}
                >
                    <Image
                        source={{ uri: avatarUrl }}
                        className="w-10 h-10 rounded-full mr-3 border border-gray-200 dark:border-zinc-700"
                    />
                    <View className="flex-1 pr-2">
                        <Text className="font-extrabold text-neutral-800 dark:text-zinc-50 text-sm">
                            @{review.username || 'Guest'}
                        </Text>
                        <View className="flex-row items-center flex-wrap gap-1.5 mt-0.5">
                            <Text className="text-gray-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                                {dateString}
                            </Text>
                            <Text className="text-gray-300 dark:text-zinc-600 text-[10px]">•</Text>
                            {/* Audience indicator - Minimalist & Premium Icons only */}
                            {review.visibility === 'private' && (
                                <Ionicons 
                                    name="lock-closed" 
                                    size={11} 
                                    color={isDark ? "#A3A3A3" : "#6B7280"} 
                                />
                            )}
                            {(review.visibility === 'shared' || !review.visibility) && (
                                <Ionicons 
                                    name="people" 
                                    size={12} 
                                    color={isDark ? "#A3A3A3" : "#6B7280"} 
                                />
                            )}
                            {review.visibility === 'recommended' && (
                                <View className="flex-row items-center gap-1 border border-amber-500/50 dark:border-amber-500/40 px-2 py-0.5 rounded-full bg-amber-50/20 dark:bg-amber-950/10">
                                    <MaterialCommunityIcons 
                                        name="chef-hat" 
                                        size={11} 
                                        color={isDark ? "#F59E0B" : "#D97706"} 
                                    />
                                    <Text className="text-amber-600 dark:text-amber-500 text-[9px] font-black uppercase tracking-wider">
                                        Chowmate Recommended
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Edit & Delete Action Buttons */}
                <View className="flex-row items-center gap-2">
                    {onEdit && (
                        <TouchableOpacity onPress={onEdit} className="p-1.5 bg-gray-50 dark:bg-zinc-800 rounded-full">
                            <Ionicons name="create-outline" size={16} color={isDark ? "white" : "black"} />
                        </TouchableOpacity>
                    )}
                    {onDelete && (
                        <TouchableOpacity onPress={onDelete} className="p-1.5 bg-red-50 dark:bg-red-950 rounded-full">
                            <Ionicons name="trash-outline" size={16} color="red" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Dish & Restaurant Metadata */}
            <View className="px-5 pb-3">
                {/* Dish Name */}
                <View className="flex-row items-center gap-2">
                    <Ionicons name="restaurant-outline" size={16} color={isDark ? "#A3A3A3" : "#737373"} style={{ marginTop: 2 }} />
                    <Text className="text-xl font-bold text-neutral-800 dark:text-white capitalize tracking-tight flex-1" style={{ fontFamily: 'serif', lineHeight: 24 }}>
                        {review.dish_name}
                    </Text>
                </View>
                
                {/* Restaurant Location */}
                <TouchableOpacity 
                    onPress={onRestaurantPress}
                    disabled={!onRestaurantPress}
                    className="flex-row items-center mt-1"
                    activeOpacity={0.7}
                >
                    <Ionicons name="location-outline" size={13} color={isDark ? "#A3A3A3" : "#6B7280"} />
                    <Text className="text-gray-500 dark:text-zinc-400 font-bold text-xs pl-1">
                        {review.restaurant_name}
                    </Text>
                </TouchableOpacity>
            </View>

            <View className="px-4">
                <View 
                    onLayout={handleLayout}
                    className={`rounded-3xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shadow-sm relative w-full aspect-[4/5] ${isRecommended ? 'border-2 border-amber-400 dark:border-amber-500' : ''}`}
                >
                    {photos.length > 0 ? (
                        <View className="w-full h-full relative">
                            <ScrollView
                                ref={scrollViewRef}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                showsVerticalScrollIndicator={false}
                                onScroll={handleScroll}
                                scrollEventThrottle={16}
                                style={{ width: '100%', height: '100%' }}
                            >
                                {photos.map((uri, index) => (
                                    <View key={index} style={{ width: cardWidth || 300, height: '100%' }}>
                                        <Image
                                            source={{ uri }}
                                            className="w-full h-full"
                                            resizeMode="cover"
                                        />
                                    </View>
                                ))}
                            </ScrollView>

                            {/* Left Chevron Button */}
                            {photos.length > 1 && activeIndex > 0 && (
                                <Pressable
                                    onPress={() => scrollToImage(activeIndex - 1)}
                                    className="absolute left-3 top-1/2 -mt-5 bg-zinc-900 rounded-full p-2 items-center justify-center"
                                    style={{ zIndex: 10 }}
                                >
                                    <Ionicons name="chevron-back" size={20} color="white" />
                                </Pressable>
                            )}

                            {/* Right Chevron Button */}
                            {photos.length > 1 && activeIndex < photos.length - 1 && (
                                <Pressable
                                    onPress={() => scrollToImage(activeIndex + 1)}
                                    className="absolute right-3 top-1/2 -mt-5 bg-zinc-900 rounded-full p-2 items-center justify-center"
                                    style={{ zIndex: 10 }}
                                >
                                    <Ionicons name="chevron-forward" size={20} color="white" />
                                </Pressable>
                            )}

                            {/* Dot Indicators */}
                            {photos.length > 1 && (
                                <View className="absolute bottom-12 left-0 right-0 flex-row justify-center gap-1.5" style={{ zIndex: 10 }}>
                                    {photos.map((_, index) => (
                                        <Pressable
                                            key={index}
                                            onPress={() => scrollToImage(index)}
                                            className={`h-2 rounded-full ${index === activeIndex ? 'w-4 bg-white' : 'w-2 bg-zinc-400'}`}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>
                    ) : (
                        <Image
                            source={{ uri: 'https://placehold.co/600x800/png?text=Food' }}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    )}

                    {/* Floating Save/Bookmark Button */}
                    {onSavePress && (
                        <TouchableOpacity
                            onPress={onSavePress}
                            className={`absolute top-3 right-3 p-2 rounded-full shadow-md ${isSaved ? 'bg-amber-400 dark:bg-amber-500' : 'bg-zinc-950'}`}
                            style={{ zIndex: 20 }}
                            activeOpacity={0.8}
                        >
                            <Ionicons 
                                name={isSaved ? "bookmark" : "bookmark-outline"} 
                                size={18} 
                                color={isSaved ? "black" : "white"} 
                            />
                        </TouchableOpacity>
                    )}

                    {/* Rating Tag */}
                    <View className={`absolute bottom-3 left-3 px-3 py-1.5 rounded-full flex-row items-center shadow-md ${isRecommended ? 'bg-amber-400 dark:bg-amber-500' : 'bg-zinc-900'}`} style={{ zIndex: 20 }}>
                        <Ionicons name="star" size={12} color={isRecommended ? "black" : "white"} style={{ marginRight: 2 }} />
                        <Text className={`font-extrabold text-xs ${isRecommended ? 'text-zinc-950' : 'text-white'}`}>{review.rating}.0</Text>
                    </View>

                    {/* Price Tag */}
                    {!!review.price && (
                        <View className="absolute bottom-3 right-3 bg-[#E11D48] px-3 py-1.5 rounded-full shadow-md" style={{ zIndex: 20 }}>
                            <Text className="font-extrabold text-xs text-white">
                                {review.currency || 'PHP'} {parseFloat(review.price).toFixed(2)}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
 
            {/* Content: Caption Notes */}
            {!!review.notes && (
                <View className="px-5 pt-3">
                    <View className="border-l-4 border-cyan-400 dark:border-cyan-600 pl-3 py-0.5">
                        <Text className="text-gray-800 dark:text-zinc-200 text-base leading-relaxed italic" style={{ fontFamily: 'serif' }}>
                            "{review.notes}"
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}
