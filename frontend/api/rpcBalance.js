import fetch from 'node-fetch';

const BSSC_RPC_URL = 'https://bssc-rpc.bssc.live';

// Vercel Serverless Function handler
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { address } = req.body;
    
    if (!address) {
        return res.status(400).json({ error: 'Address is required.' });
    }
    
    try {
        const r = await fetch(BSSC_RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getBalance',
                params: [address],
            }),
        });

        if (!r.ok) {
            throw new Error(`RPC server responded with status: ${r.status}`);
        }

        const data = await r.json();

        if (data.error) {
            return res.status(200).json({ error: data.error.message || 'Unknown RPC error.' });
        }

        // Return the balance value (in lamports) or 0
        return res.status(200).json({ balance: data.result?.value || 0 }); 
    } catch (err) {
        console.error('RPC fetch failed:', err.message);
        return res.status(500).json({ error: `RPC fetch failed: ${err.message}` });
    }
}
