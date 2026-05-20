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
            const formattedReviews = data.map(r => {
                const parsedPhotos = r.image_url ? r.image_url.split(',').map(u => u.trim()).filter(Boolean) : [];
                return {
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
                    photo_url: parsedPhotos[0] || '',
                    photos: parsedPhotos,
                    created_at: r.created_at,
                };
            });
            
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
            const parsedPhotos = data.image_url ? data.image_url.split(',').map(u => u.trim()).filter(Boolean) : [];
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
                photo_url: parsedPhotos[0] || '',
                photos: parsedPhotos,
                created_at: data.created_at,
            };
            
            setReviews(prev => [formatted, ...prev]);
        } catch (error) {
            console.error('Error adding review:', error);
            throw error;
        }
    };

    const updateReview = async (updatedReview) => {
        if (!user) throw new Error("Must be logged in to update.");
        try {
            const dbReview = {
                restaurant_name: updatedReview.restaurant_name,
                dish_name: updatedReview.dish_name,
                rating: updatedReview.rating,
                price: updatedReview.price,
                currency: updatedReview.currency,
                caption: updatedReview.notes,
                image_url: updatedReview.photo_url,
            };

            const { data, error } = await supabase
                .from('reviews')
                .update(dbReview)
                .eq('id', updatedReview.id)
                .select()
                .single();

            if (error) throw error;

            const parsedPhotos = data.image_url ? data.image_url.split(',').map(u => u.trim()).filter(Boolean) : [];
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
                photo_url: parsedPhotos[0] || '',
                photos: parsedPhotos,
                created_at: data.created_at,
            };

            setReviews(prev => prev.map(r => r.id === data.id ? formatted : r));
        } catch (error) {
            console.error('Error updating review:', error);
            throw error;
        }
    };

    const deleteReview = async (id) => {
        try {
            // Find the review to get the image_url before we delete it
            const reviewToDelete = reviews.find(r => r.id === id);

            // 1. Delete the post from the database
            const { error } = await supabase.from('reviews').delete().eq('id', id);
            if (error) throw error;
            
            // 2. If the post had images, clean up the massive files from the Storage Bucket!
            if (reviewToDelete && reviewToDelete.photos && reviewToDelete.photos.length > 0) {
                const fileNamesToDelete = reviewToDelete.photos
                    .filter(url => url.includes('review-images'))
                    .map(url => url.split('/').pop())
                    .filter(Boolean);
                
                if (fileNamesToDelete.length > 0) {
                    await supabase.storage.from('review-images').remove(fileNamesToDelete);
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
