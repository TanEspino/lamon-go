import { supabase } from '../lib/supabase';

/**
 * Validates the username format strictly on the client.
 * Returns a specific descriptive error string if validation fails, or null if valid.
 * 
 * Rules:
 * 1. Length: Must be between 3 and 15 characters.
 * 2. Lowercase Only: Must enforce lowercase.
 * 3. Allowed Characters: Alphanumeric (a-z, 0-9), underscores (_), and periods (.) only. No spaces.
 * 4. Formatting Restrictions: Cannot start or end with a period/underscore. Cannot contain consecutive periods/underscores.
 * 5. Blocklist: Reject: ['admin', 'lamongo', 'support', 'system', 'moderator', 'root'].
 * 
 * @param {string} username - The username string to validate.
 * @returns {string|null} - Descriptive error message or null if valid.
 */
export function validateUsernameFormat(username) {
    if (!username || !username.trim()) {
        return 'Username is required.';
    }

    const trimmed = username.trim();

    // 1. Length enforcement
    if (trimmed.length < 3) {
        return 'Must be at least 3 characters.';
    }
    if (trimmed.length > 15) {
        return 'Must be at most 15 characters.';
    }

    // 2. Lowercase enforcement
    if (trimmed !== trimmed.toLowerCase()) {
        return 'Username must be lowercase only.';
    }

    // 3. Allowed characters validation (a-z, 0-9, _, .)
    const allowedRegex = /^[a-z0-9._]+$/;
    if (!allowedRegex.test(trimmed)) {
        return 'Only lowercase letters, numbers, periods, and underscores are allowed.';
    }

    // 4. Formatting restrictions
    if (trimmed.startsWith('.') || trimmed.startsWith('_')) {
        return 'Cannot start with a period or underscore.';
    }
    if (trimmed.endsWith('.') || trimmed.endsWith('_')) {
        return 'Cannot end with a period or underscore.';
    }

    // Consecutive checks
    if (trimmed.includes('..') || trimmed.includes('__') || trimmed.includes('._') || trimmed.includes('_.')) {
        return 'Cannot contain consecutive periods or underscores.';
    }

    // 5. Blocklist screening
    const blocklist = ['admin', 'lamongo', 'support', 'system', 'moderator', 'root'];
    if (blocklist.includes(trimmed)) {
        return 'This username is reserved and cannot be used.';
    }

    return null; // Passes all format validations
}

/**
 * Queries Supabase to check if a username is already taken by another user.
 * 
 * @param {string} newUsername - The username to check.
 * @returns {Promise<boolean>} - True if username already exists, false otherwise.
 */
export async function checkUsernameExists(newUsername) {
    if (!newUsername || !newUsername.trim()) return false;
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', newUsername.trim().toLowerCase())
            .maybeSingle();

        if (error) {
            console.error("Supabase error during username availability check:", error);
            throw error;
        }

        return !!data;
    } catch (err) {
        console.error("Failed to check username existence:", err);
        throw err;
    }
}

/**
 * Handles the final username update, enforcing a strict 30-day change cooldown policy.
 * 
 * @param {string} newUsername - The new username.
 * @param {string} userId - The unique ID of the user.
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function updateUsername(newUsername, userId) {
    if (!userId) {
        throw new Error("User ID is required to perform an update.");
    }
    
    const formatted = newUsername.trim().toLowerCase();
    
    // First run format check to prevent processing bad data
    const formatError = validateUsernameFormat(formatted);
    if (formatError) {
        throw new Error(formatError);
    }

    // 1. Fetch current profile to get current username and last_username_change timestamp
    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('username, last_username_change')
        .eq('id', userId)
        .single();

    if (fetchError) {
        console.error("Error fetching profile to verify username change:", fetchError);
        throw new Error("Could not retrieve profile data. Please try again.");
    }

    const currentUsername = profile?.username;

    // If username hasn't actually changed, exit early with success
    if (currentUsername === formatted) {
        return { success: true, message: "Username is unchanged." };
    }

    // Double check availability before updating (prevents racing/manual bypasses)
    const isTaken = await checkUsernameExists(formatted);
    if (isTaken) {
        throw new Error("Username is already taken by another account.");
    }

    // 2. Cooldown check: enforce a strict 30-day limit
    if (profile?.last_username_change) {
        const lastChange = new Date(profile.last_username_change);
        const now = new Date();
        const diffMs = now - lastChange;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const cooldownDays = 30;

        if (diffDays < cooldownDays) {
            const daysLeft = cooldownDays - diffDays;
            throw new Error(`Username cooldown active! Please wait ${daysLeft} more day${daysLeft === 1 ? '' : 's'} before changing it again.`);
        }
    }

    // 3. Perform update transaction setting previous_username, username, and last_username_change
    const { error: updateError } = await supabase
        .from('profiles')
        .update({
            previous_username: currentUsername || null,
            username: formatted,
            last_username_change: new Date().toISOString()
        })
        .eq('id', userId);

    if (updateError) {
        console.error("Supabase update error during username execution:", updateError);
        throw new Error(updateError.message || "Failed to commit username update.");
    }

    return { success: true };
}
