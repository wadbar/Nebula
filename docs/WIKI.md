# 🌌 NEBULA OS Wiki

Welcome to the definitive architectural manual for NEBULA OS.

## Core Philosophy
We do not build typical user interfaces. We forge raw telemetry nodes, bypassing standard constraints. The application relies heavily on Extreme Proxying, AI Grounding Scrapers, and VLC Core bridges to deliver hyper-resilient streaming.

## 🧠 Extrema Otimização de Inteligência (AI Mode)
- `@google/genai` is tuned with strict bounds (`topK=40`, `topP=0.95`, `maxOutputTokens=8192`). 
- **Ollama Local Engine Check:** The fallback node natively interrogates `http://localhost:11434/api/generate` guaranteeing offline intelligence operations if the core network gets severed.

## ⚙️ Engine Level Hacks (Java/Node Runtime Equivalency)
- `NODE_OPTIONS` enforces a deterministic garbage collector (`--gc-interval=100`) and limits V8's heap strictly to `--max-old-space-size=4096`. Operations like telemetry and multi-threaded discovery (Web Workers) require large contiguous memory blocks.
- **Socket Density:** Utilizing `http.globalAgent.maxSockets = 50000`, the instance acts similarly to Erlang clusters, refusing node starvation when resolving thousands of `OsIntSignals`. 

## ⬇️ Auto Downloads (Extreme Binary Extractor)
- Instead of using `window.open` wrappers, NEBULA OS creates internal Node `<ReadableStream>` pipes traversing through the Backend proxy. It grabs raw binary chunks, compiles them into a pure `Blob()`, and enforces saving regardless of CORS barriers. If it fails, fallback initiates automatically.

## 📡 Topology Node Prefetch
- Your player runs seamlessly because of hidden `<link rel="preload">` DOM insertions and `HEAD` probes happening seconds before you press next. 

**This wiki is maintained autonomously.**
