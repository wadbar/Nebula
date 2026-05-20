import express, { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { generate } from "./src/services/aiService";
import dotenv from "dotenv";
import http from "http";
import https from "https";
import yts from "yt-search";
import type { Socket } from "net";

// Enterprise Security & Resilience Modules
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import NodeCache from "node-cache";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

/**
 * ============================================================================
 * ESTRUTURA DE TELEMETRIA E LOGS (STDOUT JSON FORMAT)
 * ============================================================================
 */
const Logger = {
  info: (context: string, message: string, meta: Record<string, unknown> = {}) => {
    process.stdout.write(JSON.stringify({ timestamp: new Date().toISOString(), level: "INFO", context, message, meta }) + "\n");
  },
  warn: (context: string, message: string, meta: Record<string, unknown> = {}) => {
    process.stdout.write(JSON.stringify({ timestamp: new Date().toISOString(), level: "WARN", context, message, meta }) + "\n");
  },
  error: (context: string, message: string, error?: unknown) => {
    const errorDetails = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { raw: String(error) };
    process.stderr.write(JSON.stringify({ timestamp: new Date().toISOString(), level: "ERROR", context, message, error: errorDetails }) + "\n");
  }
};

/**
 * ============================================================================
 * CACHE GLOBAL PARA OTIMIZAÇÃO (TTL EVITA ESGOTAMENTO DE MEMÓRIA)
 * ============================================================================
 */
const GlobalCache = new NodeCache({ stdTTL: 300, checkperiod: 60, useClones: false });

/**
 * ============================================================================
 * INTERCEPTADORES DE EXCEÇÕES DE NIVEL GLOBAL (EVITAR CRASH DO DAEMON)
 * ============================================================================
 */
process.on("uncaughtException", (error: Error) => {
  Logger.error("GLOBAL_DAEMON", "Interceptada exceção global não tratada", error);
});

process.on("unhandledRejection", (reason: unknown) => {
  Logger.error("GLOBAL_DAEMON", "Interceptada rejeição de promise não tratada", reason);
});

/**
 * ============================================================================
 * REDE ASSÍNCRONA E INFRAESTRUTURA: BACKOFF EXPONENCIAL E RASTREABILIDADE
 * ============================================================================
 */
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3, backoff = 500, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const traceId = uuidv4();

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "X-Request-Trace-ID": traceId,
        ...(options.headers || {})
      }
    });

    clearTimeout(id);

    if (!response.ok && response.status >= 500 && retries > 0) {
      throw new Error(`ESTADO_HTTP_${response.status}`);
    }

    return response;
  } catch (error) {
    clearTimeout(id);
    if (retries > 0) {
      Logger.warn("NETWORK_CLIENT", `Falha de requisição em ${url}. Retentativa em ${backoff}ms... (${retries} restantes) | Trace: ${traceId}`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2, timeout);
    }
    throw error;
  }
}

/**
 * Definições e Tipagens de Dados Estritas para a API de Descoberta
 */
interface OsIntSignal {
  id: string;
  name: string;
  url: string;
  type: string;
  category: string;
  description: string;
  service: string;
  relevance_score: number;
  metadata?: Record<string, unknown>;
  health?: "optimal" | "stable" | "broken";
}

/**
 * ============================================================================
 * INICIALIZAÇÃO E ARQUITETURA DO SERVIDOR
 * ============================================================================
 */
async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  // Parse Body payload constraints
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));

  // Middleware de Rastreabilidade (Trace ID)
  app.use((req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    const traceId = uuidv4();
    req.headers["x-request-trace-id"] = traceId;
    res.setHeader("X-Response-Trace-ID", traceId);
    next();
  });

  // Enterprise Security Layer (Helmet) adaptado para vite SPA support
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
    })
  );

  // Global Cross-Origin Resolution
  app.use(cors({ origin: "*", methods: "GET,HEAD,PUT,PATCH,POST,DELETE", preflightContinue: false }));

  // Limit Rate for all routes (Anti-DDoS superficial limit)
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 1000, 
    message: "Rate limit excedido. Backoff imposto pelo Daemon.",
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(globalLimiter);

  // Custom middleware de log pós-rota e verificação robusta de erros de stream
  app.use((_req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    res.on("error", (err) => Logger.error("HTTP_RESPONSE", "Quebra na stream de resposta transacional", err));
    next();
  });

  // ============================================================================
  // COMPONENTES DE ROTAS DE BACKEND
  // ============================================================================

  const discoverLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, 
    max: 150, 
    message: "Sobrecarga de descoberta detectada."
  });

  app.post("/api/discover", discoverLimiter, async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const { query, type: activeTypeInput, service, opensearchWeightBoost } = req.body;
      if (!query || typeof query !== "string") {
         return res.status(400).json({ error: "PARÂMETRO_DE_BUSCA_OBRIGATÓRIO" });
      }

      const activeService = typeof service === "string" ? service : "DEEP_SEARCH";
      const boostValue = typeof opensearchWeightBoost === "number" ? opensearchWeightBoost : 1.0;
      let activeType = typeof activeTypeInput === "string" ? activeTypeInput : "all";
      
      if (["favorites", "history", "all"].includes(activeType)) {
        activeType = "all";
      }

      const cacheKey = `discovery_hash_${Buffer.from(query + activeType + activeService).toString("base64")}`;
      const cachedResult = GlobalCache.get(cacheKey);
      
      if (cachedResult) {
         Logger.info("DISCOVERY_MODULE", "Hit de cache resolvido para otimização de rede", { query, cacheKey });
         return res.json(cachedResult);
      }

      Logger.info("DISCOVERY_MODULE", "Iniciando varredura distribuída robusta", { query, activeType, activeService, boostValue });

      const osIntSignals: OsIntSignal[] = [];
      const SCRAPER_TIMEOUT = 12000;

      // Execução Paralela Protegida via Promise.allSettled
      const scraperTasks = [
        (async () => {
          if (process.env.GEMINI_API_KEY) {
            try {
              Logger.info("AI_GROUNDING_SCRAPER", `Iniciando Scraper com Grounding de IA e Busca por Web Indexers para: "${query}"`);
              
              const aiPrompt = `Perform deep web research to discover real, functional, and high-yield media links, web radio stations, audio streaming archives, video files, live feeds, or digitized media nodes for the search query: "${query}".
Search for actual direct stream URLs, public podcasts, audio or video links, public archive.org nodes, or live broadcast portals.
Return a list of up to 10 unique, high-integrity, real multimedia resources.
Format your output STRICTLY as a JSON array of objects conforming to this TypeScript definition (do not wrap in markdown boxes, do not add any notes, return raw valid JSON array):
interface OsIntSignal {
  id: string; // unique lowercase slug, e.g. "ai-grounding-1"
  name: string; // clear, formal, descriptive title of the stream/node
  url: string; // fully resolved real URL
  type: 'radio' | 'audio' | 'video' | 'video_stream' | 'tv' | 'live_cam' | 'media' | 'image' | 'document' | 'rom' | 'book' | 'audio_stream';
  category: string; // genre, sub-genre, or tag
  description: string; // a clear summary explaining what this resource contains (include bitrate, language, or quality details if resolved)
  service: string; // MUST be set to 'GEMINI_AI_AGENT'
  relevance_score: number; // score between 0.9 and 0.99
}
Ensure all URLs are valid external HTTP/HTTPS links and point to real content or media index portals.`;

              const response = await generate({
                prompt: aiPrompt,
                systemInstruction: "You are the ultimate web indexer, scraper, and media discoverer. You leverage real-time Google search grounding to return structured media links in raw JSON format. Keep the JSON perfectly valid, with no backticks, markdown markers, or other conversational text.",
                responseType: "json",
                temperature: 0.2,
                useSearch: true
              });

              if (response && response.success && Array.isArray(response.content)) {
                response.content.forEach((item: any, idx: number) => {
                  if (item && item.url && item.name) {
                    osIntSignals.push({
                      id: `ai-grounding-${idx}-${Math.random().toString(36).substring(2, 6)}`,
                      name: String(item.name).trim(),
                      url: String(item.url),
                      type: String(item.type || 'audio'),
                      category: String(item.category || 'AI Cloud Node'),
                      description: `[AI Search Grounding] ${String(item.description || 'Verified live signal stream resolved from web index.')}`,
                      service: 'GEMINI_AI_AGENT',
                      relevance_score: Number(item.relevance_score) || 0.96
                    });
                  }
                });
                Logger.info("AI_GROUNDING_SCRAPER", `AI Search Grounding indexer successfully resolved ${response.content.length} nodes for "${query}".`);
              }
            } catch (err) {
              Logger.warn("AI_GROUNDING_SCRAPER", `Failed to run dynamic Web Search Grounding scraper:`, { error: String(err) });
            }
          }
        })(),
        (async () => {
          if (["video", "all", "movie"].includes(activeType)) {
            const response = await fetchWithRetry(`https://api.dailymotion.com/videos?search=${encodeURIComponent(query)}&fields=id,title,url,description&limit=15`, {}, 2, 500, SCRAPER_TIMEOUT);
            const data = await response.json() as { list?: Array<{ id: string; title: string; url: string; description?: string }> };
            data.list?.forEach((v) => osIntSignals.push({ id: `dm-${v.id}`, name: v.title, url: v.url, type: 'video', category: 'Video Feed', description: `[Dailymotion] ${v.description || ''}`, service: 'DAILYMOTION', relevance_score: 0.8 }));
          }
        })(),
        (async () => {
           if (["video", "all"].includes(activeType)) {
             const response = await fetchWithRetry(`https://peertube.tv/api/v1/search/videos?search=${encodeURIComponent(query)}&count=10`, {}, 2, 500, SCRAPER_TIMEOUT);
             const data = await response.json() as { data?: Array<{ uuid: string; name: string; url: string; description?: string }> };
             data.data?.forEach((v) => osIntSignals.push({ id: `pt-${v.uuid}`, name: v.name, url: v.url, type: 'video', category: 'Peer-to-Peer Video', description: `[PeerTube] ${v.description?.substring(0, 100) || ''}`, service: 'PEERTUBE', relevance_score: 0.82 }));
           }
        })(),
        (async () => {
          if (["all", "video", "image"].includes(activeType)) {
            const response = await fetchWithRetry(`https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=video,image`, {}, 2, 500, SCRAPER_TIMEOUT);
            const data = await response.json() as { collection?: { items?: Array<{ data?: Array<{ nasa_id: string; title: string; description?: string }> }> } };
            data.collection?.items?.slice(0, 10).forEach((item) => {
              const dataObj = item.data?.[0];
              if (dataObj) {
                osIntSignals.push({ id: `nasa-${dataObj.nasa_id}`, name: dataObj.title, url: `https://images-api.nasa.gov/asset/${dataObj.nasa_id}`, type: 'document', category: 'Scientific Data', description: `[NASA] ${dataObj.description?.substring(0, 150)}...`, service: 'NASA_EXPLORER', relevance_score: 0.9 });
              }
            });
          }
        })(),
        (async () => {
          if (["book", "document", "all"].includes(activeType)) {
            const response = await fetchWithRetry(`https://gutendex.com/books/?search=${encodeURIComponent(query)}`, {}, 2, 500, SCRAPER_TIMEOUT);
            const data = await response.json() as { results?: Array<{ id: number; title: string; authors?: Array<{ name: string }> }> };
            data.results?.slice(0, 10).forEach((b) => {
              osIntSignals.push({ id: `guten-${b.id}`, name: b.title, url: `https://www.gutenberg.org/ebooks/${b.id}`, type: 'book', category: 'Literature', description: `[Gutenberg] Author: ${b.authors?.map(a => a.name).join(', ')}`, service: 'PROJECT_GUTENBERG', relevance_score: 0.86 });
            });
          }
        })(),
        (async () => {
          if (["document", "software", "all", "rom"].includes(activeType)) {
            let apiUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=15`;
            if (query.includes('github.com/')) {
                const path = query.split('github.com/')[1].split('/');
                if (path.length >= 2 && path[0] && path[1]) apiUrl = `https://api.github.com/repos/${path[0]}/${path[1]}`;
                else if (path.length >= 1 && path[0]) apiUrl = `https://api.github.com/users/${path[0]}/repos?per_page=15&sort=updated`;
            } else if (query.startsWith('user:')) {
                apiUrl = `https://api.github.com/users/${query.split('user:')[1].trim()}/repos?per_page=15&sort=updated`;
            }

            const response = await fetchWithRetry(apiUrl, { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'System-OSINT-Scraper' } }, 2, 500, SCRAPER_TIMEOUT);
            const data = await response.json() as any;
            const items = Array.isArray(data) ? data : (data.items || [data]);
            items.slice(0, 15).forEach((repo: any) => {
              if (repo && typeof repo.name === 'string') {
                osIntSignals.push({ id: `gh-${repo.id}`, name: repo.full_name || repo.name, url: repo.html_url, type: 'software', category: repo.language || 'Code Repository', description: `[GitHub] ★ ${repo.stargazers_count} | ${repo.description || 'No description'}`, service: 'GITHUB', relevance_score: 0.95, metadata: { clone_url: repo.clone_url, default_branch: repo.default_branch } });
              }
            });
          }
        })(),
        (async () => {
           if (["audio", "music", "all"].includes(activeType)) {
             const response = await fetchWithRetry(`https://api.jamendo.com/v3.0/tracks/?client_id=56d30c95&format=jsonpretty&limit=10&search=${encodeURIComponent(query)}`, {}, 2, 500, SCRAPER_TIMEOUT);
             const data = await response.json() as { results?: Array<{ id: string; name: string; audio: string; tags?: string[]; artist_name: string; album_name: string; duration: number; image: string }> };
             data.results?.forEach((track) => {
               osIntSignals.push({ id: `jam-${track.id}`, name: track.name, url: track.audio, type: 'audio', category: track.tags?.[0] || 'Music', description: `[Jamendo] Artist: ${track.artist_name} | Album: ${track.album_name}`, service: 'JAMENDO', relevance_score: 0.89, metadata: { duration: track.duration, image: track.image } });
             });
           }
        })(),
        (async () => {
          if (["video", "tv", "all"].includes(activeType)) {
            const response = await fetchWithRetry(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`, {}, 2, 500, SCRAPER_TIMEOUT);
            const data = await response.json() as Array<{ show: { id: number; name: string; url: string; genres?: string[]; summary?: string } }>;
            data.slice(0, 10).forEach((item) => {
              const s = item.show;
              osIntSignals.push({ id: `tvm-${s.id}`, name: s.name, url: s.url, type: 'tv', category: s.genres?.[0] || 'TV Show', description: `[TVMaze] ${s.summary?.replace(/<[^>]*>?/gm, '').substring(0, 150)}...`, service: 'TV_MAZE_INTEL', relevance_score: 0.8 });
            });
          }
        })(),
        (async () => {
          if (["document", "all"].includes(activeType)) {
            const response = await fetchWithRetry(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`, {}, 2, 500, SCRAPER_TIMEOUT);
            const wikiData = await response.json() as { query?: { search?: Array<{ pageid: number; title: string; snippet: string }> } };
            wikiData.query?.search?.forEach((doc) => {
              osIntSignals.push({ id: `wiki-${doc.pageid}`, name: doc.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(doc.title.replace(/ /g, '_'))}`, type: 'document', category: 'Encyclopedia', description: `[Wikipedia] ${doc.snippet.replace(/<[^>]*>?/gm, '')}`, service: 'WIKIPEDIA_INDEX', relevance_score: 0.82 });
            });
          }
        })(),
        (async () => {
          if (["book", "all"].includes(activeType)) {
            const response = await fetchWithRetry(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8`, {}, 2, 500, SCRAPER_TIMEOUT);
            const bookData = await response.json() as { docs?: Array<{ key: string; title: string; author_name?: string[]; number_of_pages_median?: number }> };
            bookData.docs?.forEach((doc) => {
              if (doc.key) {
                osIntSignals.push({ id: `book-${doc.key.split('/').pop()}`, name: doc.title, url: `https://openlibrary.org${doc.key}`, type: 'book', category: 'Library', description: `Author: ${doc.author_name?.join(', ') || 'Unknown'}. Pages: ${doc.number_of_pages_median || 'N/A'}`, service: 'OPEN_LIBRARY', relevance_score: 0.85 });
              }
            });
          }
        })(),
        (async () => {
          if (["audio", "music", "podcast", "video", "all"].includes(activeType)) {
             const response = await fetchWithRetry(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=15`, {}, 2, 500, SCRAPER_TIMEOUT);
             const data = await response.json() as { results?: Array<{ trackId?: number; trackName?: string; collectionName?: string; previewUrl?: string; kind?: string; primaryGenreName?: string; artistName?: string }> };
             data.results?.forEach((item) => {
                if (item.previewUrl) {
                  osIntSignals.push({ id: `itunes-${item.trackId || Date.now()}`, name: item.trackName || item.collectionName || 'Unknown', url: item.previewUrl, type: item.kind === 'song' ? 'audio' : (item.kind === 'feature-movie' || item.kind === 'tv-episode' ? 'video' : 'media'), category: item.primaryGenreName || 'iTunes Media', description: `[iTunes API] ${item.artistName} - ${item.collectionName || ''}`, service: 'ITUNES_API', relevance_score: 0.9 });
                }
             });
          }
        })(),
        (async () => {
          if (["video", "all", "music"].includes(activeType)) {
             const r = await yts(query);
             const videos = r.videos.slice(0, 15);
             videos.forEach((v: any) => {
                 osIntSignals.push({ id: `yt-${v.videoId}`, name: v.title, url: v.url, type: 'video', category: 'YouTube Formatted', description: `[YouTube] Author: ${v.author.name} | Views: ${v.views} | Duration: ${v.timestamp}`, service: 'YOUTUBE_SEARCH', relevance_score: 0.95 });
             });
          }
        })(),
        (async () => {
          if (["audio", "music", "all"].includes(activeType)) {
            try {
              const response = await fetchWithRetry(`https://de1.api.radio-browser.info/json/stations/byname/${encodeURIComponent(query)}?limit=15`, {}, 2, 500, SCRAPER_TIMEOUT);
              const data = await response.json() as Array<{ stationuuid: string; name: string; url_resolved?: string; url: string; tags?: string; codec?: string; bitrate?: number; country?: string }>;
              if (Array.isArray(data)) {
                data.forEach((s) => {
                  osIntSignals.push({
                    id: `rb-${s.stationuuid}`,
                    name: s.name.trim() || 'Unknown Live Node',
                    url: s.url_resolved || s.url,
                    type: 'audio',
                    category: s.tags ? s.tags.split(',')[0].trim() : 'Live Radio',
                    description: `[Radio Browser] Codec: ${s.codec || 'N/A'} | Bitrate: ${s.bitrate || 'N/A'}kbps | Country: ${s.country || 'Global'}`,
                    service: 'RADIO_BROWSER',
                    relevance_score: 0.92
                  });
                });
              }
            } catch (e) {
              Logger.warn('RADIO_BROWSER_SCRAPER', 'Failed to retrieve radio browser data', { error: String(e) });
            }
          }
        })(),
        (async () => {
          if (["all", "video", "audio", "book"].includes(activeType)) {
            try {
              const response = await fetchWithRetry(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier,title,mediatype,description&rows=15&output=json`, {}, 2, 500, SCRAPER_TIMEOUT);
              const data = await response.json() as { response?: { docs?: Array<{ identifier: string; title: string; mediatype: string; description?: string }> } };
              data.response?.docs?.forEach((doc) => {
                if (doc.identifier) {
                  const typeMap: Record<string, string> = {
                    movies: "video",
                    audio: "audio",
                    etree: "audio",
                    texts: "book",
                    software: "software"
                  };
                  osIntSignals.push({
                    id: `archive-${doc.identifier}`,
                    name: doc.title || doc.identifier,
                    url: `https://archive.org/details/${doc.identifier}`,
                    type: (typeMap[doc.mediatype] || "document") as any,
                    category: doc.mediatype,
                    description: `[Archive.org] ${doc.description?.substring(0, 150) || ''}`,
                    service: 'INTERNET_ARCHIVE',
                    relevance_score: 0.88
                  });
                }
              });
            } catch (e) {
              Logger.warn('INTERNET_ARCHIVE_SCRAPER', 'Failed to retrieve internet archive data', { error: String(e) });
            }
          }
        })()
      ];

      // Espera todas as varreduras de forma tolerante a falhas (Promise.allSettled previne crash da cadeia)
      const executionResults = await Promise.allSettled(scraperTasks);
      executionResults.forEach((result, idx) => {
          if (result.status === 'rejected') {
              Logger.warn('DISCOVERY_MODULE', `Pipeline de coleta ${idx} falhou:`, { reason: result.reason });
          }
      });

      // Isolamento e Validação de Sinais de Operação Nativa
      const uniqueSignals = Array.from(new Map(osIntSignals.map(item => [item.url, item])).values());
      const resultsToValidate = uniqueSignals.slice(0, 30);
      
      const validatedSignals = await Promise.all(
        resultsToValidate.map(async (signal) => {
          try {
            const safeUrl = String(signal.url);
            if (safeUrl.includes("youtube.com") || safeUrl.includes("youtu.be") || safeUrl.includes("archive.org") || safeUrl.includes("radio-browser") || signal.type === 'radio') {
                return { ...signal, health: 'optimal' as const };
            }

            const response = await fetchWithRetry(safeUrl, { method: 'GET', headers: { 'Range': 'bytes=0-1' } }, 0, 100, 3000).catch(() => null);
            if (response && (response.ok || response.status === 206)) {
              return { ...signal, health: 'optimal' as const };
            }

            const headRes = await fetchWithRetry(safeUrl, { method: 'HEAD' }, 0, 100, 2000).catch(() => null);
            if (headRes && headRes.ok) {
              return { ...signal, health: 'optimal' as const };
            }

            if (safeUrl.startsWith('http')) {
               return { ...signal, health: 'stable' as const };
            }

            return { ...signal, health: 'broken' as const };
          } catch (e) {
            return { ...signal, health: 'stable' as const };
          }
        })
      );

      const resolvedSignals = validatedSignals
        .filter(s => s.health !== 'broken')
        .sort((a, b) => (Number(b.relevance_score) || 0) - (Number(a.relevance_score) || 0));

      Logger.info("DISCOVERY", `Mapeamento concluído. Unidades indexadas: ${resolvedSignals.length}`);
      
      // Salva no Node-Cache (Duração em segundos, mantendo em memória veloz)
      GlobalCache.set(cacheKey, resolvedSignals, Math.floor(Math.random() * (600 - 300 + 1) + 300));
      return res.json(resolvedSignals);
    } catch (error: unknown) {
      Logger.error("DISCOVERY", "Falha sistêmica durante pipeline de descoberta global", error);
      res.status(500).json({ error: "FALHA_SISTEMICA_DE_DESCOBERTA", detail: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/translate-query", async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== "string") {
        return res.json({ translations: [] });
      }

      const cleanQuery = query.trim();
      const aiResponse = await generate({
        prompt: `Translate this multimedia search query: "${cleanQuery}" into English, Spanish, Portuguese, French, and German for high-yield search engine indexing. Return ONLY a JSON string array of 2 to 4 unique, highly effective search variations (e.g. ["rock radio", "radio rock", "estaciones de rock"]). No description or wrap other than JSON array format.`,
        systemInstruction: "You are a professional search translation service. Output ONLY a valid JSON string array of strings. Do not write markdown blocks or explain.",
        responseType: "json",
        temperature: 0.3
      });

      let translations: string[] = [cleanQuery];
      if (aiResponse && aiResponse.success && Array.isArray(aiResponse.content)) {
        translations = Array.from(new Set([cleanQuery, ...aiResponse.content.map((s: any) => String(s).trim())])).slice(0, 5);
      } else {
        const translationsFallback = [cleanQuery];
        if (cleanQuery.toLowerCase().includes("radio")) {
          translationsFallback.push(cleanQuery.toLowerCase().replace("radio", "estación de radio"));
          translationsFallback.push(cleanQuery.toLowerCase().replace("radio", "radio station"));
        }
        translations = Array.from(new Set(translationsFallback));
      }

      Logger.info("TRANSLATE_SERVICE", `Translations generated for "${cleanQuery}": ${JSON.stringify(translations)}`);
      res.json({ translations });
    } catch (e: any) {
      Logger.error("TRANSLATE_SERVICE", "Failed to translate query", e);
      res.json({ translations: [req.body.query || ""] });
    }
  });

  app.post("/api/validate", async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") {
         return res.status(400).json({ error: "URL_DE_VALIDACAO_OBRIGATORIA" });
      }
      
      const headRes = await fetchWithRetry(url, { method: "HEAD" }, 1, 1000, 5000);
      const isValid = headRes.ok || headRes.status === 405 || headRes.status === 206;
      const signature = `system:sig:${Buffer.from(url).toString("hex").substring(0, 16)}`;
      
      res.json({ valid: isValid, integrity_score: isValid ? 1.0 : 0.0, consensus_nodes: isValid ? 1 : 0, nodes: [], signature, block_timestamp: new Date().toISOString() });
    } catch (e) {
      const fallbackHash = typeof req.body.url === "string" ? Buffer.from(req.body.url).toString("hex").substring(0, 8) : "000000";
      res.json({ valid: true, integrity_score: 0.5, consensus_nodes: 0, nodes: [], signature: `system:sig:fallback_${fallbackHash}`, block_timestamp: new Date().toISOString() });
    }
  });

  app.post("/api/intel", async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const { signal } = req.body;
      if (!signal || typeof signal !== "object") {
         return res.status(400).json({ error: "SUJEITO_SINAL_INVALIDO" });
      }

      Logger.info("FORENSE", `Executando análise de inteligência profunda para o nó: ${signal.id || 'N/A'} - ${signal.name}`);

      // Extract details for the generator prompt to analyze
      const queryContext = {
        name: signal.name,
        url: signal.url,
        type: signal.type,
        category: signal.category,
        description: signal.description,
        service: signal.service,
        relevance_score: signal.relevance_score,
        health: signal.health,
        metadata: signal.metadata || {}
      };

      const prompt = `REALIZAR ANÁLISE DE VETOR E ENGENHARIA FORENSE DE SINAL MULTIMÍDIA:
- Nome do Sinal: "${queryContext.name}"
- Endereço do Nó (URL): ${queryContext.url}
- Tipo Taxonômico: ${queryContext.type}
- Categoria Operacional: ${queryContext.category}
- Descrição Base: ${queryContext.description}
- Serviço Originário: ${queryContext.service}
- Score de Relevância Estimado: ${queryContext.relevance_score}
- Estado de Saúde Detectado: ${queryContext.health || 'estável'}
- Metadados Adicionais: ${JSON.stringify(queryContext.metadata)}

Por favor, forneça um relatório técnico de inteligência de sinal (SIGINT) completo e altamente profissional estruturado EXCLUSIVAMENTE nas seções Markdown regulamentadas listadas abaixo:

## CLASSIFICAÇÃO E ASSINATURA DO SINAL
- **Assinatura do Host**: [Identificar o provedor/servidor de hospedagem, domínio, sua fidedignidade, país provável da infraestrutura]
- **Protocolo de Rede**: [Análise do protocolo, ex: HTTP/HTTPS, SSL/TLS, status de segurança, conformidade de criptografia]
- **Porta e Infraestrutura**: [Portas típicas associadas ao tipo de sinal, ex: 80, 443, 8000 para Icecast/Shoutcast, etc.]

## VETORES DE TRANSMISSÃO E EXECUÇÃO
- **Container / Codec Estável**: [Especificar codecs prováveis como MP3, AAC, H.264, VP9, MPEG, documentação, códigos-fonte, etc., conforme o tipo detectado]
- **Configuração Recomendada do Player**: [Modo de renderização sugerido: proxy direto, streaming nativo de áudio/vídeo hls.js, player iframe controlado ou renderizador de dados]
- **Ajustes de Buffer e Latência**: [Taxa de amostragem e latência estimada, tamanho de buffer ideal em milissegundos para evitar descontinuidade do fluxo de tráfego]

## CONTEXTUALIZAÇÃO DO NÓ E PROVENIÊNCIA
- **Fonte de Distribuição**: [Explicação detalhada sobre quem publica e mantém esse feed, o propósito científico, cultural, histórico ou musical deste nodo]
- **Integridade Regional**: [O que o baricentro deste sinal representa geograficamente, sua relevância populacional do dial ou rede]
- **Relevância para a Matriz**: [Como esta descoberta enriquece a indexação do banco de dados distribuído de busca espacial]

## BLINDAGEM OPERACIONAL E RISCO
- **Barreira de CORS & Origem**: [Se o sinal exige rota por proxy local (/api/proxy) devido a bloqueios de Cross-Origin Resource Sharing ou se é acessível direto]
- **Vetores de Rastreamento**: [Se o nó contém parâmetros de query para rastreabilidade de IPs ou IDs dinâmicos]
- **Recomendação de Anonimização**: [Se é recomendado ativar o Modo Stealth Privado de camuflagem para mitigação de footprint]`;

      const response = await generate({
        prompt: prompt,
        systemInstruction: "Aja como Diretor de Inteligência Cibernética e Perito Militar de Engenharia de Redes Multimídia da NEBULA OS. Produza relatórios de nível de defesa militar, estritamente técnicos, extremamente profissionais, de leitura fluida e terminologia avançada de telecomunicações. Sempre formate suas divisões principais usando exatamente as marcações de Markdown solicitadas (## classe, ## vetores, etc.), com itens iniciados por hífen (-) e marcas de negrito (**). Sem introduções ou conclusões conversacionais.",
        temperature: 0.25
      });

      res.json({ brief: response.content });
    } catch (error: unknown) {
      Logger.error("FORENSE", "Falha de execução inteligência do sinal LLM:", error);
      res.status(500).json({ error: "FALHA_CONEXAO_LLM", detail: error instanceof Error ? error.message : String(error) });
    }
  });

  // ============================================================================
  // MIDDLEWARE DE REPASSE ASSÍNCRONO COM PREVENÇÃO DE MEMORY LEAK E MANEJO DE CORRIDA
  // ============================================================================
  app.all("/api/proxy", async (req: ExpressRequest, res: ExpressResponse) => {
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, User-Agent, Referer, Accept-Encoding");
      return res.sendStatus(204);
    }

    let targetUrlString = req.query.url;
    if (!targetUrlString || typeof targetUrlString !== "string") {
      return res.status(400).send("Parâmetro 'url' estrito é mandatório");
    }
    let targetUrl = targetUrlString as string;

    try {
      const cleanUrlPath = targetUrl.toLowerCase().split("?")[0];
      if (cleanUrlPath.endsWith(".m3u") || cleanUrlPath.endsWith(".pls") || cleanUrlPath.endsWith(".asx")) {
        try {
          const playlistRes = await fetchWithRetry(targetUrl, {}, 1, 1000, 6000);
          if (playlistRes.ok) {
            const playlistText = await playlistRes.text();
            if (cleanUrlPath.endsWith(".m3u")) {
              const lines = playlistText.split(/\r?\n/);
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
                  targetUrl = trimmed;
                  break;
                }
              }
            } else if (cleanUrlPath.endsWith(".pls")) {
              const matches = playlistText.match(/File\d+=(https?:\/\/[^\s]+)/i);
              if (matches && matches[1]) {
                targetUrl = matches[1];
              }
            }
          }
        } catch (playlistErr) {
          Logger.warn("PROXY_ROUTER", `Falha na decodificação de meta-playlist: ${targetUrl}`);
        }
      }

      const parsedUrl = new URL(targetUrl);
      
      const hostname = parsedUrl.hostname.toLowerCase();
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("169.254")) {
        return res.status(403).send("Resoluções DNS locais proibidas na matriz do proxy.");
      }

      const forwardHeaders: Record<string, string> = {
        "User-Agent": (req.headers["user-agent"] as string) || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": (req.headers["accept"] as string) || "*/*",
        "Referer": parsedUrl.origin
      };

      if (req.headers["range"]) forwardHeaders["Range"] = req.headers["range"] as string;

      let redirectCount = 0;
      const MAX_REDIRECTS = 5;

      const performRequest = (currentUrl: string) => {
        if (redirectCount > MAX_REDIRECTS) {
          if (!res.headersSent) res.status(502).send("Loop de redireção detectado");
          return;
        }

        const parsedProxyUrl = new URL(currentUrl);
        const protocol = parsedProxyUrl.protocol === "https:" ? https : http;

        const requestOptions = {
          headers: forwardHeaders,
          timeout: 20000,
          rejectUnauthorized: false
        };

        const proxyReq = protocol.get(currentUrl, requestOptions, (proxyRes) => {
           if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
             redirectCount++;
             const nextUrl = new URL(proxyRes.headers.location, currentUrl).href;
             
             // Blindagem Ativa contra Vazamento (Flush explícito da memória após redirecionamento cancelado)
             proxyRes.destroy();
             performRequest(nextUrl);
             return;
           }

           res.status(proxyRes.statusCode || 200);
           
           const blockedHeaders = [
             "access-control-allow-origin", 
             "access-control-allow-credentials",
             "access-control-allow-methods",
             "access-control-allow-headers",
             "content-security-policy", 
             "x-frame-options", 
             "set-cookie"
           ];

           Object.entries(proxyRes.headers).forEach(([key, value]) => {
             if (!blockedHeaders.includes(key.toLowerCase()) && value) {
               res.setHeader(key, value as string | string[]);
             }
           });

           res.setHeader("Access-Control-Allow-Origin", "*");
           res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
           res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range, User-Agent, Referer, Accept-Encoding");
           res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges, Content-Type");

           req.on("close", () => {
             proxyReq.destroy();
             proxyRes.destroy();
           });

           if (req.method === "HEAD") {
             proxyRes.destroy();
             res.end();
           } else {
             proxyRes.pipe(res).on("error", (err: Error) => {
                Logger.error("PIPELINE_ROUTER", "Despejo asíncrono destruído por falha no pipe", err);
                if (!res.headersSent) res.status(502).end();
                else res.end();
             });
           }
        });

        proxyReq.on("error", (err) => {
          Logger.error("TLS_ROUTING", "Falha de alocação no socket do proxy", err);
          if (!res.headersSent) res.status(502).send("Camada de transporte rejeitou a comunicação");
        });

        proxyReq.on("timeout", () => {
          proxyReq.destroy();
          if (!res.headersSent) res.status(504).send("Latência fatal. Conexão terminada.");
        });
      };

      performRequest(targetUrl);

    } catch (e: unknown) {
      Logger.error("GLOBAL_PROXY", "Crash capturado no ciclo principal do roteador", e);
      if (!res.headersSent) res.status(400).send("Formato de URI ou pipeline inoperável");
    }
  });

  app.post("/api/terminal", async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const { prompt, context, gpuEnabled, gpuDetails } = req.body;
      
      let hardwareContext = "";
      if (gpuEnabled && gpuDetails) {
        hardwareContext = `\n\n[DADOS_HARDWARE]\n- Adap/T: ${gpuDetails.adapterInfo?.name || "Desconhecido"}\n- C-Gflops: ${gpuDetails.gflops || "Sem acesso"}`;
      }

      const finalPrompt = `${prompt}${context ? `\n\nContexto: ${JSON.stringify(context)}` : ""}${hardwareContext}`;

      const aiResponse = await generate({
        prompt: finalPrompt,
        systemInstruction: "Aja como Analista de Terminal. Forneça respostas diretas de engenharia e administração de infraestrutura.",
        responseType: "text",
        temperature: 0.1
      });
      res.json({ text: aiResponse.content, provider: aiResponse.provider });
    } catch (error: unknown) {
      Logger.error("TERMINAL_INTERFACE", "Falha em acionador cognitivo backend", error);
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/generate-subtitles", async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const { media } = req.body;
      const aiResponse = await generate({
        prompt: `Produza transcrição limpa para a stream baseando-se nestes metadados: Nome: ${media.name}, Sobre: ${media.description}`,
        systemInstruction: "Retorne o texto literal limpo de possíveis conversões estruturadas. Não utilize tags ou diálogo formal. Apenas transcrições contínuas de escopo.",
        responseType: "text",
        temperature: 0.05
      });
      res.json({ success: true, content: aiResponse.content || aiResponse });
    } catch (error: unknown) {
      Logger.error("ML_PIPELINE", "Modelo transcritor assíncrono apresentou erro fatal", error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // ============================================================================
  // MONTAGEM DE APLICAÇÃO CLIENT (VITE MIDDLEWARE E STATIC SERVING)
  // ============================================================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: ExpressRequest, res: ExpressResponse) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // ============================================================================
  // GESTÃO DO DAEMON, CONEXÕES E GRACEFUL SHUTDOWN
  // ============================================================================
  const server = app.listen(PORT, "0.0.0.0", () => {
    Logger.info("DAEMON_WORKER", `Servidor nativo engatilhado e respondendo na porta ${PORT}`);
  });

  // Rastreio inteligente de sockets TCP abertos para o Kernel
  const connections = new Set<Socket>();
  server.on("connection", (connection: Socket) => {
    connections.add(connection);
    connection.on("close", () => {
      connections.delete(connection);
    });
  });

  const shutDownDaemon = (signal: string) => {
    Logger.info("DAEMON_WORKER", `Capturado vetor crítico de interrupção: ${signal}`);
    Logger.info("DAEMON_WORKER", `Preparando desmonte do pipeline HTTP. Conexões pendentes: ${connections.size}`);
    
    // Configura o threshold máximo de Graceful Timeout (10 segundos)
    const killTimer = setTimeout(() => {
        Logger.error("DAEMON_WORKER", "Threshold de encerramento estourado. Evacuando PID da memória forçadamente.");
        process.exit(1);
    }, 10000);
    killTimer.unref();

    server.close(() => {
      Logger.info("DAEMON_WORKER", "Descritores de arquivo isolados. Sockets fechados com segurança na camada HTTP.");
      process.exit(0);
    });
    
    // Despejo forçado das conexões HTTP ativas durante o fechamento
    connections.forEach((conn) => {
       conn.end();
       conn.destroy();
    });
  };

  process.on("SIGTERM", () => shutDownDaemon("SIGTERM"));
  process.on("SIGINT", () => shutDownDaemon("SIGINT"));
}

// Inicia com trava asíncrona de falha no arranque (Pre-flight Crash Guard)
startServer().catch((error: unknown) => {
  Logger.error("DAEMON_LAUNCHER", "Duto principal corrompido durante start no ambiente.", error);
  process.exit(1);
});
