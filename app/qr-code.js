import React, { useState, useEffect, useRef } from 'react';
import { Text, TouchableOpacity, View, StyleSheet, Animated, Image, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import QRCode from 'react-native-qrcode-svg';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { savePass } from '../utils/savePassHelper';
import { useAlert, CustomAlert } from '../context/AlertContext';



export default function UnifiedQRCodeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const topInset = Platform.OS === 'ios' ? 0 : insets.top;
    const { profile, user, fetchBuddyStats, showToast } = useAuth();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { showAlert } = useAlert();

    // Screen Modes: 'scan' (Camera Scanner) or 'generate' (Show QR Code)
    const [mode, setMode] = useState('scan'); 

    // Camera Scanning States
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [scannedProfile, setScannedProfile] = useState(null);
    const [loadingRequest, setLoadingRequest] = useState(false);
    const [loadingImageScan, setLoadingImageScan] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [cardFeedback, setCardFeedback] = useState(null);

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

    // Animation values for transition
    const slideAnim = useRef(new Animated.Value(150)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const qrSvgRef = useRef();
    const viewShotRef = useRef();

    useEffect(() => {
        // Silent permission check on mount (won't trigger OS native prompt during screen transitions!)
        const checkCameraPermissions = async () => {
            if (Platform.OS === 'web') {
                setHasPermission(false);
                return;
            }
            try {
                const { status } = await Camera.getCameraPermissionsAsync();
                if (status === 'granted') {
                    setHasPermission(true);
                } else {
                    setHasPermission('prompt'); // Show the beautiful pre-permission page
                }
            } catch (e) {
                console.error("Camera permission error in qr-code:", e);
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

    const saveQRCode = async () => {
        await savePass({
            qrSvgRef,
            viewShotRef,
            username: profile?.username
        });
    };

    const pickAndScanImage = async () => {
        try {
            // 1. Request photo library permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                showAlert("Permission Denied", "We need access to your photo library to upload a QR code.");
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
                showAlert("Scan Failed", errorMsg);
                setScanned(false);
            }
        } catch (error) {
            setLoadingImageScan(false);
            console.error("Image pick and scan error", error);
            showAlert("Error", "Failed to read QR code from the selected image.");
            setScanned(false);
        }
    };

    const handleBarCodeScanned = async ({ type, data }) => {
        if (scanned) return;
        setScanned(true);

        try {
            // Basic format validation
            if (!data || data.length < 30 || data === user?.id) {
                showAlert("Invalid QR", "This does not seem to be a valid Chowmate code.");
                setScanned(false);
                return;
            }

            const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data)
                .single();

            if (error || !profileData) {
                showAlert("Not Found", "User not found.");
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
            showAlert("Error", "Failed to load profile.");
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

    if (!user) return null;

    // Theme values depending on current mode and system appearance
    const isScanMode = mode === 'scan';

    // 1. Dynamic Screen Background Style (fully matches active system theme)
    const screenStyle = {
        flex: 1,
        backgroundColor: isDark ? '#09090B' : '#FFFFFF'
    };

    // 2. Dynamic Header Styles (fully matches system theme)
    const headerStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 60 + topInset,
        paddingTop: topInset,
        backgroundColor: isDark ? '#09090B' : '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#27272A' : '#E5E7EB'
    };

    const headerTextColor = isDark ? '#FFFFFF' : '#111827';
    const closeBtnColor = isDark ? '#F4F4F5' : '#18181B';

    // 3. Dynamic Card styles for Scanned Profile
    const profileCardStyle = {
        backgroundColor: isDark ? '#18181B' : '#FFFFFF',
        borderColor: isDark ? '#27272A' : '#E5E7EB',
        borderWidth: 1
    };
    const profileCardTextColor = isDark ? '#FFFFFF' : '#111827';
    const profileCardSubTextColor = isDark ? '#A1A1AA' : '#6B7280';
    const cancelBtnStyle = {
        backgroundColor: isDark ? '#27272A' : '#F3F4F6'
    };
    const cancelBtnTextColor = isDark ? '#FFFFFF' : '#111827';

    // 4. Dynamic Styles for QR Code Screen
    const qrPassTitleColor = isDark ? '#FFFFFF' : '#111827';
    const qrPassDescColor = isDark ? '#A1A1AA' : '#6B7280';
    const qrPassUserColor = isDark ? '#FFFFFF' : '#111827';

    // 5. Dynamic Bottom Selector Bar Styles (fully adapts based on system theme & current tab)
    let selectorBarBg = 'rgba(229, 231, 235, 0.95)'; // Gray-200/95 (light capsule)
    let selectorBarBorder = 'rgba(209, 213, 219, 0.5)';
    
    let scanTabBg = 'transparent';
    let scanTabBorder = 'transparent';
    let scanTabTextColor = '#6B7280';
    let scanIconColor = '#6B7280';
    
    let uploadTabBg = 'transparent';
    let uploadTabBorder = 'transparent';
    let uploadTabTextColor = '#6B7280';
    let uploadIconColor = '#6B7280';

    let qrTabBg = 'transparent';
    let qrTabBorder = 'transparent';
    let qrTabTextColor = '#6B7280';
    let qrIconColor = '#6B7280';

    if (isDark) {
        selectorBarBg = 'rgba(24, 24, 27, 0.9)'; // Zinc-900/90 (dark capsule)
        selectorBarBorder = 'rgba(39, 39, 42, 0.5)';
        scanTabTextColor = '#A1A1AA';
        scanIconColor = '#A1A1AA';
        uploadTabTextColor = '#A1A1AA';
        uploadIconColor = '#A1A1AA';
        qrTabTextColor = '#A1A1AA';
        qrIconColor = '#A1A1AA';
        
        if (loadingImageScan) {
            uploadTabBg = '#27272A'; // Zinc-800
            uploadTabBorder = 'rgba(63, 63, 70, 0.5)';
            uploadTabTextColor = '#FFFFFF';
            uploadIconColor = '#FFFFFF';
        } else if (isScanMode) {
            scanTabBg = '#27272A'; // Zinc-800
            scanTabBorder = 'rgba(63, 63, 70, 0.5)';
            scanTabTextColor = '#FFFFFF';
            scanIconColor = '#FFFFFF';
        } else {
            qrTabBg = '#27272A'; // Zinc-800
            qrTabBorder = 'rgba(63, 63, 70, 0.5)';
            qrTabTextColor = '#FFFFFF';
            qrIconColor = '#FFFFFF';
        }
    } else {
        // Light Theme
        if (loadingImageScan) {
            uploadTabBg = '#FFFFFF'; // Active white tab
            uploadTabBorder = 'rgba(209, 213, 219, 0.5)';
            uploadTabTextColor = '#111827';
            uploadIconColor = '#111827';
        } else if (isScanMode) {
            scanTabBg = '#FFFFFF'; // Active white tab
            scanTabBorder = 'rgba(209, 213, 219, 0.5)';
            scanTabTextColor = '#111827';
            scanIconColor = '#111827';
        } else {
            qrTabBg = '#FFFFFF'; // Active white tab
            qrTabBorder = 'rgba(209, 213, 219, 0.5)';
            qrTabTextColor = '#111827';
            qrIconColor = '#111827';
        }
    }

    return (
        <View style={screenStyle}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                
                {/* Unified Header */}
                <View style={headerStyle}>
                    <TouchableOpacity onPress={handleClose} style={{ padding: 8, marginLeft: -8, borderRadius: 20 }} activeOpacity={0.7}>
                        <Ionicons name="close" size={26} color={closeBtnColor} />
                    </TouchableOpacity>
                    
                    <Text style={{ fontSize: 18, fontWeight: '900', color: headerTextColor, textAlign: 'center' }}>
                        {isScanMode ? 'Scan Chowmate QR' : 'My Chowmate Pass'}
                    </Text>

                    <View style={{ width: 40 }} />
                </View>

                {/* Main Content Area */}
                <View className="flex-1 relative">
                    
                    {/* MODE 1: QR SCANNER */}
                    {isScanMode && (
                        <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF', position: 'relative' }}>
                            {hasPermission === null ? (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#000000' : '#FFFFFF' }}>
                                    <Text style={{ color: isDark ? '#A1A1AA' : '#6B7280', fontWeight: '500' }}>Checking camera status...</Text>
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
                                            marginBottom: 20
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="videocam-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                                            Enable Camera
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Use My Code button */}
                                    <TouchableOpacity
                                        onPress={() => setMode('generate')}
                                        className="bg-zinc-100 dark:bg-zinc-800 px-6 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 mb-6"
                                        activeOpacity={0.8}
                                    >
                                        <Text className="text-zinc-800 dark:text-zinc-200 font-extrabold text-xs uppercase tracking-wider">Use My Code</Text>
                                    </TouchableOpacity>

                                    {/* Secondary Upload QR Image Button */}
                                    <TouchableOpacity 
                                        onPress={pickAndScanImage}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 10,
                                            paddingHorizontal: 20,
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
                                        Camera access is denied or not supported on this platform. Switch to **My Code** to display your QR, or upload a Chowmate QR image directly:
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
                                            marginBottom: 20,
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

                                    <TouchableOpacity
                                        onPress={() => setMode('generate')}
                                        className="bg-zinc-100 dark:bg-zinc-800 px-6 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700"
                                        activeOpacity={0.8}
                                    >
                                        <Text className="text-zinc-800 dark:text-zinc-200 font-extrabold text-xs uppercase tracking-wider">Use My Code</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF', position: 'relative' }}>
                                    <CameraView
                                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                                        barcodeScannerSettings={{
                                            barcodeTypes: ["qr"],
                                        }}
                                        style={StyleSheet.absoluteFillObject}
                                    />

                                    {/* Scanner Overlay Visual Guide */}
                                    {!scannedProfile && (
                                        <View className="flex-1 items-center justify-center relative w-full h-full">
                                            <View className="w-64 h-64 border-2 border-turquoise rounded-3xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
                                            <Text className="text-white font-bold mt-8 bg-zinc-900/80 px-4 py-2 rounded-full overflow-hidden text-xs">
                                                Position Chowmate's QR code in frame
                                            </Text>

                                            {/* Upload QR Image Button inside Scanner */}
                                            <TouchableOpacity 
                                                onPress={pickAndScanImage}
                                                className="absolute bottom-32 bg-zinc-900/80 border border-zinc-800 px-6 py-3 rounded-2xl flex-row items-center justify-center active:bg-zinc-800"
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

                            {/* Scanned Profile overlay card */}
                            {scannedProfile && (
                                <View 
                                    style={[
                                        {
                                            position: 'absolute',
                                            bottom: 96,
                                            left: 16,
                                            right: 16,
                                            borderRadius: 24,
                                            padding: 24,
                                            zIndex: 50,
                                            shadowColor: '#000',
                                            shadowOffset: { width: 0, height: 10 },
                                            shadowOpacity: 0.15,
                                            shadowRadius: 20,
                                            elevation: 10
                                        },
                                        profileCardStyle
                                    ]}
                                >
                                    <View className="items-center relative w-full pt-4">
                                        {/* Close Button in Top Right of scanned profile card */}
                                        <TouchableOpacity 
                                            onPress={() => { setScannedProfile(null); setScanned(false); setConnectionStatus(null); setCardFeedback(null); }}
                                            style={{ 
                                                position: 'absolute', 
                                                top: -4, 
                                                right: -4, 
                                                padding: 6, 
                                                borderRadius: 20, 
                                                backgroundColor: isDark ? '#27272A' : '#F3F4F6' 
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="close" size={18} color={isDark ? '#F4F4F5' : '#18181B'} />
                                        </TouchableOpacity>

                                        <Image
                                            source={{ uri: scannedProfile.avatar_url || 'https://placehold.co/100x100/png?text=User' }}
                                            className="w-20 h-20 rounded-full border-2 border-turquoise mb-3"
                                        />
                                        <Text style={{ fontSize: 20, fontWeight: '900', color: profileCardTextColor, marginBottom: 24 }}>
                                            @{scannedProfile.username || 'Guest'}
                                        </Text>

                                        <View style={{ flexDirection: 'row', width: '100%', marginTop: 8 }}>
                                            <TouchableOpacity
                                                onPress={() => { setScannedProfile(null); setScanned(false); setConnectionStatus(null); setCardFeedback(null); }}
                                                style={[{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginRight: 6 }, cancelBtnStyle]}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={{ fontWeight: 'bold', color: cancelBtnTextColor }}>
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
                                                        marginLeft: 6,
                                                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)'
                                                    }}
                                                    activeOpacity={0.8}
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
                                                        marginLeft: 6,
                                                        backgroundColor: connectionStatus !== null 
                                                            ? (isDark ? '#27272A' : '#E5E7EB') 
                                                            : '#E11D48'
                                                    }}
                                                    activeOpacity={0.8}
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
                                                            ? "Adding..." 
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
                    )}

                    {/* MODE 2: QR GENERATOR */}
                    {!isScanMode && (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 80 }}>
                            {/* Unified view-shot card container with solid opaque background for professional shares */}
                            <View
                                ref={viewShotRef}
                                collapsable={false}
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: 28,
                                    width: '100%',
                                    maxWidth: 340,
                                    borderWidth: 4,
                                    borderColor: '#111827',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: 0.08,
                                    shadowRadius: 16,
                                    elevation: 6,
                                    marginBottom: 16,
                                    padding: 4
                                }}
                            >
                                <View
                                    style={{
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderWidth: 4,
                                        borderColor: '#40E0D0',
                                        borderRadius: 24,
                                        paddingVertical: 28,
                                        paddingHorizontal: 20,
                                        width: '100%'
                                    }}
                                >
                                    <Text 
                                        style={{ 
                                            fontSize: 22, 
                                            fontWeight: '900', 
                                            color: '#111827', 
                                            textAlign: 'center', 
                                            marginBottom: 28, 
                                            letterSpacing: -0.5 
                                        }}
                                    >
                                        Let's be Chowmates{"\n"}
                                        <Text style={{ color: '#0D9488' }}>in lamon.go</Text>
                                    </Text>

                                    <View 
                                        style={{ 
                                            backgroundColor: '#FFFFFF', 
                                            padding: 20, 
                                            borderRadius: 20, 
                                            shadowColor: '#000', 
                                            shadowOffset: { width: 0, height: 4 }, 
                                            shadowOpacity: 0.08, 
                                            shadowRadius: 10, 
                                            elevation: 6,
                                            borderWidth: 1,
                                            borderColor: '#E5E7EB',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            position: 'relative'
                                        }}
                                    >
                                        <QRCode
                                            getRef={qrSvgRef}
                                            value={user.id}
                                            size={200}
                                            color="black"
                                            backgroundColor="white"
                                            logo={require('../assets/images/favicon_suggestion.png')}
                                            logoSize={40}
                                            logoMargin={2}
                                            logoBorderRadius={8}
                                            logoBackgroundColor="white"
                                            ecl="H"
                                        />
                                        {/* Guarantee that the central logo is rendered and captured properly on Native by overlaying a standard RN Image */}
                                        <View
                                            style={{
                                                position: 'absolute',
                                                width: 40,
                                                height: 40,
                                                backgroundColor: '#FFFFFF',
                                                borderRadius: 8,
                                                padding: 2,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Image
                                                source={require('../assets/images/favicon_suggestion.png')}
                                                style={{
                                                    width: 36,
                                                    height: 36,
                                                    borderRadius: 6,
                                                }}
                                                resizeMode="contain"
                                            />
                                        </View>
                                    </View>

                                    <Text 
                                        style={{ 
                                            fontWeight: '900', 
                                            fontSize: 20, 
                                            color: '#111827', 
                                            marginTop: 28, 
                                            letterSpacing: -0.5 
                                        }}
                                    >
                                        @{profile?.username || 'Guest'}
                                    </Text>

                                    {/* Footer Scan Hint */}
                                    <Text 
                                        style={{ 
                                            fontWeight: '600', 
                                            fontSize: 12, 
                                            color: '#6B7280', 
                                            marginTop: 10, 
                                            letterSpacing: 0.2
                                        }}
                                    >
                                        Scan to connect instantly
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={saveQRCode}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: '#40E0D0',
                                    paddingVertical: 12,
                                    paddingHorizontal: 24,
                                    borderRadius: 16,
                                    marginTop: 24,
                                    shadowColor: '#40E0D0',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.25,
                                    shadowRadius: 8,
                                    elevation: 6
                                }}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="download-outline" size={18} color="#111827" style={{ marginRight: 8 }} />
                                <Text style={{ color: '#111827', fontWeight: '800', fontSize: 14 }}>
                                    Save Chowmate Pass
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Glassmorphic Selector Segment Bar at Bottom */}
                    <View 
                        style={{
                            position: 'absolute',
                            bottom: 24,
                            left: 16,
                            right: 16,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            backgroundColor: selectorBarBg,
                            paddingVertical: 6,
                            paddingHorizontal: 6,
                            borderRadius: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 12,
                            elevation: 8,
                            zIndex: 40,
                            borderWidth: 1,
                            borderColor: selectorBarBorder
                        }}
                    >
                        <TouchableOpacity
                            onPress={() => setMode('scan')}
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                borderRadius: 12,
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                backgroundColor: scanTabBg,
                                borderWidth: scanTabBg !== 'transparent' ? 1 : 0,
                                borderColor: scanTabBorder
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="scan" size={16} color={scanIconColor} style={{ marginRight: 6 }} />
                            <Text 
                                style={{
                                    fontWeight: 'bold',
                                    fontSize: 11,
                                    color: scanTabTextColor,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5
                                }}
                            >
                                Scan
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setMode('generate')}
                            style={{
                                flex: 1,
                                paddingVertical: 10,
                                borderRadius: 12,
                                alignItems: 'center',
                                flexDirection: 'row',
                                justifyContent: 'center',
                                backgroundColor: qrTabBg,
                                borderWidth: qrTabBg !== 'transparent' ? 1 : 0,
                                borderColor: qrTabBorder
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="qr-code" size={16} color={qrIconColor} style={{ marginRight: 6 }} />
                            <Text 
                                style={{
                                    fontWeight: 'bold',
                                    fontSize: 11,
                                    color: qrTabTextColor,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5
                                }}
                            >
                                My Code
                            </Text>
                        </TouchableOpacity>
                    </View>

                </View>

                {loadingImageScan && (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 100 }]}>
                        <View style={{ backgroundColor: isDark ? '#18181B' : '#FFFFFF', padding: 28, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 10, borderWidth: 1, borderColor: isDark ? '#27272A' : '#E5E7EB', width: 220 }}>
                            <ActivityIndicator size="large" color="#06B6D4" style={{ marginBottom: 16 }} />
                            <Text style={{ color: isDark ? '#FFFFFF' : '#111827', fontWeight: '800', fontSize: 16, marginBottom: 6, textAlign: 'center' }}>Decoding QR</Text>
                            <Text style={{ color: isDark ? '#A1A1AA' : '#6B7280', fontSize: 12, textAlign: 'center' }}>Please wait...</Text>
                        </View>
                    </View>
                )}
            </Animated.View>
            <CustomAlert />
        </View>
    );
}
