import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Image, View, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function TabLayout() {
    const { profile } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { width } = useWindowDimensions();

    const isLargeScreen = width >= 600;

    const activeColor = '#E11D48';
    const inactiveColor = '#737373'; // Neutral gray

    const isActive = (route) => {
        if (route === 'index') return pathname === '/' || pathname === '/index';
        if (route === 'discover') return pathname.startsWith('/discover');
        if (route === 'profile') return pathname.startsWith('/profile');
        return false;
    };

    return (
        <View className="flex-1 flex-row bg-background">
            {/* Left Vertical Sidebar (Visible only on large screens) */}
            {isLargeScreen && (
                <View className="w-12 bg-gray-100 border-r border-gray-200 flex-col items-center py-6 justify-between" style={{ height: '100%' }}>
                    {/* Top Section: Spacer */}
                    <View style={{ height: 10 }} />

                    {/* Middle Section: Sidebar Navigation */}
                    <View className="flex-col items-center space-y-6 flex-1 justify-center">
                        {/* Feed Tab */}
                        <TouchableOpacity 
                            onPress={() => router.push('/')}
                            className="p-2.5 rounded-2xl items-center justify-center"
                            style={{ backgroundColor: isActive('index') ? '#FFF1F2' : 'transparent' }}
                            activeOpacity={0.7}
                        >
                            <Ionicons size={24} name={isActive('index') ? "home" : "home-outline"} color={isActive('index') ? "#E11D48" : "#737373"} />
                        </TouchableOpacity>

                        {/* Discover Tab */}
                        <TouchableOpacity 
                            onPress={() => router.push('/discover')}
                            className="p-2.5 rounded-2xl items-center justify-center"
                            style={{ backgroundColor: isActive('discover') ? '#FFF1F2' : 'transparent' }}
                            activeOpacity={0.7}
                        >
                            <Ionicons size={24} name={isActive('discover') ? "compass" : "compass-outline"} color={isActive('discover') ? "#E11D48" : "#737373"} />
                        </TouchableOpacity>

                        {/* Add Post Button */}
                        <TouchableOpacity 
                            onPress={() => router.push('/modal')}
                            className="p-2.5 rounded-2xl items-center justify-center"
                            activeOpacity={0.7}
                        >
                            <Ionicons size={24} name="add-circle-outline" color="#737373" />
                        </TouchableOpacity>

                        {/* Profile Tab */}
                        <TouchableOpacity 
                            onPress={() => router.push('/profile')}
                            className="p-1 rounded-full items-center justify-center"
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
                                        borderColor: isActive('profile') ? '#E11D48' : '#E5E7EB'
                                    }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <Ionicons size={24} name={isActive('profile') ? "person" : "person-outline"} color={isActive('profile') ? "#E11D48" : "#737373"} />
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Bottom Section: Aesthetic Spacer */}
                    <View style={{ height: 30 }} />
                </View>
            )}

            {/* Right Side Screen Content Area */}
            <View className="flex-1 relative">
                <Tabs
                    screenOptions={({ route }) => ({
                        headerShown: false,
                        tabBarActiveTintColor: activeColor,
                        tabBarInactiveTintColor: inactiveColor,
                        tabBarShowLabel: false, // Completely hide labels on the bottom bar!
                        safeAreaInsets: { bottom: 0, top: 0, left: 0, right: 0 }, // Prevent safe area paddings from offsetting icons
                        tabBarStyle: {
                            display: isLargeScreen ? 'none' : 'flex', // Show bottom tab bar only on mobile!
                            backgroundColor: '#F9FAFB', 
                            borderTopWidth: 1,
                            borderTopColor: '#E5E7EB',
                            height: 60,
                            paddingBottom: 0,
                            paddingTop: 0,
                        },
                        tabBarItemStyle: {
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: 60,
                            paddingTop: 0,
                            paddingBottom: 0,
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
                                return <Ionicons size={26} name={focused ? "home" : "home-outline"} color={color} />;
                            }
                            if (route.name === 'discover') {
                                return <Ionicons size={26} name={focused ? "compass" : "compass-outline"} color={color} />;
                            }
                            if (route.name === 'profile') {
                                if (profile && profile.avatar_url && !profile.avatar_url.includes('placehold.co')) {
                                    return (
                                        <Image
                                            source={{ uri: profile.avatar_url }}
                                            style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 14,
                                                borderWidth: focused ? 2 : 1,
                                                borderColor: focused ? '#E11D48' : '#E5E7EB'
                                            }}
                                            resizeMode="cover"
                                        />
                                    );
                                }
                                return <Ionicons size={26} name={focused ? "person" : "person-outline"} color={color} />;
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
                    <Tabs.Screen name="index" options={{ title: 'Feed', tabBarLabel: 'Feed' }} />
                    <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarLabel: 'Discover' }} />
                    <Tabs.Screen name="create" options={{ href: null }} />
                    <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
                </Tabs>


            </View>
        </View>
    );
}
