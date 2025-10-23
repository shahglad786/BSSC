import { useState, useCallback, useMemo } from 'react';

// Icon components (lucide-react alternatives)
const GlobeIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
);
const SearchIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const GitHubIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.082-.743.082-.727.082-.727 1.205.084 1.839 1.237 1.839 1.237 1.07 1.837 2.809 1.305 3.493.998.108-.77.418-1.305.762-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.046.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.798 24 17.292 24 12c0-6.627-5.373-12-12-12z"/></svg>
);
const XIcon = (props) => (
    <svg {...props} viewBox="0 0 1200 1227" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M714.163 519.284L1160.78 0H1055.03L667.137 450.887L357.328 0H0L484.58 757.51L0 1227H105.766L515.421 737.842L840.481 1227H1200L714.163 519.284ZM569.166 687.828L521.697 618.915L142.345 83.531H214.067L541.67 563.858L616.488 671.307L1051.8 1146.47H979.664L569.166 687.828Z"/></svg>
);

// Define navigation links
const NAV_LINKS = [
  { name: 'Official Website', href: 'https://bssc.live/', icon: GlobeIcon },
  { name: 'Explorer', href: 'https://explorer.bssc.live/', icon: SearchIcon },
  { name: 'BSSC Project GitHub', href: 'https://github.com/HaidarIDK/Binance-Super-Smart-Chain', icon: GitHubIcon },
  { name: 'X', href: 'https://x.com/bnbsolfork', icon: XIcon },
];

export default function App() {
  
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);
  // Reset sources and contextSource as the backend handles this now, and we'll only display the final AI response.
  const [sources] = useState([]); 
  const [contextSource] = useState('BSSC Data');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Function to call the Vercel serverless function for AI analysis
  const handleAsk = useCallback(async () => {
    if (!input) return;

    setLoading(true);
    setResponse('');
    setBalance('');
    
    try {
      // *** UPDATED: Call the Vercel API endpoint directly ***
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`API Request Failed: ${res.status} - ${errorData.error || res.statusText}`);
      }
      
      const data = await res.json();
      setResponse(data.answer || 'No response from AI.');

    } catch (err) {
      console.error('AI Request Error:', err);
      setResponse(`Error: ${err.message || 'Failed to process your request. Ensure Vercel environment variables are set.'}`);
    } finally {
      setLoading(false);
    }
  }, [input]);

  // Function to check the balance via the Vercel serverless function
  const handleCheckBalance = useCallback(async () => {
    setLoading(true);
    setResponse('');
    setBalance('');

    try {
      // Basic check for a Solana-style address length
      if (!input || input.length < 32 || input.includes(' ')) {
        setBalance('Please enter a valid BSSC address (Solana standard format).');
        return;
      }
      
      // *** UPDATED: Call the Vercel API endpoint directly ***
      const r = await fetch('/api/rpcBalance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: input }),
      });

      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(`RPC Proxy Failed: ${r.status}. The server reported: ${errorData.error || r.statusText}`);
      }

      const data = await r.json();

      if (data.error) {
        setBalance(`Error: ${data.error}`);
      } else if (data.balance !== undefined) {
        // Balance is returned in lamports from the RPC, backend sends it as a number or string
        const balanceValue = Number(data.balance) / 1000000000; 
        setBalance(`Balance: ${balanceValue.toFixed(4)} BSSC`);
      } else {
        setBalance('Address found, but current balance is 0 BSSC or an unexpected format was returned.');
      }

    } catch (err) {
      console.error('RPC Request Error:', err);
      setBalance(`Error: Failed to fetch balance via Vercel proxy. ${err.message || 'Check the serverless function logs.'}`);
    } finally {
      setLoading(false);
    }
  }, [input]);


  return (
    // Outer container for full responsiveness and styling
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center font-sans">
      
      {/* HEADER WITH NAVIGATION */}
      <header className="sticky top-0 z-10 w-full bg-gray-800 shadow-2xl border-b-4 border-blue-600">
        <div className="max-w-4xl mx-auto flex justify-between items-center px-4 py-3">
          
          {/* Logo/Title */}
          <h1 className="text-2xl md:text-3xl font-extrabold text-blue-400 select-none">
            BSSC AI Assistant
          </h1>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex space-x-6">
            {NAV_LINKS.map(link => (
              <a 
                key={link.name} 
                href={link.href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center space-x-2 text-gray-300 hover:text-blue-400 font-medium transition-colors duration-200 p-2 rounded-lg"
              >
                <link.icon className="w-5 h-5"/>
                <span>{link.name}</span>
              </a>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-gray-300 hover:text-blue-400 p-2 rounded-xl transition-colors duration-200 bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            )}
          </button>
        </div>
        
        {/* Mobile Dropdown Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-gray-700 bg-gray-800">
            <nav className="flex flex-col space-y-2 px-4">
              {NAV_LINKS.map(link => (
                <a 
                  key={link.name} 
                  href={link.href} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center space-x-3 p-3 bg-gray-700 rounded-xl text-gray-200 hover:bg-gray-600 hover:text-blue-300 transition-colors duration-200 shadow-md"
                >
                  <link.icon className="w-5 h-5"/>
                  <span className="font-semibold">{link.name}</span>
                </a>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="w-full max-w-xl p-4 mt-8 md:mt-12">
        
        <p className="text-center text-sm text-gray-400 mb-6">
            Enter a BSSC wallet address, transaction hash, or a general project question.
        </p>

        <input
          type="text"
          placeholder="Enter wallet address, tx hash, or question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full p-4 border border-gray-600 bg-gray-700 text-white rounded-xl focus:ring-blue-500 focus:border-blue-500 mb-4 text-lg transition-all duration-300 shadow-inner placeholder:text-gray-400"
        />
        
        <div className="flex space-x-3 mb-8">
          <button
            onClick={handleAsk}
            disabled={!input || loading}
            className="flex-1 px-5 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-blue-500/50 hover:bg-blue-700 disabled:opacity-50 transition-all duration-300 shadow-lg transform hover:scale-[1.01] active:scale-95 disabled:hover:scale-100"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Analyzing...
              </div>
            ) : 'Ask AI (Grounded Search)'}
          </button>
          
          <button
            onClick={handleCheckBalance}
            disabled={!input || loading}
            className="flex-1 px-5 py-3 bg-green-600 text-white font-bold rounded-xl shadow-green-500/50 hover:bg-green-700 disabled:opacity-50 transition-all duration-300 shadow-lg transform hover:scale-[1.01] active:scale-95 disabled:hover:scale-100"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Checking...
              </div>
            ) : 'Check Balance (RPC)'}
          </button>
        </div>

        {/* Display Balance Result */}
        {balance && (
          <div className="mt-4 p-5 bg-gray-800 border-2 border-green-500 rounded-xl shadow-xl">
            <h2 className="font-extrabold text-green-400 mb-2 text-xl">RPC Result:</h2>
            <p className="text-lg font-mono whitespace-pre-line break-words text-gray-200">{balance}</p>
          </div>
        )}

        {/* Display AI Response */}
        {response && (
          <div className="mt-6 p-5 bg-gray-800 border-2 border-blue-500 rounded-xl shadow-xl">
            <h2 className="font-extrabold text-blue-400 mb-3 text-xl">AI Analysis:</h2>
            <p className="text-gray-200 whitespace-pre-line break-words leading-relaxed">{response}</p>
            
            {sources.length > 0 && (
                <div className="mt-5 pt-4 border-t border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-400 mb-2">Sources (<span className="text-xs font-normal text-gray-300">{contextSource}</span>):</h3>
                    <ul className="list-disc list-inside text-xs text-gray-500 space-y-1">
                        {sources.map((source, index) => (
                            <li key={index}>
                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 break-all transition-colors duration-200">
                                    {source.title || source.uri}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-auto py-6 text-sm text-gray-500 text-center border-t border-gray-700 w-full bg-gray-800/50">
        <div className="max-w-xl mx-auto px-4">
          <p className="text-gray-400 font-medium mb-1">BSSC Project AI Assistant</p>
          <p className="text-gray-500">Powered by Gemini & BSSC RPC</p>
        </div>
      </footer>
    </div>
  );
}

