import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testQuery() {
    console.log("Testing match_stats -> athletes join...");
    const { data, error } = await supabase
        .from('match_stats')
        .select('*, athletes!athlete_id(name, pos)')
        .limit(1);

    if (error) {
        console.error("ERROR WITH !athlete_id:", JSON.stringify(error, null, 2));
    } else {
        console.log("SUCCESS WITH !athlete_id:", data);
    }

    const { data: data2, error: error2 } = await supabase
        .from('match_stats')
        .select('*, athletes(name, pos)')
        .limit(1);

    if (error2) {
        console.error("ERROR WITHOUT !athlete_id:", JSON.stringify(error2, null, 2));
    } else {
        console.log("SUCCESS WITHOUT !athlete_id:", data2);
    }
}

testQuery();
