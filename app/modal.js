import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useEffect, useState, useRef } from 'react';
import { Alert, Animated, Image, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import CurrencyPicker from '../components/CurrencyPicker';
import { useReviews } from '../context/ReviewsContext';
import { useAuth } from '../context/AuthContext';
import ReviewCard from '../components/ReviewCard';

export default function ModalScreen() {
    const router = useRouter();
    const { profile } = useAuth();
    const { width } = useWindowDimensions();
    const containerWidth = Math.min(width, 600);
    const params = useLocalSearchParams();
    const isEditing = !!params.id;
    const { addReview, updateReview, reviews } = useReviews();

    const [step, setStep] = useState(1); // 1 = Upload Pic, 2 = Details, 3 = Preview

    // Custom Slide-Up and Dimming animations
    const slideAnim = useRef(new Animated.Value(600)).current; // starts completely below the screen
    const opacityAnim = useRef(new Animated.Value(0)).current; // starts fully transparent

    useEffect(() => {
        // Trigger fluid slide and fade-in animations on mount
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 40,
                friction: 8.5,
                useNativeDriver: true
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true
            })
        ]).start();
    }, []);

    const handleDismiss = () => {
        // Smooth slide down and fade out before dismissing screen
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 800,
                duration: 220,
                useNativeDriver: true
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true
            })
        ]).start(() => {
            router.dismiss();
        });
    };

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
    const [isSaving, setIsSaving] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

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
            quality: 0.5, // 50% compression to drastically save cloud storage space
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

    const handleSave = async () => {
        if (!restaurantName.trim() || !dish.trim() || !price.trim() || rating === 0) {
            Alert.alert(
                "Incomplete Masterpiece 🎨",
                "A great review needs a Restaurant, Dish, Price, and Rating! Don't leave us hanging! 🍽️"
            );
            return;
        }

        setIsSaving(true);
        
        try {
            let uploadedPhotoUrl = null;

            // If there's a local photo selected, upload it to Supabase Storage first
            if (photos.length > 0 && !photos[0].startsWith('http')) {
                let uri = photos[0];
                
                // FORCE COMPRESSION: Resize and compress the image to guarantee small file sizes, even on Web!
                const manipulatedImage = await ImageManipulator.manipulateAsync(
                    uri,
                    [{ resize: { width: 1080 } }], // Shrink to 1080p width max
                    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG } // High-quality compression (80%) instead of aggressive crushing
                );
                
                uri = manipulatedImage.uri;

                const response = await fetch(uri);
                const blob = await response.blob();
                const fileExt = 'jpg';
                const fileName = `review_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                
                const { data, error } = await supabase.storage
                    .from('review-images')
                    .upload(fileName, blob, { contentType: `image/${fileExt}` });
                    
                if (error) {
                    throw error;
                }
                
                // Get the public URL for the uploaded file
                const { data: publicData } = supabase.storage
                    .from('review-images')
                    .getPublicUrl(data.path);
                    
                uploadedPhotoUrl = publicData.publicUrl;
            } else if (photos.length > 0) {
                uploadedPhotoUrl = photos[0]; // Already a remote URL
            }

            const reviewData = {
                dish_name: dish,
                restaurant_name: restaurantName,
                rating,
                notes,
                photos: uploadedPhotoUrl ? [uploadedPhotoUrl] : [],
                photo_url: uploadedPhotoUrl,
                price: parseFloat(price) || 0,
                currency,
                // date_ordered: dateOrdered.toISOString().split('T')[0], // Removed from DB schema for now
            };

            if (isEditing) {
                await updateReview({ ...reviewData, id: params.id });
            } else {
                await addReview(reviewData);
            }
            handleDismiss();
        } catch (error) {
            console.error("Error saving review:", error);
            Alert.alert("Error Saving Post", error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View className="flex-1 justify-end" style={{ backgroundColor: 'transparent' }}>
            {/* Backdrop Dimmed Layer */}
            <Pressable 
                className="absolute inset-0" 
                onPress={handleDismiss}
            >
                <Animated.View 
                    style={{ opacity: opacityAnim }} 
                    className="w-full h-full bg-black/40" 
                />
            </Pressable>

            {/* Bottom Sheet Card */}
            <Animated.View 
                style={{ 
                    height: '85%', 
                    transform: [{ translateY: slideAnim }],
                    width: '100%',
                    maxWidth: 600,
                    alignSelf: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                    elevation: 10
                }}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }}>
                    {/* Grab Handle */}
                    <View className="items-center py-2.5 bg-white">
                        <View className="w-10 h-1 bg-gray-200 rounded-full" />
                    </View>

                    {/* Header: Dynamic Step Navigation */}
                    <View className="flex-row justify-between items-center px-4 pb-3 border-b border-gray-100 bg-white">
                        {step === 1 ? (
                            <Pressable onPress={handleDismiss}>
                                <Ionicons name="close-outline" size={28} color="#262626" />
                            </Pressable>
                        ) : (
                            <Pressable onPress={() => setStep(step - 1)}>
                                <Ionicons name="chevron-back" size={28} color="#262626" />
                            </Pressable>
                        )}

                        <Text className="text-base font-bold text-black">
                            {step === 1 ? (isEditing ? 'Edit Photo' : 'New Post') : step === 2 ? 'Details' : 'Preview'}
                        </Text>

                        {step === 1 ? (
                            <Pressable onPress={() => photos.length > 0 && setStep(2)} disabled={photos.length === 0}>
                                <Text className={`font-bold text-base ${photos.length > 0 ? 'text-blue-500' : 'text-gray-300'}`}>
                                    Next
                                </Text>
                            </Pressable>
                        ) : step === 2 ? (
                            <Pressable 
                                onPress={() => {
                                    const canPreview = restaurantName.trim() && dish.trim() && price.trim() && rating > 0;
                                    if (canPreview) {
                                        setStep(3);
                                    } else {
                                        Alert.alert(
                                            "Incomplete Details 🍽️",
                                            "A great review needs a Restaurant, Dish, Price, and Star Rating to preview!"
                                        );
                                    }
                                }}
                            >
                                <Text className={`font-bold text-base ${restaurantName.trim() && dish.trim() && price.trim() && rating > 0 ? 'text-blue-500' : 'text-gray-300'}`}>
                                    Preview
                                </Text>
                            </Pressable>
                        ) : (
                            <Pressable onPress={handleSave} disabled={isSaving}>
                                <Text className={`font-bold text-base ${isSaving ? 'text-gray-400' : 'text-blue-500'}`}>
                                    {isSaving ? 'Sharing...' : 'Share'}
                                </Text>
                            </Pressable>
                        )}
                    </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
                className="flex-1"
            >
                <ScrollView 
                    className="flex-1" 
                    contentContainerStyle={{ 
                        paddingBottom: 150, 
                        width: '100%', 
                        maxWidth: 600, 
                        alignSelf: 'center' 
                    }}
                    keyboardShouldPersistTaps="handled"
                >
                    {step === 1 && (
                        /* Step 1: Photos only */
                        <View className="bg-gray-50 border-b border-gray-100 relative overflow-hidden" style={{ width: containerWidth, height: containerWidth }}>
                            {photos.length > 0 ? (
                                <ScrollView 
                                    horizontal 
                                    pagingEnabled 
                                    showsHorizontalScrollIndicator={false} 
                                    showsVerticalScrollIndicator={false}
                                    style={{ width: containerWidth, height: containerWidth }}
                                    contentContainerStyle={{ height: containerWidth }}
                                >
                                    {photos.map((uri, index) => (
                                        <View key={index} className="relative overflow-hidden" style={{ width: containerWidth, height: containerWidth }}>
                                            <Image
                                                source={{ uri }}
                                                className="w-full h-full"
                                                resizeMode="cover"
                                            />
                                            <Pressable
                                                onPress={() => removePhoto(index)}
                                                className="absolute top-4 right-4 bg-black/60 rounded-full p-2"
                                                style={{ zIndex: 10 }}
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
                                    className="absolute bottom-4 right-4 bg-black/60 rounded-full py-1.5 px-3 flex-row items-center space-x-1"
                                    style={{ zIndex: 20 }}
                                >
                                    <Ionicons name="images" size={14} color="white" />
                                    <Text className="text-white text-xs font-bold pl-0.5">Add</Text>
                                </Pressable>
                            )}
                        </View>
                    )}

                    {step === 2 && (
                        /* Step 2: Form Details */
                        <View>
                            {/* Miniature Photo Thumbnail preview at the top of Step 2 */}
                            {photos.length > 0 && (
                                <View className="flex-row items-center px-5 py-4 border-b border-gray-100 bg-gray-50/40">
                                    <Image 
                                        source={{ uri: photos[0] }} 
                                        style={{ width: 56, height: 56, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' }} 
                                        resizeMode="cover"
                                    />
                                    <View className="ml-4 flex-1">
                                        <Text className="text-gray-800 font-bold text-sm" numberOfLines={1}>{dish || 'What did you eat?'}</Text>
                                        <Text className="text-gray-500 text-xs mt-0.5" numberOfLines={1}>{restaurantName || 'Which restaurant?'}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Form Fields - Instagram Style List */}
                            <View className="px-4 py-2">
                                {/* Dish Name */}
                                <View className={`flex-row items-center py-4 border-b ${focusedField === 'dish' ? 'border-blue-500' : 'border-gray-100'}`}>
                                    <View className="w-8 items-center mr-3">
                                        <Ionicons 
                                            name="fast-food-outline" 
                                            size={24} 
                                            color={focusedField === 'dish' ? '#3B82F6' : '#262626'} 
                                        />
                                    </View>
                                    <TextInput
                                        value={dish}
                                        onChangeText={setDish}
                                        onFocus={() => setFocusedField('dish')}
                                        onBlur={() => setFocusedField(null)}
                                        placeholder="Name of the dish..."
                                        placeholderTextColor="#9CA3AF"
                                        className="flex-1 text-base text-black"
                                        style={{ minHeight: 44, paddingBottom: 10, paddingTop: 10, outlineStyle: 'none' }}
                                    />
                                </View>

                                {/* Restaurant */}
                                <View className="z-10 relative">
                                    <View className={`flex-row items-center py-4 border-b ${focusedField === 'restaurant' ? 'border-blue-500' : 'border-gray-100'}`}>
                                        <View className="w-8 items-center mr-3">
                                            <Ionicons 
                                                name="location-outline" 
                                                size={24} 
                                                color={focusedField === 'restaurant' ? '#3B82F6' : '#262626'} 
                                            />
                                        </View>
                                        <TextInput
                                            value={restaurantName}
                                            onChangeText={(text) => {
                                                setRestaurantName(text);
                                                setShowSuggestions(true);
                                            }}
                                            onFocus={() => {
                                                setFocusedField('restaurant');
                                                setShowSuggestions(true);
                                            }}
                                            onBlur={() => {
                                                setFocusedField(null);
                                                setTimeout(() => setShowSuggestions(false), 200);
                                            }}
                                            placeholder="Add location (Restaurant)..."
                                            placeholderTextColor="#9CA3AF"
                                            className="flex-1 text-base text-black"
                                            style={{ minHeight: 44, paddingBottom: 10, paddingTop: 10, outlineStyle: 'none' }}
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
                                <View className={`flex-row items-center py-4 border-b ${focusedField === 'price' ? 'border-blue-500' : 'border-gray-100'}`}>
                                    <View className="w-8 items-center mr-3">
                                        <Ionicons 
                                            name="wallet-outline" 
                                            size={24} 
                                            color={focusedField === 'price' ? '#3B82F6' : '#262626'} 
                                        />
                                    </View>
                                    <View className="flex-1 flex-row items-center">
                                        <Pressable onPress={() => setShowCurrencyModal(true)} className="flex-row items-center mr-2">
                                            <Text className={`text-base font-bold mr-1 ${focusedField === 'price' ? 'text-blue-500' : 'text-black'}`}>{currency}</Text>
                                            <Ionicons name="chevron-down" size={12} color={focusedField === 'price' ? '#3B82F6' : '#6B7280'} />
                                        </Pressable>
                                        <TextInput
                                            value={price}
                                            onChangeText={setPrice}
                                            onFocus={() => setFocusedField('price')}
                                            onBlur={() => setFocusedField(null)}
                                            placeholder="0.00"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="numeric"
                                            className="flex-1 text-base text-black"
                                            style={{ minHeight: 44, paddingBottom: 10, paddingTop: 10, outlineStyle: 'none' }}
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
                                <View className={`py-2 px-3 mt-2 rounded-lg border ${focusedField === 'notes' ? 'border-blue-500 bg-white' : 'border-gray-100 bg-gray-50/50'}`}>
                                    <TextInput
                                        value={notes}
                                        onChangeText={setNotes}
                                        onFocus={() => setFocusedField('notes')}
                                        onBlur={() => setFocusedField(null)}
                                        placeholder="Write a caption..."
                                        placeholderTextColor="#9CA3AF"
                                        multiline
                                        className="text-base text-black min-h-[100px]"
                                        style={{ paddingTop: 8, paddingBottom: 16, outlineStyle: 'none' }}
                                        includeFontPadding={false}
                                        textAlignVertical="top"
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    {step === 3 && (
                        /* Step 3: Live Feed Polaroid Card Preview */
                        <View className="p-4 bg-gray-50/50">
                            <Text className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4 text-center mt-2">
                                Feed Post Preview
                            </Text>
                            <View className="bg-white rounded-3xl overflow-hidden shadow-md border border-neutral-100 mb-8">
                                <ReviewCard 
                                    review={{
                                        dish_name: dish,
                                        restaurant_name: restaurantName,
                                        rating: rating,
                                        notes: notes,
                                        photo_url: photos[0],
                                        price: parseFloat(price) || 0,
                                        currency: currency,
                                        created_at: new Date().toISOString(),
                                        avatar_url: profile?.avatar_url,
                                        username: profile?.username || 'You'
                                    }} 
                                />
                            </View>
                        </View>
                    )}
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
            </Animated.View>
        </View>
    );
}
