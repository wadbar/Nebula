/**
 * NEBULA_OS_AI_CORE_V4
 * Purpose: Universal, agnostic, robust AI invocation service (ESM)
 * Strategy: Circuit Breaking / Fallback via Provider Chain, Dynamic Plugin-like Discovery
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GeneratorResponse {
  success: boolean;
  provider: string;
  model: string;
  content: any;
  timestamp: string;
}

interface Provider {
  name: string;
  run: (prompt: string, system: string, type: 'text' | 'json', temp: number, useSearch: boolean) => Promise<any>;
  check: () => boolean;
  isFailing: boolean;
  failureCount: number;
}

const PROVIDER_TIMEOUT = 45000;
const FAILURE_THRESHOLD = 3;

// Lazy initialization of Gemini client to prevent crash if key is missing at start
let genAI: GoogleGenerativeAI | null = null;
const getGeminiClient = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

// --- Sanitization Utils ---
const sanitizeJson = (content: string): any => {
  if (typeof content !== 'string') return content;
  let cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  
  // Try to find a JSON block if there's leading/trailing text
  const match = cleaned.match(/\[\s*\{.*\}\s*\]|\{\s*".*\}\s*/s);
  if (match) {
    cleaned = match[0];
  }
  
  // Strip citations that break JSON
  cleaned = cleaned.replace(/\[\d+(?:,\s*\d+)*\]/g, "");
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("[AI_CORE] [JSON_PARSE_ERROR]", cleaned);
    // If it's a list request but failed, return empty array instead of failing
    if (cleaned.startsWith('[') || cleaned.endsWith(']')) return [];
    throw new Error("INVALID_JSON_FORMAT");
  }
};

// --- Provider Implementation ---

const runGemini: Provider["run"] = async (prompt, system, type, temp, useSearch) => {
  const genAIClient = getGeminiClient();
  if (!genAIClient) throw new Error("GEMINI_NOT_CONFIGURED");

  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  
  const model = genAIClient.getGenerativeModel({ 
    model: modelName,
    systemInstruction: system,
  });

  const generationConfig = {
    temperature: temp,
    responseMimeType: (type === 'json' && !useSearch) ? "application/json" : "text/plain"
  };

  const tools = useSearch ? [{ googleSearchRetrieval: {} }] : undefined;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig,
    tools: tools as any
  });

  const response = await result.response;
  const text = response.text();

  if (!text) {
    console.error("[GEMINI] Empty Response");
    throw new Error("INVALID_RESPONSE_STRUCTURE");
  }

  return text;
};

const runOllama: Provider["run"] = async (prompt, system, type, temp, _useSearch) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT);
  
  try {
    const res = await fetch(`${process.env.OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'llama3',
        prompt: `System: ${system}\n\nUser: ${prompt}`,
        stream: false,
        options: { temperature: temp },
        format: type === 'json' ? 'json' : undefined
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));
    
    if (!res.ok) throw new Error(`API_ERROR_OLLAMA (${res.status})`);
    const data = await res.json();
    if (!data.response) throw new Error("INVALID_RESPONSE_STRUCTURE");
    return data.response;
  } catch (e: any) {
    throw new Error(`OLLAMA_UNREACHABLE: ${e.message}`);
  }
};

const runNvidia: Provider["run"] = async (prompt, system, type, temp, _useSearch) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT);
  
  try {
    const res = await fetch(`${process.env.NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct',
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        temperature: temp,
        response_format: type === 'json' ? { type: 'json_object' } : undefined
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));
    
    if (!res.ok) throw new Error(`API_ERROR_NVIDIA (${res.status})`);
    const data = await res.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error("INVALID_RESPONSE_STRUCTURE");
    }
    return data.choices[0].message.content;
  } catch (e: any) {
    throw new Error(`NVIDIA_UNREACHABLE: ${e.message}`);
  }
};

// --- Core ---

const providers: Provider[] = [
  { name: 'gemini', run: runGemini, check: () => !!process.env.GEMINI_API_KEY, isFailing: false, failureCount: 0 },
  { name: 'ollama', run: runOllama, check: () => !!process.env.OLLAMA_HOST, isFailing: false, failureCount: 0 },
  { name: 'nvidia', run: runNvidia, check: () => !!process.env.NVIDIA_API_KEY && !!process.env.NVIDIA_BASE_URL, isFailing: false, failureCount: 0 }
];

export async function generate({ 
  prompt, 
  systemInstruction, 
  responseType = 'text', 
  temperature = 0.7,
  useSearch = false
}: { 
  prompt: string; 
  systemInstruction: string; 
  responseType?: 'text' | 'json'; 
  temperature?: number;
  useSearch?: boolean;
}): Promise<GeneratorResponse> {
  const errors: Record<string, any> = {};
  
  // Re-check check status to handle dynamic env changes in dev
  const activeProviders = providers.filter(p => !p.isFailing && p.check());

  if (activeProviders.length === 0) {
    const providerStatus = providers.map(p => `${p.name}: ${p.check() ? 'READY' : 'MISCONFIGURED'}${p.isFailing ? ' (FAILED)' : ''}`).join(', ');
    console.error(`[AI_CORE] No active providers. Status: ${providerStatus}`);
    throw new Error(`ALL_AI_PROVIDERS_OFFLINE: ${providerStatus}`);
  }

  for (const provider of activeProviders) {
    console.log(`[AI_CORE] Attempting: ${provider.name.toUpperCase()}...`);
      
    try {
      const rawResult = await provider.run(prompt, systemInstruction, responseType, temperature, useSearch);
      const content = responseType === 'json' ? sanitizeJson(rawResult) : rawResult;
      
      provider.failureCount = 0;

      return {
        success: true,
        provider: provider.name,
        model: process.env[`${provider.name.toUpperCase()}_MODEL`] || 'dynamic',
        content: content,
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      provider.failureCount++;
      if (provider.failureCount >= FAILURE_THRESHOLD) {
          provider.isFailing = true;
          console.error(`[AI_CORE] Circuit Breaker for ${provider.name.toUpperCase()}`);
      }

      errors[provider.name] = err.message;
      console.error(`[AI_CORE] ${provider.name.toUpperCase()} fail: ${err.message}`);
    }
  }

  throw new Error(`ALL_AI_PROVIDERS_FAILED: ${JSON.stringify(errors)}`);
}


