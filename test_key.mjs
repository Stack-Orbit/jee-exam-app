import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'AIzaSyDyd6-q9ZqC72waChUabjhG8pElU-2t3s8' });

async function test() {
  for (const model of ['gemini-2.5-flash', 'gemini-2.0-flash']) {
    try {
      console.log(`Testing ${model}...`);
      const r = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: 'Return ONLY: [{"test":"ok"}]' }] }],
        config: { temperature: 0.1, responseMimeType: 'application/json' }
      });
      console.log(`  ✅ ${model} works! Response: ${r.text}`);
    } catch (e) {
      const code = e.message.match(/"code":(\d+)/)?.[1] || '?';
      const status = e.message.match(/"status":"([^"]+)"/)?.[1] || '?';
      console.log(`  ❌ ${model}: ${code} ${status}`);
    }
  }
}

test();
