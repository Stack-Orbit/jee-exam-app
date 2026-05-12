import { useState, useEffect } from 'react';
import { Eye, EyeOff, Trash2, Copy, ChevronDown, ChevronUp, Edit3, CheckCircle, Search, X, ToggleLeft, ToggleRight, FileText, Settings, Plus, Hash } from 'lucide-react';

const S = {
  surface: '#1e1e2e',
  surfaceAlt: '#262637',
  card: '#2a2a3d',
  cardHover: '#313148',
  border: 'rgba(255,255,255,0.08)',
  borderActive: 'rgba(99,102,241,0.5)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  accent: '#818cf8',
  accentBg: 'rgba(99,102,241,0.12)',
  green: '#34d399',
  greenBg: 'rgba(52,211,153,0.12)',
  amber: '#fbbf24',
  amberBg: 'rgba(251,191,36,0.12)',
  red: '#f87171',
  redBg: 'rgba(248,113,113,0.12)',
  blue: '#60a5fa',
  blueBg: 'rgba(96,165,250,0.12)',
  input: '#1a1a2e',
  inputBorder: 'rgba(255,255,255,0.12)',
};

function EditTests() {
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [expandedSections, setExpandedSections] = useState({});
  const [editingPercentile, setEditingPercentile] = useState(false);

  useEffect(() => { loadTests(); }, []);

  const loadTests = () => {
    setTests(JSON.parse(localStorage.getItem('jee_ai_tests') || '[]'));
  };

  const saveTests = (updatedTests) => {
    localStorage.setItem('jee_ai_tests', JSON.stringify(updatedTests));
    setTests(updatedTests);
    setSaveMessage('Saved!');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const selectedTest = tests.find(t => t.id === selectedTestId);

  const toggleVisibility = (testId) => {
    saveTests(tests.map(t => t.id === testId ? { ...t, isPublic: !t.isPublic } : t));
  };

  const deleteTest = (testId) => {
    const ok = window.confirm('Are you sure you want to permanently delete this test?');
    if (!ok) return;
    
    setTests(prev => {
      const updated = prev.filter(t => t.id !== testId);
      localStorage.setItem('jee_ai_tests', JSON.stringify(updated));
      return updated;
    });

    if (selectedTestId === testId) setSelectedTestId(null);
    setSaveMessage('Test deleted successfully!');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const duplicateTest = (testId) => {
    const orig = tests.find(t => t.id === testId);
    if (!orig) return;
    const clone = JSON.parse(JSON.stringify(orig));
    clone.id = Date.now();
    clone.testName = (clone.testName || 'Test') + ' (Copy)';
    clone.isPublic = false;
    clone.createdAt = new Date().toISOString();
    saveTests([...tests, clone]);
  };

  const updateTestField = (field, value) => {
    saveTests(tests.map(t => t.id === selectedTestId ? { ...t, [field]: value } : t));
  };

  const updateQuestion = (sIdx, qIdx, field, value) => {
    saveTests(tests.map(t => {
      if (t.id !== selectedTestId) return t;
      const n = JSON.parse(JSON.stringify(t));
      n.sections[sIdx].questions[qIdx][field] = value;
      return n;
    }));
  };

  const updateOption = (sIdx, qIdx, optIdx, field, value) => {
    saveTests(tests.map(t => {
      if (t.id !== selectedTestId) return t;
      const n = JSON.parse(JSON.stringify(t));
      n.sections[sIdx].questions[qIdx].options[optIdx][field] = value;
      return n;
    }));
  };

  const updatePercentileMapping = (field, index, value) => {
    saveTests(tests.map(t => {
      if (t.id !== selectedTestId) return t;
      const n = JSON.parse(JSON.stringify(t));
      if (!n.percentileMapping) n.percentileMapping = { mappingName: '', percentiles: [], marks: [] };
      if (field === 'mappingName') n.percentileMapping.mappingName = value;
      else if (field === 'percentile') n.percentileMapping.percentiles[index] = value;
      else if (field === 'mark') n.percentileMapping.marks[index] = value;
      return n;
    }));
  };

  const addPercentileRow = () => {
    saveTests(tests.map(t => {
      if (t.id !== selectedTestId) return t;
      const n = JSON.parse(JSON.stringify(t));
      if (!n.percentileMapping) n.percentileMapping = { mappingName: '', percentiles: [], marks: [] };
      n.percentileMapping.percentiles.push('');
      n.percentileMapping.marks.push('');
      return n;
    }));
  };

  const removePercentileRow = (index) => {
    saveTests(tests.map(t => {
      if (t.id !== selectedTestId) return t;
      const n = JSON.parse(JSON.stringify(t));
      n.percentileMapping.percentiles.splice(index, 1);
      n.percentileMapping.marks.splice(index, 1);
      return n;
    }));
  };

  const filteredTests = tests.filter(t =>
    (t.testName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inp = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${S.inputBorder}`, backgroundColor: S.input, color: S.text, fontSize: '0.88rem', outline: 'none', transition: 'border-color 0.2s' };
  const sInp = { ...inp, width: '90px', textAlign: 'center', padding: '7px 6px', fontSize: '0.85rem' };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px', color: S.text }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #818cf8, #c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Settings size={22} color="white" />
          </div>
          Edit Tests
        </h1>
        <p style={{ color: S.textMuted, fontSize: '0.92rem', marginLeft: '52px' }}>
          Manage, edit questions, toggle visibility, and update percentile data.
        </p>
      </div>

      {/* Save Toast */}
      {saveMessage && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', padding: '10px 20px', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', borderRadius: '10px', fontWeight: 700, fontSize: '0.88rem', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }}>
          <CheckCircle size={16} /> {saveMessage}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedTest ? '330px 1fr' : '1fr', gap: '20px' }}>
        {/* ─── Left: Test List ─── */}
        <div style={{ backgroundColor: S.surface, padding: '20px', borderRadius: '16px', border: `1px solid ${S.border}`, maxHeight: '85vh', overflowY: 'auto' }}>
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: S.textDim }} />
            <input type="text" placeholder="Search tests..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ ...inp, paddingLeft: '34px' }} />
          </div>

          <div style={{ fontSize: '0.78rem', color: S.textDim, marginBottom: '12px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {filteredTests.length} test{filteredTests.length !== 1 ? 's' : ''}
          </div>

          {filteredTests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: S.textDim }}>
              <FileText size={44} style={{ opacity: 0.15, margin: '0 auto 12px', display: 'block' }} />
              <p style={{ margin: 0 }}>No tests found.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredTests.map(test => {
                const isSelected = selectedTestId === test.id;
                return (
                  <div key={test.id} onClick={() => { setSelectedTestId(test.id); setExpandedSections({}); setEditingPercentile(false); }}
                    style={{ padding: '14px 16px', borderRadius: '12px', cursor: 'pointer', backgroundColor: isSelected ? S.accentBg : S.surfaceAlt, border: `1px solid ${isSelected ? S.borderActive : S.border}`, transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <span style={{ fontSize: '0.93rem', fontWeight: 700, color: S.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{test.testName || 'Untitled'}</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '3px 8px', borderRadius: '20px', letterSpacing: '0.5px', backgroundColor: test.isPublic ? S.greenBg : S.amberBg, color: test.isPublic ? S.green : S.amber }}>
                        {test.isPublic ? 'PUBLIC' : 'PRIVATE'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.73rem', color: S.textDim, marginBottom: '8px' }}>
                      {test.createdAt ? new Date(test.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      {' · '}{test.sections ? test.sections.reduce((a, s) => a + (s.questions?.length || 0), 0) : 0} Qs
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={e => { e.stopPropagation(); toggleVisibility(test.id); }}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: test.isPublic ? S.greenBg : S.amberBg, color: test.isPublic ? S.green : S.amber }}>
                        {test.isPublic ? <Eye size={11} /> : <EyeOff size={11} />}
                        {test.isPublic ? 'Public' : 'Private'}
                      </button>
                      <button onClick={e => { e.stopPropagation(); duplicateTest(test.id); }}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: S.blueBg, color: S.blue }}>
                        <Copy size={11} /> Clone
                      </button>
                      <button onClick={e => { e.stopPropagation(); deleteTest(test.id); }}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: S.redBg, color: S.red }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Right: Editor Panel ─── */}
        {selectedTest && (
          <div style={{ backgroundColor: S.surface, padding: '28px', borderRadius: '16px', border: `1px solid ${S.border}`, maxHeight: '85vh', overflowY: 'auto' }}>

            {/* Test Details Card */}
            <div style={{ marginBottom: '24px', padding: '22px', backgroundColor: S.card, borderRadius: '14px', border: `1px solid ${S.border}` }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: S.text, fontWeight: 700 }}>
                <Edit3 size={17} color={S.blue} /> Test Details
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: S.textMuted, marginBottom: '5px', fontWeight: 700, letterSpacing: '0.3px' }}>TEST NAME</label>
                  <input type="text" value={selectedTest.testName || ''} onChange={e => updateTestField('testName', e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: S.textMuted, marginBottom: '5px', fontWeight: 700, letterSpacing: '0.3px' }}>VISIBILITY</label>
                  <button onClick={() => toggleVisibility(selectedTest.id)}
                    style={{ width: '100%', padding: '9px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: selectedTest.isPublic ? S.greenBg : S.amberBg, color: selectedTest.isPublic ? S.green : S.amber, transition: 'all 0.2s' }}>
                    {selectedTest.isPublic ? <><ToggleRight size={17} /> Public — Visible</> : <><ToggleLeft size={17} /> Private — Hidden</>}
                  </button>
                </div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '0.72rem', color: S.textDim }}>
                Created: {selectedTest.createdAt ? new Date(selectedTest.createdAt).toLocaleString() : '—'} · ID: {selectedTest.id}
              </div>
            </div>

            {/* Percentile Mapping Card */}
            <div style={{ marginBottom: '24px', padding: '22px', backgroundColor: S.card, borderRadius: '14px', border: `1px solid ${S.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingPercentile ? '16px' : '0' }}>
                <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: S.text, fontWeight: 700 }}>
                  <Hash size={17} color={S.accent} /> Percentile Mapping
                </h3>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {!editingPercentile && selectedTest.percentileMapping?.percentiles?.length > 0 && (
                    <span style={{ fontSize: '0.78rem', color: S.green, fontWeight: 600 }}>
                      ✓ {selectedTest.percentileMapping.percentiles.length} pts
                    </span>
                  )}
                  <button onClick={() => setEditingPercentile(!editingPercentile)}
                    style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, backgroundColor: S.accentBg, color: S.accent }}>
                    {editingPercentile ? 'Done' : 'Edit'}
                  </button>
                </div>
              </div>

              {!editingPercentile && (!selectedTest.percentileMapping?.percentiles?.length) && (
                <p style={{ fontSize: '0.82rem', color: S.textDim, margin: '10px 0 0' }}>No mapping configured yet.</p>
              )}

              {editingPercentile && (
                <div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '0.75rem', color: S.textMuted, fontWeight: 700 }}>SHIFT NAME</label>
                    <input type="text" value={selectedTest.percentileMapping?.mappingName || ''} onChange={e => updatePercentileMapping('mappingName', 0, e.target.value)} placeholder="e.g. 28 Jan Morning" style={{ ...inp, marginTop: '4px' }} />
                  </div>

                  {/* Table Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 36px', gap: '8px', marginBottom: '6px', padding: '0 2px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: S.amber, letterSpacing: '0.5px' }}>PERCENTILE</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: S.green, letterSpacing: '0.5px' }}>MARKS</span>
                    <span />
                  </div>

                  {/* Rows */}
                  {(selectedTest.percentileMapping?.percentiles || []).map((p, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 36px', gap: '8px', marginBottom: '5px' }}>
                      <input type="text" value={p} onChange={e => updatePercentileMapping('percentile', i, e.target.value)} placeholder="99" style={sInp} />
                      <input type="text" value={selectedTest.percentileMapping?.marks?.[i] ?? ''} onChange={e => updatePercentileMapping('mark', i, e.target.value)} placeholder="265" style={sInp} />
                      <button onClick={() => removePercentileRow(i)}
                        style={{ padding: '4px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: S.redBg, color: S.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  <button onClick={addPercentileRow}
                    style={{ marginTop: '8px', padding: '7px 14px', borderRadius: '8px', border: `1px dashed ${S.inputBorder}`, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, backgroundColor: 'transparent', color: S.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={14} /> Add Row
                  </button>
                </div>
              )}
            </div>

            {/* Questions */}
            <h3 style={{ fontSize: '1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: S.text, fontWeight: 700 }}>
              <FileText size={17} color="#c084fc" /> Questions ({selectedTest.sections?.reduce((a, s) => a + (s.questions?.length || 0), 0) || 0})
            </h3>

            {selectedTest.sections?.map((section, sIdx) => (
              <div key={sIdx} style={{ marginBottom: '8px', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${S.border}` }}>
                <button onClick={() => setExpandedSections(prev => ({ ...prev, [sIdx]: !prev[sIdx] }))}
                  style={{ width: '100%', padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none', cursor: 'pointer', backgroundColor: expandedSections[sIdx] ? S.accentBg : S.card, color: expandedSections[sIdx] ? S.accent : S.text, fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s' }}>
                  <span>{section.sectionName} <span style={{ fontWeight: 500, opacity: 0.6 }}>({section.questions?.length || 0})</span></span>
                  {expandedSections[sIdx] ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                </button>

                {expandedSections[sIdx] && (
                  <div style={{ padding: '16px', backgroundColor: S.surfaceAlt }}>
                    {section.questions?.map((q, qIdx) => (
                      <div key={qIdx} style={{ marginBottom: '16px', padding: '16px', backgroundColor: S.card, borderRadius: '10px', border: `1px solid ${S.border}` }}>
                        {/* Question header */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <span style={{ fontWeight: 800, color: S.accent, fontSize: '0.85rem', minWidth: '35px', paddingTop: '8px' }}>Q{q.questionNumber}</span>
                          <textarea value={q.text || ''} onChange={e => updateQuestion(sIdx, qIdx, 'text', e.target.value)}
                            style={{ ...inp, minHeight: '55px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', resize: 'vertical', lineHeight: '1.5' }} />
                        </div>

                        {/* Options */}
                        {q.type === 'single_correct' && q.options?.map((opt, optIdx) => (
                          <div key={optIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '45px', marginBottom: '5px' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.82rem', minWidth: '28px', color: q.correctOption === opt.id ? S.green : S.textDim }}>({opt.id})</span>
                            <input type="text" value={opt.text || ''} onChange={e => updateOption(sIdx, qIdx, optIdx, 'text', e.target.value)}
                              style={{ ...inp, fontSize: '0.8rem', fontFamily: "'JetBrains Mono', monospace", borderColor: q.correctOption === opt.id ? 'rgba(52,211,153,0.3)' : S.inputBorder }} />
                          </div>
                        ))}

                        {/* Answer */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: '45px', marginTop: '10px', padding: '8px 12px', backgroundColor: S.surfaceAlt, borderRadius: '8px' }}>
                          <label style={{ fontSize: '0.78rem', color: S.textMuted, fontWeight: 700 }}>ANS:</label>
                          {q.type === 'single_correct' ? (
                            <select value={q.correctOption || ''} onChange={e => updateQuestion(sIdx, qIdx, 'correctOption', e.target.value)}
                              style={{ ...inp, width: '70px', padding: '5px 8px' }}>
                              <option value="">—</option>
                              <option value="A">A</option><option value="B">B</option>
                              <option value="C">C</option><option value="D">D</option>
                            </select>
                          ) : (
                            <input type="text" value={q.correctOption || ''} onChange={e => updateQuestion(sIdx, qIdx, 'correctOption', e.target.value)} placeholder="Numerical" style={{ ...inp, width: '110px', padding: '5px 8px' }} />
                          )}
                          <span style={{ fontSize: '0.72rem', color: S.textDim, marginLeft: 'auto', fontWeight: 600 }}>{q.type === 'numerical' ? '📝 Numerical' : '🔘 MCQ'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!selectedTest && (
          <div style={{ backgroundColor: S.surface, padding: '80px 40px', borderRadius: '16px', border: `1px solid ${S.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(129,140,248,0.1), rgba(192,132,252,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
              <Settings size={32} color={S.textDim} />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '6px', color: S.text, fontWeight: 700 }}>Select a test to edit</h3>
            <p style={{ fontSize: '0.88rem', color: S.textDim }}>Choose from the list on the left.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditTests;
