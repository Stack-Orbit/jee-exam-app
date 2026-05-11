const fs = require('fs');
const content = fs.readFileSync('src/pages/Admin/AITestGenerator.jsx', 'utf8');
const lines = content.split('\n');

// Keep everything from line 358 onward (handlePasteImage, renderTextWithMath, JSX, export)
const keepAfter = lines.slice(357); // 0-indexed: 357 = line 358

const newTop = `import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, RefreshCw, Key, Image as ImageIcon } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Unicode \u2192 LaTeX mapping for deterministic math symbol conversion
const UNICODE_TO_LATEX = {
  '\u03b1': '\\\\alpha', '\u03b2': '\\\\beta', '\u03b3': '\\\\gamma', '\u03b4': '\\\\delta',
  '\u03b5': '\\\\epsilon', '\u03b6': '\\\\zeta', '\u03b7': '\\\\eta', '\u03b8': '\\\\theta',
  '\u03b9': '\\\\iota', '\u03ba': '\\\\kappa', '\u03bb': '\\\\lambda', '\u03bc': '\\\\mu',
  '\u03bd': '\\\\nu', '\u03be': '\\\\xi', '\u03c0': '\\\\pi', '\u03c1': '\\\\rho',
  '\u03c3': '\\\\sigma', '\u03c4': '\\\\tau', '\u03c5': '\\\\upsilon', '\u03c6': '\\\\phi',
  '\u03c7': '\\\\chi', '\u03c8': '\\\\psi', '\u03c9': '\\\\omega',
  '\u0393': '\\\\Gamma', '\u0394': '\\\\Delta', '\u0398': '\\\\Theta', '\u039b': '\\\\Lambda',
  '\u039e': '\\\\Xi', '\u03a0': '\\\\Pi', '\u03a3': '\\\\Sigma', '\u03a6': '\\\\Phi',
  '\u03a8': '\\\\Psi', '\u03a9': '\\\\Omega',
  '\u00b1': '\\\\pm', '\u2213': '\\\\mp', '\u00d7': '\\\\times', '\u00f7': '\\\\div',
  '\u00b7': '\\\\cdot', '\u2218': '\\\\circ',
  '\u2264': '\\\\leq', '\u2265': '\\\\geq', '\u2260': '\\\\neq', '\u2248': '\\\\approx',
  '\u2261': '\\\\equiv', '\u221d': '\\\\propto',
  '\u2192': '\\\\to', '\u2190': '\\\\leftarrow', '\u21d2': '\\\\Rightarrow', '\u21d4': '\\\\Leftrightarrow',
  '\u2208': '\\\\in', '\u2209': '\\\\notin', '\u2282': '\\\\subset', '\u2286': '\\\\subseteq',
  '\u222a': '\\\\cup', '\u2229': '\\\\cap', '\u2205': '\\\\emptyset',
  '\u2200': '\\\\forall', '\u2203': '\\\\exists',
  '\u221e': '\\\\infty', '\u2202': '\\\\partial', '\u2207': '\\\\nabla',
  '\u222b': '\\\\int', '\u2211': '\\\\sum', '\u220f': '\\\\prod',
  '\u221a': '\\\\sqrt', '\u00b0': '^\\\\circ',
  '\u211d': '\\\\mathbb{R}', '\u2102': '\\\\mathbb{C}', '\u2115': '\\\\mathbb{N}',
  '\u2124': '\\\\mathbb{Z}', '\u211a': '\\\\mathbb{Q}',
  '\u00b2': '^2', '\u00b3': '^3', '\u2074': '^4', '\u2070': '^0', '\u00b9': '^1',
  '\u2080': '_0', '\u2081': '_1', '\u2082': '_2', '\u2083': '_3', '\u2084': '_4',
};

function convertUnicodeToLatex(text) {
  if (!text) return text;
  let result = '';
  let i = 0;
  while (i < text.length) {
    if (UNICODE_TO_LATEX[text[i]]) {
      let mathChunk = UNICODE_TO_LATEX[text[i]];
      i++;
      while (i < text.length && UNICODE_TO_LATEX[text[i]]) {
        mathChunk += ' ' + UNICODE_TO_LATEX[text[i]];
        i++;
      }
      result += '$' + mathChunk + '$';
    } else {
      result += text[i];
      i++;
    }
  }
  return result.replace(/\\$\\s*\\$/g, ' ');
}

async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items
      .filter(item => item.str && item.str.trim())
      .sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > 5) return yDiff;
        return a.transform[4] - b.transform[4];
      });
    
    let pageText = '';
    let lastY = null;
    for (const item of items) {
      const currentY = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(currentY - lastY) > 5) {
        pageText += '\\n';
      } else if (lastY !== null) {
        pageText += ' ';
      }
      pageText += item.str;
      lastY = currentY;
    }
    pageText = convertUnicodeToLatex(pageText);
    pages.push('--- PAGE ' + pageNum + ' ---\\n' + pageText);
  }
  return pages.join('\\n\\n');
}

function AITestGenerator() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyDyd6-q9ZqC72waChUabjhG8pElU-2t3s8');
  const [generatedTest, setGeneratedTest] = useState(null);
  const [progress, setProgress] = useState('');
  const [timer, setTimer] = useState(0);
  const [reviewDone, setReviewDone] = useState(false);
  const fileInputRef = useRef(null);
  
  const [percentileFile, setPercentileFile] = useState(null);
  const [isProcessingPercentile, setIsProcessingPercentile] = useState(false);
  const [percentileData, setPercentileData] = useState(null);
  const [selectedPercentileTest, setSelectedPercentileTest] = useState(null);
  const [percentileConfirmedOnce, setPercentileConfirmedOnce] = useState(false);
  const [percentileConfirmedTwice, setPercentileConfirmedTwice] = useState(false);
  const pImageInputRef = useRef(null);

  useEffect(() => {
    let interval;
    if (loading) {
      setTimer(0);
      interval = setInterval(() => setTimer(prev => prev + 1), 1000);
    } else { setTimer(0); }
    return () => clearInterval(interval);
  }, [loading]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setError('');
    } else {
      setError('Please select a valid PDF file.');
      setFile(null);
    }
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const handlePercentileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type.startsWith('image/')) {
      setPercentileFile(selected);
      setPercentileData(null);
      setSelectedPercentileTest(null);
      setPercentileConfirmedOnce(false);
      setPercentileConfirmedTwice(false);
      setError('');
    } else {
      setError('Please select a valid image file.');
      setPercentileFile(null);
    }
  };

  const processPercentileImage = async () => {
    if (!apiKey) { setError('Please provide an API Key.'); return; }
    setIsProcessingPercentile(true);
    setError('');
    try {
      const base64Data = await fileToBase64(percentileFile);
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const prompt = \`Extract the Marks vs Percentile table from this image.
Return a strict JSON object with:
{
  "percentiles": [array of numbers, e.g. 99, 98.5, 98],
  "tests": [
     { "name": "Column Header Name", "marks": [array of marks corresponding to the percentiles] }
  ]
}
Ensure the order of marks perfectly matches the order of the percentiles.\`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ inlineData: { data: base64Data, mimeType: percentileFile.type } }, { text: prompt }] }],
        config: { temperature: 0.1, responseMimeType: "application/json" }
      });
      setPercentileData(JSON.parse(response.text));
    } catch (err) {
      setError('Failed to extract percentile data. ' + err.message);
    } finally {
      setIsProcessingPercentile(false);
    }
  };

  const handleGenerate = async () => {
    if (!file) { setError('Please upload a PDF first.'); return; }
    if (!apiKey) { setError('Please provide an API Key.'); return; }

    setLoading(true);
    setError('');
    setGeneratedTest(null);
    setReviewDone(false);

    try {
      // STEP 1: Extract text from PDF (deterministic, no AI needed)
      setProgress('Extracting text from PDF pages...');
      const extractedText = await extractTextFromPDF(file);
      console.log('Extracted text:', extractedText.length, 'chars. Preview:', extractedText.substring(0, 300));
      
      // STEP 2: Send plain TEXT to Gemini (no vision, no images!)
      setProgress('Connecting to Gemini AI...');
      const ai = new GoogleGenAI({ apiKey: apiKey });

      setProgress('AI is structuring 75 questions from extracted text... (~15-30s)');

      const prompt = \`You are an expert JEE exam paper parser. Below is the EXTRACTED TEXT from a JEE Main exam PDF.
Your job is to structure this text into exactly 75 questions in JSON format.

The text has been extracted from a digital PDF. Math symbols may appear as:
- Already in LaTeX ($...$) - keep as-is  
- Unicode characters - convert to LaTeX with $ delimiters
- Plain text like "x^2 + y^2" - wrap in $ delimiters: "$x^2 + y^2$"

STRUCTURE:
- Physics: Q1-20 (MCQ Section 1) + Q21-25 (Numerical Section 2)
- Chemistry: Q26-45 (MCQ Section 1) + Q46-50 (Numerical Section 2)
- Mathematics: Q51-70 (MCQ Section 1) + Q71-75 (Numerical Section 2)

RULES:
1. GLOBAL numbering 1-75.
2. Section names: "Physics Section 1", "Physics Section 2", "Chemistry Section 1", "Chemistry Section 2", "Mathematics Section 1", "Mathematics Section 2"
3. MCQ options: id "A","B","C","D". Remove leading labels like "(1)" or "(A)".
4. ALL math expressions MUST use $...$ delimiters with proper LaTeX inside.
   Examples: "$\\\\lambda + \\\\mu$", "$\\\\frac{x^2}{9} + \\\\frac{y^2}{4} = 1$", "$f(x) = x^2 + 1$"
5. needsScreenshot: true if question references a figure/diagram not in text.
6. correctOption: "A"/"B"/"C"/"D" for MCQ, number as string for numerical.
7. Ignore page headers, footers, watermarks, instruction text.

EXTRACTED TEXT:
\${extractedText}\`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.2,
          maxOutputTokens: 65536,
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                sectionName: { type: "STRING" },
                questionNumber: { type: "INTEGER" },
                text: { type: "STRING" },
                needsScreenshot: { type: "BOOLEAN" },
                options: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      id: { type: "STRING" },
                      text: { type: "STRING" },
                      needsScreenshot: { type: "BOOLEAN" }
                    }
                  }
                },
                correctOption: { type: "STRING" },
                type: { type: "STRING" }
              }
            }
          }
        }
      });

      // STEP 3: Parse and post-process
      setProgress('Formatting results...');
      const parsedQuestions = JSON.parse(response.text);

      const sectionsMap = {};
      parsedQuestions.forEach((q, index) => {
        const globalNum = index + 1;
        q.questionNumber = globalNum;
        
        if ((globalNum >= 21 && globalNum <= 25) || 
            (globalNum >= 46 && globalNum <= 50) || 
            (globalNum >= 71 && globalNum <= 75)) {
          q.type = "numerical";
          q.options = [];
        } else {
          q.type = "single_correct";
          if (q.options) {
            const optionLetters = ['A', 'B', 'C', 'D'];
            q.options = q.options.slice(0, 4).map((opt, oi) => {
              opt.id = optionLetters[oi];
              if (opt.text) opt.text = opt.text.replace(/^\\s*\\(?\\s*[1-4a-dA-D]\\s*[\\).:]\\s*/, '').trim();
              return opt;
            });
          }
        }

        const secName = q.sectionName || "General Section";
        if (!sectionsMap[secName]) sectionsMap[secName] = { sectionName: secName, questions: [] };
        sectionsMap[secName].questions.push(q);
      });

      const finalJSON = {
        testName: file.name.replace('.pdf', ''),
        sections: Object.values(sectionsMap)
      };

      if (percentileConfirmedTwice && selectedPercentileTest) {
        finalJSON.percentileMapping = {
          mappingName: selectedPercentileTest.name,
          percentiles: percentileData.percentiles,
          marks: selectedPercentileTest.marks
        };
      }
      
      setGeneratedTest(finalJSON);
      setProgress('Complete! ' + parsedQuestions.length + ' questions extracted.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to generate test.');
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };
`;

const result = [...newTop.split('\n'), ...keepAfter];
fs.writeFileSync('src/pages/Admin/AITestGenerator.jsx', result.join('\n'));
console.log('Done! Lines 1-357 replaced, lines 358+ preserved.');
console.log('Total lines:', result.length);
