import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  TrendingUp,
  Star,
  Loader2,
  AlertCircle,
  Terminal,
  X,
  Filter,
  History,
  CheckSquare,
  Square,
  Download,
  ListPlus,
  LayoutGrid,
  List,
  Edit3,
  FileJson,
  FileText as FileM3U,
  Monitor,
  Globe,
  Subtitles as SubtitlesIcon,
  Mic,
  RefreshCw,
} from "lucide-react";
import { MediaResult, Playlist } from "../types";
import { SearchTrends } from "./SearchTrends";
import SignalTrends from "./SignalTrends";

const MediaCard = React.memo(({ 
  item, 
  index, 
  viewMode, 
  selectedItems, 
  toggleSelection, 
  playMedia, 
  onAddToPlaylist, 
  handleDownload, 
  analyzeMedia, 
  isAnalyzing 
}: { 
  item: MediaResult; 
  index: number;
  viewMode: 'matrix' | 'list';
  selectedItems: Set<string>;
  toggleSelection: (e: React.MouseEvent, id: string) => void;
  playMedia: (m: MediaResult) => void;
  onAddToPlaylist?: (media: MediaResult) => void;
  handleDownload?: (media: MediaResult) => void;
  analyzeMedia: (item: MediaResult, e?: React.MouseEvent) => void;
  isAnalyzing: string | null;
}) => {
  const isSelected = selectedItems.has(item.id!);

  const handleOpenVLC = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vlcUrl = `vlc://${item.url}`;
    const iframe = document.createElement('iframe');
    iframe.src = vlcUrl;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    setTimeout(() => document.body.contains(iframe) && document.body.removeChild(iframe), 2000);
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, delay: (index % 10) * 0.02 }}
        className={`m3-card !p-3 flex-row items-center justify-between gap-4 cursor-pointer hover:border-primary/50 group ${isSelected ? "bg-primary/10 border-primary/30" : "bg-surface-container-high/40"}`}
        onClick={() => playMedia(item)}
      >
        <div className="flex items-center gap-3 truncate">
          <button
            onClick={(e) => toggleSelection(e, item.id!)}
            className="text-on-surface-variant/40 hover:text-primary p-1 transition-colors"
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
          <div className="flex flex-col truncate">
            <div className="flex items-center gap-2">
              <span className="text-on-surface font-mono text-sm truncate group-hover:text-primary">
                {item.name}
              </span>
              {item.quality && (
                <span className="text-[8px] px-2 py-0.5 rounded-full bg-on-surface/5 border border-outline-variant text-on-surface-variant font-mono">
                  {item.quality}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[9px] text-on-surface-variant font-black uppercase tracking-widest truncate opacity-60">
              <span>{item.category || item.type}</span>
              {item.language && (
                <span className="flex items-center gap-1 text-secondary">
                  <Globe className="w-2.5 h-2.5" />
                  {item.language}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex gap-1.5">
             {item.is_dubbed && <span title="Dubbed"><Mic className="w-3.5 h-3.5 text-primary/60" /></span>}
             {item.is_subtitled && <span title="Subtitled"><SubtitlesIcon className="w-3.5 h-3.5 text-secondary/60" /></span>}
          </div>

          {item.relevance_score !== undefined && (
            <span className="hidden sm:inline-flex text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
              {item.relevance_score.toFixed(2)}
            </span>
          )}
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
               onClick={handleOpenVLC}
               title="Bypass & Execute in VLC Engine"
               className="p-2 text-[#FF8800] bg-[#FF8800]/10 hover:bg-[#FF8800]/30 rounded-full transition-colors border border-[#FF8800]/30 shadow-[0_0_8px_rgba(255,136,0,0.3)] transform hover:scale-110"
            >
               <Monitor className="w-4 h-4" />
            </button>
            {onAddToPlaylist && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToPlaylist(item);
                }}
                className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
              >
                <ListPlus className="w-4 h-4" />
              </button>
            )}
            {handleDownload && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(item);
                }}
                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-on-surface/10 rounded-full transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => analyzeMedia(item, e)}
              disabled={isAnalyzing === item.id}
              className="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary/10 rounded-full transition-colors"
            >
              {isAnalyzing === item.id ? (
                <Loader2 className="w-4 h-4 animate-spin text-secondary" />
              ) : (
                <Sparkles className="w-4 h-4 text-secondary" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: (index % 10) * 0.02 }}
      className={`m3-card transition-all group relative cursor-pointer hover:border-primary/50 ${isSelected ? "bg-primary/10 border-primary/30" : ""}`}
      onClick={() => playMedia(item)}
    >
      <div className="absolute top-4 right-4 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleOpenVLC}
          title="Bypass & Execute in VLC Engine"
          className="p-2 text-[#FF8800] bg-surface-container-highest/80 hover:bg-[#FF8800]/30 rounded-full backdrop-blur-sm transition-colors border border-[#FF8800]/50 shadow-[0_0_10px_rgba(255,136,0,0.4)] transform hover:scale-110"
        >
          <Monitor className="w-3.5 h-3.5" />
        </button>
        {handleDownload && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(item);
            }}
            className="p-2 text-on-surface/60 hover:text-on-surface bg-surface-container-highest/80 hover:bg-on-surface/20 rounded-full backdrop-blur-sm transition-colors border border-outline-variant"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}
        {onAddToPlaylist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToPlaylist(item);
            }}
            className="p-2 text-on-surface/60 hover:text-primary bg-surface-container-highest/80 hover:bg-primary/20 rounded-full backdrop-blur-sm transition-colors border border-outline-variant hover:border-primary/20"
          >
            <ListPlus className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={(e) => toggleSelection(e, item.id!)}
          className="p-2 text-on-surface/60 hover:text-primary bg-surface-container-highest/80 hover:bg-primary/20 rounded-full backdrop-blur-sm transition-colors border border-outline-variant hover:border-primary/20"
        >
          {isSelected ? (
            <CheckSquare className="w-3.5 h-3.5 text-primary" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      <div className="flex justify-between items-start mb-2 pr-20">
        <div className="flex flex-col gap-1">
          <p className="text-on-surface font-black text-base group-hover:text-primary truncate transition-colors">
            {item.name}
          </p>
          <div className="flex items-center gap-3">
            {item.quality && (
              <span className="text-[10px] font-black font-mono text-on-surface-variant opacity-40 tracking-tighter uppercase">[{item.quality}]</span>
            )}
            {item.language && (
              <span className="text-[10px] font-black font-mono text-secondary/60 flex items-center gap-1.5 uppercase tracking-tighter">
                <Globe className="w-3 h-3" />
                {item.language}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex items-center justify-between">
           <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest truncate opacity-50">
             {item.category || item.type}
           </span>
           <div className="flex gap-2">
              {item.is_dubbed && <span title="Audio Enriched / Dubbed"><Mic className="w-4 h-4 text-primary/50" /></span>}
              {item.is_subtitled && <span title="CC / Subtitles"><SubtitlesIcon className="w-4 h-4 text-secondary/50" /></span>}
           </div>
        </div>
        <span className="text-[11px] text-on-surface-variant/80 line-clamp-2 leading-relaxed h-10 italic">
          {item.description}
        </span>
      </div>
      <div className="mt-auto pt-4 flex items-center justify-between">
        <div className="flex gap-2">
          {item.relevance_score !== undefined && (
            <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
              {item.relevance_score.toFixed(2)} REL
            </span>
          )}
        </div>
        <button
          onClick={(e) => analyzeMedia(item, e)}
          className="p-3 bg-secondary/10 hover:bg-secondary/20 rounded-full transition-all active:scale-95 group/intel"
          disabled={isAnalyzing === item.id}
        >
          {isAnalyzing === item.id ? (
            <Loader2 className="w-5 h-5 animate-spin text-secondary" />
          ) : (
            <Sparkles className="w-5 h-5 text-secondary group-hover/intel:scale-110 transition-transform" />
          )}
        </button>
      </div>
    </motion.div>
  );
});

export const DiscoverView = ({
  playMedia,
  searchHistory = [],
  onAddToPlaylist,
  handleDownload,
  playlists = [],
  onBulkAddToPlaylist,
  onRunSearch,
}: {
  playMedia: (m: MediaResult) => void;
  searchHistory?: string[];
  onAddToPlaylist?: (media: MediaResult) => void;
  handleDownload?: (media: MediaResult) => void;
  playlists?: Playlist[];
  onBulkAddToPlaylist?: (items: MediaResult[], playlistId: string) => void;
  onRunSearch?: (query: string) => void;
}) => {
  const [trending, setTrending] = useState<MediaResult[]>([]);
  const [curated, setCurated] = useState<MediaResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [briefing, setBriefing] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);
  const [relevanceFilter, setRelevanceFilter] = useState<
    "ALL" | "HIGH" | "MEDIUM" | "LOW"
  >("ALL");
  const [langFilter, setLangFilter] = useState<string>("ALL");
  const [dubbedFilter, setDubbedFilter] = useState<boolean | 'ALL'>('ALL');
  const [subtitledFilter, setSubtitledFilter] = useState<boolean | 'ALL'>('ALL');

  const [sortParam, setSortParam] = useState<"Relevance" | "Name" | "Distance">(
    "Relevance",
  );
  const [viewMode, setViewMode] = useState<"matrix" | "list">("matrix");

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBulkPlaylistDropdown, setShowBulkPlaylistDropdown] =
    useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamePrefix, setRenamePrefix] = useState("");

  const fetchApiData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [trendingRes, curatedRes] = await Promise.all([
        fetch("/api/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "trending global signals and media" }),
        }),
        fetch("/api/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "curated high quality streams" }),
        }),
      ]);

      if (!trendingRes.ok || !curatedRes.ok)
        throw new Error("Failed to fetch discovered signals.");

      const trendingData = await trendingRes.json();
      const curatedData = await curatedRes.json();

      setTrending(
        trendingData.map((d: any) => ({ ...d, id: d.id || d.url })),
      );
      setCurated(
        curatedData.map((d: any) => ({ ...d, id: d.id || d.url })),
      );
    } catch (err: any) {
      setError(err.message || "Signal interception failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApiData();
  }, [fetchApiData]);

  const analyzeMedia = async (item: MediaResult, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsAnalyzing(item.id || null);
    try {
      const res = await fetch("/api/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal: item }),
      });
      const data = await res.json();
      setBriefing(data.brief);
    } catch (err) {
      console.error("AI Analysis failed:", err);
      setError("AI Analysis failed.");
    } finally {
      setIsAnalyzing(null);
    }
  };

  const getSortValue = (
    item: MediaResult,
    type: "Relevance" | "Name" | "Distance",
  ) => {
    if (type === "Name") return item.name.toLowerCase();
    if (type === "Distance") {
      const hash = Math.abs(
        (item.name + item.url)
          .split("")
          .reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0),
      );
      return hash % 1000;
    }
    return item.relevance_score || 0;
  };

  const filterAndSort = (items: MediaResult[]) => {
    const filtered = items.filter((item) => {
      // Relevance Filter
      const score = item.relevance_score || 0;
      let relevanceMatch = true;
      switch (relevanceFilter) {
        case "HIGH":
          relevanceMatch = score > 0.8;
          break;
        case "MEDIUM":
          relevanceMatch = score > 0.5 && score <= 0.8;
          break;
        case "LOW":
          relevanceMatch = score <= 0.5;
          break;
      }

      // Language Filter
      let langMatch = true;
      if (langFilter !== "ALL") {
         langMatch = item.language === langFilter || (item.audio_languages?.includes(langFilter)) || false;
      }

      // Dubbed Filter
      let dubbedMatch = true;
      if (dubbedFilter !== 'ALL') {
        dubbedMatch = !!item.is_dubbed === dubbedFilter;
      }

      // Subtitled Filter
      let subMatch = true;
      if (subtitledFilter !== 'ALL') {
        subMatch = !!item.is_subtitled === subtitledFilter;
      }

      return relevanceMatch && langMatch && dubbedMatch && subMatch;
    });

    return filtered.sort((a, b) => {
      const valA = getSortValue(a, sortParam);
      const valB = getSortValue(b, sortParam);
      if (sortParam === "Name")
        return (valA as string).localeCompare(valB as string);
      if (sortParam === "Distance") return (valA as number) - (valB as number);
      return (valB as number) - (valA as number); // Relevance descending
    });
  };

  const filteredTrending = useMemo(
    () => filterAndSort(trending),
    [trending, relevanceFilter, sortParam, langFilter, dubbedFilter, subtitledFilter],
  );
  const filteredCurated = useMemo(
    () => filterAndSort(curated),
    [curated, relevanceFilter, sortParam, langFilter, dubbedFilter, subtitledFilter],
  );

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(selectedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItems(next);
  };

  const handleBulkDownload = () => {
    if (!handleDownload) return;
    const allItems = [...trending, ...curated];
    Array.from(selectedItems).forEach((id) => {
      const item = allItems.find((i) => i.id === id);
      if (item) handleDownload(item);
    });
    setSelectedItems(new Set());
  };

  const bulkAddItemsToPlaylist = (playlistId: string) => {
    if (!onBulkAddToPlaylist) return;
    const allItems = [...trending, ...curated];
    const itemsToAdd = Array.from(selectedItems)
      .map((id) => allItems.find((i) => i.id === id))
      .filter(Boolean) as MediaResult[];
    onBulkAddToPlaylist(itemsToAdd, playlistId);
    setShowBulkPlaylistDropdown(false);
    setSelectedItems(new Set());
  };

  const handleBatchRename = () => {
    if (!renamePrefix.trim()) return;
    const prefix = renamePrefix.trim();

    setTrending((prev) =>
      prev.map((item) =>
        selectedItems.has(item.id!)
          ? { ...item, name: `${prefix}${item.name}` }
          : item,
      ),
    );
    setCurated((prev) =>
      prev.map((item) =>
        selectedItems.has(item.id!)
          ? { ...item, name: `${prefix}${item.name}` }
          : item,
      ),
    );

    setRenamePrefix("");
    setIsRenaming(false);
  };

  const exportSelected = (format: "json" | "m3u") => {
    const allItems = [...trending, ...curated];
    const items = Array.from(selectedItems)
      .map((id) => allItems.find((i) => i.id === id))
      .filter(Boolean) as MediaResult[];

    if (items.length === 0) return;

    let content = "";
    let fileName = `nebula_export_${Date.now()}`;
    let type = "";

    if (format === "json") {
      content = JSON.stringify(items, null, 2);
      fileName += ".json";
      type = "application/json";
    } else {
      content =
        "#EXTM3U\n" +
        items.map((item) => `#EXTINF:-1,${item.name}\n${item.url}`).join("\n");
      fileName += ".m3u";
      type = "text/plain";
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    setShowExportDropdown(false);
    setSelectedItems(new Set());
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 h-full overflow-y-auto relative custom-scrollbar pb-32">
      {/* Live Scraper Meta-Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] bg-black/90 backdrop-blur-3xl border border-brand-cyan/20 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            <div className="flex gap-1.5">
               <div className="w-1.5 h-6 bg-brand-cyan/30 rounded-full animate-[bounce_1s_infinite]" style={{animationDelay: '0ms'}} />
               <div className="w-1.5 h-6 bg-brand-cyan/60 rounded-full animate-[bounce_1s_infinite]" style={{animationDelay: '200ms'}} />
               <div className="w-1.5 h-6 bg-brand-cyan/90 rounded-full animate-[bounce_1s_infinite]" style={{animationDelay: '400ms'}} />
            </div>
            <div className="flex flex-col">
               <span className="text-[10px] font-black text-brand-cyan uppercase tracking-[0.2em] animate-pulse">Deep Scraper Active</span>
               <span className="text-[8px] font-mono text-white/40 uppercase">Crawling Global Media Indexers...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <h2 className="text-lg sm:text-xl font-black text-on-surface flex items-center gap-2">
          <Sparkles className="text-primary w-5 h-5" /> DISCOVER_SYNC
          <button 
            onClick={() => {
              // Add a small rotation animation to the icon
              const btn = document.getElementById('refresh-sync-btn');
              if (btn) btn.classList.add('animate-spin');
              fetchApiData();
              setTimeout(() => {
                if (btn) btn.classList.remove('animate-spin');
              }, 1000);
            }} 
            disabled={isLoading}
            className="p-1 px-2 border border-white/10 rounded-md hover:bg-white/5 transition-colors"
          >
            <RefreshCw id="refresh-sync-btn" className={`w-3 h-3 text-white/40 ${isLoading ? 'animate-spin text-brand-cyan' : ''}`} />
          </button>
        </h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full xl:w-auto">
          {searchHistory.length > 0 && (
            <div className="flex items-center gap-2 border-r border-white/10 pr-2 sm:pr-3 mr-1 sm:mr-0 overflow-x-auto max-w-[50vw] sm:max-w-none no-scrollbar">
              <History className="w-3 h-3 text-on-surface-variant shrink-0 hidden sm:block" />
              {searchHistory.map((query, i) => (
                <button
                  key={i}
                  onClick={() => onRunSearch && onRunSearch(query)}
                  className="whitespace-nowrap px-2 sm:px-3 py-1 sm:py-1.5 bg-surface-container border border-outline-variant rounded-full text-[9px] sm:text-[10px] font-mono text-on-surface hover:text-primary hover:border-primary hover:bg-primary/10 transition-colors"
                >
                  {query}
                </button>
              ))}
            </div>
          )}
          <div className="relative flex-1 sm:flex-none">
            <Filter className="w-3 h-3 sm:w-4 sm:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <select
              className="w-full sm:w-auto pl-8 sm:pl-9 pr-6 sm:pr-8 py-1.5 sm:py-2 bg-surface-container border border-outline-variant rounded-xl text-[10px] sm:text-xs font-mono text-on-surface focus:outline-none focus:border-primary appearance-none cursor-pointer hover:bg-surface-container/80 transition-colors"
              value={relevanceFilter}
              onChange={(e) => setRelevanceFilter(e.target.value as any)}
            >
              <option value="ALL">Any Relevance</option>
              <option value="HIGH">High (&gt; 0.8)</option>
              <option value="MEDIUM">Medium (0.5 - 0.8)</option>
              <option value="LOW">Low (&lt; 0.5)</option>
            </select>
          </div>

          <div className="relative flex-1 sm:flex-none">
            <Globe className="w-3 h-3 sm:w-4 sm:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <select
              className="w-full sm:w-auto pl-8 sm:pl-9 pr-6 sm:pr-8 py-1.5 sm:py-2 bg-surface-container border border-outline-variant rounded-xl text-[10px] sm:text-xs font-mono text-on-surface focus:outline-none focus:border-primary appearance-none cursor-pointer hover:bg-surface-container/80 transition-colors min-w-[100px]"
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value)}
            >
              <option value="ALL">Any Language</option>
              <option value="English">English</option>
              <option value="Portuguese">Português (PT-BR)</option>
              <option value="Spanish">Español</option>
              <option value="French">Français</option>
              <option value="German">Deutsch</option>
            </select>
          </div>

          <div className="relative flex-1 sm:flex-none">
            <Mic className="w-3 h-3 sm:w-4 sm:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <select
              className="w-full sm:w-auto pl-8 sm:pl-9 pr-6 sm:pr-8 py-1.5 sm:py-2 bg-surface-container border border-outline-variant rounded-xl text-[10px] sm:text-xs font-mono text-on-surface focus:outline-none focus:border-primary appearance-none cursor-pointer hover:bg-surface-container/80 transition-colors min-w-[100px]"
              value={dubbedFilter === 'ALL' ? 'ALL' : dubbedFilter.toString()}
              onChange={(e) => setDubbedFilter(e.target.value === 'ALL' ? 'ALL' : e.target.value === 'true')}
            >
              <option value="ALL">Audio Any</option>
              <option value="true">Dublado (DUB)</option>
              <option value="false">Original Audio</option>
            </select>
          </div>

          <div className="relative flex-1 sm:flex-none">
            <SubtitlesIcon className="w-3 h-3 sm:w-4 sm:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <select
              className="w-full sm:w-auto pl-8 sm:pl-9 pr-6 sm:pr-8 py-1.5 sm:py-2 bg-surface-container border border-outline-variant rounded-xl text-[10px] sm:text-xs font-mono text-on-surface focus:outline-none focus:border-primary appearance-none cursor-pointer hover:bg-surface-container/80 transition-colors min-w-[100px]"
              value={subtitledFilter === 'ALL' ? 'ALL' : subtitledFilter.toString()}
              onChange={(e) => setSubtitledFilter(e.target.value === 'ALL' ? 'ALL' : e.target.value === 'true')}
            >
              <option value="ALL">CC / Subs Any</option>
              <option value="true">Legendado (CC)</option>
              <option value="false">No Subtitles</option>
            </select>
          </div>

          <div className="relative flex-1 sm:flex-none border-l border-white/10 pl-2 sm:pl-3">
            <span className="text-[10px] text-white/40 uppercase tracking-widest absolute -top-4 left-3 hidden sm:block">
              Sort By
            </span>
            <select
              className="w-full sm:w-auto px-4 sm:px-6 py-1.5 sm:py-2 bg-surface-container border border-outline-variant rounded-xl text-[10px] sm:text-xs font-mono text-on-surface focus:outline-none focus:border-primary appearance-none cursor-pointer hover:bg-surface-container/80 transition-colors text-center"
              value={sortParam}
              onChange={(e) => setSortParam(e.target.value as any)}
            >
              <option value="Relevance">Relevance</option>
              <option value="Name">Name</option>
              <option value="Distance">Distance</option>
            </select>
          </div>

          <div className="flex bg-surface-container rounded-xl border border-outline-variant p-0.5 ml-auto xl:ml-0">
            <button
              onClick={() => setViewMode("matrix")}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${viewMode === "matrix" ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              <LayoutGrid className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              <List className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>

          {isLoading && (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-spin shrink-0" />
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-mono">{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-8">
          <div className="flex flex-col xl:flex-row gap-6">
            <SearchTrends history={searchHistory} onSearch={(query) => onRunSearch?.(query)} />
            <SignalTrends results={trending} />
          </div>

          {searchHistory.length > 0 && (
            <section className="m3-card p-4 sm:p-6 mb-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-on-surface-variant" />
                <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Recent Queries</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {[...new Set(searchHistory)].slice(0, 10).map((query, i) => (
                  <button
                    key={i}
                    onClick={() => onRunSearch?.(query)}
                    className="text-[10px] font-mono tracking-widest px-3 py-1.5 bg-surface hover:bg-surface-container-high border border-outline-variant rounded-lg text-on-surface hover:text-secondary transition-all"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-[10px] sm:text-sm font-black text-on-surface-variant mb-3 sm:mb-4 flex items-center gap-2">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />{" "}
              TRENDING_SIGNALS (GLOBAL TOP VOTES)
            </h3>
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={
                viewMode === "matrix"
                  ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
                  : "space-y-2"
              }
            >
              <AnimatePresence mode="popLayout">
                {filteredTrending.map((item, index) => (
                  <MediaCard
                    key={`trending-${item.id}`}
                    item={item}
                    index={index}
                    viewMode={viewMode}
                    selectedItems={selectedItems}
                    toggleSelection={toggleSelection}
                    playMedia={playMedia}
                    onAddToPlaylist={onAddToPlaylist}
                    handleDownload={handleDownload}
                    analyzeMedia={analyzeMedia}
                    isAnalyzing={isAnalyzing}
                  />
                ))}
              </AnimatePresence>
              {filteredTrending.length === 0 && (
                <motion.div
                  layout
                  className="col-span-full py-8 text-center text-on-surface-variant text-[10px] sm:text-xs font-mono border border-dashed border-outline-variant rounded-2xl"
                >
                  NO SIGNALS MATCHING FILTER OR SORT CONFIGURATION
                </motion.div>
              )}
            </motion.div>
          </section>

          <section>
            <h3 className="text-[10px] sm:text-sm font-black text-on-surface-variant mb-3 sm:mb-4 flex items-center gap-2">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />{" "}
              CURATED_TUNNELS (MOST ACTIVE)
            </h3>
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={
                viewMode === "matrix"
                  ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
                  : "space-y-2"
              }
            >
              <AnimatePresence mode="popLayout">
                {filteredCurated.map((item, index) => (
                  <MediaCard
                    key={`curated-${item.id}`}
                    item={item}
                    index={index}
                    viewMode={viewMode}
                    selectedItems={selectedItems}
                    toggleSelection={toggleSelection}
                    playMedia={playMedia}
                    onAddToPlaylist={onAddToPlaylist}
                    handleDownload={handleDownload}
                    analyzeMedia={analyzeMedia}
                    isAnalyzing={isAnalyzing}
                  />
                ))}
              </AnimatePresence>
              {filteredCurated.length === 0 && (
                <motion.div
                  layout
                  className="col-span-full py-8 text-center text-on-surface-variant text-[10px] sm:text-xs font-mono border border-dashed border-outline-variant rounded-2xl"
                >
                  NO SIGNALS MATCHING FILTER OR SORT CONFIGURATION
                </motion.div>
              )}
            </motion.div>
          </section>
        </div>
      )}

      {/* Bulk Action Toolbar */}
      <AnimatePresence>
        {selectedItems.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 border border-brand-cyan/30 bg-black/90 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] z-[200] rounded-2xl px-6 py-4 flex items-center gap-6"
          >
            <div className="flex flex-col sm:flex-row items-center sm:gap-4 sm:border-r border-white/10 sm:pr-6 mr-2">
              <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-widest bg-brand-cyan/20 px-2.5 py-1 rounded-md text-brand-cyan">
                {selectedItems.size} Selected
              </span>
              <span className="text-[10px] text-white/40 hidden sm:block">
                Awaiting Command Protocol
              </span>
            </div>

            <div className="flex gap-2 relative">
              {isRenaming ? (
                <div className="flex items-center gap-2 bg-surface-container-high p-1 rounded-2xl border border-outline-variant">
                  <input
                    type="text"
                    value={renamePrefix}
                    onChange={(e) => setRenamePrefix(e.target.value)}
                    placeholder="Prefix..."
                    className="bg-transparent border-none focus:outline-none text-[10px] text-on-surface px-3 w-28 font-mono"
                    autoFocus
                  />
                  <button
                    onClick={handleBatchRename}
                    className="m3-button-filled !px-3 !py-2 !rounded-xl"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsRenaming(false)}
                    className="m3-button-tonal !px-3 !py-2 !rounded-xl bg-error/10 text-error hover:bg-error/20"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsRenaming(true)}
                  className="m3-button-tonal !text-[10px] !tracking-widest !font-black !px-4 !py-2 !gap-2"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline uppercase">Batch Rename</span>
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="m3-button-filled !text-[10px] !tracking-widest !font-black !px-4 !py-2 !gap-2 !bg-secondary !text-on-secondary"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline uppercase">Bulk Export</span>
                </button>
                <AnimatePresence>
                  {showExportDropdown && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute bottom-full right-0 mb-3 w-44 bg-surface-container-high border border-outline-variant rounded-2xl overflow-hidden shadow-2xl z-[210] backdrop-blur-xl"
                    >
                      <div className="text-[9px] font-mono text-on-surface-variant/40 px-4 py-2.5 border-b border-outline-variant uppercase tracking-widest bg-secondary/5 font-black">
                        Select Format
                      </div>
                      <button
                        onClick={() => exportSelected("json")}
                        className="w-full text-left px-4 py-3 text-xs text-on-surface hover:bg-secondary/10 hover:text-secondary transition-all flex items-center gap-3 font-medium"
                      >
                        <FileJson className="w-4 h-4" />
                        <span>JSON Vector</span>
                      </button>
                      <button
                        onClick={() => exportSelected("m3u")}
                        className="w-full text-left px-4 py-3 text-xs text-on-surface hover:bg-secondary/10 hover:text-secondary transition-all flex items-center gap-3 font-medium"
                      >
                        <FileM3U className="w-4 h-4" />
                        <span>M3U Tunnel</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {handleDownload && (
                <button
                  onClick={handleBulkDownload}
                  className="m3-button-tonal !text-[10px] !tracking-widest !font-black !px-4 !py-2 !gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline uppercase">Bulk Download</span>
                </button>
              )}
              {onBulkAddToPlaylist && playlists.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() =>
                      setShowBulkPlaylistDropdown(!showBulkPlaylistDropdown)
                    }
                    className="m3-button-filled !text-[10px] !tracking-widest !font-black !px-4 !py-2 !gap-2"
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline uppercase">Add to Playlist</span>
                  </button>
                  <AnimatePresence>
                    {showBulkPlaylistDropdown && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute bottom-full right-0 mb-3 w-56 bg-surface-container-high border border-outline-variant rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl"
                      >
                        <div className="text-[9px] font-mono text-on-surface-variant/40 px-4 py-2.5 border-b border-outline-variant uppercase tracking-widest bg-primary/5 font-black">
                          Select Cluster
                        </div>
                        <div className="max-h-56 overflow-y-auto custom-scrollbar">
                          {playlists.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => bulkAddItemsToPlaylist(p.id)}
                              className="w-full text-left px-4 py-3.5 text-xs text-on-surface hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-between group font-medium"
                            >
                              <span className="truncate">{p.name}</span>
                              <ListPlus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <button
                onClick={() => setSelectedItems(new Set())}
                className="m3-button-tonal !px-3 !bg-error/10 !text-error !border-error/20 hover:!bg-error/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {briefing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] p-6 rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-y-auto relative selection:bg-brand-cyan/30 shadow-2xl"
            >
              <button
                onClick={() => setBriefing(null)}
                className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                <Terminal className="w-5 h-5 text-brand-cyan" />
                <h3 className="font-black text-sm tracking-[0.2em] uppercase text-white">
                  Signal Intelligence Briefing
                </h3>
              </div>
              <div className="text-brand-cyan/80 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {briefing}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
