import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useEffect, useState, useRef } from 'react';
import { Alert, Animated, Image, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import CurrencyPicker from '../components/CurrencyPicker';
import { useReviews } from '../context/ReviewsContext';
import { useAuth } from '../context/AuthContext';
import ReviewCard from '../components/ReviewCard';
import { prepareUploadPayload } from '../utils/uploadHelper';
import { useColorScheme } from 'nativewind';

export default function ModalScreen() {
    const router = useRouter();
    const { profile } = useAuth();
    const { width } = useWindowDimensions();
    const containerWidth = Math.min(width, 600);
    const params = useLocalSearchParams();
    const isEditing = !!params.id;
    const { addReview, updateReview, reviews } = useReviews();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

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
    const [visibility, setVisibility] = useState('shared');
    const [dateOrdered, setDateOrdered] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showCurrencyModal, setShowCurrencyModal] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showDishSuggestions, setShowDishSuggestions] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    const [activeIndex, setActiveIndex] = useState(0);
    const modalScrollViewRef = useRef(null);
    const prevPhotosLength = useRef(0);

    // Rule: Can only recommend if rating is 4 stars or above, and NOT in edit mode
    useEffect(() => {
        if (isEditing || rating < 4) {
            if (visibility === 'recommended') {
                setVisibility('shared');
            }
        }
    }, [rating, isEditing, visibility]);

    const handleModalScroll = (event) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const viewSize = event.nativeEvent.layoutMeasurement.width;
        if (viewSize > 0) {
            const index = Math.round(contentOffset / viewSize);
            setActiveIndex(index);
        }
    };

    const scrollToModalImage = (index) => {
        if (index >= 0 && index < photos.length) {
            modalScrollViewRef.current?.scrollTo({ x: index * containerWidth, animated: true });
            setActiveIndex(index);
        }
    };

    // Smart auto-scroll: automatically focus the newly added photo in the carousel
    useEffect(() => {
        if (photos.length > prevPhotosLength.current && prevPhotosLength.current > 0) {
            const targetIndex = photos.length - 1;
            setTimeout(() => {
                scrollToModalImage(targetIndex);
            }, 150);
        }
        prevPhotosLength.current = photos.length;
    }, [photos.length]);

    // Compute unique restaurant names from past reviews
    const allUniquePlaces = Array.from(new Set(reviews?.filter(r => r.restaurant_name).map(r => r.restaurant_name) || []));
    
    // Filter places based on current input
    const filteredRestaurants = restaurantName.trim() === '' 
        ? [] // Return empty array if user hasn't typed anything yet
        : allUniquePlaces.filter(place => place.toLowerCase().includes(restaurantName.trim().toLowerCase()));

    // Compute unique dish names from past reviews
    const allUniqueDishes = Array.from(new Set(reviews?.filter(r => r.dish_name).map(r => r.dish_name) || []));

    // Filter dishes based on current input
    const filteredDishes = dish.trim() === ''
        ? [] // Return empty array if user hasn't typed anything yet
        : allUniqueDishes.filter(item => item.toLowerCase().includes(dish.trim().toLowerCase()));

    useEffect(() => {
        if (isEditing) {
            setRestaurantName(params.restaurant_name || '');
            setDish(params.dish_name || '');
            setRating(Number(params.rating) || 0);
            setNotes(params.notes || '');
            if (params.photos) {
                try {
                    const parsed = typeof params.photos === 'string' ? JSON.parse(params.photos) : params.photos;
                    setPhotos(Array.isArray(parsed) ? parsed : [parsed]);
                } catch (e) {
                    setPhotos(String(params.photos).split(',').map(u => u.trim()).filter(Boolean));
                }
            } else if (params.photo_url) {
                if (String(params.photo_url).includes(',')) {
                    setPhotos(String(params.photo_url).split(',').map(u => u.trim()).filter(Boolean));
                } else {
                    setPhotos([params.photo_url]);
                }
            }
            setPrice(params.price ? String(params.price) : '');
            setCurrency(params.currency || 'PHP');
            setVisibility(params.visibility || 'shared');
            setDateOrdered(params.date_ordered ? new Date(params.date_ordered) : new Date());
        }
    }, [params.id]);

    const takePhoto = async (index = null) => {
        try {
            if (index === null && photos.length >= 5) {
                Alert.alert(
                    "Maximum Limit Reached 📸",
                    "You can upload a maximum of 5 photos per post to keep your feed clean and snappy!"
                );
                return;
            }

            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    "Permission Denied 🚫",
                    "Sorry, we need camera permissions to make this work! Please enable them in your settings."
                );
                return;
            }

            let result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.5,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newUri = result.assets[0].uri;
                if (index !== null && index >= 0 && index < photos.length) {
                    const updatedPhotos = [...photos];
                    updatedPhotos[index] = newUri;
                    setPhotos(updatedPhotos);
                } else {
                    setPhotos([...photos, newUri]);
                }
            }
        } catch (error) {
            console.error("Error taking photo:", error);
            Alert.alert("Error", "Failed to launch camera: " + error.message);
        }
    };

    const pickImageFromLibrary = async (index = null) => {
        try {
            if (index === null && photos.length >= 5) {
                Alert.alert(
                    "Maximum Limit Reached 📸",
                    "You can upload a maximum of 5 photos per post to keep your feed clean and snappy!"
                );
                return;
            }

            if (Platform.OS !== 'web') {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(
                        "Permission Denied 🚫",
                        "Sorry, we need gallery permissions to browse photos! Please enable them in your settings."
                    );
                    return;
                }
            }

            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                allowsMultipleSelection: index === null, // only allow multiple if adding new photos
                quality: 0.5,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedUris = result.assets.map(asset => asset.uri);
                if (index !== null && index >= 0 && index < photos.length) {
                    const updatedPhotos = [...photos];
                    updatedPhotos[index] = selectedUris[0];
                    setPhotos(updatedPhotos);
                } else {
                    const remainingSlots = 5 - photos.length;
                    const urisToAdd = selectedUris.slice(0, remainingSlots);
                    
                    if (selectedUris.length > remainingSlots) {
                        Alert.alert(
                            "Photos Limited 📸",
                            `Only ${remainingSlots} photos were added to respect the 5-photo limit.`
                        );
                    }
                    setPhotos([...photos, ...urisToAdd]);
                }
            }
        } catch (error) {
            console.error("Error picking image:", error);
            Alert.alert("Error", "Failed to select photo: " + error.message);
        }
    };

    const handlePhotoSelection = async (index = null) => {
        if (Platform.OS === 'web') {
            await pickImageFromLibrary(index);
        } else {
            Alert.alert(
                "Select Photo Source 📸",
                "Choose how you want to add your photo:",
                [
                    {
                        text: "Take Photo 📸",
                        onPress: () => takePhoto(index),
                    },
                    {
                        text: "Photo Library 🖼️",
                        onPress: () => pickImageFromLibrary(index),
                    },
                    {
                        text: "Cancel",
                        style: "cancel",
                    },
                ],
                { cancelable: true }
            );
        }
    };

    const removePhoto = (index) => {
        const newPhotos = [...photos];
        newPhotos.splice(index, 1);
        setPhotos(newPhotos);

        // Adjust active index if index deletion affects current position
        if (activeIndex >= newPhotos.length) {
            const newIndex = Math.max(0, newPhotos.length - 1);
            setActiveIndex(newIndex);
            setTimeout(() => {
                modalScrollViewRef.current?.scrollTo({ x: newIndex * containerWidth, animated: true });
            }, 100);
        }
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
            const uploadedPhotoUrls = [];

            for (const uri of photos) {
                if (uri.startsWith('http')) {
                    uploadedPhotoUrls.push(uri);
                } else {
                    let finalUri = uri;
                    
                    try {
                        // FORCE COMPRESSION: Resize and compress the image to guarantee small file sizes
                        const manipulatedImage = await ImageManipulator.manipulateAsync(
                            uri,
                            [{ resize: { width: 1080 } }], // Shrink to 1080p width max
                            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG } // High-quality compression (80%)
                        );
                        finalUri = manipulatedImage.uri;
                    } catch (manipulateError) {
                        console.warn("Failed to compress image, using raw:", manipulateError);
                    }

                    const uploadPayload = await prepareUploadPayload(finalUri);
                    const fileExt = 'jpg';
                    const fileName = `review_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                    
                    const { data, error } = await supabase.storage
                        .from('review-images')
                        .upload(fileName, uploadPayload, { contentType: `image/${fileExt}` });
                        
                    if (error) {
                        throw error;
                    }
                    
                    // Get the public URL for the uploaded file
                    const { data: publicData } = supabase.storage
                        .from('review-images')
                        .getPublicUrl(data.path);
                        
                    uploadedPhotoUrls.push(publicData.publicUrl);
                }
            }

            const joinedUrlsStr = uploadedPhotoUrls.join(',');

            const reviewData = {
                dish_name: dish,
                restaurant_name: restaurantName,
                rating,
                notes,
                photos: uploadedPhotoUrls,
                photo_url: joinedUrlsStr,
                price: parseFloat(price) || 0,
                currency,
                visibility,
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
                <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#09090b' : 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }}>
                    {/* Grab Handle */}
                    <View className="items-center py-2.5 bg-white dark:bg-zinc-950">
                        <View className="w-10 h-1 bg-gray-200 dark:bg-zinc-800 rounded-full" />
                    </View>

                    {/* Header: Dynamic Step Navigation */}
                    <View className="flex-row justify-between items-center px-4 pb-3 border-b border-gray-100 dark:border-zinc-900 bg-white dark:bg-zinc-950">
                        {step === 1 ? (
                            <Pressable onPress={handleDismiss}>
                                <Ionicons name="close-outline" size={28} color={isDark ? '#F4F4F5' : '#262626'} />
                            </Pressable>
                        ) : (
                            <Pressable onPress={() => setStep(step - 1)}>
                                <Ionicons name="chevron-back" size={28} color={isDark ? '#F4F4F5' : '#262626'} />
                            </Pressable>
                        )}

                        <Text className="text-base font-bold text-black dark:text-white">
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
                                disabled={notes.length > 500 || !(restaurantName.trim() && dish.trim() && price.trim() && rating > 0)}
                                onPress={() => {
                                    if (notes.length > 500) return;
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
                                <Text className={`font-bold text-base ${(restaurantName.trim() && dish.trim() && price.trim() && rating > 0 && notes.length <= 500) ? 'text-blue-500' : 'text-gray-300'}`}>
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
                        <View className="bg-gray-50 dark:bg-zinc-950 border-b border-gray-100 dark:border-zinc-900 relative overflow-hidden" style={{ width: containerWidth, height: containerWidth }}>
                            {photos.length > 0 ? (
                                <View className="w-full h-full relative">
                                    <ScrollView 
                                        ref={modalScrollViewRef}
                                        horizontal 
                                        pagingEnabled 
                                        showsHorizontalScrollIndicator={false} 
                                        showsVerticalScrollIndicator={false}
                                        onScroll={handleModalScroll}
                                        scrollEventThrottle={16}
                                        style={{ width: containerWidth, height: containerWidth }}
                                        contentContainerStyle={{ height: containerWidth }}
                                    >
                                        {photos.map((uri, index) => (
                                            <View key={index} className="relative overflow-hidden" style={{ width: containerWidth, height: containerWidth }}>
                                                <Pressable
                                                    onPress={() => handlePhotoSelection(index)}
                                                    className="w-full h-full"
                                                >
                                                    <Image
                                                        source={{ uri }}
                                                        className="w-full h-full"
                                                        resizeMode="cover"
                                                    />
                                                </Pressable>
                                                
                                                {/* Replace Photo Pencil Button */}
                                                <Pressable
                                                    onPress={() => handlePhotoSelection(index)}
                                                    className="absolute top-4 left-4 bg-black/60 rounded-full p-2"
                                                    style={{ zIndex: 10 }}
                                                >
                                                    <Ionicons name="create-outline" size={16} color="white" />
                                                </Pressable>
                                                
                                                {/* Remove Photo Close Button */}
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

                                    {/* Active Photo Pill Indicator */}
                                    <View 
                                        className="absolute top-4 bg-black/60 rounded-full px-3 py-1 flex-row items-center justify-center"
                                        style={{ 
                                            zIndex: 30,
                                            left: '50%',
                                            transform: [{ translateX: -60 }]
                                        }}
                                    >
                                        <Text className="text-white text-xs font-bold text-center">
                                            {activeIndex + 1} of {photos.length} ({photos.length}/5)
                                        </Text>
                                    </View>

                                    {/* Left Chevron Button */}
                                    {photos.length > 1 && activeIndex > 0 && (
                                        <Pressable
                                            onPress={() => scrollToModalImage(activeIndex - 1)}
                                            className="absolute left-3 top-1/2 -mt-5 bg-black/40 rounded-full p-2 items-center justify-center"
                                            style={{ zIndex: 30 }}
                                        >
                                            <Ionicons name="chevron-back" size={20} color="white" />
                                        </Pressable>
                                    )}

                                    {/* Right Chevron Button */}
                                    {photos.length > 1 && activeIndex < photos.length - 1 && (
                                        <Pressable
                                            onPress={() => scrollToModalImage(activeIndex + 1)}
                                            className="absolute right-3 top-1/2 -mt-5 bg-black/40 rounded-full p-2 items-center justify-center"
                                            style={{ zIndex: 30 }}
                                        >
                                            <Ionicons name="chevron-forward" size={20} color="white" />
                                        </Pressable>
                                    )}

                                    {/* Dot Indicators */}
                                    {photos.length > 1 && (
                                        <View className="absolute bottom-4 left-0 right-0 flex-row justify-center space-x-1.5" style={{ zIndex: 30 }}>
                                            {photos.map((_, index) => (
                                                <Pressable
                                                    key={index}
                                                    onPress={() => scrollToModalImage(index)}
                                                    className={`h-2 rounded-full ${index === activeIndex ? 'w-4 bg-white' : 'w-2 bg-white/50'}`}
                                                />
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <Pressable
                                    onPress={() => handlePhotoSelection()}
                                    className="w-full h-full items-center justify-center space-y-2 px-6 bg-gray-50 dark:bg-zinc-950"
                                >
                                    <View className="w-16 h-16 rounded-full bg-gray-200 dark:bg-zinc-800 items-center justify-center mb-1">
                                        <Ionicons name="camera" size={32} color={isDark ? "#A3A3A3" : "#9CA3AF"} />
                                    </View>
                                    <Text className="text-gray-700 dark:text-zinc-300 font-bold text-lg">Max 5 photos.</Text>
                                    <Text className="text-gray-400 dark:text-zinc-500 text-sm text-center px-4 mt-1">Just give us the absolute chef's kiss angle. 🤌🏼</Text>
                                </Pressable>
                            )}

                            {/* Add more photos button (floating if photos exist and we have less than 5 slots taken) */}
                            {photos.length > 0 && photos.length < 5 && (
                                <Pressable
                                    onPress={() => handlePhotoSelection()}
                                    className="absolute bottom-4 right-4 bg-black/60 rounded-full py-1.5 px-3 flex-row items-center space-x-1"
                                    style={{ zIndex: 40 }}
                                >
                                    <Ionicons name="images" size={14} color="white" />
                                    <Text className="text-white text-xs font-bold pl-0.5">Add ({photos.length}/5)</Text>
                                </Pressable>
                            )}
                        </View>
                    )}

                    {step === 2 && (
                        /* Step 2: Form Details */
                        <View>
                            {/* Miniature Photo Thumbnail preview at the top of Step 2 */}
                            {photos.length > 0 && (
                                <View className="flex-row items-center px-5 py-4 border-b border-gray-100 dark:border-zinc-900 bg-gray-50 dark:bg-zinc-900/40">
                                    <Image 
                                        source={{ uri: photos[0] }} 
                                        style={{ width: 56, height: 56, borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#27272A' : '#E5E7EB' }} 
                                        resizeMode="cover"
                                    />
                                    <View className="ml-4 flex-1">
                                        <Text className="text-gray-800 dark:text-zinc-200 font-bold text-sm" numberOfLines={1}>{dish || 'What did you eat?'}</Text>
                                        <Text className="text-gray-500 dark:text-zinc-400 text-xs mt-0.5" numberOfLines={1}>{restaurantName || 'Which restaurant?'}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Form Fields - Instagram Style List */}
                            <View className="px-4 py-2">
                                {/* Dish Name */}
                                <View className="z-20 relative">
                                    <View className={`flex-row items-center py-4 border-b ${focusedField === 'dish' ? 'border-blue-500' : 'border-gray-100 dark:border-zinc-900'}`}>
                                        <View className="w-8 items-center mr-3">
                                            <Ionicons 
                                                name="fast-food-outline" 
                                                size={24} 
                                                color={focusedField === 'dish' ? '#3B82F6' : (isDark ? '#A3A3A3' : '#262626')} 
                                            />
                                        </View>
                                        <TextInput
                                            value={dish}
                                            onChangeText={(text) => {
                                                setDish(text);
                                                setShowDishSuggestions(true);
                                            }}
                                            onFocus={() => {
                                                setFocusedField('dish');
                                                setShowDishSuggestions(true);
                                            }}
                                            onBlur={() => {
                                                setFocusedField(null);
                                                setTimeout(() => setShowDishSuggestions(false), 200);
                                            }}
                                            placeholder="Name of the dish..."
                                            placeholderTextColor="#71717A"
                                            className="flex-1 text-base text-black dark:text-white"
                                            style={{ minHeight: 44, paddingBottom: 10, paddingTop: 10, outlineStyle: 'none' }}
                                        />
                                    </View>

                                    {/* Dish Autocomplete Suggestions */}
                                    {showDishSuggestions && filteredDishes.length > 0 && (
                                        <View 
                                            className="bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg absolute left-10 right-0 z-50 overflow-hidden"
                                            style={{ top: 60, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 }}
                                        >
                                            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 150 }}>
                                                {filteredDishes.map((item, index) => (
                                                    <Pressable 
                                                        key={index} 
                                                        className={`px-4 py-3 bg-gray-50 dark:bg-zinc-800 flex-row items-center ${index < filteredDishes.length - 1 ? 'border-b border-gray-200 dark:border-zinc-700' : ''}`}
                                                        onPressIn={() => {
                                                            setDish(item);
                                                            setShowDishSuggestions(false);
                                                        }}
                                                        onPress={() => {
                                                            setDish(item);
                                                            setShowDishSuggestions(false);
                                                        }}
                                                    >
                                                        <View className="mr-3">
                                                            <Ionicons name="fast-food-outline" size={18} color={isDark ? '#A3A3A3' : '#6B7280'} />
                                                        </View>
                                                        <Text className="text-base text-gray-800 dark:text-zinc-200 font-medium flex-1" numberOfLines={1}>{item}</Text>
                                                    </Pressable>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>

                                {/* Restaurant */}
                                <View className="z-10 relative">
                                    <View className={`flex-row items-center py-4 border-b ${focusedField === 'restaurant' ? 'border-blue-500' : 'border-gray-100 dark:border-zinc-900'}`}>
                                        <View className="w-8 items-center mr-3">
                                            <Ionicons 
                                                name="location-outline" 
                                                size={24} 
                                                color={focusedField === 'restaurant' ? '#3B82F6' : (isDark ? '#A3A3A3' : '#262626')} 
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
                                            placeholderTextColor="#71717A"
                                            className="flex-1 text-base text-black dark:text-white"
                                            style={{ minHeight: 44, paddingBottom: 10, paddingTop: 10, outlineStyle: 'none' }}
                                        />
                                    </View>
                                    
                                    {/* Autocomplete Suggestions */}
                                    {showSuggestions && filteredRestaurants.length > 0 && (
                                        <View 
                                            className="bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg absolute left-10 right-0 z-50 overflow-hidden"
                                            style={{ top: 60, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 }}
                                        >
                                            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 150 }}>
                                                {filteredRestaurants.map((place, index) => (
                                                    <Pressable 
                                                        key={index} 
                                                        className={`px-4 py-3 bg-gray-50 dark:bg-zinc-800 flex-row items-center ${index < filteredRestaurants.length - 1 ? 'border-b border-gray-200 dark:border-zinc-700' : ''}`}
                                                        onPressIn={() => {
                                                            setRestaurantName(place);
                                                            setShowSuggestions(false);
                                                        }}
                                                        onPress={() => {
                                                            setRestaurantName(place);
                                                            setShowSuggestions(false);
                                                        }}
                                                    >
                                                        <View className="mr-3">
                                                            <Ionicons name="search-outline" size={18} color={isDark ? '#A3A3A3' : '#6B7280'} />
                                                        </View>
                                                        <Text className="text-base text-gray-800 dark:text-zinc-200 font-medium flex-1" numberOfLines={1}>{place}</Text>
                                                    </Pressable>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>

                                {/* Price & Currency */}
                                <View className={`flex-row items-center py-4 border-b ${focusedField === 'price' ? 'border-blue-500' : 'border-gray-100 dark:border-zinc-900'}`}>
                                    <View className="w-8 items-center mr-3">
                                        <Ionicons 
                                            name="wallet-outline" 
                                            size={24} 
                                            color={focusedField === 'price' ? '#3B82F6' : (isDark ? '#A3A3A3' : '#262626')} 
                                        />
                                    </View>
                                    <View className="flex-1 flex-row items-center">
                                        <Pressable onPress={() => setShowCurrencyModal(true)} className="flex-row items-center mr-2">
                                            <Text className={`text-base font-bold mr-1 ${focusedField === 'price' ? 'text-blue-500' : 'text-black dark:text-white'}`}>{currency}</Text>
                                            <Ionicons name="chevron-down" size={12} color={focusedField === 'price' ? '#3B82F6' : '#6B7280'} />
                                        </Pressable>
                                        <TextInput
                                            value={price}
                                            onChangeText={setPrice}
                                            onFocus={() => setFocusedField('price')}
                                            onBlur={() => setFocusedField(null)}
                                            placeholder="0.00"
                                            placeholderTextColor="#71717A"
                                            keyboardType="numeric"
                                            className="flex-1 text-base text-black dark:text-white"
                                            style={{ minHeight: 44, paddingBottom: 10, paddingTop: 10, outlineStyle: 'none' }}
                                        />
                                    </View>
                                </View>

                                {/* Date */}
                                <View className="flex-row items-center py-4 border-b border-gray-100 dark:border-zinc-900">
                                    <View className="w-8 items-center mr-3">
                                        <Ionicons name="calendar-outline" size={24} color={isDark ? '#A3A3A3' : '#262626'} />
                                    </View>
                                    <Pressable onPress={() => setShowDatePicker(true)} className="flex-1">
                                        <Text className="text-base text-black dark:text-white">
                                            {dateOrdered.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </Text>
                                    </Pressable>
                                    {/* Today Shortcut */}
                                    <Pressable
                                        onPress={() => setDateOrdered(new Date())}
                                        className="bg-gray-100 dark:bg-zinc-800 px-3 py-1 rounded-md"
                                    >
                                        <Text className="text-xs font-bold text-gray-500 dark:text-zinc-400">Today</Text>
                                    </Pressable>
                                </View>

                                {/* Rating - Special Row */}
                                <View className="flex-row items-center py-4 border-b border-gray-100 dark:border-zinc-900 justify-between">
                                    <Text className="text-base text-gray-900 dark:text-white font-medium">Rating</Text>
                                    <View className="flex-row gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Pressable key={star} onPress={() => setRating(star)}>
                                                <Ionicons
                                                    name={star <= rating ? "star" : "star-outline"}
                                                    size={28}
                                                    color={star <= rating ? "#FBBF24" : (isDark ? '#52525B' : '#CCCCCC')}
                                                />
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>

                                {/* Audience Visibility Tiers Segmented Selector */}
                                <View className="py-4 border-b border-gray-100 dark:border-zinc-900">
                                    <Text className="text-base text-gray-900 dark:text-white font-bold mb-3">Audience Visibility</Text>
                                    <View className="flex-row bg-gray-100 dark:bg-zinc-800 p-1 rounded-2xl justify-between">
                                        {[
                                            { key: 'private', label: 'Personal', desc: 'Journal', iconName: 'lock-closed', iconType: 'ionicons' },
                                            { key: 'shared', label: 'Shared', desc: 'Chowmates', iconName: 'people', iconType: 'ionicons' },
                                            ...(isEditing || rating < 4 ? [] : [{ key: 'recommended', label: 'Recommend', desc: 'Notify Chowmates', iconName: 'chef-hat', iconType: 'material' }])
                                        ].map((item) => {
                                            const isSelected = visibility === item.key;
                                            return (
                                                <TouchableOpacity
                                                    key={item.key}
                                                    onPress={() => setVisibility(item.key)}
                                                    className={`flex-1 items-center py-2 px-0.5 rounded-xl ${isSelected ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''}`}
                                                    activeOpacity={0.8}
                                                >
                                                    <View className="flex-row items-center gap-1.5 justify-center">
                                                        {item.iconType === 'ionicons' ? (
                                                            <Ionicons 
                                                                name={item.iconName} 
                                                                size={12} 
                                                                color={isSelected ? (isDark ? '#FFFFFF' : '#000000') : (isDark ? '#A3A3A3' : '#6B7280')} 
                                                            />
                                                        ) : (
                                                            <MaterialCommunityIcons 
                                                                name={item.iconName} 
                                                                size={13} 
                                                                color={isSelected ? (isDark ? '#FB7185' : '#E11D48') : (isDark ? '#A3A3A3' : '#6B7280')} 
                                                            />
                                                        )}
                                                        <Text className={`text-xs font-extrabold ${isSelected ? 'text-black dark:text-white' : 'text-gray-500 dark:text-zinc-400'}`}>
                                                            {item.label}
                                                        </Text>
                                                    </View>
                                                    <Text className={`text-[8px] mt-1 font-black uppercase tracking-wider ${isSelected ? 'text-neutral-900 dark:text-white' : 'text-gray-400 dark:text-zinc-500'}`}>
                                                        {item.desc}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Notes / Caption */}
                                <View className={`py-2 px-3 mt-2 rounded-lg border ${focusedField === 'notes' ? 'border-blue-500 bg-white dark:bg-zinc-900' : 'border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/10'}`} style={{ position: 'relative' }}>
                                    <TextInput
                                        value={notes}
                                        onChangeText={setNotes}
                                        onFocus={() => setFocusedField('notes')}
                                        onBlur={() => setFocusedField(null)}
                                        placeholder="Write a caption..."
                                        placeholderTextColor="#71717A"
                                        multiline={true}
                                        maxLength={500}
                                        className="text-base text-black dark:text-white min-h-[100px]"
                                        style={{ paddingTop: 8, paddingBottom: 24, outlineStyle: 'none' }}
                                        includeFontPadding={false}
                                        textAlignVertical="top"
                                    />
                                    <Text style={{ 
                                        position: 'absolute',
                                        bottom: 8,
                                        right: 12,
                                        fontSize: 10,
                                        fontWeight: '700',
                                        color: notes.length >= 450 ? '#ef4444' : '#71717A' 
                                    }}>
                                        {notes.length} / 500
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {step === 3 && (
                        /* Step 3: Live Feed Polaroid Card Preview */
                        <View className="p-4 bg-gray-50/50 dark:bg-zinc-900/10">
                            <Text className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4 text-center mt-2">
                                Feed Post Preview
                            </Text>
                            <View className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-md border border-neutral-100 dark:border-zinc-800 mb-8">
                                <ReviewCard 
                                    review={{
                                        dish_name: dish,
                                        restaurant_name: restaurantName,
                                        rating: rating,
                                        notes: notes,
                                        photo_url: photos[0],
                                        photos: photos,
                                        price: parseFloat(price) || 0,
                                        currency: currency,
                                        created_at: new Date().toISOString(),
                                        avatar_url: profile?.avatar_url,
                                        username: profile?.username || 'You',
                                        visibility: visibility
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
                                className="flex-1 bg-black/60"
                                onPress={() => setShowDatePicker(false)}
                            />
                            <View className="bg-white dark:bg-zinc-950 pb-4">
                                <View className="flex-row justify-between items-center p-4 border-b border-gray-100 dark:border-zinc-900 bg-gray-50 dark:bg-zinc-900">
                                    <Pressable onPress={() => setShowDatePicker(false)}>
                                        <Text className="text-gray-500 dark:text-zinc-400 text-base">Cancel</Text>
                                    </Pressable>
                                    <Text className="font-semibold text-base text-gray-900 dark:text-white">Select Date</Text>
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
                                    themeVariant={isDark ? "dark" : "light"}
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
                        themeVariant={isDark ? "dark" : "light"}
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
