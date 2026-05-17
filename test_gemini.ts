import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

async function testGemini() {
  const system = "You are a test agent. Output a JSON array with one object {\"foo\": \"bar\"}.";
  const prompt = "Do a google search for metallica and return the JSON.";
  const temp = 0.2;
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${system}\n\n${prompt}` }] }],
      tools: [{ googleSearch: {} }],
      generationConfig: { temperature: temp }
    })
  });
  
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

testGemini();
