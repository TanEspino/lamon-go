import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, Text, TouchableOpacity, View, StyleSheet, Animated, Image, Platform, ActivityIndicator } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useAlert, CustomAlert } from '../context/AlertContext';

export default function ScanQRScreen() {
    const router = useRouter();
    const { user, fetchBuddyStats, showToast } = useAuth();
    const { showAlert } = useAlert();

    const triggerAlert = (title, message, type = 'error') => {
        if (showToast) {
            showToast(title, message, type);
        } else {
            showAlert(title, message);
        }
    };

    const dataURLtoBlob = (dataurl) => {
        try {
            let arr = dataurl.split(','), 
                mime = arr[0].match(/:(.*?);/)[1],
                bstr = atob(arr[1]), 
                n = bstr.length, 
                u8arr = new Uint8Array(n);
            while(n--){
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new Blob([u8arr], {type:mime});
        } catch (e) {
            console.error("dataURLtoBlob conversion error:", e);
            return null;
        }
    };
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [scannedProfile, setScannedProfile] = useState(null);
    const [loadingRequest, setLoadingRequest] = useState(false);
    const [loadingImageScan, setLoadingImageScan] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [cardFeedback, setCardFeedback] = useState(null);

    // Animation values
    const slideAnim = useRef(new Animated.Value(150)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const checkCameraPermissions = async () => {
            try {
                if (Platform.OS === 'web') {
                    setHasPermission(false);
                    return;
                }
                // Check existing status silently first (won't trigger OS native prompt during screen transitions!)
                const { status } = await Camera.getCameraPermissionsAsync();
                if (status === 'granted') {
                    setHasPermission(true);
                } else {
                    setHasPermission('prompt'); // Show the beautiful premium pre-permission page
                }
            } catch (e) {
                console.error("Camera permission check error in scan-qr:", e);
                setHasPermission('prompt');
            }
        };

        checkCameraPermissions();

        Animated.parallel([
            Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
        ]).start();
    }, []);

    const requestCameraPermission = async () => {
        try {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        } catch (e) {
            console.error("Camera permission request error:", e);
            setHasPermission(false);
        }
    };

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: 150, duration: 250, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true })
        ]).start(() => {
            router.dismiss();
        });
    };

    const handleBarCodeScanned = async ({ type, data }) => {
        if (scanned) return;
        setScanned(true);

        try {
            // Check if data is a valid UUID (simple check or let DB fail)
            if (!data || data.length < 30 || data === user?.id) {
                triggerAlert("Invalid QR", "This does not seem to be a valid Chowmate code.");
                setScanned(false);
                return;
            }

            const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data)
                .single();

            if (error || !profileData) {
                triggerAlert("Not Found", "User not found.");
                setScanned(false);
                return;
            }

            // Pre-fetch relationship status immediately to show accurate inline states
            const { data: relData, error: relError } = await supabase
                .from('buddies')
                .select('*')
                .or(`and(requester_id.eq.${user.id},receiver_id.eq.${profileData.id}),and(requester_id.eq.${profileData.id},receiver_id.eq.${user.id})`);

            if (!relError && relData && relData.length > 0) {
                const relationship = relData[0];
                if (relationship.status === 'accepted') {
                    setConnectionStatus('accepted');
                } else if (relationship.status === 'pending') {
                    if (relationship.requester_id === user.id) {
                        setConnectionStatus('pending_sent');
                    } else {
                        setConnectionStatus('pending_received');
                    }
                } else {
                    setConnectionStatus(null);
                }
            } else {
                setConnectionStatus(null);
            }

            setCardFeedback(null);
            setScannedProfile(profileData);
        } catch (error) {
            console.error(error);
            triggerAlert("Error", "Failed to load profile.");
            setScanned(false);
        }
    };

    const sendBuddyRequest = async () => {
        if (!scannedProfile || !user) return;
        setLoadingRequest(true);
        setCardFeedback(null);

        try {
            const { error } = await supabase
                .from('buddies')
                .insert({
                    requester_id: user.id,
                    receiver_id: scannedProfile.id,
                    status: 'pending'
                });

            if (error) {
                if (error.code === '23505') {
                    setConnectionStatus('pending_sent');
                    setCardFeedback("Request already sent or you are already Chowmates.");
                    if (showToast) {
                        showToast("Chowmate Request", "Request already sent or you are already Chowmates.", "info");
                    }
                } else {
                    throw error;
                }
            } else {
                // Success! Set inline states and feedback
                setConnectionStatus('pending_sent');
                setCardFeedback("Chowmate request sent successfully!");
                if (showToast) {
                    showToast("🍕 Request Sent!", `Chowmate request sent to @${scannedProfile.username}!`, "success");
                }
                
                // Refresh global buddy badge counts immediately
                if (fetchBuddyStats) {
                    fetchBuddyStats();
                }
            }
        } catch (error) {
            console.error("Error sending request", error);
            setCardFeedback("Could not send Chowmate request.");
            if (showToast) {
                showToast("Error", "Could not send Chowmate request.", "error");
            }
        } finally {
            setLoadingRequest(false);
        }
    };

    const cancelBuddyRequest = async () => {
        if (!scannedProfile || !user) return;
        setLoadingRequest(true);
        setCardFeedback(null);

        try {
            const { error } = await supabase
                .from('buddies')
                .delete()
                .eq('requester_id', user.id)
                .eq('receiver_id', scannedProfile.id)
                .eq('status', 'pending');

            if (error) throw error;

            // Success! Revert status and feedback
            setConnectionStatus(null);
            setCardFeedback("Chowmate request cancelled successfully.");
            if (showToast) {
                showToast("❌ Request Cancelled", `Chowmate request to @${scannedProfile.username} was cancelled.`, "success");
            }
            
            // Refresh global buddy badge counts immediately
            if (fetchBuddyStats) {
                fetchBuddyStats();
            }
        } catch (error) {
            console.error("Error cancelling request", error);
            setCardFeedback("Could not cancel Chowmate request.");
            if (showToast) {
                showToast("Error", "Could not cancel Chowmate request.", "error");
            }
        } finally {
            setLoadingRequest(false);
        }
    };

    const pickAndScanImage = async () => {
        try {
            // 1. Request photo library permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                triggerAlert("Permission Denied", "We need access to your photo library to upload a QR code.");
                return;
            }

            // 2. Open library picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 1,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const pickedUri = result.assets[0].uri;
            
            // Block scanner and show our beautiful spinner
            setScanned(true);
            setLoadingImageScan(true);

            // 3. Prepare FormData (cross-platform compatible)
            const formData = new FormData();
            
            if (Platform.OS === 'web') {
                const fileObj = result.assets[0].file;
                if (fileObj) {
                    // Method A: Use standard web File object directly
                    formData.append('file', fileObj);
                } else if (pickedUri.startsWith('data:')) {
                    // Method B: Convert base64 data URI directly to Blob synchronously
                    const blob = dataURLtoBlob(pickedUri);
                    if (blob) {
                        formData.append('file', blob, 'photo.jpg');
                    } else {
                        throw new Error("Base64 blob conversion failed");
                    }
                } else {
                    // Method C: Fallback to fetch for blob: URLs or external assets
                    const blobResponse = await fetch(pickedUri);
                    const blob = await blobResponse.blob();
                    formData.append('file', blob, 'photo.jpg');
                }
            } else {
                const uriParts = pickedUri.split('.');
                const fileType = uriParts[uriParts.length - 1];
                formData.append('file', {
                    uri: pickedUri,
                    name: `photo.${fileType}`,
                    type: `image/${fileType === 'png' ? 'png' : 'jpeg'}`
                });
            }

            // 4. Send to public QRServer decoder API
            const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
                method: 'POST',
                body: formData,
            });

            const responseData = await response.json();
            setLoadingImageScan(false);

            if (
                responseData &&
                responseData[0] &&
                responseData[0].symbol &&
                responseData[0].symbol[0] &&
                responseData[0].symbol[0].data
            ) {
                const qrData = responseData[0].symbol[0].data;
                // Defer to scanned handler
                handleBarCodeScanned({ type: 'qr', data: qrData });
            } else {
                const errorMsg = responseData?.[0]?.symbol?.[0]?.error || "Could not find a valid QR code in this image.";
                triggerAlert("Scan Failed", errorMsg);
                setScanned(false);
            }
        } catch (error) {
            setLoadingImageScan(false);
            console.error("Image pick and scan error", error);
            triggerAlert("Error", "Failed to read QR code from the selected image.");
            setScanned(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950">
            <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                {/* Header */}
                <View className="flex-row items-center px-4 bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800" style={{ height: 60 }}>
                    <TouchableOpacity onPress={handleClose} className="p-2 -ml-2 rounded-full active:bg-gray-200 dark:active:bg-zinc-800">
                        <Ionicons name="close" size={26} color={isDark ? '#F4F4F5' : '#18181B'} />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-gray-900 dark:text-zinc-50 ml-3">Scan Chowmate QR</Text>
                </View>

                {/* Content */}
                <View className="flex-1 bg-black relative">
                    {hasPermission === null ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#09090B' : '#FFFFFF' }}>
                            <ActivityIndicator size="large" color="#40E0D0" />
                            <Text style={{ color: isDark ? '#A1A1AA' : '#6B7280', fontWeight: '500', marginTop: 12 }}>Checking camera status...</Text>
                        </View>
                    ) : hasPermission === 'prompt' ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: isDark ? '#09090B' : '#FFFFFF' }}>
                            <Ionicons name="camera-outline" size={64} color="#40E0D0" style={{ marginBottom: 20 }} />
                            <Text style={{ fontSize: 20, fontWeight: '900', color: isDark ? '#FFFFFF' : '#111827', textAlign: 'center', marginBottom: 8 }}>Camera Access Required</Text>
                            <Text style={{ fontSize: 14, color: isDark ? '#A1A1AA' : '#6B7280', textAlign: 'center', marginBottom: 32, paddingHorizontal: 20, lineHeight: 22 }}>
                                To scan a friend's Chowmate QR code instantly, lamon.go needs permission to use your device camera.
                            </Text>
                            
                            {/* Enable Camera Button */}
                            <TouchableOpacity 
                                onPress={requestCameraPermission}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: '#E11D48',
                                    paddingVertical: 14,
                                    paddingHorizontal: 32,
                                    borderRadius: 16,
                                    shadowColor: '#E11D48',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 8,
                                    elevation: 6,
                                    marginBottom: 16
                                }}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="videocam-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                                    Enable Camera
                                </Text>
                            </TouchableOpacity>

                            {/* Secondary Upload QR Image Button */}
                            <TouchableOpacity 
                                onPress={pickAndScanImage}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingVertical: 12,
                                    paddingHorizontal: 24,
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="image-outline" size={18} color="#40E0D0" style={{ marginRight: 6 }} />
                                <Text style={{ color: '#40E0D0', fontWeight: '700', fontSize: 14 }}>
                                    Or, Upload QR Image
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : hasPermission === false ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: isDark ? '#09090B' : '#FFFFFF' }}>
                            <Ionicons name="videocam-off-outline" size={56} color={isDark ? '#A3A3A3' : '#6B7280'} style={{ marginBottom: 16 }} />
                            <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#FFFFFF' : '#111827', textAlign: 'center', marginBottom: 8 }}>Camera Unavailable</Text>
                            <Text style={{ fontSize: 14, color: isDark ? '#A1A1AA' : '#6B7280', textAlign: 'center', marginBottom: 24, paddingHorizontal: 16, lineHeight: 20 }}>
                                Camera access is denied or unavailable. Please upload a Chowmate QR code image directly:
                            </Text>
                            
                            {/* Upload QR Image Button when Camera is blocked */}
                            <TouchableOpacity 
                                onPress={pickAndScanImage}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: '#40E0D0',
                                    paddingVertical: 12,
                                    paddingHorizontal: 24,
                                    borderRadius: 16,
                                    shadowColor: '#40E0D0',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.25,
                                    shadowRadius: 8,
                                    elevation: 6
                                }}
                                activeOpacity={0.8}
                            >
                                {loadingImageScan ? (
                                    <ActivityIndicator size="small" color="#111827" style={{ marginRight: 8 }} />
                                ) : (
                                    <Ionicons name="image-outline" size={20} color="#111827" style={{ marginRight: 8 }} />
                                )}
                                <Text style={{ color: '#111827', fontWeight: '800', fontSize: 14 }}>
                                    {loadingImageScan ? "Analyzing QR..." : "Upload Chowmate QR"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={{ flex: 1, position: 'relative' }}>
                            <CameraView
                                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                                barcodeScannerSettings={{
                                    barcodeTypes: ["qr"],
                                }}
                                style={StyleSheet.absoluteFillObject}
                            />

                            {/* Scanner Overlay (visual guide) */}
                            {!scannedProfile && (
                                <View className="flex-1 items-center justify-center relative">
                                    <View className="w-64 h-64 border-2 border-turquoise rounded-3xl" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
                                    <Text className="text-white font-bold mt-8 bg-black/50 px-4 py-2 rounded-full overflow-hidden text-xs">
                                        Position QR code within frame
                                    </Text>

                                    {/* Upload QR Image Button inside Scanner */}
                                    <TouchableOpacity 
                                        onPress={pickAndScanImage}
                                        className="absolute bottom-8 bg-zinc-900/80 border border-zinc-800 px-6 py-3 rounded-2xl flex-row items-center justify-center active:bg-zinc-800"
                                        activeOpacity={0.8}
                                    >
                                        {loadingImageScan ? (
                                            <ActivityIndicator size="small" color="#40E0D0" style={{ marginRight: 8 }} />
                                        ) : (
                                            <Ionicons name="image-outline" size={20} color="#40E0D0" style={{ marginRight: 8 }} />
                                        )}
                                        <Text className="text-white font-extrabold text-sm">
                                            {loadingImageScan ? "Analyzing QR..." : "Upload Chowmate QR"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Scanned Profile Modal */}
                    {scannedProfile && (
                        <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-3xl p-6 shadow-xl border-t border-gray-200 dark:border-zinc-800">
                            <View className="items-center relative w-full pt-4">
                                {/* Close Button in Top Right of scanned profile card */}
                                <TouchableOpacity 
                                    onPress={() => { setScannedProfile(null); setScanned(false); setConnectionStatus(null); setCardFeedback(null); }}
                                    className="absolute -top-1 -right-1 p-2 rounded-full bg-gray-100 dark:bg-zinc-800"
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="close" size={20} color={isDark ? '#F4F4F5' : '#18181B'} />
                                </TouchableOpacity>

                                <Image
                                    source={{ uri: scannedProfile.avatar_url || 'https://placehold.co/100x100/png?text=User' }}
                                    className="w-20 h-20 rounded-full border-2 border-turquoise mb-3"
                                />
                                <Text className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                                    @{scannedProfile.username || 'Guest'}
                                </Text>

                                <View className="flex-row w-full space-x-3">
                                    <TouchableOpacity
                                        onPress={() => { setScannedProfile(null); setScanned(false); setConnectionStatus(null); setCardFeedback(null); }}
                                        className="flex-1 bg-gray-100 dark:bg-zinc-800 py-3 rounded-xl items-center mr-2"
                                    >
                                        <Text className="font-bold text-gray-900 dark:text-white">
                                            {connectionStatus ? "Scan Again" : "Cancel"}
                                        </Text>
                                    </TouchableOpacity>
                                    
                                    {connectionStatus === 'pending_sent' ? (
                                        <TouchableOpacity
                                            onPress={cancelBuddyRequest}
                                            disabled={loadingRequest}
                                            style={{ 
                                                flex: 1, 
                                                paddingVertical: 12, 
                                                borderRadius: 12, 
                                                alignItems: 'center', 
                                                marginLeft: 8,
                                                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)'
                                            }}
                                        >
                                            <Text style={{ fontWeight: 'bold', color: '#EF4444' }}>
                                                {loadingRequest ? "Cancelling..." : "Cancel Request"}
                                            </Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={sendBuddyRequest}
                                            disabled={loadingRequest || connectionStatus !== null}
                                            style={{ 
                                                flex: 1, 
                                                paddingVertical: 12, 
                                                borderRadius: 12, 
                                                alignItems: 'center', 
                                                marginLeft: 8,
                                                backgroundColor: connectionStatus !== null 
                                                    ? (isDark ? '#27272A' : '#E5E7EB') 
                                                    : '#E11D48'
                                            }}
                                        >
                                            <Text 
                                                style={{ 
                                                    fontWeight: 'bold', 
                                                    color: connectionStatus !== null 
                                                        ? (isDark ? '#A1A1AA' : '#6B7280') 
                                                        : '#FFFFFF' 
                                                }}
                                            >
                                                {loadingRequest 
                                                    ? "Sending..." 
                                                    : connectionStatus === 'pending_received' 
                                                        ? "Request Received"
                                                        : connectionStatus === 'accepted' 
                                                            ? "Already Chowmates" 
                                                            : "Add Chowmate"}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Beautiful Inline Card Feedback */}
                                {cardFeedback && (
                                    <View className="flex-row items-center mt-4 bg-gray-50 dark:bg-zinc-800/30 px-3 py-2.5 rounded-xl border border-gray-100 dark:border-zinc-800 w-full justify-center">
                                        <Ionicons 
                                            name={cardFeedback.includes("successfully") ? "checkmark-circle" : "information-circle"} 
                                            size={16} 
                                            color={cardFeedback.includes("successfully") ? "#10B981" : "#F59E0B"} 
                                            style={{ marginRight: 6 }} 
                                        />
                                        <Text 
                                            className="text-xs font-bold"
                                            style={{ 
                                                color: cardFeedback.includes("successfully") 
                                                    ? "#10B981" 
                                                    : (cardFeedback.includes("Could not") ? "#EF4444" : (isDark ? '#A1A1AA' : '#4B5563')) 
                                            }}
                                        >
                                            {cardFeedback}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </View>
            </Animated.View>
            <CustomAlert />
        </SafeAreaView>
    );
}
