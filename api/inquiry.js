// Vercel Serverless Function - Handle form submissions
// Saves inquiries to Supabase

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { name, email, phone, service, message, page } = req.body;

        // Validate required fields
        if (!name || !email || !phone) {
            return res.status(400).json({ error: 'Vyplňte povinná pole (jméno, email, telefon)' });
        }

        // Simple email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Neplatný email' });
        }

        // Insert into Supabase
        const { data, error } = await supabase
            .from('inquiries')
            .insert([{
                name,
                email,
                phone,
                service: service || null,
                message: message || null,
                page: page || '/',
                status: 'new',
                created_at: new Date().toISOString()
            }])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ error: 'Chyba při ukládání poptávky' });
        }

        return res.status(200).json({
            success: true,
            message: 'Poptávka byla úspěšně odeslána'
        });

    } catch (err) {
        console.error('Server error:', err);
        return res.status(500).json({ error: 'Interní chyba serveru' });
    }
}
