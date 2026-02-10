// Vercel Serverless Function - Proxy for Vercel Analytics API
// Requires VERCEL_API_TOKEN and VERCEL_PROJECT_ID env variables

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const token = process.env.VERCEL_API_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID || '';

    if (!token || !projectId) {
        return res.status(500).json({ error: 'Vercel API not configured' });
    }

    const { period = '30d', type = 'all' } = req.query;

    // Calculate date range
    const now = new Date();
    const dayMap = { '24h': 1, '7d': 7, '30d': 30, '90d': 90, '12m': 365 };
    const days = dayMap[period] || 30;
    const from = new Date(now - days * 86400000).toISOString();
    const to = now.toISOString();

    const teamParam = teamId ? `&teamId=${teamId}` : '';
    const baseUrl = `https://vercel.com/api/web/insights`;

    try {
        const results = {};

        // Fetch pageviews timeseries
        if (type === 'all' || type === 'timeseries') {
            const granularity = days <= 7 ? 'hour' : days <= 90 ? 'day' : 'month';
            const tsRes = await fetch(
                `${baseUrl}/stats/path?projectId=${projectId}&from=${from}&to=${to}&granularity=${granularity}${teamParam}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (tsRes.ok) {
                results.timeseries = await tsRes.json();
            }
        }

        // Fetch top pages
        if (type === 'all' || type === 'pages') {
            const pagesRes = await fetch(
                `${baseUrl}/stats/path?projectId=${projectId}&from=${from}&to=${to}&limit=10${teamParam}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (pagesRes.ok) {
                results.pages = await pagesRes.json();
            }
        }

        // Fetch referrers
        if (type === 'all' || type === 'referrers') {
            const refRes = await fetch(
                `${baseUrl}/stats/referrer?projectId=${projectId}&from=${from}&to=${to}&limit=10${teamParam}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (refRes.ok) {
                results.referrers = await refRes.json();
            }
        }

        // Fetch countries
        if (type === 'all' || type === 'countries') {
            const countryRes = await fetch(
                `${baseUrl}/stats/country?projectId=${projectId}&from=${from}&to=${to}&limit=10${teamParam}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (countryRes.ok) {
                results.countries = await countryRes.json();
            }
        }

        // Fetch devices/browsers
        if (type === 'all' || type === 'devices') {
            const devRes = await fetch(
                `${baseUrl}/stats/device?projectId=${projectId}&from=${from}&to=${to}${teamParam}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (devRes.ok) {
                results.devices = await devRes.json();
            }

            const browserRes = await fetch(
                `${baseUrl}/stats/browser?projectId=${projectId}&from=${from}&to=${to}${teamParam}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (browserRes.ok) {
                results.browsers = await browserRes.json();
            }
        }

        return res.status(200).json(results);

    } catch (err) {
        console.error('Analytics API error:', err);
        return res.status(500).json({ error: 'Failed to fetch analytics' });
    }
}
