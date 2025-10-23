import fetch from 'node-fetch';
import cheerio from 'cheerio';

// IMPORTANT: Vercel reads environment variables (GEMINI_API_KEY) directly from the Vercel dashboard configuration.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BSSC_RPC_URL = 'https://bssc-rpc.bssc.live';
const BSSC_OFFICIAL_URL = 'https://bssc.live/';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent';

const isTransactionHash = (id) => id.length > 50; 

const cleanScrapedText = (rawText, maxLength = 3000) => {
    return rawText
        .replace(/(\r\n|\n|\r)/gm, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

const fetchBsscWebsiteData = async () => {
  try {
    const html = await fetch(BSSC_OFFICIAL_URL, { 
        timeout: 5000
    }).then(r => r.text());
    
    const $ = cheerio.load(html);
    const rawText = $('body').text();
    const summary = cleanScrapedText(rawText, 5000); 

    return `Official Website Context (General Project Info): ${summary}...`;
  } catch (err) {
    console.error('BSSC Website fetch failed:', err.message);
    return `Official Website Context: Failed to fetch data from ${BSSC_OFFICIAL_URL}. The AI will rely on its general knowledge.`;
  }
};

const fetchExplorerData = async (id) => {
    try {
        const isTx = isTransactionHash(id);
        const type = isTx ? 'tx' : 'address';
        const url = `https://explorer.bssc.live/${type}/${id}`;
    
        const html = await fetch(url, { 
            timeout: 5000
        }).then(r => r.text());
        
        const $ = cheerio.load(html);
        const title = $('title').text();
        const rawText = $('body').text();
        const summary = cleanScrapedText(rawText, 3000); 
    
        return { summary: `Explorer Data Context for ${type} ${id}: ${title} - ${summary}...` };
    } catch (err) {
        console.error('Explorer fetch failed:', err.message);
        return { error: `Explorer fetch failed: ${err.message}` };
    }
}


// Vercel Serverless Function handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { query } = req.body;
  
  if (!query) {
      return res.status(400).json({ error: 'Query is required.' });
  }
  
  if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in Vercel environment variables.' });
  }

  try {
    let context = '';
    const queryTerm = query.trim();
    
    const isBlockchainIdentifier = queryTerm.length >= 32 && !queryTerm.includes(' ');
    
    if (isBlockchainIdentifier) {
      // Case 1: Likely an Address or TX Hash -> Fetch Explorer Data
      const explorer = await fetchExplorerData(queryTerm);
      context = explorer.summary || '';
      
      if (explorer.error) {
          console.warn('Could not fetch explorer data, proceeding without context:', explorer.error);
      }
    } else {
      // Case 2: General Question -> Fetch Official Website Data
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

    return res.status(200).json({ answer: answer.trim() });
  } catch (err) {
    console.error('AI Processing Error:', err.message);
    return res.status(500).json({ error: `AI analysis failed: ${err.message}` });
  }
}
