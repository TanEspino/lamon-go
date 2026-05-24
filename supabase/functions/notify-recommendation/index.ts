import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

console.log("Hello from notify-recommendation Edge Function!");

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("Received Webhook Payload:", JSON.stringify(payload, null, 2));

    const { type, table, record, old_record } = payload;

    if (table !== 'reviews') {
      return new Response(JSON.stringify({ error: "Invalid table" }), { status: 400 });
    }

    // Only send notification if it is an INSERT with visibility = 'recommended', 
    // OR an UPDATE where visibility has changed from something else to 'recommended'
    const isNewRecommendation = type === 'INSERT' && record.visibility === 'recommended';
    const isUpdatedToRecommendation = type === 'UPDATE' && 
                                     record.visibility === 'recommended' && 
                                     old_record?.visibility !== 'recommended';

    if (!isNewRecommendation && !isUpdatedToRecommendation) {
      console.log("No push notification action required. Post is not a new recommendation.");
      return new Response(JSON.stringify({ message: "No action required" }), { status: 200 });
    }

    const authorId = record.user_id;
    if (!authorId) {
      return new Response(JSON.stringify({ error: "Missing user_id for review" }), { status: 400 });
    }

    // Initialize Supabase Client with service role key to query profiles and buddies bypassing RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch Author profile (to get username)
    const { data: authorProfile, error: authorError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', authorId)
      .single();

    if (authorError || !authorProfile) {
      console.error("Error fetching author profile:", authorError);
      return new Response(JSON.stringify({ error: "Author profile not found" }), { status: 404 });
    }

    const authorUsername = authorProfile.username || "A Chowmate";

    // 2. Fetch all accepted buddies of the author
    const { data: buddies, error: buddiesError } = await supabase
      .from('buddies')
      .select('requester_id, receiver_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${authorId},receiver_id.eq.${authorId}`);

    if (buddiesError) {
      console.error("Error fetching buddies list:", buddiesError);
      return new Response(JSON.stringify({ error: "Failed to fetch buddies" }), { status: 500 });
    }

    if (!buddies || buddies.length === 0) {
      console.log("Author has no connected Chowmates. Skipping push notification.");
      return new Response(JSON.stringify({ message: "No buddies to notify" }), { status: 200 });
    }

    // Extract unique buddy user IDs (excluding the author themselves)
    const buddyIds = buddies.map(b => b.requester_id === authorId ? b.receiver_id : b.requester_id);
    console.log(`Found Chowmate IDs to notify:`, buddyIds);

    // 3. Fetch push tokens for all buddies
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, expo_push_token')
      .in('id', buddyIds);

    if (profilesError) {
      console.error("Error fetching buddy push tokens:", profilesError);
      return new Response(JSON.stringify({ error: "Failed to fetch push tokens" }), { status: 500 });
    }

    // Extract valid push tokens
    const pushTokens = profiles
      .map(p => p.expo_push_token)
      .filter(token => token && token.startsWith('ExponentPushToken'));

    if (pushTokens.length === 0) {
      console.log("None of the buddies have an Expo Push Token registered. Skipping push notification.");
      return new Response(JSON.stringify({ message: "No push tokens registered" }), { status: 200 });
    }

    console.log(`Sending push notifications to ${pushTokens.length} tokens:`, pushTokens);

    const title = `🏅 Recommended by @${authorUsername}!`;
    const body = `@${authorUsername} recommended: ${record.dish_name} at ${record.restaurant_name}! 🏅`;
    const deepLinkUrl = `/single-post?id=${record.id}`;

    // Send notifications to Expo Push API
    // Expo allows sending up to 100 notifications in a single batch request
    const notificationMessages = pushTokens.map(token => ({
      to: token,
      sound: "default",
      title: title,
      body: body,
      data: { url: deepLinkUrl, postId: record.id },
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(notificationMessages),
    });

    const expoResult = await response.json();
    console.log("Expo API Response:", JSON.stringify(expoResult, null, 2));

    return new Response(JSON.stringify({ success: true, count: pushTokens.length, expoResult }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Edge function execution error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
