import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { generate } from "./src/services/aiService";
import dotenv from "dotenv";
import http from "http";
import https from "https";
import yts from "yt-search";

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
      let { query, type: activeType, service, cocoEngines: _cocoEngines, opensearchWeightBoost, torchProxyActive } = req.body;
      if (!query || typeof query !== 'string') return res.status(400).json({ error: "QUERY_REQUIRED_AND_MUST_BE_STRING" });

      const activeService = service || "DEEP_SEARCH";
      const boostValue = opensearchWeightBoost || 1.0;
      
      // Normalize type
      if (['favorites', 'history', 'all'].includes(activeType) || !activeType) {
        activeType = 'all';
      }

      console.log(`[\x1b[36mDISCOVERY\x1b[0m] Initiating robust search: "${query}" | Type: ${activeType} | OpenSearch Boost: ${boostValue} | Service: ${activeService} | Proxy Active: ${!!torchProxyActive}`);

      const osIntSignals: any[] = [];
      const SCRAPER_TIMEOUT = 8000;

      // PARALLEL SCRAPER POOL: Executing independently to ensure high availability
      const scraperTasks = [
        // Real Dailymotion Scraper
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
                      type: 'document',
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

        // GitHub Repositories (Code/Projects) & User Repositories
        (async () => {
          if (['document', 'software', 'all', 'rom'].includes(activeType)) {
            try {
              // Check if query looks like a github URL or a user search
              let apiUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=15`;
              
              if (query.includes('github.com/')) {
                  const parts = query.split('github.com/');
                  const path = parts[1].split('/');
                  if (path.length >= 2 && path[0] && path[1]) {
                      // Specific repo
                      apiUrl = `https://api.github.com/repos/${path[0]}/${path[1]}`;
                  } else if (path.length >= 1 && path[0]) {
                      // User repos
                      apiUrl = `https://api.github.com/users/${path[0]}/repos?per_page=15&sort=updated`;
                  }
              } else if (query.startsWith('user:')) {
                  apiUrl = `https://api.github.com/users/${query.split('user:')[1].trim()}/repos?per_page=15&sort=updated`;
              }

              const res = await fetchWithTimeout(apiUrl, {
                headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Nebula-OSINT-Scraper' }
              }, SCRAPER_TIMEOUT);
              
              if (res.ok) {
                const data = await res.json();
                const items = Array.isArray(data) ? data : (data.items || [data]);
                
                items.slice(0, 15).forEach((repo: any) => {
                  if (repo && repo.name) {
                    osIntSignals.push({
                      id: `gh-${repo.id}`,
                      name: repo.full_name || repo.name,
                      url: repo.html_url,
                      type: 'software',
                      category: repo.language || 'Code Repository',
                      description: `[GitHub] ★ ${repo.stargazers_count} | ${repo.description || 'No description provided'}`,
                      service: 'GITHUB',
                      relevance_score: 0.95,
                      metadata: { clone_url: repo.clone_url, default_branch: repo.default_branch }
                    });
                  }
                });
              }
            } catch (e) {}
          }
        })(),
        
        // Jamendo (Free Music - as requested implicitly for Nuclear inspiration)
        (async () => {
           if (['audio', 'music', 'all'].includes(activeType)) {
             try {
               const res = await fetchWithTimeout(`https://api.jamendo.com/v3.0/tracks/?client_id=56d30c95&format=jsonpretty&limit=10&search=${encodeURIComponent(query)}`, {}, SCRAPER_TIMEOUT);
               if (res.ok) {
                 const data = await res.json();
                 data.results?.forEach((track: any) => {
                   osIntSignals.push({
                     id: `jam-${track.id}`,
                     name: track.name,
                     url: track.audio,
                     type: 'audio',
                     category: track.tags?.[0] || 'Music',
                     description: `[Jamendo] Artist: ${track.artist_name} | Album: ${track.album_name}`,
                     service: 'JAMENDO',
                     relevance_score: 0.89,
                     metadata: { duration: track.duration, image: track.image }
                   });
                 });
               }
             } catch(e) {}
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
        })(),

        // iTunes Search API (Music, Podcasts, Audiobooks)
        (async () => {
          if (['audio', 'music', 'podcast', 'video', 'all'].includes(activeType)) {
             try {
                const res = await fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=15`, {}, SCRAPER_TIMEOUT);
                if (res.ok) {
                   const data = await res.json();
                   data.results?.forEach((item: any) => {
                      if (item.previewUrl) {
                        osIntSignals.push({
                           id: `itunes-${item.trackId || Math.random()}`,
                           name: item.trackName || item.collectionName,
                           url: item.previewUrl,
                           type: item.kind === 'song' ? 'audio' : (item.kind === 'feature-movie' || item.kind === 'tv-episode' ? 'video' : 'media'),
                           category: item.primaryGenreName || 'iTunes Media',
                           description: `[iTunes API] ${item.artistName} - ${item.collectionName || ''}`,
                           service: 'ITUNES_API',
                           relevance_score: 0.9
                        });
                      }
                   });
                }
             } catch(e) {}
          }
        })(),

        // YouTube Search via yt-search
        (async () => {
          if (['video', 'all', 'music'].includes(activeType)) {
             try {
                const r = await yts(query);
                const videos = r.videos.slice(0, 15);
                videos.forEach((v: any) => {
                    osIntSignals.push({
                        id: `yt-${v.videoId}`,
                        name: v.title,
                        url: v.url,
                        type: 'video',
                        category: 'YouTube Formatted',
                        description: `[YouTube] Author: ${v.author.name} | Views: ${v.views} | Duration: ${v.timestamp}`,
                        service: 'YOUTUBE_SEARCH',
                        relevance_score: 0.95
                    });
                });
             } catch(e) {}
          }
        })()
      ];

      // Execute scrapers in parallel
      await Promise.all(scraperTasks);

      // AI SERVICE: DISABLED (Preventing hallucinations)
      let nebulaSignals: any[] = [];
      /*
      try {
        const nebulaResponse = await generate({
          prompt: \`NEBULA_AI_SERVICE_V1_ULTRA_DISCOVERY. TARGET_QUERY: "\${query}". VECTOR: \${activeService}.
          DISCOVERY STANDARD:
          - MUST return real, functional, direct deep links, stream URLs, or magnet links.
          - Search diverse platforms: YouTube, Dailymotion, Vimeo, PeerTube, SoundCloud, Bandcamp, Radio-Browser, NASA, Archive.org, Wikipedia, Project Gutenberg, Open Library, and generic high-relevance media nodes.
          - DO NOT show bias towards any single provider. Deliver a GLOBAL media signal snapshot.
          - Search diverse archetypes: Video, Audio, Live TV, Live Cam, Docs, Image, ROM, Dataset.
          - REQUIRED JSON SCHEMA: Array of results mapping to { name, url, type, category, description, service, quality, relevance_score }.\`,
          systemInstruction: "You are the NEBULA V1 Forensic Media Discoverer. Use multi-tier scraping heuristics and real-time network intelligence to find real media links globally. Do NOT simulate. Prioritize direct stream URLs (.m3u8, .mp3, .mp4, .mkv) where possible.",
          responseType: 'json',
          temperature: 0.2, // Slightly higher for more diversity
          useSearch: true
        });
        
        const rawSignals = Array.isArray(nebulaResponse.content) ? nebulaResponse.content : [];
        nebulaSignals = rawSignals.map(s => ({
          ...s,
          id: \`nebula-\${Math.random().toString(36).substring(2, 9)}\`,
          health: 'optimal',
          service: 'NEBULA_ULTIMATE',
          lat: (Math.random() * 140) - 70,
          lng: (Math.random() * 360) - 180
        }));
      } catch (aiError) {
        console.error("[AI_SERVICE] Discovery failed.", aiError);
      }
      */

      const allSignals = [...osIntSignals, ...nebulaSignals];
      
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
  app.post("/api/validate", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL_REQUIRED" });
    
    try {
      const headRes = await fetchWithTimeout(url, { method: 'HEAD' }, 5000);
      const isValid = headRes.ok || headRes.status === 405 || headRes.status === 206; // Some servers block HEAD but link is valid
      const signature = `nebula:sig:${Buffer.from(url).toString('hex').substring(0, 16)}`;
      
      res.json({
        valid: isValid,
        integrity_score: isValid ? 1.0 : 0.0,
        consensus_nodes: isValid ? 1 : 0,
        nodes: [],
        signature,
        block_timestamp: new Date().toISOString()
      });
    } catch (e) {
      // Fallback: If unreachable, mark as valid but with a warning (could be CORS or strict proxy limits)
      res.json({
        valid: true,
        integrity_score: 0.5,
        consensus_nodes: 0,
        nodes: [],
        signature: `nebula:sig:fallback_${Buffer.from(url).toString('hex').substring(0, 8)}`,
        block_timestamp: new Date().toISOString()
      });
    }
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

    let targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send("Missing target URL");

    try {
      // DYNAMIC PLAYLIST RESOLUTION (Fixes MEDIA_ERR_SRC_NOT_SUPPORTED for PLS and M3U links)
      const cleanUrlPath = targetUrl.toLowerCase().split('?')[0];
      if (cleanUrlPath.endsWith('.m3u') || cleanUrlPath.endsWith('.pls') || cleanUrlPath.endsWith('.asx')) {
        try {
          console.log(`[\x1b[36mPLAYLIST_RESOLVER\x1b[0m] Resolving playlist: ${targetUrl}`);
          const playlistRes = await fetchWithTimeout(targetUrl, {}, 6000);
          if (playlistRes.ok) {
            const playlistText = await playlistRes.text();
            if (cleanUrlPath.endsWith('.m3u')) {
              const lines = playlistText.split(/\r?\n/);
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                  console.log(`[\x1b[32mPLAYLIST_RESOLVER\x1b[0m] Resolved M3U stream URL: ${trimmed}`);
                  targetUrl = trimmed;
                  break;
                }
              }
            } else if (cleanUrlPath.endsWith('.pls')) {
              const matches = playlistText.match(/File\d+=(https?:\/\/[^\s]+)/i);
              if (matches && matches[1]) {
                console.log(`[\x1b[32mPLAYLIST_RESOLVER\x1b[0m] Resolved PLS stream URL: ${matches[1]}`);
                targetUrl = matches[1];
              }
            }
          }
        } catch (playlistErr: any) {
          console.warn(`[\x1b[33mPLAYLIST_RESOLVER\x1b[0m] Playlist resolution failed: ${playlistErr.message}`);
        }
      }

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

      // Use http/https module directly to support continuous streams (icecast) avoiding fetch buffering issues
      let redirectCount = 0;
      const MAX_REDIRECTS = 5;

      const performRequest = (currentUrl: string) => {
        if (redirectCount > MAX_REDIRECTS) {
          if (!res.headersSent) res.status(502).send("Too many redirects");
          return;
        }

        const parsedUrl = new URL(currentUrl);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const requestOptions = {
          headers: forwardHeaders,
          timeout: 30000,
          rejectUnauthorized: false // some radios have bad certs
        };

        const proxyReq = protocol.get(currentUrl, requestOptions, (proxyRes) => {
           if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
             redirectCount++;
             const nextUrl = new URL(proxyRes.headers.location, currentUrl).href;
             performRequest(nextUrl);
             return;
           }

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

           res.setHeader("Access-Control-Allow-Origin", "*");
           res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
           res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, User-Agent, Referer, Accept-Encoding");
           res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges, Content-Type");

           if (req.method === 'HEAD') {
             proxyRes.destroy();
             res.end();
           } else {
             proxyRes.pipe(res).on('error', (err: Error) => {
                console.error("[\x1b[31mPROXY_PIPE_ERROR\x1b[0m]", err.message, currentUrl);
                if (!res.headersSent) res.status(502).end();
                else res.end();
             });
           }
        });

        proxyReq.on("error", (err) => {
          console.error("[\x1b[31mPROXY_ERROR\x1b[0m]", err.message, currentUrl);
          if (!res.headersSent) res.status(502).send("Gateway Error: " + err.message);
        });

        proxyReq.on("timeout", () => {
          proxyReq.destroy();
          if (!res.headersSent) res.status(504).send("Gateway Timeout");
        });
      };

      performRequest(targetUrl);

    } catch (e: any) {
      console.error("[\x1b[31mPROXY_PANIC\x1b[0m]", e.message, req.query.url);
      if (!res.headersSent) res.status(400).send("Proxy Request Failed: " + e.message);
    }
  });

  // API route for AI Terminal (refinement/intel)
  app.post("/api/terminal", async (req, res) => {
    try {
      const { prompt, context, gpuEnabled, gpuDetails } = req.body;
      
      let hardwareContext = "";
      if (gpuEnabled && gpuDetails) {
        const vendor = gpuDetails.adapterInfo?.vendor || "Unified";
        const arch = gpuDetails.adapterInfo?.architecture || "Unified Core";
        const name = gpuDetails.adapterInfo?.name || "GPU Accelerator";
        hardwareContext = `\n\n[LOCAL_WEBGPU_HARDWARE_INTELLIGENCE]\n` +
                          `- Device Node: ${name} (${vendor})\n` +
                          `- Arch Pipeline: ${arch}\n` +
                          `- Quantized Local model: ${process.env.OLLAMA_MODEL || "qwen2.5-coder:7b"}\n` +
                          `- Extended Context Cloud model: ${process.env.GEMINI_MODEL || "gemini-1.5-pro"}\n` +
                          `- High Parameter Extreme Cloud model: ${process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct"}\n` +
                          `- WebGPU Node Speed: ${gpuDetails.gflops || "72.4"} GFLOPS\n` +
                          `- Shader Acceleration State: Binds successfully configured and active.`;
      }

      const finalPrompt = `${prompt}${context ? `\n\nContext about current media: ${JSON.stringify(context)}` : ""}${hardwareContext}`;

      const aiResponse = await generate({
        prompt: finalPrompt,
        systemInstruction: "You are the NEBULA ULTIMATE Core [V1]. Provide clinical, forensic, and highly technical responses about non-linear signal exfiltration, Advanced-network simulation, or global network security. Stay in character as a high-tier clandestine console assistant. In your response look for the [LOCAL_WEBGPU_HARDWARE_INTELLIGENCE] context; if present, acknowledge the specific GPU hardware model (e.g., RTX, Apple Silicon, Intel) and explicitly refer to the configured models in .env (like qwen2.5-coder, gemini-1.5-pro, or llama-3.1) explaining how WebGPU shader acceleration optimizes computing local tokens and pre-structures query vectors under 400ms. Use nomenclature like 'Ultimate Resonance', 'Advanced Network', 'Non-Linear Discovery', and 'Smart Forensics'.",
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

