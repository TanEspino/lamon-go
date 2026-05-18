import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const ReviewsContext = createContext();

export function ReviewsProvider({ children }) {
    const { user, profile } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReviews = useCallback(async () => {
        if (!user) {
            setReviews([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('reviews')
                .select('*, profiles:user_id(username, avatar_url, full_name)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            // Format data to match app expectations exactly as they were with mock data
            const formattedReviews = data.map(r => ({
                id: r.id,
                user_id: r.user_id,
                username: r.profiles?.username || r.profiles?.full_name || 'Guest',
                avatar_url: r.profiles?.avatar_url || 'https://placehold.co/100x100/png?text=?',
                restaurant_name: r.restaurant_name,
                dish_name: r.dish_name,
                rating: r.rating,
                price: r.price,
                currency: r.currency,
                notes: r.caption,
                photo_url: r.image_url,
                photos: r.image_url ? [r.image_url] : [],
                created_at: r.created_at,
            }));
            
            setReviews(formattedReviews);
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    // Fetch reviews whenever the logged-in user changes
    useEffect(() => {
        if (user?.id) {
            fetchReviews();
        } else {
            setReviews([]);
            setLoading(false);
        }
    }, [user?.id, fetchReviews]);

    const addReview = async (newReview) => {
        if (!user) throw new Error("Must be logged in to post.");
        
        try {
            const dbReview = {
                user_id: user.id,
                restaurant_name: newReview.restaurant_name,
                dish_name: newReview.dish_name,
                rating: newReview.rating,
                price: newReview.price,
                currency: newReview.currency,
                caption: newReview.notes,
                image_url: newReview.photo_url,
            };
            
            const { data, error } = await supabase
                .from('reviews')
                .insert([dbReview])
                .select()
                .single();
                
            if (error) throw error;
            
            // Add to local state immediately so UI feels snappy
            const formatted = {
                id: data.id,
                user_id: data.user_id,
                username: profile?.username || profile?.full_name || 'Guest',
                avatar_url: profile?.avatar_url || 'https://placehold.co/100x100/png?text=?',
                restaurant_name: data.restaurant_name,
                dish_name: data.dish_name,
                rating: data.rating,
                price: data.price,
                currency: data.currency,
                notes: data.caption,
                photo_url: data.image_url,
                photos: data.image_url ? [data.image_url] : [],
                created_at: data.created_at,
            };
            
            setReviews(prev => [formatted, ...prev]);
        } catch (error) {
            console.error('Error adding review:', error);
            throw error;
        }
    };

    const updateReview = async (updatedReview) => {
        // Will implement later if needed
    };

    const deleteReview = async (id) => {
        try {
            // Find the review to get the image_url before we delete it
            const reviewToDelete = reviews.find(r => r.id === id);

            // 1. Delete the post from the database
            const { error } = await supabase.from('reviews').delete().eq('id', id);
            if (error) throw error;
            
            // 2. If the post had an image, clean up the massive file from the Storage Bucket!
            if (reviewToDelete && reviewToDelete.photo_url && reviewToDelete.photo_url.includes('review-images')) {
                // Extract just the filename at the very end of the URL
                const fileName = reviewToDelete.photo_url.split('/').pop();
                if (fileName) {
                    await supabase.storage.from('review-images').remove([fileName]);
                }
            }

            setReviews(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error('Error deleting review:', error);
            alert("Error deleting: " + error.message);
        }
    };

    return (
        <ReviewsContext.Provider value={{ reviews, addReview, updateReview, deleteReview, fetchReviews, loading }}>
            {children}
        </ReviewsContext.Provider>
    );
}

export function useReviews() {
    return useContext(ReviewsContext);
}
