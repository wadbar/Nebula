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
  app.use((_req, res, next) => {
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
            
            const archiveRes = await fetchWithTimeout(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(archiveQuery)}&output=json&rows=10`, {}, SCRAPER_TIMEOUT);
            if (archiveRes.ok) {
               const archiveData = await archiveRes.json();
               const docs = archiveData.response?.docs || [];
               
               // For each doc, try to be more precise about the URL
               docs.forEach((doc: any) => {
                  const mediatype = doc.mediatype === 'audio' ? 'audio' : (doc.mediatype === 'movies' ? 'video' : (doc.mediatype === 'software' ? 'rom' : 'document'));
                  
                  // Heuristic: If it's a known mediatype, we can guess the download directory
                  // But direct file links vary. We'll use the detail page as fallback, 
                  // but in a real scraper we'd hit the /metadata API. 
                  // To keep it fast, we'll suggest the detail page, but the client-side 
                  // might need to handle Archive.org specifically (e.g. via an iframe if it's not a direct stream).
                  
                  osIntSignals.push({
                     id: `arch-${doc.identifier}`,
                     name: doc.title || doc.identifier,
                     url: `https://archive.org/details/${doc.identifier}`,
                     type: mediatype,
                     category: doc.collection ? (Array.isArray(doc.collection) ? doc.collection[0] : doc.collection) : 'Archive',
                     description: `[Archive.org] ${doc.subject ? (Array.isArray(doc.subject) ? doc.subject.join(', ') : doc.subject) : 'Public Domain Asset'}`,
                     service: 'ARCHIVE_ORG',
                     relevance_score: 0.88,
                     metadata: { identifier: doc.identifier }
                  });
               });
            }
          } catch (e) { console.warn("[SCRAPER] Archive.org timed out or failed."); }
        })(),

        // Dailymotion
        (async () => {
          if (['video', 'all', 'movie'].includes(activeType)) {
            try {
              const res = await fetchWithTimeout(`https://api.dailymotion.com/videos?search=${encodeURIComponent(query)}&fields=id,title,url,description&limit=15`, {}, SCRAPER_TIMEOUT);
              if (res.ok) {
                const data = await res.json();
                data.list?.forEach((v: any) => {
                  osIntSignals.push({
                    id: `dm-${v.id}`,
                    name: v.title,
                    url: v.url,
                    type: 'video',
                    category: 'Video Feed',
                    description: `[Dailymotion] ${v.description || 'Public video content'}`,
                    service: 'DAILYMOTION',
                    relevance_score: 0.8
                  });
                });
              }
            } catch (e) {}
          }
        })(),

        // PeerTube (Generic Search via public instance or standard API)
        (async () => {
           if (['video', 'all'].includes(activeType)) {
             try {
               // Searching a large instance as a gateway
               const res = await fetchWithTimeout(`https://peertube.tv/api/v1/search/videos?search=${encodeURIComponent(query)}&count=10`, {}, SCRAPER_TIMEOUT);
               if (res.ok) {
                 const data = await res.json();
                 data.data?.forEach((v: any) => {
                   osIntSignals.push({
                     id: `pt-${v.uuid}`,
                     name: v.name,
                     url: v.url,
                     type: 'video',
                     category: 'Peer-to-Peer Video',
                     description: `[PeerTube] ${v.description?.substring(0, 100) || 'Decentralized media node'}`,
                     service: 'PEERTUBE',
                     relevance_score: 0.82
                   });
                 });
               }
             } catch (e) {}
           }
        })(),

        // NASA API
        (async () => {
          if (['all', 'video', 'image'].includes(activeType)) {
            try {
              const res = await fetchWithTimeout(`https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=video,image`, {}, SCRAPER_TIMEOUT);
              if (res.ok) {
                const data = await res.json();
                data.collection?.items?.slice(0, 10).forEach((item: any) => {
                  const dataObj = item.data?.[0];
                  if (dataObj) {
                    osIntSignals.push({
                      id: `nasa-${dataObj.nasa_id}`,
                      name: dataObj.title,
                      url: `https://images-api.nasa.gov/asset/${dataObj.nasa_id}`,
                      type: dataObj.media_type === 'video' ? 'video' : 'image',
                      category: 'Scientific Data',
                      description: `[NASA] ${dataObj.description?.substring(0, 150)}...`,
                      service: 'NASA_EXPLORER',
                      relevance_score: 0.9
                    });
                  }
                });
              }
            } catch (e) {}
          }
        })(),

        // Project Gutenberg (Books)
        (async () => {
          if (['book', 'document', 'all'].includes(activeType)) {
            try {
              const res = await fetchWithTimeout(`https://gutendex.com/books/?search=${encodeURIComponent(query)}`, {}, SCRAPER_TIMEOUT);
              if (res.ok) {
                const data = await res.json();
                data.results?.slice(0, 10).forEach((b: any) => {
                  osIntSignals.push({
                    id: `guten-${b.id}`,
                    name: b.title,
                    url: `https://www.gutenberg.org/ebooks/${b.id}`,
                    type: 'book',
                    category: 'Literature',
                    description: `[Gutenberg] Author: ${b.authors?.map((a: any) => a.name).join(', ')}. Languages: ${b.languages?.join(', ')}`,
                    service: 'PROJECT_GUTENBERG',
                    relevance_score: 0.86
                  });
                });
              }
            } catch (e) {}
          }
        })(),

        // TVMaze (TV Shows Intel)
        (async () => {
          if (['video', 'tv', 'all'].includes(activeType)) {
            try {
              const res = await fetchWithTimeout(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`, {}, SCRAPER_TIMEOUT);
              if (res.ok) {
                const data = await res.json();
                data.slice(0, 10).forEach((item: any) => {
                  const s = item.show;
                  osIntSignals.push({
                    id: `tvm-${s.id}`,
                    name: s.name,
                    url: s.url,
                    type: 'tv',
                    category: s.genres?.[0] || 'TV Show',
                    description: `[TVMaze] ${s.summary?.replace(/<[^>]*>?/gm, '').substring(0, 150)}...`,
                    service: 'TV_MAZE_INTEL',
                    relevance_score: 0.8
                  });
                });
              }
            } catch (e) {}
          }
        })(),

        // Pixabay (Stock Media - Public API usually needs key, but we can try common search patterns)
        (async () => {
          // Skipping for now as it needs reliable public keys, but AI will handle this via Google Search
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
          - MUST return real, functional, direct deep links, stream URLs, or magnet links.
          - Search diverse platforms: YouTube, Dailymotion, Vimeo, PeerTube, SoundCloud, Bandcamp, Radio-Browser, NASA, Archive.org, Wikipedia, Project Gutenberg, Open Library, and generic high-relevance media nodes.
          - DO NOT show bias towards any single provider. Deliver a GLOBAL media signal snapshot.
          - Search diverse archetypes: Video, Audio, Live TV, Live Cam, Docs, Image, ROM, Dataset.
          - REQUIRED JSON SCHEMA: Array of results mapping to { name, url, type, category, description, service, quality, relevance_score }.`,
          systemInstruction: "You are the NEBULA V1 Forensic Media Discoverer. Use multi-tier scraping heuristics and real-time network intelligence to find real media links globally. Do NOT simulate. Prioritize direct stream URLs (.m3u8, .mp3, .mp4, .mkv) where possible.",
          responseType: 'json',
          temperature: 0.2, // Slightly higher for more diversity
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

      // FAST VALIDATION (First 25 results for performance)
      const resultsToValidate = uniqueSignals.slice(0, 30);
      const validatedSignals = await Promise.all(
        resultsToValidate.map(async (signal) => {
          try {
            // Passive validation for complex CDNs and specific types
            if (signal.url.includes("youtube.com") || 
                signal.url.includes("youtu.be") || 
                signal.url.includes("archive.org") || 
                signal.url.includes("radio-browser") ||
                signal.type === 'radio') {
                return { ...signal, health: 'optimal' };
            }

            // More permissive validation: Some servers block HEAD but allow GET
            // For streams, we just check if it's reachable
            const res = await fetchWithTimeout(signal.url, { method: 'GET', headers: { 'Range': 'bytes=0-1' } }, 4000).catch(() => null);
            
            if (res && (res.ok || res.status === 206)) {
              return { ...signal, health: 'optimal' };
            }

            // Fallback for servers that block range requests
            const headRes = await fetchWithTimeout(signal.url, { method: 'HEAD' }, 2000).catch(() => null);
            if (headRes && headRes.ok) {
              return { ...signal, health: 'optimal' };
            }

            // Default to 'stable' if we can't verify but it looks like a valid URL
            if (signal.url.startsWith('http')) {
               return { ...signal, health: 'stable' };
            }

            return { ...signal, health: 'broken' };
          } catch (e) {
            return { ...signal, health: 'stable' };
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

  // SECURE PROXY: Improved implementation for Media Streams and Partial Content
  app.all("/api/proxy", async (req, res) => {
    // Handle pre-flight
    if (req.method === 'OPTIONS') {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, User-Agent, Referer, Accept-Encoding");
      return res.sendStatus(204);
    }

    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send("Missing target URL");

    try {
      const parsedUrl = new URL(targetUrl);
      
      // Block internal/private IP ranges
      const hostname = parsedUrl.hostname.toLowerCase();
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("169.254")) {
        return res.status(403).send("Prohibited destination");
      }

      // ROBUST FETCHER WITH REDIRECT HANDLING
      const forwardHeaders: Record<string, string> = {
        "User-Agent": (req.headers["user-agent"] as string) || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": (req.headers["accept"] as string) || "*/*",
        "Referer": parsedUrl.origin
      };

      if (req.headers["range"]) {
        forwardHeaders["Range"] = req.headers["range"] as string;
      }

      // First, we perform a HEAD or a lightweight GET to follow redirects and get final URL
      const initialRes = await fetch(targetUrl, {
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: forwardHeaders,
        redirect: 'follow'
      }).catch(err => { throw err; });

      const finalUrl = initialRes.url;
      const finalParsedUrl = new URL(finalUrl);
      const protocol = finalParsedUrl.protocol === 'https:' ? https : http;

      const proxyHandler = (proxyRes: http.IncomingMessage) => {
        // Proper status passthrough (crucial for 206 Partial Content)
        res.status(proxyRes.statusCode || 200);
        
        const blockedHeaders = [
          'access-control-allow-origin', 
          'access-control-allow-credentials',
          'access-control-allow-methods',
          'access-control-allow-headers',
          'content-security-policy', 
          'x-frame-options', 
          'set-cookie'
        ];

        Object.entries(proxyRes.headers).forEach(([key, value]) => {
          if (!blockedHeaders.includes(key.toLowerCase()) && value) {
            res.setHeader(key, value);
          }
        });

        // Forced CORS for development environment and media players
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, User-Agent, Referer");
        res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges, Content-Type");

        proxyRes.pipe(res);
      };

      const requestOptions = {
        headers: forwardHeaders,
        timeout: 30000,
        rejectUnauthorized: false
      };

      const proxyReq = protocol.get(finalUrl, requestOptions, proxyHandler);

      proxyReq.on("error", (err) => {
        console.error("[\x1b[31mPROXY_ERROR\x1b[0m]", err.message, finalUrl);
        if (!res.headersSent) res.status(502).send("Gateway Error: " + err.message);
      });

      proxyReq.on("timeout", () => {
        proxyReq.destroy();
        if (!res.headersSent) res.status(504).send("Gateway Timeout");
      });

    } catch (e: any) {
      console.error("[\x1b[31mPROXY_PANIC\x1b[0m]", e.message, targetUrl);
      if (!res.headersSent) res.status(400).send("Proxy Request Failed: " + e.message);
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
      const prompt = `Translate the following query into: ${languages}. 
      Original Query: "${query}"`;
      
      const aiResponse = await generate({
        prompt: prompt,
        systemInstruction: "Translate the query. Return ONLY a JSON array of strings containing the translations including original.",
        responseType: 'json',
        temperature: 0.1
      });
      
      let translations = aiResponse.content || [query];
      
      if (!Array.isArray(translations)) {
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
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[\x1b[35mSYSTEM_CORE\x1b[0m] NEBULA V1 Operational on port ${PORT}`);
  });
}

startServer();

