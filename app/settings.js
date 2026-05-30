import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ScrollView, Text, View, Switch, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CurrencyPicker from '../components/CurrencyPicker';
import { useAlert } from '../context/AlertContext';

export default function SettingsScreen() {
    const { signOut, user } = useAuth();
    const router = useRouter();
    const { showAlert } = useAlert();
    const insets = useSafeAreaInsets();
    const topInset = Platform.OS === 'ios' ? 0 : insets.top;
    const { colorScheme, setColorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [currency, setCurrency] = useState('PHP');
    const [showCurrencyModal, setShowCurrencyModal] = useState(false);

    // 1. Load saved default currency preference on mount
    useEffect(() => {
        const loadCurrency = async () => {
            try {
                let savedCurrency = null;
                if (Platform.OS === 'web') {
                    savedCurrency = window.localStorage.getItem('default-currency');
                } else {
                    savedCurrency = await AsyncStorage.getItem('default-currency');
                }
                if (savedCurrency) {
                    setCurrency(savedCurrency);
                }
            } catch (e) {
                console.log('Error loading default currency:', e);
            }
        };
        loadCurrency();
    }, []);

    // 2. Persist default currency preference when updated
    const handleCurrencySelect = async (selectedVal) => {
        setCurrency(selectedVal);
        try {
            if (Platform.OS === 'web') {
                window.localStorage.setItem('default-currency', selectedVal);
            } else {
                await AsyncStorage.setItem('default-currency', selectedVal);
            }
        } catch (e) {
            console.log('Error saving default currency:', e);
        }
    };

    // 3. Theme toggle switch handler (Night Mode)
    const toggleTheme = async () => {
        const nextScheme = isDark ? 'light' : 'dark';
        setColorScheme(nextScheme);
        try {
            if (Platform.OS === 'web') {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem('theme-preference', nextScheme);
                }
            } else {
                await AsyncStorage.setItem('theme-preference', nextScheme);
            }
        } catch (e) {
            console.log('Error saving theme preference:', e);
        }
    };

    // 4. SSO linked account detector
    const getLinkedAccountInfo = () => {
        const rawProvider = user?.app_metadata?.provider || (user?.identities?.[0]?.provider);
        if (!rawProvider) {
            return { label: 'Signed in securely', icon: 'person-circle-outline', color: '#71717a' };
        }

        switch (rawProvider.toLowerCase()) {
            case 'google':
                return { label: 'Signed in with Google', icon: 'logo-google', color: '#DB4437' };
            case 'apple':
                return { label: 'Signed in with Apple', icon: 'logo-apple', color: isDark ? '#FFFFFF' : '#000000' };
            case 'facebook':
                return { label: 'Signed in with Facebook', icon: 'logo-facebook', color: '#1877F2' };
            default:
                return { label: 'Signed in securely', icon: 'person-circle-outline', color: '#71717a' };
        }
    };

    const linkedAccount = getLinkedAccountInfo();

    // 5. Destructive Account Actions triggers
    const handleDeactivate = () => {
        showAlert(
            "Deactivate Account? ⚠️",
            "Deactivating your account will temporarily freeze your profile and hide your posts from other Chowmates. You can reactivate it at any time by logging back in.\n\nAre you sure you want to proceed?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Deactivate", style: "destructive", onPress: () => showAlert("Success", "Your account has been deactivated successfully. You have been signed out.") }
            ]
        );
    };

    const handleDeleteAccount = () => {
        showAlert(
            "Delete Account Permanently? 🚨",
            "WARNING: This action is irreversible. All of your reviews, post photos, saved locations, and Chowmate friendships will be deleted forever.\n\nDo you want to permanently delete your account?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Permanently Delete", style: "destructive", onPress: () => showAlert("Account Deleted", "Your account has been queued for deletion.") }
            ]
        );
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            // Automatically handled by AuthStateChangeListener redirecting to Sign In!
        } catch (e) {
            showAlert("Sign Out Error", e.message || "Failed to sign out.");
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0B1326' : '#FFFFFF' }}>
            {/* Custom Header */}
            <View 
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    height: 56 + topInset,
                    paddingTop: topInset,
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E5E7EB',
                    backgroundColor: isDark ? '#0B1326' : '#FFFFFF',
                }}
            >
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 6, marginLeft: -8 }}>
                    <Ionicons name="close" size={26} color={isDark ? '#F4F4F5' : '#18181B'} />
                </TouchableOpacity>
                <Text style={{ fontSize: 16, fontWeight: '800', color: isDark ? '#FFFFFF' : '#111827' }}>Settings</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView 
                style={{ flex: 1, backgroundColor: isDark ? '#0B1326' : '#FFFFFF' }}
                contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16, paddingBottom: 60 }}
            >
                {/* SECTION 1: 👑 Subscription */}
                <View style={{ marginBottom: 28 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#9CA3AF' : '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 }}>
                        👑 Subscription
                    </Text>
                    <View style={{ backgroundColor: isDark ? '#151C2E' : '#F9FAFB', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="sparkles" size={20} color="#FBBF24" style={{ marginRight: 12 }} />
                                <View>
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#FFFFFF' : '#111827' }}>LamonGo Premium</Text>
                                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 }}>Unlock Chowmate Recommendations</Text>
                                </View>
                            </View>
                            <View style={{ backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#FBBF24', textTransform: 'uppercase', letterSpacing: 0.5 }}>Coming Soon</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* SECTION 2: 👤 Account */}
                <View style={{ marginBottom: 28 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#9CA3AF' : '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 }}>
                        👤 Account
                    </Text>
                    <View style={{ backgroundColor: isDark ? '#151C2E' : '#F9FAFB', borderRadius: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6', paddingHorizontal: 16 }}>
                        {/* Linked Account Info */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6' }}>
                            <Ionicons name={linkedAccount.icon} size={20} color={linkedAccount.color} style={{ marginRight: 12 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? '#9CA3AF' : '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>Linked Account</Text>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#FFFFFF' : '#111827', marginTop: 3 }}>{linkedAccount.label}</Text>
                            </View>
                        </View>

                        {/* Account Management Row */}
                        <TouchableOpacity 
                            onPress={() => router.push('/account-management')}
                            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 }}
                            activeOpacity={0.7}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="cog-outline" size={20} color={isDark ? "#A3A3A3" : "#262626"} style={{ marginRight: 12 }} />
                                <View>
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#FFFFFF' : '#111827' }}>Account Management</Text>
                                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 1 }}>Manage permanent data deletion options</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={isDark ? "#71717A" : "#9CA3AF"} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* SECTION 3: 📱 App Preferences */}
                <View style={{ marginBottom: 28 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#9CA3AF' : '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 }}>
                        📱 App Preferences
                    </Text>
                    <View style={{ backgroundColor: isDark ? '#151C2E' : '#F9FAFB', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6' }}>
                        {/* Night Mode Row */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', py: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name={isDark ? "moon" : "moon-outline"} size={20} color={isDark ? "#FBBF24" : "#262626"} style={{ marginRight: 12 }} />
                                <View>
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#FFFFFF' : '#111827' }}>Night Mode</Text>
                                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 1 }}>Embrace the dark side</Text>
                                </View>
                            </View>
                            <Switch
                                value={isDark}
                                onValueChange={toggleTheme}
                                trackColor={{ false: '#D1D5DB', true: '#E11D48' }}
                                thumbColor={isDark ? '#FFFFFF' : '#F3F4F6'}
                            />
                        </View>

                        {/* Default Currency Selector Row */}
                        <TouchableOpacity 
                            onPress={() => setShowCurrencyModal(true)}
                            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 }}
                            activeOpacity={0.7}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="card-outline" size={20} color={isDark ? '#35E8D6' : '#004D40'} style={{ marginRight: 12 }} />
                                <View>
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#FFFFFF' : '#111827' }}>Default Currency</Text>
                                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 1 }}>Pre-selected currency when posting</Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ fontSize: 15, fontWeight: '800', color: '#00D2C4', marginRight: 6 }}>{currency}</Text>
                                <Ionicons name="chevron-forward" size={16} color={isDark ? "#71717A" : "#9CA3AF"} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* SECTION 4: ⚖️ Legal & About */}
                <View style={{ marginBottom: 28 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#9CA3AF' : '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 }}>
                        ⚖️ Legal & About
                    </Text>
                    <View style={{ backgroundColor: isDark ? '#151C2E' : '#F9FAFB', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6' }}>
                        {/* Terms of Service Link */}
                        <TouchableOpacity 
                            onPress={() => router.push('/terms-of-service')}
                            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6' }}
                            activeOpacity={0.7}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="document-text-outline" size={20} color={isDark ? "#A3A3A3" : "#262626"} style={{ marginRight: 12 }} />
                                <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#FFFFFF' : '#111827' }}>Terms of Service</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={isDark ? "#71717A" : "#9CA3AF"} />
                        </TouchableOpacity>

                        {/* Privacy Policy Link */}
                        <TouchableOpacity 
                            onPress={() => router.push('/privacy-policy')}
                            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 }}
                            activeOpacity={0.7}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="shield-checkmark-outline" size={20} color={isDark ? "#A3A3A3" : "#262626"} style={{ marginRight: 12 }} />
                                <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#FFFFFF' : '#111827' }}>Privacy Policy</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={isDark ? "#71717A" : "#9CA3AF"} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Subtle Centered Sign Out Button */}
                <TouchableOpacity
                    onPress={handleSignOut}
                    style={{
                        paddingVertical: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 24, // Separation from other settings
                        marginBottom: 8
                    }}
                    activeOpacity={0.7}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="log-out-outline" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} style={{ marginRight: 8 }} />
                        <Text style={{ 
                            color: isDark ? '#9CA3AF' : '#6B7280', 
                            fontWeight: '600', 
                            fontSize: 14.5,
                            fontFamily: Platform.OS === 'android' ? 'Inter-SemiBold' : 'Inter'
                        }}>
                            Sign Out
                        </Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>

            {/* Currency Picker Modal */}
            <CurrencyPicker
                visible={showCurrencyModal}
                onClose={() => setShowCurrencyModal(false)}
                onSelect={handleCurrencySelect}
                currentCurrency={currency}
            />
        </View>
    );
}
