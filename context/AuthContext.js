import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter, useSegments } from 'expo-router';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    // Listen for Auth State Changes
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

    const fetchProfile = async (userId) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
        } else {
            setProfile(data);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const updateProfileLocal = (updates) => {
        setProfile(prev => ({...prev, ...updates}));
    };

    // Protected Route Logic
    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!user && !inAuthGroup) {
            router.replace('/(auth)/sign-in');
        } else if (user && inAuthGroup) {
            if (profile) {
                router.replace('/(tabs)');
            }
        } 
    }, [user, loading, segments, profile]);

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, signOut, fetchProfile, updateProfileLocal }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
