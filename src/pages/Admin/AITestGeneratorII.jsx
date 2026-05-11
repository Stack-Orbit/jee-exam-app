import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Unicode → LaTeX mapping
const UNICODE_TO_LATEX = {
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta',
  'ε': '\\epsilon', 'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta',
  'ι': '\\iota', 'κ': '\\kappa', 'λ': '\\lambda', 'μ': '\\mu',
  'ν': '\\nu', 'ξ': '\\xi', 'π': '\\pi', 'ρ': '\\rho',
  'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\phi',
  'χ': '\\psi', 'ψ': '\\psi', 'ω': '\\omega',
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

// Parse LaTeX/template format with answer keys
function parseLatexTemplate(text) {
  const questions = [];
  const lines = text.split('\n');

  let currentQuestion = null;
  let currentOptions = [];
  let inOptions = false;
  let answerKey = '';
  let imageRefs = [];

  // Question pattern: \item or Q1. or Question 1
  const qPattern = /^\\item\s*(.*)|^(?:Q|Question)\s*(\d+)[.)]\s*(.*)/i;
  // Option pattern: \item or (1) or 1.
  const optPattern = /^\\item\s*|^\s*\((\d+)\)\s*|^\s*(\d+)[.)]\s*/;
  // Answer key pattern
  const ansPattern = /MathonGo Answer Key\s*:\s*\(?(\d+)\)?/i;
  // Image reference pattern
  const imgPattern = /images\/Q(\d+)\.png|images\/(\d+[a-d])\.png/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for image references anywhere
    const imgMatch = line.match(imgPattern);
    if (imgMatch) {
      if (imgMatch[1]) imageRefs.push({ qNum: parseInt(imgMatch[1]), type: 'question' });
      else if (imgMatch[2]) imageRefs.push({ ref: imgMatch[2], type: 'option' });
    }

    // Check for answer key
    const ansMatch = line.match(ansPattern);
    if (ansMatch && currentQuestion) {
      answerKey = ansMatch[1];
      currentQuestion.correctOption = answerKey;
      continue;
    }

    // Check for question start
    const qMatch = line.match(qPattern);
    if (qMatch) {
      // Save previous question
      if (currentQuestion) {
        currentQuestion.options = currentOptions;
        questions.push(currentQuestion);
      }

      // Start new question
      const qText = qMatch[1] || qMatch[3] || '';
      currentQuestion = {
        questionNumber: questions.length + 1,
        text: qText.replace(/\$\$/g, '').replace(/\$/g, '').trim(),
        options: [],
        correctOption: '',
        needsScreenshot: false,
        type: 'single_correct'
      };
      currentOptions = [];
      inOptions = false;
      answerKey = '';
      continue;
    }

    // Check for options
    if (currentQuestion && !inOptions) {
      // Check if this looks like an option
      if (line.match(/^\s*\(?\d+\)|\s*^\s*[a-d][.)]|\s*^\s*\\begin\{enumerate\}/i)) {
        inOptions = true;
      }
    }

    if (inOptions && currentQuestion) {
      // Check for end of options (next question or non-option text)
      if (line.match(/^\\item\s*$|^(?:Q|Question)\s*\d+/) || (!line.match(/^\s*\(?\d+\)|^\s*[a-d][.)]/) && line.length > 10 && !line.match(/\\begin\{/))) {
        inOptions = false;
        if (currentQuestion) {
          currentQuestion.options = currentOptions;
        }
      } else if (line.match(/^\s*\((\d+)\)\s*(.*)/)) {
        const optMatch = line.match(/^\s*\((\d+)\)\s*(.*)/);
        const optId = optMatch[1] === '1' ? 'A' : optMatch[1] === '2' ? 'B' : optMatch[1] === '3' ? 'C' : optMatch[1] === '4' ? 'D' : optMatch[1];
        currentOptions.push({ id: optId, text: optMatch[2].trim(), needsScreenshot: false });
      } else if (line.match(/^\s*([a-d])[.)]\s*(.*)/i)) {
        const optMatch = line.match(/^\s*([a-d])[.)]\s*(.*)/i);
        currentOptions.push({ id: optMatch[1].toUpperCase(), text: optMatch[2].trim(), needsScreenshot: false });
      } else if (currentOptions.length > 0 && line.length > 2) {
        // Append to last option
        currentOptions[currentOptions.length - 1].text += ' ' + line;
      }
    }

    // If no question started yet, try to find question number in text
    if (!currentQuestion && line.length > 5) {
      const numMatch = line.match(/\b(\d{1,2})\b/);
      if (numMatch && parseInt(numMatch[1]) >= 1 && parseInt(numMatch[1]) <= 75) {
        currentQuestion = {
          questionNumber: parseInt(numMatch[1]),
          text: line.replace(/\b\d{1,2}\b/, '').trim(),
          options: [],
          correctOption: '',
          needsScreenshot: false,
          type: 'single_correct'
        };
      }
    }
  }

  // Save last question
  if (currentQuestion) {
    currentQuestion.options = currentOptions;
    questions.push(currentQuestion);
  }

  return { questions, imageRefs };
}

// Improved local parser for JEE Main format (extracted from PDF)
function parseJEEPaper(text) {
  const questions = [];
  const allLines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Section order for JEE Main 2026
  const sectionOrder = [
    { name: 'Mathematics Section 1', start: 1, end: 20, type: 'single_correct' },
    { name: 'Mathematics Section 2', start: 21, end: 25, type: 'numerical' },
    { name: 'Physics Section 1', start: 26, end: 45, type: 'single_correct' },
    { name: 'Physics Section 2', start: 46, end: 50, type: 'numerical' },
    { name: 'Chemistry Section 1', start: 51, end: 70, type: 'single_correct' },
    { name: 'Chemistry Section 2', start: 71, end: 75, type: 'numerical' },
  ];

  // More flexible patterns
  const qPatterns = [
    /^(?:Q|Question)?\.?\s*(\d{1,2})[.)]\s*(.*)/i,
    /^\\item\s*(.*)/,
    /^(\d{1,2})\.\s*(.*)/,
  ];

  const oPatterns = [
    /^\(?([1-4])\)?\s*(.*)/,
    /^([A-Da-d])[.)]\s*(.*)/,
    /^\\text\{([1-4])\}\s*(.*)/,
  ];

  let currentQ = null;
  let currentOpt = null;
  let questionBuffer = [];

  for (const line of allLines) {
    // Try to match question pattern
    let qMatch = null;
    for (const p of qPatterns) {
      qMatch = line.match(p);
      if (qMatch) break;
    }

    if (qMatch) {
      // Save previous question
      if (currentQ) {
        currentQ.text = questionBuffer.join(' ').trim();
        if (currentQ.text.length > 20000) currentQ.text = currentQ.text.substring(0, 20000);
        questions.push(currentQ);
      }

      const qNum = parseInt(qMatch[1]);
      const qText = qMatch[2] || '';

      // Determine section
      const section = sectionOrder.find(s => qNum >= s.start && qNum <= s.end) || sectionOrder[0];

      currentQ = {
        questionNumber: qNum,
        sectionName: section.name,
        text: qText,
        options: [],
        correctOption: '',
        needsScreenshot: false,
        type: section.type,
      };

      currentOpt = null;
      questionBuffer = qText ? [qText] : [];
      continue;
    }

    // Try to match option pattern
    let oMatch = null;
    for (const p of oPatterns) {
      oMatch = line.match(p);
      if (oMatch) break;
    }

    if (oMatch && currentQ && currentQ.type === 'single_correct' && currentQ.options.length < 4) {
      const optId = /[1-4]/.test(oMatch[1])
        ? (oMatch[1] === '1' ? 'A' : oMatch[1] === '2' ? 'B' : oMatch[1] === '3' ? 'C' : 'D')
        : oMatch[1].toUpperCase();

      currentOpt = { id: optId, text: oMatch[2] || '', needsScreenshot: false };
      currentQ.options.push(currentOpt);
      continue;
    }

    // If we have a current question, add line to its text or last option
    if (currentQ) {
      if (currentOpt) {
        currentOpt.text += ' ' + line;
      } else {
        questionBuffer.push(line);
      }
    }
  }

  // Save last question
  if (currentQ) {
    currentQ.text = questionBuffer.join(' ').trim();
    if (currentQ.text.length > 20000) currentQ.text = currentQ.text.substring(0, 20000);
    questions.push(currentQ);
  }

  // Add missing question stubs
  const seen = new Set(questions.map(q => q.questionNumber));
  for (const sec of sectionOrder) {
    for (let n = sec.start; n <= sec.end; n++) {
      if (!seen.has(n)) {
        questions.push({
          questionNumber: n,
          sectionName: sec.name,
          type: sec.type,
          text: '[Q' + n + ' - edit manually]',
          options: sec.type === 'single_correct' ? [
            { id: 'A', text: 'Option A', needsScreenshot: false },
            { id: 'B', text: 'Option B', needsScreenshot: false },
            { id: 'C', text: 'Option C', needsScreenshot: false },
            { id: 'D', text: 'Option D', needsScreenshot: false },
          ] : [],
          correctOption: '',
          needsScreenshot: false,
        });
      }
    }
  }

  // Sort by question number and create sections
  questions.sort((a, b) => a.questionNumber - b.questionNumber);

  const sectionsMap = {};
  questions.forEach((q, idx) => {
    // Renumber globally 1-75
    q.questionNumber = idx + 1;

    // Update type based on new numbering
    if ((q.questionNumber >= 21 && q.questionNumber <= 25) ||
        (q.questionNumber >= 46 && q.questionNumber <= 50) ||
        (q.questionNumber >= 71 && q.questionNumber <= 75)) {
      q.type = 'numerical';
      q.options = [];
    } else {
      q.type = 'single_correct';
    }

    // Ensure option IDs are correct
    if (q.options && q.options.length > 0) {
      const ids = ['A', 'B', 'C', 'D'];
      q.options = q.options.slice(0, 4).map((opt, i) => ({
        ...opt,
        id: ids[i],
        text: opt.text.replace(/^\s*\(?\s*[1-4a-dA-D]\s*[\).:]\s*/, '').trim()
      }));
    }

    const secName = q.sectionName || 'General Section';
    if (!sectionsMap[secName]) sectionsMap[secName] = { sectionName: secName, questions: [] };
    sectionsMap[secName].questions.push(q);
  });

  return { sections: Object.values(sectionsMap) };
}

function AITestGeneratorII() {
  const [file, setFile] = useState(null);
  const [templateFile, setTemplateFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const apiKey = 'AIzaSyAA_0U_t7k61MkTMRvZPnmc7KNRQHLITnY';
  const [generatedTest, setGeneratedTest] = useState(null);
  const [progress, setProgress] = useState('');
  const [timer, setTimer] = useState(0);
  const [reviewDone, setReviewDone] = useState(false);
  const fileInputRef = useRef(null);
  const templateInputRef = useRef(null);

  const [percentileFile, setPercentileFile] = useState(null);
  const [isProcessingPercentile, setIsProcessingPercentile] = useState(false);
  const [percentileData, setPercentileData] = useState(null);
  const [selectedPercentileTest, setSelectedPercentileTest] = useState(null);
  const [percentileConfirmedOnce, setPercentileConfirmedOnce] = useState(false);
  const [percentileConfirmedTwice, setPercentileConfirmedTwice] = useState(false);
  const [confirmedPercentileMapping, setConfirmedPercentileMapping] = useState(null);
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
    if (selected && (selected.type === 'application/pdf' || selected.type === 'text/plain' || selected.name.endsWith('.txt'))) {
      setFile(selected);
      setError('');
    } else {
      setError('Please select a valid PDF or text file.');
      setFile(null);
    }
  };

  const handleTemplateChange = (e) => {
    const selected = e.target.files[0];
    if (selected && (selected.type === 'text/plain' || selected.name.endsWith('.txt'))) {
      setTemplateFile(selected);
      setError('');
    } else {
      setError('Please select a valid template file (.txt).');
      setTemplateFile(null);
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
      setConfirmedPercentileMapping(null);
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
     { "name": "Column Header Name", "marks": [array of marks corresponding to the percentiles] }
  ]
}
Ensure the order of marks perfectly matches the order of the percentiles.`;
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
    if (!file && !templateFile) { setError('Please upload a PDF or template file first.'); return; }

    setLoading(true);
    setError('');
    setGeneratedTest(null);
    setReviewDone(false);

    try {
      let finalJSON;

      // If template file is provided, use it directly
      if (templateFile) {
        setProgress('Reading template file...');
        const templateText = await templateFile.text();

        // Try to parse as LaTeX template first
        const parsed = parseLatexTemplate(templateText);

        if (parsed.questions.length >= 50) {
          // Successfully parsed from template
          setProgress('Processing template data...');

          // Build sections from parsed questions
          const sectionsMap = {};
          parsed.questions.forEach((q, idx) => {
            const qNum = idx + 1;
            let sectionName = 'General Section';
            let qType = 'single_correct';

            if (qNum >= 1 && qNum <= 20) { sectionName = 'Mathematics Section 1'; }
            else if (qNum >= 21 && qNum <= 25) { sectionName = 'Mathematics Section 2'; qType = 'numerical'; }
            else if (qNum >= 26 && qNum <= 45) { sectionName = 'Physics Section 1'; }
            else if (qNum >= 46 && qNum <= 50) { sectionName = 'Physics Section 2'; qType = 'numerical'; }
            else if (qNum >= 51 && qNum <= 70) { sectionName = 'Chemistry Section 1'; }
            else if (qNum >= 71 && qNum <= 75) { sectionName = 'Chemistry Section 2'; qType = 'numerical'; }

            q.sectionName = sectionName;
            q.type = qType;
            if (qType === 'numerical') q.options = [];

            if (!sectionsMap[sectionName]) sectionsMap[sectionName] = { sectionName, questions: [] };
            sectionsMap[sectionName].questions.push(q);
          });

          finalJSON = {
            testName: templateFile.name.replace(/\.(txt|tex)$/i, ''),
            sections: Object.values(sectionsMap)
          };
        } else {
          throw new Error('Could not parse enough questions from template. Please check the format.');
        }
      }
      // Otherwise use PDF extraction
      else {
        setProgress('Extracting text from PDF pages...');
        const extractedText = await extractTextFromPDF(file);
        console.log('Extracted text:', extractedText.length, 'chars. Preview:', extractedText.substring(0, 500));

        setProgress('Structuring questions from extracted text (local parser)...');
        const parsed = parseJEEPaper(extractedText);

        finalJSON = {
          testName: file.name.replace('.pdf', ''),
          ...parsed
        };
      }

      // Add percentile mapping if confirmed
      if (confirmedPercentileMapping) {
        finalJSON.percentileMapping = confirmedPercentileMapping;
      }

      setGeneratedTest(finalJSON);
      setProgress('Complete! Ready for review.');
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
        const pastedFile = items[i].getAsFile();
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
        reader.readAsDataURL(pastedFile);
        break;
      }
    }
  };

  const renderTextWithMath = (text) => {
    if (!text) return null;

    const segments = [];
    let remaining = text;

    const displayParts = remaining.split(/(\$\$[\s\S]*?\$\$)/g);

    for (const dp of displayParts) {
      if (dp.startsWith('$$') && dp.endsWith('$$')) {
        segments.push({ type: 'display', math: dp.slice(2, -2).trim() });
      } else {
        const inlineParts = dp.split(/(\$[^$]+?\$)/g);
        for (const ip of inlineParts) {
          if (ip.startsWith('$') && ip.endsWith('$') && ip.length > 2) {
            segments.push({ type: 'inline', math: ip.slice(1, -1).trim() });
          } else if (ip) {
            segments.push({ type: 'text', content: ip });
          }
        }
      }
    }

    return segments.map((seg, index) => {
      if (seg.type === 'display') {
        try {
          return <BlockMath key={index} math={seg.math} />;
        } catch (e) {
          return <span key={index} style={{color:'#f87171',fontFamily:'monospace'}}>{"$$" + seg.math + "$$"}</span>;
        }
      } else if (seg.type === 'inline') {
        try {
          return <InlineMath key={index} math={seg.math} />;
        } catch (e) {
          return <span key={index} style={{color:'#f87171',fontFamily:'monospace'}}>{"$" + seg.math + "$"}</span>;
        }
      }
      return <span key={index}>{seg.content}</span>;
    });
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <RefreshCw size={28} color="#c084fc" />
          AI Test Generator II (Local Parser)
        </h1>
        <p style={{ color: 'var(--dash-text-muted)' }}>
          Upload a PDF or template file (.txt). The local parser will structure 75 questions. Use the API only for percentile extraction.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: generatedTest ? '350px 1fr' : '1fr 1fr', gap: '30px', transition: 'all 0.3s' }}>
        <div style={{ backgroundColor: 'var(--dash-surface)', padding: '30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', height: '800px', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Upload size={20} /> Upload Files
          </h2>

          {/* Template File Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--dash-text-muted)' }}>
              Template File (.txt) - Recommended
            </label>
            <div
              onClick={() => templateInputRef.current.click()}
              style={{
                border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '12px', padding: '20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', backgroundColor: templateFile ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                transition: 'all 0.3s'
              }}
            >
              <input
                type="file"
                accept=".txt,text/plain"
                ref={templateInputRef}
                onChange={handleTemplateChange}
                style={{ display: 'none' }}
              />
              {templateFile ? (
                <>
                  <FileText size={32} color="#10b981" style={{ marginBottom: '10px' }} />
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '0.95rem', textAlign: 'center' }}>{templateFile.name}</h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); setTemplateFile(null); }}
                    style={{ marginTop: '8px', padding: '4px 10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <FileText size={32} color="var(--dash-text-muted)" style={{ marginBottom: '10px' }} />
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}>Click to select template</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--dash-text-muted)' }}>LaTeX format with answer keys</p>
                </>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--dash-text-muted)', fontSize: '0.85rem' }}>
            — OR —
          </div>

          {/* PDF File Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--dash-text-muted)' }}>
              PDF File (Direct extraction)
            </label>
            <div
              onClick={() => fileInputRef.current.click()}
              style={{
                border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '12px', padding: '20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', backgroundColor: file ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                transition: 'all 0.3s'
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
                  <FileText size={32} color="#60a5fa" style={{ marginBottom: '10px' }} />
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '0.95rem', textAlign: 'center' }}>{file.name}</h3>
                  <p style={{ color: 'var(--dash-text-muted)', margin: 0, fontSize: '0.8rem' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    style={{ marginTop: '8px', padding: '4px 10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <Upload size={32} color="var(--dash-text-muted)" style={{ marginBottom: '10px' }} />
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}>Click to select PDF</h3>
                </>
              )}
            </div>
          </div>

          {error && (
            <div style={{ marginTop: '20px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={(!file && !templateFile) || loading}
            style={{
              marginTop: '20px', padding: '16px', borderRadius: '12px',
              backgroundColor: (!file && !templateFile) || loading ? 'rgba(255,255,255,0.1)' : '#c084fc',
              color: (!file && !templateFile) || loading ? 'var(--dash-text-muted)' : 'white',
              border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: (!file && !templateFile) || loading ? 'not-allowed' : 'pointer',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
              transition: 'all 0.3s'
            }}
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : <RefreshCw size={24} />}
            {loading ? 'Processing...' : 'Generate Test'}
          </button>

          {loading && (
            <div style={{ marginTop: '15px', textAlign: 'center', color: '#c084fc', fontSize: '0.9rem' }}>
              <p>{progress}</p>
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
                          setConfirmedPercentileMapping({
                            mappingName: selectedPercentileTest.name,
                            percentiles: percentileData.percentiles,
                            marks: selectedPercentileTest.marks
                          });
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
                <p>Upload files and generate to review the test.</p>
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

export default AITestGeneratorII;