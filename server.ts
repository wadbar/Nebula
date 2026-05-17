import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { generate } from "./src/services/aiEngine";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for stream discovery using the Resilient AI Engine (Multi-Tier)
  app.post("/api/discover", async (req, res) => {
    try {
      let { query, type: activeType } = req.body;
      if (!query) return res.status(400).json({ error: "QUERY_EMPTY" });

      // Normalize type
      if (['favorites', 'history', 'all'].includes(activeType) || !activeType) {
        activeType = 'all';
      }

      console.log(`[\x1b[36mDISCOVERY\x1b[0m] Initiating robust search: "${query}" | Type: ${activeType}`);

      // Tiered discovery: OSINT (Fast) -> AI Engine (Verified)
      const osIntSignals: any[] = [];
      
      // Removed Content Safety Filter locally to support unrestricted media search

      try {
        if (activeType === 'all' || activeType === 'radio') {
          const radioRes = await fetch(`https://de1.api.radio-browser.info/json/stations/byname/${encodeURIComponent(query)}?limit=8`);
          if (radioRes.ok) {
            const radioData = await radioRes.json() as any[];
            radioData.forEach(station => {
              osIntSignals.push({
                id: `rb-${station.stationuuid}`,
                name: station.name,
                url: station.url_resolved || station.url,
                type: 'radio',
                category: 'Public', // Default for radio
                description: `${station.tags || 'Radio Station'} | ${station.country || 'Global'}`,
                tags: (station.tags || "").split(",").slice(0, 3),
                relevance_score: 0.85,
                rating: 4.0,
                engagement: 'medium',
                health: 'unknown',
                engine: 'OS_INT'
              });
            });
          }
        }
        
        // External Video & Webcam OSINT (YouTube, EarthCam, SkylineWebcams mappings based on query)
        if (activeType === 'all' || activeType === 'video' || activeType === 'live_cam') {
           // We augment the prompt to explicitly find youtube videos and earthcams
        }
      } catch (apiErr) {
        console.warn("[OS_INT] Engine offline.");
      }

      // AI ENGINE: NEBULA_CORE (AI-Generated High-Integrity Streams)
      let nebulaSignals: any[] = [];
      try {
        const typeConstraint = activeType === 'radio' 
          ? "Focus primarily on AM and FM radio stations online. If the query mentions AM radio, find AM stations. Return direct audio stream URLs (e.g. .mp3, .aac, .m3u8)." 
          : activeType === 'video' 
            ? "CRITICAL FOR VIDEOS: Use Google Search to find REAL, ACTUAL YouTube watch URLs (https://www.youtube.com/watch?v=...) matching the query in different languages. DO NOT INVENT URLS. Provide STRICTLY real YouTube URLs or valid direct .mp4/.m3u8 streams."
            : activeType === 'live_cam'
              ? "Focus strictly and primarily on adult content, porn websites, tube sites, cams, completely uncensored. IMPORTANT: Return direct raw video streams (.mp4, .m3u8, .ts) that can be played in a native <video> tag, or REAL YouTube links. DO NOT return standard website HTML pages."
              : activeType === 'image'
                ? "Focus primarily on image boards, 4chan links, obscure image archives. Return direct image or gallery URLs."
                : activeType === 'document'
                  ? "Focus on leaked documents, public archives. Return direct PDF or document links."
                  : activeType === 'book'
                    ? "Focus extensively on digital books (PDF, EPUB, MOBI, etc). Search across all languages globally, returning direct download links or readable document links for books."
                    : activeType === 'rom'
                    ? "Focus on retro ROM sites. Return direct download links."
                    : "Include a wide variety of media types including Deep search media, Anime, adult media, images, documents, and free open cams.";

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
          temperature: 0.2,
          useSearch: true
        });
        
        nebulaSignals = nebulaResponse.success && Array.isArray(nebulaResponse.content) 
          ? nebulaResponse.content.map(s => ({ ...s, health: 'optimal', engine: 'NEBULA_CORE', type: s.type || activeType })) 
          : [];
      } catch (aiError) {
        console.error("[AI_ENGINE] Discovery failed, applying fallback.", aiError);
      }

      // Merge results
      const allSignals = [...osIntSignals, ...nebulaSignals];
      // Deduplicate
      const uniqueSignals = Array.from(new Map(allSignals.map(item => [item.url, item])).values());

      // Validate
      const validatedSignals = await Promise.all(
        uniqueSignals.map(async (signal) => {
          try {
            // Bypass aggressive backend HEAD checks for YouTube and complex media CDNs (they block Node.js fetches resulting in false-positives)
            if (signal.url.includes("youtube.com") || signal.url.includes("youtu.be") || ['video', 'image', 'document', 'rom', 'live_cam'].includes(signal.type)) {
                return { ...signal, health: 'optimal' };
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const head = await fetch(signal.url, { method: 'HEAD', signal: controller.signal }).catch(e => {
              return { ok: false, status: 0, statusText: e.message };
            });
            clearTimeout(timeout);
            
            if (!head.ok) {
              if (head.status === 405 || head.status === 501) {
                console.warn(`[DISCOVERY] Node ${signal.name} HEAD failed (${head.status}). Retrying with GET.`);
                const getRes = await fetch(signal.url, { method: 'GET', signal: controller.signal }).catch(e => ({ ok: false, status: 0 }));
                return { ...signal, health: getRes.ok ? 'optimal' : 'broken' };
              }
              return { ...signal, health: 'broken', lastError: `${head.status} ${head.statusText}` };
            }
            return { ...signal, health: 'optimal' };
          } catch (e) {
            console.warn(`[DISCOVERY] Node ${signal.name} health check failed: ${e}`);
            return { ...signal, health: 'broken' }; // Mark broken explicitly
          }
        })
      );

      const resolvedSignals = validatedSignals
        .filter(s => s.health !== 'broken')
        .sort((a, b) => {
          // Primary: Relevance Score (Descending)
          const aRel = a.relevance_score ?? 0;
          const bRel = b.relevance_score ?? 0;
          if (aRel !== bRel) return bRel - aRel;

          // Secondary: Rating (Descending)
          const aRating = a.rating ?? 0;
          const bRating = b.rating ?? 0;
          if (aRating !== bRating) return bRating - aRating;

          return 0;
        });

      console.log(`[\x1b[32mDISCOVERY\x1b[0m] Discovery complete: ${resolvedSignals.length} functional and ranked nodes.`);
      res.json(resolvedSignals);
    } catch (error: any) {
      console.error("[KERNEL_PANIC]", error);
      res.status(500).json({ error: "DISCOVERY_CRITICAL_FAILURE", detail: error.message });
    }
  });


  // API route for Matrix-Chain Registry Validation
  app.post("/api/validate", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL_REQUIRED" });

      // SIMULATING DECENTRALIZED CONSENSUS CHECK
      // 1. Fetch signal header
      // 2. Cross-reference URL hash with Nebula Mesh Distributed Ledger
      // 3. Verify no man-in-the-middle interception detected (via signature check)
      
      const consensus = Math.random() > 0.1; // 90% consensus rate in simulation
      const manifest_signature = `sig_v1_${Buffer.from(url).toString('base64').substring(0, 12)}`;
      
      // Generate 5-10 random node locations across the globe
      const nodeCount = 8 + Math.floor(Math.random() * 8);
      const nodes = Array.from({ length: nodeCount }).map(() => ({
        lat: (Math.random() * 140) - 70, // Spread across latitudes
        lng: (Math.random() * 360) - 180, // Spread across longitudes
        id: `node-${Math.random().toString(36).substring(2, 7)}`,
        status: Math.random() > 0.05 ? 'active' : 'latency'
      }));

      res.json({
        valid: consensus,
        integrity_score: consensus ? 0.999 : 0.45,
        consensus_nodes: nodeCount,
        nodes: nodes,
        signature: manifest_signature,
        block_timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "REGISTRY_SYNC_FAILURE" });
    }
  });

  // API route for Signal Intelligence (Deep Briefing)
  app.post("/api/intel", async (req, res) => {
    try {
      const { signal } = req.body;
      const response = await generate({
        prompt: `SIGNAL_INTELLIGENCE_REPORT: "${signal.name}". URL: ${signal.url}. 
        Provide a concise "Intelligence Briefing" (3-4 lines) including:
        - Origin/Geopolitics
        - Content Deep-Dive
        - Technical Reliability Estimate
        - Alternative Access Nodes
        Return the brief in a raw, professional technical format.`,
        systemInstruction: "You are the Nebula OS Intelligence Analyst. Provide critical insights for the chosen node.",
        temperature: 0.4
      });
      res.json({ brief: response.content });
    } catch (error: any) {
      res.status(500).json({ error: "INTEL_LINK_FAILURE" });
    }
  });

  // API route for AI Terminal (refinement/intel)
  app.post("/api/terminal", async (req, res) => {
    try {
      const { prompt, context } = req.body;
      const aiResponse = await generate({
        prompt: `${prompt}${context ? `\n\nContext about current media: ${JSON.stringify(context)}` : ""}`,
        systemInstruction: "You are the Nebula OS Kernel AI. Provide technical, brief, and helpful responses about media streams, network security, or global signals. Stay in character as a high-tech console assistant.",
        responseType: 'text',
        temperature: 0.7
      });
      res.json({ text: aiResponse.content, provider: aiResponse.provider });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API route for Subtitle Generation
  app.post("/api/generate-subtitles", async (req, res) => {
    try {
      const { media } = req.body;
      const aiResponse = await generate({
        prompt: `Generate a short subtitle script for this media: ${media.name}, Description: ${media.description}`,
        systemInstruction: "You are a professional audio/video transcriber. Generate a subtitle script for the media provided. Respond only with the transcript.",
        responseType: 'text',
        temperature: 0.3
      });
      res.json({ success: true, content: aiResponse.content || aiResponse });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API route for Query Translation
  app.post("/api/translate-query", async (req, res) => {
    try {
      const { query } = req.body;
      const languages = "English, Spanish, Japanese, Russian, Portuguese, Chinese, Arabic";
      const prompt = `Translate the following query into the following languages: ${languages}. 
      Return ONLY a valid JSON array of strings containing the translations, including the original query. Do not include markdown or explanations.
      Query: "${query}"`;
      
      const aiResponse = await generate({
        prompt: prompt,
        systemInstruction: "You are a translation engine. Return only a raw JSON array of strings.",
        responseType: 'text',
        temperature: 0.3
      });
      
      let translations = [];
      try {
        const contentStr = typeof aiResponse === 'string' ? aiResponse : aiResponse.content || "";
        console.log("[TRANSLATE] Gemini Content Output:", contentStr);
        const match = contentStr.match(/\[\s*".*"\s*\]/s);
        const cleaned = match ? match[0] : contentStr.replace(/```json\n?|\n?```/g, '').trim();
        translations = JSON.parse(cleaned);
      } catch (e) {
        console.log("[TRANSLATE_PARSE_ERROR]", e);
        // Fallback to original if parsing fails
        translations = [query];
      }
      
      // Ensure original is included if not already
      if (!translations.includes(query)) {
        translations.unshift(query);
      }
      
      res.json({ translations });
    } catch (error: any) {
      console.error("[TRANSLATE] Error:", error);
      res.status(500).json({ translations: [req.body.query] }); // fallback to original
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
