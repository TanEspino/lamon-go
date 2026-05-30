import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Image, View, TouchableOpacity, useWindowDimensions, Text, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useColorScheme } from 'nativewind';

export default function TabLayout() {
    const { profile, pendingCount, unseenAcceptanceCount, unseenRecommendationsCount, fetchBuddyStats, user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // Trigger notification and buddy stats sync in the background whenever a tab is switched or focused
    useEffect(() => {
        if (user?.id && fetchBuddyStats) {
            fetchBuddyStats(user.id);
        }
    }, [pathname, user?.id, fetchBuddyStats]);
    const { width } = useWindowDimensions();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const isLargeScreen = width >= 600;

    const activeColor = '#E11D48';
    const inactiveColor = isDark ? '#A3A3A3' : '#737373'; // Dynamic contrast depending on dark mode

    const isActive = (route) => {
        if (route === 'index') return pathname === '/' || pathname === '/index';
        if (route === 'discover') return pathname.startsWith('/discover');
        if (route === 'notifications') return pathname.startsWith('/notifications');
        if (route === 'profile') return pathname.startsWith('/profile');
        return false;
    };

    return (
        <View className="flex-1 flex-row bg-background dark:bg-[#0B1326]">
            {/* Left Vertical Sidebar (Visible only on large screens) */}
            {isLargeScreen && (
                <View className="w-12 bg-gray-50 dark:bg-[#0B1326]" style={{ height: '100%', borderRightWidth: 1, borderRightColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB' }}>
                    {/* Top Section: Spacer */}
                    <View style={{ height: 10 }} />

                    {/* Middle Section: Sidebar Navigation */}
                    <View className="flex-col items-center space-y-6 flex-1 justify-center">
                        {/* Feed Tab */}
                        <TouchableOpacity 
                             onPress={() => {
                                 if (isActive('index')) {
                                     if (Platform.OS === 'web') {
                                         window.dispatchEvent(new CustomEvent('scroll-to-top-feed'));
                                     }
                                 } else {
                                     router.push('/');
                                 }
                             }}
                             className="p-2.5 rounded-2xl items-center justify-center"
                             style={{ backgroundColor: isActive('index') ? (isDark ? 'rgba(225, 29, 72, 0.15)' : '#FFF1F2') : 'transparent' }}
                             activeOpacity={0.7}
                        >
                            <Ionicons size={24} name={isActive('index') ? "home" : "home-outline"} color={isActive('index') ? "#E11D48" : inactiveColor} />
                        </TouchableOpacity>

                        {/* Discover Tab */}
                        <TouchableOpacity 
                            onPress={() => router.push('/discover')}
                            className="p-2.5 rounded-2xl items-center justify-center"
                            style={{ backgroundColor: isActive('discover') ? (isDark ? 'rgba(225, 29, 72, 0.15)' : '#FFF1F2') : 'transparent' }}
                            activeOpacity={0.7}
                        >
                            <Ionicons size={24} name={isActive('discover') ? "compass" : "compass-outline"} color={isActive('discover') ? "#E11D48" : inactiveColor} />
                        </TouchableOpacity>

                        {/* Add Post Button */}
                        <TouchableOpacity 
                            onPress={() => router.push('/modal')}
                            className="w-10 h-10 rounded-full items-center justify-center shadow-md"
                            style={{ 
                                backgroundColor: '#00D2C4',
                                shadowColor: '#00D2C4',
                                shadowOffset: { width: 0, height: 3 },
                                shadowOpacity: 0.3,
                                shadowRadius: 4,
                                elevation: 3
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons size={24} name="add" color="black" />
                        </TouchableOpacity>

                        {/* Notifications Tab */}
                        <TouchableOpacity 
                            onPress={() => router.push('/notifications')}
                            className="p-2.5 rounded-2xl items-center justify-center relative"
                            style={{ backgroundColor: isActive('notifications') ? (isDark ? 'rgba(225, 29, 72, 0.15)' : '#FFF1F2') : 'transparent' }}
                            activeOpacity={0.7}
                        >
                            <Ionicons size={24} name={isActive('notifications') ? "notifications" : "notifications-outline"} color={isActive('notifications') ? "#E11D48" : inactiveColor} />
                            {(pendingCount + unseenAcceptanceCount + unseenRecommendationsCount) > 0 && (
                                <View className="absolute -top-1 -right-1 bg-rose-500 rounded-full w-4 h-4 items-center justify-center border border-white dark:border-zinc-950" style={{ elevation: 2 }}>
                                    <Text className="text-white text-[8px] font-black text-center" style={{ lineHeight: 11 }}>{pendingCount + unseenAcceptanceCount + unseenRecommendationsCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Profile Tab */}
                        <TouchableOpacity 
                            onPress={() => router.push('/profile')}
                            className="p-1 rounded-full items-center justify-center relative"
                            activeOpacity={0.7}
                        >
                            {profile && profile.avatar_url && !profile.avatar_url.includes('placehold.co') ? (
                                <Image
                                    source={{ uri: profile.avatar_url }}
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 14,
                                        borderWidth: isActive('profile') ? 2 : 1,
                                        borderColor: isActive('profile') ? '#E11D48' : (isDark ? '#27272A' : '#E5E7EB')
                                    }}
                                    resizeMode="cover"
                                />
                            ) : (
                                  <Ionicons size={24} name={isActive('profile') ? "person" : "person-outline"} color={isActive('profile') ? "#E11D48" : inactiveColor} />
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Bottom Section: Aesthetic Spacer */}
                    <View style={{ height: 30 }} />
                </View>
            )}

            {/* Right Side Screen Content Area */}
            <View className="flex-1 relative bg-white dark:bg-[#0B1326]">
                <Tabs
                    screenOptions={({ route }) => ({
                        headerShown: false,
                        tabBarActiveTintColor: activeColor,
                        tabBarInactiveTintColor: inactiveColor,
                        tabBarShowLabel: false, // Completely hide labels on the bottom bar!
                        safeAreaInsets: { bottom: 0, top: 0, left: 0, right: 0 }, // Prevent safe area paddings from offsetting icons
                        tabBarStyle: {
                            display: isLargeScreen ? 'none' : 'flex', // Show bottom tab bar only on mobile!
                            backgroundColor: isDark ? '#0B1326' : '#F9FAFB', 
                            borderTopWidth: 1,
                            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
                            height: 65,
                            paddingBottom: 0,
                            paddingTop: 0,
                            elevation: 0,
                            shadowOpacity: 0,
                        },
                        tabBarItemStyle: {
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: 0,
                            margin: 0,
                        },
                        tabBarIconStyle: {
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '100%',
                            height: '100%',
                            marginTop: 0,
                            marginBottom: 0,
                        },
                        tabBarIcon: ({ focused, color, size }) => {
                            if (route.name === 'index') {
                                return <Ionicons size={24} name={focused ? "home" : "home-outline"} color={color} />;
                            }
                            if (route.name === 'discover') {
                                return <Ionicons size={24} name={focused ? "compass" : "compass-outline"} color={color} />;
                            }
                            if (route.name === 'create') {
                                return <View style={{ width: 48, height: 48 }} />;
                            }
                            if (route.name === 'notifications') {
                                return (
                                    <View className="relative justify-center items-center" style={{ width: 28, height: 28 }}>
                                        <Ionicons size={24} name={focused ? "notifications" : "notifications-outline"} color={color} />
                                        {(pendingCount + unseenAcceptanceCount + unseenRecommendationsCount) > 0 && (
                                            <View className="absolute -top-1 -right-1 bg-rose-500 rounded-full w-4 h-4 items-center justify-center border border-white dark:border-zinc-950" style={{ elevation: 2 }}>
                                                <Text className="text-white text-[8px] font-black text-center" style={{ lineHeight: 11 }}>{pendingCount + unseenAcceptanceCount + unseenRecommendationsCount}</Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            }
                            if (route.name === 'profile') {
                                return (
                                    <View className="relative justify-center items-center" style={{ width: 30, height: 30 }}>
                                        {profile && profile.avatar_url && !profile.avatar_url.includes('placehold.co') ? (
                                            <Image
                                                source={{ uri: profile.avatar_url }}
                                                style={{
                                                    width: 30,
                                                    height: 30,
                                                    borderRadius: 15,
                                                    borderWidth: focused ? 2 : 1,
                                                    borderColor: focused ? '#E11D48' : (isDark ? '#27272A' : '#E5E5E5'),
                                                }}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <Ionicons size={24} name={focused ? "person" : "person-outline"} color={focused ? '#E11D48' : color} />
                                        )}
                                    </View>
                                );
                            }
                            return null;
                        },
                        tabBarLabelStyle: {
                            fontSize: 10,
                            fontWeight: '600',
                            marginTop: 1,
                        }
                    })}
                >
                    <Tabs.Screen 
                        name="index" 
                        options={{ title: 'Feed', tabBarLabel: 'Feed' }} 
                        listeners={({ navigation }) => ({
                            tabPress: (e) => {
                                if (pathname === '/' || pathname === '/index') {
                                    if (Platform.OS === 'web') {
                                        window.dispatchEvent(new CustomEvent('scroll-to-top-feed'));
                                    }
                                }
                            },
                        })}
                    />
                    <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarLabel: 'Discover' }} />
                    <Tabs.Screen 
                        name="create" 
                        options={{ title: 'Add Dish', tabBarLabel: 'Add Dish' }} 
                        listeners={({ navigation }) => ({
                            tabPress: (e) => {
                                e.preventDefault();
                                router.push('/modal');
                            },
                        })}
                    />
                    <Tabs.Screen name="notifications" options={{ title: 'Notifications', tabBarLabel: 'Notifications' }} />
                    <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
                </Tabs>

                {/* Visual prominent floating center [ + ] button on mobile */}
                {!isLargeScreen && (
                    <TouchableOpacity
                        onPress={() => router.push('/modal')}
                        style={{
                            position: 'absolute',
                            bottom: 8.5, // Centers perfectly vertically inside the 65px tall tab bar
                            left: '50%',
                            transform: [{ translateX: -24 }], // Centers horizontally (exactly half of width)
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: '#00D2C4',
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#00D2C4',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.35,
                            shadowRadius: 5,
                            elevation: 5,
                            zIndex: 9999, // Render on top of everything!
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="add" size={28} color="black" style={{ fontWeight: '900' }} />
                    </TouchableOpacity>
                )}

            </View>
        </View>
    );
}
