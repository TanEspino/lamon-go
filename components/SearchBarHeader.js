import { View, Text, TextInput, TouchableOpacity, ScrollView, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useReviews } from '../context/ReviewsContext';

export default function SearchBarHeader({ searchQuery, setSearchQuery, ratingFilter, setRatingFilter, searchType, setSearchType }) {
    const { reviews } = useReviews();
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Compute unique lists
    const allUniqueRestaurants = Array.from(new Set(reviews?.filter(r => r.restaurant_name).map(r => r.restaurant_name) || []));
    const allUniqueDishes = Array.from(new Set(reviews?.filter(r => r.dish_name).map(r => r.dish_name) || []));

    // Filter based on type
    const activeList = searchType === 'dish' ? allUniqueDishes : allUniqueRestaurants;
    const filteredSuggestions = searchQuery.trim() === '' 
        ? [] 
        : activeList.filter(item => item.toLowerCase().includes(searchQuery.trim().toLowerCase()));

    return (
        <View className="bg-gray-100 border-b border-gray-200 z-50">
            {/* Custom Logo Header */}
            <View className="items-center justify-center border-b border-gray-200" style={{ height: 60, width: '100%' }}>
                <Image
                    source={require('../assets/logo_profile.png')}
                    style={{ width: 140, height: 40 }}
                    resizeMode="contain"
                />
            </View>
            {/* Search Controls Container with its own padding */}
            <View className="px-4 pb-3 pt-2">
                {/* Search Type Toggle */}
            <View className="flex-row mb-3 bg-gray-200 p-1 rounded-xl">
                <TouchableOpacity
                    onPress={() => setSearchType('dish')}
                    className={`flex-1 py-1.5 rounded-lg items-center ${searchType === 'dish' ? 'bg-white' : ''}`}
                >
                    <Text className={`font-semibold ${searchType === 'dish' ? 'text-black' : 'text-gray-500'}`}>Dish Name</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setSearchType('restaurant')}
                    className={`flex-1 py-1.5 rounded-lg items-center ${searchType === 'restaurant' ? 'bg-white' : ''}`}
                >
                    <Text className={`font-semibold ${searchType === 'restaurant' ? 'text-black' : 'text-gray-500'}`}>Restaurant</Text>
                </TouchableOpacity>
            </View>

            {/* Search Bar Container */}
            <View className="z-50 relative mb-4">
                <View className={`flex-row items-center bg-white border shadow-sm rounded-xl px-4 py-2 ${isFocused ? 'border-blue-500' : 'border-gray-200'}`}>
                    <Ionicons name="search" size={20} color={isFocused ? "#3B82F6" : "#9CA3AF"} />
                    <TextInput
                        value={searchQuery}
                        onChangeText={(text) => {
                            setSearchQuery(text);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => {
                            setIsFocused(true);
                            setShowSuggestions(true);
                        }}
                        onBlur={() => {
                            setIsFocused(false);
                            setTimeout(() => setShowSuggestions(false), 200);
                        }}
                        placeholder={searchType === 'dish' ? "Search for a dish..." : "Search for a restaurant..."}
                        className="flex-1 ml-2 text-base"
                        autoCapitalize="none"
                        clearButtonMode="while-editing"
                        style={{ minHeight: 32, paddingVertical: 0, outlineStyle: 'none' }}
                    />
                </View>

                {/* Autocomplete Suggestions */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                    <View 
                        className="bg-gray-50 border border-gray-300 rounded-lg absolute left-0 right-0 z-50 overflow-hidden"
                        style={{ top: 45, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 }}
                    >
                        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 150 }}>
                            {filteredSuggestions.map((item, index) => (
                                <Pressable 
                                    key={index} 
                                    className={`px-4 py-3 bg-gray-50 flex-row items-center ${index < filteredSuggestions.length - 1 ? 'border-b border-gray-200' : ''}`}
                                    onPressIn={() => {
                                        setSearchQuery(item);
                                        setShowSuggestions(false);
                                    }}
                                    onPress={() => {
                                        setSearchQuery(item);
                                        setShowSuggestions(false);
                                    }}
                                >
                                    <View className="mr-3">
                                        <Ionicons name={searchType === 'dish' ? "fast-food-outline" : "search-outline"} size={18} color="#6B7280" />
                                    </View>
                                    <Text className="text-base text-gray-800 font-medium flex-1" numberOfLines={1}>{item}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>

            {/* Rating Filter Chips */}
            <View className="flex-row justify-between mb-2 z-10">
                <TouchableOpacity
                    onPress={() => setRatingFilter(null)}
                    className={`px-4 py-1.5 rounded-full border ${ratingFilter === null ? 'bg-black border-black' : 'bg-white border-gray-300'}`}
                >
                    <Text className={`${ratingFilter === null ? 'text-white' : 'text-gray-700'} font-medium`}>All</Text>
                </TouchableOpacity>
                {[5, 4, 3, 2, 1].map((star) => (
                    <TouchableOpacity
                        key={star}
                        onPress={() => setRatingFilter(ratingFilter === star ? null : star)}
                        className={`flex-row items-center px-3 py-1.5 rounded-full border ${ratingFilter === star ? 'bg-black border-black' : 'bg-white border-gray-300'}`}
                    >
                        <Text className={`${ratingFilter === star ? 'text-white' : 'text-gray-700'} font-medium mr-1`}>{star}</Text>
                        <Ionicons name="star" size={12} color={ratingFilter === star ? 'white' : 'black'} />
                    </TouchableOpacity>
                ))}
            </View>
            </View>
        </View>
    );
}
