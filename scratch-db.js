const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eywcrltvlwvzwlyzdzty.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5d2NybHR2bHd2endseXpkenR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNTI1ODIsImV4cCI6MjA5NDYyODU4Mn0.J--gAEu4fK4l9pueRJFEhRPKW8jHSoHA5Lxqu-23Big';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQuery() {
    console.log("Testing profile.js fetchBuddies query syntax...");
    try {
        const { data, error } = await supabase
            .from('buddies')
            .select(`
                id,
                requester_id,
                receiver_id,
                status,
                requester:profiles!requester_id(id, username, full_name, avatar_url),
                receiver:profiles!receiver_id(id, username, full_name, avatar_url)
            `)
            .limit(1);

        if (error) {
            console.error("FetchBuddies Query Error:", error);
        } else {
            console.log("FetchBuddies query success! Returned array size:", data.length);
            if (data.length > 0) {
                console.log("Sample row:", JSON.stringify(data[0], null, 2));
            }
        }
    } catch (e) {
        console.error("Execution error:", e);
    }
}

testQuery();
