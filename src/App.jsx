import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TemplatesView, TemplateBuilderView } from './TemplateBuilder.jsx';
import PriceListView from './PriceList.jsx';
import { transcribeAudio, suggestField, fillFields, analyzeFullConversation } from './openaiHelper.js';

const SMQ_KEY = import.meta.env.VITE_SMQ_API_KEY || '';
function apiFetch(url, options = {}) {
  const { headers, ...rest } = options;
  return fetch(url, { ...rest, headers: { 'x-smq-key': SMQ_KEY, ...headers } });
}
import {
  Home, Inbox, Phone, FileText, Settings,
  Menu as MenuIcon, Package, Sliders, Calendar,
  ChevronRight, Plus, Search, MoreHorizontal,
  CheckCircle2, Clock, AlertCircle, PhoneCall,
  FileEdit, Calculator, Trash2, Copy, Zap,
  X, Send, Eye, Check, Tag, DollarSign, Star,
  ChevronDown, Edit3, ArrowRight,
  Users, Activity, TrendingUp, Globe, Link2, Bell, Shield, LayoutGrid,
  Mic, MicOff, PhoneOff, Radio, Pause, Play, UserPlus,
  Volume2, Mail, ReceiptText, PhoneForwarded, MessageSquare, ChevronLeft,
  Hash, ToggleRight, CheckSquare, Type as TypeIcon,
  AlignLeft, Percent, MapPin, Timer, CalendarClock, Minus, Info, SlidersHorizontal,
  BookOpen, History, Upload, Printer, Image as ImageIcon, Clipboard,
  Edit2, PenLine, ExternalLink, ClipboardCopy
} from 'lucide-react';

// ─── DB → UI shape helpers ────────────────────────────────────────────────────
const CONTACT_COLORS = [
  'bg-purple-100 text-purple-700', 'bg-blue-100 text-blue-700',
  'bg-pink-100 text-pink-700',    'bg-orange-100 text-orange-700',
  'bg-green-100 text-green-700',  'bg-yellow-100 text-yellow-700',
  'bg-teal-100 text-teal-700',    'bg-indigo-100 text-indigo-700',
];
function makeContactUi(c) {
  const initials = (c.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const color = CONTACT_COLORS[(c.name || '').length % CONTACT_COLORS.length];
  return { ...c, initials, color, calls: [], eventType: c.event_type || '' };
}
function makeCallUi(c) {
  const d = c.created_at ? new Date(c.created_at) : null;
  const date = d ? d.toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const mins = c.duration ? Math.floor(c.duration / 60) : 0;
  const secs = c.duration ? c.duration % 60 : 0;
  const duration = c.duration ? `${mins}m ${secs}s` : '—';
  const tx = Array.isArray(c.transcript) ? c.transcript : [];
  return {
    id: c.id,
    callSid: c.call_sid || null,
    caller: c.from_number || 'Unknown',
    phone: c.from_number || '',
    email: '',
    date,
    duration,
    createdAt: c.created_at || null,
    niche: c.niche || null,
    status: tx.length > 0 ? 'transcribed' : (c.status === 'missed' ? 'missed' : 'new'),
    hasRecording: !!c.recording_sid,
    recordingSid: c.recording_sid || null,
    transcript: tx,
    extracted: {},
    quote: null,
    messages: [],
    invoice: null,
  };
}


const MOCK_MENUS = [
  {
    id: 'm1', name: 'Standard Reroof', type: 'Full Replacement', basePrice: 180, tags: ['Most Popular'],
    description: 'Full tear-off and replacement with 30-year architectural shingles. Includes underlayment, drip edge, and ridge cap.',
    minGuests: 15, maxGuests: 60,
    courses: [
      { name: 'Materials', items: ['30-yr architectural shingles', 'Synthetic underlayment', 'Drip edge & flashing'] },
      { name: 'Labor', items: ['Tear-off & disposal', 'Installation labor', 'Ridge cap & vents'] },
      { name: 'Extras', items: ['Permit filing', 'Debris cleanup', 'Final inspection'] },
    ]
  },
  {
    id: 'm2', name: 'Premium Reroof', type: 'Full Replacement', basePrice: 220, tags: ['Popular'],
    description: 'Full replacement with impact-resistant Class 4 shingles and lifetime workmanship warranty. Ideal for hail-prone areas.',
    minGuests: 15, maxGuests: 60,
    courses: [
      { name: 'Materials', items: ['Class 4 impact-resistant shingles', 'Ice & water shield', 'Architectural ridge cap'] },
      { name: 'Labor', items: ['Full tear-off & disposal', 'Installation labor', 'Flashing & valleys'] },
      { name: 'Warranty', items: ['Lifetime workmanship warranty', 'Manufacturer warranty (Class 4)', 'Final walkthrough'] },
    ]
  },
  {
    id: 'm3', name: 'Repair Package', type: 'Spot Repair', basePrice: 45, tags: ['Quick'],
    description: 'Targeted repairs for leaks, flashing, pipe boots, and minor shingle damage. Same-day or next-day response.',
    minGuests: 1, maxGuests: 10,
    courses: [
      { name: 'Common Repairs', items: ['Valley re-flash', 'Pipe boot replacement', 'Shingle blow-off repair'] },
      { name: 'Labor', items: ['Half-day labor', 'Attic moisture check', 'Sealant & caulking'] },
      { name: 'Add-ons', items: ['Full inspection report', 'Photo documentation', 'Insurance scope letter'] },
    ]
  },
];

function getStoredMenus() {
  try {
    const raw = localStorage.getItem('smq_menus');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return MOCK_MENUS;
}

function saveStoredMenus(menus) {
  try { localStorage.setItem('smq_menus', JSON.stringify(menus)); } catch {}
}

const MOCK_RULES_INITIAL = [
  { id: 'r1', condition: 'pitch > 8:12',                 action: 'Add 25% steep pitch surcharge', expression: 'laborCost × 1.25',           raw: 'add 25% surcharge for steep pitch above 8:12' },
  { id: 'r2', condition: 'stories > 1',                  action: 'Add $150 per extra storey',     expression: 'total += (stories - 1) × 150', raw: 'add $150 per storey above 1' },
  { id: 'r3', condition: 'material = Impact-resistant',  action: 'Add 22% material uplift',       expression: 'materialCost × 1.22',        raw: 'add 22% for impact-resistant shingles' },
  { id: 'r4', condition: 'distance > 30 miles',          action: 'Add flat travel fee $150',      expression: 'total += 150',               raw: 'add $150 travel fee for jobs over 30 miles' },
];




const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-purple-100 text-purple-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-700',
  Drafting: 'bg-yellow-100 text-yellow-800',
  'New Inquiry': 'bg-slate-100 text-slate-800',
  'Quote Sent': 'bg-green-100 text-green-800',
};

// --- TOUR ---
const TOUR_STEPS = [
  { view: 'dashboard',  title: 'Your dashboard',  desc: "At a glance — today's calls, pipeline value, and open enquiries. Updates every time a call ends." },
  { view: 'inquiries',  title: 'Enquiries',        desc: 'Your full pipeline. Every call creates an enquiry automatically — no typing, no follow-up admin.' },
  { view: 'contacts',   title: 'Contacts',         desc: 'All your clients in one place. Call, SMS, or email them directly — and see every quote and call in their history.' },
  { view: 'calls',      title: 'Call History',     desc: 'Every call, recorded and transcribed. Tap any entry to read the full conversation and the quote it generated.' },
  { view: 'settings',   title: 'Settings',         desc: 'Configure your business details, notification preferences, and integrations.' },
];

function TourCard({ step, onNext, onClose }) {
  const s = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5" style={{ animation: 'popIn 0.25s ease' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Step {step + 1} of {TOUR_STEPS.length}</span>
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors -mt-0.5">
          <X className="w-4 h-4" />
        </button>
      </div>
      <h3 className="font-black text-slate-900 mb-1.5">{s.title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed mb-4">{s.desc}</p>
      <button
        onClick={onNext}
        className="w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
      >
        {isLast ? <><Check className="w-4 h-4" /> Done</> : <>Next <ArrowRight className="w-4 h-4" /></>}
      </button>
      {!isLast && (
        <button onClick={onClose} className="w-full mt-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
          Skip tour
        </button>
      )}
    </div>
  );
}

// --- MAIN APP ---
// ─── Phone Dialer ─────────────────────────────────────────────────────────────
function normalizeE164(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  if ((raw || '').trim().startsWith('+')) return raw.replace(/[^\d+]/g, '');
  return digits || raw;
}

function PhoneDialer({ onClose, navigateTo, contacts = [], initialNumber = '', lead = null }) {
  const [number, setNumber] = useState(initialNumber);
  const [status, setStatus] = useState('idle'); // idle | dialing | connected | ended
  const [timer, setTimer] = useState(0);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [interim, setInterim] = useState('');
  const [captureStatus, setCaptureStatus] = useState('called');
  const [captureNotes, setCaptureNotes] = useState('');
  const [savingCapture, setSavingCapture] = useState(false);
  const [captureSaved, setCaptureSaved] = useState(false);
  const swClientRef = useRef(null);
  const swCallRef   = useRef(null);
  const recognitionRef = useRef(null);
  const intentStopRef = useRef(false);

  const SpeechRec = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

  const KEYS = [
    { digit: '1', sub: '' },    { digit: '2', sub: 'ABC' }, { digit: '3', sub: 'DEF' },
    { digit: '4', sub: 'GHI' }, { digit: '5', sub: 'JKL' }, { digit: '6', sub: 'MNO' },
    { digit: '7', sub: 'PQRS' },{ digit: '8', sub: 'TUV' }, { digit: '9', sub: 'WXYZ' },
    { digit: '*', sub: '' },    { digit: '0', sub: '+' },   { digit: '#', sub: '' },
  ];

  const fmt = s => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  useEffect(() => {
    if (status !== 'connected') return;
    const id = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  // Cleanup on unmount
  useEffect(() => () => {
    stopTranscription();
    try { swCallRef.current?.hangup?.(); } catch {}
  }, []);

  const startTranscription = () => {
    if (!SpeechRec) return;
    intentStopRef.current = false;
    const r = new SpeechRec();
    recognitionRef.current = r;
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';
    r.onresult = e => {
      let iText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          setInterim('');
          setTranscript(prev => [...prev, { speaker: 'You', text: t.trim() }]);
        } else { iText += t; }
      }
      setInterim(iText);
    };
    r.onerror = e => {
      if (e.error === 'audio-capture') {
        setTimeout(() => { if (!intentStopRef.current) { try { r.start(); } catch {} } }, 800);
      }
    };
    r.onend = () => {
      setInterim('');
      if (!intentStopRef.current && recognitionRef.current) {
        try { r.start(); } catch {}
      }
    };
    r.start();
  };

  const stopTranscription = () => {
    intentStopRef.current = true;
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setInterim('');
  };

  const startRealCall = async () => {
    if (!number) return;
    setStatus('dialing');
    setTranscript([]);
    setCaptureSaved(false);
    try {
      let client = swClientRef.current;
      if (!client) {
        const res = await apiFetch('/api/signalwire-token');
        if (!res.ok) throw new Error('Token fetch failed');
        const { token } = await res.json();
        const { SignalWire } = await import('@signalwire/js');
        client = await SignalWire({ token });
        swClientRef.current = client;
      }
      const dialTo = normalizeE164(number);
      const call = await client.dial({
        to: dialTo,
        rootElement: document.getElementById('sw-dialer-media'),
        audio: true,
        video: false,
      });
      swCallRef.current = call;
      call.on('call.state', (params) => {
        console.log('[dialer] call.state:', params?.call_state);
        if (params?.call_state === 'answered') {
          setStatus('connected');
          startTranscription();
        }
      });
      call.on('destroy', () => {
        swCallRef.current = null;
        stopTranscription();
        setStatus(s => s === 'dialing' || s === 'connected' ? 'ended' : s);
      });
      call.start().catch(e => console.warn('[dialer] call.start:', e.message));
    } catch (e) {
      console.error('[dialer] call failed:', e);
      setStatus('idle');
      alert('Could not connect: ' + e.message);
    }
  };

  const endCall = () => {
    stopTranscription();
    try { swCallRef.current?.hangup?.(); } catch {}
    swCallRef.current = null;
    setStatus('ended');
    apiFetch('/api/save-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        direction: 'outbound',
        from_number: number,
        duration: timer,
        transcript: transcript.map(l => `${l.speaker}: ${l.text}`).join('\n'),
        status: 'completed',
      }),
    }).catch(() => {});
  };

  const toggleMute = () => {
    const call = swCallRef.current;
    if (call?.audio) {
      if (muted) call.audio.unmute?.();
      else call.audio.mute?.();
    }
    setMuted(m => !m);
  };

  const press = digit => {
    if (status === 'connected' || status === 'dialing') return;
    setNumber(n => n.length < 16 ? n + digit : n);
  };

  const saveCapture = async () => {
    if (!lead?.id) return;
    setSavingCapture(true);
    try {
      await apiFetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: captureStatus,
          notes: captureNotes || undefined,
          last_contacted_at: new Date().toISOString(),
        }),
      });
      setCaptureSaved(true);
    } catch {}
    setSavingCapture(false);
  };

  const showPanel = status === 'connected' || status === 'ended';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4">
      <div
        className={`bg-white w-full sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col sm:flex-row transition-all duration-300 ${showPanel ? 'sm:w-[680px]' : 'sm:w-72'}`}
        style={{ maxHeight: '95vh' }}
      >
        {/* ── Keypad panel ── */}
        <div className="w-full sm:w-72 flex-shrink-0 flex flex-col p-5 bg-white">

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                status === 'connected' ? 'bg-green-500 animate-pulse' :
                status === 'dialing'   ? 'bg-amber-400 animate-pulse' : 'bg-slate-300'
              }`} />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {status === 'idle'      ? 'Ready to call' :
                 status === 'dialing'   ? 'Dialing…' :
                 status === 'connected' ? `Connected · ${fmt(timer)}` : 'Call ended'}
              </span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Lead context pill */}
          {lead && (
            <div className="mb-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                {(lead.business_name || '?')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{lead.business_name}</p>
                {lead.city && <p className="text-[10px] text-slate-400">{lead.city}{lead.state ? `, ${lead.state}` : ''}</p>}
              </div>
            </div>
          )}

          {/* Number display */}
          <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 min-h-[52px] relative flex items-center">
            <input
              type="tel"
              value={number}
              onChange={e => setNumber(e.target.value.replace(/[^\d+\-\s().#*]/g, '').slice(0, 20))}
              disabled={status === 'connected' || status === 'dialing'}
              placeholder="Enter number"
              className="font-mono text-xl tracking-widest font-bold w-full text-center bg-transparent outline-none text-slate-900 placeholder-slate-300 disabled:opacity-40 pr-8"
            />
            <button
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  const clean = text.replace(/[^\d+\-\s().#*]/g, '').slice(0, 20);
                  if (clean) setNumber(clean);
                } catch {}
              }}
              disabled={status === 'connected' || status === 'dialing'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 disabled:opacity-30"
              title="Paste number"
            >
              <Clipboard className="w-4 h-4" />
            </button>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {KEYS.map(({ digit, sub }) => (
              <button
                key={digit}
                onClick={() => press(digit)}
                disabled={status === 'connected' || status === 'dialing'}
                className="flex flex-col items-center justify-center h-13 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors select-none"
              >
                <span className="text-slate-900 font-semibold text-lg leading-none">{digit}</span>
                {sub && <span className="text-slate-400 text-[9px] font-medium mt-0.5 tracking-widest">{sub}</span>}
              </button>
            ))}
          </div>

          {/* Call / End buttons */}
          {(status === 'idle' || status === 'ended') && (
            <div className="flex gap-2">
              <button
                onClick={() => setNumber(n => n.slice(0, -1))}
                className="flex-1 h-12 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
              >⌫</button>
              <button
                onClick={startRealCall}
                disabled={!number}
                className="flex-[2] h-12 flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold transition-colors text-sm"
              >
                <Phone className="w-4 h-4" /> Call
              </button>
            </div>
          )}

          {status === 'dialing' && (
            <button
              onClick={endCall}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold transition-colors text-sm"
            >
              <PhoneOff className="w-4 h-4" /> Cancel
            </button>
          )}

          {status === 'connected' && (
            <div className="flex gap-2">
              <button
                onClick={toggleMute}
                className={`flex-1 h-12 flex flex-col items-center justify-center rounded-xl text-xs font-medium gap-1 border transition-colors ${muted ? 'bg-amber-50 border-amber-200 text-amber-600' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}
              >
                {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {muted ? 'Unmute' : 'Mute'}
              </button>
              <button
                onClick={endCall}
                className="flex-[2] h-12 flex flex-col items-center justify-center rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-medium gap-1 transition-colors"
              >
                <PhoneOff className="w-4 h-4" /> End call
              </button>
            </div>
          )}
        </div>

        {/* ── Right panel: transcript + post-call form ── */}
        {showPanel && (
          <div className="flex-1 border-t sm:border-t-0 sm:border-l border-slate-200 flex flex-col overflow-hidden bg-slate-50">
            {/* Status bar */}
            <div className="flex items-center gap-2 px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
              {status === 'connected' ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">Live · Transcribing your voice</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Call ended</span>
                </>
              )}
            </div>

            {/* Transcript */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
              {transcript.length === 0 && status === 'connected' && (
                <p className="text-slate-400 text-sm text-center mt-8 animate-pulse">Listening for your voice…</p>
              )}
              {transcript.length === 0 && status === 'ended' && (
                <p className="text-slate-400 text-sm text-center mt-6">No transcript captured</p>
              )}
              {transcript.map((line, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider pt-1.5 w-7 flex-shrink-0 text-slate-400">{line.speaker}</span>
                  <div className="px-3 py-2 rounded-xl text-sm bg-white border border-slate-200 text-slate-800 shadow-sm max-w-[200px] leading-relaxed">
                    {line.text}
                  </div>
                </div>
              ))}
              {interim && (
                <div className="flex gap-2 opacity-50">
                  <span className="text-[9px] font-bold uppercase tracking-wider pt-1.5 w-7 flex-shrink-0 text-slate-400">You</span>
                  <div className="px-3 py-2 rounded-xl text-sm bg-slate-100 text-slate-600 italic max-w-[200px]">{interim}</div>
                </div>
              )}
            </div>

            {/* Post-call capture form */}
            {status === 'ended' && lead && (
              <div className="border-t border-slate-200 bg-white p-4 flex-shrink-0 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Log outcome</p>
                {captureSaved ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm py-1">
                    <Check className="w-4 h-4" /> Lead updated
                  </div>
                ) : (
                  <>
                    <select
                      value={captureStatus}
                      onChange={e => setCaptureStatus(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    >
                      {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <textarea
                      value={captureNotes}
                      onChange={e => setCaptureNotes(e.target.value)}
                      placeholder="Notes from the call…"
                      rows={2}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none bg-slate-50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                    />
                    <button
                      onClick={saveCapture}
                      disabled={savingCapture}
                      className="w-full py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition"
                    >
                      {savingCapture ? 'Saving…' : 'Save & close'}
                    </button>
                  </>
                )}
              </div>
            )}

            {status === 'ended' && !lead && (
              <div className="border-t border-slate-200 bg-white p-4 flex-shrink-0">
                <button
                  onClick={() => { onClose(); navigateTo('calls'); }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors"
                >
                  View in Call History →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden audio element for SignalWire WebRTC */}
      <div id="sw-dialer-media" className="hidden" />
    </div>
  );
}

export default function GetMyQuoteApp({ onHome, tourMode = false, onCallAgain: onCallAgainProp }) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeRecord, setActiveRecord] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dialerOpen, setDialerOpen] = useState(false);
  const [dialerInitNumber, setDialerInitNumber] = useState('');
  const [dialerLead, setDialerLead] = useState(null);
  const [tourStep, setTourStep] = useState(() => {
    try {
      if (localStorage.getItem('smq_tour_done')) return null;
    } catch { /* ignore */ }
    return tourMode ? 0 : 0; // show on first visit
  });
  const [incomingCall, setIncomingCall] = useState(null);   // { invite, from }
  const [smsBadge, setSmsBadge] = useState(0);
  const [callLogs, setCallLogs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [notifPermission, setNotifPermission] = useState(() => {
    try { return Notification.permission; } catch { return 'unsupported'; }
  });
  const [installPrompt, setInstallPrompt] = useState(null);
  const ringtoneRef = useRef(null);
  const titleFlashRef = useRef(null);
  const autoAnswerRef = useRef(false);
  const swDeviceRef = useRef(null);

  const refreshCalls = () => {
    apiFetch('/api/calls-list').then(r => r.json()).then(d => {
      if (d.calls) setCallLogs(d.calls.map(makeCallUi));
    }).catch(() => {});
  };

  const navigateTo = (view, record = null) => {
    setCurrentView(view);
    setActiveRecord(record);
    setSidebarOpen(false);
    if (view === 'sms-inbox') setSmsBadge(0);
    if (view === 'calls') refreshCalls();
  };

  const dismissTour = () => {
    try { localStorage.setItem('smq_tour_done', '1'); } catch { /* ignore */ }
    setTourStep(null);
  };

  const handleTourNext = () => {
    if (tourStep < TOUR_STEPS.length - 1) {
      const next = tourStep + 1;
      setTourStep(next);
      setCurrentView(TOUR_STEPS[next].view);
      setActiveRecord(null);
      setSidebarOpen(false);
    } else {
      dismissTour();
    }
  };

  // Convert VAPID public key from base64url to Uint8Array (required by PushManager.subscribe)
  const urlB64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapidKey),
      });
      await apiFetch('/api/push-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: 'demo-presenter', subscription: sub.toJSON() }),
      });
    } catch (e) { console.warn('Push subscription failed:', e.message); }
  };

  const requestNotifPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    if (result === 'granted') subscribeToPush();
  };

  // Tab title flash helpers
  const startTitleFlash = () => {
    const orig = document.title;
    let on = true;
    titleFlashRef.current = setInterval(() => {
      document.title = on ? '📞 Incoming Call' : orig;
      on = !on;
    }, 800);
  };
  const stopTitleFlash = () => {
    clearInterval(titleFlashRef.current);
    document.title = 'Show My Quote';
  };

  // Play ringtone using Web Audio API
  const startRingtone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playBeep = (time) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 480; osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
        osc.start(time); osc.stop(time + 0.4);
      };
      // Ring pattern: beep-beep pause beep-beep
      let t = ctx.currentTime;
      const interval = setInterval(() => {
        playBeep(t); playBeep(t + 0.5);
        t += 2.5;
      }, 2500);
      playBeep(t); playBeep(t + 0.5);
      ringtoneRef.current = { stop: () => { clearInterval(interval); ctx.close(); } };
    } catch {}
  };
  const stopRingtone = () => { ringtoneRef.current?.stop(); ringtoneRef.current = null; };

  // Register SignalWire client for inbound calls
  useEffect(() => {
    let client;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/signalwire-token');
        if (!res.ok) return;
        const { token } = await res.json();
        const { SignalWire } = await import('@signalwire/js');
        if (cancelled) return;
        client = await SignalWire({ token });
        swDeviceRef.current = client;

        await client.online({
          incomingCallHandlers: {
            all: (notification) => {
              const details = notification.invite.details;
              const callerFrom = details.caller_id_number || details.callerIdNumber || 'Unknown';
              console.log('[signalwire] App inbound call from:', callerFrom, 'details:', JSON.stringify(details));

              if (autoAnswerRef.current) {
                autoAnswerRef.current = false;
                (async () => {
                  try {
                    await notification.invite.accept({
                      rootElement: document.getElementById('sw-media'),
                      audio: true, video: false,
                    });
                  } catch (e) { console.warn('[signalwire] Auto-answer failed:', e.message); }
                })();
                return;
              }

              setIncomingCall({ invite: notification.invite, from: callerFrom });
              startRingtone();
              startTitleFlash();
              try { navigator.setAppBadge?.(1); } catch {}
            },
          },
        });
        console.log('[signalwire] App client online, listening for inbound calls');
      } catch (e) { console.warn('SignalWire client init:', e.message); }
    })();
    return () => {
      cancelled = true;
      (async () => {
        try {
          if (client) { await client.offline(); await client.disconnect(); }
          swDeviceRef.current = null;
        } catch {}
      })();
    };
  }, []);

  // Register Service Worker + subscribe to push on load
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(e => console.warn('SW reg failed:', e));
    // If permission already granted, re-subscribe (in case subscription was cleared)
    try { if (Notification.permission === 'granted') subscribeToPush(); } catch {}
  }, []);

  // Capture PWA install prompt — Chrome fires this when app is installable
  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    // Hide banner if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) setInstallPrompt(null);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Listen for answer/decline messages posted by the Service Worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = e => {
      const { type } = e.data || {};
      if (type === 'answer-call') {
        if (incomingCall) {
          (async () => {
            try {
              await incomingCall.invite.accept({
                rootElement: document.getElementById('sw-media'),
                audio: true, video: false,
              });
              stopRingtone();
              stopTitleFlash();
              try { navigator.clearAppBadge?.(); } catch {}
              setIncomingCall(null);
            } catch (e) { console.warn('[signalwire] Answer failed:', e.message); }
          })();
        } else {
          // Tab was just opened — set flag so client.online handler auto-accepts
          autoAnswerRef.current = true;
        }
      }
      if (type === 'decline-call' && incomingCall) {
        incomingCall.invite.reject();
        stopRingtone();
        stopTitleFlash();
        try { navigator.clearAppBadge?.(); } catch {}
        setIncomingCall(null);
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [incomingCall]);

  // Global Pusher listener for SMS badge + notifications
  useEffect(() => {
    const key = import.meta.env.VITE_PUSHER_KEY;
    const cluster = import.meta.env.VITE_PUSHER_CLUSTER;
    if (!key) return;
    let pusher, ch;
    import('pusher-js').then(({ default: Pusher }) => {
      pusher = new Pusher(key, { cluster });
      ch = pusher.subscribe('sms-inbox');
      ch.bind('message', () => {
        setSmsBadge(b => b + 1);
      });
    });
    return () => { try { pusher?.unsubscribe('sms-inbox'); } catch {} };
  }, []);

  // Load real data from Supabase
  useEffect(() => {
    apiFetch('/api/calls-list').then(r => r.json()).then(d => {
      if (d.calls) setCallLogs(d.calls.map(makeCallUi));
    }).catch(() => {});
    apiFetch('/api/contacts').then(r => r.json()).then(d => {
      if (d.contacts) setContacts(d.contacts.map(makeContactUi));
    }).catch(() => {});
    apiFetch('/api/quotes-list').then(r => r.json()).then(d => {
      if (d.quotes) setQuotes(d.quotes);
    }).catch(() => {});
    // Second fetch after 2s — catches calls saved just before navigating here (save-call is async)
    const t = setTimeout(() => {
      apiFetch('/api/calls-list').then(r => r.json()).then(d => {
        if (d.calls) setCallLogs(d.calls.map(makeCallUi));
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex h-screen bg-white text-slate-800 font-sans antialiased overflow-hidden">
      {/* Hidden container for SignalWire audio-only WebRTC calls */}
      <div id="sw-media" style={{ display: 'none' }} />
      <Sidebar currentView={currentView} navigateTo={navigateTo} onHome={onHome} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} smsBadge={smsBadge} tourStep={tourStep} />

      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white relative">
        <header className="h-14 border-b border-slate-200 flex items-center px-3 md:px-6 justify-between bg-white/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 min-w-0">
            <button
              className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors flex-shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <span className="hidden sm:inline text-slate-500 px-2 py-1 whitespace-nowrap">Show My Quote</span>
            <ChevronRight className="hidden sm:inline w-4 h-4 flex-shrink-0" />
            <span className="text-slate-800 capitalize px-2 py-1 truncate">{currentView.replace(/-/g, ' ')}</span>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded hover:bg-slate-100 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold border border-slate-300">
              EC
            </div>
          </div>
        </header>

        <main className={`flex-1 ${['calls', 'onboarding'].includes(currentView) ? 'overflow-hidden' : 'overflow-auto'}`}>

          {currentView === 'dashboard'     && <DashboardView navigateTo={navigateTo} onNewCall={() => { if (onCallAgainProp) { onCallAgainProp('', callLogs[0]?.niche || null, true); } else { setDialerOpen(true); } }} callLogs={callLogs} contacts={contacts} />}
          {currentView === 'contacts'      && <ContactsView navigateTo={navigateTo} contacts={contacts} onRefresh={() => apiFetch('/api/contacts').then(r => r.json()).then(d => { if (d.contacts) setContacts(d.contacts.map(makeContactUi)); }).catch(() => {})} onCallAgain={(phone, niche) => { if (onCallAgainProp) { onCallAgainProp(phone, niche); } else { setDialerInitNumber(phone || ''); setDialerOpen(true); } }} />}
          {currentView === 'calls'         && <CallLogView
            initialId={activeRecord}
            navigateTo={navigateTo}
            callLogs={callLogs}
            contacts={contacts}
            onDeleteCall={id => setCallLogs(prev => prev.filter(c => c.id !== id))}
            onUpdateCall={(id, updates) => setCallLogs(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))}
            onSaveContact={contact => setContacts(prev => [makeContactUi(contact), ...prev])}
            onCallAgain={(phone, niche) => {
              if (onCallAgainProp) { onCallAgainProp(phone, niche); }
              else { setDialerInitNumber(phone || ''); setDialerOpen(true); }
            }}
          />}
          {currentView === 'onboarding'    && <OnboardingView />}
          {currentView === 'quote-builder' && <QuoteBuilderView initialData={activeRecord} navigateTo={navigateTo} />}
          {currentView === 'quotes'        && <QuotesView navigateTo={navigateTo} quotes={quotes} />}
          {currentView === 'inquiries'     && <InquiriesView navigateTo={navigateTo} onCall={(phone, lead) => { setDialerLead(lead || null); setDialerInitNumber(phone || ''); setDialerOpen(true); }} />}
          {currentView === 'sms-inbox'     && <SmsInboxView />}
          {currentView === 'menus'         && <MenusView />}
          {currentView === 'pricing-rules'    && <PricingRulesView />}
          {currentView === 'price-list'       && <PriceListView />}
          {currentView === 'settings'        && <SettingsView />}
          {currentView === 'templates'       && <TemplatesView navigateTo={navigateTo} />}
          {currentView === 'template-builder' && <TemplateBuilderView initialData={activeRecord} navigateTo={navigateTo} />}
        </main>
      </div>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} navigateTo={(v, r) => { setSearchOpen(false); navigateTo(v, r); }} callLogs={callLogs} quotes={quotes} />}
      {dialerOpen && <PhoneDialer onClose={() => { setDialerOpen(false); setDialerInitNumber(''); setDialerLead(null); }} navigateTo={navigateTo} contacts={contacts} initialNumber={dialerInitNumber} lead={dialerLead} />}

      {/* Dashboard tour card */}
      {tourStep !== null && (
        <TourCard step={tourStep} onNext={handleTourNext} onClose={dismissTour} />
      )}

      {/* PWA install banner — once installed, Chrome allows ringtone without any click */}
      {installPrompt && notifPermission !== 'default' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-xl px-5 py-3 flex items-center gap-4 shadow-xl text-sm max-w-sm w-full">
          <span className="text-lg flex-shrink-0">📲</span>
          <span className="flex-1">Install the app so calls ring without needing to click first</span>
          <button
            onClick={async () => { await installPrompt.prompt(); setInstallPrompt(null); }}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg font-medium transition-colors flex-shrink-0"
          >
            Install
          </button>
          <button onClick={() => setInstallPrompt(null)} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Notification permission banner */}
      {notifPermission === 'default' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-xl px-5 py-3 flex items-center gap-4 shadow-xl text-sm">
          <Bell className="w-4 h-4 text-green-400 flex-shrink-0" />
          <span>Enable notifications to get alerted for calls & messages</span>
          <button onClick={requestNotifPermission} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg font-medium transition-colors flex-shrink-0">
            Enable
          </button>
          <button onClick={() => setNotifPermission('dismissed')} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Incoming call modal */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-80 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Phone className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Incoming call</p>
            <p className="text-xl font-semibold text-slate-800 mb-6">{incomingCall.from}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { incomingCall.invite.reject(); stopRingtone(); stopTitleFlash(); try { navigator.clearAppBadge?.(); } catch {} setIncomingCall(null); }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <PhoneOff className="w-4 h-4" /> Decline
              </button>
              <button
                onClick={async () => { try { await incomingCall.invite.accept({ rootElement: document.getElementById('sw-media'), audio: true, video: false }); } catch (e) { console.warn('[signalwire] Answer failed:', e.message); } stopRingtone(); stopTitleFlash(); try { navigator.clearAppBadge?.(); } catch {} setIncomingCall(null); }}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl py-3 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" /> Answer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- VIEWS ---


// --- LIVE CALL MODAL ---
// Demo sequence: each entry fires at `delay` ms after call connects.
// `fills` populates form fields; `line` adds a transcript line.
const DEMO_SEQUENCE = [
  { delay: 1800,  line: { speaker: 'Agent',  text: "Thanks for calling — how can I help you today?" } },
  { delay: 4500,  line: { speaker: 'Caller', text: "Hey, this is Mike Harris. I need a full roof replacement — it's done." },
    fills: [{ field: 'name', value: 'Mike Harris' }, { field: 'eventType', value: 'Full replacement' }] },
  { delay: 8000,  line: { speaker: 'Agent',  text: "Got it, Mike. What's the property address?" } },
  { delay: 11000, line: { speaker: 'Caller', text: "4821 Westgate Drive, Houston, Texas." },
    fills: [{ field: 'address', value: '4821 Westgate Dr, Houston TX' }, { field: 'venue', value: 'Houston TX' }] },
  { delay: 15000, line: { speaker: 'Agent',  text: "How many stories is the house, and any idea on the roof size?" } },
  { delay: 18000, line: { speaker: 'Caller', text: "Two stories. I'd guess about 28 squares, maybe 2,800 square feet." },
    fills: [{ field: 'startTime', value: '2 stories' }, { field: 'duration', value: '~28 squares' }, { field: 'guestCount', value: '28' }] },
  { delay: 22000, line: { speaker: 'Agent',  text: "What's the pitch — steep or more moderate?" } },
  { delay: 25000, line: { speaker: 'Caller', text: "Moderate — maybe a 6:12 slope." },
    fills: [{ field: 'serviceStyle', value: '6:12 (moderate)' }] },
  { delay: 29000, line: { speaker: 'Agent',  text: "And what material were you thinking — architectural shingles, metal, or something else?" } },
  { delay: 32000, line: { speaker: 'Caller', text: "30-year architectural shingles. And you'll need to do a full tear-off — one layer." },
    fills: [{ field: 'dietary', value: '30-yr architectural shingles' }, { field: 'barRequirements', value: 'Full tear-off — 1 layer' }] },
  { delay: 36000, line: { speaker: 'Agent',  text: "Any add-ons while we're up there — gutters, fascia, ridge ventilation?" } },
  { delay: 38500, line: { speaker: 'Caller', text: "The gutters are pretty old. Go ahead and include a gutter replacement." },
    fills: [{ field: 'childrenCount', value: 'Gutter replacement included' }] },
  { delay: 42500, line: { speaker: 'Agent',  text: "Do you need a rough budget range or is this an insurance job?" } },
  { delay: 44500, line: { speaker: 'Caller', text: "Not insurance — just a regular job. Happy to get a proper quote." },
    fills: [{ field: 'budget', value: 'Cash job — quote required' }] },
  { delay: 48500, line: { speaker: 'Agent',  text: "How did you hear about us?" } },
  { delay: 51000, line: { speaker: 'Caller', text: "Your truck was in the neighbourhood last week — neighbour on Westfield recommended you." },
    fills: [{ field: 'referralSource', value: 'Neighbour referral — Westfield Dr' }] },
  { delay: 55000, line: { speaker: 'Agent',  text: "Great. Any other damage we should know about before we come out?" } },
  { delay: 57500, line: { speaker: 'Caller', text: "The fascia on the front looks a bit rotten too. Worth checking while you're there." },
    fills: [{ field: 'specialRequests', value: 'Check fascia — front elevation' }] },
  { delay: 61500, line: { speaker: 'Agent',  text: "No problem. Best email and number to reach you on?" } },
  { delay: 64000, line: { speaker: 'Caller', text: "mike.harris@gmail.com and mobile is 713-555-0142." },
    fills: [{ field: 'email', value: 'mike.harris@gmail.com' }, { field: 'phone', value: '713-555-0142' }] },
];

function LiveCallModal({ onClose, navigateTo }) {
  const [phase, setPhase]               = useState('select'); // select | dialling | live | ended
  const [callType, setCallType]         = useState('new');    // 'new' | 'existing'
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted]     = useState(false);
  const [onHold, setOnHold]   = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', eventType: '', serviceStyle: '',
    guestCount: '', childrenCount: '', eventDate: '', startTime: '', duration: '',
    venue: '', address: '', dietary: '', barRequirements: '',
    budget: '', referralSource: '', specialRequests: '', notes: '',
  });
  const [recentField, setRecentField] = useState(null);
  const [saved, setSaved] = useState(false);
  const timerRef   = useRef(null);
  const timeoutIds = useRef([]);
  const transcriptRef = useRef(null);

  const formatTime = s =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const filteredClients = [];

  // Start the live call sequence (called after dialling animation)
  const runLiveSequence = () => {
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    DEMO_SEQUENCE.forEach(({ delay, line, fills }) => {
      const id = setTimeout(() => {
        if (line) {
          setTranscript(prev => [...prev, line]);
          setTimeout(() => {
            if (transcriptRef.current)
              transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
          }, 50);
        }
        if (fills) {
          fills.forEach(({ field, value }) => {
            setFormData(prev => ({ ...prev, [field]: value }));
            setRecentField(field);
            setTimeout(() => setRecentField(f => f === field ? null : f), 1800);
          });
        }
      }, delay);
      timeoutIds.current.push(id);
    });
  };

  // Called when user clicks "Start Call" on the select screen
  const beginCall = () => {
    // Pre-fill from existing client profile if chosen
    if (callType === 'existing' && selectedClient) {
      setFormData(p => ({
        ...p,
        name:       selectedClient.name       || '',
        phone:      selectedClient.phone      || '',
        eventType:  selectedClient.eventType  || '',
        guestCount: selectedClient.guests ? String(selectedClient.guests) : '',
        eventDate:  selectedClient.eventDate  || '',
        notes:      selectedClient.notes      || '',
      }));
    }
    setPhase('dialling');
    const t = setTimeout(() => {
      setPhase('live');
      runLiveSequence();
    }, 1800);
    timeoutIds.current.push(t);
  };

  const endCall = () => {
    clearInterval(timerRef.current);
    timeoutIds.current.forEach(clearTimeout);
    setPhase('ended');
  };

  const saveAndClose = () => {
    setSaved(true);
    setTimeout(() => onClose(), 1500);
  };

  useEffect(() => () => {
    clearInterval(timerRef.current);
    timeoutIds.current.forEach(clearTimeout);
  }, []);

  // Field config for the form panel
  const FIELDS = [
    // Contact
    { key: 'name',           label: 'Client Name',          placeholder: 'Listening…',        half: false },
    { key: 'email',          label: 'Email',                placeholder: 'Listening…',        half: true  },
    { key: 'phone',          label: 'Phone',                placeholder: 'Listening…',        half: true  },
    // Event basics
    { key: 'eventType',      label: 'Event Type',           placeholder: 'Listening…',        half: true  },
    { key: 'serviceStyle',   label: 'Service Style',        placeholder: 'Listening…',        half: true  },
    { key: 'eventDate',      label: 'Event Date',           placeholder: 'Listening…',        half: true  },
    { key: 'startTime',      label: 'Start Time',           placeholder: 'Listening…',        half: true  },
    { key: 'duration',       label: 'Duration / Hours on Site', placeholder: 'Listening…',   half: true  },
    // Guests
    { key: 'guestCount',     label: 'Guest Count (Adults)', placeholder: 'Listening…',        half: true  },
    { key: 'childrenCount',  label: 'Children Attending',   placeholder: 'Listening…',        half: true  },
    // Location
    { key: 'venue',          label: 'Venue Name',           placeholder: 'Listening…',        half: true  },
    { key: 'address',        label: 'Venue Address / Postcode', placeholder: 'Listening…',    half: true  },
    // Requirements
    { key: 'dietary',        label: 'Dietary Requirements', placeholder: 'Listening…',        half: false },
    { key: 'barRequirements', label: 'Bar & Drinks',        placeholder: 'Listening…',        half: false },
    { key: 'specialRequests', label: 'Special Requests',    placeholder: 'Listening…',        half: false },
    // Budget & source
    { key: 'budget',         label: 'Budget',               placeholder: 'Listening…',        half: true  },
    { key: 'referralSource', label: 'How Did They Hear',    placeholder: 'Listening…',        half: true  },
    // Notes
    { key: 'notes',          label: 'Additional Notes',     placeholder: 'Type here or speak…', half: false, textarea: true },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full" style={{ maxWidth: 960, height: '90vh' }}>

        {/* ── Select: New Call or Existing Profile ── */}
        {phase === 'select' && (
          <>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Live Call</h2>
                <p className="text-sm text-slate-500 mt-0.5">Start a new call or continue with an existing client profile</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {/* Option cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => { setCallType('new'); setSelectedClient(null); }}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${callType === 'new' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${callType === 'new' ? 'bg-green-100' : 'bg-slate-100'}`}>
                    <Phone className={`w-5 h-5 ${callType === 'new' ? 'text-green-600' : 'text-slate-500'}`} />
                  </div>
                  <div className="font-semibold text-slate-900 text-sm">New Call</div>
                  <div className="text-xs text-slate-500 mt-1 leading-relaxed">Start fresh — fields will auto-fill as the client speaks</div>
                </button>

                <button
                  onClick={() => setCallType('existing')}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${callType === 'existing' ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${callType === 'existing' ? 'bg-blue-100' : 'bg-slate-100'}`}>
                    <Users className={`w-5 h-5 ${callType === 'existing' ? 'text-blue-600' : 'text-slate-500'}`} />
                  </div>
                  <div className="font-semibold text-slate-900 text-sm">Existing Profile</div>
                  <div className="text-xs text-slate-500 mt-1 leading-relaxed">Select a client — their known details will pre-fill automatically</div>
                </button>
              </div>

              {/* Existing client search */}
              {callType === 'existing' && (
                <div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      autoFocus
                      type="text"
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      placeholder="Search by name or phone…"
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-slate-900 transition"
                    />
                  </div>
                  <div className="space-y-2">
                    {filteredClients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedClient(c)}
                        className={`w-full text-left px-4 py-3.5 rounded-xl border transition ${selectedClient?.id === c.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-700 flex-shrink-0">
                              {c.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 text-sm">{c.name}</div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {c.eventType} · {c.eventDate} · {c.guests} guests · {c.phone}
                              </div>
                              {c.notes && (
                                <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{c.notes}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[c.status] || 'bg-slate-100 text-slate-600'}`}>{c.status}</span>
                            <span className="text-xs text-slate-400">{c.value}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                    {filteredClients.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-sm">No clients match "{clientSearch}"</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Radio className="w-3.5 h-3.5 text-red-400" />
                Call will be recorded &amp; transcribed automatically
              </div>
              <button
                onClick={beginCall}
                disabled={callType === 'existing' && !selectedClient}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
              >
                <Phone className="w-4 h-4" /> Start Call
              </button>
            </div>
          </>
        )}

        {/* ── Dialling screen ── */}
        {phase === 'dialling' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-slate-900">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center">
                <Phone className="w-10 h-10 text-green-400" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-green-400/40 animate-ping" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {callType === 'existing' && selectedClient ? selectedClient.name : 'New Call'}
              </div>
              <div className="text-slate-400 text-sm mt-1">
                {callType === 'existing' && selectedClient ? selectedClient.phone : 'Unknown number'}
              </div>
              <div className="text-slate-400 text-sm mt-3 animate-pulse">Connecting…</div>
            </div>
            <button onClick={onClose}
              className="mt-4 w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition shadow-xl">
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* ── Live dashboard ── */}
        {phase === 'live' && (
          <>
            {/* Top bar */}
            <div className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Recording</span>
                </div>
                <div className="h-4 w-px bg-white/20" />
                <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2.5 py-0.5 rounded-full font-semibold">LIVE</span>
                <div className="text-lg font-mono font-bold">{formatTime(seconds)}</div>
              </div>
              <div className="text-sm font-semibold text-slate-300">Live Call Dashboard</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setMuted(m => !m)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${muted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}>
                  {muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {muted ? 'Muted' : 'Mute'}
                </button>
                <button onClick={() => setOnHold(h => !h)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${onHold ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}>
                  {onHold ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  {onHold ? 'Resume' : 'Hold'}
                </button>
                <button onClick={endCall}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ml-2">
                  <PhoneOff className="w-3.5 h-3.5" /> End Call
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">

              {/* Left — Client detail form (auto-fills) */}
              <div className="w-[55%] border-r border-slate-100 overflow-y-auto p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Client Details</div>
                  <span className="text-[10px] bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full font-semibold">Auto-filling from call</span>
                </div>

                <div className="flex flex-wrap gap-4">
                  {FIELDS.map(f => {
                    const isHighlighted = recentField === f.key;
                    const hasValue = !!formData[f.key];
                    const inputCls = `w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all duration-300 ${
                      isHighlighted
                        ? 'border-green-400 bg-green-50 text-green-900 shadow-sm shadow-green-100'
                        : hasValue
                        ? 'border-slate-300 bg-white text-slate-900'
                        : 'border-slate-200 bg-slate-50 text-slate-400'
                    }`;
                    return (
                      <div key={f.key} className={f.half ? 'w-[calc(50%-8px)]' : 'w-full'}>
                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                          {f.label}
                          {isHighlighted && (
                            <span className="text-[10px] text-green-600 font-semibold normal-case tracking-normal animate-pulse">● filling</span>
                          )}
                          {hasValue && !isHighlighted && (
                            <span className="text-[10px] text-green-500">✓</span>
                          )}
                        </label>
                        {f.textarea ? (
                          <textarea
                            rows={3}
                            value={formData[f.key]}
                            onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            className={`${inputCls} resize-none`}
                          />
                        ) : (
                          <input
                            type="text"
                            value={formData[f.key]}
                            onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.placeholder}
                            className={inputCls}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right — Live transcript */}
              <div className="w-[45%] flex flex-col overflow-hidden bg-slate-50">
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2 flex-shrink-0">
                  <Radio className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Transcript</span>
                </div>
                <div ref={transcriptRef} className="flex-1 overflow-y-auto p-5 space-y-5">
                  {transcript.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-10">
                      <div className="flex items-center gap-1">
                        {[0, 150, 300].map(d => (
                          <span key={d} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </div>
                      <span className="text-sm text-slate-400 italic">Waiting for speech…</span>
                    </div>
                  ) : (
                    transcript.map((line, i) => (
                      <div key={i} className={`flex gap-3 ${line.speaker === 'Agent' ? '' : 'flex-row-reverse'}`}>
                        <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                          line.speaker === 'Agent' ? 'bg-slate-200 text-slate-700' : 'bg-slate-900 text-white'
                        }`}>
                          {line.speaker.charAt(0)}
                        </div>
                        <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          line.speaker === 'Agent'
                            ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                            : 'bg-slate-900 text-white rounded-tr-sm'
                        }`}>
                          {line.text}
                        </div>
                      </div>
                    ))
                  )}
                  {transcript.length > 0 && (
                    <div className="flex gap-1 pl-10">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Call ended summary ── */}
        {phase === 'ended' && (
          <>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Call Summary</h2>
                <p className="text-sm text-slate-500 mt-0.5">Duration: {formatTime(seconds)} · Recording saved</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Filled details */}
              <div className="w-[55%] border-r border-slate-100 overflow-y-auto p-6 space-y-4">
                <div className="flex items-center gap-3 p-3.5 bg-green-50 border border-green-100 rounded-xl mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-green-800">Recording Saved</div>
                    <div className="text-xs text-green-700 mt-0.5">
                      call-{(formData.name || 'unknown').replace(/\s+/g, '-').toLowerCase()}.mp3 · Transcript processing…
                    </div>
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Captured Details</div>
                <div className="flex flex-wrap gap-3">
                  {FIELDS.filter(f => formData[f.key] && f.key !== 'notes').map(f => (
                    <div key={f.key} className={f.half ? 'w-[calc(50%-6px)]' : 'w-full'}>
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{f.label}</div>
                      <div className="text-sm font-medium text-slate-900 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">{formData[f.key]}</div>
                    </div>
                  ))}
                </div>
                {formData.notes && (
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</div>
                    <div className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">{formData.notes}</div>
                  </div>
                )}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Add / Edit Notes</label>
                  <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Add any additional notes…" rows={3}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:ring-1 focus:ring-slate-900 resize-none transition" />
                </div>
              </div>

              {/* Transcript replay */}
              <div className="w-[45%] flex flex-col overflow-hidden bg-slate-50">
                <div className="px-5 py-3.5 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider flex-shrink-0">
                  Transcript · {transcript.length} lines
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {transcript.map((line, i) => (
                    <div key={i} className={`flex gap-3 ${line.speaker === 'Agent' ? '' : 'flex-row-reverse'}`}>
                      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                        line.speaker === 'Agent' ? 'bg-slate-200 text-slate-700' : 'bg-slate-900 text-white'
                      }`}>
                        {line.speaker.charAt(0)}
                      </div>
                      <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        line.speaker === 'Agent'
                          ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                          : 'bg-slate-900 text-white rounded-tr-sm'
                      }`}>
                        {line.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {saved ? (
              <div className="px-6 py-4 bg-green-50 border-t border-green-100 flex items-center gap-2 text-green-700 text-sm font-semibold flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" /> Saved — closing…
              </div>
            ) : (
              <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => { saveAndClose(); setTimeout(() => navigateTo('inquiries'), 600); }}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-slate-900 hover:bg-slate-50 transition">
                    <Inbox className="w-4 h-4" /> Save to Inquiries
                  </button>
                  <button onClick={() => { saveAndClose(); setTimeout(() => navigateTo('quote-builder', formData), 600); }}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-slate-900 hover:bg-slate-50 transition">
                    <FileEdit className="w-4 h-4" /> Build Quote
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600 transition">Discard</button>
                  <button onClick={saveAndClose}
                    className="bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition flex items-center gap-2">
                    <Check className="w-4 h-4" /> Save &amp; Close
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


function SmsQuickCompose() {
  const [to,      setTo]      = useState('');
  const [body,    setBody]    = useState('');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  const send = async () => {
    if (!to.trim() || !body.trim() || sending || sent) return;
    setSending(true);
    try {
      const res = await apiFetch('/api/sms-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), body: body.trim() }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => { setSent(false); setTo(''); setBody(''); }, 3000);
      } else {
        const d = await res.json().catch(() => ({}));
        alert('Failed to send: ' + (d.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Failed to send: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-green-600" />
        <h3 className="text-sm font-semibold text-slate-900">Send a text</h3>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="tel"
          value={to}
          onChange={e => setTo(e.target.value)}
          placeholder="Phone number"
          className="w-full sm:w-40 flex-shrink-0 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
        />
        <input
          type="text"
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Type your message…"
          className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
        />
        <button
          onClick={send}
          disabled={!to.trim() || !body.trim() || sending || sent}
          className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
            sent    ? 'bg-green-100 text-green-700 border border-green-200' :
            sending ? 'bg-slate-100 text-slate-500 cursor-wait' :
            !to.trim() || !body.trim() ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
            'bg-green-600 hover:bg-green-500 text-white shadow-sm'
          }`}
        >
          {sent ? <><Check className="w-3.5 h-3.5" /> Sent</> :
           sending ? 'Sending…' :
           <><Send className="w-3.5 h-3.5" /> Send</>}
        </button>
      </div>
    </div>
  );
}

function DashboardView({ navigateTo, onNewCall, callLogs = [], contacts = [] }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const callsThisWeek = callLogs.filter(c => c.createdAt && new Date(c.createdAt).getTime() >= weekAgo).length;
  const transcribed = callLogs.filter(c => c.status === 'transcribed').length;
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">{greeting}</h1>
          <p className="text-slate-500 mt-1 text-sm">Here's what's happening today.</p>
        </div>
        <button
          onClick={onNewCall}
          className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-500 transition shadow-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <Phone className="w-4 h-4" /> New Call
        </button>
      </div>

      {/* 3 stat cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'This Week', fullLabel: 'Calls This Week', value: String(callsThisWeek), icon: Inbox, sub: `${callLogs.length} total`, view: 'calls' },
          { label: 'Transcribed', fullLabel: 'Transcribed', value: String(transcribed), icon: CheckCircle2, sub: `of ${callLogs.length} calls`, view: 'calls' },
          { label: 'Contacts', fullLabel: 'Contacts', value: String(contacts.length), icon: Users, sub: 'in database', view: 'contacts' },
        ].map((m, i) => (
          <div
            key={i}
            onClick={() => navigateTo(m.view)}
            className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-4 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-1 text-slate-400 mb-1.5 sm:mb-2">
              <m.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium truncate">
                <span className="sm:hidden">{m.label}</span>
                <span className="hidden sm:inline">{m.fullLabel}</span>
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900">{m.value}</div>
            <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 truncate">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick links + SMS */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigateTo('contacts')}
          className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-slate-300 hover:shadow-sm transition-all group"
        >
          <BookOpen className="w-5 h-5 text-slate-400 mb-2 group-hover:text-green-600 transition-colors" />
          <div className="text-sm font-semibold text-slate-800">Contacts</div>
          <div className="text-xs text-slate-400 mt-0.5">{contacts.length} clients</div>
        </button>
        <button
          onClick={() => navigateTo('inquiries')}
          className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-slate-300 hover:shadow-sm transition-all group"
        >
          <FileText className="w-5 h-5 text-slate-400 mb-2 group-hover:text-green-600 transition-colors" />
          <div className="text-sm font-semibold text-slate-800">Enquiries</div>
          <div className="text-xs text-slate-400 mt-0.5">Manage your pipeline</div>
        </button>
      </div>

      {/* SMS Compose */}
      <SmsQuickCompose />

      {/* Recent enquiries — full width */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-slate-400" /> Recent Enquiries
          </h3>
          <button onClick={() => navigateTo('calls')} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">View all</button>
        </div>
        <div className="divide-y divide-slate-100">
          {callLogs.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No calls yet</p>
          )}
          {callLogs.map(call => (
            <div
              key={call.id}
              onClick={() => navigateTo('calls', call.id)}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold flex-shrink-0 text-slate-700">
                  {call.caller.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900 group-hover:text-green-700 transition-colors">{call.caller}</div>
                  <div className="text-xs text-slate-400">{call.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  call.status === 'missed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {call.status === 'missed' ? 'Missed' : 'Transcribed'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Contacts ─────────────────────────────────────────────────────────────────
const QUOTE_STATUS_PILL = {
  draft:   'bg-slate-100 text-slate-600',
  sent:    'bg-blue-100 text-blue-700',
  viewed:  'bg-purple-100 text-purple-700',
  won:     'bg-green-100 text-green-700',
  lost:    'bg-red-100 text-red-600',
};

function ContactsView({ navigateTo, contacts = [], onRefresh, onCallAgain }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [smsOpen, setSmsOpen]     = useState(false);
  const [smsBody, setSmsBody]     = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [smsSent, setSmsSent]     = useState(false);
  const [emailOpen, setEmailOpen]   = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody]   = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = new, contact = edit
  const [form, setForm] = useState({ name: '', phone: '', email: '', event_type: '', notes: '' });
  const [showExtra, setShowExtra] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openNew = () => { setForm({ name: '', phone: '', email: '', event_type: '', notes: '' }); setShowExtra(false); setEditTarget(null); setModalOpen(true); };
  const openEdit = c => { setForm({ name: c.name || '', phone: c.phone || '', email: c.email || '', event_type: c.event_type || c.eventType || '', notes: c.notes || '' }); setShowExtra(!!(c.event_type || c.eventType || c.notes)); setEditTarget(c); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); };

  const saveContact = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await apiFetch(`/api/contacts/${editTarget.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      closeModal();
      onRefresh?.();
    } catch (e) { alert('Save failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const deleteContact = async (c) => {
    if (!confirm(`Delete ${c.name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/contacts/${c.id}`, { method: 'DELETE' });
      setSelected(null);
      onRefresh?.();
    } catch (e) { alert('Delete failed: ' + e.message); }
    finally { setDeleting(false); }
  };

  const openSms = () => { setSmsOpen(true); setSmsBody(''); setSmsSent(false); setEmailOpen(false); };
  const closeSms = () => { setSmsOpen(false); setSmsBody(''); setSmsSent(false); };

  const openEmail = (contact) => {
    setEmailSubject(`Following up from Show My Quote — ${contact.name}`);
    setEmailBody('');
    setEmailSent(false);
    setEmailOpen(true);
    setSmsOpen(false);
  };
  const closeEmail = () => { setEmailOpen(false); setEmailSubject(''); setEmailBody(''); setEmailSent(false); };
  const sendContactEmail = async (toAddress) => {
    if (!toAddress || !emailSubject.trim() || !emailBody.trim() || emailSending || emailSent) return;
    setEmailSending(true);
    try {
      const res = await apiFetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toAddress, subject: emailSubject.trim(), body: emailBody.trim() }),
      });
      if (res.ok) {
        setEmailSent(true);
        setTimeout(closeEmail, 2000);
      } else {
        const d = await res.json().catch(() => ({}));
        alert('Failed: ' + (d.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Failed: ' + e.message);
    } finally {
      setEmailSending(false);
    }
  };
  const sendContactSms = async (phone) => {
    if (!phone || !smsBody.trim() || smsSending || smsSent) return;
    setSmsSending(true);
    try {
      const res = await apiFetch('/api/sms-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, body: smsBody.trim() }),
      });
      if (res.ok) {
        setSmsSent(true);
        setTimeout(closeSms, 2000);
      } else {
        const d = await res.json().catch(() => ({}));
        alert('Failed: ' + (d.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Failed: ' + e.message);
    } finally {
      setSmsSending(false);
    }
  };

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.eventType || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const contact = selected ? contacts.find(c => c.id === selected) : null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Contact list panel */}
      <div className={`${contact ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r border-slate-200 bg-white flex-shrink-0`}>
        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900">Contacts</h2>
            <button
              onClick={openNew}
              className="flex items-center gap-1 text-xs font-semibold bg-slate-900 text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or event type…"
              className="w-full pl-9 pr-3 py-2 bg-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">No contacts found</div>
          )}
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors ${selected === c.id ? 'bg-green-50' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${c.color}`}>
                {c.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">{c.name}</div>
                <div className="text-xs text-slate-400 truncate">{c.eventType} · {c.calls[c.calls.length - 1]?.date}</div>
              </div>
              <div className="flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${QUOTE_STATUS_PILL[c.calls[c.calls.length - 1]?.quoteStatus] || 'bg-slate-100 text-slate-500'}`}>
                  {c.calls[c.calls.length - 1]?.quoteStatus}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Contact profile panel */}
      {contact ? (
        <div className="flex-1 overflow-y-auto bg-[#F7F7F5]">
          {/* Mobile back */}
          <div className="md:hidden px-4 pt-4">
            <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          </div>

          <div className="max-w-xl mx-auto p-4 md:p-8 space-y-5">
            {/* Profile header */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-start gap-4 shadow-sm">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${contact.color}`}>
                {contact.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{contact.name}</h2>
                    <div className="text-sm text-slate-500 mt-0.5">{contact.eventType} · {contact.calls.length} call{contact.calls.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(contact)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit contact"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteContact(contact)}
                      disabled={deleting}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                      title="Delete contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => onCallAgain?.(contact?.phone || '', null)} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                    <Phone className="w-3.5 h-3.5" /> Call Now
                  </button>
                  <button onClick={openSms} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                    <MessageSquare className="w-3.5 h-3.5" /> SMS
                  </button>
                  <button onClick={() => openEmail(contact)} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </button>
                  <button onClick={() => navigateTo('quote-builder')} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                    <Plus className="w-3.5 h-3.5" /> New Quote
                  </button>
                </div>

                {/* SMS compose — expands when SMS button is clicked */}
                {smsOpen && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500">To: {contact.phone}</span>
                      <button onClick={closeSms} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      autoFocus
                      value={smsBody}
                      onChange={e => setSmsBody(e.target.value)}
                      placeholder="Type your message…"
                      rows={3}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                    />
                    <button
                      onClick={() => sendContactSms(contact.phone)}
                      disabled={!smsBody.trim() || smsSending || smsSent}
                      className={`mt-2 w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                        smsSent    ? 'bg-green-100 text-green-700' :
                        smsSending ? 'bg-slate-100 text-slate-500 cursor-wait' :
                        !smsBody.trim() ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                        'bg-green-600 hover:bg-green-500 text-white'
                      }`}
                    >
                      {smsSent ? <><Check className="w-3.5 h-3.5" /> Sent!</> :
                       smsSending ? 'Sending…' :
                       <><Send className="w-3.5 h-3.5" /> Send SMS</>}
                    </button>
                  </div>
                )}

                {/* Email compose — expands when Email button is clicked */}
                {emailOpen && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500">To: {contact.email}</span>
                      <button onClick={closeEmail} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      autoFocus
                      type="text"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      placeholder="Subject…"
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                    />
                    <textarea
                      value={emailBody}
                      onChange={e => setEmailBody(e.target.value)}
                      placeholder="Write your message…"
                      rows={4}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                    />
                    <button
                      onClick={() => sendContactEmail(contact.email)}
                      disabled={!emailSubject.trim() || !emailBody.trim() || emailSending || emailSent}
                      className={`mt-2 w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                        emailSent    ? 'bg-green-100 text-green-700' :
                        emailSending ? 'bg-slate-100 text-slate-500 cursor-wait' :
                        !emailSubject.trim() || !emailBody.trim() ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                        'bg-green-600 hover:bg-green-500 text-white'
                      }`}
                    >
                      {emailSent ? <><Check className="w-3.5 h-3.5" /> Sent!</> :
                       emailSending ? 'Sending…' :
                       <><Send className="w-3.5 h-3.5" /> Send Email</>}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Contact details */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-800">Contact Details</span>
              </div>
              <div className="divide-y divide-slate-100 text-sm">
                <div className="flex items-center gap-3 px-5 py-3">
                  <Phone className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  <a href={`tel:${contact.phone}`} className="text-slate-700 hover:text-green-600 transition-colors">{contact.phone}</a>
                </div>
                <div className="flex items-center gap-3 px-5 py-3">
                  <Mail className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  <a href={`mailto:${contact.email}`} className="text-slate-700 hover:text-green-600 transition-colors">{contact.email}</a>
                </div>
                <div className="flex items-center gap-3 px-5 py-3">
                  <Tag className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  <span className="text-slate-700">{contact.eventType}</span>
                </div>
              </div>
            </div>

            {/* Call history */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-800">Call History</span>
              </div>
              {contact.calls.length === 0 ? (
                <p className="text-sm text-slate-400 px-5 py-4">No calls yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {contact.calls.map((call, i) => (
                    <div key={call.id} className="px-5 py-4 flex items-start gap-3">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center mt-1 flex-shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${call.status === 'missed' ? 'bg-red-400' : 'bg-green-500'}`} />
                        {i < contact.calls.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" style={{minHeight: 24}} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-900">{call.eventType}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${QUOTE_STATUS_PILL[call.quoteStatus] || 'bg-slate-100 text-slate-500'}`}>
                            {call.quoteStatus}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{call.date} · {call.duration}</div>
                        {call.quote && call.status !== 'missed' && (
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs font-semibold text-slate-700">Quote: {call.quote}</span>
                            <button
                              onClick={() => navigateTo('calls', call.id)}
                              className="text-xs text-green-600 hover:text-green-700 font-medium"
                            >
                              View details →
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty state on desktop when nothing selected */
        <div className="hidden md:flex flex-1 items-center justify-center bg-[#F7F7F5]">
          <div className="text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">Select a contact to view their profile</p>
          </div>
        </div>
      )}

      {/* Create / Edit contact modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-900">{editTarget ? 'Edit Contact' : 'New Contact'}</h3>
              <button onClick={closeModal} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Name *</label>
                <input
                  autoFocus
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Sarah & James"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+44 7700 900000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="sarah@example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                />
              </div>
              {!showExtra ? (
                <button
                  type="button"
                  onClick={() => setShowExtra(true)}
                  className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1 pt-1"
                >
                  <span className="text-base leading-none">+</span> Add title &amp; info
                </button>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Title</label>
                    <input
                      type="text"
                      value={form.event_type}
                      onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
                      placeholder="e.g. Roofing Contractor, VIP Client"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Info</label>
                    <textarea
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Any extra notes about this contact…"
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={closeModal}
                className="flex-1 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveContact}
                disabled={!form.name.trim() || saving}
                className="flex-1 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : (editTarget ? 'Save changes' : 'Add contact')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CallsListView({ navigateTo }) {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center">
            <Phone className="w-5 h-5 md:w-6 md:h-6 mr-3 text-slate-400" /> Call Inbox
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Live transcribed calls ready for quote generation.</p>
        </div>
      </div>
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[560px]">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
              <th className="px-6 py-3 font-medium">Caller</th>
              <th className="px-6 py-3 font-medium">Date & Time</th>
              <th className="px-6 py-3 font-medium">Duration</th>
              <th className="px-6 py-3 font-medium">AI Extraction</th>
              <th className="px-6 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MOCK_CALLS.map(call => (
              <tr key={call.id} className="hover:bg-slate-50 group transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{call.caller}</div>
                  <div className="text-sm text-slate-500">{call.phone}</div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{call.date}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{call.duration}</td>
                <td className="px-6 py-4">
                  {call.extracted.guestCount ? (
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200">{call.extracted.guestCount} guests</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200">{call.extracted.serviceStyle}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-sm italic">Processing...</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => navigateTo('calls', call.id)}
                    className="text-sm font-medium text-slate-900 bg-white border border-slate-300 px-3 py-1.5 rounded-md hover:bg-slate-50 shadow-sm"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CallDetailView({ call, navigateTo }) {
  if (!call) return null;
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-4 md:gap-8 h-[calc(100vh-3.5rem)] overflow-auto md:overflow-hidden">
      <div className="md:w-3/5 flex flex-col md:h-full bg-white border border-slate-200 rounded-lg shadow-sm min-h-[300px]">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-lg">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center">
              <PhoneCall className="w-5 h-5 mr-2 text-slate-400" /> {call.caller}
            </h2>
            <div className="text-sm text-slate-500 mt-1">{call.phone} • {call.date} • {call.duration}</div>
          </div>
          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Transcribed
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {call.transcript.map((line, i) => (
            <div key={i} className={`flex flex-col ${line.speaker === 'Agent' ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-slate-400 mb-1 ml-1">{line.speaker}</span>
              <div className={`p-3 rounded-lg max-w-[80%] text-sm ${
                line.speaker === 'Agent'
                  ? 'bg-slate-900 text-white rounded-tr-none'
                  : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
              }`}>
                {line.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="md:w-2/5 flex flex-col gap-4 md:gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex-1 overflow-y-auto">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
            AI Extracted Requirements
          </h3>
          <div className="space-y-4">
            {Object.entries(call.extracted).map(([key, value]) => {
              if (!value || (Array.isArray(value) && value.length === 0)) return null;
              return (
                <div key={key} className="group border-b border-slate-100 pb-3 last:border-0 hover:bg-slate-50 p-2 -mx-2 rounded transition-colors">
                  <div className="text-xs text-slate-500 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                  <div className="font-medium text-slate-900 flex items-center justify-between">
                    {Array.isArray(value) ? (
                      <div className="flex gap-2 flex-wrap">
                        {value.map(v => <span key={v} className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-xs border border-red-100">{v}</span>)}
                      </div>
                    ) : <span>{value}</span>}
                    <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-800 transition-opacity ml-2">
                      <FileEdit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 shadow-sm text-center">
          <p className="text-sm text-slate-600 mb-4">Create a formal inquiry and begin drafting a quote based on these extracted requirements.</p>
          <button
            onClick={() => navigateTo('quote-builder', call.extracted)}
            className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-md hover:bg-slate-800 transition shadow-sm flex items-center justify-center"
          >
            <Calculator className="w-4 h-4 mr-2" /> Generate Draft Quote
          </button>
        </div>
      </div>
    </div>
  );
}

function QuoteBuilderView({ initialData, navigateTo }) {
  const [quoteState, setQuoteState] = useState({
    clientName: initialData?.name || initialData?.client || '',
    guestCount: initialData?.guestCount || initialData?.guests || 0,
    serviceStyle: initialData?.serviceStyle || '',
    selectedMenuId: null,
    rentalsAmount: 0,
    dietaryNotes: initialData?.dietary?.join(', ') || '',
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleUpdate = (field, value) => setQuoteState(prev => ({ ...prev, [field]: value }));

  const menus = getStoredMenus();
  const menu = menus.find(m => m.id === quoteState.selectedMenuId) || menus[0];
  const baseFoodCost = quoteState.guestCount * (menu?.basePrice || 0);
  let styleMultiplier = 1;
  if (quoteState.serviceStyle === 'Plated') styleMultiplier = 1.35;
  if (quoteState.serviceStyle === 'Family Style') styleMultiplier = 1.15;
  const staffingCost = quoteState.guestCount * 15 * styleMultiplier;
  const dietarySurcharge = quoteState.dietaryNotes.length > 0 ? 150 : 0;
  const subtotal = baseFoodCost + staffingCost + quoteState.rentalsAmount + dietarySurcharge;
  const adminFee = subtotal * 0.18;
  const total = subtotal + adminFee;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); setPreviewOpen(true); }, 600);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://getmyquote.app/quote/preview/q-' + Date.now());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 md:h-[calc(100vh-3.5rem)] relative overflow-auto md:overflow-hidden">
      <div className="w-full md:w-2/3 bg-white rounded-lg p-4 md:p-8 overflow-y-auto pb-8 md:pb-32">
        <div className="mb-8">
          <input
            type="text"
            value={quoteState.clientName ? `${quoteState.clientName} — Roofing Quote` : 'Untitled Quote'}
            onChange={(e) => handleUpdate('clientName', e.target.value.split(' —')[0])}
            className="text-4xl font-bold text-slate-900 w-full outline-none placeholder-slate-300 border-b border-transparent focus:border-slate-200 transition-colors"
            placeholder="Quote Title"
          />
        </div>

        <div className="space-y-10">
          {/* Job Details */}
          <div className="group relative">
            <h3 className="text-lg font-semibold border-b border-slate-100 pb-2 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-slate-400" /> Job Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-slate-500 mb-1">Roof Squares</label>
                <input
                  type="number"
                  value={quoteState.guestCount}
                  onChange={(e) => handleUpdate('guestCount', parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Work Type</label>
                <select
                  value={quoteState.serviceStyle}
                  onChange={(e) => handleUpdate('serviceStyle', e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all"
                >
                  <option value="">Select type…</option>
                  <option>Full Replacement</option>
                  <option>Repair</option>
                  <option>Storm / Insurance</option>
                </select>
              </div>
            </div>
          </div>

          {/* Service Selection */}
          <div>
            <h3 className="text-lg font-semibold border-b border-slate-100 pb-2 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2 text-slate-400" /> Service Package
            </h3>
            <div className="space-y-3">
              {menus.length === 0 && (
                <p className="text-sm text-slate-400 py-2">No menus yet — add one in <button onClick={() => navigateTo('menus')} className="underline text-slate-600 hover:text-slate-900">Menus & Packages</button>.</p>
              )}
              {menus.map(m => (
                <div
                  key={m.id}
                  onClick={() => handleUpdate('selectedMenuId', m.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    (quoteState.selectedMenuId === m.id) || (!quoteState.selectedMenuId && m.id === menus[0]?.id)
                      ? 'border-slate-800 bg-slate-50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-900">{m.name}</div>
                      <div className="text-sm text-slate-500">{m.type}</div>
                    </div>
                    <div className="font-medium text-slate-900">${m.basePrice} <span className="text-slate-500 text-sm font-normal">/sq</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-lg font-semibold border-b border-slate-100 pb-2 mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-slate-400" /> Job Notes
            </h3>
            <textarea
              value={quoteState.dietaryNotes}
              onChange={(e) => handleUpdate('dietaryNotes', e.target.value)}
              placeholder="e.g. 2-storey, steep pitch, existing 1 layer. Rules apply automatically."
              className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all min-h-[80px] text-sm"
            />
          </div>

          {/* Extras */}
          <div>
            <h3 className="text-lg font-semibold border-b border-slate-100 pb-2 mb-4 flex items-center">
              <Tag className="w-5 h-5 mr-2 text-slate-400" /> Extras & Add-ons
            </h3>
            <div className="text-sm">
              <label className="block text-slate-500 mb-1">Extras Total ($)</label>
              <input
                type="number"
                value={quoteState.rentalsAmount}
                onChange={(e) => handleUpdate('rentalsAmount', parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full sm:w-1/2 p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all"
              />
              <p className="text-slate-400 text-xs mt-1">Gutters, fascia, decking, gutter guards, etc.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview Panel */}
      <div className="w-full md:w-1/3 flex flex-col">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 md:p-6 shadow-sm md:sticky md:top-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center justify-between">
            Live Preview
            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs lowercase normal-case">Drafting</span>
          </h3>

          <div className="space-y-4 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Materials ({quoteState.guestCount} sq @ ${menu.basePrice})</span>
              <span className="font-medium text-slate-900">${baseFoodCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <div className="flex items-center">
                Labor
                <span className="ml-2 bg-slate-200 text-slate-600 text-[10px] px-1.5 rounded uppercase font-bold tracking-wide">
                  {quoteState.serviceStyle}
                </span>
              </div>
              <span className="font-medium text-slate-900">${Math.round(staffingCost).toLocaleString()}</span>
            </div>
            {quoteState.rentalsAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Extras & Add-ons</span>
                <span className="font-medium text-slate-900">${quoteState.rentalsAmount.toLocaleString()}</span>
              </div>
            )}
            {dietarySurcharge > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Surcharges</span>
                <span className="font-medium text-slate-900">${dietarySurcharge.toLocaleString()}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-4 mt-2">
              <div className="flex justify-between text-slate-800 font-medium">
                <span>Subtotal</span>
                <span>${Math.round(subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500 mt-2 text-xs">
                <span>Service & Admin (18%)</span>
                <span>${Math.round(adminFee).toLocaleString()}</span>
              </div>
            </div>
            <div className="border-t-2 border-slate-900 pt-4 flex justify-between items-end">
              <div>
                <div className="text-xl font-bold text-slate-900">Total</div>
                <div className="text-xs text-slate-500 mt-1">Deposit (25%): ${Math.round(total * 0.25).toLocaleString()}</div>
              </div>
              <div className="text-2xl font-bold text-slate-900">${Math.round(total).toLocaleString()}</div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <button
              onClick={handleSave}
              className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-md hover:bg-slate-800 transition shadow-sm flex items-center justify-center"
            >
              {saved ? <><Check className="w-4 h-4 mr-2" /> Saved!</> : <><Eye className="w-4 h-4 mr-2" /> Save & Preview Client View</>}
            </button>
            <button
              onClick={handleCopyLink}
              className="w-full bg-white text-slate-700 border border-slate-300 font-medium py-2.5 rounded-md hover:bg-slate-50 transition shadow-sm flex items-center justify-center"
            >
              {copied ? <><Check className="w-4 h-4 mr-2 text-green-600" /><span className="text-green-600">Link Copied!</span></> : <><Copy className="w-4 h-4 mr-2" /> Copy Client Link</>}
            </button>
          </div>
        </div>
      </div>

      {previewOpen && (
        <ClientPreviewModal
          quoteState={quoteState}
          menu={menu}
          total={total}
          subtotal={subtotal}
          adminFee={adminFee}
          staffingCost={staffingCost}
          baseFoodCost={baseFoodCost}
          dietarySurcharge={dietarySurcharge}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}

function ClientPreviewModal({ quoteState, menu, total, subtotal, adminFee, staffingCost, baseFoodCost, dietarySurcharge, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-8" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Show My Quote</div>
              <h2 className="text-2xl font-bold text-slate-900">{quoteState.clientName || 'Your'} Event Quote</h2>
              <div className="text-sm text-slate-500 mt-1">Quote #GMQ-{Date.now().toString().slice(-5)} · Valid 30 days</div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 mb-6 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Guests</span><span className="font-medium">{quoteState.guestCount}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Service Style</span><span className="font-medium">{quoteState.serviceStyle}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Menu</span><span className="font-medium">{menu.name}</span></div>
            {quoteState.dietaryNotes && <div className="flex justify-between"><span className="text-slate-500">Dietary Notes</span><span className="font-medium text-right max-w-[200px]">{quoteState.dietaryNotes}</span></div>}
          </div>

          <div className="space-y-3 text-sm mb-6">
            <div className="flex justify-between"><span className="text-slate-600">Materials</span><span>${Math.round(baseFoodCost).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Labor</span><span>${Math.round(staffingCost).toLocaleString()}</span></div>
            {quoteState.rentalsAmount > 0 && <div className="flex justify-between"><span className="text-slate-600">Extras & Add-ons</span><span>${quoteState.rentalsAmount.toLocaleString()}</span></div>}
            {dietarySurcharge > 0 && <div className="flex justify-between"><span className="text-slate-600">Surcharges</span><span>${dietarySurcharge.toLocaleString()}</span></div>}
            <div className="flex justify-between text-slate-500 border-t border-slate-100 pt-3"><span>Service & Admin</span><span>${Math.round(adminFee).toLocaleString()}</span></div>
            <div className="flex justify-between font-bold text-slate-900 text-lg border-t-2 border-slate-900 pt-3">
              <span>Total</span><span>${Math.round(total).toLocaleString()}</span>
            </div>
            <div className="text-xs text-slate-400">Deposit required to book: ${Math.round(total * 0.25).toLocaleString()}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="bg-slate-900 text-white font-medium py-2.5 rounded-md hover:bg-slate-800 transition text-sm flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Accept Quote
            </button>
            <button className="bg-white text-slate-700 border border-slate-300 font-medium py-2.5 rounded-md hover:bg-slate-50 transition text-sm">
              Request Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuotesView({ navigateTo, quotes = [] }) {
  const [filter, setFilter] = useState('all');
  const tabs = ['all', 'draft', 'sent', 'viewed', 'won', 'lost'];
  const filtered = filter === 'all' ? quotes : quotes.filter(q => q.status === filter);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Quotes</h1>
          <p className="text-slate-500 mt-1 text-sm">All quotes across your pipeline.</p>
        </div>
        <button
          onClick={() => navigateTo('quote-builder')}
          className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition shadow-sm flex items-center self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-2" /> New Quote
        </button>
      </div>

      <div className="flex gap-1 mb-5 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              filter === tab
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
            <span className="ml-2 text-xs text-slate-400">
              {tab === 'all' ? quotes.length : quotes.filter(q => q.status === tab).length}
            </span>
          </button>
        ))}
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
              <th className="px-6 py-3 font-medium">Client</th>
              <th className="px-6 py-3 font-medium">Event</th>
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Menu</th>
              <th className="px-6 py-3 font-medium">Amount</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(quote => (
              <tr
                key={quote.id}
                onClick={() => navigateTo('quote-builder', { name: quote.client, guestCount: quote.guests, serviceStyle: quote.serviceStyle, dietary: quote.dietary })}
                className="hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <td className="px-6 py-4 font-medium text-slate-900 group-hover:text-blue-600">{quote.client}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{quote.eventType}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{quote.eventDate}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{quote.menu}</td>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">${quote.amount.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_STYLES[quote.status]}`}>
                    {quote.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => navigateTo('quote-builder', quote)} className="text-sm text-slate-500 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">No quotes with status "{filter}".</div>
        )}
      </div>
    </div>
  );
}

const LEAD_STATUSES = [
  { value: 'new',            label: 'New Lead',        color: 'bg-blue-100 text-blue-700' },
  { value: 'called',         label: 'Called',          color: 'bg-yellow-100 text-yellow-700' },
  { value: 'interested',     label: 'Interested',      color: 'bg-purple-100 text-purple-700' },
  { value: 'demo_booked',    label: 'Demo Booked',     color: 'bg-orange-100 text-orange-700' },
  { value: 'client',         label: 'Client ✓',        color: 'bg-green-100 text-green-700' },
  { value: 'not_interested', label: 'Not Interested',  color: 'bg-slate-100 text-slate-500' },
];

function LeadStatusBadge({ status }) {
  const s = LEAD_STATUSES.find(x => x.value === status) || LEAD_STATUSES[0];
  return <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${s.color}`}>{s.label}</span>;
}

function InquiriesView({ navigateTo, onCall }) {
  const [tab, setTab] = useState('pipeline');

  // ── Pipeline state ──
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [researchLead, setResearchLead] = useState(null); // lead with open research panel
  const [researchLoading, setResearchLoading] = useState(false);
  const [editingNotes, setEditingNotes] = useState(null); // lead id
  const [notesDraft, setNotesDraft] = useState('');

  // ── Generator state ──
  const [genQuery, setGenQuery] = useState('roofing contractor');
  const [genLocation, setGenLocation] = useState('Houston, TX');
  const [genLimit, setGenLimit] = useState(20);
  const [genMinReviews, setGenMinReviews] = useState(0);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState(null);
  const [genResults, setGenResults] = useState([]);
  const [genSelected, setGenSelected] = useState(new Set());
  const [addingLeads, setAddingLeads] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  // Load leads from DB
  useEffect(() => {
    setLeadsLoading(true);
    apiFetch('/api/leads')
      .then(r => r.json())
      .then(d => setLeads(d.leads || []))
      .catch(() => {})
      .finally(() => setLeadsLoading(false));
  }, []);

  // ── Pipeline helpers ──
  const patchLead = async (id, updates) => {
    const res = await apiFetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const d = await res.json();
    if (d.lead) setLeads(prev => prev.map(l => l.id === id ? d.lead : l));
  };

  const deleteLead = async (id) => {
    await apiFetch(`/api/leads/${id}`, { method: 'DELETE' });
    setLeads(prev => prev.filter(l => l.id !== id));
    if (researchLead?.id === id) setResearchLead(null);
  };

  const addToContacts = async (lead) => {
    const res = await apiFetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: lead.business_name, phone: lead.phone, email: lead.email }),
    });
    const d = await res.json();
    const contactId = d.contact?.id || d.contacts?.[0]?.id;
    if (contactId) await patchLead(lead.id, { contact_id: contactId });
  };

  const fetchResearch = async (lead) => {
    if (lead.ai_research) { setResearchLead(lead); return; }
    setResearchLead(lead);
    setResearchLoading(true);
    try {
      const res = await apiFetch('/api/leads-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: lead.business_name,
          city: lead.city,
          state: lead.state,
          phone: lead.phone,
          website: lead.website,
          rating: lead.rating,
          reviews_count: lead.reviews_count,
        }),
      });
      const d = await res.json();
      if (d.research) {
        await patchLead(lead.id, { ai_research: d.research });
        setResearchLead(prev => ({ ...prev, ai_research: d.research }));
      }
    } catch {}
    setResearchLoading(false);
  };

  const filteredLeads = leads.filter(l => {
    if (filterStatus !== 'all' && l.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.business_name || '').toLowerCase().includes(q) ||
             (l.city || '').toLowerCase().includes(q) ||
             (l.phone || '').toLowerCase().includes(q);
    }
    return true;
  });

  // Status counts for summary chips
  const statusCounts = LEAD_STATUSES.reduce((acc, s) => {
    acc[s.value] = leads.filter(l => l.status === s.value).length;
    return acc;
  }, {});

  // ── Generator helpers ──
  const runScrape = async () => {
    setGenLoading(true);
    setGenError(null);
    setGenResults([]);
    setGenSelected(new Set());
    setAddedCount(0);
    try {
      const res = await apiFetch('/api/leads-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: genQuery,
          location: genLocation,
          limit: genLimit,
          minReviews: genMinReviews,
        }),
      });
      const d = await res.json();
      if (d.error) { setGenError(d.error); }
      else { setGenResults(d.leads || []); }
    } catch (err) {
      setGenError(err.message);
    }
    setGenLoading(false);
  };

  const toggleGenSelect = (idx) => {
    setGenSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const addSelectedToPipeline = async () => {
    const rows = [...genSelected].map(i => genResults[i]);
    if (!rows.length) return;
    setAddingLeads(true);
    try {
      const res = await apiFetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows),
      });
      const d = await res.json();
      const newLeads = d.leads || [];
      setLeads(prev => [...newLeads, ...prev]);
      setAddedCount(newLeads.length);
      setGenSelected(new Set());
      // Remove added rows from results
      const addedPlaceIds = new Set(newLeads.map(l => l.google_place_id).filter(Boolean));
      setGenResults(prev => prev.filter(r => !addedPlaceIds.has(r.google_place_id)));
    } catch {}
    setAddingLeads(false);
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-slate-900">Leads</h1>
            <span className="text-xs text-slate-400">{leads.length} in pipeline</span>
          </div>
          <div className="flex gap-1">
            {[['pipeline', 'Pipeline'], ['generator', 'Lead Generator']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setTab(v)}
                className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${tab === v ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* ── PIPELINE TAB ── */}
        {tab === 'pipeline' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {/* Status filter chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${filterStatus === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}
              >
                All ({leads.length})
              </button>
              {LEAD_STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setFilterStatus(filterStatus === s.value ? 'all' : s.value)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${filterStatus === s.value ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}
                >
                  {s.label} ({statusCounts[s.value] || 0})
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search leads..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            {leadsLoading && (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
              </div>
            )}

            {!leadsLoading && filteredLeads.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium mb-1">No leads yet</p>
                <p className="text-xs mb-4">Generate leads from Google Maps to start your pipeline</p>
                <button
                  onClick={() => setTab('generator')}
                  className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition"
                >
                  Generate Leads
                </button>
              </div>
            )}

            {!leadsLoading && filteredLeads.length > 0 && (
              <div className="space-y-2">
                {filteredLeads.map(lead => (
                  <div key={lead.id} className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0">
                        {(lead.business_name || '?')[0].toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900 text-sm truncate">{lead.business_name}</span>
                          {lead.city && <span className="text-xs text-slate-400">{lead.city}{lead.state ? `, ${lead.state}` : ''}</span>}
                          <LeadStatusBadge status={lead.status} />
                          {lead.contact_id && <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded">In Contacts ✓</span>}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mb-2">
                          {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>}
                          {lead.rating && <span>★ {lead.rating} ({lead.reviews_count || 0} reviews)</span>}
                          {lead.last_contacted_at && (
                            <span>Last contact: {new Date(lead.last_contacted_at).toLocaleDateString()}</span>
                          )}
                        </div>

                        {/* Status dropdown */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <select
                            value={lead.status || 'new'}
                            onChange={e => patchLead(lead.id, { status: e.target.value, last_contacted_at: e.target.value === 'called' ? new Date().toISOString() : lead.last_contacted_at })}
                            className="text-xs border border-slate-200 rounded px-2 py-1 bg-slate-50 focus:outline-none"
                          >
                            {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>

                        {/* Notes */}
                        {editingNotes === lead.id ? (
                          <div className="flex gap-2 mb-2">
                            <input
                              autoFocus
                              value={notesDraft}
                              onChange={e => setNotesDraft(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { patchLead(lead.id, { notes: notesDraft }); setEditingNotes(null); }
                                if (e.key === 'Escape') setEditingNotes(null);
                              }}
                              placeholder="Add notes..."
                              className="flex-1 text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-900"
                            />
                            <button onClick={() => { patchLead(lead.id, { notes: notesDraft }); setEditingNotes(null); }} className="text-xs px-2 py-1 bg-slate-900 text-white rounded">Save</button>
                            <button onClick={() => setEditingNotes(null)} className="text-xs px-2 py-1 border border-slate-200 rounded">Cancel</button>
                          </div>
                        ) : lead.notes ? (
                          <div
                            onClick={() => { setEditingNotes(lead.id); setNotesDraft(lead.notes || ''); }}
                            className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1 mb-2 cursor-pointer hover:bg-slate-100 border border-slate-200 italic"
                          >
                            {lead.notes}
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingNotes(lead.id); setNotesDraft(''); }}
                            className="text-xs text-slate-400 hover:text-slate-600 mb-2"
                          >
                            + Add notes
                          </button>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        {lead.phone && onCall && (
                          <button
                            onClick={() => { patchLead(lead.id, { status: 'called', last_contacted_at: new Date().toISOString() }); onCall(lead.phone, lead); }}
                            title="Call"
                            className="p-1.5 rounded bg-green-50 hover:bg-green-100 text-green-700 transition"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => fetchResearch(lead)}
                          title="AI Research"
                          className="p-1.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 transition"
                        >
                          <Search className="w-3.5 h-3.5" />
                        </button>
                        {!lead.contact_id && (
                          <button
                            onClick={() => addToContacts(lead)}
                            title="Add to Contacts"
                            className="p-1.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => { if (window.confirm(`Delete ${lead.business_name}?`)) deleteLead(lead.id); }}
                          title="Delete"
                          className="p-1.5 rounded bg-red-50 hover:bg-red-100 text-red-500 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── GENERATOR TAB ── */}
        {tab === 'generator' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-2xl">
              <p className="text-sm text-slate-500 mb-5">Search Google Maps for roofing contractors and add them to your pipeline.</p>

              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Search query</label>
                    <input
                      value={genQuery}
                      onChange={e => setGenQuery(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Location</label>
                    <input
                      value={genLocation}
                      onChange={e => setGenLocation(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-2">Number of leads</label>
                  <div className="flex gap-2 flex-wrap">
                    {[10, 20, 30, 50].map(n => (
                      <button
                        key={n}
                        onClick={() => setGenLimit(n)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${genLimit === n ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Min reviews <span className="text-slate-400">(proxy for business size)</span></label>
                  <div className="flex gap-2 flex-wrap">
                    {[{ label: 'Any', val: 0 }, { label: '5+', val: 5 }, { label: '10+', val: 10 }, { label: '25+', val: 25 }].map(o => (
                      <button
                        key={o.val}
                        onClick={() => setGenMinReviews(o.val)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${genMinReviews === o.val ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={runScrape}
                  disabled={genLoading || !genQuery || !genLocation}
                  className="w-full py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {genLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Scraping Google Maps…
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4" />
                      Generate Leads
                    </>
                  )}
                </button>
              </div>

              {genError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mb-4">
                  {genError.includes('APIFY_API_TOKEN') ? (
                    <div>
                      <p className="font-medium mb-1">Apify API token not configured</p>
                      <p className="text-xs text-red-600">1. Sign up free at <strong>apify.com</strong> — you get $5/month credit (~1,000 leads free every month)</p>
                      <p className="text-xs text-red-600">2. Go to Settings → Integrations → API tokens and copy your token</p>
                      <p className="text-xs text-red-600">3. Add <code className="bg-red-100 px-1 rounded">APIFY_API_TOKEN</code> to your Vercel environment variables</p>
                      <p className="text-xs text-red-600">4. Redeploy</p>
                    </div>
                  ) : (
                    <p>{genError}</p>
                  )}
                </div>
              )}

              {genResults.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={genSelected.size === genResults.length}
                          onChange={e => setGenSelected(e.target.checked ? new Set(genResults.map((_, i) => i)) : new Set())}
                          className="rounded border-slate-300"
                        />
                        Select all
                      </label>
                      <span className="text-xs text-slate-400">{genResults.length} results</span>
                    </div>
                    {genSelected.size > 0 && (
                      <button
                        onClick={addSelectedToPipeline}
                        disabled={addingLeads}
                        className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition flex items-center gap-1.5"
                      >
                        {addingLeads ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-3 h-3" />}
                        Add {genSelected.size} to Pipeline
                      </button>
                    )}
                  </div>

                  {addedCount > 0 && (
                    <div className="px-4 py-2 bg-green-50 border-b border-green-100 text-xs text-green-700 flex items-center gap-1.5">
                      <Check className="w-3 h-3" />
                      {addedCount} lead{addedCount !== 1 ? 's' : ''} added to pipeline
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead className="text-xs text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="w-8 px-3 py-2"></th>
                          <th className="px-3 py-2 text-left font-medium">Business</th>
                          <th className="px-3 py-2 text-left font-medium">Phone</th>
                          <th className="px-3 py-2 text-left font-medium">Rating</th>
                          <th className="px-3 py-2 text-left font-medium">City</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {genResults.map((r, i) => {
                          const alreadyExists = r.google_place_id
                            ? leads.some(l => l.google_place_id === r.google_place_id)
                            : r.phone
                              ? leads.some(l => l.phone && l.phone.replace(/\D/g,'') === r.phone.replace(/\D/g,''))
                              : false;
                          return (
                            <tr
                              key={i}
                              className={`${alreadyExists ? 'opacity-50 cursor-not-allowed bg-slate-50' : genSelected.has(i) ? 'bg-blue-50 cursor-pointer' : 'hover:bg-slate-50 cursor-pointer'}`}
                              onClick={() => !alreadyExists && toggleGenSelect(i)}
                            >
                              <td className="px-3 py-2">
                                {alreadyExists
                                  ? <Check className="w-3.5 h-3.5 text-slate-400" />
                                  : <input type="checkbox" checked={genSelected.has(i)} onChange={() => toggleGenSelect(i)} className="rounded border-slate-300" onClick={e => e.stopPropagation()} />
                                }
                              </td>
                              <td className="px-3 py-2 font-medium text-slate-900 max-w-[180px] truncate">
                                {r.business_name}
                                {alreadyExists && <span className="ml-2 text-[10px] text-slate-400 font-normal">already added</span>}
                              </td>
                              <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.phone || '—'}</td>
                              <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.rating ? `★ ${r.rating} (${r.reviews_count})` : '—'}</td>
                              <td className="px-3 py-2 text-slate-500">{r.city || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── AI RESEARCH PANEL ── */}
      {researchLead && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setResearchLead(null)}>
          <div className="w-full sm:w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
              <div>
                <h2 className="font-semibold text-slate-900 text-sm">{researchLead.business_name}</h2>
                <p className="text-xs text-slate-400">AI Research Brief</p>
              </div>
              <button onClick={() => setResearchLead(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {researchLoading && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin mb-3" />
                  <p className="text-sm">Researching with AI…</p>
                  <p className="text-xs mt-1">This may take 15–30 seconds</p>
                </div>
              )}

              {!researchLoading && researchLead.ai_research && (() => {
                const r = researchLead.ai_research;
                return (
                  <div className="space-y-5 text-sm">
                    {(r.ownerName || r.companySize || r.yearsInBusiness) && (
                      <div className="grid grid-cols-2 gap-3">
                        {r.ownerName && <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-400 mb-0.5">Owner</p><p className="font-medium text-slate-800">{r.ownerName}</p></div>}
                        {r.companySize && <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-400 mb-0.5">Size</p><p className="font-medium text-slate-800">{r.companySize}</p></div>}
                        {r.yearsInBusiness && <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-400 mb-0.5">In Business</p><p className="font-medium text-slate-800">{r.yearsInBusiness}</p></div>}
                      </div>
                    )}

                    {r.callOpener && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-green-700 mb-1.5 flex items-center gap-1"><Phone className="w-3 h-3" /> Call Opener</p>
                        <p className="text-slate-800 font-medium leading-relaxed">{r.callOpener}</p>
                      </div>
                    )}

                    {r.painPoints?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Pain Points</p>
                        <ul className="space-y-1.5">
                          {r.painPoints.map((p, i) => <li key={i} className="flex gap-2 text-slate-700"><span className="text-slate-400 flex-shrink-0">•</span>{p}</li>)}
                        </ul>
                      </div>
                    )}

                    {r.talkingPoints?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Talking Points</p>
                        <ol className="space-y-1.5 list-decimal list-inside">
                          {r.talkingPoints.map((p, i) => <li key={i} className="text-slate-700">{p}</li>)}
                        </ol>
                      </div>
                    )}

                    {r.objectionHandling?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Objection Handling</p>
                        <div className="space-y-2">
                          {r.objectionHandling.map((o, i) => (
                            <div key={i} className="bg-slate-50 rounded-lg p-3 text-xs text-slate-700 leading-relaxed">{o}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {!researchLoading && !researchLead.ai_research && (
                <div className="text-center py-12 text-slate-400 text-sm">No research data yet.</div>
              )}
            </div>

            {researchLead.phone && onCall && (
              <div className="flex-shrink-0 p-4 border-t border-slate-200">
                <button
                  onClick={() => { patchLead(researchLead.id, { status: 'called', last_contacted_at: new Date().toISOString() }); onCall(researchLead.phone, researchLead); setResearchLead(null); }}
                  className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" /> Call {researchLead.business_name}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MenusView() {
  const [menus, setMenus] = useState(() => getStoredMenus());
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => { saveStoredMenus(menus); }, [menus]);

  const openMenu = (menu) => { setSelected(menu); setEditing(false); setEditForm(null); };

  const startEdit = () => { setEditing(true); setEditForm({ ...selected }); };

  const saveEdit = () => {
    setMenus(prev => prev.map(m => m.id === editForm.id ? editForm : m));
    setSelected(editForm);
    setEditing(false);
  };

  const handleNewMenu = () => {
    const blank = { id: `m${Date.now()}`, name: 'New Menu', type: 'Buffet', basePrice: 60, tags: [], description: '', minGuests: 20, maxGuests: 300, courses: [] };
    setMenus(prev => [...prev, blank]);
    setSelected(blank);
    setEditing(true);
    setEditForm(blank);
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">Menus & Packages</h1>
              <p className="text-slate-500 text-sm mt-1">Manage your roofing service types and per-square pricing.</p>
            </div>
            <button
              onClick={handleNewMenu}
              className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition shadow-sm flex items-center self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 mr-2" /> New Menu
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {menus.map(menu => (
              <div
                key={menu.id}
                onClick={() => openMenu(menu)}
                className={`border rounded-lg p-5 cursor-pointer transition-all bg-white shadow-sm hover:shadow-md ${selected?.id === menu.id ? 'border-slate-800 ring-1 ring-slate-800' : 'border-slate-200 hover:border-slate-400'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{menu.name}</h3>
                    <div className="text-sm text-slate-500 mt-0.5">{menu.type}</div>
                  </div>
                  {menu.tags.map(tag => (
                    <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">{tag}</span>
                  ))}
                </div>
                <div className="text-2xl font-bold text-slate-900 mb-1">${menu.basePrice}<span className="text-sm font-normal text-slate-500">/sq</span></div>
                <div className="text-xs text-slate-400">{menu.minGuests}–{menu.maxGuests} squares</div>
                {menu.description && <p className="text-xs text-slate-500 mt-3 line-clamp-2">{menu.description}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail / Edit Panel */}
      {selected && (
        <div className="fixed inset-0 z-30 md:relative md:inset-auto md:z-auto md:w-96 border-l border-slate-200 bg-white flex flex-col overflow-y-auto shadow-xl md:shadow-none">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-slate-900">{editing ? 'Edit Menu' : selected.name}</h2>
              {!editing && <div className="text-sm text-slate-500 mt-0.5">${selected.basePrice}/sq · {selected.type}</div>}
            </div>
            <div className="flex items-center gap-2">
              {!editing && (
                <button onClick={startEdit} className="text-slate-500 hover:text-slate-900 p-1.5 hover:bg-slate-100 rounded transition-colors">
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => { setSelected(null); setEditing(false); }} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-6 flex-1 space-y-5">
            {editing && editForm ? (
              <div className="space-y-4 text-sm">
                {[
                  { label: 'Menu Name', field: 'name', type: 'text' },
                  { label: 'Base Price ($/sq)', field: 'basePrice', type: 'number' },
                  { label: 'Min Squares', field: 'minGuests', type: 'number' },
                  { label: 'Max Squares', field: 'maxGuests', type: 'number' },
                ].map(({ label, field, type }) => (
                  <div key={field}>
                    <label className="block text-slate-500 mb-1">{label}</label>
                    <input
                      type={type}
                      value={editForm[field]}
                      onChange={e => setEditForm(p => ({ ...p, [field]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                      className="w-full p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-slate-500 mb-1">Service Type</label>
                  <select
                    value={editForm.type}
                    onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white outline-none"
                  >
                    {['Plated', 'Buffet', 'Family Style', 'Cocktail'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none min-h-[80px]"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={saveEdit} className="flex-1 bg-slate-900 text-white py-2 rounded-md font-medium hover:bg-slate-800 transition text-sm">Save</button>
                  <button onClick={() => { setEditing(false); setEditForm(null); }} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-md hover:bg-slate-50 transition text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                {selected.description && <p className="text-sm text-slate-600">{selected.description}</p>}
                {selected.courses?.map(course => (
                  <div key={course.name}>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{course.name}</div>
                    <ul className="space-y-1">
                      {course.items.map(item => (
                        <li key={item} className="text-sm text-slate-700 flex items-center">
                          <span className="w-1 h-1 rounded-full bg-slate-400 mr-2 inline-block flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {(!selected.courses || selected.courses.length === 0) && (
                  <div className="text-sm text-slate-400 italic">No courses added yet. Click edit to add items.</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Natural Language Rule Parser ─────────────────────────────────────────────
function parseNaturalRule(text) {
  const t   = text.trim();
  const low = t.toLowerCase();

  const fix = n => parseFloat(n);
  const fmtMultiplier = n => (fix(n) % 1 === 0 ? fix(n).toString() : fix(n).toFixed(3).replace(/0+$/, '').replace(/\.$/, ''));

  // add $X per storey above N
  let m = low.match(/(?:add|charge)\s+\$(\d+(?:\.\d+)?)\s+per\s+stor(?:ey|y)\s+(?:above|over|beyond)\s+(\d+)/);
  if (m) return { condition: `stories > ${m[2]}`, action: `Add $${m[1]} per storey above ${m[2]}`, expression: `(stories - ${m[2]}) × $${m[1]}`, confidence: 'high' };

  // add/apply X% surcharge for steep pitch
  m = low.match(/(?:add|apply|charge)\s+(\d+(?:\.\d+)?)%\s*(?:surcharge|markup|extra)?\s+for\s+(?:steep|high)\s+pitch/);
  if (m) return { condition: 'pitch > 8:12', action: `Add ${m[1]}% steep pitch surcharge`, expression: `total × ${fmtMultiplier(1 + fix(m[1]) / 100)}`, confidence: 'high' };

  // add/apply X% surcharge if squares exceed N
  m = low.match(/(?:add|apply|charge)\s+(\d+(?:\.\d+)?)%\s*(?:surcharge|markup|extra|more)?\s+(?:if|when)\s+squares?\s+(?:exceed|over|more\s+than|>)\s*(\d+)/);
  if (m) return { condition: `squares > ${m[2]}`, action: `Add ${m[1]}% surcharge`, expression: `total × ${fmtMultiplier(1 + fix(m[1]) / 100)}`, confidence: 'high' };

  // apply X% discount if squares exceed N (volume)
  m = low.match(/(?:apply|give|add|offer)\s+(\d+(?:\.\d+)?)%\s+(?:volume\s+)?discount\s+(?:if|when|for)\s+squares?\s+(?:exceed|over|more\s+than|>)\s*(\d+)/);
  if (m) return { condition: `squares > ${m[2]}`, action: `Apply ${m[1]}% discount`, expression: `total × ${fmtMultiplier(1 - fix(m[1]) / 100)}`, confidence: 'high' };

  // add $X if squares exceed N
  m = low.match(/(?:add|charge|apply)\s+(?:a\s+)?(?:flat\s+)?\$(\d+(?:\.\d+)?)\s+(?:fee\s+)?(?:if|when)\s+squares?\s+(?:exceed|over|more\s+than|>)\s*(\d+)/);
  if (m) return { condition: `squares > ${m[2]}`, action: `Add flat fee $${m[1]}`, expression: `total += $${m[1]}`, confidence: 'high' };

  // minimum quote/total of $X
  m = low.match(/minimum\s+(?:quote|total|price|charge|order)?\s*(?:of\s+)?\$(\d+(?:\.\d+)?)/);
  if (m) return { condition: `total < $${m[1]}`, action: `Enforce minimum of $${m[1]}`, expression: `total = max(total, $${m[1]})`, confidence: 'high' };

  // charge $X per square
  m = low.match(/(?:add|charge)\s+\$(\d+(?:\.\d+)?)\s+per\s+(?:square|sq)/);
  if (m) return { condition: 'squares > 0', action: `Add $${m[1]} per square`, expression: `total += squares × $${m[1]}`, confidence: 'high' };

  // add $X for travel/mileage
  m = low.match(/(?:add|charge)\s+\$(\d+(?:\.\d+)?)\s+(?:travel\s+fee|for\s+travel|for\s+jobs?\s+(?:over|beyond|more\s+than))\s*(?:(\d+)\s*miles?)?/);
  if (m) { const miles = m[2] || '30'; return { condition: `distance > ${miles} miles`, action: `Add travel fee $${m[1]}`, expression: `total += $${m[1]}`, confidence: 'high' }; }

  // add X% for material type (impact/class 4)
  m = low.match(/(?:add|charge|apply)\s+(\d+(?:\.\d+)?)%\s+(?:for\s+)?(?:impact.resistant|class\s+4|premium\s+shingle)/);
  if (m) return { condition: 'material = Impact-resistant', action: `Add ${m[1]}% material uplift`, expression: `total × ${fmtMultiplier(1 + fix(m[1]) / 100)}`, confidence: 'high' };

  // add X% for multi-storey / 2-storey / two-storey
  m = low.match(/(?:add|apply|charge)\s+(\d+(?:\.\d+)?)%\s+(?:surcharge\s+)?for\s+(?:multi.stor(?:ey|y)|2.stor(?:ey|y)|two.stor(?:ey|y))/);
  if (m) return { condition: 'stories > 1', action: `Add ${m[1]}% multi-storey surcharge`, expression: `total × ${fmtMultiplier(1 + fix(m[1]) / 100)}`, confidence: 'high' };

  // multiply [total/labor] by X
  m = low.match(/multiply\s+(?:total|labor|labour|materials?)\s+by\s+(\d+(?:\.\d+)?)/);
  if (m) return { condition: 'always', action: `Multiply total by ${m[1]}`, expression: `total × ${m[1]}`, confidence: 'high' };

  // reduce/subtract/deduct $X if/when
  m = low.match(/(?:reduce|subtract|deduct|remove)\s+\$(\d+(?:\.\d+)?)\s+(?:if|when|for)\s+(.+)/);
  if (m) return { condition: m[2].trim(), action: `Deduct $${m[1]}`, expression: `total -= $${m[1]}`, confidence: 'medium' };

  // add X% for [work type]
  m = low.match(/add\s+(\d+(?:\.\d+)?)%\s+(?:surcharge\s+)?for\s+(replacement|repair|emergency|commercial|residential)/);
  if (m) { const et = m[2].charAt(0).toUpperCase() + m[2].slice(1); return { condition: `workType = ${et}`, action: `Add ${m[1]}% surcharge`, expression: `total × ${fmtMultiplier(1 + fix(m[1]) / 100)}`, confidence: 'high' }; }

  // fallback — has a $ amount but pattern unknown
  if (/\$\d+/.test(low) && t.length > 8) return { condition: '—', action: t, expression: 'Pattern not recognised', confidence: 'low' };

  return { condition: '—', action: t, expression: 'Pattern not recognised', confidence: 'low' };
}

// ─── Pricing Rules View ────────────────────────────────────────────────────────
function PricingRulesView() {
  const [rules, setRules] = useState(MOCK_RULES_INITIAL);
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const parsed = input.trim().length > 5 ? parseNaturalRule(input) : null;

  const commitRule = () => {
    if (!parsed || parsed.confidence === 'low') return;
    setRules(prev => [...prev, { id: `r${Date.now()}`, ...parsed, raw: input }]);
    setInput('');
    inputRef.current?.focus();
  };

  const deleteRule = id => setRules(prev => prev.filter(r => r.id !== id));

  const EXAMPLES = [
    'add $150 per storey above 1',
    'add 25% surcharge for steep pitch',
    'apply 5% discount if squares exceed 35',
    'minimum quote of $2000',
    'add $150 travel fee for jobs over 30 miles',
    'add 22% for impact-resistant shingles',
  ];

  const CONF = {
    high:   { label: 'Rule recognised',      dot: 'bg-green-500',  text: 'text-green-700',  wrap: 'bg-green-50 border-green-200' },
    medium: { label: 'Partially recognised', dot: 'bg-yellow-500', text: 'text-yellow-700', wrap: 'bg-yellow-50 border-yellow-200' },
    low:    { label: 'Not recognised',       dot: 'bg-red-400',    text: 'text-red-700',    wrap: 'bg-red-50 border-red-200' },
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-1">Pricing Rules Engine</h1>
        <p className="text-slate-500 text-sm">Type a rule in plain English — it's automatically converted to an expression.</p>
      </div>

      {/* ── Natural language input ── */}
      <div className="mb-8">
        <div className={`bg-white border-2 rounded-xl shadow-sm transition-colors ${focused ? 'border-slate-900' : 'border-slate-200'}`}>

          {/* Input row */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-2">
            <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center flex-shrink-0">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={e => e.key === 'Enter' && commitRule()}
              placeholder='Type a rule in plain English…'
              className="flex-1 text-slate-900 placeholder-slate-400 outline-none text-sm md:text-base bg-transparent"
            />
            {input && (
              <button onClick={() => setInput('')} className="text-slate-400 hover:text-slate-600 flex-shrink-0 p-1">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Example chips — shown when empty */}
          {!input && (
            <div className="px-4 pb-3 flex flex-wrap gap-1.5">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onMouseDown={e => { e.preventDefault(); setInput(ex); inputRef.current?.focus(); }}
                  className="text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-full transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          {/* Live parse preview */}
          {parsed && (
            <div className={`mx-3 mb-3 rounded-lg border p-3 ${CONF[parsed.confidence].wrap}`}>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${CONF[parsed.confidence].dot}`} />
                  <span className={`text-xs font-semibold ${CONF[parsed.confidence].text}`}>
                    {CONF[parsed.confidence].label}
                  </span>
                </div>
                {parsed.confidence !== 'low' && (
                  <button
                    onMouseDown={e => { e.preventDefault(); commitRule(); }}
                    className="text-xs font-semibold bg-slate-900 text-white px-3 py-1 rounded-md hover:bg-slate-700 transition-colors flex items-center gap-1"
                  >
                    Add Rule <span className="opacity-60 font-normal">↵</span>
                  </button>
                )}
              </div>

              {parsed.confidence !== 'low' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'IF',   val: parsed.condition  },
                    { label: 'THEN', val: parsed.action     },
                    { label: 'f(x)', val: parsed.expression },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">{label}</span>
                      <div className="mt-0.5 font-mono text-xs text-slate-800 bg-white/70 px-2 py-1.5 rounded border border-black/10 truncate">
                        {val}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-red-600">
                  Try: "add $150 per storey above 1", "add 25% for steep pitch", "minimum quote of $2000", etc.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Active rules ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Rules ({rules.length})</h2>
        <span className="text-xs text-slate-400">Applied in order when a quote is built</span>
      </div>

      <div className="space-y-2">
        {rules.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
            No rules yet — type one above to get started.
          </div>
        )}
        {rules.map((rule, idx) => (
          <div key={rule.id} className="border border-slate-200 rounded-xl bg-white shadow-sm hover:border-slate-300 transition-colors group overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex items-center flex-wrap gap-1.5 min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">IF</span>
                  <span className="text-slate-800 text-xs">{rule.condition}</span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">THEN</span>
                  <span className="text-blue-700 bg-blue-50 border border-blue-100 text-xs px-2 py-0.5 rounded">{rule.action}</span>
                </div>
              </div>
              <button
                onClick={() => deleteRule(rule.id)}
                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-3 flex-shrink-0 p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {rule.expression && rule.expression !== 'Pattern not recognised' && (
              <div className="border-t border-slate-100 px-4 py-1.5 bg-slate-50 flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">f(x)</span>
                <code className="text-xs text-slate-600 font-mono">{rule.expression}</code>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Persistent local state hook ─────────────────────────────────────────────
function useLocalState(key, defaultVal) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s !== null ? JSON.parse(s) : defaultVal; } catch { return defaultVal; }
  });
  const save = v => { setVal(v); try { localStorage.setItem(key, JSON.stringify(v)); } catch {} };
  return [val, save];
}

const DEFAULT_BIZ = { name: '', address: '', city: '', postcode: '', email: '', phone: '', vat: '', terms: '14' };
const DEFAULT_INV_SETTINGS = { showLogo: true, showAddress: true, showVat: true, showBankDetails: true, showNotes: true, bankDetails: 'Bank: Barclays\nSort code: 20-00-00\nAccount: 12345678\nReference: Your invoice number', notes: 'Thank you for your business. Payment is due within the payment terms stated above.' };

// ─── Settings ────────────────────────────────────────────────────────────────
function SettingsView() {
  const [tab, setTab] = useState('business');
  const [biz, saveBiz] = useLocalState('smq_biz', DEFAULT_BIZ);
  const [emailConnected, setEmailConnected] = useLocalState('smq_email_connected', false);
  const [emailAddress, setEmailAddress] = useLocalState('smq_email_addr', '');
  const [logo, saveLogo] = useLocalState('smq_logo', null);
  const [inv, saveInv] = useLocalState('smq_invoice_settings', DEFAULT_INV_SETTINGS);
  const [stripeKey, setStripeKey] = useLocalState('smq_stripe_pub_key', '');
  const [stripePayLink, setStripePayLink] = useLocalState('smq_stripe_pay_link', '');
  const [stripeConnected, setStripeConnected] = useLocalState('smq_stripe_connected', false);

  const handleLogoUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => saveLogo(ev.target.result);
    reader.readAsDataURL(file);
  };

  const TABS = [{ id: 'business', label: 'Business' }, { id: 'calls', label: 'Calls' }, { id: 'email', label: 'Email' }, { id: 'invoice', label: 'Invoice' }, { id: 'payments', label: 'Payments' }];
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerPhoneSaving, setOwnerPhoneSaving] = useState(false);
  const [ownerPhoneSaved, setOwnerPhoneSaved] = useState(false);
  useEffect(() => {
    apiFetch('/api/app-settings').then(r => r.json()).then(d => { if (d.owner_phone) setOwnerPhone(d.owner_phone); }).catch(() => {});
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 pb-20">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Business tab ── */}
      {tab === 'business' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Business Details</h2>
            <p className="text-xs text-slate-400 mt-0.5">Appears on invoices and client-facing documents.</p>
          </div>
          <div className="p-5 space-y-4">
            {[
              { label: 'Business Name', key: 'name' }, { label: 'Address', key: 'address' },
              { label: 'City', key: 'city' },          { label: 'Postcode', key: 'postcode' },
              { label: 'Email', key: 'email' },         { label: 'Phone', key: 'phone' },
              { label: 'VAT Number', key: 'vat' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
                <input value={biz[key] || ''} onChange={e => saveBiz({ ...biz, [key]: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Payment Terms</label>
              <select
                value={['7','14','30','60'].includes(biz.terms || '14') ? (biz.terms || '14') : 'custom'}
                onChange={e => saveBiz({ ...biz, terms: e.target.value === 'custom' ? '' : e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all bg-white">
                {['7','14','30','60'].map(d => <option key={d} value={d}>Net {d} days</option>)}
                <option value="custom">Custom…</option>
              </select>
              {!['7','14','30','60'].includes(biz.terms || '14') && (
                <input
                  value={biz.terms || ''}
                  onChange={e => saveBiz({ ...biz, terms: e.target.value })}
                  placeholder="e.g. Due on receipt, Net 45 days, 50% upfront…"
                  className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Calls tab ── */}
      {tab === 'calls' && (
        <div className="space-y-4">
          {/* Simultaneous ring */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Call Forwarding</h2>
              <p className="text-xs text-slate-400 mt-0.5">Your phone and the browser both ring at the same time. Answer on the browser for live transcription, or on your phone if you're away.</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Your mobile number</label>
                <input
                  type="tel"
                  value={ownerPhone}
                  onChange={e => { setOwnerPhone(e.target.value); setOwnerPhoneSaved(false); }}
                  placeholder="+447700900000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all"
                />
                <p className="text-xs text-slate-400 mt-1">Use full international format — e.g. +447700900000 for UK, +12125551234 for US</p>
              </div>
              <button
                disabled={ownerPhoneSaving}
                onClick={async () => {
                  setOwnerPhoneSaving(true);
                  try {
                    await apiFetch('/api/app-settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ owner_phone: ownerPhone.trim() || null }),
                    });
                    setOwnerPhoneSaved(true);
                  } catch { alert('Save failed — please try again'); }
                  finally { setOwnerPhoneSaving(false); }
                }}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-60"
              >
                {ownerPhoneSaving ? 'Saving…' : ownerPhoneSaved ? '✓ Saved' : 'Save'}
              </button>
              {ownerPhone && (
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800">
                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Simultaneous ring active</p>
                    <p className="mt-0.5 text-green-700">When a customer calls, both <strong>{ownerPhone}</strong> and your browser will ring at the same time. Whoever answers first gets the call.</p>
                  </div>
                </div>
              )}
              {!ownerPhone && (
                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                  <Phone className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>No mobile number set — inbound calls will only ring the browser. Add your number above so you never miss a call when you're away from your desk.</p>
                </div>
              )}
            </div>
          </div>

          {/* How it works */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">How calls work</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {[
                { icon: '📱', title: 'Answer on your phone', desc: 'Call connects like a normal call. No transcription — but the call is still logged.' },
                { icon: '🌐', title: 'Answer on the browser', desc: 'Full live transcription + auto-fill. Quote builds itself while you talk.' },
                { icon: '🔄', title: 'Both ring simultaneously', desc: "If you're at your desk, answer the browser. If you're out, your phone is the backup. You won't miss a call." },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4 px-5 py-4">
                  <span className="text-xl flex-shrink-0">{icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Email tab ── */}
      {tab === 'email' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Email Account</h2>
            <p className="text-xs text-slate-400 mt-0.5">Send and read emails directly from Show My Quote.</p>
          </div>
          <div className="p-5">
            {emailConnected ? (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{emailAddress}</div>
                    <div className="text-xs text-green-600">Connected</div>
                  </div>
                </div>
                <button onClick={() => { setEmailConnected(false); setEmailAddress(''); }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">Disconnect</button>
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  { label: 'Connect Gmail', sub: 'Sign in with Google', color: 'text-red-500', bg: 'bg-red-50 border-red-100', addr: 'you@gmail.com' },
                  { label: 'Connect Outlook', sub: 'Sign in with Microsoft', color: 'text-blue-500', bg: 'bg-blue-50 border-blue-100', addr: 'you@outlook.com' },
                ].map(({ label, sub, color, bg, addr }) => (
                  <button key={label} onClick={() => { setEmailConnected(true); setEmailAddress(addr); }}
                    className="w-full flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all text-left group">
                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${bg}`}>
                      <Mail className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900">{label}</div>
                      <div className="text-xs text-slate-400">{sub}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Invoice tab ── */}
      {tab === 'invoice' && (
        <div className="space-y-4">
          {/* Logo upload */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Logo</h2>
              <p className="text-xs text-slate-400 mt-0.5">Shown at the top of every invoice.</p>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-24 h-16 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center bg-slate-50 overflow-hidden flex-shrink-0">
                  {logo ? <img src={logo} alt="Logo" className="w-full h-full object-contain p-1" /> : <ImageIcon className="w-6 h-6 text-slate-300" />}
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-slate-700 transition-colors shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    {logo ? 'Change logo' : 'Upload logo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                  {logo && <button onClick={() => saveLogo(null)} className="ml-2 text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>}
                  <p className="text-xs text-slate-400 mt-1.5">PNG, JPG or SVG · Recommended 300×100px</p>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice structure toggles */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Invoice Structure</h2>
              <p className="text-xs text-slate-400 mt-0.5">Choose which sections appear on every invoice.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {[
                { key: 'showLogo',        label: 'Show logo',           desc: 'Your uploaded logo at the top' },
                { key: 'showAddress',     label: 'Business address',    desc: 'Your address below your name' },
                { key: 'showVat',         label: 'VAT number',          desc: 'Displayed in the invoice header' },
                { key: 'showBankDetails', label: 'Bank / payment details', desc: 'Shown at the bottom' },
                { key: 'showNotes',       label: 'Notes & terms',       desc: 'Payment terms and extra notes' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{label}</div>
                    <div className="text-xs text-slate-400">{desc}</div>
                  </div>
                  <button onClick={() => saveInv({ ...inv, [key]: !inv[key] })}
                    className={`relative rounded-full transition-colors flex-shrink-0 ${inv[key] ? 'bg-green-500' : 'bg-slate-200'}`}
                    style={{ width: 40, height: 22 }}>
                    <span className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${inv[key] ? 'translate-x-[19px]' : 'translate-x-[3px]'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bank details */}
          {inv.showBankDetails && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">Bank / Payment Details</h2>
              </div>
              <div className="p-5">
                <textarea rows={4} value={inv.bankDetails || ''} onChange={e => saveInv({ ...inv, bankDetails: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all resize-none"
                  placeholder={'Bank: Barclays\nSort code: 20-00-00\nAccount: 12345678'} />
              </div>
            </div>
          )}

          {/* Notes */}
          {inv.showNotes && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">Default Notes / Terms</h2>
              </div>
              <div className="p-5">
                <textarea rows={3} value={inv.notes || ''} onChange={e => saveInv({ ...inv, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all resize-none"
                  placeholder="Thank you for your business..." />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Payments tab ── */}
      {tab === 'payments' && (
        <div className="space-y-4">
          {/* Stripe */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-[#635BFF] rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-black text-sm">S</span>
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Stripe</h2>
                <p className="text-xs text-slate-400 mt-0.5">Accept card payments and add a Pay Now button to invoices.</p>
              </div>
              {stripeConnected && (
                <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full bg-green-50 border border-green-200 text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Connected
                </span>
              )}
            </div>
            <div className="p-5 space-y-4">
              {stripeConnected ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Publishable Key</label>
                    <input value={stripeKey} onChange={e => setStripeKey(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#635BFF] font-mono"
                      placeholder="pk_live_..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Payment Link URL</label>
                    <p className="text-xs text-slate-400 mb-1.5">Create a payment link in your <a href="https://dashboard.stripe.com/payment-links" target="_blank" rel="noreferrer" className="text-[#635BFF] hover:underline">Stripe dashboard</a> and paste it here. It will appear as a "Pay Now" button on invoices.</p>
                    <input value={stripePayLink} onChange={e => setStripePayLink(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#635BFF]"
                      placeholder="https://buy.stripe.com/..." />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500">Remove Stripe integration</span>
                    <button onClick={() => { setStripeConnected(false); setStripeKey(''); setStripePayLink(''); }}
                      className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">Disconnect</button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Connect Stripe to add a <strong>Pay Now</strong> button to your invoices so clients can pay by card instantly.</p>
                  <button
                    onClick={() => setStripeConnected(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#635BFF] hover:bg-[#5145e5] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    <span className="font-black">S</span> Connect Stripe
                  </button>
                  <p className="text-xs text-slate-400">You'll enter your publishable key and a payment link — no redirects, no Stripe OAuth required.</p>
                </div>
              )}
            </div>
          </div>

          {/* E-signature */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <Edit2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">E-Signature</h2>
                <p className="text-xs text-slate-400 mt-0.5">Let clients sign quotes and contracts digitally before booking.</p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full bg-green-50 border border-green-200 text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
              </span>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600 mb-4">Send any invoice or quote for e-signature with one click. Clients sign on any device — no account needed. The signed document is stored against the call record.</p>
              <div className="space-y-2 mb-4">
                {[
                  'Open a call → go to the Quote tab',
                  'Click "Send for Signature" in the toolbar',
                  'Copy the link and send it to your client via SMS or email',
                  'Client signs on their phone or computer',
                ].map((f, i) => (
                  <div key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Invoice View ─────────────────────────────────────────────────────────────
function InvoiceView({ call }) {
  const [logo]          = useLocalState('smq_logo', null);
  const [biz]           = useLocalState('smq_biz', DEFAULT_BIZ);
  const [inv]           = useLocalState('smq_invoice_settings', DEFAULT_INV_SETTINGS);
  const [stripePayLink] = useLocalState('smq_stripe_pay_link', '');

  const today   = new Date();
  const fmtDate = d => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const due     = new Date(today); due.setDate(due.getDate() + parseInt(biz.terms || 14));

  const [invoiceNum,  setInvoiceNum]  = useState(call.invoice?.id || `INV-${String(Date.now()).slice(-5)}`);
  const [issueDate,   setIssueDate]   = useState(fmtDate(today));
  const [dueDateStr,  setDueDateStr]  = useState(fmtDate(due));
  const [clientName,  setClientName]  = useState(call.extracted?.name || call.caller || '');
  const [clientEmail, setClientEmail] = useState(call.email || '');
  const [clientAddr,  setClientAddr]  = useState('');
  const [notes,       setNotes]       = useState(inv.notes || '');
  const [showVatLine, setShowVatLine] = useState(false);
  const [vatRate,     setVatRate]     = useState(20);
  const [sigState,    setSigState]    = useState(null); // null | 'sending' | 'done'
  const [sigUrl,      setSigUrl]      = useState('');
  const [sigCopied,   setSigCopied]   = useState(false);
  const [items, setItems] = useState(() => {
    if (call.invoice?.items?.length) return call.invoice.items.map(it => ({ desc: it.desc, qty: 1, rate: it.amount, amount: it.amount }));
    const desc = [call.extracted?.eventType, call.extracted?.roofSquares ? `${call.extracted.roofSquares} squares` : null].filter(Boolean).join(' — ') || 'Roofing Services';
    return [{ desc, qty: 1, rate: call.invoice?.amount || call.quote?.amount || 0, amount: call.invoice?.amount || call.quote?.amount || 0 }];
  });

  const updateItem = (i, key, val) => {
    const next = [...items]; next[i] = { ...next[i], [key]: val };
    if (key === 'qty' || key === 'rate') next[i].amount = (Number(next[i].qty)||0) * (Number(next[i].rate)||0);
    setItems(next);
  };
  const fmt = n => '$' + (Number(n)||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const subtotal  = items.reduce((s, it) => s + (Number(it.amount)||0), 0);
  const vatAmount = showVatLine ? subtotal * (vatRate / 100) : 0;
  const total     = subtotal + vatAmount;

  const sendForSignature = async () => {
    setSigState('sending');
    const docTitle = [call.extracted?.eventType, call.extracted?.eventDate].filter(Boolean).join(' — ') || clientName || 'Quote';
    try {
      const r = await apiFetch('/api/sign-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_id:        call.id || null,
          client_name:    clientName,
          client_email:   clientEmail,
          document_title: docTitle,
          document_data:  { items, total, notes, invoiceNum, issueDate },
        }),
      });
      const d = await r.json();
      if (d.sign_url) { setSigUrl(d.sign_url); setSigState('done'); }
      else { setSigState(null); }
    } catch { setSigState(null); }
  };

  const copySignUrl = () => {
    navigator.clipboard.writeText(sigUrl).then(() => {
      setSigCopied(true);
      setTimeout(() => setSigCopied(false), 2000);
    });
  };

  const printInvoice = () => {
    const logoHtml = (inv.showLogo && logo)
      ? `<img src="${logo}" style="max-height:56px;max-width:160px;object-fit:contain;" />`
      : `<div style="font-size:18px;font-weight:800;color:#0f172a;">${biz.name}</div>`;
    const numFmt = n => '$' + (Number(n)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    const html = `<!DOCTYPE html><html><head><title>Invoice ${invoiceNum}</title><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1e293b;background:white;padding:32px;max-width:760px;margin:0 auto;font-size:13px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid #e2e8f0}
.invoice-title{font-size:26px;font-weight:900;color:#0f172a;margin-bottom:6px}.meta{color:#64748b;font-size:12px;margin-bottom:3px;display:flex;justify-content:flex-end;gap:8px}
.meta span{font-weight:600;color:#1e293b}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
.section-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:6px}
table{width:100%;border-collapse:collapse;margin-bottom:16px}th{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;text-align:left;padding:8px 0;border-bottom:1px solid #e2e8f0}
th.r,td.r{text-align:right}td{padding:9px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;line-height:1.4}
.totals{margin-left:auto;width:240px}.total-row{display:flex;justify-content:space-between;padding:5px 0;color:#475569}
.total-final{display:flex;justify-content:space-between;padding:10px 0;font-size:17px;font-weight:900;color:#0f172a;border-top:2px solid #0f172a;margin-top:4px}
.footer{margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;white-space:pre-wrap;line-height:1.6}
@media print{body{padding:16px}}
</style></head><body>
<div class="header"><div>${logoHtml}${inv.showAddress ? `<div style="color:#64748b;font-size:11px;margin-top:6px">${[biz.address,`${biz.city||''} ${biz.postcode||''}`.trim(),biz.email,biz.phone].filter(Boolean).join('<br/>')}</div>` : ''}${inv.showVat&&biz.vat?`<div style="color:#94a3b8;font-size:11px;margin-top:4px">VAT: ${biz.vat}</div>`:''}</div>
<div style="text-align:right"><div class="invoice-title">INVOICE</div><div class="meta"><span>No.</span> ${invoiceNum}</div><div class="meta"><span>Issued:</span> ${issueDate}</div><div class="meta"><span>Due:</span> ${dueDateStr}</div></div></div>
<div class="grid2"><div><div class="section-label">From</div><div style="font-weight:700;margin-bottom:4px">${biz.name}</div></div>
<div><div class="section-label">Bill To</div><div style="font-weight:700;margin-bottom:4px">${clientName}</div>${clientEmail?`<div style="color:#64748b">${clientEmail}</div>`:''}${clientAddr?`<div style="color:#64748b;white-space:pre-wrap">${clientAddr}</div>`:''}</div></div>
<table><thead><tr><th>Description</th><th class="r" style="width:50px">Qty</th><th class="r" style="width:80px">Rate</th><th class="r" style="width:90px">Amount</th></tr></thead><tbody>
${items.map(it=>`<tr><td>${it.desc}</td><td class="r">${it.qty}</td><td class="r">${numFmt(it.rate)}</td><td class="r" style="font-weight:600">${numFmt(it.amount)}</td></tr>`).join('')}
</tbody></table>
<div class="totals"><div class="total-row"><span>Subtotal</span><span>${numFmt(subtotal)}</span></div>${showVatLine?`<div class="total-row"><span>VAT (${vatRate}%)</span><span>${numFmt(vatAmount)}</span></div>`:''}<div class="total-final"><span>Total</span><span>${numFmt(total)}</span></div></div>
${inv.showBankDetails&&inv.bankDetails?`<div class="footer"><strong>Payment Details</strong>\n${inv.bankDetails}</div>`:''}
${inv.showNotes&&notes?`<div class="footer" style="margin-top:16px"><strong>Notes</strong>\n${notes}</div>`:''}
</body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const Field = ({ value, onChange, placeholder='', className='' }) => (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`bg-transparent border-b border-transparent hover:border-slate-200 focus:border-green-400 outline-none transition-colors ${className}`} />
  );

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
        <p className="text-xs text-slate-400">Click any field to edit</p>
        <div className="flex items-center gap-2 flex-wrap">
          {sigState !== 'done' && (
            <button onClick={sendForSignature} disabled={sigState === 'sending'}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
              <PenLine className="w-4 h-4" />
              {sigState === 'sending' ? 'Creating…' : 'Send for Signature'}
            </button>
          )}
          <button onClick={printInvoice}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
            <Printer className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Signing link */}
      {sigState === 'done' && sigUrl && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-green-800 mb-0.5">Signing link ready</div>
            <div className="text-xs text-green-700 truncate font-mono">{sigUrl}</div>
          </div>
          <button onClick={copySignUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0">
            <ClipboardCopy className="w-3.5 h-3.5" />
            {sigCopied ? 'Copied!' : 'Copy'}
          </button>
          <a href={sigUrl} target="_blank" rel="noreferrer"
            className="p-1.5 text-green-700 hover:text-green-900 flex-shrink-0">
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Invoice card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Header: logo + invoice meta */}
        <div className="p-4 sm:p-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              {inv.showLogo && logo
                ? <img src={logo} alt="Logo" className="max-h-12 max-w-[140px] object-contain mb-2" />
                : <div className="text-lg font-black text-slate-900 mb-1">{biz.name}</div>}
              {inv.showAddress && <div className="text-xs text-slate-400 leading-relaxed">{[biz.address, [biz.city, biz.postcode].filter(Boolean).join(', ')].filter(Boolean).map((l,i)=><div key={i}>{l}</div>)}</div>}
              <div className="text-xs text-slate-400">{biz.email}</div>
              {inv.showVat && biz.vat && <div className="text-xs text-slate-400">VAT: {biz.vat}</div>}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-black text-slate-900 mb-3">INVOICE</div>
              <div className="space-y-1.5 text-xs">
                {[['No.', invoiceNum, setInvoiceNum], ['Issued', issueDate, setIssueDate], ['Due', dueDateStr, setDueDateStr]].map(([label, val, setter]) => (
                  <div key={label} className="flex items-center justify-end gap-2">
                    <span className="text-slate-400">{label}</span>
                    <input value={val} onChange={e => setter(e.target.value)}
                      className="text-right text-xs font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-green-400 outline-none w-28" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="px-4 sm:px-6 py-4 bg-slate-50 border-b border-slate-100">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Bill To</div>
          <Field value={clientName} onChange={setClientName} placeholder="Client name" className="text-sm font-semibold text-slate-900 w-full block mb-1" />
          <Field value={clientEmail} onChange={setClientEmail} placeholder="Email address" className="text-xs text-slate-500 w-full block mb-1" />
          <textarea value={clientAddr} onChange={e => setClientAddr(e.target.value)} placeholder="Address (optional)" rows={2}
            className="text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-green-400 outline-none w-full resize-none" />
        </div>

        {/* Line items */}
        <div className="px-4 sm:px-6 py-4 overflow-x-auto">
          <table className="w-full text-sm min-w-[340px]">
            <thead>
              <tr className="border-b border-slate-200">
                {['Description','Qty','Rate','Amount',''].map((h,i) => (
                  <th key={i} className={`text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-2 ${i>0?'text-right':''} ${i===1?'w-14':i===2?'w-20':i===3?'w-20':i===4?'w-6':''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-b border-slate-100 group">
                  <td className="py-2.5 pr-3">
                    <input value={it.desc} onChange={e => updateItem(i,'desc',e.target.value)} placeholder="Item description"
                      className="w-full text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-green-400 outline-none text-sm" />
                  </td>
                  <td className="py-2.5 px-1">
                    <input value={it.qty} onChange={e => updateItem(i,'qty',e.target.value)} type="number" min="0"
                      className="w-full text-right text-slate-700 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-green-400 outline-none text-sm" />
                  </td>
                  <td className="py-2.5 px-1">
                    <input value={it.rate} onChange={e => updateItem(i,'rate',e.target.value)} type="number" min="0"
                      className="w-full text-right text-slate-700 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-green-400 outline-none text-sm" />
                  </td>
                  <td className="py-2.5 pl-1 text-right font-semibold text-slate-900">{fmt(it.amount)}</td>
                  <td className="py-2.5">
                    <button onClick={() => setItems(p => p.filter((_,idx) => idx !== i))}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-0.5">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setItems(p => [...p, { desc: '', qty: 1, rate: 0, amount: 0 }])}
            className="mt-2 flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-medium transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add line item
          </button>
        </div>

        {/* Totals */}
        <div className="px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-100">
          <div className="flex justify-end">
            <div className="w-56 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-medium">{fmt(subtotal)}</span></div>
              <div className="flex justify-between items-center text-slate-600">
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs">
                  <input type="checkbox" checked={showVatLine} onChange={e => setShowVatLine(e.target.checked)} className="rounded" />
                  <span>VAT</span>
                  {showVatLine && (
                    <select value={vatRate} onChange={e => setVatRate(Number(e.target.value))}
                      className="text-xs bg-transparent border-b border-slate-200 outline-none ml-1">
                      {[5,10,20].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  )}
                </label>
                <span className="font-medium">{fmt(vatAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t-2 border-slate-900 text-base font-black text-slate-900">
                <span>Total</span><span>{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {inv.showNotes && (
          <div className="px-4 sm:px-6 py-4 border-t border-slate-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Payment terms, thank you note…"
              className="w-full text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-green-400 outline-none resize-none" />
          </div>
        )}

        {/* Bank details */}
        {inv.showBankDetails && inv.bankDetails && (
          <div className="px-4 sm:px-6 py-4 border-t border-slate-100 bg-slate-50">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Payment Details</div>
            <div className="text-xs text-slate-600 whitespace-pre-wrap">{inv.bankDetails}</div>
          </div>
        )}

        {/* Pay Now button — shown if Stripe payment link is configured */}
        {stripePayLink && (
          <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <div className="text-xs text-slate-400">Pay securely online</div>
            <a href={stripePayLink} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-5 py-2 bg-[#635BFF] hover:bg-[#5145e5] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
              <span className="font-black">S</span> Pay Now
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Call Log View ────────────────────────────────────────────────────────────
function CallLogView({ initialId, navigateTo, callLogs = [], contacts = [], onDeleteCall, onUpdateCall, onSaveContact, onCallAgain }) {
  const [selectedId, setSelectedId] = useState(
    (typeof initialId === 'string' ? initialId : null) || null
  );
  const [activeTab, setActiveTab]   = useState('transcript');
  const [fabState, setFabState]     = useState('icon'); // icon | keypad | active
  const [fabMode,  setFabMode]      = useState('call'); // 'call' | 'text'
  const [dialNumber, setDialNumber] = useState('');
  const [fabSmsTo,   setFabSmsTo]   = useState('');
  const [fabSmsBody, setFabSmsBody] = useState('');
  const [fabSmsSent, setFabSmsSent] = useState(false);
  const [fabSmsSending, setFabSmsSending] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [callMuted, setCallMuted]   = useState(false);
  const [callHeld,  setCallHeld]    = useState(false);
  const [liveLines, setLiveLines]   = useState([]);
  const [showDetail, setShowDetail] = useState(typeof initialId === 'string');
  const [isPlaying, setIsPlaying]   = useState(false);
  const [isMuted,   setIsMuted]     = useState(false);
  const [checkingRec, setCheckingRec] = useState(false);
  const audioRef = useRef(null);
  const checkedRecs = useRef(new Set());
  const timerRef   = useRef(null);
  const timeoutIds = useRef([]);

  // Edit name
  const [editingName, setEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState('');
  // Save contact inline form
  const [saveContactOpen, setSaveContactOpen] = useState(false);
  const [scName, setScName]   = useState('');
  const [scPhone, setScPhone] = useState('');
  const [scSaving, setScSaving] = useState(false);
  // Email compose
  const [clEmailOpen, setClEmailOpen]       = useState(false);
  const [clEmailSubject, setClEmailSubject] = useState('');
  const [clEmailBody, setClEmailBody]       = useState('');
  const [clEmailSending, setClEmailSending] = useState(false);
  const [clEmailSent, setClEmailSent]       = useState(false);

  // Reset per-call UI when selection changes
  useEffect(() => {
    setEditingName(false);
    setSaveContactOpen(false);
    setClEmailOpen(false);
  }, [selectedId]);

  const openClEmail = (call) => {
    setClEmailSubject(`Following up on your roofing enquiry — ${call.name || call.phone || ''}`);
    setClEmailBody('');
    setClEmailSent(false);
    setClEmailOpen(true);
  };
  const closeClEmail = () => { setClEmailOpen(false); setClEmailSubject(''); setClEmailBody(''); setClEmailSent(false); };
  const sendClEmail = async (toAddress) => {
    if (!toAddress || !clEmailSubject.trim() || !clEmailBody.trim() || clEmailSending || clEmailSent) return;
    setClEmailSending(true);
    try {
      const res = await apiFetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toAddress, subject: clEmailSubject.trim(), body: clEmailBody.trim() }),
      });
      if (res.ok) {
        setClEmailSent(true);
        setTimeout(closeClEmail, 2000);
      } else {
        const d = await res.json().catch(() => ({}));
        alert('Failed: ' + (d.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Failed: ' + e.message);
    } finally {
      setClEmailSending(false);
    }
  };

  const selected = callLogs.find(c => c.id === selectedId) || callLogs[0] || null;
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const LIVE_DEMO = [
    { speaker: 'You',    text: "Thanks for calling — how can I help you today?" },
    { speaker: 'Client', text: "Hi, I need a full roof replacement quote — two-storey house, about 28 squares." },
    { speaker: 'You',    text: "Great — what's the address and how many storeys?" },
    { speaker: 'Client', text: "4821 Westgate Drive, Houston. Two storeys, about 28 squares." },
    { speaker: 'You',    text: "And is this a tear-off or going over existing shingles?" },
    { speaker: 'Client', text: "Full tear-off — one layer. I want 30-year architectural." },
  ];

  const startLiveCall = () => {
    setFabState('active');
    setLiveLines([]);
    setCallSeconds(0);
    setCallMuted(false);
    setCallHeld(false);
    timerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000);
    LIVE_DEMO.forEach((line, i) => {
      const id = setTimeout(() => setLiveLines(prev => [...prev, line]), (i + 1) * 3500);
      timeoutIds.current.push(id);
    });
  };

  const endLiveCall = () => {
    clearInterval(timerRef.current);
    timeoutIds.current.forEach(clearTimeout);
    timeoutIds.current = [];
    setFabState('icon');
    setLiveLines([]);
    setCallSeconds(0);
  };

  useEffect(() => () => {
    clearInterval(timerRef.current);
    timeoutIds.current.forEach(clearTimeout);
  }, []);

  // Stop audio when switching to a different call
  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setIsPlaying(false);
  }, [selectedId]);

  // Auto-check SignalWire for a recording if the call has a callSid but no recording_sid yet.
  // Re-checks each time a call is selected (recordings can complete asynchronously).
  useEffect(() => {
    if (!selectedId) return;
    const call = callLogs.find(c => c.id === selectedId);
    if (!call || call.hasRecording || !call.callSid) return;
    // Skip if already confirmed present (don't skip if not found yet)
    if (checkedRecs.current.has(selectedId)) return;
    setCheckingRec(true);
    apiFetch(`/api/twilio-recording?callSid=${encodeURIComponent(call.callSid)}`)
      .then(r => r.json())
      .then(d => {
        if (d.ready && d.recordingSid) {
          checkedRecs.current.add(selectedId); // cache only when found
          onUpdateCall?.(selectedId, { hasRecording: true, recordingSid: d.recordingSid });
        }
      })
      .catch(() => {})
      .finally(() => setCheckingRec(false));
  }, [selectedId, callLogs]);

  const handleCallAgain = phone => {
    onCallAgain?.(phone, selected?.niche);
  };

  const fabSendSms = async () => {
    if (!fabSmsTo.trim() || !fabSmsBody.trim() || fabSmsSending || fabSmsSent) return;
    setFabSmsSending(true);
    try {
      const res = await apiFetch('/api/sms-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: fabSmsTo.trim(), body: fabSmsBody.trim() }),
      });
      if (res.ok) {
        setFabSmsSent(true);
        setTimeout(() => { setFabSmsSent(false); setFabSmsTo(''); setFabSmsBody(''); setFabState('icon'); }, 2000);
      } else {
        const d = await res.json().catch(() => ({}));
        alert('Failed: ' + (d.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Failed: ' + e.message);
    } finally {
      setFabSmsSending(false);
    }
  };

  const selectCall = id => {
    setSelectedId(id);
    setActiveTab('transcript');
    setShowDetail(true);
  };

  const startEditName = () => {
    setEditNameVal(selected?.caller || '');
    setEditingName(true);
  };

  const saveEditName = async () => {
    if (!editNameVal.trim() || !selected) return;
    setEditingName(false);
    try {
      await apiFetch(`/api/calls/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_number: editNameVal.trim() }),
      });
      onUpdateCall?.(selected.id, { caller: editNameVal.trim() });
    } catch {}
  };

  const handleDeleteCall = async () => {
    if (!selected) return;
    if (!confirm('Delete this call log?')) return;
    try {
      await apiFetch(`/api/calls/${selected.id}`, { method: 'DELETE' });
      onDeleteCall?.(selected.id);
      setSelectedId(null);
      setShowDetail(false);
    } catch (e) { alert('Delete failed: ' + e.message); }
  };

  const handleDeleteAllCalls = async () => {
    if (!callsForPhone.length) return;
    if (!confirm(`Delete all ${callsForPhone.length} calls for this number? This cannot be undone.`)) return;
    try {
      await Promise.all(callsForPhone.map(c => apiFetch(`/api/calls/${c.id}`, { method: 'DELETE' })));
      callsForPhone.forEach(c => onDeleteCall?.(c.id));
      setSelectedId(null);
      setShowDetail(false);
    } catch (e) { alert('Delete failed: ' + e.message); }
  };

  const openSaveContact = () => {
    setScName(selected.caller !== selected.phone ? selected.caller : '');
    setScPhone(selected.phone || '');
    setSaveContactOpen(true);
  };

  const saveContact = async () => {
    if (!scPhone.trim()) return;
    setScSaving(true);
    try {
      const res = await apiFetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: scName.trim() || scPhone.trim(), phone: scPhone.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const { contact } = await res.json();
      onSaveContact?.(contact);
      setSaveContactOpen(false);
    } catch (e) { alert('Save failed: ' + e.message); }
    finally { setScSaving(false); }
  };

  const CALL_STATUS = {
    transcribed: { label: 'Transcribed', dotCls: 'bg-green-500', textCls: 'text-green-700', bgCls: 'bg-green-50 border-green-200' },
    missed:      { label: 'Missed',      dotCls: 'bg-red-500',   textCls: 'text-red-700',   bgCls: 'bg-red-50   border-red-200'   },
    new:         { label: 'New',         dotCls: 'bg-blue-500',  textCls: 'text-blue-700',  bgCls: 'bg-blue-50  border-blue-200'  },
  };

  const QUOTE_STATUS_CLS = {
    draft:  'bg-slate-100 text-slate-700',
    sent:   'bg-blue-100  text-blue-700',
    viewed: 'bg-purple-100 text-purple-700',
    won:    'bg-green-100 text-green-700',
    lost:   'bg-red-100   text-red-700',
  };

  // Look up contact name by phone number (normalise by stripping non-digits)
  const norm = p => (p || '').replace(/\D/g, '');
  const contactByPhone = phone => contacts.find(c => norm(c.phone) === norm(phone) && norm(phone).length > 5);

  // Group calls by phone number for the sidebar
  const phoneGroups = Object.values(
    callLogs.reduce((acc, call) => {
      const key = call.phone || call.id;
      if (!acc[key]) acc[key] = { phone: key, calls: [] };
      acc[key].calls.push(call);
      return acc;
    }, {})
  ).sort((a, b) => {
    const aTime = a.calls[0]?.createdAt ? new Date(a.calls[0].createdAt).getTime() : 0;
    const bTime = b.calls[0]?.createdAt ? new Date(b.calls[0].createdAt).getTime() : 0;
    return bTime - aTime;
  });

  // All calls for the currently selected phone number
  const callsForPhone = selected ? callLogs.filter(c => c.phone === selected.phone) : [];

  const tabs = [
    { id: 'transcript', label: 'Transcript' },
    { id: 'quote',      label: 'Quote' },
    { id: 'messages',   label: `Messages${(selected?.messages?.length ?? 0) > 0 ? ` (${selected.messages.length})` : ''}` },
    { id: 'invoice',    label: 'Invoice' },
    ...(callsForPhone.length > 1 ? [{ id: 'calls', label: `All Calls (${callsForPhone.length})` }] : []),
  ];

  return (
    <div className="flex h-full overflow-hidden relative">

      {/* ── Left: call list ── */}
      <div className={`w-full md:w-72 lg:w-80 border-r border-slate-200 flex-col bg-white flex-shrink-0 ${showDetail ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Call Log</h2>
            <p className="text-xs text-slate-400 mt-0.5">{callLogs.length} call{callLogs.length !== 1 ? 's' : ''}{phoneGroups.length < callLogs.length ? ` · ${phoneGroups.length} contact${phoneGroups.length !== 1 ? 's' : ''}` : ''}</p>
          </div>
          <button
            onClick={() => setFabState(fabState === 'keypad' ? 'icon' : 'keypad')}
            className="w-8 h-8 bg-green-600 hover:bg-green-500 text-white rounded-full flex items-center justify-center transition-colors shadow-sm"
            title="New call"
          >
            <Phone className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {phoneGroups.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No calls yet</p>
          )}
          {phoneGroups.map(group => {
            const latest = group.calls[0];
            const st = CALL_STATUS[latest.status] || CALL_STATUS.new;
            const isGroupSel = group.calls.some(c => c.id === selectedId);
            const contact = contactByPhone(group.phone);
            const displayName = contact?.name || latest.caller;
            const initials = contact ? (contact.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : displayName.charAt(0).toUpperCase();
            return (
              <button
                key={group.phone}
                onClick={() => selectCall(latest.id)}
                className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors border-l-[3px] ${isGroupSel ? 'bg-slate-50 border-l-slate-900' : 'border-l-transparent'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${contact ? contact.color : 'bg-slate-200 text-slate-700'}`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 text-sm truncate">{displayName}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{contact ? group.phone : latest.date}</div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${st.bgCls} ${st.textCls}`}>
                      <span className={`w-1 h-1 rounded-full flex-shrink-0 ${st.dotCls}`} />
                      {st.label}
                    </span>
                    {group.calls.length > 1 && (
                      <div className="text-[11px] text-slate-400 mt-1">{group.calls.length} calls</div>
                    )}
                    {group.calls.length === 1 && (
                      <div className="text-[11px] text-slate-400 mt-1">{latest.duration}</div>
                    )}
                  </div>
                </div>
                {(latest.extracted?.eventType || latest.extracted?.guestCount) && (
                  <div className="text-xs text-slate-500 mt-1.5 pl-10 truncate">
                    {[latest.extracted?.eventType, latest.extracted?.guestCount ? `${latest.extracted.guestCount} guests` : null].filter(Boolean).join(' · ')}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right: detail pane ── */}
      <div className={`flex-1 flex-col overflow-hidden ${showDetail ? 'flex' : 'hidden md:flex'}`}>
        {selected && (
          <>
            {/* Call header */}
            <div className="px-4 md:px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setShowDetail(false)} className="md:hidden text-slate-400 hover:text-slate-600 flex-shrink-0 p-1">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {(() => { const sc = contactByPhone(selected.phone); return (
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm ${sc ? sc.color : 'bg-slate-200 text-slate-700'}`}>
                  {sc ? (sc.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : selected.caller.charAt(0)}
                </div>
                ); })()}
                <div className="min-w-0">
                  {editingName ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={editNameVal}
                        onChange={e => setEditNameVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEditName(); if (e.key === 'Escape') setEditingName(false); }}
                        className="font-semibold text-slate-900 text-sm border-b border-slate-400 focus:border-slate-900 outline-none bg-transparent w-40"
                      />
                      <button onClick={saveEditName} className="text-green-600 hover:text-green-500 p-0.5 flex-shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingName(false)} className="text-slate-400 hover:text-slate-600 p-0.5 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="font-semibold text-slate-900 text-sm">{contactByPhone(selected.phone)?.name || selected.caller}</div>
                  )}
                  <div className="text-xs text-slate-500 truncate hidden sm:block">{selected.phone} · {selected.date} · {selected.duration}</div>
                  <div className="text-xs text-slate-500 sm:hidden">{selected.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleCallAgain(selected.phone)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                >
                  <PhoneForwarded className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Call again</span>
                </button>
                <button
                  onClick={openSaveContact}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Save as contact"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
                <button
                  onClick={startEditName}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Edit name"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteCall}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete this call"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {callsForPhone.length > 1 && (
                  <button
                    onClick={handleDeleteAllCalls}
                    className="hidden sm:block px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete all calls for this number"
                  >
                    Delete all
                  </button>
                )}
              </div>
            </div>

            {/* Save contact inline form */}
            {saveContactOpen && (
              <div className="px-4 md:px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 flex-shrink-0">
                <UserPlus className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  autoFocus
                  placeholder="Name"
                  value={scName}
                  onChange={e => setScName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveContact()}
                  className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-slate-900 outline-none bg-white"
                />
                <input
                  placeholder="Phone"
                  value={scPhone}
                  onChange={e => setScPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveContact()}
                  className="hidden sm:block w-32 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-slate-900 outline-none bg-white flex-shrink-0"
                />
                <button
                  onClick={saveContact}
                  disabled={scSaving || !scPhone.trim()}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40 flex-shrink-0"
                >
                  {scSaving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setSaveContactOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Recording bar */}
            {!selected.hasRecording && checkingRec && selected.callSid && (
              <div className="px-4 md:px-6 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
                <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin flex-shrink-0" />
                <span className="text-xs text-slate-500">Checking for recording…</span>
              </div>
            )}
            {selected.hasRecording && (
              <div className="px-4 md:px-6 py-2.5 bg-slate-900 text-white flex items-center gap-3 flex-shrink-0">
                <audio
                  ref={audioRef}
                  src={`/api/twilio-recording?recordingSid=${selected.recordingSid}&stream=true`}
                  muted={isMuted}
                  onEnded={() => setIsPlaying(false)}
                  onPause={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                />
                <button
                  onClick={() => {
                    const a = audioRef.current;
                    if (!a) return;
                    if (isPlaying) { a.pause(); } else { a.play().catch(() => {}); }
                  }}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  {isPlaying
                    ? <span className="w-3 h-3 flex gap-0.5"><span className="w-1 h-3 bg-white rounded-sm"/><span className="w-1 h-3 bg-white rounded-sm"/></span>
                    : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
                <div className="flex items-center gap-0.5 h-5 flex-1 min-w-0">
                  {Array.from({ length: 56 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-0.5 rounded-full flex-shrink-0 transition-colors ${isPlaying ? 'bg-green-400' : 'bg-green-400/50'}`}
                      style={{ height: `${Math.max(15, Math.min(90, 35 + Math.sin(i * 0.9) * 28 + Math.cos(i * 0.35) * 18))}%` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{selected.duration}</span>
                <button
                  onClick={() => { setIsMuted(m => !m); if (audioRef.current) audioRef.current.muted = !isMuted; }}
                  className={`transition-colors flex-shrink-0 ${isMuted ? 'text-red-400' : 'text-slate-500 hover:text-white'}`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white flex-shrink-0 overflow-x-auto scrollbar-none">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 md:px-5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                    activeTab === tab.id
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab body */}
            <div className="flex-1 overflow-y-auto bg-[#F7F7F5]">

              {/* ── TRANSCRIPT ── */}
              {activeTab === 'transcript' && (
                <div className="p-4 md:p-6 max-w-3xl">
                  {/* Live call section */}
                  {fabState === 'active' && liveLines.length > 0 && (
                    <div className="mb-6 border border-green-200 bg-green-50 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Live · {fmt(callSeconds)}</span>
                        <span className="ml-auto text-[10px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full font-semibold">Transcribing</span>
                      </div>
                      <div className="space-y-3">
                        {liveLines.map((line, i) => (
                          <div key={i} className={`flex gap-2.5 ${line.speaker !== 'You' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${line.speaker === 'You' ? 'bg-slate-200 text-slate-700' : 'bg-slate-900 text-white'}`}>
                              {line.speaker.charAt(0)}
                            </div>
                            <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${line.speaker === 'You' ? 'bg-white border border-slate-200 text-slate-800' : 'bg-slate-900 text-white'}`}>
                              {line.text}
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-1 pl-8 mt-1">
                          {[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                        </div>
                      </div>
                    </div>
                  )}

                  {selected.status === 'missed' ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                      <div className="w-14 h-14 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center">
                        <PhoneOff className="w-7 h-7 text-red-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">Call was missed</div>
                        <div className="text-sm text-slate-500 mt-1">No transcript available for this call.</div>
                      </div>
                      <button
                        onClick={() => handleCallAgain(selected.phone)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-500 transition-colors shadow-sm"
                      >
                        <Phone className="w-4 h-4" /> Call back now
                      </button>
                    </div>
                  ) : selected.transcript.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 text-sm">No transcript available.</div>
                  ) : (
                    <div className="space-y-4">
                      {selected.transcript.map((line, i) => (
                        <div key={i} className={`flex gap-2.5 ${line.speaker !== 'You' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${line.speaker === 'You' ? 'bg-slate-200 text-slate-700' : 'bg-slate-900 text-white'}`}>
                            {line.speaker.charAt(0)}
                          </div>
                          <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            line.speaker === 'You'
                              ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                              : 'bg-slate-900 text-white rounded-tr-sm'
                          }`}>
                            {line.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI-extracted details */}
                  {selected.extracted && selected.status !== 'missed' && (
                    <div className="mt-8 border-t border-slate-200 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          AI-extracted details
                        </h3>
                        <button
                          onClick={() => navigateTo('quote-builder', selected.extracted)}
                          className="text-xs font-semibold text-slate-700 border border-slate-300 px-2.5 py-1 rounded-md hover:bg-white transition-colors flex items-center gap-1"
                        >
                          <Calculator className="w-3 h-3" /> Build Quote
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {Object.entries(selected.extracted)
                          .filter(([, v]) => v && !(Array.isArray(v) && v.length === 0))
                          .map(([key, value]) => (
                            <div key={key} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm">
                              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </div>
                              <div className="text-sm font-medium text-slate-800">
                                {Array.isArray(value) ? value.join(', ') : String(value)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── QUOTE ── */}
              {activeTab === 'quote' && (
                <div className="p-4 md:p-6 max-w-lg">
                  {selected.quote ? (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">{selected.caller} — Roofing Quote</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {selected.extracted?.eventType} · {selected.extracted?.guestCount} guests · {selected.extracted?.serviceStyle}
                          </div>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${QUOTE_STATUS_CLS[selected.quote.status] || 'bg-slate-100 text-slate-700'}`}>
                          {selected.quote.status}
                        </span>
                      </div>
                      <div className="px-5 py-5">
                        <div className="flex items-end justify-between mb-5">
                          <div>
                            <div className="text-xs text-slate-400">Total estimate</div>
                            <div className="text-3xl font-bold text-slate-900">${selected.quote.amount.toLocaleString()}</div>
                          </div>
                          <button
                            onClick={() => navigateTo('quote-builder', selected.extracted)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                          >
                            <FileEdit className="w-4 h-4" /> View / Edit
                          </button>
                        </div>
                        <div className="flex gap-2.5">
                          <button onClick={() => window.open(`mailto:${selected.email || ''}?subject=Your quote from us&body=Hi ${selected.caller || 'there'},\n\nHere is your quote summary.`)} className="flex-1 flex items-center justify-center gap-2 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                            <Send className="w-3.5 h-3.5" /> Send to client
                          </button>
                          <button onClick={() => navigator.clipboard.writeText(window.location.href).catch(() => {})} className="flex-1 flex items-center justify-center gap-2 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                            <Copy className="w-3.5 h-3.5" /> Copy link
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                      <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center">
                        <FileText className="w-7 h-7 text-slate-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">No quote yet</div>
                        <div className="text-sm text-slate-500 mt-1">Generate a quote from the extracted call details</div>
                      </div>
                      <button
                        onClick={() => navigateTo('quote-builder', selected.extracted)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                      >
                        <Calculator className="w-4 h-4" /> Build Quote
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── MESSAGES ── */}
              {activeTab === 'messages' && (
                <div className="p-4 md:p-6 max-w-2xl">
                  {selected.messages.length > 0 ? (
                    <div className="space-y-3">
                      {selected.messages.map((msg, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {msg.type === 'email'
                                ? <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                : <MessageSquare className="w-4 h-4 text-green-500 flex-shrink-0" />}
                              <span className="text-sm font-medium text-slate-900 truncate">{msg.subject || 'SMS message'}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 capitalize">
                                {msg.direction}
                              </span>
                              <span className="text-xs text-slate-400">{msg.time}</span>
                            </div>
                          </div>
                          <div className="px-4 py-3.5 text-sm text-slate-600 leading-relaxed">{msg.body || msg.text}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                      <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center">
                        <Mail className="w-7 h-7 text-slate-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">No messages yet</div>
                        <div className="text-sm text-slate-500 mt-1">Send a follow-up email or text to this client</div>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => openClEmail(selected)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                      <Mail className="w-4 h-4" /> Send Email
                    </button>
                    <button onClick={() => { setFabSmsTo(selected.phone || ''); setFabMode('text'); setFabState('keypad'); }} className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-white transition-colors">
                      <MessageSquare className="w-4 h-4" /> Send SMS
                    </button>
                  </div>

                  {/* Email compose panel */}
                  {clEmailOpen && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500">To: {selected.email || '(no email on record)'}</span>
                        <button onClick={closeClEmail} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {!selected.email ? (
                        <p className="text-sm text-red-500">No email address on record for this contact.</p>
                      ) : (
                        <>
                          <input
                            autoFocus
                            type="text"
                            value={clEmailSubject}
                            onChange={e => setClEmailSubject(e.target.value)}
                            placeholder="Subject…"
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                          />
                          <textarea
                            value={clEmailBody}
                            onChange={e => setClEmailBody(e.target.value)}
                            placeholder="Write your message…"
                            rows={4}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                          />
                          <button
                            onClick={() => sendClEmail(selected.email)}
                            disabled={!clEmailSubject.trim() || !clEmailBody.trim() || clEmailSending || clEmailSent}
                            className={`mt-2 w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                              clEmailSent    ? 'bg-green-100 text-green-700' :
                              clEmailSending ? 'bg-slate-100 text-slate-500 cursor-wait' :
                              !clEmailSubject.trim() || !clEmailBody.trim() ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                              'bg-green-600 hover:bg-green-500 text-white'
                            }`}
                          >
                            {clEmailSent ? <><Check className="w-3.5 h-3.5" /> Sent!</> :
                             clEmailSending ? 'Sending…' :
                             <><Send className="w-3.5 h-3.5" /> Send Email</>}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── INVOICE ── */}
              {activeTab === 'invoice' && (
                <div className="p-4 md:p-6">
                  <InvoiceView call={selected} />
                </div>
              )}

              {/* ── ALL CALLS ── */}
              {activeTab === 'calls' && (
                <div className="p-4 md:p-6 max-w-xl">
                  <div className="space-y-2">
                    {callsForPhone.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedId(c.id); setActiveTab('transcript'); }}
                        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border text-left transition-colors ${c.id === selectedId ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-800 hover:border-slate-400'}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${c.id === selectedId ? 'bg-white/10' : 'bg-slate-100'}`}>
                          <Phone className={`w-3.5 h-3.5 ${c.id === selectedId ? 'text-white' : 'text-slate-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold ${c.id === selectedId ? 'text-white' : 'text-slate-900'}`}>{c.date}</div>
                          <div className={`text-xs mt-0.5 ${c.id === selectedId ? 'text-white/60' : 'text-slate-400'}`}>{c.duration}</div>
                        </div>
                        {c.status && (
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                            c.id === selectedId
                              ? 'bg-white/20 text-white'
                              : c.status === 'completed' ? 'bg-green-100 text-green-700'
                              : c.status === 'missed'    ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>{/* end tab body */}
          </>
        )}
      </div>

      {/* ── FAB Dialer: icon state ── */}
      {fabState === 'icon' && (
        <button
          onClick={() => setFabState('keypad')}
          className="fixed bottom-6 right-6 w-14 h-14 bg-green-600 hover:bg-green-500 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 z-20"
          title="New call"
        >
          <Phone className="w-6 h-6" />
        </button>
      )}

      {/* ── FAB Dialer: keypad state ── */}
      {fabState === 'keypad' && (
        <div className="fixed bottom-6 right-6 bg-slate-900 rounded-2xl shadow-2xl z-20 w-64 overflow-hidden anim-pop-in">
          {/* Header with tabs */}
          <div className="flex items-center justify-between px-4 pt-3 pb-0">
            <div className="flex gap-1 bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setFabMode('call')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${fabMode === 'call' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Phone className="w-3 h-3" /> Call
              </button>
              <button
                onClick={() => { setFabMode('text'); setFabSmsTo(dialNumber); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${fabMode === 'text' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <MessageSquare className="w-3 h-3" /> Text
              </button>
            </div>
            <button onClick={() => setFabState('icon')} className="text-slate-500 hover:text-white p-1 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {fabMode === 'call' ? (
            <div className="px-4 py-3">
              <div className="mb-3 bg-slate-800 rounded-lg px-3 py-2.5 min-h-[42px] flex items-center justify-center">
                <span className={`font-mono text-lg tracking-widest font-bold ${dialNumber ? 'text-white' : 'text-slate-600'}`}>
                  {dialNumber || '—'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {['1','2','3','4','5','6','7','8','9','*','0','#'].map(k => (
                  <button
                    key={k}
                    onClick={() => setDialNumber(n => n.length < 15 ? n + k : n)}
                    className="h-10 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-semibold text-base transition-colors select-none"
                  >
                    {k}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setDialNumber(n => n.slice(0, -1))}
                  className="flex-1 h-10 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-lg transition-colors"
                >⌫</button>
                <button
                  onClick={() => { if (dialNumber) { onCallAgain?.(dialNumber); setFabState('icon'); } }}
                  disabled={!dialNumber}
                  className="flex-[2] h-10 bg-green-500 hover:bg-green-400 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-lg flex items-center justify-center gap-2 text-sm transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 space-y-2">
              <input
                type="tel"
                value={fabSmsTo}
                onChange={e => setFabSmsTo(e.target.value)}
                placeholder="Phone number"
                className="w-full bg-slate-800 text-white placeholder-slate-500 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <textarea
                value={fabSmsBody}
                onChange={e => setFabSmsBody(e.target.value)}
                placeholder="Type your message…"
                rows={3}
                className="w-full bg-slate-800 text-white placeholder-slate-500 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <button
                onClick={fabSendSms}
                disabled={!fabSmsTo.trim() || !fabSmsBody.trim() || fabSmsSending || fabSmsSent}
                className={`w-full h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                  fabSmsSent    ? 'bg-green-700 text-green-200' :
                  fabSmsSending ? 'bg-slate-700 text-slate-400 cursor-wait' :
                  !fabSmsTo.trim() || !fabSmsBody.trim() ? 'bg-slate-700 text-slate-500 cursor-not-allowed' :
                  'bg-green-500 hover:bg-green-400 text-white'
                }`}
              >
                {fabSmsSent ? <><Check className="w-3.5 h-3.5" /> Sent!</> :
                 fabSmsSending ? 'Sending…' :
                 <><Send className="w-3.5 h-3.5" /> Send text</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── FAB Dialer: active call pill ── */}
      {fabState === 'active' && (
        <div className="fixed bottom-6 right-6 bg-slate-900 rounded-2xl shadow-2xl z-20 flex items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Live</span>
            <span className="text-sm font-mono font-bold text-white tabular-nums">{fmt(callSeconds)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCallMuted(m => !m)}
              title={callMuted ? 'Unmute' : 'Mute'}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${callMuted ? 'bg-yellow-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
            >
              {callMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setCallHeld(h => !h)}
              title={callHeld ? 'Resume' : 'Hold'}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${callHeld ? 'bg-yellow-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
            >
              {callHeld ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={endLiveCall}
              title="End call"
              className="w-8 h-8 rounded-lg bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
            >
              <PhoneOff className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// --- SEARCH OVERLAY ---
function SearchOverlay({ onClose, navigateTo, callLogs = [], quotes = [] }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const allItems = [
    ...callLogs.map(c => ({ type: 'Call', label: c.caller, sub: `${c.date}`, action: () => navigateTo('calls', c.id) })),
    ...quotes.map(q => ({ type: 'Quote', label: q.client || q.id, sub: `${q.status}`, action: () => navigateTo('quotes') })),
    ...getStoredMenus().map(m => ({ type: 'Menu', label: m.name, sub: `${m.type} • $${m.basePrice}/sq`, action: () => navigateTo('menus') })),
  ];

  const results = query.length > 1
    ? allItems.filter(item => item.label.toLowerCase().includes(query.toLowerCase()) || item.sub.toLowerCase().includes(query.toLowerCase()))
    : [];

  const typeColors = { Call: 'bg-green-100 text-green-700', Quote: 'bg-blue-100 text-blue-700', Inquiry: 'bg-yellow-100 text-yellow-700', Menu: 'bg-slate-100 text-slate-600' };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-[15vh] px-8" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-4 py-3 border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search clients, quotes, menus..."
            className="flex-1 outline-none text-slate-900 placeholder-slate-400 text-sm"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-2"><X className="w-4 h-4" /></button>
        </div>

        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto py-2">
            {results.map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className="w-full flex items-center px-4 py-3 hover:bg-slate-50 transition-colors text-left"
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mr-3 flex-shrink-0 ${typeColors[item.type]}`}>
                  {item.type}
                </span>
                <div>
                  <div className="text-sm font-medium text-slate-900">{item.label}</div>
                  <div className="text-xs text-slate-500">{item.sub}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {query.length > 1 && results.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-400 text-sm">No results for "{query}"</div>
        )}
        {query.length <= 1 && (
          <div className="px-4 py-4 text-xs text-slate-400">
            Search across calls, quotes, inquiries, and menus.
          </div>
        )}
      </div>
    </div>
  );
}

// --- ONBOARDING DEMO ---
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
  { at: 28200, addField: { key: 'budget', label: 'Budget Range', type: 'text', placeholder: 'e.g. $4,500 – $6,000' } },
  { at: 29800, speaker: 'Client', text: "Last one — any special requests. Golden hour portraits, specific locations, that kind of thing." },
  { at: 33500, addField: { key: 'requests', label: 'Special Requests', type: 'textarea', placeholder: 'e.g. golden hour portraits, woodland walk...' } },
  { at: 35500, speaker: 'You',    text: "That's your entire intake form — built live from our conversation. Ready to see it fill itself?" },
];

const P2_SEQUENCE = [
  { at: 1200,  speaker: 'You',    text: "Hey, I need a full roof replacement — two-storey, about 28 squares." },
  { at: 4000,  speaker: 'Client', text: "Got it. What's the property address?" },
  { at: 7000,  speaker: 'You',    text: "4821 Westgate Drive, Houston, Texas." },
  { at: 9000,  fillField: { key: 'date', value: '4821 Westgate Dr, Houston TX' } },
  { at: 11000, speaker: 'Client', text: "And the pitch — steep or more moderate?" },
  { at: 13500, speaker: 'You',    text: "Moderate, maybe a 6:12." },
  { at: 16000, fillField: { key: 'venue', value: '6:12 (moderate)' } },
  { at: 18000, speaker: 'Client', text: "What material are you looking for?" },
  { at: 21000, speaker: 'You',    text: "30-year architectural shingles." },
  { at: 22500, fillField: { key: 'guests', value: '30-yr architectural' } },
  { at: 24500, speaker: 'Client', text: "And full tear-off — how many layers currently?" },
  { at: 27500, speaker: 'You',    text: "Just the one layer." },
  { at: 30000, fillField: { key: 'coverage', value: 'Tear-off — 1 layer' } },
  { at: 32000, speaker: 'Client', text: "Any add-ons while we're up there — gutters, fascia, ventilation?" },
  { at: 35000, speaker: 'You',    text: "Go ahead and include gutter replacement — they're well overdue." },
  { at: 37500, fillField: { key: 'budget', value: 'Gutter replacement add-on' } },
  { at: 39500, speaker: 'Client', text: "Great. Anything else we should check while we're on site?" },
  { at: 42500, speaker: 'You',    text: "Fascia on the front looks rotten too — worth noting in the quote." },
  { at: 45500, fillField: { key: 'requests', value: 'Check front fascia — possible replacement' } },
  { at: 47500, speaker: 'Client', text: "Perfect. I'll get you a detailed quote over before end of day." },
];

function OnboardingExample() {
  const [phase, setPhase] = useState('intro');
  const [callSeconds, setCallSeconds] = useState(0);
  const [lines, setLines] = useState([]);
  const [fields, setFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [highlightKey, setHighlightKey] = useState(null);
  const timerRef = useRef(null);
  const seqTimeoutsRef = useRef([]);
  const transcriptRef = useRef(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [lines]);

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

  if (phase === 'intro') {
    return (
      <div className="min-h-full bg-[#F7F7F5] flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              <UserPlus className="w-3.5 h-3.5" />
              Onboarding Demo Tool
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-3">Show your clients what's possible</h1>
            <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">A two-part live demo. First we build their intake form from a conversation. Then we fill it — without a single keystroke.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
                <Phone className="w-5 h-5 text-slate-700" />
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Client Onboarding</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Discovery Call</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Ask your prospect what questions they ask their clients. Our AI listens and builds their intake form in real time — field by field as they speak.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
                <Mic className="w-5 h-5 text-slate-700" />
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer Onboarding</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Demo Call</h3>
              <p className="text-sm text-slate-500 leading-relaxed">Call back and roleplay as one of their customers. Answer the questions. Watch the form they just built fill itself live — no typing required.</p>
            </div>
          </div>
          <div className="flex justify-center">
            <button onClick={startP1} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-slate-700 transition-colors shadow-md">
              <PhoneCall className="w-4 h-4" />
              Begin Client Onboarding
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'p1-dialling' || phase === 'p2-dialling') {
    const isP2 = phase === 'p2-dialling';
    return (
      <div className="min-h-full bg-[#F7F7F5] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-green-500 rounded-full opacity-20 animate-ping" />
            <div className="relative w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
              <Phone className="w-10 h-10 text-white" />
            </div>
          </div>
          <p className="text-slate-900 font-bold text-lg mb-1">Calling...</p>
          <p className="text-slate-500 text-sm">{isP2 ? 'Starting the customer onboarding call' : 'Starting the client onboarding call'}</p>
        </div>
      </div>
    );
  }

  if (phase === 'p1-call' || phase === 'p2-call') {
    const isP2 = phase === 'p2-call';
    return (
      <div className="h-full flex overflow-hidden">
        {/* Left: Call + transcript */}
        <div className="w-[42%] flex flex-col border-r border-slate-200 bg-white overflow-hidden">
          <div className="bg-slate-900 px-5 py-4 flex items-center gap-3 flex-shrink-0">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-semibold">Live Call — {isP2 ? 'Customer Onboarding' : 'Client Onboarding'}</div>
              <div className="text-slate-400 text-xs font-mono">{fmt(callSeconds)}</div>
            </div>
            <div className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{isP2 ? 'CUSTOMER' : 'CLIENT'}</div>
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
              <div key={i} className={`flex gap-2.5 anim-slide-up ${line.speaker !== 'You' ? 'flex-row-reverse' : ''}`}>
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

        {/* Right: Form panel */}
        <div className="flex-1 flex flex-col bg-[#F7F7F5] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-sm font-bold text-slate-900">{isP2 ? 'Customer Intake Form' : 'Client Intake Form'}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{fields.length} {fields.length === 1 ? 'field' : 'fields'} {isP2 ? 'ready' : 'extracted so far'}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              {isP2 ? 'Auto-filling' : 'Auto-building'}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {fields.length === 0 && (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
                <p className="text-slate-300 text-sm">Form fields will appear here as your client describes their process…</p>
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
                    className={`bg-white rounded-xl border px-4 py-3 transition-all duration-500 anim-slide-up ${isHighlighted ? 'border-green-400 shadow-[0_0_0_3px_rgba(74,222,128,0.2)]' : 'border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{field.label}</label>
                      {isHighlighted && !isP2 && (
                        <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">Extracted</span>
                      )}
                      {isHighlighted && isP2 && (
                        <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Check className="w-2.5 h-2.5" /> Filled</span>
                      )}
                      {!isHighlighted && hasVal && isP2 && (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Check className="w-2.5 h-2.5" /> Done</span>
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

  if (phase === 'p1-done') {
    return (
      <div className="min-h-full bg-[#F7F7F5] flex items-center justify-center p-8">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Client Onboarding Complete</h2>
            <p className="text-slate-500 text-sm">Your client's intake form was built in real time — just from a phone call.</p>
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
          <p className="text-center text-sm text-slate-500 mb-6">Your intake form is ready. Now call a customer and watch it fill itself in live.</p>
          <div className="flex justify-center gap-3">
            <button onClick={reset} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-100 transition-colors">
              Start over
            </button>
            <button onClick={startP2} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-700 transition-colors shadow-md">
              <PhoneCall className="w-4 h-4" />
              Begin Customer Onboarding
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'p2-done') {
    const filledCount = Object.keys(fieldValues).length;
    return (
      <div className="h-full bg-[#F7F7F5] overflow-y-auto">
        <div className="w-full max-w-lg mx-auto py-8 px-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Demo complete</h2>
            <p className="text-slate-500 text-sm">Your client just watched their form build itself — then fill itself — entirely from a phone call.</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700">Completed intake form</h3>
              <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">{filledCount}/{fields.length} fields filled</span>
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
          <div className="flex justify-center">
            <button onClick={reset} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-slate-700 transition-colors shadow-md">
              Run demo again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// --- SMART FIELD TYPES ---
const FIELD_TYPE_DEFS = [
  // ── Text ────────────────────────────────────────────────────────────────
  { id: 'text',          label: 'Short Text',    Icon: TypeIcon,         bg: 'bg-slate-100',   text: 'text-slate-600',   border: 'border-slate-300',   group: 'Text'        },
  { id: 'long-text',     label: 'Long Text',     Icon: AlignLeft,        bg: 'bg-slate-100',   text: 'text-slate-500',   border: 'border-slate-300',   group: 'Text'        },
  { id: 'email',         label: 'Email',         Icon: Mail,             bg: 'bg-sky-50',      text: 'text-sky-600',     border: 'border-sky-300',     group: 'Text'        },
  { id: 'phone',         label: 'Phone',         Icon: Phone,            bg: 'bg-cyan-50',     text: 'text-cyan-600',    border: 'border-cyan-300',    group: 'Text'        },
  { id: 'url',           label: 'URL / Link',    Icon: Link2,            bg: 'bg-violet-50',   text: 'text-violet-600',  border: 'border-violet-300',  group: 'Text'        },
  // ── Numbers ─────────────────────────────────────────────────────────────
  { id: 'number',        label: 'Number',        Icon: Hash,             bg: 'bg-blue-50',     text: 'text-blue-600',    border: 'border-blue-300',    group: 'Numbers'     },
  { id: 'decimal',       label: 'Decimal',       Icon: Hash,             bg: 'bg-blue-50',     text: 'text-blue-500',    border: 'border-blue-200',    group: 'Numbers'     },
  { id: 'currency',      label: 'Budget',        Icon: DollarSign,       bg: 'bg-green-50',    text: 'text-green-700',   border: 'border-green-300',   group: 'Numbers'     },
  { id: 'percentage',    label: 'Percentage',    Icon: Percent,          bg: 'bg-lime-50',     text: 'text-lime-700',    border: 'border-lime-300',    group: 'Numbers'     },
  { id: 'rating',        label: 'Star Rating',   Icon: Star,             bg: 'bg-yellow-50',   text: 'text-yellow-500',  border: 'border-yellow-300',  group: 'Numbers'     },
  { id: 'slider',        label: 'Slider',        Icon: SlidersHorizontal,bg: 'bg-fuchsia-50',  text: 'text-fuchsia-600', border: 'border-fuchsia-300', group: 'Numbers'     },
  // ── Date & Time ─────────────────────────────────────────────────────────
  { id: 'date',          label: 'Date',          Icon: Calendar,         bg: 'bg-purple-50',   text: 'text-purple-600',  border: 'border-purple-300',  group: 'Date & Time' },
  { id: 'time',          label: 'Time',          Icon: Clock,            bg: 'bg-orange-50',   text: 'text-orange-600',  border: 'border-orange-300',  group: 'Date & Time' },
  { id: 'datetime',      label: 'Date + Time',   Icon: CalendarClock,    bg: 'bg-purple-50',   text: 'text-purple-500',  border: 'border-purple-200',  group: 'Date & Time' },
  { id: 'duration',      label: 'Duration',      Icon: Timer,            bg: 'bg-orange-50',   text: 'text-orange-500',  border: 'border-orange-200',  group: 'Date & Time' },
  // ── Choice ──────────────────────────────────────────────────────────────
  { id: 'toggle',        label: 'Yes / No',      Icon: ToggleRight,      bg: 'bg-teal-50',     text: 'text-teal-600',    border: 'border-teal-300',    group: 'Choice'      },
  { id: 'select',        label: 'Choose One',    Icon: ChevronDown,      bg: 'bg-indigo-50',   text: 'text-indigo-600',  border: 'border-indigo-300',  group: 'Choice'      },
  { id: 'multi-check',   label: 'Multi-select',  Icon: CheckSquare,      bg: 'bg-pink-50',     text: 'text-pink-600',    border: 'border-pink-300',    group: 'Choice'      },
  // ── Structured ──────────────────────────────────────────────────────────
  { id: 'address',       label: 'Address',       Icon: MapPin,           bg: 'bg-rose-50',     text: 'text-rose-600',    border: 'border-rose-300',    group: 'Structured'  },
  { id: 'priced-item',   label: 'Priced Item',   Icon: Tag,              bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-300',   group: 'Structured'  },
  // ── Calculated ──────────────────────────────────────────────────────────
  { id: 'formula',       label: 'Formula',       Icon: Calculator,       bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-400',   group: 'Calculated'  },
  // ── Layout ──────────────────────────────────────────────────────────────
  { id: 'section-header',label: 'Section Header',Icon: TypeIcon,         bg: 'bg-slate-50',    text: 'text-slate-400',   border: 'border-slate-200',   group: 'Layout'      },
  { id: 'divider',       label: 'Divider',       Icon: Minus,            bg: 'bg-slate-50',    text: 'text-slate-300',   border: 'border-slate-200',   group: 'Layout'      },
  { id: 'instructions',  label: 'Instructions',  Icon: Info,             bg: 'bg-blue-50',     text: 'text-blue-400',    border: 'border-blue-200',    group: 'Layout'      },
];

const detectFieldType = (text) => {
  const t = text.toLowerCase();
  if (/\bemail\b|\be-mail\b/.test(t)) return 'email';
  if (/\bphone\b|\bmobile\b|\btel\b|\bcontact number\b/.test(t)) return 'phone';
  if (/\bwebsite\b|\burl\b|\blink\b|\bsocial\b|\binstagram\b|\bfacebook\b/.test(t)) return 'url';
  if (/\bnotes\b|\bdescription\b|\bdetails\b|\blong\b|\bcomments\b|\bmore info\b|\bspecial req/.test(t)) return 'long-text';
  if (/\baddress\b|\blocation\b.*\bfull\b|\bpostcode\b|\bzip\b/.test(t)) return 'address';
  if (/\bpercent\b|\bpercentage\b|\bdiscount\b|\bvat\b|\btax rate\b|\bservice charge\b/.test(t)) return 'percentage';
  if (/\brating\b|\bscore\b|\bstars?\b|\brate\b/.test(t)) return 'rating';
  if (/\bduration\b|\bhow long\b|\blength of\b/.test(t)) return 'duration';
  if (/\bdate.{0,4}time\b|\bdatetime\b/.test(t)) return 'datetime';
  if (/\bformula\b|\bcalcul/.test(t)) return 'formula';
  if (/\bsection\b|\bheading\b|\bheader\b/.test(t)) return 'section-header';
  if (/\bdivider\b|\bseparator\b/.test(t)) return 'divider';
  if (/\binstructi|\bnote to\b|\bread only\b/.test(t)) return 'instructions';
  if (/\bdate\b|\bwhen\b|\bbirthday\b|\banniversary\b/.test(t)) return 'date';
  if (/\btime\b|\bstart\b|\barrive\b|\bfinish\b/.test(t)) return 'time';
  if (/\bguests?\b|\bhow many\b|\bnumber of\b|\bpeople\b|\bheads\b|\bpax\b|\battendees?\b/.test(t)) return 'number';
  if (/\bbudget\b|\bspend\b|\btotal budget\b/.test(t)) return 'currency';
  if (/yes.{0,5}no\b|\bdo (you|they)\b|\bwould (you|they)\b|\bneed\b|\brequire\b|\bhave (you|they)\b/.test(t)) return 'toggle';
  if (/\bdietary\b|\ballerg|\bvegan\b|\bhalal\b|\bkosher\b|\bgluten\b|\brestrict|\bintoler/.test(t)) return 'multi-check';
  if (/\btype\b|\bstyle\b|\bwhich\b|\boption\b|\bprefer|\bpackage\b|\btier\b/.test(t)) return 'select';
  if (/\bdish\b|\bfood\b|\bmenu\b|\bmeal\b|\bcourse\b|\bstarter\b|\bmain\b|\bdessert\b|\bdrink\b|\bwine\b|\bcanap|\bbuffet\b|\bper head\b|\bitem\b/.test(t)) return 'priced-item';
  return 'text';
};

const extractFieldLabel = (text) => {
  const label = text
    .replace(/^(i always |i usually |i also |i )?ask(s)? (about |for |the |their |if |whether )?/i, '')
    .replace(/^(i need to know |i want to know |i find out |i check |i always start with )/i, '')
    .replace(/^(what('?s)? (the |their |your )?|when is (the |their )?|how many |do (you|they) (have |need )?|would (you|they) (like )?|are (you|they) |have (you|they) (got )?)/i, '')
    .replace(/^(the |their |your |a |an )/i, '')
    .replace(/[?.!]+$/, '')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
  return label.substring(0, 45) || text.substring(0, 45);
};

// Split a long transcript block into sentence-level chunks for per-sentence GPT processing.
// Priority: punctuation → transition phrases → word-count slices (≤25 words each).
function splitIntoChunks(text) {
  const MIN_WORDS = 4;

  // 1. Try punctuation boundaries
  const byPunctuation = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.split(/\s+/).length >= MIN_WORDS);
  if (byPunctuation.length > 1) return byPunctuation;

  // 2. Try natural speech transitions (common in unformatted speech-to-text)
  const transitionRe = /(?<!\w)\s+(?=i also\b|i ask\b|i get\b|i find\b|i check\b|i need\b|i collect\b|i require\b|also i\b|then i\b|next i\b|we also\b|we ask\b|we get\b|we find\b|we check\b|we need\b|and then\b|and also\b|also we\b|then we\b|next we\b|finally\b)/gi;
  const byTransition = text
    .split(transitionRe)
    .map(s => s.trim())
    .filter(s => s.split(/\s+/).length >= MIN_WORDS);
  if (byTransition.length > 1) return byTransition;

  // 3. Hard word-count split (≤18 words per chunk — keeps each chunk focused for GPT)
  const words = text.trim().split(/\s+/);
  if (words.length <= 18) return [text];
  const chunks = [];
  for (let i = 0; i < words.length; i += 18) {
    chunks.push(words.slice(i, i + 18).join(' '));
  }
  return chunks;
}

function OnboardingWorking() {
  const [step, setStep] = useState('setup');
  const [mode, setMode] = useState('client'); // 'client' | 'customer'
  const [selectedTemplateId, setSelectedTemplateId] = useState('default');
  const [savedBanner, setSavedBanner] = useState(null); // name of last-saved template
  const [session, setSession] = useState({ name: '', phone: '' });
  const [callState, setCallState] = useState('idle');
  const [callSeconds, setCallSeconds] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [fields, setFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [addingField, setAddingField] = useState(false);
  const [newField, setNewField] = useState({ label: '', type: 'text', options: '', price: '', priceUnit: 'per_head', formulaExpression: '', content: '', sliderMin: 0, sliderMax: 100 });
  const [lastAdded, setLastAdded] = useState(null);
  const [editingPriceKey, setEditingPriceKey] = useState(null);
  const [reAnalyzing, setReAnalyzing] = useState(false);
  const [conversationSummary, setConversationSummary] = useState('');
  const [p1Transcript, setP1Transcript] = useState([]);
  const [lineText, setLineText] = useState('');
  const [lineSpeaker, setLineSpeaker] = useState('Client');
  const [micActive, setMicActive] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);
  const [recordingUrl, setRecordingUrl] = useState(null);
  const transcriptRef = useRef(null);   // DOM scroll ref
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const transcriptDataRef = useRef([]); // always-current transcript data
  const fieldsRef = useRef([]);         // always-current fields data
  const aiPendingRef = useRef(0);       // count of in-flight AI calls
  const intentionalStopRef = useRef(false); // distinguish user-stop vs browser-stop
  const timerRef = useRef(null);
  const lineInputRef = useRef(null);
  const streamRef = useRef(null);
  const speakerRef = useRef('Client');
  const recognitionRef = useRef(null);
  const speechBufferRef = useRef('');
  const bufferTimerRef = useRef(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);
  useEffect(() => { speakerRef.current = lineSpeaker; }, [lineSpeaker]);
  useEffect(() => { transcriptDataRef.current = transcript; }, [transcript]);
  useEffect(() => { fieldsRef.current = fields; }, [fields]);
  useEffect(() => () => { stopMic(); clearInterval(timerRef.current); clearTimeout(bufferTimerRef.current); }, []);

  // ── localStorage persistence ─────────────────────────────────────────────
  const SESSION_KEY  = 'smq_session_v1';
  const TEMPLATE_KEY = 'smq_template_v1';  // single latest-template (legacy compat)
  const TEMPLATES_KEY = 'smq_templates_v1'; // named template library

  const getTemplates = () => {
    try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY)) || []; } catch { return []; }
  };

  // Default fields used when no Client Onboarding template has been saved yet
  const DEFAULT_CUSTOMER_FIELDS = [
    { key: 'dcf_name',    label: 'Customer Name',          type: 'text',        options: [], price: 0, priceUnit: 'per_head', formulaExpression: '', content: '', suggested: false },
    { key: 'dcf_email',   label: 'Email Address',          type: 'email',       options: [], price: 0, priceUnit: 'per_head', formulaExpression: '', content: '', suggested: false },
    { key: 'dcf_phone',   label: 'Phone Number',           type: 'phone',       options: [], price: 0, priceUnit: 'per_head', formulaExpression: '', content: '', suggested: false },
    { key: 'dcf_etype',   label: 'Work Type',              type: 'select',      options: ['Full Replacement','Repair','Inspection','Emergency','New Construction'], price: 0, priceUnit: 'per_head', formulaExpression: '', content: '', suggested: false },
    { key: 'dcf_date',    label: 'Job Date',               type: 'date',        options: [], price: 0, priceUnit: 'per_head', formulaExpression: '', content: '', suggested: false },
    { key: 'dcf_guests',  label: 'Roof Squares',           type: 'number',      options: [], price: 0, priceUnit: 'per_head', formulaExpression: '', content: '', suggested: false },
    { key: 'dcf_venue',   label: 'Job Address',            type: 'text',        options: [], price: 0, priceUnit: 'per_head', formulaExpression: '', content: '', suggested: false },
    { key: 'dcf_style',   label: 'Material',               type: 'select',      options: ['30-yr Architectural','Impact-Resistant (Class 4)','Metal','TPO','EPDM'], price: 0, priceUnit: 'per_head', formulaExpression: '', content: '', suggested: false },
    { key: 'dcf_budget',  label: 'Budget',                 type: 'currency',    options: [], price: 0, priceUnit: 'per_head', formulaExpression: '', content: '', suggested: false },
    { key: 'dcf_dietary', label: 'Dietary Requirements',   type: 'multi-check', options: ['Vegan','Vegetarian','Gluten Free','Nut Free','Halal','Kosher'], price: 0, priceUnit: 'per_head', formulaExpression: '', content: '', suggested: false },
    { key: 'dcf_notes',   label: 'Special Requirements',   type: 'long-text',   options: [], price: 0, priceUnit: 'per_head', formulaExpression: '', content: '', suggested: false },
  ];

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (saved?.step && saved.step !== 'setup') {
        if (saved.step)               setStep(saved.step);
        if (saved.mode)               setMode(saved.mode);
        if (saved.session)            setSession(saved.session);
        if (saved.fields?.length)     setFields(saved.fields);
        if (saved.fieldValues)        setFieldValues(saved.fieldValues);
        if (saved.transcript?.length) setTranscript(saved.transcript);
        if (saved.p1Transcript?.length) setP1Transcript(saved.p1Transcript);
        if (saved.conversationSummary) setConversationSummary(saved.conversationSummary);
      }
    } catch { /* ignore corrupt storage */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  useEffect(() => {
    if (step === 'setup') return; // don't persist the blank setup screen
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        step, mode, session, fields, fieldValues, transcript, p1Transcript, conversationSummary,
      }));
    } catch { /* ignore storage quota errors */ }
  }, [step, mode, session, fields, fieldValues, transcript, p1Transcript, conversationSummary]);
  // ────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // --- TWILIO HOOKS — wire these up when ready ---
  const startCall = () => {
    // TODO: Twilio.Device.connect({ params: { To: session.phone } })
    setCallState('connecting');
    setCallStartTime(new Date());
    // Revoke any previous recording to free memory
    if (recordingUrl) { try { URL.revokeObjectURL(recordingUrl); } catch { /* ignore */ } setRecordingUrl(null); }
    setTimeout(() => {
      setCallState('active');
      // Start audio recording (best-effort — no mic permission = no recording)
      navigator.mediaDevices?.getUserMedia({ audio: true }).then(stream => {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
        const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        recordingChunksRef.current = [];
        mr.ondataavailable = e => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
        mr.onstop = () => {
          const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
          setRecordingUrl(URL.createObjectURL(blob));
          stream.getTracks().forEach(t => t.stop());
        };
        mr.start();
        mediaRecorderRef.current = mr;
      }).catch(() => { /* recording not available */ });
    }, 1500); // Remove when Twilio is wired
  };
  const endCall = () => {
    // TODO: Twilio.Device.disconnectAll()
    stopMic();
    try { if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    setCallState('ended');
  };
  // --- END TWILIO HOOKS ---

  // Called by Twilio (or mic recording) when a new transcript line arrives.
  // _skipTranscript=true is used internally when flushing a buffered fragment
  // that was already added to the transcript — we only need the AI analysis.
  const onTranscriptLine = useCallback(async (speaker, text, _skipTranscript = false) => {
    if (!_skipTranscript) {
      setTranscript(prev => [...prev, { speaker, text }]);
    }

    // Track pending calls to show/hide AI thinking indicator correctly
    aiPendingRef.current += 1;
    setAiThinking(true);

    try {
      if (step === 'p1' && speaker === 'Client') {
        // Buffer very short fragments — combine with next line
        const wordCount = text.trim().split(/\s+/).length;
        let lineToAnalyse = text;
        if (!_skipTranscript && wordCount < 5) {
          speechBufferRef.current = speechBufferRef.current
            ? `${speechBufferRef.current} ${text}`
            : text;
          // Auto-flush after 5s in case no longer line ever follows
          clearTimeout(bufferTimerRef.current);
          bufferTimerRef.current = setTimeout(() => {
            const buffered = speechBufferRef.current;
            if (buffered) {
              speechBufferRef.current = '';
              onTranscriptLineRef.current(speaker, buffered, true);
            }
          }, 5000);
          return;
        }
        // A normal line cancels any pending buffer flush
        clearTimeout(bufferTimerRef.current);
        if (!_skipTranscript && speechBufferRef.current) {
          lineToAnalyse = `${speechBufferRef.current} ${text}`;
          speechBufferRef.current = '';
        }

        // Split into sentence-level chunks and process SEQUENTIALLY so each chunk
        // receives an up-to-date label list — prevents the same field appearing
        // multiple times when it's mentioned across several chunks in one speech block.
        const chunks = splitIntoChunks(lineToAnalyse);
        const context = transcriptDataRef.current.slice(-4);

        // rollingLabels grows as we find fields — passed to every subsequent chunk call
        const rollingLabels = fieldsRef.current.map(f => f.label);
        const allNewFields = [];

        for (let ci = 0; ci < chunks.length; ci++) {
          const result = await suggestField(chunks[ci], context, rollingLabels);
          if (!result.suggest || !result.fields?.length) continue;

          for (const f of result.fields) {
            const cleanLabel = (f.label || '')
              .replace(/[_-]/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase());

            // Fuzzy dedup: strip filler words, sort remaining words, compare
            // catches "Monthly Budget" == "Budget Monthly", "Client Name" == "Name"
            const labelKey = cleanLabel
              .toLowerCase()
              .replace(/\b(client|my|their|the|a|an)\b/g, '')
              .replace(/[^a-z0-9\s]/g, '').trim()
              .split(/\s+/).filter(Boolean).sort().join(' ');

            const alreadyExists = rollingLabels.some(existing => {
              const existKey = existing
                .toLowerCase()
                .replace(/\b(client|my|their|the|a|an)\b/g, '')
                .replace(/[^a-z0-9\s]/g, '').trim()
                .split(/\s+/).filter(Boolean).sort().join(' ');
              return existKey === labelKey;
            });

            if (!alreadyExists) {
              allNewFields.push({
                key: `f_${Date.now()}_${ci}_${allNewFields.length}`,
                label: cleanLabel,
                type: f.type || 'text',
                options: ['select','multi-check'].includes(f.type) ? (f.options || []) : [],
                price: f.price || 0,
                priceUnit: f.priceUnit || 'per_head',
                formulaExpression: f.type === 'formula' ? (f.formulaExpression || '') : '',
                content: ['section-header','instructions'].includes(f.type) ? (f.content || '') : '',
                sliderMin: f.type === 'slider' ? (f.sliderMin ?? 0) : undefined,
                sliderMax: f.type === 'slider' ? (f.sliderMax ?? 100) : undefined,
                suggested: f.suggested === true,
              });
              rollingLabels.push(cleanLabel); // update so next chunk sees it
            }
          }
        }

        if (allNewFields.length) {
          setFields(prev => [...prev, ...allNewFields]);
          setLastAdded(allNewFields.map(f => f.label).join(', '));
          setTimeout(() => setLastAdded(null), 3000);
        }
      }

      // P2: only process Client lines so agent questions don't trigger false fills
      if (step === 'p2' && speaker === 'Client') {
        const context = transcriptDataRef.current.slice(-4);
        const result = await fillFields(text, fieldsRef.current, context);
        result.fills?.forEach(({ key, value }) => setVal(key, value));
      }
    } catch (err) {
      console.error('AI error:', err);
      setApiError('AI analysis failed — check your connection');
      setTimeout(() => setApiError(null), 4000);
    } finally {
      aiPendingRef.current -= 1;
      if (aiPendingRef.current === 0) setAiThinking(false);
    }
  }, [step]);

  // Keep a ref so async callbacks (Web Speech, Whisper) always call the latest version
  const onTranscriptLineRef = useRef(null);
  onTranscriptLineRef.current = onTranscriptLine;

  // --- MIC RECORDING — Web Speech API (real-time), Whisper fallback ---
  const recorderRef = useRef(null);
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const startMic = async () => {
    if (micActive) return;
    intentionalStopRef.current = false; // reset so auto-restart works after a manual stop/start cycle
    if (SpeechRecognition) {
      // Real-time path: Web Speech API
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setInterimText('');
            onTranscriptLineRef.current(speakerRef.current, t.trim());
          } else {
            interim += t;
          }
        }
        setInterimText(interim);
      };
      recognition.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'permission-denied') {
          setApiError('Microphone access denied — check browser permissions');
          setTimeout(() => setApiError(null), 5000);
          intentionalStopRef.current = true;
        }
      };
      recognition.onend = () => {
        setInterimText('');
        // Auto-restart unless the user explicitly stopped or mic was denied
        if (!intentionalStopRef.current && recognitionRef.current) {
          try { recognition.start(); } catch { setMicActive(false); }
        } else {
          setMicActive(false);
        }
      };
      recognition.start();
      setMicActive(true);
    } else {
      // Fallback: Whisper batch
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const chunks = [];
        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          streamRef.current = null;
          setMicActive(false);
          const blob = new Blob(chunks, { type: 'audio/webm' });
          if (blob.size > 1500) {
            try {
              const text = await transcribeAudio(blob);
              if (text) await onTranscriptLineRef.current(speakerRef.current, text);
            } catch (err) { console.error('Whisper error:', err); }
          }
        };
        recorder.start();
        setMicActive(true);
      } catch {
        alert('Microphone access denied. Check browser permissions.');
      }
    }
  };

  const stopMic = () => {
    intentionalStopRef.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    } else if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
    setMicActive(false);
    setInterimText('');
  };
  // --- END MIC ---

  // Test-mode manual entry
  const addTranscriptLine = () => {
    if (!lineText.trim()) return;
    onTranscriptLine(lineSpeaker, lineText.trim());
    setLineText('');
    lineInputRef.current?.focus();
  };


  const commitField = () => {
    if (!newField.label.trim()) return;
    const key = `f_${Date.now()}`;
    setFields(prev => [...prev, {
      key,
      label: newField.label.trim(),
      type: newField.type,
      options: ['select','multi-check'].includes(newField.type)
        ? newField.options.split(',').map(o => o.trim()).filter(Boolean)
        : [],
      price: parseFloat(newField.price) || 0,
      priceUnit: newField.priceUnit,
      formulaExpression: newField.type === 'formula' ? newField.formulaExpression.trim() : '',
      content: ['section-header','instructions'].includes(newField.type) ? newField.content.trim() : '',
      sliderMin: newField.type === 'slider' ? (newField.sliderMin ?? 0) : undefined,
      sliderMax: newField.type === 'slider' ? (newField.sliderMax ?? 100) : undefined,
      suggested: false,
    }]);
    setNewField({ label: '', type: 'text', options: '', price: '', priceUnit: 'per_head', formulaExpression: '', content: '', sliderMin: 0, sliderMax: 100 });
    setAddingField(false);
  };

  const removeField = key => setFields(prev => prev.filter(f => f.key !== key));
  const setVal = (key, val) => setFieldValues(prev => ({ ...prev, [key]: val }));

  // Finish Client Onboarding — runs final analysis, saves as named template, returns to setup
  const finishClientOnboarding = async () => {
    clearTimeout(bufferTimerRef.current);
    const finalTranscript = speechBufferRef.current
      ? [...transcript, { speaker: speakerRef.current, text: speechBufferRef.current }]
      : [...transcript];
    speechBufferRef.current = '';

    setReAnalyzing(true);
    setP1Transcript(finalTranscript);
    let savedFields = fields;
    try {
      const result = await analyzeFullConversation(finalTranscript, fields);
      if (result.fields?.length) {
        savedFields = result.fields.map((f, i) => ({
          key: `f_rev_${i}_${Date.now()}`,
          label: f.label,
          type: f.type || 'text',
          options: f.options || [],
          price: f.price || 0,
          priceUnit: f.priceUnit || 'per_head',
          formulaExpression: f.formulaExpression || '',
          content: f.content || '',
          suggested: f.suggested === true,
        }));
        setFields(savedFields);
      }
      if (result.summary) setConversationSummary(result.summary);
    } catch (e) {
      console.error('Re-analysis error:', e);
      setApiError('Re-analysis failed — fields kept as detected');
      setTimeout(() => setApiError(null), 5000);
    }
    setReAnalyzing(false);

    // Auto-confirm any formula suggestions the user didn't explicitly dismiss
    const confirmedFields = savedFields.map(f => f.suggested ? { ...f, suggested: false } : f);
    if (confirmedFields.some((f, i) => f !== savedFields[i])) {
      savedFields = confirmedFields;
      setFields(confirmedFields);
    }

    // Save as named template in the library
    const templateName = session.name || 'Untitled form';
    const newTemplate = { id: Date.now().toString(), name: templateName, savedAt: Date.now(), fields: savedFields };
    try {
      const existing = getTemplates();
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify([newTemplate, ...existing].slice(0, 20)));
      localStorage.setItem(TEMPLATE_KEY, JSON.stringify({ fields: savedFields })); // legacy compat
    } catch { /* ignore */ }

    // Go to completion screen — user starts a new session from there
    setStep('p1-complete');
  };

  // Start Customer Onboarding — load selected template or default fields
  const startCustomerOnboarding = () => {
    if (!session.name.trim()) return;
    let fieldsToUse = DEFAULT_CUSTOMER_FIELDS;
    if (selectedTemplateId !== 'default') {
      const tmpl = getTemplates().find(t => t.id === selectedTemplateId);
      if (tmpl?.fields?.length) fieldsToUse = tmpl.fields;
    }
    setFields(fieldsToUse);
    setFieldValues({});
    setTranscript([]);
    setP1Transcript([]);
    setConversationSummary('');
    setCallState('idle');
    setCallSeconds(0);
    setStep('p2');
  };

  const reset = () => {
    clearInterval(timerRef.current);
    clearTimeout(bufferTimerRef.current);
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    speechBufferRef.current = '';
    aiPendingRef.current = 0;
    try { if (recordingUrl) URL.revokeObjectURL(recordingUrl); } catch { /* ignore */ }
    setStep('setup'); setMode('client'); setSelectedTemplateId('default'); setSavedBanner(null); setSession({ name: '', phone: '' }); setCallState('idle'); setCallSeconds(0); setCallStartTime(null); setRecordingUrl(null);
    setTranscript([]); setFields([]); setFieldValues({});
    setAddingField(false); setNewField({ label: '', type: 'text', options: '', price: '', priceUnit: 'per_head', formulaExpression: '', content: '' });
    setLastAdded(null); setConversationSummary(''); setP1Transcript([]); setLineText('');
    setAiThinking(false); setApiError(null);
  };

  const typeDef = id => FIELD_TYPE_DEFS.find(d => d.id === id) || FIELD_TYPE_DEFS[0];

  // Update the saved template in localStorage when user edits fields on the completion screen
  const saveTemplateUpdate = (updatedFields, templateName) => {
    try {
      const existing = getTemplates();
      // Replace the most recent template (first entry) that matches the current session name
      const name = templateName || session.name || 'Untitled form';
      const idx = existing.findIndex(t => t.name === name);
      const updated = { id: idx >= 0 ? existing[idx].id : Date.now().toString(), name, savedAt: Date.now(), fields: updatedFields };
      const next = idx >= 0 ? existing.map((t, i) => i === idx ? updated : t) : [updated, ...existing];
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next.slice(0, 20)));
      localStorage.setItem(TEMPLATE_KEY, JSON.stringify({ fields: updatedFields }));
    } catch { /* ignore */ }
  };

  const evaluateFormula = (expression, allFields, values) => {
    if (!expression) return <span className="text-amber-400 italic text-xs">No expression set</span>;
    try {
      const resolved = expression.replace(/\{([^}]+)\}/g, (_, label) => {
        const match = allFields.find(f => f.label.toLowerCase() === label.toLowerCase());
        if (!match) return 0;
        const v = values[match.key];
        return (v !== undefined && v !== '' ? parseFloat(v) || 0 : 0);
      });
      if (!/^[\d\s+\-*/().]+$/.test(resolved)) {
        return <span className="text-red-400 text-xs">Invalid expression</span>;
      }
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + resolved + ')')();
      return <span className="text-amber-900 font-bold">{isNaN(result) ? '—' : result.toFixed(2)}</span>;
    } catch {
      return <span className="text-red-400 text-xs">Error evaluating</span>;
    }
  };

  const renderFieldPreview = (field) => {
    // ── Layout types: structural rendering, no standard card ──────────────
    if (field.type === 'section-header') {
      return (
        <div key={field.key} className="flex items-center justify-between pt-2 pb-1">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex-1">{field.label || 'Section Header'}</h3>
          <button onClick={() => removeField(field.key)} className="text-slate-200 hover:text-red-400 transition-colors ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
    if (field.type === 'divider') {
      return (
        <div key={field.key} className="flex items-center gap-2 py-1">
          <hr className="flex-1 border-slate-200" />
          <button onClick={() => removeField(field.key)} className="text-slate-200 hover:text-red-400 transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      );
    }
    if (field.type === 'instructions') {
      return (
        <div key={field.key} className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">{field.content || field.label || 'Instruction text'}</p>
          </div>
          <button onClick={() => removeField(field.key)} className="text-blue-200 hover:text-red-400 transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    const def = typeDef(field.type);
    const { Icon } = def;
    const isEditingPrice = editingPriceKey === field.key;
    return (
      <div key={field.key} className={`bg-white rounded-xl px-4 py-3 anim-slide-up ${field.suggested ? 'border-2 border-dashed border-amber-400 bg-amber-50/30' : `border ${def.border}`}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${def.bg}`}>
              <Icon className={`w-3.5 h-3.5 ${def.text}`} />
            </span>
            <span className="text-sm font-semibold text-slate-700">{field.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {!field.suggested && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${def.bg} ${def.text}`}>{def.label}</span>}
            <button onClick={() => removeField(field.key)} className="text-slate-300 hover:text-red-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {field.type === 'priced-item' && (
          <div className="mt-1">
            {isEditingPrice ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 font-medium">$</span>
                <input
                  autoFocus
                  type="number"
                  defaultValue={field.price || ''}
                  onBlur={e => { setFields(p => p.map(f => f.key === field.key ? { ...f, price: parseFloat(e.target.value) || 0 } : f)); setEditingPriceKey(null); }}
                  onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                  className="w-24 px-2 py-1.5 rounded-lg border border-amber-300 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="0.00"
                />
                <select
                  defaultValue={field.priceUnit}
                  onChange={e => setFields(p => p.map(f => f.key === field.key ? { ...f, priceUnit: e.target.value } : f))}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none bg-white"
                >
                  <option value="per_head">per head</option>
                  <option value="flat">flat rate</option>
                </select>
              </div>
            ) : (
              <button
                onClick={() => setEditingPriceKey(field.key)}
                className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors border border-amber-200"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span className="font-semibold">{field.price > 0 ? `$${field.price}` : 'Set price'}</span>
                {field.price > 0 && <span className="text-amber-500 font-normal">{field.priceUnit === 'per_head' ? 'per head' : 'flat rate'}</span>}
                <Edit3 className="w-3 h-3 text-amber-400 ml-1" />
              </button>
            )}
          </div>
        )}
        {['select','multi-check'].includes(field.type) && field.options?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {field.options.map(o => (
              <span key={o} className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${def.bg} ${def.text}`}>{o}</span>
            ))}
          </div>
        )}
        {field.type === 'rating' && (
          <div className="flex items-center gap-1 mt-1">
            {[1,2,3,4,5].map(n => <Star key={n} className="w-4 h-4 text-yellow-300" />)}
            <span className="text-xs text-slate-400 ml-1">1–5 stars</span>
          </div>
        )}
        {field.type === 'slider' && (
          <div className="mt-2 px-1">
            <input type="range" min={0} max={100} defaultValue={50} disabled className="w-full accent-fuchsia-500 opacity-60" />
          </div>
        )}
        {field.type === 'formula' && (
          <div className="mt-2">
            {field.suggested ? (
              <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 px-3 py-2 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-600 flex-shrink-0" />
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">AI Suggestion</span>
                </div>
                <code className="text-xs text-amber-800 font-mono leading-relaxed block">= {field.formulaExpression || '…'}</code>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setFields(prev => prev.map(f => f.key === field.key ? { ...f, suggested: false } : f))}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
                  >
                    <Check className="w-3 h-3" /> Confirm
                  </button>
                  <button
                    onClick={() => removeField(field.key)}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg border border-amber-300 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors"
                  >
                    <X className="w-3 h-3" /> Dismiss
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 rounded-lg px-3 py-2">
                <code className="text-xs text-amber-700 font-mono">= {field.formulaExpression || '(no expression)'}</code>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderFieldInput = (field) => {
    // ── Layout types: structural rendering, no input ──────────────────────
    if (field.type === 'section-header') {
      return (
        <div key={field.key} className="flex items-center pt-3 pb-1">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{field.label}</h3>
        </div>
      );
    }
    if (field.type === 'divider') {
      return <hr key={field.key} className="border-slate-200 my-1" />;
    }
    if (field.type === 'instructions') {
      return (
        <div key={field.key} className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">{field.content || field.label}</p>
        </div>
      );
    }

    const val = fieldValues[field.key];
    const def = typeDef(field.type);
    const { Icon } = def;
    const filled = val !== undefined && val !== '' && val !== false && !(Array.isArray(val) && val.length === 0) && !(typeof val === 'object' && !Array.isArray(val) && val !== null && val.hours === undefined);
    const inputCls = `w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-slate-900 transition placeholder:text-slate-300 ${filled ? 'border-green-300 bg-green-50 text-green-900' : 'border-slate-200 bg-white'}`;

    // ── Formula: read-only calculated display ─────────────────────────────
    if (field.type === 'formula') {
      return (
        <div key={field.key} className="bg-white rounded-xl border border-amber-200 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50">
              <Calculator className="w-3.5 h-3.5 text-amber-700" />
            </span>
            <label className="text-sm font-semibold text-slate-700">{field.label}</label>
          </div>
          <div className="px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50">
            <span className="text-[10px] text-amber-500 font-semibold block mb-1">Calculated</span>
            <span className="text-sm font-mono">{evaluateFormula(field.formulaExpression, fields, fieldValues)}</span>
          </div>
        </div>
      );
    }

    return (
      <div key={field.key} className={`bg-white rounded-xl border px-4 py-3 transition-all duration-300 ${filled ? 'border-green-200 shadow-sm shadow-green-50' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${def.bg}`}>
              <Icon className={`w-3.5 h-3.5 ${def.text}`} />
            </span>
            <label className="text-sm font-semibold text-slate-700">{field.label}</label>
          </div>
          {filled && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Check className="w-2.5 h-2.5" />Filled</span>}
        </div>

        {field.type === 'toggle' && (
          <button
            onClick={() => setVal(field.key, !val)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all w-full ${val ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
          >
            <div className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${val ? 'bg-green-500' : 'bg-slate-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${val ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
            <span className={`text-sm font-semibold ${val ? 'text-green-700' : 'text-slate-500'}`}>{val ? 'Yes' : 'No — tap to toggle'}</span>
          </button>
        )}

        {field.type === 'multi-check' && (
          <div className="space-y-2">
            {(field.options?.length ? field.options : ['Option A','Option B']).map(opt => {
              const checked = Array.isArray(val) && val.includes(opt);
              return (
                <label key={opt} className="flex items-center gap-3 cursor-pointer group py-0.5">
                  <div
                    onClick={() => { const c = Array.isArray(val) ? val : []; setVal(field.key, checked ? c.filter(v => v !== opt) : [...c, opt]); }}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${checked ? 'bg-green-500 border-green-500' : 'border-slate-300 group-hover:border-slate-400'}`}
                  >
                    {checked && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-slate-700">{opt}</span>
                </label>
              );
            })}
          </div>
        )}

        {field.type === 'select' && (
          <select value={val || ''} onChange={e => setVal(field.key, e.target.value)} className={`${inputCls} bg-white`}>
            <option value="">Select…</option>
            {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}

        {field.type === 'priced-item' && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold ${filled ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              <DollarSign className="w-3.5 h-3.5" />
              ${field.price || '—'} <span className="font-normal text-xs">{field.priceUnit === 'per_head' ? 'per head' : 'flat'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setVal(field.key, Math.max(0, (parseInt(val)||0) - 1))} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-700 font-bold text-lg leading-none">−</button>
              <span className="text-base font-bold text-slate-900 w-8 text-center tabular-nums">{parseInt(val) || 0}</span>
              <button onClick={() => setVal(field.key, (parseInt(val)||0) + 1)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-700 font-bold text-lg leading-none">+</button>
            </div>
            {field.price > 0 && (parseInt(val)||0) > 0 && (
              <span className="text-sm font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-xl">
                = ${(field.price * (parseInt(val)||0)).toFixed(2)}
              </span>
            )}
          </div>
        )}

        {field.type === 'currency' && (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
            <input type="number" value={val || ''} onChange={e => setVal(field.key, e.target.value)} placeholder="0.00" className={`${inputCls} pl-8`} />
          </div>
        )}
        {field.type === 'date' && <input type="date" value={val || ''} onChange={e => setVal(field.key, e.target.value)} className={inputCls} />}
        {field.type === 'time' && <input type="time" value={val || ''} onChange={e => setVal(field.key, e.target.value)} className={inputCls} />}
        {field.type === 'datetime' && <input type="datetime-local" value={val || ''} onChange={e => setVal(field.key, e.target.value)} className={inputCls} />}
        {field.type === 'number' && <input type="number" value={val || ''} onChange={e => setVal(field.key, e.target.value)} placeholder="0" className={inputCls} />}
        {field.type === 'decimal' && <input type="number" step="0.01" value={val || ''} onChange={e => setVal(field.key, e.target.value)} placeholder="0.00" className={inputCls} />}
        {field.type === 'text' && <input type="text" value={val || ''} onChange={e => setVal(field.key, e.target.value)} placeholder="Type answer…" className={inputCls} />}
        {field.type === 'long-text' && <textarea rows={3} value={val || ''} onChange={e => setVal(field.key, e.target.value)} placeholder="Type answer…" className={`${inputCls} resize-none`} />}
        {field.type === 'email' && <input type="email" value={val || ''} onChange={e => setVal(field.key, e.target.value)} placeholder="name@example.com" className={inputCls} />}
        {field.type === 'phone' && <input type="tel" value={val || ''} onChange={e => setVal(field.key, e.target.value)} placeholder="+44 7700 900123" className={inputCls} />}
        {field.type === 'url' && <input type="url" value={val || ''} onChange={e => setVal(field.key, e.target.value)} placeholder="https://" className={inputCls} />}
        {field.type === 'address' && <textarea rows={3} value={val || ''} onChange={e => setVal(field.key, e.target.value)} placeholder="Street address, city, postcode" className={`${inputCls} resize-none`} />}
        {field.type === 'percentage' && (
          <div className="relative">
            <input type="number" step="0.1" min={0} max={100} value={val || ''} onChange={e => setVal(field.key, e.target.value)} placeholder="0" className={`${inputCls} pr-8`} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">%</span>
          </div>
        )}
        {field.type === 'rating' && (
          <div className="flex items-center gap-1.5 py-1">
            {[1,2,3,4,5].map(n => {
              const active = parseInt(val) >= n;
              return (
                <button key={n} onClick={() => setVal(field.key, n)} className="transition-transform hover:scale-110 active:scale-95">
                  <Star className={`w-7 h-7 transition-colors ${active ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
                </button>
              );
            })}
            {val && <span className="text-sm font-semibold text-slate-600 ml-2">{val} / 5</span>}
          </div>
        )}
        {field.type === 'slider' && (
          <div className="space-y-2">
            <input
              type="range"
              min={field.sliderMin ?? 0}
              max={field.sliderMax ?? 100}
              value={val ?? (field.sliderMin ?? 0)}
              onChange={e => setVal(field.key, Number(e.target.value))}
              className="w-full accent-fuchsia-500"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>{field.sliderMin ?? 0}</span>
              <span className="font-bold text-fuchsia-700 text-sm">{val ?? '—'}</span>
              <span>{field.sliderMax ?? 100}</span>
            </div>
          </div>
        )}
        {field.type === 'duration' && (
          <div className="flex items-center gap-2 flex-wrap">
            <input type="number" min={0} value={val?.hours ?? ''} onChange={e => setVal(field.key, { ...(val||{}), hours: parseInt(e.target.value) || 0 })} placeholder="0" className={`${inputCls} w-20`} />
            <span className="text-sm text-slate-500 font-medium">h</span>
            <input type="number" min={0} max={59} value={val?.minutes ?? ''} onChange={e => setVal(field.key, { ...(val||{}), minutes: parseInt(e.target.value) || 0 })} placeholder="0" className={`${inputCls} w-20`} />
            <span className="text-sm text-slate-500 font-medium">min</span>
          </div>
        )}
      </div>
    );
  };

  // SETUP
  if (step === 'setup') {
    const savedTemplates = getTemplates();
    const fmt = ts => { const d = new Date(ts); return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }); };
    return (
      <div className="min-h-full bg-[#F7F7F5] flex items-start justify-center p-6 md:p-8 overflow-y-auto">
        <div className="w-full max-w-lg pt-4 pb-8">

          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900 mb-1">Start a session</h2>
            <p className="text-slate-500 text-sm">Choose the type of session you'd like to run.</p>
          </div>

          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setMode('client')}
              className={`text-left p-4 rounded-2xl border-2 transition-all ${mode === 'client' ? 'border-slate-900 bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${mode === 'client' ? 'bg-slate-900' : 'bg-slate-100'}`}>
                <UserPlus className={`w-4 h-4 ${mode === 'client' ? 'text-white' : 'text-slate-500'}`} />
              </div>
              <div className={`font-bold text-sm mb-1 ${mode === 'client' ? 'text-slate-900' : 'text-slate-700'}`}>Client Onboarding</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">AI listens to your discovery call and builds your intake form in real time.</p>
            </button>
            <button
              onClick={() => setMode('customer')}
              className={`text-left p-4 rounded-2xl border-2 transition-all ${mode === 'customer' ? 'border-green-600 bg-green-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${mode === 'customer' ? 'bg-green-600' : 'bg-slate-100'}`}>
                <Phone className={`w-4 h-4 ${mode === 'customer' ? 'text-white' : 'text-slate-500'}`} />
              </div>
              <div className={`font-bold text-sm mb-1 ${mode === 'customer' ? 'text-green-900' : 'text-slate-700'}`}>Customer Onboarding</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">Customer calls to enquire — AI fills your form and generates a quote live.</p>
            </button>
          </div>

          {/* Template picker — only shown when Customer Onboarding is selected */}
          {mode === 'customer' && (
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Select intake form</label>
              <div className="space-y-2">
                {/* Default template */}
                <button
                  onClick={() => setSelectedTemplateId('default')}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${selectedTemplateId === 'default' ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedTemplateId === 'default' ? 'bg-green-100' : 'bg-slate-100'}`}>
                    <FileText className={`w-4 h-4 ${selectedTemplateId === 'default' ? 'text-green-700' : 'text-slate-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${selectedTemplateId === 'default' ? 'text-green-900' : 'text-slate-700'}`}>Default roofing template</div>
                    <div className="text-[11px] text-slate-400">8 standard fields — name, address, work type, squares, pitch, material…</div>
                  </div>
                  {selectedTemplateId === 'default' && <Check className="w-4 h-4 text-green-600 flex-shrink-0" />}
                </button>

                {/* Saved templates from Client Onboarding */}
                {savedTemplates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${selectedTemplateId === t.id ? 'border-slate-900 bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedTemplateId === t.id ? 'bg-slate-900' : 'bg-slate-100'}`}>
                      <FileEdit className={`w-4 h-4 ${selectedTemplateId === t.id ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold truncate ${selectedTemplateId === t.id ? 'text-slate-900' : 'text-slate-700'}`}>{t.name}</div>
                      <div className="text-[11px] text-slate-400">{t.fields.length} fields · saved {fmt(t.savedAt)}</div>
                    </div>
                    {selectedTemplateId === t.id && <Check className="w-4 h-4 text-slate-700 flex-shrink-0" />}
                  </button>
                ))}

                {savedTemplates.length === 0 && (
                  <p className="text-[11px] text-slate-400 px-1">No saved forms yet — run Client Onboarding to build and save your own.</p>
                )}
              </div>
            </div>
          )}

          {/* Setup form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                {mode === 'customer' ? 'Customer Name' : 'Client Name'}
              </label>
              <input
                autoFocus
                type="text"
                value={session.name}
                onChange={e => setSession(s => ({ ...s, name: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && session.name.trim()) {
                    mode === 'customer' ? startCustomerOnboarding() : setStep('p1');
                  }
                }}
                placeholder={mode === 'customer' ? 'e.g. Sarah Jenkins' : "e.g. Jane's Photography"}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition placeholder:text-slate-300"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Phone Number <span className="text-slate-300 font-normal normal-case tracking-normal">— connect via Twilio</span>
              </label>
              <input
                type="tel"
                value={session.phone}
                onChange={e => setSession(s => ({ ...s, phone: e.target.value }))}
                placeholder="+44 7700 900123"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition placeholder:text-slate-300"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => { if (!session.name.trim()) return; mode === 'customer' ? startCustomerOnboarding() : setStep('p1'); }}
              disabled={!session.name.trim()}
              className={`flex items-center gap-2 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${mode === 'customer' ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-900 hover:bg-slate-700'}`}
            >
              <PhoneCall className="w-4 h-4" />
              {mode === 'customer' ? 'Begin Customer Onboarding' : 'Begin Client Onboarding'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // P1 + P2 SHARED CALL LAYOUT
  if (step === 'p1' || step === 'p2') {
    const isP2 = step === 'p2';
    const LAYOUT_TYPES = ['section-header','divider','instructions'];
    const fillableFields = fields.filter(f => !LAYOUT_TYPES.includes(f.type) && f.type !== 'formula');
    const filledCount = fillableFields.filter(f => {
      const v = fieldValues[f.key];
      return v !== undefined && v !== '' && v !== false && !(Array.isArray(v) && !v.length);
    }).length;

    if (reAnalyzing) return (
      <div className="h-full flex flex-col items-center justify-center bg-[#F7F7F5] gap-6">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />
        <div className="text-center">
          <p className="font-semibold text-slate-800 text-lg">Finalising your intake form…</p>
          <p className="text-slate-500 text-sm mt-1">AI is reviewing the transcript to clean up and save your form</p>
        </div>
      </div>
    );

    return (
      <div className="h-full flex flex-col md:flex-row overflow-hidden">

        {/* LEFT / TOP: Call + Transcript */}
        <div className="flex flex-col md:w-[40%] md:border-r border-slate-200 bg-white flex-shrink-0 md:overflow-hidden">

          {/* Call header */}
          <div className={`px-4 py-3 flex items-center gap-3 flex-shrink-0 transition-colors ${callState === 'active' ? 'bg-slate-900' : 'bg-slate-100 border-b border-slate-200'}`}>
            {callState === 'active' && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-semibold truncate ${callState === 'active' ? 'text-white' : 'text-slate-700'}`}>
                {session.name} — {isP2 ? 'Customer Onboarding' : 'Client Onboarding'}
              </div>
              <div className={`text-xs font-mono ${callState === 'active' ? 'text-slate-400' : 'text-slate-400'}`}>
                {callState === 'active' ? fmt(callSeconds) : callState === 'connecting' ? 'Connecting…' : callState === 'ended' ? 'Call ended' : 'Not connected'}
              </div>
            </div>
            {(callState === 'idle' || callState === 'ended') && (
              <button onClick={startCall} className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors flex-shrink-0">
                <Phone className="w-3 h-3" /> Call
              </button>
            )}
            {callState === 'active' && (
              <button onClick={endCall} className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors flex-shrink-0">
                <PhoneOff className="w-3 h-3" /> End
              </button>
            )}
            {callState === 'connecting' && (
              <div className="text-[10px] text-slate-400 flex-shrink-0 animate-pulse">Connecting…</div>
            )}
            {/* Transcript toggle — mobile only */}
            <button
              onClick={() => setShowTranscript(v => !v)}
              className={`md:hidden flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-colors ${callState === 'active' ? 'bg-white/10 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{transcript.length}</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showTranscript ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Status banner */}
          {callState !== 'active' && (
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2 flex-shrink-0">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />
              <span className="text-xs text-amber-700">Twilio not connected — add transcript lines manually below</span>
            </div>
          )}
          {callState === 'active' && (
            <div className="px-4 py-2.5 bg-green-50 border-b border-green-100 flex items-center gap-2 flex-shrink-0">
              <Radio className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              <span className="text-xs text-green-700 font-medium">
                AI listening — {isP2 ? 'filling form in real time' : 'extracting questions in real time'}
              </span>
            </div>
          )}
          {apiError && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2 flex-shrink-0 anim-slide-up">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
              <span className="text-xs text-red-700 font-medium">{apiError}</span>
            </div>
          )}

          {/* Transcript — always visible on desktop, toggle on mobile */}
          <div ref={transcriptRef} className={`overflow-y-auto p-4 space-y-3 md:flex-1 md:block md:max-h-none ${showTranscript ? 'max-h-48' : 'hidden'}`}>
            {transcript.length === 0 && (
              <p className="text-center text-slate-300 text-sm py-10">
                {callState === 'active' ? 'Listening — transcript will appear here…' : 'Press Call to start. Transcript appears here automatically.'}
              </p>
            )}
            {transcript.map((line, i) => (
              <div key={i} className={`flex gap-2.5 ${line.speaker !== 'You' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${line.speaker === 'You' ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-white'}`}>
                  {line.speaker === 'You' ? 'Y' : line.speaker[0].toUpperCase()}
                </div>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${line.speaker === 'You' ? 'bg-slate-100 text-slate-800 rounded-tl-sm' : 'bg-slate-800 text-white rounded-tr-sm'}`}>
                  {line.text}
                </div>
              </div>
            ))}
          </div>

          {/* Auto-add toast (P1) */}
          {!isP2 && lastAdded && (
            <div className="border-t border-green-100 bg-green-50 px-3 py-2 flex-shrink-0 anim-slide-up flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <span className="text-xs font-semibold text-green-700">Added: <span className="font-bold">{lastAdded}</span></span>
            </div>
          )}

          {/* Test input — remove when Twilio is live */}
          <div className="border-t border-slate-200 p-3 flex-shrink-0 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0" />
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Test mode</span>
              </div>
              {aiThinking && (
                <div className="flex items-center gap-1.5 text-[10px] text-green-600 font-medium">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  AI thinking…
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {['You', 'Client'].map(s => (
                <button key={s} onClick={() => setLineSpeaker(s)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition-colors flex-shrink-0 ${lineSpeaker === s ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >{s}</button>
              ))}
              {/* Mic button — hold to speak */}
              <button
                onClick={micActive ? stopMic : startMic}
                title={micActive ? 'Click to stop recording' : 'Click to start recording'}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${micActive ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                <Mic className="w-4 h-4" />
              </button>
              <input
                ref={lineInputRef} type="text" value={lineText}
                onChange={e => setLineText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTranscriptLine()}
                placeholder="Or type a line and press Enter…"
                className="flex-1 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-sm outline-none focus:ring-2 focus:ring-amber-400 transition placeholder:text-slate-300"
              />
              <button onClick={addTranscriptLine} className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors flex-shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </div>
            {micActive && (
              <div className="flex items-center gap-2 px-2 py-1.5 bg-red-50 rounded-lg border border-red-200 min-h-[32px]">
                <div className="flex gap-0.5 items-end h-4 flex-shrink-0">
                  {[3,5,4,6,3,5,2,4,6,3].map((h, i) => (
                    <div key={i} className="w-0.5 bg-red-400 rounded-full animate-pulse" style={{ height: `${h * 2}px`, animationDelay: `${i * 80}ms` }} />
                  ))}
                </div>
                {interimText
                  ? <span className="text-xs text-red-700 italic flex-1">{interimText}</span>
                  : <span className="text-xs text-red-500 flex-1">Listening… speak now</span>
                }
              </div>
            )}
          </div>
        </div>

        {/* RIGHT / BOTTOM: Form panel */}
        <div className="flex-1 flex flex-col bg-[#F7F7F5] overflow-hidden min-h-0">
          <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-sm font-bold text-slate-900">{isP2 ? 'Customer Intake Form' : 'Client Intake Form'}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isP2 ? `${filledCount}/${fillableFields.length} fields filled` : `${fields.length} ${fields.length === 1 ? 'field' : 'fields'} — ${FIELD_TYPE_DEFS.length} types available`}
              </p>
            </div>
            {!isP2 && (
              <button onClick={() => setAddingField(true)}
                className="flex items-center gap-1.5 text-xs font-semibold bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Field
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {fields.length === 0 && !addingField && (
              <div onClick={() => !isP2 && setAddingField(true)}
                className={`border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center ${!isP2 ? 'cursor-pointer hover:border-slate-300 transition-colors' : ''}`}>
                {isP2
                  ? <p className="text-slate-300 text-sm">{mode === 'customer' ? 'No form template found. Run Client Onboarding first to build your intake form.' : 'No fields from Client Onboarding. Go back and add some.'}</p>
                  : <><Plus className="w-6 h-6 text-slate-300 mx-auto mb-2" /><p className="text-slate-400 text-sm font-medium">Fields build here automatically</p><p className="text-slate-300 text-xs mt-1">AI extracts them from the call — or add one manually</p></>
                }
              </div>
            )}

            <div className="space-y-3">
              {isP2 ? fields.map(f => renderFieldInput(f)) : fields.map(f => renderFieldPreview(f))}

              {/* Add field inline form — enhanced with type picker */}
              {addingField && !isP2 && (
                <div className="bg-white rounded-xl border-2 border-slate-900 px-4 py-4 space-y-3 anim-slide-up">
                  <input
                    autoFocus type="text" value={newField.label}
                    onChange={e => { const v = e.target.value; setNewField(f => ({ ...f, label: v, type: detectFieldType(v) || f.type })); }}
                    onKeyDown={e => e.key === 'Enter' && commitField()}
                    placeholder="Field label — e.g. Guest Count, Event Date, Vegan Option"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition placeholder:text-slate-300"
                  />
                  {/* Type grid — grouped */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                    {['Text','Numbers','Date & Time','Choice','Structured','Calculated','Layout'].map(group => {
                      const defs = FIELD_TYPE_DEFS.filter(d => d.group === group);
                      if (!defs.length) return null;
                      return (
                        <div key={group}>
                          <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-0.5 pb-1">{group}</div>
                          <div className="grid grid-cols-4 gap-1">
                            {defs.map(def => (
                              <button key={def.id} onClick={() => setNewField(f => ({ ...f, type: def.id }))}
                                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left transition-all ${newField.type === def.id ? `${def.bg} ${def.border} ${def.text} font-semibold` : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>
                                <def.Icon className="w-3 h-3 flex-shrink-0" />
                                <span className="text-[10px] leading-tight truncate">{def.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Type-specific options */}
                  {['select','multi-check'].includes(newField.type) && (
                    <input type="text" value={newField.options} onChange={e => setNewField(f => ({...f, options: e.target.value}))}
                      placeholder="Options, comma-separated (e.g. Seated, Buffet, Canapés)"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition placeholder:text-slate-300" />
                  )}
                  {newField.type === 'priced-item' && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <DollarSign className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span className="text-sm text-amber-700 font-medium">$</span>
                      <input type="number" value={newField.price} onChange={e => setNewField(f => ({...f, price: e.target.value}))}
                        placeholder="0.00" className="w-24 px-2 py-1.5 rounded-lg border border-amber-300 text-sm outline-none focus:ring-2 focus:ring-amber-400 bg-white" />
                      <select value={newField.priceUnit} onChange={e => setNewField(f => ({...f, priceUnit: e.target.value}))}
                        className="text-xs border border-amber-200 rounded-lg px-2 py-1.5 outline-none bg-white text-amber-700">
                        <option value="per_head">per head</option>
                        <option value="flat">flat rate</option>
                      </select>
                    </div>
                  )}
                  {newField.type === 'formula' && (
                    <input type="text" value={newField.formulaExpression} onChange={e => setNewField(f => ({...f, formulaExpression: e.target.value}))}
                      placeholder="e.g. {Guest Count} * {Price Per Head} + {Setup Fee}"
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-sm font-mono outline-none focus:ring-2 focus:ring-amber-400 transition placeholder:text-slate-400" />
                  )}
                  {['section-header','instructions'].includes(newField.type) && (
                    <input type="text" value={newField.content} onChange={e => setNewField(f => ({...f, content: e.target.value}))}
                      placeholder={newField.type === 'section-header' ? 'Section title…' : 'Instruction text shown to user…'}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition placeholder:text-slate-300" />
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => { setAddingField(false); setNewField({ label: '', type: 'text', options: '', price: '', priceUnit: 'per_head', formulaExpression: '', content: '' }); }}
                      className="flex-1 py-2 rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={commitField} disabled={!newField.label.trim()}
                      className="flex-1 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors disabled:opacity-40">Add Field</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer CTA */}
          <div className="border-t border-slate-200 bg-white px-6 py-4 flex justify-between items-center flex-shrink-0">
            {isP2 ? (
              <>
                <button
                  onClick={() => {
                    if (mode === 'customer') {
                      setStep('setup'); setCallState('idle'); setCallSeconds(0);
                    } else {
                      setStep('p1'); setCallState('idle'); setCallSeconds(0); setTranscript(p1Transcript);
                    }
                  }}
                  className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
                >{mode === 'customer' ? '← Back to Setup' : '← Back to Client Onboarding'}</button>
                <button
                  onClick={() => setStep('complete')}
                  className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-700 transition-colors shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" /> Complete Demo
                </button>
              </>
            ) : (
              <>
                <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-800 transition-colors">Start over</button>
                <button
                  onClick={finishClientOnboarding}
                  disabled={fields.length === 0}
                  className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-700 transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" /> Save Intake Form
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // CLIENT ONBOARDING COMPLETE
  if (step === 'p1-complete') {
    return (
      <PostCallScreen
        mode="client"
        sessionName={session.name || 'Untitled form'}
        fields={fields}
        onFieldsChange={f => { setFields(f); saveTemplateUpdate(f, session.name); }}
        fieldValues={{}}
        transcript={transcript.length ? transcript : p1Transcript}
        conversationSummary={conversationSummary}
        callStartTime={callStartTime}
        callDuration={callSeconds}
        recordingUrl={recordingUrl}
        pricedTotal={0}
        onReset={reset}
        onRedo={null}
      />
    );
  }

  // COMPLETE
  if (step === 'complete') {
    const pricedTotal = fields
      .filter(f => f.type === 'priced-item' && f.price > 0 && parseInt(fieldValues[f.key]) > 0)
      .reduce((sum, f) => sum + f.price * (parseInt(fieldValues[f.key]) || 0), 0);
    return (
      <PostCallScreen
        mode="customer"
        sessionName={session.name || 'Customer'}
        fields={fields}
        onFieldsChange={f => setFields(f)}
        fieldValues={fieldValues}
        transcript={transcript}
        conversationSummary={conversationSummary}
        callStartTime={callStartTime}
        callDuration={callSeconds}
        recordingUrl={recordingUrl}
        pricedTotal={pricedTotal}
        onReset={reset}
        onRedo={() => { setStep('p2'); setFieldValues({}); setTranscript([]); setCallState('idle'); setCallSeconds(0); }}
      />
    );
  }

  return null;
}

// ─── Invoice PDF HTML builder (no dependencies — uses browser print) ───
function buildInvoiceHTML(inv, sessionName) {
  const quoteNum = `Q-${String(Date.now()).slice(-6)}`;
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const subtotal = inv.lineItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const depositAmt = inv.depositPct > 0 ? subtotal * inv.depositPct / 100 : 0;
  const itemRows = inv.lineItems.map(i =>
    `<tr><td>${i.description}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">$${Number(i.unitPrice).toFixed(2)}</td><td style="text-align:right">$${(i.qty * i.unitPrice).toFixed(2)}</td></tr>`
  ).join('');
  const notesBlock = (inv.eventType || inv.eventDate || inv.venue || inv.guestCount || inv.notes) ? `
    <div class="notes"><div class="nlabel">Job Details &amp; Notes</div>
      ${inv.eventType ? `<p><strong>Work Type:</strong> ${inv.eventType}</p>` : ''}
      ${inv.eventDate ? `<p><strong>Date:</strong> ${inv.eventDate}</p>` : ''}
      ${inv.venue ? `<p><strong>Job Address:</strong> ${inv.venue}</p>` : ''}
      ${inv.guestCount ? `<p><strong>Roof Size:</strong> ${inv.guestCount}</p>` : ''}
      ${inv.notes ? `<p style="margin-top:8px">${inv.notes}</p>` : ''}
    </div>` : '';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Quote</title><style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#111;padding:48px 56px;font-size:14px;line-height:1.5}
.hd{display:flex;justify-content:space-between;align-items:flex-start}
.hd-left h2{font-size:22px;font-weight:800;letter-spacing:-.3px}
.hd-left p{color:#666;font-size:12px;margin-top:4px;line-height:1.5}
.hd-right{text-align:right}.qt{font-size:30px;font-weight:900;letter-spacing:-1px;text-transform:uppercase}
.hd-right p{font-size:12px;color:#666;margin-top:5px}
.rule{height:2px;background:#111;margin:28px 0}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:36px}
.plabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#999;margin-bottom:7px}
.party p{font-size:13px;color:#333;line-height:1.6}
.party strong{color:#111;font-size:14px;display:block;margin-bottom:2px}
table.items{width:100%;border-collapse:collapse;margin-bottom:24px}
table.items th{background:#f5f5f5;padding:9px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#777}
table.items td{padding:11px 12px;font-size:13px;border-bottom:1px solid #f0f0f0;color:#333}
.tw{display:flex;justify-content:flex-end;margin-bottom:32px}
table.tot{width:260px;border-collapse:collapse}
table.tot td{border:none;font-size:13px;padding:4px 12px;color:#555}
table.tot tr.grand td{font-weight:800;font-size:16px;border-top:2px solid #111;padding-top:10px;color:#111}
.notes{background:#f9f9f9;border-left:3px solid #ddd;padding:14px 16px;margin-bottom:32px;font-size:12px;color:#555;line-height:1.65}
.nlabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#999;margin-bottom:7px}
.notes p{margin-top:3px}
.footer{border-top:1px solid #eee;padding-top:20px;text-align:center;font-size:11px;color:#aaa}
@media print{body{padding:24px 32px}.np{display:none!important}}
</style></head><body>
<div class="hd">
  <div class="hd-left">${inv.logoDataUrl ? `<img src="${inv.logoDataUrl}" style="max-height:60px;max-width:180px;object-fit:contain;margin-bottom:8px;display:block;" />` : ''}<h2>${inv.yourBusiness || 'Your Business'}</h2><p>${[inv.yourEmail, inv.yourPhone].filter(Boolean).join(' &middot; ') || '&nbsp;'}</p></div>
  <div class="hd-right"><div class="qt">Quote</div><p>Ref: ${quoteNum}</p><p>Date: ${today}</p>${inv.validDays ? `<p>Valid: ${inv.validDays} days</p>` : ''}</div>
</div>
<div class="rule"></div>
<div class="parties">
  <div class="party"><div class="plabel">Prepared for</div><p><strong>${inv.clientName || 'Client'}</strong>${inv.clientEmail ? `<br>${inv.clientEmail}` : ''}</p></div>
  <div class="party"><div class="plabel">Prepared by</div><p><strong>${inv.yourBusiness || 'Your Business'}</strong>${inv.yourEmail ? `<br>${inv.yourEmail}` : ''}</p></div>
</div>
${inv.lineItems.length ? `<table class="items"><thead><tr><th>Description</th><th style="text-align:center;width:70px">Qty</th><th style="text-align:right;width:110px">Unit Price</th><th style="text-align:right;width:110px">Total</th></tr></thead><tbody>${itemRows}</tbody></table>
<div class="tw"><table class="tot">
${inv.lineItems.length > 1 ? `<tr><td>Subtotal</td><td style="text-align:right">$${subtotal.toFixed(2)}</td></tr>` : ''}
${depositAmt > 0 ? `<tr><td>Deposit (${inv.depositPct}%)</td><td style="text-align:right">$${depositAmt.toFixed(2)}</td></tr>` : ''}
<tr class="grand"><td>Total</td><td style="text-align:right">$${subtotal.toFixed(2)}</td></tr>
</table></div>` : ''}
${notesBlock}
<div class="footer">This quote is valid for ${inv.validDays || 14} days from the date issued. To accept, please reply by email or phone.</div>
<div class="np" style="text-align:center;margin-top:40px;padding-bottom:20px">
  <button onclick="window.print()" style="background:#111;color:#fff;border:none;padding:12px 36px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">Save as PDF / Print</button>
</div>
</body></html>`;
}

// ─── Post-call completion screen (shared by Client and Customer Onboarding) ───
function PostCallScreen({ mode, sessionName, fields, onFieldsChange, fieldValues,
  transcript, conversationSummary, callStartTime, callDuration, recordingUrl,
  pricedTotal, onReset, onRedo }) {

  const [tab, setTab] = useState('overview');
  const [addingField, setAddingField] = useState(false);
  const [newField, setNewField] = useState({ label: '', type: 'text', options: '', price: '', priceUnit: 'per_head', formulaExpression: '', content: '' });
  const [sendType, setSendType] = useState(null);
  const [generated, setGenerated] = useState('');
  const [edited, setEdited] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inv, setInv] = useState(null);
  const [invCopied, setInvCopied] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [editField, setEditField] = useState(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const td = id => FIELD_TYPE_DEFS.find(d => d.id === id) || FIELD_TYPE_DEFS[0];
  const LAYOUT = ['section-header', 'divider', 'instructions'];

  const fmtDate = ts => ts ? ts.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtDur = s => {
    if (!s || s === 0) return '—';
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const removeField = key => onFieldsChange(fields.filter(f => f.key !== key));

  const commitNewField = () => {
    if (!newField.label.trim()) return;
    const f = {
      key: `f_edit_${Date.now()}`,
      label: newField.label.trim(),
      type: newField.type,
      options: newField.options ? newField.options.split(',').map(s => s.trim()).filter(Boolean) : [],
      price: parseFloat(newField.price) || 0,
      priceUnit: newField.priceUnit,
      formulaExpression: newField.formulaExpression,
      content: newField.content,
      suggested: false,
    };
    onFieldsChange([...fields, f]);
    setNewField({ label: '', type: 'text', options: '', price: '', priceUnit: 'per_head', formulaExpression: '', content: '' });
    setAddingField(false);
  };

  const generate = async (type) => {
    setSendType(type);
    setGenerating(true);
    setGenerated(''); setEdited('');
    try {
      const res = await apiFetch('/api/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, sessionName, transcript, fields, fieldValues }),
      });
      const data = await res.json();
      const text = data.text || data.error || 'Unable to generate.';
      setGenerated(text); setEdited(text);
    } catch {
      const msg = 'Failed to generate. Please try again.';
      setGenerated(msg); setEdited(msg);
    }
    setGenerating(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(edited).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const initInvoice = () => {
    // Match by field type (most reliable)
    const byType = (type) => {
      const f = fields.find(fl => fl.type === type);
      if (!f) return '';
      const v = fieldValues[f.key];
      if (v === undefined || v === '' || v === null) return '';
      if (Array.isArray(v)) return v.join(', ');
      return String(v);
    };
    // Match by label pattern
    const get = (...patterns) => {
      for (const p of patterns) {
        const f = fields.find(fl => new RegExp(p, 'i').test(fl.label));
        if (!f) continue;
        const v = fieldValues[f.key];
        if (v === undefined || v === '' || v === null) continue;
        if (Array.isArray(v)) return v.join(', ');
        if (typeof v === 'boolean') return v ? 'Yes' : 'No';
        return String(v);
      }
      return '';
    };
    const lineItems = fields
      .filter(f => f.type === 'priced-item' && f.price > 0)
      .map(f => ({ id: f.key, description: f.label, qty: parseInt(fieldValues[f.key]) || 0, unitPrice: f.price }))
      .filter(i => i.qty > 0);
    setInv(prev => ({
      // Preserve your-side details and logo across re-opens
      yourBusiness: prev?.yourBusiness || '',
      yourEmail:    prev?.yourEmail    || '',
      yourPhone:    prev?.yourPhone    || '',
      logoDataUrl:  prev?.logoDataUrl  || '',
      // Client — checked by type first, then label
      clientName:  get('client name', 'full name', 'your name', 'name', 'customer name', 'contact name', 'booker'),
      clientEmail: byType('email') || get('email', 'client email', 'email address'),
      clientPhone: byType('phone') || get('phone', 'mobile', 'contact number', 'telephone'),
      // Job
      eventType:  get('work type', 'job type', 'type of work', 'type', 'service type', 'event type'),
      eventDate:  byType('date') || byType('datetime') || get('job date', 'date', 'start date', 'booking date'),
      venue:      get('job address', 'address', 'location', 'venue', 'site address', 'property address'),
      guestCount: get('roof size', 'roof squares', 'squares', 'size', 'square footage', 'guest count'),
      // Items & notes
      lineItems,
      notes: get('notes', 'special requirements', 'requirements', 'additional information', 'special needs', 'other'),
      validDays:  prev?.validDays  ?? 14,
      depositPct: prev?.depositPct ?? 0,
    }));
  };

  const downloadPDF = () => {
    if (!inv) return;
    const html = buildInvoiceHTML(inv, sessionName);
    const w = window.open('', '_blank', 'width=850,height=1100');
    if (!w) { alert('Please allow pop-ups to download the PDF.'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 800);
  };

  const emailDraft = () => {
    if (!inv) return;
    const total = inv.lineItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const lines = [
      `Hi ${inv.clientName || 'there'},`,
      '',
      'Thank you for your enquiry. Please find your quote summary below.',
      '',
      inv.eventType ? `Event: ${inv.eventType}` : null,
      inv.eventDate ? `Date: ${inv.eventDate}` : null,
      inv.venue ? `Venue: ${inv.venue}` : null,
      inv.guestCount ? `Guests: ${inv.guestCount}` : null,
      inv.lineItems.length ? '' : null,
      inv.lineItems.length ? '── Items ──' : null,
      ...inv.lineItems.map(i => `${i.description}: ${i.qty} x $${Number(i.unitPrice).toFixed(2)} = $${(i.qty * i.unitPrice).toFixed(2)}`),
      '',
      `Total: $${total.toFixed(2)}`,
      inv.depositPct > 0 ? `Deposit required: $${(total * inv.depositPct / 100).toFixed(2)} (${inv.depositPct}%)` : null,
      '',
      inv.notes ? `Notes: ${inv.notes}` : null,
      '',
      `This quote is valid for ${inv.validDays} days.`,
      '',
      'Warm regards,',
      inv.yourBusiness || '[Your Name]',
    ].filter(l => l !== null);
    const subject = `Quote — ${inv.eventType || sessionName}`;
    window.open(`mailto:${inv.clientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`);
  };

  const copyInvSMS = () => {
    if (!inv) return;
    const total = inv.lineItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const parts = [
      `Hi ${inv.clientName || 'there'}, here is a quick summary of your quote from ${inv.yourBusiness || 'us'}:`,
      inv.eventType && `${inv.eventType}${inv.eventDate ? ` on ${inv.eventDate}` : ''}`,
      inv.guestCount && `${inv.guestCount} guests`,
      inv.lineItems.length > 0 && `Total: $${total.toFixed(2)}`,
      'Full quote sent to your email. Reply to confirm or ask any questions.',
    ].filter(Boolean);
    navigator.clipboard.writeText(parts.join(' · ')).catch(() => {});
    setInvCopied(true);
    setTimeout(() => setInvCopied(false), 2000);
  };

  const renderValue = (f) => {
    const v = fieldValues[f.key];
    if (f.type === 'formula') return null;
    if (v === undefined || v === '') return <span className="text-slate-300 italic text-xs">—</span>;
    if (f.type === 'toggle') return <span className={v ? 'text-green-700' : 'text-slate-400'}>{v ? 'Yes' : 'No'}</span>;
    if (f.type === 'multi-check') return Array.isArray(v) && v.length ? v.join(', ') : null;
    if (f.type === 'priced-item') { const qty = parseInt(v)||0; return `${qty}${f.price>0?` × $${f.price} = $${(f.price*qty).toFixed(2)}`:''}` ; }
    if (f.type === 'currency') return `$${v}`;
    if (f.type === 'percentage') return `${v}%`;
    if (f.type === 'rating') return `${v} / 5 ★`;
    if (f.type === 'duration') return v?.hours !== undefined ? `${v.hours||0}h ${v.minutes||0}m` : String(v);
    if (f.type === 'email') return <a href={`mailto:${v}`} className="text-sky-600 underline">{v}</a>;
    if (f.type === 'url') return <a href={v} target="_blank" rel="noopener noreferrer" className="text-violet-600 underline break-all">{v}</a>;
    return <span className="break-words">{String(v)}</span>;
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'transcript', label: `Transcript${transcript.length ? ` (${transcript.length})` : ''}` },
    { id: 'form', label: 'Form' },
    { id: 'send', label: 'Send' },
  ];

  return (
    <div className="h-full bg-[#F7F7F5] flex flex-col overflow-hidden">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 pt-4 pb-0 flex-shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">
                {mode === 'client' ? 'Form saved' : 'Session complete'}
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">{sessionName}</h2>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
              <span>{fmtDate(callStartTime)}</span>
              {callDuration > 0 && <><span>·</span><span>{fmtDur(callDuration)}</span></>}
            </div>
          </div>
          <button onClick={onReset} className="text-xs text-slate-400 hover:text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0 mt-1">
            New session
          </button>
        </div>

        {/* Tabs — mobile: all 4; desktop: Dashboard / Send toggle */}
        <div className="flex gap-0 -mb-px overflow-x-auto lg:hidden">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
            >{t.label}</button>
          ))}
        </div>
        <div className="hidden lg:flex gap-0 -mb-px">
          <button onClick={() => { if (tab === 'send') setTab('overview'); }}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${tab !== 'send' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
            Dashboard
          </button>
          <button onClick={() => setTranscriptOpen(v => !v)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${transcriptOpen && tab !== 'send' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
            Transcript{transcript.length > 0 ? ` (${transcript.length})` : ''}
          </button>
          <button onClick={() => setTab('send')}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${tab === 'send' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700'}`}>
            Send
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div
        className="flex-1 overflow-hidden lg:divide-x lg:divide-slate-100"
        style={tab !== 'send' ? { display: 'grid', gridTemplateColumns: transcriptOpen ? '300px 360px 1fr' : '300px 1fr' } : undefined}
      >

        {/* ── OVERVIEW ── */}
        <div className={`${tab === 'overview' ? '' : 'hidden'} ${tab !== 'send' ? 'lg:block lg:overflow-y-auto' : ''}`}>
          <div className="max-w-lg mx-auto px-5 py-5 space-y-4 lg:max-w-none lg:mx-0">

            {/* Call card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Call details</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">Date & Time</p>
                  <p className="text-sm font-semibold text-slate-800">{fmtDate(callStartTime)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">Duration</p>
                  <p className="text-sm font-semibold text-slate-800">{fmtDur(callDuration)}</p>
                </div>
              </div>
              {recordingUrl ? (
                <div>
                  <p className="text-[10px] text-slate-400 mb-1.5">Recording</p>
                  <audio controls src={recordingUrl} className="w-full h-9 rounded-lg" style={{accentColor:'#0f172a'}} />
                </div>
              ) : (
                <p className="text-xs text-slate-300 italic">No recording — mic permission not granted.</p>
              )}
            </div>

            {/* AI summary */}
            {conversationSummary && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">AI Summary</p>
                <p className="text-sm text-slate-600 leading-relaxed">{conversationSummary}</p>
              </div>
            )}

            {/* Priced total — customer mode only */}
            {mode === 'customer' && pricedTotal > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Estimated total</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">Based on priced items filled</p>
                </div>
                <p className="text-2xl font-black text-amber-800">${pricedTotal.toFixed(2)}</p>
              </div>
            )}

            {onRedo && (
              <button onClick={onRedo} className="w-full py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors">
                Redo Customer Onboarding
              </button>
            )}
          </div>
        </div>

        {/* ── TRANSCRIPT ── */}
        <div className={`${tab === 'transcript' ? '' : 'hidden'} ${tab !== 'send' && transcriptOpen ? 'lg:block lg:overflow-y-auto' : 'lg:hidden'}`}>
          <div className="max-w-lg mx-auto px-5 py-5 lg:max-w-none lg:mx-0">
            {transcript.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400 text-sm">No transcript recorded for this session.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transcript.map((l, i) => {
                  const isYou = l.speaker === 'You' || l.speaker === 'Agent';
                  return (
                    <div key={i} className={`flex flex-col ${isYou ? 'items-start' : 'items-end'}`}>
                      <span className="text-[10px] text-slate-400 mb-1 px-1">{l.speaker}</span>
                      <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isYou ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm' : 'bg-slate-900 text-white rounded-tr-sm'}`}>
                        {l.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── FORM ── */}
        <div className={`${tab === 'form' ? '' : 'hidden'} ${tab !== 'send' ? 'lg:block lg:overflow-y-auto' : ''}`}>
          <div className="max-w-lg mx-auto px-5 py-5 lg:max-w-none lg:mx-0">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-700">
                  {mode === 'customer' ? 'Filled intake form' : 'Saved intake form'}
                </h3>
                <span className="text-xs text-slate-400">{fields.filter(f => !LAYOUT.includes(f.type)).length} fields</span>
              </div>

              <div className="space-y-2">
                {fields.map(f => {
                  if (f.type === 'divider') return (
                    <div key={f.key} className="flex items-center gap-2 py-1">
                      <hr className="flex-1 border-slate-100" />
                      <button onClick={() => removeField(f.key)} className="text-slate-200 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
                    </div>
                  );
                  if (f.type === 'section-header') return (
                    <div key={f.key} className="flex items-center justify-between pt-2 pb-0.5">
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex-1">{f.label}</span>
                      <button onClick={() => removeField(f.key)} className="text-slate-200 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  );
                  if (f.type === 'instructions') return (
                    <div key={f.key} className="flex items-start gap-2 bg-blue-50 rounded-xl px-3 py-2">
                      <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-blue-700 flex-1">{f.content || f.label}</span>
                      <button onClick={() => removeField(f.key)} className="text-blue-200 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  );
                  const def = td(f.type);
                  const val = renderValue(f);
                  const isEditing = editingKey === f.key && editField;
                  return (
                    <div key={f.key}>
                      {isEditing ? (
                        <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-200 my-0.5">
                          <input value={editField.label} onChange={e => setEditField(v => ({ ...v, label: e.target.value }))}
                            placeholder="Field label"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-900 transition" />
                          <select value={editField.type} onChange={e => setEditField(v => ({ ...v, type: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-900">
                            {FIELD_TYPE_DEFS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                          </select>
                          {['select', 'multi-check'].includes(editField.type) && (
                            <input value={editField.optionsStr || ''} onChange={e => setEditField(v => ({ ...v, optionsStr: e.target.value }))}
                              placeholder="Option 1, Option 2, Option 3"
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-900 transition" />
                          )}
                          {editField.type === 'priced-item' && (
                            <div className="grid grid-cols-2 gap-2">
                              <input type="number" value={editField.price || ''} onChange={e => setEditField(v => ({ ...v, price: parseFloat(e.target.value) || 0 }))}
                                placeholder="Price $"
                                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-900 transition" />
                              <select value={editField.priceUnit || 'per_head'} onChange={e => setEditField(v => ({ ...v, priceUnit: e.target.value }))}
                                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-900">
                                <option value="per_head">per head</option>
                                <option value="flat">flat fee</option>
                              </select>
                            </div>
                          )}
                          {editField.type === 'slider' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block mb-1">Min</label>
                                <input type="number" value={editField.sliderMin ?? 0} onChange={e => setEditField(v => ({ ...v, sliderMin: Number(e.target.value) }))}
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-900 transition" />
                              </div>
                              <div>
                                <label className="text-[9px] text-slate-400 uppercase tracking-wider font-bold block mb-1">Max</label>
                                <input type="number" value={editField.sliderMax ?? 100} onChange={e => setEditField(v => ({ ...v, sliderMax: Number(e.target.value) }))}
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-900 transition" />
                              </div>
                            </div>
                          )}
                          {editField.type === 'formula' && (
                            <input value={editField.formulaExpression || ''} onChange={e => setEditField(v => ({ ...v, formulaExpression: e.target.value }))}
                              placeholder="{Field A} * {Field B}"
                              className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-sm font-mono outline-none focus:ring-2 focus:ring-amber-400 transition" />
                          )}
                          {['section-header', 'instructions'].includes(editField.type) && (
                            <input value={editField.content || ''} onChange={e => setEditField(v => ({ ...v, content: e.target.value }))}
                              placeholder="Content text"
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-slate-900 transition" />
                          )}
                          <div className="flex gap-2 pt-0.5">
                            <button onClick={() => setEditingKey(null)}
                              className="flex-1 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                            <button
                              disabled={!editField.label?.trim()}
                              onClick={() => {
                                const opts = editField.optionsStr
                                  ? editField.optionsStr.split(',').map(s => s.trim()).filter(Boolean)
                                  : (editField.options || []);
                                const updated = { ...editField, label: editField.label.trim() || f.label, options: opts };
                                delete updated.optionsStr;
                                onFieldsChange(fields.map(fi => fi.key === editingKey ? updated : fi));
                                setEditingKey(null);
                              }}
                              className="flex-1 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-40 hover:bg-slate-700 transition-colors">Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2.5 group py-0.5">
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${def.bg}`}>
                            <def.Icon className={`w-3.5 h-3.5 ${def.text}`} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700">{f.label}</p>
                            {mode === 'customer' && val && <p className="text-xs text-slate-500 mt-0.5">{val}</p>}
                            {mode === 'client' && <p className="text-[10px] text-slate-300">{def.label}</p>}
                          </div>
                          <button onClick={() => { setEditingKey(f.key); setEditField({ ...f, optionsStr: f.options?.join(', ') || '' }); }}
                            className="text-slate-200 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5 mr-0.5">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => removeField(f.key)} className="text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add field */}
              {addingField ? (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
                  <input autoFocus type="text" value={newField.label}
                    onChange={e => { const v = e.target.value; setNewField(f => ({ ...f, label: v, type: detectFieldType(v) || f.type })); }}
                    onKeyDown={e => e.key === 'Enter' && commitNewField()}
                    placeholder="Field label"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition"
                  />
                  <select value={newField.type} onChange={e => setNewField(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900 bg-white">
                    {FIELD_TYPE_DEFS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => { setAddingField(false); setNewField({ label: '', type: 'text', options: '', price: '', priceUnit: 'per_head', formulaExpression: '', content: '' }); }}
                      className="flex-1 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={commitNewField} disabled={!newField.label.trim()}
                      className="flex-1 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-40 hover:bg-slate-700 transition-colors">Add</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingField(true)}
                  className="mt-4 w-full py-2 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-colors flex items-center justify-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add field
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── SEND ── */}
        <div className={`${tab === 'send' ? '' : 'hidden'} overflow-y-auto`}>
          <div className="max-w-lg mx-auto px-5 py-5 space-y-4">

            {/* Type selector */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { type: 'sms', label: 'SMS', Icon: MessageSquare, desc: 'Short follow-up' },
                { type: 'email', label: 'Email', Icon: Mail, desc: 'Full follow-up email' },
                { type: 'invoice', label: 'Quote', Icon: ReceiptText, desc: 'Editable PDF quote' },
              ].map(({ type, label, Icon, desc }) => (
                <button key={type}
                  onClick={() => { if (type === 'invoice') { setSendType('invoice'); initInvoice(); } else { generate(type); } }}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all ${sendType === type ? 'border-slate-900 bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <Icon className="w-5 h-5 text-slate-600" />
                  <span className="text-sm font-semibold text-slate-800">{label}</span>
                  <span className="text-[10px] text-slate-400 text-center">{desc}</span>
                </button>
              ))}
            </div>

            {/* ── Invoice editor ── */}
            {sendType === 'invoice' && inv && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-5 py-3.5 flex items-center justify-between">
                  <span className="text-white font-black tracking-tight">QUOTE</span>
                  <span className="text-slate-400 text-[11px]">Edit all fields then export</span>
                </div>

                <div className="p-5 space-y-5">

                  {/* Logo */}
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Logo</p>
                    {inv.logoDataUrl ? (
                      <div className="flex items-center gap-3">
                        <img src={inv.logoDataUrl} className="h-10 max-w-[140px] object-contain rounded border border-slate-200 bg-white p-1" alt="Logo" />
                        <button onClick={() => setInv(v => ({ ...v, logoDataUrl: '' }))}
                          className="text-xs text-slate-400 hover:text-red-500 transition-colors">Remove</button>
                      </div>
                    ) : (
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-slate-200 hover:border-slate-400 text-slate-500 hover:text-slate-700 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                        <span className="text-sm">Upload logo</span>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = ev => setInv(v => ({ ...v, logoDataUrl: ev.target.result }));
                            reader.readAsDataURL(file);
                            e.target.value = '';
                          }} />
                      </label>
                    )}
                  </div>

                  {/* Your Business */}
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Your Business</p>
                    <div className="space-y-2">
                      <input value={inv.yourBusiness} onChange={e => setInv(v => ({ ...v, yourBusiness: e.target.value }))}
                        placeholder="Business name"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition" />
                      <div className="grid grid-cols-2 gap-2">
                        <input value={inv.yourEmail} onChange={e => setInv(v => ({ ...v, yourEmail: e.target.value }))}
                          placeholder="your@email.com" type="email"
                          className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition" />
                        <input value={inv.yourPhone} onChange={e => setInv(v => ({ ...v, yourPhone: e.target.value }))}
                          placeholder="Phone"
                          className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition" />
                      </div>
                    </div>
                  </div>

                  {/* Client */}
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Client</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={inv.clientName} onChange={e => setInv(v => ({ ...v, clientName: e.target.value }))}
                        placeholder="Client name"
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition" />
                      <input value={inv.clientEmail} onChange={e => setInv(v => ({ ...v, clientEmail: e.target.value }))}
                        placeholder="Client email" type="email"
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition" />
                    </div>
                  </div>

                  {/* Event */}
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Event</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={inv.eventType} onChange={e => setInv(v => ({ ...v, eventType: e.target.value }))}
                        placeholder="Work type"
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition" />
                      <input value={inv.eventDate} onChange={e => setInv(v => ({ ...v, eventDate: e.target.value }))}
                        placeholder="Job date"
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition" />
                      <input value={inv.venue} onChange={e => setInv(v => ({ ...v, venue: e.target.value }))}
                        placeholder="Job address / location"
                        className="col-span-2 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition" />
                    </div>
                  </div>

                  {/* Line items */}
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Items</p>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="grid grid-cols-[1fr_52px_76px_76px_24px] bg-slate-50 px-3 py-1.5 gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Description</span><span className="text-center">Qty</span><span className="text-right">Unit</span><span className="text-right">Total</span><span/>
                      </div>
                      {inv.lineItems.map((item, idx) => (
                        <div key={item.id || idx} className="grid grid-cols-[1fr_52px_80px_72px_24px] border-t border-slate-100 px-2 py-2 gap-1.5 items-center">
                          <input
                            value={item.description}
                            onChange={e => { const val = e.target.value; setInv(v => ({ ...v, lineItems: v.lineItems.map((r, i) => i === idx ? { ...r, description: val } : r) })); }}
                            placeholder="Description"
                            className="text-sm text-slate-800 w-full px-2 py-1 rounded border border-slate-200 bg-white outline-none focus:ring-1 focus:ring-slate-400 transition min-w-0" />
                          <input
                            type="number" min="0"
                            value={item.qty}
                            onChange={e => { const val = Number(e.target.value); setInv(v => ({ ...v, lineItems: v.lineItems.map((r, i) => i === idx ? { ...r, qty: val } : r) })); }}
                            className="text-sm text-slate-800 w-full px-1 py-1 rounded border border-slate-200 bg-white outline-none focus:ring-1 focus:ring-slate-400 text-center transition" />
                          <input
                            type="number" min="0" step="0.01"
                            value={item.unitPrice}
                            onChange={e => { const val = Number(e.target.value); setInv(v => ({ ...v, lineItems: v.lineItems.map((r, i) => i === idx ? { ...r, unitPrice: val } : r) })); }}
                            className="text-sm text-slate-800 w-full px-1 py-1 rounded border border-slate-200 bg-white outline-none focus:ring-1 focus:ring-slate-400 text-right transition" />
                          <span className="text-sm text-slate-500 text-right tabular-nums">${(item.qty * item.unitPrice).toFixed(2)}</span>
                          <button onClick={() => setInv(v => ({ ...v, lineItems: v.lineItems.filter((_, i) => i !== idx) }))}
                            className="text-slate-300 hover:text-red-400 flex items-center justify-end transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="border-t border-slate-100 px-3 py-2">
                        <button onClick={() => setInv(v => ({ ...v, lineItems: [...v.lineItems, { id: Date.now(), description: '', qty: 1, unitPrice: 0 }] }))}
                          className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors">
                          <Plus className="w-3 h-3" /> Add item
                        </button>
                      </div>
                    </div>
                    {inv.lineItems.length > 0 && (
                      <div className="flex justify-end mt-2 pr-1">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total</p>
                          <p className="text-xl font-black text-slate-900">${inv.lineItems.reduce((s, i) => s + i.qty * i.unitPrice, 0).toFixed(2)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes & terms */}
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Notes</p>
                    <textarea value={inv.notes} onChange={e => setInv(v => ({ ...v, notes: e.target.value }))}
                      placeholder="Special requirements, dietary needs, deposit terms..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900 transition resize-none" />
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <label className="text-xs text-slate-500">Valid for</label>
                      <input type="number" min="1" value={inv.validDays} onChange={e => setInv(v => ({ ...v, validDays: Number(e.target.value) }))}
                        className="w-14 px-2 py-1 rounded-lg border border-slate-200 text-sm text-center outline-none focus:ring-2 focus:ring-slate-900 transition" />
                      <span className="text-xs text-slate-500">days</span>
                      <span className="text-slate-200 mx-2">|</span>
                      <label className="text-xs text-slate-500">Deposit</label>
                      <input type="number" min="0" max="100" value={inv.depositPct} onChange={e => setInv(v => ({ ...v, depositPct: Number(e.target.value) }))}
                        className="w-14 px-2 py-1 rounded-lg border border-slate-200 text-sm text-center outline-none focus:ring-2 focus:ring-slate-900 transition" />
                      <span className="text-xs text-slate-500">%</span>
                    </div>
                  </div>

                </div>

                {/* Export actions */}
                <div className="px-5 pb-5 grid grid-cols-3 gap-2">
                  <button onClick={downloadPDF}
                    className="flex flex-col items-center gap-1.5 py-3.5 rounded-xl bg-slate-900 text-white hover:bg-slate-700 transition-colors">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs font-semibold">Download PDF</span>
                  </button>
                  <button onClick={emailDraft}
                    className="flex flex-col items-center gap-1.5 py-3.5 rounded-xl border-2 border-slate-200 text-slate-700 hover:border-slate-900 transition-colors">
                    <Mail className="w-4 h-4" />
                    <span className="text-xs font-semibold">Email Draft</span>
                  </button>
                  <button onClick={copyInvSMS}
                    className={`flex flex-col items-center gap-1.5 py-3.5 rounded-xl border-2 transition-colors ${invCopied ? 'border-green-400 text-green-700 bg-green-50' : 'border-slate-200 text-slate-700 hover:border-slate-900'}`}>
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-xs font-semibold">{invCopied ? 'Copied!' : 'Copy SMS'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── SMS / Email generate flow ── */}
            {sendType !== 'invoice' && generating && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin flex-shrink-0" />
                <span className="text-sm text-slate-500">Generating {sendType === 'sms' ? 'SMS' : 'email'}...</span>
              </div>
            )}

            {sendType !== 'invoice' && !generating && generated && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {sendType === 'sms' ? 'SMS Message' : 'Email Body'}
                  </p>
                  <button onClick={copy}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <textarea
                  value={edited}
                  onChange={e => setEdited(e.target.value)}
                  rows={sendType === 'sms' ? 4 : 12}
                  className="w-full text-sm text-slate-700 leading-relaxed resize-none outline-none border border-slate-100 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-slate-200 transition"
                />
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  Edit above if needed, then copy to send via your preferred app or email client.
                </p>
              </div>
            )}

            {!sendType && (
              <p className="text-sm text-slate-400 text-center py-4">Choose a format above to generate AI-drafted content.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function OnboardingView() {
  const [activeTab, setActiveTab] = useState('working');
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="border-b border-slate-200 bg-white px-6 flex items-center gap-1 flex-shrink-0 h-11">
        <button
          onClick={() => setActiveTab('working')}
          className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${activeTab === 'working' ? 'text-slate-900 bg-slate-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >Live Session</button>
        <button
          onClick={() => setActiveTab('example')}
          className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${activeTab === 'example' ? 'text-slate-900 bg-slate-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
        >
          Example Demo
          <span className="ml-1.5 text-[10px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Preview</span>
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'working' ? <OnboardingWorking /> : <OnboardingExample />}
      </div>
    </div>
  );
}

// --- SMS INBOX VIEW ---
function SmsInboxView() {
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);

  // Load recent messages on mount
  useEffect(() => {
    apiFetch('/api/sms-inbox').then(r => r.json()).then(d => {
      if (d.messages) setMessages(d.messages);
    }).catch(() => {});
  }, []);

  // Listen for live incoming SMS via Pusher
  useEffect(() => {
    const key     = import.meta.env.VITE_PUSHER_KEY;
    const cluster = import.meta.env.VITE_PUSHER_CLUSTER;
    if (!key) return;
    let pusher, channel;
    import('pusher-js').then(({ default: Pusher }) => {
      pusher  = new Pusher(key, { cluster });
      channel = pusher.subscribe('sms-inbox');
      channel.bind('message', msg => {
        setMessages(prev => [msg, ...prev]);
        setUnread(u => u + 1);
      });
    });
    return () => { try { pusher?.unsubscribe('sms-inbox'); } catch {} };
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-green-600" />
          SMS Inbox
          {unread > 0 && (
            <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">{unread} new</span>
          )}
        </h2>
        <span className="text-xs text-slate-400">Messages to your SignalWire number — live</span>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No messages yet.</p>
          <p className="text-xs mt-1">New SMS will appear here instantly.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700">{m.from || 'Unknown'}</span>
                <span className="text-xs text-slate-400">{m.date ? new Date(m.date).toLocaleString() : ''}</span>
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{m.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- SIDEBAR ---
function Sidebar({ currentView, navigateTo, onHome, isOpen, onClose, smsBadge = 0, tourStep = null }) {
  const [biz] = useLocalState('smq_biz', DEFAULT_BIZ);
  const navGroups = [
    {
      title: null,
      items: [
        { id: 'dashboard', icon: Home,     label: 'Dashboard' },
        { id: 'contacts',  icon: BookOpen, label: 'Contacts' },
        { id: 'calls',     icon: History,  label: 'Call History', badge: smsBadge > 0 ? String(smsBadge) : null },
        { id: 'inquiries', icon: Inbox,    label: 'Enquiries' },
        { id: 'settings',  icon: Settings, label: 'Settings' },
      ]
    }
  ];

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={onClose} />}
    <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#F7F7F5] border-r border-slate-200 h-full flex flex-col transition-transform duration-200 ease-in-out md:relative md:translate-x-0 md:z-auto ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="h-14 flex items-center px-4 font-semibold text-slate-800 border-b border-transparent">
        <img src="/logo.svg" alt="Show My Quote" className="h-6 w-auto" />
      </div>

      <div className="flex-1 py-4 overflow-y-auto">
        {navGroups.map((group, i) => (
          <div key={i} className="mb-6 px-2">
            {group.title && <div className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{group.title}</div>}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const isTourItem = tourStep !== null && TOUR_STEPS[tourStep]?.view === item.id;
                return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className={`w-full flex items-center px-3 py-2.5 md:py-1.5 rounded-md text-sm transition-colors ${
                    currentView === item.id
                      ? 'bg-slate-200/60 text-slate-900 font-medium'
                      : 'text-slate-600 hover:bg-slate-200/40 hover:text-slate-900'
                  }${isTourItem ? ' ring-2 ring-green-400 ring-offset-1' : ''}`}
                >
                  <item.icon className={`w-4 h-4 mr-3 ${currentView === item.id ? 'text-slate-800' : 'text-slate-400'}`} />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge && (
                    <span className="bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded ml-2 font-medium">{item.badge}</span>
                  )}
                </button>
              ); })}
            </div>
          </div>
        ))}
      </div>

      {onHome && (
        <div className="px-4 pb-2">
          <button
            onClick={onHome}
            className="w-full flex items-center px-3 py-1.5 rounded-md text-sm text-slate-500 hover:bg-slate-200/40 hover:text-slate-900 transition-colors"
          >
            <Home className="w-4 h-4 mr-3 text-slate-400" />
            Back to homepage
          </button>
        </div>
      )}
      <div className="p-4 border-t border-slate-200/60 text-sm text-slate-500 flex items-center hover:bg-slate-200/40 cursor-pointer transition-colors">
        <div className="w-8 h-8 rounded bg-slate-300 mr-3 overflow-hidden flex-shrink-0">
          <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=e2e8f0" alt="avatar" />
        </div>
        <div className="flex-1 truncate">
          <div className="font-medium text-slate-800">{biz.name || 'My Business'}</div>
          <div className="text-xs text-slate-400">{biz.email || 'Set up in Settings'}</div>
        </div>
      </div>
    </div>
    </>
  );
}
