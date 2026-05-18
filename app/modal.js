import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import CurrencyPicker from '../components/CurrencyPicker';
import { useReviews } from '../context/ReviewsContext';

export default function ModalScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const isEditing = !!params.id;
    const { addReview, updateReview, reviews } = useReviews();

    const [restaurantName, setRestaurantName] = useState('');
    const [dish, setDish] = useState('');
    const [rating, setRating] = useState(0);
    const [notes, setNotes] = useState('');
    const [photos, setPhotos] = useState([]);
    const [price, setPrice] = useState('');
    const [currency, setCurrency] = useState('PHP');
    const [dateOrdered, setDateOrdered] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showCurrencyModal, setShowCurrencyModal] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Compute unique restaurant names from past reviews
    const allUniquePlaces = Array.from(new Set(reviews?.filter(r => r.restaurant_name).map(r => r.restaurant_name) || []));
    
    // Filter places based on current input
    const filteredRestaurants = restaurantName.trim() === '' 
        ? [] // Return empty array if user hasn't typed anything yet
        : allUniquePlaces.filter(place => place.toLowerCase().includes(restaurantName.trim().toLowerCase()));

    useEffect(() => {
        if (isEditing) {
            setRestaurantName(params.restaurant_name || '');
            setDish(params.dish_name || '');
            setRating(Number(params.rating) || 0);
            setNotes(params.notes || '');
            if (params.photos) {
                try {
                    setPhotos(JSON.parse(params.photos));
                } catch (e) {
                    setPhotos(params.photos.split(','));
                }
            } else if (params.photo_url) {
                setPhotos([params.photo_url]);
            }
            setPrice(params.price ? String(params.price) : '');
            setCurrency(params.currency || 'PHP');
            setDateOrdered(params.date_ordered ? new Date(params.date_ordered) : new Date());
        }
    }, [params.id]);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            allowsMultipleSelection: true,
            quality: 1,
        });

        if (!result.canceled) {
            setPhotos([...photos, ...result.assets.map(asset => asset.uri)]);
        }
    };

    const removePhoto = (index) => {
        const newPhotos = [...photos];
        newPhotos.splice(index, 1);
        setPhotos(newPhotos);
    };

    const handleDateChange = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setDateOrdered(selectedDate);
        }
    };

    const handleSave = () => {
        if (!restaurantName.trim() || !dish.trim() || !price.trim() || rating === 0) {
            Alert.alert(
                "Incomplete Masterpiece 🎨",
                "A great review needs a Restaurant, Dish, Price, and Rating! Don't leave us hanging! 🍽️"
            );
            return;
        }

        const reviewData = {
            dish_name: dish,
            restaurant_name: restaurantName,
            rating,
            notes,
            photos,
            photo_url: photos[0] || null,
            price: parseFloat(price) || 0,
            currency,
            date_ordered: dateOrdered.toISOString().split('T')[0],
        };

        if (isEditing) {
            updateReview({ ...reviewData, id: params.id });
        } else {
            addReview(reviewData);
        }
        router.dismiss();
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100">
                <Pressable onPress={() => router.dismiss()}>
                    <Ionicons name="close-outline" size={28} color="#262626" />
                </Pressable>
                <Text className="text-base font-bold text-black">{isEditing ? 'Edit Post' : 'New Post'}</Text>
                <Pressable onPress={handleSave}>
                    <Text className="text-blue-500 font-bold text-base">Share</Text>
                </Pressable>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
                className="flex-1"
            >
                <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
                    {/* Key Visual / Photo Area */}
                    <View className="w-full bg-gray-50 aspect-square border-b border-gray-100 relative">
                        {photos.length > 0 ? (
                            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} className="w-full h-full">
                                {photos.map((uri, index) => (
                                    <View key={index} className="w-screen aspect-square relative">
                                        <Image
                                            source={{ uri }}
                                            className="w-full h-full"
                                            resizeMode="cover"
                                        />
                                        <Pressable
                                            onPress={() => removePhoto(index)}
                                            className="absolute top-2 right-2 bg-black/60 rounded-full p-1"
                                        >
                                            <Ionicons name="close" size={16} color="white" />
                                        </Pressable>
                                    </View>
                                ))}
                            </ScrollView>
                        ) : (
                            <Pressable
                                onPress={pickImage}
                                className="w-full h-full items-center justify-center space-y-2"
                            >
                                <View className="w-16 h-16 rounded-full bg-gray-200 items-center justify-center">
                                    <Ionicons name="camera" size={32} color="#9CA3AF" />
                                </View>
                                <Text className="text-gray-400 font-medium">Add Photos</Text>
                            </Pressable>
                        )}

                        {/* Add more photos button (floating if photos exist) */}
                        {photos.length > 0 && (
                            <Pressable
                                onPress={pickImage}
                                className="absolute bottom-4 right-4 bg-black/60 rounded-full p-2 flex-row items-center space-x-1"
                            >
                                <Ionicons name="images" size={16} color="white" />
                                <Text className="text-white text-xs font-bold px-1">Add</Text>
                            </Pressable>
                        )}
                    </View>

                    {/* Form Fields - Instagram Style List */}
                    <View className="px-4 py-2">
                        {/* Dish Name */}
                        <View className="flex-row items-center py-4 border-b border-gray-100">
                            <View className="w-8 items-center mr-3">
                                <Ionicons name="fast-food-outline" size={24} color="#262626" />
                            </View>
                            <TextInput
                                value={dish}
                                onChangeText={setDish}
                                placeholder="Name of the dish..."
                                placeholderTextColor="#9CA3AF"
                                className="flex-1 text-base text-black"
                                style={{ minHeight: 44, paddingBottom: 10, paddingTop: 10 }}
                            />
                        </View>

                        {/* Restaurant */}
                        <View className="z-10 relative">
                            <View className="flex-row items-center py-4 border-b border-gray-100">
                                <View className="w-8 items-center mr-3">
                                    <Ionicons name="location-outline" size={24} color="#262626" />
                                </View>
                                <TextInput
                                    value={restaurantName}
                                    onChangeText={(text) => {
                                        setRestaurantName(text);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    placeholder="Add location (Restaurant)..."
                                    placeholderTextColor="#9CA3AF"
                                    className="flex-1 text-base text-black"
                                    style={{ minHeight: 44, paddingBottom: 10, paddingTop: 10 }}
                                />
                            </View>
                            
                            {/* Autocomplete Suggestions */}
                            {showSuggestions && filteredRestaurants.length > 0 && (
                                <View 
                                    className="bg-gray-50 border border-gray-300 rounded-lg absolute left-10 right-0 z-50 overflow-hidden"
                                    style={{ top: 60, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 }}
                                >
                                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 150 }}>
                                        {filteredRestaurants.map((place, index) => (
                                            <Pressable 
                                                key={index} 
                                                className={`px-4 py-3 bg-gray-50 flex-row items-center ${index < filteredRestaurants.length - 1 ? 'border-b border-gray-200' : ''}`}
                                                onPress={() => {
                                                    setRestaurantName(place);
                                                    setShowSuggestions(false);
                                                }}
                                            >
                                                <View className="mr-3">
                                                    <Ionicons name="search-outline" size={18} color="#6B7280" />
                                                </View>
                                                <Text className="text-base text-gray-800 font-medium flex-1" numberOfLines={1}>{place}</Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {/* Price & Currency */}
                        <View className="flex-row items-center py-4 border-b border-gray-100">
                            <View className="w-8 items-center mr-3">
                                <Ionicons name="wallet-outline" size={24} color="#262626" />
                            </View>
                            <View className="flex-1 flex-row items-center">
                                <Pressable onPress={() => setShowCurrencyModal(true)} className="flex-row items-center mr-2">
                                    <Text className="text-base font-bold text-black mr-1">{currency}</Text>
                                    <Ionicons name="chevron-down" size={12} color="#6B7280" />
                                </Pressable>
                                <TextInput
                                    value={price}
                                    onChangeText={setPrice}
                                    placeholder="0.00"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    className="flex-1 text-base text-black"
                                    style={{ minHeight: 44, paddingBottom: 10, paddingTop: 10 }}
                                />
                            </View>
                        </View>

                        {/* Date */}
                        <View className="flex-row items-center py-4 border-b border-gray-100">
                            <View className="w-8 items-center mr-3">
                                <Ionicons name="calendar-outline" size={24} color="#262626" />
                            </View>
                            <Pressable onPress={() => setShowDatePicker(true)} className="flex-1">
                                <Text className="text-base text-black">
                                    {dateOrdered.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                                </Text>
                            </Pressable>
                            {/* Today Shortcut */}
                            <Pressable
                                onPress={() => setDateOrdered(new Date())}
                                className="bg-gray-100 px-3 py-1 rounded-md"
                            >
                                <Text className="text-xs font-bold text-gray-500">Today</Text>
                            </Pressable>
                        </View>

                        {/* Rating - Special Row */}
                        <View className="flex-row items-center py-4 border-b border-gray-100 justify-between">
                            <Text className="text-base text-gray-900 font-medium">Rating</Text>
                            <View className="flex-row space-x-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Pressable key={star} onPress={() => setRating(star)}>
                                        <Ionicons
                                            name={star <= rating ? "star" : "star-outline"}
                                            size={28}
                                            color="black"
                                        />
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Notes / Caption */}
                        <View className="py-4">
                            <TextInput
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="Write a caption..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                className="text-base text-black min-h-[100px]"
                                style={{ paddingTop: 8, paddingBottom: 16 }}
                                includeFontPadding={false}
                                textAlignVertical="top"
                            />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Date Picker Modal */}
            {/* Date Picker Modal */}
            {showDatePicker && (
                Platform.OS === 'ios' ? (
                    <Modal
                        transparent={true}
                        animationType="slide"
                        visible={showDatePicker}
                        onRequestClose={() => setShowDatePicker(false)}
                    >
                        <View className="flex-1 justify-end">
                            <Pressable
                                className="flex-1 bg-black/30"
                                onPress={() => setShowDatePicker(false)}
                            />
                            <View className="bg-white pb-4">
                                <View className="flex-row justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                                    <Pressable onPress={() => setShowDatePicker(false)}>
                                        <Text className="text-gray-500 text-base">Cancel</Text>
                                    </Pressable>
                                    <Text className="font-semibold text-base">Select Date</Text>
                                    <Pressable onPress={() => setShowDatePicker(false)}>
                                        <Text className="text-blue-500 font-bold text-base">Done</Text>
                                    </Pressable>
                                </View>
                                <DateTimePicker
                                    value={dateOrdered}
                                    mode="date"
                                    display="spinner"
                                    onChange={handleDateChange}
                                    maximumDate={new Date()}
                                    themeVariant="light"
                                    style={{ height: 120 }}
                                />
                            </View>
                        </View>
                    </Modal>
                ) : (
                    <DateTimePicker
                        value={dateOrdered}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                        maximumDate={new Date()}
                        themeVariant="light"
                    />
                )
            )}

            {/* Currency Picker Modal */}
            <CurrencyPicker
                visible={showCurrencyModal}
                onClose={() => setShowCurrencyModal(false)}
                onSelect={setCurrency}
                currentCurrency={currency}
            />
        </SafeAreaView>
    );
}
