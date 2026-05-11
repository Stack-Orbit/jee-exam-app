import OpenAI from 'openai';

const client = new OpenAI({
    apiKey: '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',
    baseURL: 'https://integrate.api.nvidia.com/v1'
});

// Test 1: Basic text
async function testText() {
    console.log('=== Test 1: Basic text ===');
    try {
        const r = await client.chat.completions.create({
            model: "google/gemma-4-31b-it",
            messages: [{ role: "user", content: "What is 2+2? Reply in one word." }],
            temperature: 0.1,
            max_tokens: 50
        });
        console.log('Text response:', r.choices[0].message.content);
    } catch (e) {
        console.error('Text error:', e.message);
    }
}

// Test 2: Image input (vision)
async function testVision() {
    console.log('\n=== Test 2: Vision (image input) ===');
    try {
        const r = await client.chat.completions.create({
            model: "google/gemma-4-31b-it",
            messages: [{ role: "user", content: [
                { type: "image_url", image_url: { url: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCABAAEADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAaEAACAwEBAAAAAAAAAAAAAAABAgADBBES/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/ANcAAAAAAAAAAD//2Q==" } },
                { type: "text", text: "What is in this image?" }
            ]}],
            temperature: 0.1,
            max_tokens: 100
        });
        console.log('Vision response:', r.choices[0].message.content);
    } catch (e) {
        console.error('Vision error:', e.message);
    }
}

await testText();
await testVision();
