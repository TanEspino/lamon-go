import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const ReviewsContext = createContext();

export function ReviewsProvider({ children }) {
    const { user, profile, fetchBuddyStats } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [savedReviewIds, setSavedReviewIds] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSavedReviews = useCallback(async () => {
        if (!user) {
            setSavedReviewIds([]);
            return;
        }
        try {
            const { data, error } = await supabase
                .from('saved_posts')
                .select('post_id')
                .eq('user_id', user.id);
            if (error) throw error;
            setSavedReviewIds(data.map(d => d.post_id));
        } catch (error) {
            console.log('⚠️ Network/Fetch error in fetchSavedReviews:', error.message || error);
        }
    }, [user?.id]);

    const toggleSaveReview = async (postId) => {
        if (!user) throw new Error("Must be logged in to save posts.");
        const isAlreadySaved = savedReviewIds.includes(postId);
        try {
            if (isAlreadySaved) {
                const { error } = await supabase
                    .from('saved_posts')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('post_id', postId);
                if (error) throw error;
                setSavedReviewIds(prev => prev.filter(id => id !== postId));
            } else {
                const { error } = await supabase
                    .from('saved_posts')
                    .insert({ user_id: user.id, post_id: postId });
                if (error) throw error;
                setSavedReviewIds(prev => [...prev, postId]);
            }
        } catch (error) {
            console.error('Error toggling review save:', error);
            throw error;
        }
    };

    const fetchReviews = useCallback(async () => {
        if (!user) {
            setReviews([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            // Fetch accepted buddies
            const { data: buddyData, error: buddyError } = await supabase
                .from('buddies')
                .select('requester_id, receiver_id')
                .eq('status', 'accepted')
                .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
            
            let userIdsToFetch = [user.id];
            if (!buddyError && buddyData) {
                buddyData.forEach(b => {
                    if (b.requester_id !== user.id) userIdsToFetch.push(b.requester_id);
                    if (b.receiver_id !== user.id) userIdsToFetch.push(b.receiver_id);
                });
            }

            const { data, error } = await supabase
                .from('reviews')
                .select('*, profiles:user_id(username, avatar_url, full_name)')
                .in('user_id', userIdsToFetch)
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
                    visibility: r.visibility || 'shared',
                };
            });
            
            setReviews(formattedReviews);
            if (user?.id && fetchBuddyStats) {
                fetchBuddyStats(user.id, true);
            }
        } catch (error) {
            console.log('⚠️ Network/Fetch error in fetchReviews:', error.message || error);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    // Fetch reviews whenever the logged-in user changes
    useEffect(() => {
        if (user?.id) {
            fetchReviews();
            fetchSavedReviews();
        } else {
            setReviews([]);
            setSavedReviewIds([]);
            setLoading(false);
        }
    }, [user?.id, fetchReviews, fetchSavedReviews]);

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
                visibility: newReview.visibility || 'shared',
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
                visibility: data.visibility || 'shared',
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
                visibility: updatedReview.visibility || 'shared',
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
                visibility: data.visibility || 'shared',
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
        <ReviewsContext.Provider value={{ reviews, addReview, updateReview, deleteReview, fetchReviews, loading, savedReviewIds, toggleSaveReview }}>
            {children}
        </ReviewsContext.Provider>
    );
}

export function useReviews() {
    return useContext(ReviewsContext);
}
