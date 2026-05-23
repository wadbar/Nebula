import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  File, 
  Folder, 
  Search, 
  CheckCircle, 
  Database, 
  Upload, 
  History, 
  Cpu, 
  AlertTriangle,
  Info,
  ChevronUp,
  ChevronDown,
  Trash2,
  X
} from 'lucide-react';
import Papa from 'papaparse';
import { MediaResult } from '../types';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  children?: FileNode[];
}

const mockFiles: FileNode[] = [
  {
    id: 'f1',
    name: 'system_core',
    type: 'folder',
    children: [
      { id: 'f1-1', name: 'v8_kernel_bootstrap.img', type: 'file', size: 10485760 },
      { id: 'f1-2', name: 'config_runtime.json', type: 'file', size: 16384 },
    ]
  },
  {
    id: 'f2',
    name: 'security_matrix',
    type: 'folder',
    children: [
      { id: 'f2-1', name: 'audit_relay.log', type: 'file', size: 5242880 },
      { id: 'f2-2', name: 'encryption_vault.key', type: 'file', size: 2048 },
    ]
  },
  { id: 'f3', name: 'README_SYS_ADMIN.md', type: 'file', size: 1024 }
];

const ARCHITECTURE_EXTENSIONS: Record<string, string[]> = {
  'x86_64': ['.iso', '.img', '.bin', '.exe'],
  'ARMv8': ['.apk', '.img', '.bin', '.elf'],
  'MIPS': ['.bin', '.elf'],
  'PPC': ['.iso', '.bin'],
  'RISC-V': ['.bin', '.elf'],
  'N64': ['.z64', '.n64', '.v64'],
  'PSX': ['.bin', '.cue', '.iso', '.img']
};

const dropdownVariants = {
  closed: { 
    opacity: 0, 
    scale: 0.92,
    y: -10,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 1, 1] as any // MD3 Emphasized accelerated
    }
  },
  open: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0, 0, 0.2, 1] as any // MD3 Decelerated
    }
  }
};

const flattenFiles = (nodes: FileNode[], path = ''): (FileNode & { path: string })[] => {
  return nodes.reduce((acc: any[], node) => {
    const currentPath = path ? `${path}/${node.name}` : node.name;
    acc.push({ ...node, path: currentPath });
    if (node.children) {
      acc.push(...flattenFiles(node.children, currentPath));
    }
    return acc;
  }, []);
};

interface FileManagerProps {
  onImportMedia?: (media: MediaResult[]) => void;
}

export const FileManagerSection: React.FC<FileManagerProps> = ({ onImportMedia }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('nebula_fm_history_v3');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHistory, setShowHistory] = useState(false);
  
  // Platform/ROM creation state
  const [selectedArch, setSelectedArch] = useState('x86_64');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [romFile, setRomFile] = useState<File | null>(null);
  const [isArchValid, setIsArchValid] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'type'; direction: 'asc' | 'desc' } | null>(null);

  const allFiles = useMemo(() => flattenFiles(mockFiles), []);

  const filteredFiles = useMemo(() => {
    let list = allFiles;
    if (searchQuery) {
      list = list.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    if (sortConfig) {
      list = [...list].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return list;
  }, [allFiles, searchQuery, sortConfig]);

  const toggleSort = (key: 'name' | 'type') => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  useEffect(() => {
    localStorage.setItem('nebula_fm_history_v3', JSON.stringify(searchHistory));
  }, [searchHistory]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (query: string) => {
    const val = query.trim();
    if (!val) return;
    setSearchQuery(val);
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h !== val);
      return [val, ...filtered].slice(0, 10);
    });
    setShowHistory(false);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('nebula_fm_history_v3');
  };

  const handleBulkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results: Papa.ParseResult<any>) => {
        const imported = results.data.map((row: any, i: number) => ({
          id: `csv-node-${Date.now()}-${i}`,
          name: row.name || row.title || 'Unknown Cluster',
          url: row.url || row.path || row.stream || '',
          type: (row.type?.toLowerCase() || 'media') as MediaResult['type'],
          description: row.description || row.info || 'Vector imported via CSV automation protocol.',
          tags: row.tags ? (typeof row.tags === 'string' ? row.tags.split(',') : row.tags) : ['imported'],
          health: 'optimal',
          relevance_score: row.relevance || 0.95,
          service: row.provider || 'Bulk Loader'
        })) as MediaResult[];

        if (onImportMedia) {
          onImportMedia(imported);
        }
      },
      error: (error: Error) => {
        console.error('[CSV_AUDITOR] Failure:', error);
      }
    });
  };

  const validateArch = (file: File | null, arch: string) => {
    if (!file) return true;
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ARCHITECTURE_EXTENSIONS[arch] || [];
    return allowed.includes(extension);
  };

  useEffect(() => {
    setIsArchValid(validateArch(romFile, selectedArch));
  }, [romFile, selectedArch]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 sm:p-12 space-y-12 h-full overflow-y-auto bg-background selection:bg-primary/20 custom-scrollbar"
    >
      {/* MD3 Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 border-b border-outline-variant pb-10">
         <div className="space-y-2">
           <h2 className="text-4xl font-black text-on-surface flex items-center gap-5 tracking-tightest">
              <Database className="text-primary w-10 h-10 drop-shadow-[0_0_15px_rgba(var(--color-primary),0.4)]" /> 
              <span>CORE_STORAGE_V8</span>
           </h2>
           <p className="text-[10px] font-mono text-on-surface-variant opacity-60 tracking-[0.4em] pl-16 uppercase">
              Decentralized File Management & Binary Deployment Interface
           </p>
         </div>
         <div className="flex items-center gap-5 w-full md:w-auto">
            <button 
              onClick={() => csvInputRef.current?.click()}
              className="flex-1 md:flex-none flex items-center justify-center gap-4 px-10 py-5 m3-button-filled rounded-[32px]"
            >
              <Upload className="w-6 h-6 group-hover:animate-bounce" /> BULK_IMPORT_MATRIX
            </button>
            <input 
              type="file" 
              ref={csvInputRef} 
              className="hidden" 
              accept=".csv" 
              onChange={handleBulkUpload} 
            />
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        {/* Explorer Panel */}
        <div className="xl:col-span-8 space-y-10">
          <div className="relative group z-[100]">
             <Search className="w-7 h-7 absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-all duration-300" />
             <input
               type="text"
               placeholder="Execute deep-vector search..."
               value={searchQuery}
               onFocus={() => setShowHistory(true)}
               onBlur={() => setTimeout(() => setShowHistory(false), 200)}
               onChange={(e) => setSearchQuery(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(searchQuery)}
               className="w-full m3-input pl-20 pr-16 py-6"
             />
             <AnimatePresence>
               {showHistory && searchHistory.length > 0 && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.98, y: -20 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.98, y: -20 }}
                   className="absolute top-full left-0 right-0 mt-6 bg-surface-container-high border-2 border-outline-variant rounded-[48px] p-6 z-[110] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-3xl"
                 >
                   <div className="flex justify-between items-center px-6 mb-4">
                     <span className="text-[11px] font-black tracking-[0.5em] text-on-surface-variant flex items-center gap-4">
                       <History className="w-5 h-5 text-primary" /> SEARCH_CACHE_CHUNKS
                     </span>
                     <button 
                       onClick={clearHistory}
                       className="p-3 hover:bg-error/10 rounded-full transition-all group"
                       title="PURGE CACHE"
                     >
                       <X className="w-5 h-5 text-error opacity-40 group-hover:opacity-100" />
                     </button>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     {searchHistory.map((h, i) => (
                       <button
                         key={i}
                         onClick={() => handleSearchSubmit(h)}
                         className="flex items-center gap-5 px-8 py-5 rounded-[24px] hover:bg-primary/10 hover:text-primary transition-all text-base font-mono group/item text-left border-2 border-transparent hover:border-primary/20"
                       >
                         <Search className="w-5 h-5 opacity-20 group-hover/item:opacity-100" /> 
                         <span className="truncate">{h}</span>
                       </button>
                     ))}
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          <div className="bg-surface-container/10 border border-outline-variant rounded-[48px] shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
             {/* Sort Header */}
             <div className="flex items-center gap-8 px-12 py-6 border-b border-outline-variant bg-surface-container-high/30">
                <button 
                  onClick={() => toggleSort('name')}
                  className="flex flex-1 items-center gap-3 text-[11px] font-black uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors group/header"
                >
                  File Name
                  <div className="flex flex-col -gap-1 opacity-40 group-hover/header:opacity-100 transition-opacity">
                    <ChevronUp className={`w-3 h-3 ${sortConfig?.key === 'name' && sortConfig.direction === 'asc' ? 'text-primary opacity-100' : ''}`} />
                    <ChevronDown className={`w-3 h-3 ${sortConfig?.key === 'name' && sortConfig.direction === 'desc' ? 'text-primary opacity-100' : ''}`} />
                  </div>
                </button>
                <div className="w-px h-6 bg-outline-variant" />
                <button 
                  onClick={() => toggleSort('type')}
                  className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors group/header w-32 justify-end"
                >
                  Type
                  <div className="flex flex-col -gap-1 opacity-40 group-hover/header:opacity-100 transition-opacity">
                    <ChevronUp className={`w-3 h-3 ${sortConfig?.key === 'type' && sortConfig.direction === 'asc' ? 'text-primary opacity-100' : ''}`} />
                    <ChevronDown className={`w-3 h-3 ${sortConfig?.key === 'type' && sortConfig.direction === 'desc' ? 'text-primary opacity-100' : ''}`} />
                  </div>
                </button>
             </div>

             <div className="max-h-[600px] overflow-y-auto custom-scrollbar px-6 py-6 space-y-3">
               <AnimatePresence mode="popLayout">
                  {filteredFiles.map((file, idx) => (
                     <motion.div
                       key={file.id}
                       initial={{ opacity: 0, y: 20, scale: 0.98 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       transition={{ delay: idx * 0.02 }}
                       className="group flex items-center gap-8 p-8 hover:bg-surface-container-high rounded-[40px] transition-all cursor-pointer border-2 border-transparent hover:border-outline-variant shadow-sm hover:shadow-2xl active:scale-[0.99] relative"
                     >
                       <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[40px]" />
                       
                       <div className="shrink-0 p-5 bg-surface-container-highest rounded-[32px] border-2 border-outline-variant group-hover:border-primary/50 transition-all shadow-md">
                         {file.type === 'folder' ? (
                           <Folder className="w-8 h-8 text-secondary" />
                         ) : (
                           <File className="w-8 h-8 text-on-surface-variant group-hover:text-primary transition-colors" />
                         )}
                       </div>
                       
                       <div className="flex flex-col flex-1 min-w-0 relative z-10">
                          <span className="text-xl font-black text-on-surface truncate tracking-tight group-hover:text-primary transition-colors">
                            {searchQuery ? (
                               <span>
                                  {file.name.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) => 
                                     part.toLowerCase() === searchQuery.toLowerCase() 
                                       ? <mark key={i} className="bg-primary/20 text-primary px-2 rounded-xl border border-primary/20">{part}</mark>
                                       : part
                                  )}
                               </span>
                            ) : (
                               file.name
                            )}
                          </span>
                          <div className="flex items-center gap-6 mt-3">
                            <span className="text-[11px] text-on-surface-variant font-mono tracking-widest opacity-50 uppercase flex items-center gap-2">
                              <Database className="w-3 h-3" /> NODE: {file.path}
                            </span>
                            {file.size && (
                              <span className="text-[11px] font-mono text-primary font-black bg-primary/10 px-3 py-1 rounded-full border border-primary/10">
                                DATA: {(file.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                            )}
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-10 group-hover:translate-x-0">
                          <button className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all shadow-lg active:scale-90">
                             <Info className="w-6 h-6" />
                          </button>
                       </div>
                     </motion.div>
                  ))}
               </AnimatePresence>
               
               {filteredFiles.length === 0 && (
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="flex flex-col items-center justify-center py-40 text-on-surface-variant space-y-10"
                 >
                    <div className="p-16 bg-surface-container rounded-full border-2 border-dashed border-outline-variant shadow-inner animate-pulse">
                       <Search className="w-24 h-24 opacity-5" />
                    </div>
                    <div className="text-center space-y-3">
                      <p className="text-2xl font-black tracking-tight text-on-surface">COULD NOT LOCATE VECTOR</p>
                      <p className="text-sm font-mono opacity-40 uppercase tracking-widest">Query "{searchQuery}" returned null across all clusters.</p>
                    </div>
                 </motion.div>
               )}
             </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="xl:col-span-4 space-y-10">
          <div className="bg-surface-container-high border-2 border-outline-variant rounded-[56px] p-10 shadow-2xl relative overflow-hidden group/deploy shadow-primary/5">
            <div className="absolute top-0 right-0 p-10 opacity-[0.02] rotate-12 group-hover/deploy:opacity-[0.1] transition-all duration-1000">
               <Cpu className="w-80 h-80" />
            </div>
            
            <div className="flex items-center justify-between mb-12">
               <div className="flex items-center gap-5">
                  <div className="p-4 bg-blue-500/10 rounded-[20px] border-2 border-blue-500/20 shadow-lg">
                    <Cpu className="w-7 h-7 text-blue-500" />
                  </div>
                  <h3 className="text-blue-500 font-black text-sm tracking-[0.4em] uppercase">
                     DEPLOY_KERNEL_UNIT
                  </h3>
               </div>
               <div className="flex gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="w-2 h-2 rounded-full bg-blue-500/20" />
               </div>
            </div>

            <div className="space-y-10 relative">
               {/* Custom Platform Select with Motion */}
               <div className="space-y-5" ref={dropdownRef}>
                  <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-[0.5em] ml-3 block opacity-60">
                    Target_Platform_Architecture
                  </label>
                  <div className="relative">
                    <button 
                      id="platform-select"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`w-full border-2 rounded-[28px] px-8 py-6 text-base font-black font-mono flex items-center justify-between transition-all duration-300 group/btn bg-surface-container-high border-outline-variant text-on-surface ${isDropdownOpen ? 'border-primary ring-4 ring-primary/10' : ''}`}
                    >
                      <span className="tracking-tighter">{selectedArch}</span>
                      <ChevronDown className={`w-6 h-6 transition-transform duration-500 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Architecture Validation Tooltip near select */}
                    <AnimatePresence>
                      {!isArchValid && romFile && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="absolute left-full lg:ml-6 top-1/2 -translate-y-1/2 w-64 p-5 bg-error/10 backdrop-blur-md border-2 border-error/30 rounded-[28px] shadow-2xl z-[150] hidden xl:block"
                        >
                          <div className="flex items-start gap-3 text-error">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-1 animate-pulse" />
                            <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-tightest">ARCHITECTURE_MISMATCH</p>
                              <p className="text-[9px] font-mono leading-tight opacity-80">
                                Current payload sequence is incompatible with {selectedArch} logic paths.
                              </p>
                            </div>
                          </div>
                          <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-error/30" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div 
                          variants={dropdownVariants}
                          initial="closed"
                          animate="open"
                          exit="closed"
                          className="absolute top-full left-0 right-0 mt-4 bg-surface-container-high border-2 border-outline-variant rounded-[32px] p-3 z-[130] shadow-2xl backdrop-blur-3xl overflow-hidden"
                        >
                          <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
                            {Object.keys(ARCHITECTURE_EXTENSIONS).map(arch => (
                              <button
                                key={arch}
                                onClick={() => { setSelectedArch(arch); setIsDropdownOpen(false); }}
                                className={`w-full text-left px-6 py-4 rounded-xl font-mono text-sm font-black transition-all flex items-center justify-between ${selectedArch === arch ? 'bg-primary text-on-primary shadow-lg shadow-primary/25' : 'hover:bg-primary/10 hover:text-primary'}`}
                              >
                                {arch}
                                {selectedArch === arch && <CheckCircle className="w-4 h-4" />}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
               </div>

               {/* ROM Drag/Drop */}
               <div className="space-y-5">
                  <label className="text-[11px] font-black text-on-surface-variant uppercase tracking-[0.5em] ml-3 block opacity-60">
                    Binary_Payload_Sequence
                  </label>
                  <div 
                    onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); setDragActive(false); if(e.dataTransfer.files?.[0]) setRomFile(e.dataTransfer.files[0]); }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-4 border-dashed rounded-[48px] p-12 flex flex-col items-center justify-center cursor-pointer transition-all gap-6 group/drop bg-black/5 hover:bg-black/10 ${romFile ? 'border-primary/50 bg-primary/[0.03] shadow-inner' : 'border-outline-variant hover:border-primary/30'}`}
                  >
                     <AnimatePresence>
                       {dragActive && (
                         <motion.div 
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           exit={{ opacity: 0 }}
                           className="absolute inset-0 bg-primary/10 backdrop-blur-[2px] flex items-center justify-center z-20 rounded-[48px]"
                         >
                           <div className="flex flex-col items-center gap-4 text-primary">
                              <Upload className="w-16 h-16 animate-bounce" />
                              <span className="font-black text-xl tracking-tighter">RELEASE_TO_INGEST</span>
                           </div>
                         </motion.div>
                       )}
                     </AnimatePresence>

                     <input 
                       type="file" 
                       ref={fileInputRef} 
                       className="hidden" 
                       onChange={(e) => setRomFile(e.target.files?.[0] || null)} 
                     />
                     
                     <motion.div 
                        animate={romFile ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
                        className={`p-8 rounded-[36px] transition-all shadow-xl ${romFile ? 'bg-primary text-on-primary shadow-primary/30' : 'bg-surface-container-highest text-on-surface-variant border-2 border-outline-variant'}`}
                     >
                        {romFile ? <CheckCircle className="w-12 h-12" /> : <Upload className="w-12 h-12" />}
                     </motion.div>
                     
                     <div className="text-center space-y-2">
                        <span className="text-base font-black text-on-surface block tracking-tight px-6 leading-relaxed">
                           {romFile ? romFile.name : 'INGEST_NEW_BINARY_PAYLOAD'}
                        </span>
                        {!romFile && (
                          <span className="text-[11px] font-mono text-on-surface-variant opacity-40 tracking-[0.3em] block uppercase">
                             Drop sequence here
                          </span>
                        )}
                     </div>

                     {romFile && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setRomFile(null); }}
                          className="flex items-center gap-3 px-8 py-3 bg-error/10 text-error rounded-full font-black text-[11px] tracking-widest hover:bg-error/20 transition-all mt-6 border-2 border-error/10 active:scale-95 shadow-md"
                        >
                          <Trash2 className="w-4 h-4" /> EJECT_UNIT
                        </button>
                     )}
                  </div>
               </div>

               {/* Validation Error */}
               <AnimatePresence>
                 {!isArchValid && romFile && (
                    <motion.div 
                      key="arch-warning"
                      initial={{ opacity: 0, height: 0, y: 10 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: 10 }}
                      className="p-8 bg-error/10 border-2 border-error/40 rounded-[36px] text-error shadow-2xl shadow-error/10 relative group/warning"
                    >
                       <div className="flex gap-5">
                          <AlertTriangle className="w-8 h-8 shrink-0 mt-1 animate-pulse" />
                          <div className="space-y-3">
                             <p className="text-lg font-black uppercase tracking-tightest flex items-center gap-2">
                                REJECTED <span className="text-[10px] bg-error text-white px-2 py-0.5 rounded-full animate-pulse">LOCKED</span>
                             </p>
                             <p className="text-[11px] leading-relaxed opacity-90 font-black font-mono">
                                [FATAL] ARCHITECTURE_MISMATCH_DETECTED. 
                                <br/><br/>
                                <span className="opacity-50">EXPECTED_TYPES: {ARCHITECTURE_EXTENSIONS[selectedArch].join(' | ')}</span>
                             </p>
                          </div>
                       </div>
                    </motion.div>
                 )}
               </AnimatePresence>

               {/* Deploy Button with Warning Tooltip logic */}
               <div className="relative group/deploy-btn">
                 {(!romFile || !isArchValid) && (
                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-6 py-3 bg-surface-container-highest border-2 border-outline-variant rounded-2xl opacity-0 group-hover/deploy-btn:opacity-100 transition-all duration-300 pointer-events-none z-[140] shadow-2xl min-w-[200px]">
                      <div className="flex items-center gap-3 text-error">
                         <AlertTriangle className="w-4 h-4" />
                         <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                            {!romFile ? 'NO_PAYLOAD_DETECTED' : 'ARCHITECTURE_BLOCK_ACTIVE'}
                         </span>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-outline-variant" />
                   </div>
                 )}
                 <button 
                   disabled={!romFile || !isArchValid}
                   className={`group relative w-full py-8 rounded-[40px] font-black text-xl tracking-[0.4em] uppercase transition-all shadow-2xl overflow-hidden active:scale-95 ${(!romFile || !isArchValid) ? 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed opacity-30 shadow-none' : 'bg-primary text-on-primary hover:shadow-primary/40 hover:shadow-2xl hover:scale-[1.02]'}`}
                 >
                   <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                   <span className="relative z-10 flex items-center justify-center gap-5">
                      INITIALIZE_DEPLOY <ChevronDown className="-rotate-90 w-6 h-6" />
                   </span>
                 </button>
               </div>
            </div>
          </div>

          {/* Dynamic Monitoring Info */}
          <div className="bg-surface-container/20 border-2 border-outline-variant rounded-[56px] p-10 space-y-8 shadow-sm">
             <div className="flex items-center gap-5 text-on-surface-variant">
               <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                 <Info className="w-6 h-6" />
               </div>
               <h4 className="text-[11px] font-black tracking-[0.5em] uppercase opacity-70">NODE_TELEMETRY_STATUS</h4>
             </div>
             
             <div className="grid grid-cols-1 gap-6">
                <div className="p-6 bg-surface-container-high rounded-[32px] border-2 border-outline-variant space-y-4 shadow-inner">
                   <div className="flex justify-between items-center text-[11px] font-black font-mono tracking-widest">
                      <span className="opacity-40 uppercase">Cluster_Sync</span>
                      <span className="text-secondary">COORDINATED</span>
                   </div>
                   <div className="h-3 w-full bg-black/20 rounded-full overflow-hidden border border-outline-variant shadow-inner p-0.5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2 }}
                        className="h-full bg-secondary rounded-full shadow-[0_0_10px_rgba(var(--color-secondary),0.4)]"
                      />
                   </div>
                </div>
                
                <div className="flex gap-4">
                   <div className="flex-1 p-6 bg-surface-container-high rounded-[32px] border-2 border-outline-variant">
                      <p className="text-[10px] font-mono opacity-30 mb-2 font-black uppercase tracking-widest">Encrypt</p>
                      <p className="text-sm font-black text-primary tracking-tighter">SHA-256_ACTIVE</p>
                   </div>
                   <div className="flex-1 p-6 bg-surface-container-high rounded-[32px] border-2 border-outline-variant">
                      <p className="text-[10px] font-mono opacity-30 mb-2 font-black uppercase tracking-widest">Status</p>
                      <p className="text-sm font-black text-on-surface tracking-tighter">NODE_VERIFIED</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
