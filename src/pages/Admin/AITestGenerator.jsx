import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, RefreshCw, Key, Image as ImageIcon } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Unicode → LaTeX mapping for deterministic math symbol conversion
const UNICODE_TO_LATEX = {
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta',
  'ε': '\\epsilon', 'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta',
  'ι': '\\iota', 'κ': '\\kappa', 'λ': '\\lambda', 'μ': '\\mu',
  'ν': '\\nu', 'ξ': '\\xi', 'π': '\\pi', 'ρ': '\\rho',
  'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\phi',
  'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
  'Γ': '\\Gamma', 'Δ': '\\Delta', 'Θ': '\\Theta', 'Λ': '\\Lambda',
  'Ξ': '\\Xi', 'Π': '\\Pi', 'Σ': '\\Sigma', 'Φ': '\\Phi',
  'Ψ': '\\Psi', 'Ω': '\\Omega',
  '±': '\\pm', '∓': '\\mp', '×': '\\times', '÷': '\\div',
  '·': '\\cdot', '∘': '\\circ',
  '≤': '\\leq', '≥': '\\geq', '≠': '\\neq', '≈': '\\approx',
  '≡': '\\equiv', '∝': '\\propto',
  '→': '\\to', '←': '\\leftarrow', '⇒': '\\Rightarrow', '⇔': '\\Leftrightarrow',
  '∈': '\\in', '∉': '\\notin', '⊂': '\\subset', '⊆': '\\subseteq',
  '∪': '\\cup', '∩': '\\cap', '∅': '\\emptyset',
  '∀': '\\forall', '∃': '\\exists',
  '∞': '\\infty', '∂': '\\partial', '∇': '\\nabla',
  '∫': '\\int', '∑': '\\sum', '∏': '\\prod',
  '√': '\\sqrt', '°': '^\\circ',
  'ℝ': '\\mathbb{R}', 'ℂ': '\\mathbb{C}', 'ℕ': '\\mathbb{N}',
  'ℤ': '\\mathbb{Z}', 'ℚ': '\\mathbb{Q}',
  '²': '^2', '³': '^3', '⁴': '^4', '⁰': '^0', '¹': '^1',
  '₀': '_0', '₁': '_1', '₂': '_2', '₃': '_3', '₄': '_4',
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
  return result;
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
        pageText += '\n';
      } else if (lastY !== null) {
        pageText += ' ';
      }
      pageText += item.str;
      lastY = currentY;
    }
    pageText = convertUnicodeToLatex(pageText);
    pages.push('--- PAGE ' + pageNum + ' ---\n' + pageText);
  }
  return pages.join('\n\n');
}

function AITestGenerator() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '');
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
      const prompt = `Extract the Marks vs Percentile table from this image.
Return a strict JSON object with:
{
  "percentiles": [array of numbers, e.g. 99, 98.5, 98],
  "tests": [
     { "name": "Exact Header Name (e.g. '2 April Morning')", "marks": [array of marks corresponding to the percentiles] }
  ]
}
You must extract the EXACT headers written above each column (e.g. "2 April Morning", "4 April Evening") and set them as the "name" for that column's data in the "tests" array. Ensure the order of marks perfectly matches the order of the percentiles. Do not truncate data.`;
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

      const prompt = `You are an expert JEE exam paper parser. Below is the EXTRACTED TEXT from a JEE Main exam PDF.
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
   Examples: "$\\lambda + \\mu$", "$\\frac{x^2}{9} + \\frac{y^2}{4} = 1$", "$f(x) = x^2 + 1$"
5. needsScreenshot: true if question references a figure/diagram not in text.
6. correctOption: "A"/"B"/"C"/"D" for MCQ, number as string for numerical.
7. Ignore page headers, footers, watermarks, instruction text.

EXTRACTED TEXT:
${extractedText}`;

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
              if (opt.text) opt.text = opt.text.replace(/^\s*\(?\s*[1-4a-dA-D]\s*[\).:]\s*/, '').trim();
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
    
    // --- Set of known math-mode-only LaTeX commands for orphan detection ---
    const ORPHAN_MATH_CMDS = new Set([
      'frac','dfrac','tfrac','mathbb','mathbf','mathit','mathcal','mathsf','mathrm',
      'sqrt','sum','prod','int','iint','iiint','oint','lim',
      'infty','partial','nabla','forall','exists',
      'alpha','beta','gamma','delta','epsilon','varepsilon','zeta','eta','theta',
      'vartheta','iota','kappa','lambda','mu','nu','xi','pi','rho','sigma',
      'tau','upsilon','phi','varphi','chi','psi','omega',
      'Gamma','Delta','Theta','Lambda','Xi','Pi','Sigma','Phi','Psi','Omega',
      'in','notin','subset','subseteq','supset','supseteq',
      'cup','cap','setminus','emptyset',
      'to','rightarrow','leftarrow','Rightarrow','Leftarrow','leftrightarrow',
      'mapsto','hookrightarrow',
      'le','ge','leq','geq','neq','approx','equiv','sim','cong','propto',
      'times','div','cdot','pm','mp','circ','oplus','otimes',
      'vec','hat','bar','dot','ddot','tilde','overline','widehat','widetilde',
      'log','ln','sin','cos','tan','sec','csc','cot',
      'arcsin','arccos','arctan',
      'det','max','min','sup','inf','gcd','lcm',
      'binom','tbinom','dbinom','operatorname',
      'left','right','big','Big','bigg','Bigg',
      'ldots','cdots','ddots','vdots',
      'not','neg',
    ]);

    // Helper: find position after balanced brace group starting at pos
    const findClosingBrace = (str, pos) => {
      if (str[pos] !== '{') return pos;
      let depth = 1, j = pos + 1;
      while (j < str.length && depth > 0) {
        if (str[j] === '{') depth++;
        else if (str[j] === '}') depth--;
        j++;
      }
      return j;
    };

    // Helper: extract a complete math atom starting at pos
    const extractMathAtom = (str, pos) => {
      if (str[pos] !== '\\') return null;
      let ce = pos + 1;
      while (ce < str.length && /[a-zA-Z*]/.test(str[ce])) ce++;
      const cmd = str.substring(pos + 1, ce);
      if (!cmd || !ORPHAN_MATH_CMDS.has(cmd)) return null;
      let p = ce;
      while (p < str.length && str[p] === ' ') p++;
      while (p < str.length && str[p] === '{') p = findClosingBrace(str, p);
      while (p < str.length && (str[p] === '_' || str[p] === '^')) {
        p++;
        if (p < str.length && str[p] === '{') p = findClosingBrace(str, p);
        else if (p < str.length) p++;
      }
      return { content: str.substring(pos, p), end: p };
    };

    let processedText = text;
    // Remove unsupported formatting wrappers
    processedText = processedText.replace(/\\begin\{center\}/g, '');
    processedText = processedText.replace(/\\end\{center\}/g, '');
    processedText = processedText.replace(/\\renewcommand\{\\arraystretch\}\{[^{}]*\}/g, '');
    
    // Replace tabular with array for KaTeX support
    processedText = processedText.replace(/\\begin\{tabular\}/g, '\\begin{array}');
    processedText = processedText.replace(/\\end\{tabular\}/g, '\\end{array}');
    
    // Replace align* with aligned for KaTeX support inside block math
    processedText = processedText.replace(/\\begin\{align\*\}/g, '\\begin{aligned}');
    processedText = processedText.replace(/\\end\{align\*\}/g, '\\end{aligned}');
    processedText = processedText.replace(/\\begin\{align\}/g, '\\begin{aligned}');
    processedText = processedText.replace(/\\end\{align\}/g, '\\end{aligned}');

    // Strip $ from INSIDE environments that are already math mode
    const envs = ['aligned', 'array', 'bmatrix', 'pmatrix', 'matrix', 'cases', 'vmatrix', 'Vmatrix'];
    const envRegex = new RegExp(`(\\\\begin\\{(?:${envs.join('|')})\\}(?:\\{[^}]*\\})?)([\\s\\S]*?)(\\\\end\\{(?:${envs.join('|')})\\})`, 'g');
    processedText = processedText.replace(envRegex, (match, p1, p2, p3) => {
      return p1 + p2.replace(/\\\$|\$/g, '') + p3;
    });

    // Remove unsupported graphic/spacing commands
    processedText = processedText.replace(/\\rule\{[^}]*\}\{[^}]*\}/g, '_______');
    processedText = processedText.replace(/\\vspace\{[^}]*\}/g, '');
    processedText = processedText.replace(/\\includegraphics(?:\[[^\]]*\])?\{[^}]*\}/g, '');

    const segments = [];
    
    // Regex to match block math, environments, and inline math
    const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\begin\{[a-zA-Z*]+\}(?:\{[^}]*\})?[\s\S]*?\\end\{[a-zA-Z*]+\}|\$[^$]+?\$|\\\([\s\S]*?\\\))/g;
    
    const parts = processedText.split(mathRegex);
    
    for (const part of parts) {
      if (!part) continue;
      
      if (part.startsWith('$$') && part.endsWith('$$')) {
        segments.push({ type: 'display', math: part.slice(2, -2).trim() });
      } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
        segments.push({ type: 'display', math: part.slice(2, -2).trim() });
      } else if (part.startsWith('\\begin{')) {
        segments.push({ type: 'display', math: part.trim() });
      } else if (part.startsWith('$') && part.endsWith('$')) {
        segments.push({ type: 'inline', math: part.slice(1, -1).trim() });
      } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
        segments.push({ type: 'inline', math: part.slice(2, -2).trim() });
      } else {
        segments.push({ type: 'text', content: part });
      }
    }
    
    return segments.map((seg, index) => {
      if (seg.type === 'display' || seg.type === 'inline') {
        let mathStr = seg.math;
        mathStr = mathStr.replace(/\\textbf\s*\{/g, '\\mathbf{');
        mathStr = mathStr.replace(/\\textit\s*\{/g, '\\mathit{');
        
        if (seg.type === 'display') {
          try { return <BlockMath key={index} math={mathStr} />; }
          catch (e) { return <span key={index} style={{fontFamily:'monospace', color:'#f87171'}}>{seg.math}</span>; }
        } else {
          try { return <InlineMath key={index} math={mathStr} />; }
          catch (e) { return <span key={index} style={{fontFamily:'monospace', color:'#f87171'}}>{seg.math}</span>; }
        }
      }
      
      let textStr = seg.content;
      // Strip formatting commands from plain text
      textStr = textStr.replace(/\\textbf\s*\{([^{}]*)\}/g, '$1');
      textStr = textStr.replace(/\\textit\s*\{([^{}]*)\}/g, '$1');
      textStr = textStr.replace(/\\underline\s*\{([^{}]*)\}/g, '$1');
      textStr = textStr.replace(/\\text\s*\{([^{}]*)\}/g, '$1');

      // --- ORPHAN MATH DETECTION ---
      // If this text segment contains any known math-only LaTeX commands (without $ delimiters),
      // split it into sub-parts and render the math atoms via KaTeX
      const hasOrphanMath = /\\[a-zA-Z]+/.test(textStr) && 
        Array.from(textStr.matchAll(/\\([a-zA-Z]+)/g)).some(m => ORPHAN_MATH_CMDS.has(m[1]));
      
      if (hasOrphanMath) {
        const subParts = [];
        let i = 0, currentTxt = '';
        while (i < textStr.length) {
          if (textStr[i] === '\\') {
            const atom = extractMathAtom(textStr, i);
            if (atom) {
              if (currentTxt) { subParts.push({ t: 'text', c: currentTxt }); currentTxt = ''; }
              // Merge adjacent math atoms (e.g., \mathbb{R}\to\mathbb{R} becomes one KaTeX block)
              let merged = atom.content;
              let pos = atom.end;
              while (pos < textStr.length) {
                if (textStr[pos] === '\\') {
                  const next = extractMathAtom(textStr, pos);
                  if (next) { merged += next.content; pos = next.end; continue; }
                }
                break;
              }
              subParts.push({ t: 'math', c: merged });
              i = pos;
              continue;
            }
          }
          currentTxt += textStr[i];
          i++;
        }
        if (currentTxt) subParts.push({ t: 'text', c: currentTxt });

        return (
          <span key={index}>
            {subParts.map((sp, si) => {
              if (sp.t === 'math') {
                let m = sp.c;
                m = m.replace(/\\textbf\s*\{/g, '\\mathbf{');
                m = m.replace(/\\textit\s*\{/g, '\\mathit{');
                try { return <InlineMath key={`${index}-m${si}`} math={m} />; }
                catch (e) { return <span key={`${index}-m${si}`} style={{fontFamily:'monospace', color:'#f87171'}}>{sp.c}</span>; }
              }
              const lines = sp.c.split('\\\\');
              if (lines.length > 1) {
                return <span key={`${index}-t${si}`}>{lines.map((l, li) => <span key={li}>{l}{li < lines.length - 1 && <br />}</span>)}</span>;
              }
              return <span key={`${index}-t${si}`}>{sp.c}</span>;
            })}
          </span>
        );
      }

      // No orphan math — render as plain text with newline support
      const lines = textStr.split('\\\\');
      if (lines.length > 1) {
        return (
          <span key={index}>
            {lines.map((line, lIdx) => (
              <span key={lIdx}>
                {line}
                {lIdx < lines.length - 1 && <br />}
              </span>
            ))}
          </span>
        );
      }
      return <span key={index}>{textStr}</span>;
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

      <div style={{ backgroundColor: apiKey ? 'rgba(34, 197, 94, 0.08)' : 'rgba(245, 158, 11, 0.1)', border: `1px solid ${apiKey ? '#22c55e' : '#f59e0b'}`, padding: '15px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <Key size={24} color={apiKey ? '#22c55e' : '#f59e0b'} />
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 5px 0', color: apiKey ? '#22c55e' : '#f59e0b' }}>{apiKey ? 'API Key Set' : 'API Key Required'}</h4>
          <input 
            type="password" 
            placeholder="Paste your Gemini API Key here" 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{ width: '100%', maxWidth: '400px', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'white' }}
          />
        </div>
      </div>

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
            {loading ? 'Processing with Gemini AI...' : 'Generate Test'}
          </button>
          
          {loading && (
            <div style={{ marginTop: '15px', textAlign: 'center', color: '#c084fc', fontSize: '0.9rem' }}>
              <p>{progress}</p>
              <p style={{ marginTop: '5px', opacity: 0.8, fontWeight: 'bold' }}>
                Estimated Time Remaining: {Math.max(0, 60 - timer)}s
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
