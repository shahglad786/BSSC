# BSSC AI Transaction Assistant 🤖

The **BSSC AI Transaction Assistant** is a modern web application designed to empower users with natural language analysis of wallet data on the **Binance Super Smart Chain (BSSC)**.

The project is built using a **React + Vite** frontend and integrates the **Google Gemini AI model** to provide real-time, context-aware insights from a user's question or wallet address.

---

## Project Functionality

The application augments AI analysis with live blockchain data from the BSSC network.

### Data Retrieval

The application makes a direct **JSON-RPC** call to the BSSC network if an address is provided:
* **Endpoint:** `https://bssc-rpc.bssc.live`
* **Method:** It specifically uses the `eth_getBalance` method to retrieve the wallet's native currency (BNB) balance.

### AI Analysis

The retrieval process enhances the AI's response:
1.  The fetched BNB balance is included in a **Context String**.
2.  This string is combined with the user's question and securely sent to the Gemini API.
3.  This ensures the AI's response is accurate and grounded in current BSSC blockchain data.
