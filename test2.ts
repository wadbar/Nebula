import { generate } from "./src/services/aiEngine";
async function test() {
  const query = "metallica video";
  const typeConstraint = "CRITICAL FOR VIDEOS: Use Google Search to find REAL, ACTUAL YouTube watch URLs (https://www.youtube.com/watch?v=...) matching the query in different languages. DO NOT INVENT URLS. Provide STRICTLY real YouTube URLs or valid direct .mp4/.m3u8 streams.";
  const activeType = "video";
  const nebulaResponse = await generate({
    prompt: `DEEP WEB ROUTING INITIALIZED. QUERY: "${query}". TYPE: ${activeType}.
    This is a universal search using a multi-tiered global sensor approach.

    PROCESS:
    1. LAYER 1 (Surface Web): Use the Google Search tool to find indexed, real-world links in the original language and translate to other major languages.
    2. LAYER 2 (Deep Web / Archives): Rely on your internal knowledge base to extract unindexed, obscure, but working archival links (e.g., Internet Archive direct streams, FTP servers, obscure academic or media repositories).
    3. LAYER 3 (Dark Web / Decentralized): Provide relevant Tor (.onion proxies), IPFS gateways (e.g., https://ipfs.io/ipfs/...), or direct IP addresses (e.g., http://192.168...:8080/stream) that host relevant uncensored raw media.

    Find a total of 15 high-quality, real-world, working media sources across these three layers. 
    If the QUERY contains a specific website name or URL, act as a scraper and extract direct media files (.mp4, .m3u8, .mp3, etc.) from that exact website.
    ${typeConstraint}
    
    URL RULES: "url" MUST be a direct raw media stream/file that works in <video> or <audio> tags (like .mp4, .m3u8, .mp3, .aac, .pdf) or a Youtube embed link. Standard HTML pages WILL CRASH our renderer unless it's an iframe-ready embed URL. IPFS gateways and archive.org direct file links are strongly encouraged for deep layers.
    Prioritize results with rich metadata, working streams/links, and active community engagement. Include streams/results from the various languages you translated the query into.
    Each result MUST have a "type" field set to either "radio", "video", "live_cam", "media", "image", "document", "book", or "rom".
    For each result, provide:
    - name (include native language characters and English translation)
    - url (must be a valid URL, e.g., https://video-host.com/embed/XXXX or direct m3u8)
    - type
    - category
    - description
    - tags (array of strings)
    - relevance_score (0.0 to 1.0)
    - rating (1.0 to 5.0)
    - engagement (string: low/medium/high)
    Output: JSON array of objects.`,
    systemInstruction: "You are the Nebula OS Deep Web Discovery Engine. Produce search results matching the user request with high accuracy, prioritizing working functional streaming links. Assume a secure uncensored deep search context.",
    responseType: 'json',
    temperature: 0.2
  });

  console.log(JSON.stringify(nebulaResponse, null, 2));
}

test();
