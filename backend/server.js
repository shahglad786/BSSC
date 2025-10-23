import express from 'express';
import fetch from 'node-fetch';
import cheerio from 'cheerio';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(express.json());

// NOTE: Ensure your .env file contains GEMINI_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const BSSC_RPC_URL = '[https://bssc-rpc.bssc.live](https://bssc-rpc.bssc.live)';
const BSSC_OFFICIAL_URL = '[https://bssc.live/](https://bssc.live/)'; // New official website URL
const GEMINI_API_URL = '[https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent](https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent)';

// Helper function to determine if a string is a transaction hash or an address based on length
const isTransactionHash = (id) => id.length > 50; 

/**
 * Utility function to clean and trim scraped HTML text.
 * @param {string} rawText 
 * @param {number} maxLength 
 * @returns {string} Cleaned and trimmed text.
 */
const cleanScrapedText = (rawText, maxLength = 3000) => {
    return rawText
        .replace(/(\r\n|\n|\r)/gm, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

// --- NEW: Function to scrape the main BSSC website for general context ---
const fetchBsscWebsiteData = async () => {
  try {
    console.log(`Fetching general website data from: ${BSSC_OFFICIAL_URL}`);

    const html = await fetch(BSSC_OFFICIAL_URL, { 
        timeout: 5000
    }).then(r => r.text());
    
    const $ = cheerio.load(html);
    
    // Scrape all text content from the body
    const rawText = $('body').text();
    
    // Clean and limit to 5000 characters for comprehensive context
    const summary = cleanScrapedText(rawText, 5000); 

    return `Official Website Context (General Project Info): ${summary}...`;
  } catch (err) {
    console.error('BSSC Website fetch failed:', err.message);
    return `Official Website Context: Failed to fetch data from ${BSSC_OFFICIAL_URL}. The AI will rely on its general knowledge.`;
  }
};


// --- 1. Fetch from explorer and create context for AI (No changes needed here, keeping for structure) ---
app.get('/api/fetchExplorerData/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
        return res.json({ summary: 'No ID provided.' });
    }
    
    // Determine the type and build the correct URL
    const isTx = isTransactionHash(id);
    const type = isTx ? 'tx' : 'address';
    const url = `https://explorer.bssc.live/${type}/${id}`;

    console.log(`Fetching explorer data from: ${url}`);

    const html = await fetch(url, { 
        timeout: 5000
    }).then(r => r.text());
    
    const $ = cheerio.load(html);
    const title = $('title').text();
    
    // Extract text content and clean it up
    const rawText = $('body').text();
    const summary = cleanScrapedText(rawText, 3000); 

    const context = `Explorer Data Context for ${type} ${id}: ${title} - ${summary}...`;
    
    res.json({ summary: context });
  } catch (err) {
    console.error('Explorer fetch failed:', err.message);
    res.status(500).json({ error: `Explorer fetch failed: ${err.message}` });
  }
});

// --- 2. RPC Balance Fetch Proxy (Fixes CORS issue) ---
app.post('/api/rpcBalance', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
        return res.status(400).json({ error: 'Address is required.' });
    }
    
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
        return res.json({ error: data.error.message || 'Unknown RPC error.' });
    }

    // Return the balance value (in lamports) or 0
    res.json({ balance: data.result?.value || 0 }); 
  } catch (err) {
    console.error('RPC fetch failed:', err.message);
    res.status(500).json({ error: `RPC fetch failed: ${err.message}` });
  }
});


// --- 3. Main AI Analysis Route (Updated to include website scraping) ---
app.post('/api/analyze', async (req, res) => {
  const { query } = req.body;
  if (!query) {
      return res.status(400).json({ error: 'Query is required.' });
  }
  
  if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in environment variables.' });
  }

  try {
    let context = '';
    const queryTerm = query.trim();
    
    // Check if the query is a blockchain identifier (long string without spaces)
    const isBlockchainIdentifier = queryTerm.length >= 32 && !queryTerm.includes(' ');
    
    if (isBlockchainIdentifier) {
      // Case 1: Likely an Address or TX Hash -> Fetch Explorer Data
      console.log(`Query is a blockchain identifier. Fetching Explorer data for: ${queryTerm}`);
      const explorerRes = await fetch(`http://localhost:5000/api/fetchExplorerData/${queryTerm}`);
      const explorer = await explorerRes.json();
      context = explorer.summary || '';
      
      if (explorer.error) {
          console.warn('Could not fetch explorer data, proceeding without context:', explorer.error);
      }
    } else {
      // Case 2: General Question -> Fetch Official Website Data
      console.log(`Query is general. Fetching Official Website data for context.`);
      context = await fetchBsscWebsiteData();
    }
    
    const fullPrompt = `
      You are the BSSC AI Assistant. Analyze the provided context and the user's query. 
      The native token for this network is BSSC.
      
      CONTEXT (On-chain or General Website Data):
      ---
      ${context}
      ---
      
      USER QUERY: ${query}
      
      ---
      INSTRUCTIONS:
      1. Use the CONTEXT to provide a grounded, specific, and accurate answer.
      2. If the CONTEXT is relevant on-chain data, use it for analysis.
      3. If the CONTEXT is from the official website, use it to answer general questions (e.g., roadmap, features).
      4. Your response MUST be clean, plain text. DO NOT use markdown, bolding, lists, or code blocks.
    `;

    const aiRes = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: fullPrompt.trim() }] },
          ],
        }),
      }
    );

    const data = await aiRes.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No detailed response from the AI.';

    res.json({ answer: answer.trim() });
  } catch (err) {
    console.error('AI Processing Error:', err.message);
    res.status(500).json({ error: `AI analysis failed: ${err.message}` });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`BSSC AI Assistant backend running on port ${PORT}`);
});
