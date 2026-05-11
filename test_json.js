import OpenAI from 'openai';
import * as fs from 'fs';

const client = new OpenAI({
    apiKey: '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',
    baseURL: 'https://integrate.api.nvidia.com/v1'
});

// Test with a simple base64 image (tiny JPEG)
async function test() {
    console.log('Testing Gemma 4 31B with a simple prompt and tiny image...');
    try {
        const r = await client.chat.completions.create({
            model: 'google/gemma-4-31b-it',
            messages: [
                { role: 'user', content: [
                    { type: 'text', text: 'Return ONLY the JSON array: [{"test": "hello"}]. No other text.' }
                ]}
            ],
            temperature: 0.1,
            max_tokens: 100
        });
        console.log('Response:', r.choices[0].message.content);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

test();
