import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

console.log("Hello from notify-buddy Edge Function!");

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("Received Webhook Payload:", JSON.stringify(payload, null, 2));

    const { type, table, record, old_record } = payload;

    if (table !== 'buddies') {
      return new Response(JSON.stringify({ error: "Invalid table" }), { status: 400 });
    }

    let recipientId = null;
    let senderId = null;
    let title = "";
    let bodyTemplate = "";
    let url = "";

    if (type === 'INSERT' && record.status === 'pending') {
      recipientId = record.receiver_id;
      senderId = record.requester_id;
      title = "🍕 New Chowmate Request!";
      bodyTemplate = "@{username} wants to connect with you in lamon.go!";
      url = "/notifications";
    } else if (type === 'UPDATE' && record.status === 'accepted' && old_record?.status === 'pending') {
      recipientId = record.requester_id;
      senderId = record.receiver_id;
      title = "🎉 Chowmate Connected!";
      bodyTemplate = "@{username} accepted your Chowmate request! Let's eat!";
      url = "/profile";
    } else {
      console.log("No push notification actions required for this event.");
      return new Response(JSON.stringify({ message: "No action required" }), { status: 200 });
    }

    if (!recipientId || !senderId) {
      return new Response(JSON.stringify({ error: "Missing sender or receiver details" }), { status: 400 });
    }

    // Initialize Supabase Client with service role key to query profiles bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch Sender profile (to get username)
    const { data: senderProfile, error: senderError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', senderId)
      .single();

    if (senderError || !senderProfile) {
      console.error("Error fetching sender profile:", senderError);
      return new Response(JSON.stringify({ error: "Sender profile not found" }), { status: 404 });
    }

    // Fetch Recipient profile (to get push token)
    const { data: recipientProfile, error: recipientError } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', recipientId)
      .single();

    if (recipientError || !recipientProfile) {
      console.error("Error fetching recipient profile:", recipientError);
      return new Response(JSON.stringify({ error: "Recipient profile not found" }), { status: 404 });
    }

    const expoPushToken = recipientProfile.expo_push_token;
    if (!expoPushToken) {
      console.log(`User ${recipientId} does not have an expo_push_token registered. Skipping push notification.`);
      return new Response(JSON.stringify({ message: "No push token registered for recipient" }), { status: 200 });
    }

    const username = senderProfile.username || "Someone";
    const body = bodyTemplate.replace("{username}", username);

    console.log(`Sending push notification to token ${expoPushToken}...`);
    
    // Call Expo Push Notification API
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: "default",
        title: title,
        body: body,
        data: { url: url },
      }),
    });

    const expoResult = await response.json();
    console.log("Expo API Response:", JSON.stringify(expoResult, null, 2));

    return new Response(JSON.stringify({ success: true, expoResult }), {
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
