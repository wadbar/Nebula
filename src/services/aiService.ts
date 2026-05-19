/**
 * NEBULA_OS_AI_CORE_V4
 * Purpose: Universal, agnostic, robust AI invocation service (ESM)
 * Strategy: Circuit Breaking / Fallback via Provider Chain, Dynamic Plugin-like Discovery
 */

import dotenv from "dotenv";
dotenv.config();

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

const PROVIDER_TIMEOUT = 30000;
const FAILURE_THRESHOLD = 3;

// --- Sanitization Utils ---
const sanitizeJson = (content: string): any => {
  let cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  
  // Try to find a JSON block if there's leading/trailing text
  const match = cleaned.match(/\[\s*\{.*\}\s*\]|\{\s*".*\}\s*/s);
  if (match) {
    cleaned = match[0];
  }
  
  // Strip Google Search grounding citations like [1] or [1, 2] which break JSON parsing
  cleaned = cleaned.replace(/\[\d+(?:,\s*\d+)*\]/g, "");
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("[AI_CORE] [JSON_PARSE_ERROR]", cleaned);
    throw new Error("INVALID_JSON_FORMAT");
  }
};

// --- Provider Implementation ---

const runOllama: Provider["run"] = async (prompt, system, type, temp, useSearch) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT);
  
  const res = await fetch(`${process.env.OLLAMA_HOST}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'llama3',
      prompt: `${system}\n\n${prompt}`,
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
};

const runGemini: Provider["run"] = async (prompt, system, type, temp, useSearch) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT);
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-3-flash-preview'}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  
  const payload: any = {
    contents: [{ parts: [{ text: `${system}\n\n${prompt}` }] }],
    generationConfig: { temperature: temp }
  };
  
  if (useSearch) {
    payload.tools = [{ googleSearch: {} }];
  } else if (type === 'json') {
    payload.generationConfig.responseMimeType = "application/json";
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: controller.signal
  }).finally(() => clearTimeout(timeout));
  
  if (!res.ok) throw new Error(`API_ERROR_GEMINI (${res.status})`);
  const data = await res.json();
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    console.error("[GEMINI] Invalid Response:", JSON.stringify(data, null, 2));
    throw new Error("INVALID_RESPONSE_STRUCTURE");
  }
  return data.candidates[0].content.parts[0].text;
};

const runNvidia: Provider["run"] = async (prompt, system, type, temp, useSearch) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT);
  
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
};

// --- Core ---

const providers: Provider[] = [
  { name: 'ollama', run: runOllama, check: () => !!process.env.OLLAMA_HOST, isFailing: false, failureCount: 0 },
  { name: 'gemini', run: runGemini, check: () => !!process.env.GEMINI_API_KEY, isFailing: false, failureCount: 0 },
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

  for (const provider of providers) {
    if (provider.isFailing) {
        console.warn(`[AI_CORE] [${new Date().toISOString()}] Circuit Breaker active for ${provider.name.toUpperCase()}. Skipping.`);
        continue;
    }

    if (!provider.check()) {
        console.log(`[AI_CORE] [${new Date().toISOString()}] Skipping ${provider.name.toUpperCase()} (not configured)`);
        continue;
    }
      
    console.log(`[AI_CORE] [${new Date().toISOString()}] Attempting: ${provider.name.toUpperCase()}...`);
      
    try {
      const rawResult = await provider.run(prompt, systemInstruction, responseType, temperature, useSearch);
      const content = responseType === 'json' ? sanitizeJson(rawResult) : rawResult;
      
      provider.failureCount = 0; // Reset on success

      return {
        success: true,
        provider: provider.name,
        model: process.env[`${provider.name.toUpperCase()}_MODEL`] || 'unknown',
        content: content,
        timestamp: new Date().toISOString()
      };
    } catch (err: any) {
      provider.failureCount++;
      if (provider.failureCount >= FAILURE_THRESHOLD) {
          provider.isFailing = true;
          console.error(`[AI_CORE] [${new Date().toISOString()}] Provider ${provider.name.toUpperCase()} tripped Circuit Breaker after ${provider.failureCount} failures.`);
      }

      errors[provider.name] = err.message;
      console.error(`[AI_CORE] [${new Date().toISOString()}] ${provider.name.toUpperCase()} error: ${err.message}`);
    }
  }

  console.error("[AI_CORE] All AI providers offline or skipped. Errors:", errors);
  throw new Error(`ALL_AI_PROVIDERS_OFFLINE: ${JSON.stringify(errors)}`);
}

