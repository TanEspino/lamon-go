import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SearchBarHeader({ searchQuery, setSearchQuery, ratingFilter, setRatingFilter, searchType, setSearchType }) {
    return (
        <View className="bg-white px-4 py-2 border-b border-gray-100">
            {/* Search Type Toggle */}
            <View className="flex-row mb-3 bg-gray-100 p-1 rounded-xl">
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

            {/* Search Bar */}
            <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-2 mb-4">
                <Ionicons name="search" size={20} color="#9CA3AF" />
                <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={searchType === 'dish' ? "Search for a dish..." : "Search for a restaurant..."}
                    className="flex-1 ml-2 text-base"
                    autoCapitalize="none"
                    clearButtonMode="while-editing"
                />
            </View>

            {/* Rating Filter Chips */}
            <View className="flex-row justify-between mb-2">
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
    );
}
