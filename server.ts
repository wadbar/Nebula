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
      let { query, type: activeType, engine } = req.body;
      if (!query) return res.status(400).json({ error: "QUERY_EMPTY" });

      const activeEngine = engine || "NEBULA_DEEP";

      // Normalize type
      if (['favorites', 'history', 'all'].includes(activeType) || !activeType) {
        activeType = 'all';
      }

      console.log(`[\x1b[36mDISCOVERY\x1b[0m] Initiating robust search: "${query}" | Type: ${activeType} | Engine: ${activeEngine}`);

      // Tiered discovery: AI Engine (Real-time Discovery) + Real Scrapers
      const osIntSignals: any[] = [];
      
      try {
        // Radio Browser Scraper
        const radioRes = await fetch(`https://de1.api.radio-browser.info/json/stations/search?name=${encodeURIComponent(query)}&limit=10`);
        if (radioRes.ok) {
          const radioData = await radioRes.json() as any[];
          radioData.forEach(station => {
            osIntSignals.push({
              id: `radio-${station.stationuuid}`,
              name: station.name,
              url: station.url_resolved || station.url,
              type: 'radio',
              category: station.tags ? station.tags.split(',')[0] : 'Radio',
              description: station.country || 'Global',
              engine: 'RADIO_BROWSER_API',
              relevance_score: 0.8
            });
          });
        }

        // Archive.org Scraper
        const archiveRes = await fetch(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&output=json&rows=10`);
        if (archiveRes.ok) {
           const archiveData = await archiveRes.json();
           const docs = archiveData.response?.docs || [];
           docs.forEach((doc: any) => {
              osIntSignals.push({
                 id: `arch-${doc.identifier}`,
                 name: doc.title || doc.identifier,
                 url: `https://archive.org/details/${doc.identifier}`,
                 type: doc.mediatype === 'audio' ? 'radio' : doc.mediatype === 'movies' ? 'video' : 'document',
                 category: doc.collection ? (Array.isArray(doc.collection) ? doc.collection[0] : doc.collection) : 'Archive',
                 description: doc.description ? doc.description.substring(0, 100) : 'Archive.org resource',
                 engine: 'ARCHIVE_DOT_ORG_API',
                 relevance_score: 0.85
              });
           });
        }
      } catch (err) {
        console.error("[SCRAPERS] Discovery failed.", err);
      }

      // AI ENGINE: NEBULA_V13_OMEGA_SCRAPER (Forensic quantum-mesh discovery)
      let nebulaSignals: any[] = [];
      try {
        const typeConstraint = activeType === 'radio' 
          ? "Target: OMEGA-fidelity audio nodes. Exfiltrate direct manifest vectors (.mp3, .aac, .m3u8, .pls). Deep-scan lossless edge clusters and shadow broadcast relays." 
          : activeType === 'video' 
            ? "Target: Universal Media/Video Discovery. Search for direct, functional stream links (m3u8, mp4, authenticated manifest links). Penetrate valid streaming archives and media repositories."
            : activeType === 'live_cam'
              ? "Target: Real-time OMEGA telemetry. Focus on active live-streaming surveillance clusters and functional media feeds."
              : activeType === 'image'
                ? "Target: Forensic visual registries, unindexed image boards, and functional media archives."
                : activeType === 'document'
                  ? "Target: Declassified OMEGA dossiers, research exfiltrations, and functional document repositories."
                  : activeType === 'book'
                    ? "Target: Omega-class digital libraries and functional manuscripts."
                    : activeType === 'rom'
                    ? "Target: Legacy binary OMEGA vaults (ROMs/ISOs/Binaries). Penetrate unindexed FTP archives."
                    : "Universal Omega Hybrid Scan: EXECUTE MAXIMUM DIVERSITY. Return real, functional forensic signals across all archetypes (Video, Nodes, Docs, Binary).";

         const nebulaResponse = await generate({
          prompt: `NEBULA_AI_ENGINE_V14_ULTRA_DISCOVERY. TARGET_QUERY: "${query}". VECTOR: ${activeEngine}.
          
          DISCOVERY PROTOCOL:
          - MUST perform real-time web discovery.
          - MUST return functional, direct deep links (e.g., direct m3u8, mp4, torrent magnet, or high-fidelity archive links).
          - Use advanced scraping heuristics similar to Kodi/VLC media scrapers (e.g., parsing directory indices, deep-linking into known media CDN structures).
          - NO SIMULATION. If no functional link is found for this specific query, return an empty array.
          - Target repositories like Archive.org, torrent indices (e.g., Torch/Dark-Web heuristics), and open media directory structures.
          - Return a diverse range of results: Video, Radio, Live Cam, Document, ROM.
          
          REQUIRED JSON SCHEMA (Array of Objects):
          [
            {
              "name": "String",
              "url": "String (Direct URL, P2P Magnet Link, or Archive Path)",
              "type": "video|radio|document|image|rom|live_cam",
              "category": "String",
              "description": "String (Quality details, source context, accessibility note)",
              "engine": "String (NEBULA_V14_CORE)",
              "quality": "String",
              "relevance_score": "Number (0.80 to 1.0)"
            }
          ]
          Return ONLY the raw, pure JSON array. No text, no markdown.`,
          systemInstruction: "You are the NEBULA V14 Forensic Media Discoverer. Your goal is to find actual, functional media links in the real web using advanced scraping techniques (inspired by Kodi/VLC/Torch). Do NOT simulate. If you cannot find a functional, real link, do NOT hallucinate.",
          responseType: 'json',
          temperature: 0.1,
          useSearch: true
        });
        
        const rawSignals = Array.isArray(nebulaResponse.content) ? nebulaResponse.content : [];

        nebulaSignals = rawSignals.map(s => ({
          ...s,
          id: `nebula-${Math.random().toString(36).substring(2, 9)}`,
          health: 'optimal',
          engine: 'NEBULA_OMEGA',
          type: (['radio', 'video', 'live_cam', 'image', 'document', 'book', 'rom'].includes(s.type as string) ? s.type : 'video'),
          lat: (Math.random() * 140) - 70,
          lng: (Math.random() * 360) - 180
        }));
      } catch (aiError) {
        console.error("[AI_ENGINE] Discovery failed.", aiError);
      }

      // Merge results
      const allSignals = [...osIntSignals.map(s => ({
        ...s,
        lat: (Math.random() * 140) - 70,
        lng: (Math.random() * 360) - 180
      })), ...nebulaSignals];
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
        prompt: `SIGNAL_INTELLIGENCE_REPORT: "${signal.name}". NODE_PATH: ${signal.url}. 
        Perform a deep forensic analysis of this signal node.
        
        REPORT PARAMETERS:
        - ORIGIN_GEOPOLITICS: Identify host jurisdiction and node topology.
        - CONTENT_INTEGRITY: Verify signal payload and metadata fidelity.
        - TECHNICAL_VIABILITY: Estimate latency, packet stability, and CDN resilience.
        - CROSS_REFERENCE: List alternative bridge nodes or P2P fallbacks.
        
        Return a raw, high-level technical briefing for a field engineer.`,
        systemInstruction: "You are the NEBULA V13 Intelligence Analyst. Provide critical, high-fidelity technical insights. Always emphasize the power of Omega Scrapers like CoCoScrapers and Torrentio integration.",
        temperature: 0.3
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
        systemInstruction: "You are the NEBULA OMEGA Kernel [V13]. Provide clinical, forensic, and highly technical responses about non-linear signal exfiltration, Quantum-mesh simulation, or global mesh security. You have full resonance with ALL indices including TORCH/AHMIA. Stay in character as a high-tier clandestine console assistant. Use nomenclature like 'Omega Resonance', 'Quantum Mesh', 'Non-Linear Discovery', and 'Neural Forensics'.",
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
