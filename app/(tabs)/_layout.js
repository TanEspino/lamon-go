import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
    // Keep the primary color for the active tab, or switch to black like Insta if preferred.
    // Insta uses Black for active, Gray for inactive.
    const activeColor = '#E11D48';
    const inactiveColor = '#737373'; // Neutral gray

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: activeColor,
                tabBarInactiveTintColor: inactiveColor,
                headerShown: false,
                tabBarShowLabel: false, // Instagram style: Icons only usually, but we can keep it simple
                tabBarStyle: {
                    borderTopWidth: 0.5,
                    borderTopColor: '#DBDBDB',
                    backgroundColor: 'white',
                    height: 60,
                    paddingTop: 10,
                },
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Feed',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons size={28} name={focused ? "home" : "home-outline"} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="discover"
                options={{
                    title: 'Discover',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons size={28} name={focused ? "compass" : "compass-outline"} color={focused ? '#40E0D0' : color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons size={28} name={focused ? "person" : "person-outline"} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
