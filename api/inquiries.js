// Vercel Serverless Function - Get inquiries for admin
// Requires authentication via Supabase JWT

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Verify auth token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const authClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);

    if (authError || !user) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    try {
        if (req.method === 'GET') {
            const { limit = 50, offset = 0, status } = req.query;

            let query = supabase
                .from('inquiries')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

            if (status) query = query.eq('status', status);

            const { data, error, count } = await query;

            if (error) throw error;

            return res.status(200).json({ data, count });

        } else if (req.method === 'PATCH') {
            const { id, status } = req.body;

            if (!id || !status) {
                return res.status(400).json({ error: 'Missing id or status' });
            }

            const { error } = await supabase
                .from('inquiries')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (err) {
        console.error('Error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
}
