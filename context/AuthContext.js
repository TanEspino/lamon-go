import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
// import { useRouter, useSegments } from 'expo-router';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState({ id: 'mock-user-id', email: 'mock@lamongo.com' });
    const [session, setSession] = useState({ user: { id: 'mock-user-id' } });
    const [profile, setProfile] = useState({
        id: 'mock-user-id',
        username: 'mock_foodie',
        full_name: 'Mock User',
        avatar_url: 'https://placehold.co/150x150/png?text=Mock',
        bio: 'Just testing the app!',
        website: ''
    });
    const [loading, setLoading] = useState(false);
    // const router = useRouter();
    // const segments = useSegments();

    // MOCK MODE: Session fetching disabled for now
    /*
    useEffect(() => {
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session ? session.user : null);
            if (session) {
                await fetchProfile(session.user.id);
            }
            setLoading(false);
        };

        fetchSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            setUser(session ? session.user : null);
            if (session) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);
    */

    const fetchProfile = async (userId) => {
        // Mock fetch - do nothing or update state if needed
        console.log("Mock fetchProfile called for:", userId);
    };

    const signOut = async () => {
        // await supabase.auth.signOut();
        Alert.alert("Mock Mode", "You are in mock mode. Cannot sign out.");
    };

    const updateProfileLocal = (updates) => {
        setProfile(prev => ({...prev, ...updates}));
    };

    // MOCK MODE: Route protection disabled
    /*
    // Protected Route Logic
    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!user && !inAuthGroup) {
            router.replace('/(auth)/sign-in');
        } else if (user && inAuthGroup) {
            if (profile && profile.username) {
                router.replace('/(tabs)');
            } else {
                router.replace('/(auth)/setup-profile');
            }
        } 
        // ...
    }, [user, loading, segments, profile]);
    */

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, signOut, fetchProfile, updateProfileLocal }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
