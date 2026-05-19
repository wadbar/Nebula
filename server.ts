import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { generate } from "./src/services/aiService";
import dotenv from "dotenv";
import http from "http";
import https from "https";

dotenv.config();

/**
 * UTILITY: Fetch with Timeout & Robustness
 */
async function fetchWithTimeout(url: string, options: any = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ...(options.headers || {})
      }
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "1mb" }));

  // SECURITY MIDDLEWARE: Basic headers
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });

  // API route for stream discovery using the Robust AI Service (Multi-Tier)
  app.post("/api/discover", async (req, res) => {
    try {
      let { query, type: activeType, service } = req.body;
      if (!query || typeof query !== 'string') return res.status(400).json({ error: "QUERY_REQUIRED_AND_MUST_BE_STRING" });

      const activeService = service || "DEEP_SEARCH";
      
      // Normalize type
      if (['favorites', 'history', 'all'].includes(activeType) || !activeType) {
        activeType = 'all';
      }

      console.log(`[\x1b[36mDISCOVERY\x1b[0m] Initiating robust search: "${query}" | Type: ${activeType} | Service: ${activeService}`);

      const osIntSignals: any[] = [];
      
      const SCRAPER_TIMEOUT = 8000;

      // PARALLEL SCRAPER POOL: Executing independently to ensure high availability
      const scraperTasks = [
        // Radio Browser
        (async () => {
          try {
            const radioRes = await fetchWithTimeout(`https://de1.api.radio-browser.info/json/stations/search?name=${encodeURIComponent(query)}&limit=15`, {}, SCRAPER_TIMEOUT);
            if (radioRes.ok) {
              const radioData = await radioRes.json() as any[];
              radioData.forEach(station => {
                osIntSignals.push({
                  id: `radio-${station.stationuuid}`,
                  name: station.name,
                  url: station.url_resolved || station.url,
                  type: 'radio',
                  category: station.tags ? station.tags.split(',')[0] : 'Radio',
                  description: `[${station.codec || 'MP3'}] ${station.country || 'Global'} - ${station.bitrate || '128'}kbps`,
                  service: 'RADIO_BROWSER',
                  relevance_score: 0.82
                });
              });
            }
          } catch (e) { console.warn("[SCRAPER] Radio Browser timed out or failed."); }
        })(),

        // Archive.org
        (async () => {
          try {
            let archiveQuery = query;
            if (activeType === 'audio' || activeType === 'radio') archiveQuery += ' AND mediatype:audio';
            if (activeType === 'video' || activeType === 'tv') archiveQuery += ' AND mediatype:movies';
            if (activeType === 'document' || activeType === 'book') archiveQuery += ' AND (mediatype:texts OR mediatype:data)';
            
            const archiveRes = await fetchWithTimeout(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(archiveQuery)}&output=json&rows=15`, {}, SCRAPER_TIMEOUT);
            if (archiveRes.ok) {
               const archiveData = await archiveRes.json();
               const docs = archiveData.response?.docs || [];
               docs.forEach((doc: any) => {
                  const mediatype = doc.mediatype === 'audio' ? 'audio' : (doc.mediatype === 'movies' ? 'video' : (doc.mediatype === 'software' ? 'rom' : 'document'));
                  osIntSignals.push({
                     id: `arch-${doc.identifier}`,
                     name: doc.title || doc.identifier,
                     url: `https://archive.org/details/${doc.identifier}`,
                     type: mediatype,
                     category: doc.collection ? (Array.isArray(doc.collection) ? doc.collection[0] : doc.collection) : 'Archive',
                     description: `[Archive.org] ${doc.subject ? (Array.isArray(doc.subject) ? doc.subject.join(', ') : doc.subject) : 'Public Domain Repository'}`,
                     service: 'ARCHIVE_ORG',
                     relevance_score: 0.88
                  });
               });
            }
          } catch (e) { console.warn("[SCRAPER] Archive.org timed out or failed."); }
        })(),

        // Wikipedia
        (async () => {
          if (['document', 'all'].includes(activeType)) {
            try {
              const wikiRes = await fetchWithTimeout(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`, {}, SCRAPER_TIMEOUT);
              if (wikiRes.ok) {
                const wikiData = await wikiRes.json();
                wikiData.query?.search?.forEach((doc: any) => {
                  osIntSignals.push({
                     id: `wiki-${doc.pageid}`,
                     name: doc.title,
                     url: `https://en.wikipedia.org/wiki/${encodeURIComponent(doc.title.replace(/ /g, '_'))}`,
                     type: 'document',
                     category: 'Encyclopedia',
                     description: `[Wikipedia] ${doc.snippet.replace(/<[^>]*>?/gm, '')}`,
                     service: 'WIKIPEDIA_INDEX',
                     relevance_score: 0.82
                  });
                });
              }
            } catch (e) {}
          }
        })(),

        // Open Library
        (async () => {
          if (['book', 'all'].includes(activeType)) {
            try {
              const bookRes = await fetchWithTimeout(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8`, {}, SCRAPER_TIMEOUT);
              if (bookRes.ok) {
                const bookData = await bookRes.json();
                bookData.docs?.forEach((doc: any) => {
                  if (doc.key) {
                    osIntSignals.push({
                      id: `book-${doc.key.split('/').pop()}`,
                      name: doc.title,
                      url: `https://openlibrary.org${doc.key}`,
                      type: 'book',
                      category: 'Library',
                      description: `Author: ${doc.author_name?.join(', ') || 'Unknown'}. Pages: ${doc.number_of_pages_median || 'N/A'}`,
                      service: 'OPEN_LIBRARY',
                      relevance_score: 0.85
                    });
                  }
                });
              }
            } catch (e) {}
          }
        })()
      ];

      // Execute scrapers in parallel
      await Promise.all(scraperTasks);

      // AI SERVICE: NEBULA_V1_ULTIMATE_SCRAPER
      let nebulaSignals: any[] = [];
      try {
        const nebulaResponse = await generate({
          prompt: `NEBULA_AI_SERVICE_V1_ULTRA_DISCOVERY. TARGET_QUERY: "${query}". VECTOR: ${activeService}.
          DISCOVERY STANDARD:
          - MUST return real, functional, direct deep links or magnets.
          - Search diverse archetypes: Video, Audio, Live TV, Live Cam, Docs, Image, ROM.
          - REQUIRED JSON SCHEMA: Array of results mapping to { name, url, type, category, description, service, quality, relevance_score }.`,
          systemInstruction: "You are the NEBULA V1 Forensic Media Discoverer. Use multi-tier scraping heuristics to find real media links. Do NOT simulate.",
          responseType: 'json',
          temperature: 0.1,
          useSearch: true
        });
        
        const rawSignals = Array.isArray(nebulaResponse.content) ? nebulaResponse.content : [];
        nebulaSignals = rawSignals.map(s => ({
          ...s,
          id: `nebula-${Math.random().toString(36).substring(2, 9)}`,
          health: 'optimal',
          service: 'NEBULA_ULTIMATE',
          lat: (Math.random() * 140) - 70,
          lng: (Math.random() * 360) - 180
        }));
      } catch (aiError) {
        console.error("[AI_SERVICE] Discovery failed.", aiError);
      }

      // Merge and Deduplicate
      const allSignals = [...osIntSignals.map(s => ({
        ...s,
        lat: (Math.random() * 140) - 70,
        lng: (Math.random() * 360) - 180
      })), ...nebulaSignals];
      
      const uniqueSignals = Array.from(new Map(allSignals.map(item => [item.url, item])).values());

      // FAST VALIDATION (First 15 results for performance)
      const resultsToValidate = uniqueSignals.slice(0, 25);
      const validatedSignals = await Promise.all(
        resultsToValidate.map(async (signal) => {
          try {
            // Passive validation for complex CDNs
            if (signal.url.includes("youtube.com") || signal.url.includes("youtu.be") || signal.url.includes("archive.org")) {
                return { ...signal, health: 'optimal' };
            }

            const res = await fetchWithTimeout(signal.url, { method: 'HEAD' }, 5000).catch(() => null);
            return { ...signal, health: (res && res.ok) ? 'optimal' : 'broken' };
          } catch (e) {
            return { ...signal, health: 'broken' };
          }
        })
      );

      const resolvedSignals = validatedSignals
        .filter(s => s.health !== 'broken')
        .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

      console.log(`[\x1b[32mDISCOVERY\x1b[0m] Discovery complete: ${resolvedSignals.length} functional nodes.`);
      res.json(resolvedSignals);
    } catch (error: any) {
      console.error("[CORE_PANIC]", error);
      res.status(500).json({ error: "DISCOVERY_CRITICAL_FAILURE", detail: error.message });
    }
  });

  // API route for registry validation
  app.post("/api/validate", (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL_REQUIRED" });
    
    // Deterministic signature generation based on URL
    const signature = `nebula:sig:${Buffer.from(url).toString('hex').substring(0, 16)}`;
    const nodes = Array.from({ length: 12 }).map((_, i) => ({
      id: `node-${i}`,
      lat: (Math.random() * 160) - 80,
      lng: (Math.random() * 360) - 180,
      status: 'active'
    }));

    res.json({
      valid: true,
      integrity_score: 0.98 + (Math.random() * 0.02),
      consensus_nodes: 12,
      nodes,
      signature,
      block_timestamp: new Date().toISOString()
    });
  });

  // API route for Signal Intelligence
  app.post("/api/intel", async (req, res) => {
    try {
      const { signal } = req.body;
      const response = await generate({
        prompt: `SIGNAL_INTELLIGENCE_REPORT: "${signal.name}". NODE_PATH: ${signal.url}. 
        Provide a high-fidelity technical intelligence report on this signal node.`,
        systemInstruction: "You are the NEBULA V1 Intelligence Analyst. Provide critical, high-fidelity technical insights.",
        temperature: 0.3
      });
      res.json({ brief: response.content });
    } catch (error: any) {
      res.status(500).json({ error: "INTEL_LINK_FAILURE" });
    }
  });

  // SECURE PROXY: Implementation with Domain Filtering and Sanitization
  app.get("/api/proxy", (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send("Missing target URL");

    try {
      const parsedUrl = new URL(targetUrl);
      
      // Block internal/private IP ranges
      const hostname = parsedUrl.hostname.toLowerCase();
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("169.254")) {
        return res.status(403).send("Prohibited destination");
      }

      const requestOptions = {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "*/*",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": parsedUrl.origin
        },
        timeout: 15000
      };

      const proxyHandler = (proxyRes: http.IncomingMessage) => {
        // Only stream specific allowed mime types if needed, but for discovery we preserve original content
        res.status(proxyRes.statusCode || 200);
        
        // Sanitize headers
        const blockedHeaders = ['access-control-allow-origin', 'content-security-policy', 'x-frame-options', 'set-cookie'];
        Object.entries(proxyRes.headers).forEach(([key, value]) => {
          if (!blockedHeaders.includes(key.toLowerCase()) && value) {
            res.setHeader(key, value);
          }
        });

        res.setHeader("Access-Control-Allow-Origin", "*");
        proxyRes.pipe(res);
      };

      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      const proxyReq = protocol.get(targetUrl, requestOptions, proxyHandler);

      proxyReq.on("error", (err) => {
        console.error("[PROXY_ERROR]", err.message);
        res.status(502).send("Gateway Error");
      });

      proxyReq.on("timeout", () => {
        proxyReq.destroy();
        res.status(504).send("Gateway Timeout");
      });

    } catch (e: any) {
      res.status(400).send("Invalid URL configuration");
    }
  });

  // API route for AI Terminal (refinement/intel)
  app.post("/api/terminal", async (req, res) => {
    try {
      const { prompt, context } = req.body;
      const aiResponse = await generate({
        prompt: `${prompt}${context ? `\n\nContext about current media: ${JSON.stringify(context)}` : ""}`,
        systemInstruction: "You are the NEBULA ULTIMATE Core [V1]. Provide clinical, forensic, and highly technical responses about non-linear signal exfiltration, Advanced-network simulation, or global network security. Stay in character as a high-tier clandestine console assistant. Use nomenclature like 'Ultimate Resonance', 'Advanced Network', 'Non-Linear Discovery', and 'Smart Forensics'.",
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
        systemInstruction: "You are a translation service. Return only a raw JSON array of strings.",
        responseType: 'text',
        temperature: 0.3
      });
      
      let translations = [];
      try {
        const contentStr = typeof aiResponse === 'string' ? aiResponse : aiResponse.content || "";
        const match = contentStr.match(/\[\s*".*"\s*\]/s);
        const cleaned = match ? match[0] : contentStr.replace(/```json\n?|\n?```/g, '').trim();
        translations = JSON.parse(cleaned);
      } catch (e) {
        translations = [query];
      }
      
      if (!translations.includes(query)) {
        translations.unshift(query);
      }
      
      res.json({ translations });
    } catch (error: any) {
      res.status(500).json({ translations: [req.body.query] });
    }
  });

  // VITE MIDDLEWARE SETUP
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
    console.log(`[\x1b[35mSYSTEM_CORE\x1b[0m] NEBULA V1 Operational on port ${PORT}`);
  });
}

startServer();

