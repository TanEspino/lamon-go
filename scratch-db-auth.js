const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eywcrltvlwvzwlyzdzty.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5d2NybHR2bHd2endseXpkenR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNTI1ODIsImV4cCI6MjA5NDYyODU4Mn0.J--gAEu4fK4l9pueRJFEhRPKW8jHSoHA5Lxqu-23Big';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
    console.log("Signing in anonymously...");
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

    if (authError) {
        console.error("Auth Error:", authError);
        return;
    }

    const user = authData.user;
    console.log(`Signed in successfully as anonymous user: ${user.id}`);

    // Create a profile for the user since RLS needs it
    console.log("Inserting profile...");
    const username = 'testuser_' + Math.random().toString(36).substring(7);
    const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .insert({
            id: user.id,
            username: username,
            full_name: 'Test Anonymous User',
            avatar_url: 'https://placehold.co/100x100/png?text=Test'
        })
        .select()
        .single();

    if (profileErr) {
        console.error("Profile insertion failed:", profileErr);
        return;
    }
    console.log("Profile created:", profileData);

    // Let's create a second anonymous user to act as the sender
    console.log("Signing in a second time for sender...");
    const supabase2 = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData2, error: authError2 } = await supabase2.auth.signInAnonymously();
    if (authError2) {
        console.error("Second auth error:", authError2);
        return;
    }
    const senderUser = authData2.user;
    console.log(`Second user signed in: ${senderUser.id}`);

    console.log("Inserting sender profile...");
    const senderUsername = 'testuser_' + Math.random().toString(36).substring(7);
    const { data: senderProfile, error: senderProfileErr } = await supabase2
        .from('profiles')
        .insert({
            id: senderUser.id,
            username: senderUsername,
            full_name: 'Sender Anonymous User',
            avatar_url: 'https://placehold.co/100x100/png?text=Sender'
        })
        .select()
        .single();

    if (senderProfileErr) {
        console.error("Sender profile creation failed:", senderProfileErr);
        return;
    }
    console.log("Sender profile created:", senderProfile);

    // Now, let's send a buddy request from senderUser to user
    console.log("Sending buddy request from sender to receiver...");
    const { data: buddyRequest, error: buddyRequestErr } = await supabase2
        .from('buddies')
        .insert({
            requester_id: senderUser.id,
            receiver_id: user.id,
            status: 'pending'
        })
        .select()
        .single();

    if (buddyRequestErr) {
        console.error("Buddy request failed:", buddyRequestErr);
        return;
    }
    console.log("Buddy request inserted successfully:", buddyRequest);

    // Now, let's test the select join as the receiver (user)
    console.log("\nTesting notifications.js select query...");
    const { data: joinData, error: joinErr } = await supabase
        .from('buddies')
        .select('id, created_at, status, profiles!requester_id(id, username, full_name, avatar_url)')
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

    if (joinErr) {
        console.error("Join Query Error:", joinErr);
    } else {
        console.log(`Join query success! Found ${joinData.length} pending requests.`);
        if (joinData.length > 0) {
            console.log("Pending request row object structure:", JSON.stringify(joinData[0], null, 2));
            console.log("Profiles join key:", Object.keys(joinData[0]).filter(k => k.includes('profile')));
        }
    }

    // Clean up
    console.log("\nCleaning up...");
    await supabase.from('buddies').delete().eq('id', buddyRequest.id);
    await supabase.from('profiles').delete().eq('id', user.id);
    await supabase2.from('profiles').delete().eq('id', senderUser.id);
    console.log("Done!");
}

runTest();
