// ===================================
// Supabase Configuration
// Replace these with your actual Supabase project values
// ===================================

const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // e.g. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // your anon/public key

// Initialize Supabase client
let supabase;

function initSupabase() {
    if (typeof window.supabase !== 'undefined') {
        return window.supabase;
    }

    if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        console.warn('Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in supabase-config.js');
        return null;
    }

    const { createClient } = window.supabaseJs || window.supabase;
    if (!createClient) {
        console.error('Supabase JS library not loaded');
        return null;
    }

    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabase;
}
