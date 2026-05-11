import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, RefreshCw, Key, Image as ImageIcon } from 'lucide-react';
import OpenAI from 'openai';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Determine API base URL: Vite proxy for local dev, Vercel serverless function for production
const NVIDIA_BASE_URL = import.meta.env.DEV
  ? '/api/nvidia/v1'
  : '/api/nvidia';


function AITestGenerator() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_NVIDIA_API_KEY || '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');
  const [generatedTest, setGeneratedTest] = useState(null);
  const [progress, setProgress] = useState('');
  const [timer, setTimer] = useState(0);
  const [reviewDone, setReviewDone] = useState(false);
  const fileInputRef = useRef(null);
  
  // Percentile Image States
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
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      setTimer(0);
    }
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
    if (!apiKey) {
      setError('Please provide an API Key.');
      return;
    }
    setIsProcessingPercentile(true);
    setError('');
    try {
      const base64Data = await fileToBase64(percentileFile);
      const client = new OpenAI({ apiKey: apiKey, baseURL: NVIDIA_BASE_URL, dangerouslyAllowBrowser: true, maxRetries: 2, timeout: 120000 });
      const prompt = `Extract the Marks vs Percentile table from this image.
Return ONLY a strict JSON object (no markdown, no explanation) with:
{
  "percentiles": [array of numbers, e.g. 99, 98.5, 98],
  "tests": [
     { "name": "Column Header Name", "marks": [array of marks corresponding to the percentiles] }
  ]
}
Ensure the order of marks perfectly matches the order of the percentiles.`;

      const response = await client.chat.completions.create({
        model: 'google/gemma-4-31b-it',
        messages: [
          { role: 'user', content: [
            { type: 'image_url', image_url: { url: `data:${percentileFile.type};base64,${base64Data}` } },
            { type: 'text', text: prompt }
          ]}
        ],
        temperature: 0.1,
        max_tokens: 4096
      });
      let resultText = response.choices[0].message.content;
      // Strip any markdown fencing the model might add
      resultText = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const data = JSON.parse(resultText);
      setPercentileData(data);
    } catch (err) {
      setError('Failed to extract percentile data. ' + err.message);
    } finally {
      setIsProcessingPercentile(false);
    }
  };

  const handleGenerate = async () => {
    if (!file) {
      setError('Please upload a PDF first.');
      return;
    }
    if (!apiKey) {
      setError('Please provide an API Key.');
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedTest(null);
    setReviewDone(false);
    setProgress('Reading PDF file...');

    try {
      // ── STEP 1: Convert PDF pages to images ──
      setProgress('Converting PDF to high-res images...');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const images = [];
      
      // Stitch 2 pages per image to stay under image limits
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 2) {
        setProgress(`Rendering PDF pages ${pageNum}-${Math.min(pageNum + 1, pdf.numPages)} of ${pdf.numPages}...`);
        const page1 = await pdf.getPage(pageNum);
        const vp1 = page1.getViewport({ scale: 1.5 });
        
        let page2 = null;
        let vp2 = null;
        if (pageNum + 1 <= pdf.numPages) {
          page2 = await pdf.getPage(pageNum + 1);
          vp2 = page2.getViewport({ scale: 1.5 });
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(vp1.width, vp2 ? vp2.width : 0);
        canvas.height = vp1.height + (vp2 ? vp2.height : 0);
        const ctx = canvas.getContext('2d');
        
        await page1.render({ canvasContext: ctx, viewport: vp1 }).promise;
        if (page2 && vp2) {
          const renderCtx2 = { canvasContext: ctx, viewport: vp2, transform: [1, 0, 0, 1, 0, vp1.height] };
          await page2.render(renderCtx2).promise;
        }
        images.push(canvas.toDataURL('image/jpeg', 0.7));
      }

      // ── STEP 2: Connect to Gemma 4 31B on NVIDIA ──
      setProgress('Connecting to Gemma 4 31B AI Engine...');
      const client = new OpenAI({ apiKey: apiKey, baseURL: NVIDIA_BASE_URL, dangerouslyAllowBrowser: true, maxRetries: 2, timeout: 300000 });

      setProgress('Analyzing document structure and extracting all 75 questions... (This may take 1-2 minutes)');

      // ── STEP 3: Ultra-precise extraction prompt ──
      const prompt = 'You are an expert JEE exam parser. You will receive images of a JEE Main exam paper. Your job is to extract ALL 75 questions into a JSON array with ZERO mistakes.\n\nSTRUCTURE OF A JEE MAIN PAPER:\n- Physics: Questions 1-20 (MCQ, Section 1) + Questions 21-25 (Numerical, Section 2)\n- Chemistry: Questions 26-45 (MCQ, Section 1) + Questions 46-50 (Numerical, Section 2)\n- Mathematics: Questions 51-70 (MCQ, Section 1) + Questions 71-75 (Numerical, Section 2)\n\nABSOLUTE RULES:\n\n1. EXTRACT EXACTLY 75 QUESTIONS. Use GLOBAL numbering 1 to 75. NEVER reset numbering.\n\n2. SECTION NAMES must follow this format exactly:\n   - "Physics Section 1", "Physics Section 2"\n   - "Chemistry Section 1", "Chemistry Section 2"\n   - "Mathematics Section 1", "Mathematics Section 2"\n\n3. QUESTION TYPES:\n   - Questions 1-20, 26-45, 51-70: type "single_correct" (MCQ with 4 options A/B/C/D)\n   - Questions 21-25, 46-50, 71-75: type "numerical" (integer answer, NO options)\n\n4. LaTeX FORMATTING:\n   - ALL math must use LaTeX delimiters: \\\\( ... \\\\) for inline, \\\\[ ... \\\\] for display\n   - In JSON strings, double-escape every backslash: write \\\\\\\\( not \\\\(, write \\\\\\\\frac not \\\\frac\n   - Example: "text": "If \\\\\\\\( x^2 + y^2 = 1 \\\\\\\\), find \\\\\\\\( \\\\\\\\frac{dy}{dx} \\\\\\\\)"\n\n5. CORRECT ANSWER:\n   - For MCQ: set "correctOption" to "A", "B", "C", or "D" based on the answer key in the paper\n   - For numerical: set "correctOption" to the numerical answer as a string (e.g. "42")\n\n6. DIAGRAMS/IMAGES: If a question or option has a diagram/graph/circuit/figure, set "needsScreenshot": true\n\n7. DO NOT include page headers, footers, watermarks, or instructions.\n\nOUTPUT FORMAT - Return ONLY this JSON array, nothing else:\n[\n  {\n    "sectionName": "Physics Section 1",\n    "questionNumber": 1,\n    "text": "Question text with \\\\\\\\( LaTeX \\\\\\\\) math...",\n    "needsScreenshot": false,\n    "options": [\n      { "id": "A", "text": "Option text...", "needsScreenshot": false },\n      { "id": "B", "text": "Option text...", "needsScreenshot": false },\n      { "id": "C", "text": "Option text...", "needsScreenshot": false },\n      { "id": "D", "text": "Option text...", "needsScreenshot": false }\n    ],\n    "correctOption": "A",\n    "type": "single_correct"\n  },\n  {\n    "sectionName": "Physics Section 2",\n    "questionNumber": 21,\n    "text": "Numerical question text...",\n    "needsScreenshot": false,\n    "options": [],\n    "correctOption": "42",\n    "type": "numerical"\n  }\n]\n\nRESPOND WITH ONLY THE JSON ARRAY. NO markdown fences. NO explanations. JUST raw JSON starting with [ and ending with ].';

      // ── STEP 4: Build the multimodal message ──
      const contentArray = images.map(img => ({
        type: "image_url",
        image_url: { url: img }
      }));
      contentArray.push({ type: "text", text: prompt });

      const response = await client.chat.completions.create({
        model: 'google/gemma-4-31b-it',
        messages: [
          { role: 'user', content: contentArray }
        ],
        temperature: 0.1,
        max_tokens: 16384
      });

      // ── STEP 5: Parse and clean response ──
      setProgress('Formatting results...');
      let resultText = response.choices[0].message.content;
      // Strip any thinking blocks or markdown fencing
      resultText = resultText.replace(/<think>[\s\S]*?<\/think>\n*/g, '');
      resultText = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      // Find the JSON array in the response
      const jsonStart = resultText.indexOf('[');
      const jsonEnd = resultText.lastIndexOf(']');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        resultText = resultText.substring(jsonStart, jsonEnd + 1);
      }
      const parsedQuestions = JSON.parse(resultText);
      
      // Rebuild the sections array in JavaScript from the flat questions
      // AND enforce hardcoded Numerical ranges (21-25, 46-50, 71-75)
      const sectionsMap = {};
      parsedQuestions.forEach((q, index) => {
        // Enforce 1-75 numbering based on array index to fix AI numbering errors
        const globalNum = index + 1;
        q.questionNumber = globalNum;
        
        // Enforce numerical questions for the exact ranges requested
        if ((globalNum >= 21 && globalNum <= 25) || 
            (globalNum >= 46 && globalNum <= 50) || 
            (globalNum >= 71 && globalNum <= 75)) {
          q.type = "numerical";
          q.options = [];
        } else {
          q.type = "single_correct";
        }

        const secName = q.sectionName || "General Section";
        if (!sectionsMap[secName]) {
          sectionsMap[secName] = { sectionName: secName, questions: [] };
        }
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
      setProgress('Complete!');
    } catch (err) {
      console.error(err);
      let errMsg = err.message || 'Failed to generate test. Please try again.';
      let is403 = false;
      
      if (errMsg.includes('{"error"')) {
        try {
          const parsedErr = JSON.parse(errMsg);
          if (parsedErr.error && parsedErr.error.message) {
            if (parsedErr.error.code === 403 || parsedErr.error.code === 429) {
              is403 = true;
            }
          }
        } catch(e) {}
      }
      
      if (is403 || errMsg.includes('403') || errMsg.includes('429') || errMsg.includes('Quota')) {
        setError("API Key blocked or Quota Exceeded. Loading Demo Mode...");
        setTimeout(() => {
          setGeneratedTest({
            testName: "JEE Main 2026 Mathematics (Demo Mode)",
            sections: [
              {
                sectionName: "Mathematics Section 1",
                questions: [
                  {
                    questionNumber: 1,
                    text: "Let \\( f(x) = \\int_0^x e^{t^2} dt \\). Then \\( f'(x) \\) is equal to:",
                    needsScreenshot: false,
                    options: [
                      { id: "A", text: "\\( e^{x^2} \\)", needsScreenshot: false },
                      { id: "B", text: "\\( 2x e^{x^2} \\)", needsScreenshot: false },
                      { id: "C", text: "\\( e^{2x} \\)", needsScreenshot: false },
                      { id: "D", text: "\\( x e^{x^2} \\)", needsScreenshot: false }
                    ],
                    correctOption: "A",
                    type: "single_correct"
                  },
                  {
                    questionNumber: 2,
                    text: "Observe the following circuit diagram and determine the equivalent resistance.",
                    needsScreenshot: true,
                    options: [
                      { id: "A", text: "Graph A", needsScreenshot: true },
                      { id: "B", text: "\\( 1 \\Omega \\)", needsScreenshot: false },
                      { id: "C", text: "\\( 4 \\Omega \\)", needsScreenshot: false },
                      { id: "D", text: "\\( 9 \\Omega \\)", needsScreenshot: false }
                    ],
                    correctOption: "A",
                    type: "single_correct"
                  }
                ]
              }
            ]
          });
          setError('');
          setProgress('');
        }, 1500);
      } else {
        setError(errMsg);
      }
    } finally {
      setTimeout(() => setLoading(false), 1500);
    }
  };

  const handlePasteImage = (e, sIdx, qIdx, optIdx = null) => {
    e.preventDefault();
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Image = event.target.result;
          setGeneratedTest(prev => {
            const newTest = JSON.parse(JSON.stringify(prev));
            if (optIdx !== null) {
              newTest.sections[sIdx].questions[qIdx].options[optIdx].imageUrl = base64Image;
              newTest.sections[sIdx].questions[qIdx].options[optIdx].needsScreenshot = false;
            } else {
              newTest.sections[sIdx].questions[qIdx].imageUrl = base64Image;
              newTest.sections[sIdx].questions[qIdx].needsScreenshot = false;
            }
            return newTest;
          });
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  const renderTextWithMath = (text) => {
    if (!text) return null;
    const parts = text.split(/(\\\(.*?\\\)|\\\[.*?\\\])/g);
    return parts.map((part, index) => {
      if (part.startsWith('\\(') && part.endsWith('\\)')) {
        return <InlineMath key={index} math={part.slice(2, -2)} />;
      } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
        return <BlockMath key={index} math={part.slice(2, -2)} />;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <RefreshCw size={28} color="#c084fc" />
          AI Test Generator & Editor
        </h1>
        <p style={{ color: 'var(--dash-text-muted)' }}>
          Upload a PDF. The AI will extract the text. If any diagrams are missing, you will be prompted to paste them here before publishing.
        </p>
      </div>

      {!apiKey && (
        <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', padding: '15px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Key size={24} color="#f59e0b" />
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 5px 0', color: '#f59e0b' }}>API Key Required</h4>
            <input 
              type="password" 
              placeholder="Enter NVIDIA API Key" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ width: '100%', maxWidth: '400px', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'white' }}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: generatedTest ? '350px 1fr' : '1fr 1fr', gap: '30px', transition: 'all 0.3s' }}>
        <div style={{ backgroundColor: 'var(--dash-surface)', padding: '30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', height: '800px', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Upload size={20} /> Upload PDF
          </h2>
          
          <div 
            onClick={() => fileInputRef.current.click()}
            style={{ 
              border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '16px', padding: '40px 20px', 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backgroundColor: file ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
              transition: 'all 0.3s', flex: 1, minHeight: '200px'
            }}
          >
            <input 
              type="file" 
              accept="application/pdf" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
            />
            {file ? (
              <>
                <FileText size={48} color="#60a5fa" style={{ marginBottom: '15px' }} />
                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', textAlign: 'center' }}>{file.name}</h3>
                <p style={{ color: 'var(--dash-text-muted)', margin: 0 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  style={{ marginTop: '15px', padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <Upload size={48} color="var(--dash-text-muted)" style={{ marginBottom: '15px' }} />
                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>Click to select a file</h3>
              </>
            )}
          </div>

          {error && (
            <div style={{ marginTop: '20px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          <button 
            onClick={handleGenerate}
            disabled={!file || loading}
            style={{ 
              marginTop: '20px', padding: '16px', borderRadius: '12px', 
              backgroundColor: !file || loading ? 'rgba(255,255,255,0.1)' : '#c084fc', 
              color: !file || loading ? 'var(--dash-text-muted)' : 'white',
              border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: !file || loading ? 'not-allowed' : 'pointer',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
              transition: 'all 0.3s'
            }}
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : <RefreshCw size={24} />}
            {loading ? 'Processing with AI...' : 'Generate Test'}
          </button>
          
          {loading && (
            <div style={{ marginTop: '15px', textAlign: 'center', color: '#c084fc', fontSize: '0.9rem' }}>
              <p>{progress}</p>
              <p style={{ marginTop: '5px', opacity: 0.8, fontWeight: 'bold' }}>
                Estimated Time Remaining: {Math.max(0, 120 - timer)}s
              </p>
            </div>
          )}

          {/* Percentile Image Upload Section */}
          <h2 style={{ fontSize: '1.2rem', marginTop: '40px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ImageIcon size={20} /> Upload Marks vs Percentile (Optional)
          </h2>
          
          <div 
            onClick={() => pImageInputRef.current.click()}
            style={{ 
              border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '16px', padding: '30px 20px', 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backgroundColor: percentileFile ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
              transition: 'all 0.3s'
            }}
          >
            <input 
              type="file" 
              accept="image/*" 
              ref={pImageInputRef} 
              onChange={handlePercentileChange} 
              style={{ display: 'none' }} 
            />
            {percentileFile ? (
              <>
                <ImageIcon size={36} color="#10b981" style={{ marginBottom: '10px' }} />
                <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem', textAlign: 'center' }}>{percentileFile.name}</h3>
                <button 
                  onClick={(e) => { e.stopPropagation(); setPercentileFile(null); setPercentileData(null); }}
                  style={{ marginTop: '10px', padding: '4px 10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Remove Image
                </button>
              </>
            ) : (
              <>
                <ImageIcon size={36} color="var(--dash-text-muted)" style={{ marginBottom: '10px' }} />
                <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>Click to upload image</h3>
              </>
            )}
          </div>

          {percentileFile && !percentileData && (
            <button 
              onClick={processPercentileImage}
              disabled={isProcessingPercentile}
              style={{ 
                marginTop: '15px', padding: '12px', borderRadius: '8px', 
                backgroundColor: isProcessingPercentile ? 'rgba(255,255,255,0.1)' : '#10b981', 
                color: isProcessingPercentile ? 'var(--dash-text-muted)' : 'white',
                border: 'none', fontWeight: 'bold', cursor: isProcessingPercentile ? 'not-allowed' : 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
              }}
            >
              {isProcessingPercentile ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              {isProcessingPercentile ? 'Extracting Data...' : 'Extract Percentiles'}
            </button>
          )}

          {percentileData && !percentileConfirmedTwice && (
            <div style={{ marginTop: '20px', padding: '20px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
               <h4 style={{ marginBottom: '15px', color: '#60a5fa' }}>Select Corresponding Test</h4>
               <select 
                  onChange={(e) => {
                    setSelectedPercentileTest(percentileData.tests.find(t => t.name === e.target.value));
                    setPercentileConfirmedOnce(false);
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
               >
                 <option value="">Select a column from the image...</option>
                 {percentileData.tests.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
               </select>
               
               {selectedPercentileTest && (
                 <div style={{ marginTop: '20px' }}>
                   <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '15px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px' }}>
                     <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <th style={{ padding: '8px' }}>Percentile</th>
                            <th style={{ padding: '8px' }}>Marks Required</th>
                          </tr>
                        </thead>
                        <tbody>
                          {percentileData.percentiles.map((p, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '8px', color: '#fcd34d' }}>{p}</td>
                              <td style={{ padding: '8px', color: '#34d399' }}>{selectedPercentileTest.marks[i]}</td>
                            </tr>
                          ))}
                        </tbody>
                     </table>
                   </div>
                   
                   {!percentileConfirmedOnce ? (
                      <button 
                        onClick={() => setPercentileConfirmedOnce(true)}
                        style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Confirm Selection (1/2)
                      </button>
                   ) : (
                      <button 
                        onClick={() => {
                          setPercentileConfirmedTwice(true);
                          if (generatedTest) {
                            setGeneratedTest(prev => ({
                              ...prev, 
                              percentileMapping: {
                                mappingName: selectedPercentileTest.name,
                                percentiles: percentileData.percentiles,
                                marks: selectedPercentileTest.marks
                              }
                            }));
                          }
                        }}
                        style={{ width: '100%', padding: '12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Are you absolutely sure? (2/2)
                      </button>
                   )}
                 </div>
               )}
            </div>
          )}

          {percentileConfirmedTwice && selectedPercentileTest && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34d399', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
               <CheckCircle size={20} />
               Percentile Data ({selectedPercentileTest.name}) attached successfully!
            </div>
          )}

        </div>

        <div style={{ backgroundColor: 'var(--dash-surface)', padding: '30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', height: '800px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={20} color="#34d399" /> AI Output Preview & Editor
          </h2>
          
          <div style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '30px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.02)' }}>
            {!generatedTest ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--dash-text-muted)' }}>
                <FileText size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
                <p>Upload and generate to review the test.</p>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                  {generatedTest.testName}
                </h3>
                
                {generatedTest.sections?.map((section, sIdx) => (
                  <div key={sIdx} style={{ marginBottom: '50px' }}>
                    <h4 style={{ fontSize: '1.3rem', marginBottom: '20px', color: '#fcd34d', borderBottom: '1px solid rgba(252, 211, 77, 0.3)', paddingBottom: '8px' }}>
                      {section.sectionName}
                    </h4>
                    
                    {section.questions?.map((q, qIdx) => (
                      <div key={qIdx} style={{ marginBottom: '40px', padding: '20px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                          <div style={{ fontWeight: 'bold', color: '#60a5fa', fontSize: '1.1rem' }}>Q{q.questionNumber || qIdx + 1}.</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                              {renderTextWithMath(q.text)}
                            </div>
                            
                            {/* Question Image Pasting Area */}
                            {q.needsScreenshot && (
                              <div 
                                tabIndex="0"
                                onPaste={(e) => handlePasteImage(e, sIdx, qIdx)}
                                style={{ marginTop: '15px', padding: '30px', backgroundColor: 'rgba(244, 63, 94, 0.05)', color: '#f43f5e', borderRadius: '8px', border: '2px dashed #f43f5e', textAlign: 'center', cursor: 'pointer', outline: 'none', transition: 'all 0.2s' }}
                              >
                                <AlertCircle size={32} style={{ marginBottom: '10px', margin: '0 auto' }} />
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Image Graphic Missing</div>
                                <div style={{ fontSize: '0.9rem', marginTop: '5px', opacity: 0.8 }}>Click this box and press <strong>Ctrl + V</strong> to paste the screenshot</div>
                              </div>
                            )}
                            
                            {/* Render uploaded Question Image */}
                            {q.imageUrl && (
                              <div style={{ marginTop: '15px' }}>
                                <img src={q.imageUrl} alt="Question Diagram" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }} />
                                <button 
                                  onClick={() => {
                                    setGeneratedTest(prev => {
                                      const newTest = {...prev};
                                      newTest.sections[sIdx].questions[qIdx].imageUrl = null;
                                      newTest.sections[sIdx].questions[qIdx].needsScreenshot = true;
                                      return newTest;
                                    });
                                  }}
                                  style={{ display: 'block', marginTop: '8px', background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                  Remove Image
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginLeft: '40px' }}>
                          {q.options?.map((opt, optIdx) => (
                            <div key={optIdx} style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', padding: '15px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: q.correctOption === opt.id ? '2px solid rgba(52, 211, 153, 0.6)' : '1px solid rgba(255,255,255,0.05)' }}>
                              <span style={{ fontWeight: 'bold', color: 'var(--dash-text-muted)' }}>({opt.id})</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1.05rem' }}>{renderTextWithMath(opt.text)}</div>
                                
                                {/* Option Image Pasting Area */}
                                {opt.needsScreenshot && (
                                  <div 
                                    tabIndex="0"
                                    onPaste={(e) => handlePasteImage(e, sIdx, qIdx, optIdx)}
                                    style={{ marginTop: '10px', padding: '15px', backgroundColor: 'rgba(244, 63, 94, 0.05)', color: '#f43f5e', borderRadius: '6px', border: '1px dashed #f43f5e', textAlign: 'center', cursor: 'pointer', outline: 'none' }}
                                  >
                                    <ImageIcon size={20} style={{ marginBottom: '5px', margin: '0 auto' }} />
                                    <div style={{ fontSize: '0.85rem' }}>Paste Option Image Here (Ctrl+V)</div>
                                  </div>
                                )}

                                {/* Render uploaded Option Image */}
                                {opt.imageUrl && (
                                  <div style={{ marginTop: '10px' }}>
                                    <img src={opt.imageUrl} alt="Option Diagram" style={{ maxWidth: '200px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)' }} />
                                    <button 
                                      onClick={() => {
                                        setGeneratedTest(prev => {
                                          const newTest = {...prev};
                                          newTest.sections[sIdx].questions[qIdx].options[optIdx].imageUrl = null;
                                          newTest.sections[sIdx].questions[qIdx].options[optIdx].needsScreenshot = true;
                                          return newTest;
                                        });
                                      }}
                                      style={{ display: 'block', marginTop: '5px', background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                )}
                              </div>
                              {q.correctOption === opt.id && <span style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 'bold', backgroundColor: 'rgba(52, 211, 153, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>Correct Answer</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {generatedTest && (
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {!reviewDone ? (
                <button 
                  onClick={() => setReviewDone(true)}
                  style={{ width: '100%', padding: '16px', borderRadius: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}
                >
                  Done Reviewing & Adding Images
                </button>
              ) : (
                <button 
                  onClick={() => {
                    const savedTests = JSON.parse(localStorage.getItem('jee_ai_tests') || '[]');
                    const testWithId = { ...generatedTest, id: Date.now(), createdAt: new Date().toISOString() };
                    savedTests.push(testWithId);
                    localStorage.setItem('jee_ai_tests', JSON.stringify(savedTests));
                    alert('Test finalized and successfully published to the Student Dashboard!');
                  }}
                  style={{ width: '100%', padding: '16px', borderRadius: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}
                >
                  <CheckCircle size={24} /> Yes, Finalize & Publish for All Students
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default AITestGenerator;
