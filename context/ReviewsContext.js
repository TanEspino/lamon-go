import React, { createContext, useState, useContext } from 'react';
import { useAuth } from './AuthContext';

// Mock Data (Moved from index.js) - Keep for initial state or examples if needed
// ... existing mock data ...

const ReviewsContext = createContext();

export function ReviewsProvider({ children }) {
    const { user, profile } = useAuth();
    const [reviews, setReviews] = useState([]);

    const addReview = (newReview) => {
        const reviewWithId = {
            ...newReview,
            id: Date.now().toString(),
            user_id: user?.id || 'anonymous',
            username: profile?.username || 'Guest',
            avatar_url: profile?.avatar_url || 'https://placehold.co/100x100/png?text=?',
            created_at: new Date().toISOString(),
            photos: newReview.photos || (newReview.photo_url ? [newReview.photo_url] : [])
        };
        setReviews([reviewWithId, ...reviews]);
    };

    const updateReview = (updatedReview) => {
        setReviews(reviews.map(r => r.id === updatedReview.id ? {
            ...r,
            ...updatedReview,
            photos: updatedReview.photos || r.photos || (updatedReview.photo_url ? [updatedReview.photo_url] : [])
        } : r));
    };

    const deleteReview = (id) => {
        setReviews(reviews.filter(r => r.id !== id));
    };

    return (
        <ReviewsContext.Provider value={{ reviews, addReview, updateReview, deleteReview }}>
            {children}
        </ReviewsContext.Provider>
    );
}

export function useReviews() {
    return useContext(ReviewsContext);
}
