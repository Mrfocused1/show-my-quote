import React, { useState, useRef, useEffect } from 'react';
import { Phone, PhoneCall, Radio, Check, CheckCircle2, Star, UserPlus } from 'lucide-react';

// ── Onboarding sequences ──────────────────────────────────────────────────────

const P1_SEQUENCE = [
  { at: 1200,  speaker: 'You',    text: "Perfect — just walk me through the questions you'd normally ask a new client when they first call." },
  { at: 5000,  speaker: 'Client', text: "Sure. I always start with the event date — everything else depends on that." },
  { at: 8200,  addField: { key: 'date', label: 'Event Date', type: 'text', placeholder: 'e.g. 14 Sep 2026' } },
  { at: 9800,  speaker: 'Client', text: "Then the venue name and location — access, parking, setup time all depend on it." },
  { at: 13500, addField: { key: 'venue', label: 'Venue Name & Location', type: 'text', placeholder: 'e.g. Cliveden House, Berkshire' } },
  { at: 15000, speaker: 'Client', text: "Guest count is really important for my pricing — it changes the whole package." },
  { at: 18200, addField: { key: 'guests', label: 'Guest Count', type: 'number', placeholder: 'e.g. 80' } },
  { at: 19800, speaker: 'Client', text: "I ask whether they want ceremony only, ceremony and reception, or the full day." },
  { at: 23500, addField: { key: 'coverage', label: 'Coverage Required', type: 'select', options: ['Ceremony Only', 'Ceremony + Reception', 'Full Day'] } },
  { at: 25000, speaker: 'Client', text: "And budget — I ask for a rough range so I can match them to the right package." },
  { at: 28200, addField: { key: 'budget', label: 'Budget Range', type: 'text', placeholder: 'e.g. £2,500 – £4,000' } },
  { at: 29800, speaker: 'Client', text: "Last one — any special requests. Golden hour portraits, specific locations, that kind of thing." },
  { at: 33500, addField: { key: 'requests', label: 'Special Requests', type: 'textarea', placeholder: 'e.g. golden hour portraits, woodland walk...' } },
  { at: 35500, speaker: 'You',    text: "That's your entire intake form — built live from our conversation. Ready to see it fill itself?" },
];

const P2_SEQUENCE = [
  { at: 1200,  speaker: 'You',    text: "Hi, I'm looking for a wedding photographer for next year." },
  { at: 4000,  speaker: 'Client', text: "Wonderful! Let me take a few details. What's your wedding date?" },
  { at: 7000,  speaker: 'You',    text: "It's the 14th of September 2026." },
  { at: 9000,  fillField: { key: 'date', value: '14 Sep 2026' } },
  { at: 11000, speaker: 'Client', text: "Lovely. Do you have a venue confirmed?" },
  { at: 13500, speaker: 'You',    text: "Yes — Cliveden House, in Berkshire." },
  { at: 16000, fillField: { key: 'venue', value: 'Cliveden House, Berkshire' } },
  { at: 18000, speaker: 'Client', text: "Beautiful venue. How many guests are you expecting?" },
  { at: 21000, speaker: 'You',    text: "Around 85." },
  { at: 22500, fillField: { key: 'guests', value: '85' } },
  { at: 24500, speaker: 'Client', text: "And are you looking for ceremony coverage only, or the full day?" },
  { at: 27500, speaker: 'You',    text: "We'd love the full day — from getting ready all the way through to the evening." },
  { at: 30000, fillField: { key: 'coverage', value: 'Full Day' } },
  { at: 32000, speaker: 'Client', text: "Perfect. Do you have a rough budget in mind?" },
  { at: 35000, speaker: 'You',    text: "We're thinking around three to three and a half thousand pounds." },
  { at: 37500, fillField: { key: 'budget', value: '£3,000 – £3,500' } },
  { at: 39500, speaker: 'Client', text: "Great. Any special requests — golden hour, particular locations, anything like that?" },
  { at: 42500, speaker: 'You',    text: "Golden hour portraits by the river would be amazing, and a woodland walk if possible." },
  { at: 45500, fillField: { key: 'requests', value: 'Golden hour portraits by the river, woodland walk' } },
  { at: 47500, speaker: 'Client', text: "That all sounds wonderful. I'll put a package together and send it over today!" },
];

// ── Live demo component ───────────────────────────────────────────────────────

function OnboardingDemo({ onBookDemo }) {
  const [phase, setPhase] = useState('intro');
  const [callSeconds, setCallSeconds] = useState(0);
  const [lines, setLines] = useState([]);
  const [fields, setFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [highlightKey, setHighlightKey] = useState(null);
  const timerRef = useRef(null);
  const seqTimeoutsRef = useRef([]);
  const transcriptRef = useRef(null);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [lines]);

  // Call timer
  useEffect(() => {
    if (phase === 'p1-call' || phase === 'p2-call') {
      timerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      if (phase === 'p1-dialling' || phase === 'p2-dialling') setCallSeconds(0);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const clearSeq = () => { seqTimeoutsRef.current.forEach(clearTimeout); seqTimeoutsRef.current = []; };
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const runSequence = (seq, onDone) => {
    seq.forEach(step => {
      const t = setTimeout(() => {
        if (step.speaker) setLines(prev => [...prev, { speaker: step.speaker, text: step.text }]);
        if (step.addField) {
          setFields(prev => [...prev, step.addField]);
          setHighlightKey(step.addField.key);
          const ht = setTimeout(() => setHighlightKey(k => k === step.addField.key ? null : k), 1600);
          seqTimeoutsRef.current.push(ht);
        }
        if (step.fillField) {
          setFieldValues(prev => ({ ...prev, [step.fillField.key]: step.fillField.value }));
          setHighlightKey(step.fillField.key);
          const ht = setTimeout(() => setHighlightKey(k => k === step.fillField.key ? null : k), 1600);
          seqTimeoutsRef.current.push(ht);
        }
      }, step.at);
      seqTimeoutsRef.current.push(t);
    });
    const lastAt = Math.max(...seq.map(s => s.at));
    const td = setTimeout(onDone, lastAt + 3500);
    seqTimeoutsRef.current.push(td);
  };

  const startP1 = () => {
    clearSeq();
    setPhase('p1-dialling');
    setLines([]);
    setFields([]);
    setFieldValues({});
    setHighlightKey(null);
    const t = setTimeout(() => {
      setPhase('p1-call');
      runSequence(P1_SEQUENCE, () => setPhase('p1-done'));
    }, 2500);
    seqTimeoutsRef.current.push(t);
  };

  const startP2 = () => {
    clearSeq();
    setPhase('p2-dialling');
    setLines([]);
    setHighlightKey(null);
    setFieldValues({});
    const t = setTimeout(() => {
      setPhase('p2-call');
      runSequence(P2_SEQUENCE, () => setPhase('p2-done'));
    }, 2500);
    seqTimeoutsRef.current.push(t);
  };

  const reset = () => {
    clearSeq();
    clearInterval(timerRef.current);
    setPhase('intro');
    setLines([]);
    setFields([]);
    setFieldValues({});
    setHighlightKey(null);
    setCallSeconds(0);
  };

  useEffect(() => () => { clearSeq(); clearInterval(timerRef.current); }, []);

  // ── Intro ─────────────────────────────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#F7F7F5]">
        <div className="w-full max-w-2xl">

          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-xs font-bold px-4 py-2 rounded-full border border-green-100">
              <UserPlus className="w-3.5 h-3.5" />
              Live interactive demo — no sign-in required
            </span>
          </div>

          {/* Headline */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-4">
              Watch your intake form build itself<br className="hidden md:block" /> from a phone call.
            </h1>
            <p className="text-slate-500 text-base md:text-lg max-w-lg mx-auto leading-relaxed">
              A two-part live demo. First, our AI builds your form from a conversation. Then it fills every field — while you're still on the call.
            </p>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white text-sm font-black">1</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client Onboarding Call</div>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Form builds itself</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                You call your prospect and ask what questions they normally ask their customers. Our AI listens and builds their intake form — field by field — as they speak.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-black">2</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Onboarding Call</div>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Form fills itself</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Call back as a customer. Answer the questions. Watch every field on the form fill in automatically — no typing, no admin, no follow-up.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="flex justify-center">
            <button
              onClick={startP1}
              className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-xl font-semibold text-base hover:bg-slate-700 transition-colors shadow-lg"
            >
              <PhoneCall className="w-5 h-5" />
              Start the live demo
            </button>
          </div>

          <p className="text-center text-xs text-slate-400 mt-4">Takes about 2 minutes · No account needed</p>
        </div>
      </div>
    );
  }

  // ── Dialling ──────────────────────────────────────────────────────────────

  if (phase === 'p1-dialling' || phase === 'p2-dialling') {
    const isP2 = phase === 'p2-dialling';
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F7F5]">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-green-500 rounded-full opacity-20 animate-ping" />
            <div className="relative w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
              <Phone className="w-10 h-10 text-white" />
            </div>
          </div>
          <p className="text-slate-900 font-bold text-lg mb-1">Calling…</p>
          <p className="text-slate-500 text-sm">
            {isP2 ? 'Starting the customer onboarding call' : 'Starting the client onboarding call'}
          </p>
        </div>
      </div>
    );
  }

  // ── Live call ─────────────────────────────────────────────────────────────

  if (phase === 'p1-call' || phase === 'p2-call') {
    const isP2 = phase === 'p2-call';
    return (
      <div className="flex-1 flex overflow-hidden">

        {/* Left — transcript */}
        <div className="w-[42%] flex flex-col border-r border-slate-200 bg-white overflow-hidden">
          <div className="bg-slate-900 px-5 py-4 flex items-center gap-3 flex-shrink-0">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-semibold">
                Live Call — {isP2 ? 'Customer Onboarding' : 'Client Onboarding'}
              </div>
              <div className="text-slate-400 text-xs font-mono">{fmt(callSeconds)}</div>
            </div>
            <div className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
              {isP2 ? 'CUSTOMER' : 'CLIENT'}
            </div>
          </div>
          <div className="px-4 py-2.5 bg-green-50 border-b border-green-100 flex items-center gap-2 flex-shrink-0">
            <Radio className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
            <span className="text-xs text-green-700 font-medium">
              AI listening — {isP2 ? 'filling form in real time' : 'extracting questions in real time'}
            </span>
          </div>
          <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {lines.length === 0 && (
              <p className="text-center text-slate-300 text-sm py-10">Transcript will appear here…</p>
            )}
            {lines.map((line, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${line.speaker !== 'You' ? 'flex-row-reverse' : ''}`}
                style={{ animation: 'slideUp 0.3s ease forwards' }}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${line.speaker === 'You' ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-white'}`}>
                  {line.speaker === 'You' ? 'Y' : 'C'}
                </div>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${line.speaker === 'You' ? 'bg-slate-100 text-slate-800 rounded-tl-sm' : 'bg-slate-800 text-white rounded-tr-sm'}`}>
                  {line.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form panel */}
        <div className="flex-1 flex flex-col bg-[#F7F7F5] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {isP2 ? 'Customer Intake Form' : 'Client Intake Form'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {fields.length} {fields.length === 1 ? 'field' : 'fields'} {isP2 ? 'ready' : 'extracted so far'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              {isP2 ? 'Auto-filling' : 'Auto-building'}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {fields.length === 0 && (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
                <p className="text-slate-300 text-sm">
                  Form fields will appear here as your client describes their process…
                </p>
              </div>
            )}
            <div className="space-y-4">
              {fields.map(field => {
                const isHighlighted = highlightKey === field.key;
                const val = fieldValues[field.key] || '';
                const hasVal = !!val;
                return (
                  <div
                    key={field.key}
                    className={`bg-white rounded-xl border px-4 py-3 transition-all duration-500 ${isHighlighted ? 'border-green-400 shadow-[0_0_0_3px_rgba(74,222,128,0.2)]' : 'border-slate-200'}`}
                    style={{ animation: 'slideUp 0.3s ease forwards' }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {field.label}
                      </label>
                      {isHighlighted && !isP2 && (
                        <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                          Extracted
                        </span>
                      )}
                      {isHighlighted && isP2 && (
                        <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Filled
                        </span>
                      )}
                      {!isHighlighted && hasVal && isP2 && (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Done
                        </span>
                      )}
                    </div>
                    <div className={`w-full px-3 py-2 rounded-lg border text-sm transition-all duration-300 ${isHighlighted ? 'border-green-300 bg-green-50 text-green-800' : hasVal ? 'border-slate-200 bg-white text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-400'} ${field.type === 'textarea' ? 'min-h-[60px]' : ''}`}>
                      {val || (isP2 ? 'Listening…' : field.placeholder)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── P1 done ───────────────────────────────────────────────────────────────

  if (phase === 'p1-done') {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F7F5] p-8">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Intake form built</h2>
            <p className="text-slate-500 text-sm">
              {fields.length} fields created from a single phone call — no setup, no spreadsheets.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4">{fields.length} fields extracted from the call</h3>
            <div className="space-y-2.5">
              {fields.map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-slate-500 mb-6">
            Your intake form is ready. Now watch it fill itself when a customer calls.
          </p>

          <div className="flex justify-center gap-3">
            <button
              onClick={reset}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Start over
            </button>
            <button
              onClick={startP2}
              className="flex items-center gap-2 bg-slate-900 text-white px-8 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-700 transition-colors shadow-md"
            >
              <PhoneCall className="w-4 h-4" />
              Begin Customer Onboarding
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── P2 done ───────────────────────────────────────────────────────────────

  if (phase === 'p2-done') {
    const filledCount = Object.keys(fieldValues).length;
    return (
      <div className="flex-1 overflow-y-auto bg-[#F7F7F5]">
        <div className="w-full max-w-lg mx-auto py-10 px-6">

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Demo complete</h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              The form built itself from one call. Then filled itself from another. No typing. No admin. No follow-up needed.
            </p>
          </div>

          {/* Completed form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700">Completed intake form</h3>
              <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                {filledCount}/{fields.length} fields filled
              </span>
            </div>
            <div className="space-y-3">
              {fields.map(f => (
                <div key={f.key} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{f.label}</div>
                    <div className="text-sm text-slate-800">{fieldValues[f.key] || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA block */}
          <div className="bg-slate-900 rounded-2xl p-6 text-center mb-4">
            <h3 className="text-white font-black text-lg mb-2">Ready to see this in your business?</h3>
            <p className="text-slate-400 text-sm mb-5">
              Book a 15-minute call and we'll set this up with your real intake questions and pricing.
            </p>
            <button
              onClick={onBookDemo}
              className="w-full py-3 bg-white text-slate-900 text-sm font-bold rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
            >
              Book a free demo
            </button>
          </div>

          <div className="flex justify-center">
            <button
              onClick={reset}
              className="text-sm text-slate-400 hover:text-slate-700 transition-colors underline underline-offset-2"
            >
              Run demo again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function DemoPage({ onHome, onBookDemo }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* Nav */}
      <nav className="flex-shrink-0 flex items-center justify-between px-6 md:px-10 py-4 border-b border-slate-100 bg-white">
        <button onClick={onHome}>
          <img src="/logo.svg" alt="Show My Quote" className="h-12 w-auto" />
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onHome}
            className="hidden md:inline-flex px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            Back to site
          </button>
          <button
            onClick={onBookDemo}
            className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-700 transition-colors shadow-md"
          >
            Book a demo
          </button>
        </div>
      </nav>

      {/* Demo — fills remaining height */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
        <OnboardingDemo onBookDemo={onBookDemo} />
      </div>

    </div>
  );
}
