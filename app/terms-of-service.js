import React, { useEffect, useRef } from 'react';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View, Linking, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';

export default function TermsOfServiceScreen() {
    const router = useRouter();
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
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace('/');
            }
        });
    };

    const handleOpenWebsite = () => {
        Linking.openURL('https://www.tomokanlabs.com/');
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950">
            <Animated.View 
                style={{ 
                    flex: 1, 
                    opacity: fadeAnim, 
                    transform: [{ translateY: slideAnim }] 
                }}
            >
                {/* Premium Sticky Header */}
                <View className="flex-row items-center px-4 bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800" style={{ height: 60 }}>
                    <TouchableOpacity 
                        onPress={handleClose} 
                        className="p-2 -ml-2 rounded-full active:bg-gray-200 dark:active:bg-zinc-800"
                    >
                        <Ionicons name="close" size={26} color={isDark ? '#F4F4F5' : '#18181B'} />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-gray-900 dark:text-zinc-50 ml-3">Terms of Service</Text>
                </View>

                {/* Scrollable Document Body */}
                <ScrollView 
                    contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 60 }}
                    showsVerticalScrollIndicator={true}
                    className="flex-1"
                >
                    {/* Title Section */}
                    <Text className="text-3xl font-extrabold text-gray-900 dark:text-zinc-50 tracking-tight">
                        Terms of Service
                    </Text>
                    <Text className="text-sm text-gray-400 dark:text-zinc-500 mt-2 mb-6">
                        Last updated: May 22, 2026
                    </Text>

                    {/* Divider */}
                    <View className="h-[1px] bg-gray-200 dark:bg-zinc-800 mb-6" />

                    {/* Intro */}
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        Please read these Terms of Service ("Terms", "Terms of Service") carefully before downloading, installing, or using the LamonGo mobile application (the "Application", "Service") operated by Tomokan Labs.
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        Your access to and use of the Service is conditioned on Your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who download, install, or use the Application.
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        By accessing or using the Service, You agree to be bound by these Terms. If You disagree with any part of the terms, then You may not install or utilize the Application.
                    </Text>

                    {/* Section: Interpretation and Definitions */}
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-6 mb-3">
                        Interpretation and Definitions
                    </Text>
                    <Text className="text-base font-bold text-gray-800 dark:text-zinc-200 mt-4 mb-2">
                        Definitions
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-4">
                        For the purposes of these Terms of Service:
                    </Text>

                    <View className="space-y-4 mb-6">
                        <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed">
                            <Text className="font-bold text-gray-900 dark:text-zinc-100">Company </Text>
                            (referred to as either "the Company", "We", "Us" or "Our" in this Agreement) refers to Tomokan Labs.
                        </Text>
                        <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed">
                            <Text className="font-bold text-gray-900 dark:text-zinc-100">Country </Text>
                            refers to: Philippines
                        </Text>
                        <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed">
                            <Text className="font-bold text-gray-900 dark:text-zinc-100">Application </Text>
                            (or "App") refers to LamonGo, the software program provided by the Company downloaded and installed by You on any mobile or electronic device.
                        </Text>
                        <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed">
                            <Text className="font-bold text-gray-900 dark:text-zinc-100">Service </Text>
                            refers to the mobile Application.
                        </Text>
                        <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed">
                            <Text className="font-bold text-gray-900 dark:text-zinc-100">You </Text>
                            means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.
                        </Text>
                    </View>

                    {/* Section: User Accounts */}
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-8 mb-3">
                        User Accounts & Mobile Authentication
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        When You create an account or authenticate within the Application (including logging in securely via third-party systems like Google OAuth), You agree to provide profile information that is accurate and current. Failure to do so constitutes a breach of the Terms, which may result in immediate termination or locking of Your account profile inside the Application.
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        You are solely responsible for safeguarding the mobile credentials, device authorization states, or session tokens used to access the platform, and for any activities or actions taking place under your profile layout.
                    </Text>

                    {/* Section: Mobile License */}
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-6 mb-3">
                        Mobile Application License
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        Subject to Your compliance with these Terms, the Company grants You a limited, non-exclusive, non-transferable, revocable license to download, install, and use a single copy of the LamonGo Application on a mobile device owned or controlled by You, strictly in accordance with your smartphone's operating system guidelines and marketplace platform rules.
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        You agree not to modify, decompile, reverse engineer, or attempt to extract the underlying source code of the Application, unless expressly permitted by applicable local laws.
                    </Text>

                    {/* Section: Intellectual Property */}
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-6 mb-3">
                        Intellectual Property
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        The Application and its original source code, operational workflows, brand layouts, assets, interface designs, and features are and will remain the exclusive property of Tomokan Labs. The Service is protected by both local and international copyright, trademark, and intellectual property laws.
                    </Text>

                    {/* Section: Termination */}
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-6 mb-3">
                        Termination
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        We may terminate or suspend Your account profile or restrict access to the mobile Application immediately, without prior notice or liability, for any reason whatsoever, including without limitation if You breach these Terms. Upon termination, Your right to use the Service will cease immediately, and you must remove the Application from your mobile device.
                    </Text>

                    {/* Section: Limitation of Liability */}
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-6 mb-3">
                        Limitation Of Liability
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        To the maximum extent permitted by applicable law, in no event shall Tomokan Labs or its core data providers be liable for any special, incidental, indirect, or consequential damages whatsoever (including, but not limited to, damages for loss of profits, device crashes, memory corruption, cellular network downtime, or system interruption) arising out of or in any way related to the use of or inability to use the Application.
                    </Text>

                    {/* Section: AS IS */}
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-6 mb-3">
                        "AS IS" and "AS AVAILABLE" Disclaimer
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        The Application is provided to You "AS IS" and "AS AVAILABLE" and with all faults and defects without warranty of any kind. To the maximum extent permitted under applicable law, the Company expressly disclaims all warranties, whether express, implied, or statutory, with respect to the Application, including all implied warranties of merchantability, fitness for a particular application purpose, performance stability, and non-infringement.
                    </Text>

                    {/* Section: Governing Law */}
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-6 mb-3">
                        Governing Law
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        The laws of the Country, excluding its conflicts of law rules, shall govern these Terms and Your use of the Application. Your mobile use may also be subject to other local, regional, or international frameworks.
                    </Text>

                    {/* Section: Changes */}
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-6 mb-3">
                        Changes to These Terms
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-6">
                        We reserve the right, at Our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will update the "Last updated" date at the top of this page or push an explicit client notification banner directly within the mobile application interface. By continuing to use our platform after revisions take effect, you agree to be bound by the updated conditions.
                    </Text>

                    {/* Section: Contact Us */}
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 mt-6 mb-3">
                        Contact Us
                    </Text>
                    <Text className="text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-4">
                        If you have any questions about these Terms of Service, You can contact us:
                    </Text>
                    <View className="pl-4 space-y-2 mb-6">
                        <Text className="text-base text-gray-600 dark:text-zinc-300">
                            • By email: <Text className="font-semibold text-primary">contact@tomokanlabs.com</Text>
                        </Text>
                        <Text className="text-base text-gray-600 dark:text-zinc-300">
                            • By visiting the parent website:{' '}
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
        </SafeAreaView>
    );
}
