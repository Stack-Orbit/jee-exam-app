import { GoogleGenAI } from '@google/genai';

const apiKey = 'AIzaSyAM_5oCG_CPk4qSddwoOXQi0CGLdaY8gqs';
const ai = new GoogleGenAI({ apiKey: apiKey });

async function listModels() {
    try {
        console.log("Fetching models...");
        // Use standard fetch since @google/genai might not expose listModels cleanly
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        
        if (data.models) {
            console.log("Available models:");
            data.models.forEach(m => console.log(m.name));
        } else {
            console.log("Error:", data);
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

listModels();
