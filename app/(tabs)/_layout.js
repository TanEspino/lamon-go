import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Image, View, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function TabLayout() {
    const { profile } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

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
            {/* Left Vertical Sidebar (Standard on all screen sizes & simulated devices) */}
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
                        style={{ backgroundColor: isActive('discover') ? '#F0FDFA' : 'transparent' }}
                        activeOpacity={0.7}
                    >
                        <Ionicons size={24} name={isActive('discover') ? "compass" : "compass-outline"} color={isActive('discover') ? "#40E0D0" : "#737373"} />
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

            {/* Right Side Screen Content Area */}
            <View className="flex-1">
                <Tabs
                    screenOptions={{
                        headerShown: false,
                        tabBarStyle: { display: 'none' }, // Hides bottom bar on all widths
                    }}
                >
                    <Tabs.Screen name="index" />
                    <Tabs.Screen name="discover" />
                    <Tabs.Screen name="create" options={{ href: null }} />
                    <Tabs.Screen name="profile" />
                </Tabs>
            </View>
        </View>
    );
}
