import React, { useEffect, useRef } from 'react';
import { ScrollView, Text, TouchableOpacity, View, Linking, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';

export default function PrivacyPolicyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const topInset = Platform.OS === 'ios' ? 0 : insets.top;
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Animation values
    const slideAnim = useRef(new Animated.Value(150)).current; // Start 150px down
    const fadeAnim = useRef(new Animated.Value(0)).current;     // Start invisible

    useEffect(() => {
        // Slide up and fade in on mount
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 350,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    const handleClose = () => {
        // Slide down and fade out on dismiss, then navigate back
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 150,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start(() => {
            router.dismiss();
        });
    };

    const handleOpenWebsite = () => {
        Linking.openURL('https://www.tomokanlabs.com/');
    };

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0B1326' : '#FFFFFF' }}>
            <Animated.View 
                style={{ 
                    flex: 1, 
                    opacity: fadeAnim, 
                    transform: [{ translateY: slideAnim }] 
                }}
            >
                {/* Premium Sticky Header */}
                <View 
                    className="flex-row items-center px-4" 
                    style={{ 
                        height: 60 + topInset,
                        paddingTop: topInset,
                        backgroundColor: isDark ? '#0B1326' : '#F3F4F6',
                        borderBottomWidth: 1,
                        borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB'
                    }}
                >
                    <TouchableOpacity 
                        onPress={handleClose} 
                        className="p-2 -ml-2 rounded-full active:bg-gray-200 dark:active:bg-zinc-800"
                    >
                        <Ionicons name="close" size={26} color={isDark ? '#F4F4F5' : '#18181B'} />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-gray-900 dark:text-zinc-50 ml-3">Privacy Policy</Text>
                </View>

                {/* Scrollable Document Body */}
                <ScrollView 
                    contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 60 }}
                    showsVerticalScrollIndicator={true}
                    className="flex-1"
                    style={{ backgroundColor: isDark ? '#0B1326' : '#FFFFFF' }}
                >
                    {/* Title Section */}
                    <Text className="text-3xl font-extrabold text-gray-900 dark:text-zinc-50 tracking-tight">
                        Privacy Policy
                    </Text>
                    <Text className="text-sm text-gray-400 dark:text-zinc-500 mt-2 mb-6">
                        Last updated: May 22, 2026
                    </Text>

                    {/* Divider */}
                    <View 
                        className="h-[1px] mb-6" 
                        style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB' }} 
                    />

                    {/* Intro */}
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        This Privacy Policy describes Our policies and procedures on the collection, use, and disclosure of Your information when You use the LamonGo mobile application (the "Application", "Service") and tells You about Your privacy rights and how the law protects You.
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        LamonGo is a mobile application developed, owned, and operated by Tomokan Labs. We use Your Personal Data to provide, maintain, and improve the Application experience. By installing and using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.
                    </Text>

                    {/* Section: Interpretation and Definitions */}
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-6 mb-3">
                        Interpretation and Definitions
                    </Text>
                    <Text className="text-base font-bold text-gray-800 dark:text-zinc-200 mt-4 mb-2">
                        Definitions
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-4">
                        For the purposes of this Privacy Policy:
                    </Text>

                    <View className="space-y-4 mb-6">
                        <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed">
                            <Text className="font-bold text-gray-900 dark:text-zinc-100">Account </Text>
                            means a unique account created for You to access our Service, save application states, or interact with features within the mobile application.
                        </Text>
                        <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed">
                            <Text className="font-bold text-gray-900 dark:text-zinc-100">Application </Text>
                            (or "App") refers to LamonGo, the software program provided by the Company downloaded and installed by You on any mobile or electronic device.
                        </Text>
                        <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed">
                            <Text className="font-bold text-gray-900 dark:text-zinc-100">Company </Text>
                            (referred to as either "the Company", "We", "Us" or "Our" in this Privacy Policy) refers to Tomokan Labs.
                        </Text>
                        <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed">
                            <Text className="font-bold text-gray-900 dark:text-zinc-100">Country </Text>
                            refers to: Philippines
                        </Text>
                        <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed">
                            <Text className="font-bold text-gray-900 dark:text-zinc-100">Device </Text>
                            means any mobile device, smartphone, or digital tablet capable of downloading and executing the Application.
                        </Text>
                        <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed">
                            <Text className="font-bold text-gray-900 dark:text-zinc-100">Personal Data </Text>
                            is any information that relates to an identified or identifiable individual.
                        </Text>
                        <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed">
                            <Text className="font-bold text-gray-900 dark:text-zinc-100">Service </Text>
                            refers to the mobile Application.
                        </Text>
                        <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed">
                            <Text className="font-bold text-gray-900 dark:text-zinc-100">Usage Data </Text>
                            refers to data collected automatically, either generated by the active use of the Application or from the core system infrastructure itself (for example, mobile device unique IDs, operating system versions, in-app interactions, and hardware diagnostic/crash metrics).
                        </Text>
                    </View>

                    {/* Section: Collecting and Using Personal Data */}
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-8 mb-3">
                        Collecting and Using Your Personal Data
                    </Text>
                    <Text className="text-base font-bold text-gray-800 dark:text-zinc-200 mt-4 mb-2">
                        Types of Data Collected
                    </Text>

                    <Text className="text-base font-semibold text-gray-800 dark:text-zinc-200 mt-3 mb-2">
                        Personal Data
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-4">
                        While using Our Service, We may ask You to provide Us with certain personally identifiable information to authorize your secure user profile and maintain session persistence across devices. This information includes:
                    </Text>
                    <View className="pl-4 mb-4">
                        <Text className="text-base text-gray-600 dark:text-zinc-300 mb-2">
                            • Email address
                        </Text>
                        <Text className="text-base text-gray-600 dark:text-zinc-300">
                            • Basic profile identity details (provided securely when logging in via third-party secure authentication, such as Google Sign-In)
                        </Text>
                    </View>

                    <Text className="text-base font-semibold text-gray-800 dark:text-zinc-200 mt-4 mb-2">
                        Usage Data
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        Usage Data is collected automatically when executing the mobile application on your device. This may include your smartphone's unique device identifier, mobile operating system environment, client version numbers, secure session authorization tokens, layout engagement metrics, and crash logs for diagnostic troubleshooting.
                    </Text>

                    {/* Section: Use of Personal Data */}
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-6 mb-3">
                        Use of Your Personal Data
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-4">
                        The Company uses this data strictly for the following operational workflows:
                    </Text>
                    <View className="pl-4 space-y-3 mb-6">
                        <Text className="text-base text-gray-600 dark:text-zinc-300">
                            <Text className="font-bold">• Account Management: </Text>
                            To register, authorize, and maintain your user profile within the mobile application environment.
                        </Text>
                        <Text className="text-base text-gray-600 dark:text-zinc-300">
                            <Text className="font-bold">• Service Optimization: </Text>
                            To monitor application stability, analyze crash patterns, and update client features.
                        </Text>
                        <Text className="text-base text-gray-600 dark:text-zinc-300">
                            <Text className="font-bold">• User Communication: </Text>
                            To reach out via email or secure mobile push notifications regarding account status updates, technical security patches, or essential administrative notices.
                        </Text>
                    </View>

                    {/* Section: Data Retention and Deletion */}
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-6 mb-3">
                        Data Retention and Deletion
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        We retain your profile and authentication data only for as long as your account relationship remains active. Users possess the complete right to update, amend, or request the outright deletion of their personal information at any time. You may request immediate profile deletion by utilizing available in-app account deletion tools or by contacting our support channels directly via email.
                    </Text>

                    {/* Section: Security */}
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-6 mb-3">
                        Security of Your Personal Data
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        We utilize industry-standard encryption, secure API token exchange layers, and trusted cloud database ecosystems to safeguard your information. While we maintain rigid protections for our mobile app architecture, no wireless data transfer over cellular/Wi-Fi networks or electronic storage layer is 100% secure, and we cannot guarantee absolute security.
                    </Text>

                    {/* Section: Children's Privacy */}
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-6 mb-3">
                        Children's Privacy
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        Our mobile application does not target, address, or knowingly collect personal information from individuals under the age of 16 without appropriate parental or legal guidance.
                    </Text>

                    {/* Section: Changes */}
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-6 mb-3">
                        Changes to this Privacy Policy
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        We may update Our mobile Privacy Policy from time to time. We will notify You of any revisions by updating the "Last updated" date at the top of this page or pushing a noticeable version update notification directly within the mobile application interface.
                    </Text>

                    {/* Section: Contact Us */}
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-6 mb-3">
                        Contact Us
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-4">
                        If you have any questions about this Privacy Policy, You can contact us:
                    </Text>
                    <View className="pl-4 space-y-2 mb-6">
                        <Text className="text-base text-gray-600 dark:text-zinc-300">
                            • By email: <Text className="font-semibold text-primary">contact@tomokanlabs.com</Text>
                        </Text>
                        <Text className="text-base text-gray-600 dark:text-zinc-300">
                            • By visiting the parent studio website:{' '}
                            <Text 
                                onPress={handleOpenWebsite} 
                                className="font-semibold text-primary underline"
                            >
                                https://www.tomokanlabs.com/
                            </Text>
                        </Text>
                    </View>
                </ScrollView>
            </Animated.View>
        </View>
    );
}
