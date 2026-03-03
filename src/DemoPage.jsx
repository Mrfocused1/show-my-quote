import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Pusher from 'pusher-js';
import {
  Phone, PhoneCall, PhoneOff, Mic, MicOff, Radio, Check, CheckCircle2,
  Copy, Plus, Trash2, X, ArrowRight, ChevronRight, ChevronDown, ChevronUp, Minus, MessageSquare, Send,
  LayoutGrid, Eye, Link2, Loader2, Camera, Utensils, Building2,
  Flower2, Calendar, Music, Wand2, ClipboardList, Play, Mail, FileText, Sparkles,
  Bookmark, Edit2, Bell, Search, Users,
} from 'lucide-react';
import { suggestField, fillFields, fillFieldsFromTranscript } from './openaiHelper.js';
import { getPendingPhone, clearPendingPhone } from './callBridge.js';

const SMQ_KEY = import.meta.env.VITE_SMQ_API_KEY || '';
function apiFetch(url, options = {}) {
  const { headers, ...rest } = options;
  return fetch(url, { ...rest, headers: { 'x-smq-key': SMQ_KEY, ...headers } });
}

// ── Niche configuration ───────────────────────────────────────────────────────

const NICHES = [
  {
    id: 'roof-replacement',
    label: 'Full Roof Replacement',
    Icon: Building2,
    desc: 'Squares, pitch, material grade, tear-off, storeys',
    seedFields: ['Roof Size', 'Pitch', 'Material', 'Storeys', 'Tear-off'],
    smsTemplate: "Hi {name}! Great speaking with you. I'll get your full replacement quote together and send it across today. Talk soon!",
    promptHint: 'Roofing enquiry — full roof replacement. Extract: job address, roof size in squares (1 square = 100 sq ft), pitch/slope (e.g. 4:12, 6:12, 8:12), number of storeys, material type (3-tab / 30-yr architectural / 50-yr / impact-resistant Class 4 / metal), tear-off layers (0, 1 or 2), gutter replacement needed (yes/no), budget range, insurance claim involved (yes/no).',
  },
  {
    id: 'storm-damage',
    label: 'Storm Damage & Insurance',
    Icon: Radio,
    desc: 'Hail/wind damage, claim status, adjuster details',
    seedFields: ['Job Address', 'Damage Type', 'Insurance Company', 'Claim Status', 'Roof Size'],
    smsTemplate: "Hi {name}! Thanks for calling. I'll put your storm damage assessment together and send it over. We'll work with your insurance company every step of the way.",
    promptHint: 'Roofing enquiry — storm damage and insurance claim. Extract: job address, type of damage (hail / wind / tree impact / other), insurance company name, claim number if available, adjuster appointment status, roof size (squares if known), number of storeys, approximate age of roof.',
  },
  {
    id: 'roof-repair',
    label: 'Roof Repairs',
    Icon: Wand2,
    desc: 'Leak, missing shingles, flashing, spot fix',
    seedFields: ['Job Address', 'Repair Type', 'Storeys', 'Approximate Area', 'Urgency'],
    smsTemplate: "Hi {name}! Thanks for calling. I'll get your repair quote together and send it across shortly. We'll get that sorted for you.",
    promptHint: 'Roofing enquiry — repair job. Extract: job address, type of repair needed (leak / missing shingles / flashing / valley / ridge / pipe boot / soffit / fascia), number of storeys, approximate affected area, urgency (emergency same-day / within a week / flexible), current temporary protection in place (tarp etc).',
  },
  {
    id: 'commercial-flat',
    label: 'Commercial Flat Roofing',
    Icon: ClipboardList,
    desc: 'TPO, EPDM, modified bitumen, square footage',
    seedFields: ['Property Address', 'Roof Area', 'Current Membrane', 'Access', 'HVAC Units'],
    smsTemplate: "Hi {name}! Great speaking with you. I'll get your commercial flat roofing quote together and send it over today.",
    promptHint: 'Commercial flat roofing enquiry. Extract: property address, total roof area (sq ft), current roof membrane type (TPO / EPDM / modified bitumen / built-up / unknown), number of HVAC/rooftop units, roof access (permanent hatch / external ladder / scissor lift required), drainage type (internal drains / scuppers), building height/storeys.',
  },
  {
    id: 'gutter-fascia',
    label: 'Gutter & Fascia',
    Icon: Minus,
    desc: 'Seamless gutters, fascia, soffit, gutter guards',
    seedFields: ['Job Address', 'Linear Footage', 'Gutter Size', 'Fascia Needed', 'Gutter Guards'],
    smsTemplate: "Hi {name}! Great speaking with you. I'll put your gutter and fascia quote together and send it across shortly.",
    promptHint: 'Gutter and fascia enquiry. Extract: job address, estimated linear footage of gutters (or home perimeter), gutter size preference (5\" or 6\"), fascia board replacement needed (yes/no), soffit replacement (yes/no), gutter guards wanted (yes/no / type), number of downspouts, number of storeys.',
  },
  {
    id: 'emergency-leak',
    label: 'Emergency Leak Response',
    Icon: Bell,
    desc: 'Active leak, same-day response, temporary fix',
    seedFields: ['Job Address', 'Leak Location', 'Storeys', 'Temp Fix In Place', 'Interior Damage'],
    smsTemplate: "Hi {name}! I'm on it. We'll get someone out to you as soon as possible — I'll send your emergency response details right now.",
    promptHint: 'Emergency roofing / active leak enquiry. Extract: job address, location of leak (room, area on roof), number of storeys, is there a temporary fix in place (yes/no), interior damage (ceiling, walls, electrical), roof age if known, when the leak started, any previous repairs to that area.',
  },
  {
    id: 'custom',
    label: 'Other / Custom',
    Icon: LayoutGrid,
    desc: 'Any roofing job type',
    seedFields: [],
    smsTemplate: "Hi {name}! Great speaking with you. I'll get your quote together and send it across shortly. Looking forward to working with you!",
    promptHint: 'General roofing enquiry. Extract all relevant details the customer mentions: job address, type of work needed, roof size or area, number of storeys, material preferences, urgency, budget range, and any special requirements.',
  },
];

// ── Template forms (one per niche) ───────────────────────────────────────────

const TEMPLATE_FORMS = {
  'roof-replacement': [
    { key: 'address',  label: 'Job Address',    type: 'text' },
    { key: 'size',     label: 'Roof Size (sq)', type: 'number' },
    { key: 'pitch',    label: 'Pitch / Slope',  type: 'select', options: ['Low (1:12–3:12)', 'Moderate (4:12–6:12)', 'Steep (7:12–9:12)', 'Very Steep (10:12+)'] },
    { key: 'stories',  label: 'Storeys',        type: 'number' },
    { key: 'material', label: 'Material',       type: 'select', options: ['3-Tab', '30-yr Architectural', '50-yr Architectural', 'Impact-Resistant Class 4', 'Metal'] },
    { key: 'tearoff',  label: 'Tear-off Layers', type: 'select', options: ['0 — overlay', '1 layer', '2 layers'] },
    { key: 'gutters',  label: 'Gutter Replacement', type: 'toggle' },
    { key: 'insurance', label: 'Insurance Claim', type: 'toggle' },
    { key: 'notes',    label: 'Notes',           type: 'long-text' },
  ],
  'storm-damage': [
    { key: 'address',  label: 'Job Address',      type: 'text' },
    { key: 'damage',   label: 'Damage Type',      type: 'select', options: ['Hail', 'Wind', 'Tree Impact', 'Multiple', 'Other'] },
    { key: 'insurer',  label: 'Insurance Company', type: 'text' },
    { key: 'claim',    label: 'Claim Number',     type: 'text' },
    { key: 'adjuster', label: 'Adjuster Booked',  type: 'toggle' },
    { key: 'size',     label: 'Roof Size (sq)',   type: 'number' },
    { key: 'stories',  label: 'Storeys',          type: 'number' },
    { key: 'age',      label: 'Roof Age (yrs)',   type: 'number' },
  ],
  'roof-repair': [
    { key: 'address',  label: 'Job Address',    type: 'text' },
    { key: 'type',     label: 'Repair Type',    type: 'select', options: ['Active Leak', 'Missing Shingles', 'Flashing', 'Valley', 'Ridge', 'Pipe Boot', 'Fascia / Soffit', 'Other'] },
    { key: 'stories',  label: 'Storeys',        type: 'number' },
    { key: 'area',     label: 'Affected Area',  type: 'text' },
    { key: 'urgency',  label: 'Urgency',        type: 'select', options: ['Emergency — same day', 'Within a week', 'Flexible'] },
    { key: 'interior', label: 'Interior Damage', type: 'toggle' },
    { key: 'tarp',     label: 'Tarp In Place',  type: 'toggle' },
    { key: 'notes',    label: 'Notes',          type: 'long-text' },
  ],
  'commercial-flat': [
    { key: 'address',  label: 'Property Address',   type: 'text' },
    { key: 'area',     label: 'Roof Area (sq ft)',  type: 'number' },
    { key: 'membrane', label: 'Current Membrane',   type: 'select', options: ['TPO', 'EPDM', 'Modified Bitumen', 'Built-Up', 'Unknown'] },
    { key: 'hvac',     label: 'HVAC Units on Roof', type: 'number' },
    { key: 'access',   label: 'Roof Access',        type: 'select', options: ['Permanent Hatch', 'External Ladder', 'Scissor Lift Required'] },
    { key: 'drainage', label: 'Drainage Type',      type: 'select', options: ['Internal Drains', 'Scuppers', 'Both'] },
    { key: 'stories',  label: 'Building Storeys',   type: 'number' },
  ],
  'gutter-fascia': [
    { key: 'address',  label: 'Job Address',        type: 'text' },
    { key: 'linft',    label: 'Linear Footage',     type: 'number' },
    { key: 'size',     label: 'Gutter Size',        type: 'select', options: ['5" Standard', '6" High-Flow'] },
    { key: 'fascia',   label: 'Fascia Replacement', type: 'toggle' },
    { key: 'soffit',   label: 'Soffit Replacement', type: 'toggle' },
    { key: 'guards',   label: 'Gutter Guards',      type: 'toggle' },
    { key: 'stories',  label: 'Storeys',            type: 'number' },
    { key: 'downspouts', label: 'Downspouts',       type: 'number' },
  ],
  'emergency-leak': [
    { key: 'address',  label: 'Job Address',       type: 'text' },
    { key: 'location', label: 'Leak Location',     type: 'text' },
    { key: 'stories',  label: 'Storeys',           type: 'number' },
    { key: 'tarp',     label: 'Temp Fix In Place', type: 'toggle' },
    { key: 'interior', label: 'Interior Damage',   type: 'toggle' },
    { key: 'age',      label: 'Roof Age (yrs)',    type: 'number' },
    { key: 'notes',    label: 'Notes',             type: 'long-text' },
  ],
};

// ── Roofing Line Items (for materials checklist) ─────────────────────────────

const DEOSA_MENU = [
  {
    cuisine: 'Shingles & Materials',
    sections: [
      {
        name: 'Materials', price: 90,
        items: [
          { key: 'shingle_3tab',      name: '3-Tab Shingles',              keywords: ['3-tab', 'three tab', 'three-tab', 'economy shingles'] },
          { key: 'shingle_arch',      name: '30-yr Architectural Shingles', keywords: ['architectural', '30-year', '30 year', 'arch shingles', 'dimensional', 'laminate shingles'] },
          { key: 'shingle_50yr',      name: '50-yr Architectural Shingles', keywords: ['50-year', '50 year', 'lifetime shingles'] },
          { key: 'shingle_impact',    name: 'Impact-Resistant (Class 4)',   keywords: ['impact resistant', 'class 4', 'impact-resistant', 'hail resistant', 'class four'] },
          { key: 'shingle_metal',     name: 'Metal Roofing',                keywords: ['metal roof', 'standing seam', 'metal shingles', 'steel roofing'] },
          { key: 'underlayment',      name: 'Synthetic Underlayment',       keywords: ['underlayment', 'underlament', 'felt', 'synthetic felt'] },
          { key: 'ice_water',         name: 'Ice & Water Shield',           keywords: ['ice and water', 'ice water shield', 'ice shield'] },
        ],
      },
    ],
  },
  {
    cuisine: 'Labor & Tear-Off',
    sections: [
      {
        name: 'Labor', price: 60,
        items: [
          { key: 'labor_install',   name: 'Installation Labor',      keywords: ['installation', 'install labor', 'labor', 'labour'] },
          { key: 'labor_tearoff',   name: 'Tear-Off & Disposal',     keywords: ['tear off', 'tear-off', 'removal', 'rip off', 'strip off', 'old roof removal'] },
          { key: 'flashing',        name: 'Flashing',                keywords: ['flashing', 'valley flashing', 'step flashing', 'drip edge'] },
          { key: 'ridge_cap',       name: 'Ridge Cap & Vents',       keywords: ['ridge cap', 'ridge vent', 'ridge ventilation', 'hip cap'] },
          { key: 'decking',         name: 'Decking Replacement',     keywords: ['decking', 'plywood', 'osb', 'sheathing', 'wood rot'] },
        ],
      },
    ],
  },
  {
    cuisine: 'Extras & Add-ons',
    sections: [
      {
        name: 'Extras', price: 0,
        items: [
          { key: 'gutters',         name: 'Gutter Replacement',      keywords: ['gutters', 'gutter replacement', 'seamless gutters', 'new gutters'] },
          { key: 'gutter_guards',   name: 'Gutter Guards',           keywords: ['gutter guards', 'leaf guards', 'micro mesh'] },
          { key: 'fascia',          name: 'Fascia & Soffit',         keywords: ['fascia', 'soffit', 'fascia board'] },
          { key: 'skylight',        name: 'Skylight Flashing',       keywords: ['skylight', 'sky light flashing'] },
          { key: 'chimney',         name: 'Chimney Flashing',        keywords: ['chimney flashing', 'chimney recount', 'chimney'] },
          { key: 'ventilation',     name: 'Ventilation Upgrade',     keywords: ['ventilation', 'attic ventilation', 'power vent', 'box vents'] },
        ],
      },
    ],
  },
];

// Flat array for fast lookup
const DEOSA_ALL_ITEMS = DEOSA_MENU.flatMap(cg =>
  cg.sections.flatMap(s =>
    s.items.map(item => ({ ...item, cuisine: cg.cuisine, section: s.name, price: s.price }))
  )
);

// Detect roofing items mentioned in a transcript line
// Returns { toCheck: [key], toUncheck: [key], toAmbiguous: [{id, label, candidates, minPrice, maxPrice}] }
function detectFoodInText(text) {
  const clauses = text.split(/[.!?]+\s*|\s*,?\s+but\s+|\s*,?\s+however\s+|\s*,?\s+except\s+/i)
    .map(c => c.trim()).filter(Boolean);

  const REMOVAL_PATTERNS = [
    /\b(remove|removing)\b/,
    /\bdon'?t want\b/,
    /\bdo not want\b/,
    /\bnot the\b/,
    /\bcancel\b/,
    /\btake (it\s+)?off\b/,
    /\bscratch that\b/,
    /\bno (more|longer)\b/,
  ];
  const PRESERVATION_PATTERNS = [
    /\bleave\b/,
    /\bkeep\b/,
    /\bstill want\b/,
    /\bkeeping\b/,
  ];

  const allToCheck = [];
  const allToUncheck = [];
  const allToAmbiguous = [];

  for (const clause of clauses) {
    const lower = clause.toLowerCase();
    const isRemoval = REMOVAL_PATTERNS.some(p => p.test(lower));
    const isPreservation = PRESERVATION_PATTERNS.some(p => p.test(lower));
    const effectiveRemoval = isRemoval && !isPreservation;

    const kwMatches = new Map();
    for (const item of DEOSA_ALL_ITEMS) {
      for (const kw of item.keywords) {
        if (lower.includes(kw)) {
          if (!kwMatches.has(kw)) kwMatches.set(kw, []);
          kwMatches.get(kw).push(item);
          break;
        }
      }
    }

    const clauseResolved = new Set();
    const entries = [...kwMatches.entries()].sort((a, b) => b[0].length - a[0].length);

    for (const [kw, items] of entries) {
      const fresh = items.filter(i => !clauseResolved.has(i.key));
      if (!fresh.length) continue;
      if (fresh.length === 1) {
        if (effectiveRemoval) {
          allToUncheck.push(fresh[0].key);
        } else {
          allToCheck.push(fresh[0].key);
        }
        clauseResolved.add(fresh[0].key);
      } else {
        if (!effectiveRemoval) {
          const prices = fresh.map(i => i.price);
          allToAmbiguous.push({
            id: `amb_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            label: kw,
            candidates: fresh,
            minPrice: Math.min(...prices),
            maxPrice: Math.max(...prices),
          });
        } else {
          fresh.forEach(i => allToUncheck.push(i.key));
        }
        fresh.forEach(i => clauseResolved.add(i.key));
      }
    }
  }

  return { toCheck: allToCheck, toUncheck: allToUncheck, toAmbiguous: allToAmbiguous };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function fmt(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function splitIntoChunks(text) {
  const parts = text.match(/[^.!?]+[.!?]*/g) || [text];
  return parts.map(p => p.trim()).filter(Boolean);
}

function dedupFields(newFields, existingLabels) {
  const normalize = label => label
    .toLowerCase()
    .replace(/\b(client|my|their|the|a|an)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '').trim()
    .split(/\s+/).filter(Boolean).sort().join(' ');

  return newFields
    .filter(f => {
      const k = normalize(f.label || '');
      return !existingLabels.some(e => normalize(e) === k);
    })
    .map(f => ({
      key: `f_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      label: (f.label || '').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      type: f.type || 'text',
      options: f.options || [],
    }));
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DemoPage({ onHome, onBookDemo, onEnterApp, onGoToDashboard, initialPhone = '', initialNiche = null, forceFillSelect = false }) {
  // ── Detect viewer mode ──
  const params = new URLSearchParams(window.location.search);
  const watchCode = params.get('w') || params.get('watch'); // 'w' is the short form
  const isViewer = !!watchCode;

  // ── Pusher config ──
  const PUSHER_KEY     = import.meta.env.VITE_PUSHER_KEY;
  const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER;
  const hasPusher = !!PUSHER_KEY;

  // Resolve the effective initial phone — use the bridge as a fallback in case
  // the React prop hasn't propagated yet (batching timing edge case).
  // useState lazy-init runs once per mount, so the bridge value is captured reliably.
  const [effectiveInitialPhone] = useState(() => initialPhone || getPendingPhone());
  // Clear the bridge after reading (useEffect fires after mount, even in StrictMode)
  useEffect(() => { clearPendingPhone(); }, []);

  // ── Phase state ──
  const startAtFormSelect = !isViewer && (!!effectiveInitialPhone || forceFillSelect);
  const [phase, setPhase] = useState(isViewer ? 'waiting' : (startAtFormSelect ? 'fill-select' : 'landing'));
  const [mode,  setMode]  = useState(startAtFormSelect ? 'fill' : null); // 'build' | 'fill'
  const [sessionCode, setCode] = useState(isViewer ? watchCode : null);

  // Ref holding the phone number passed in from "Call again"
  const initPhoneRef = React.useRef(effectiveInitialPhone);
  // Keep ref + dial number in sync when prop changes (component stays mounted across navigation)
  useEffect(() => {
    initPhoneRef.current = initialPhone;
    if (initialPhone) setDialNum(initialPhone);
  }, [initialPhone]);

  // ── Call data ──
  const [niche,       setNiche]  = useState(null);
  const [fields,      setFields] = useState([]);
  const [fieldValues, setFVals]  = useState({});
  const [transcript,  setTx]     = useState([]);
  const [callActive,   setCA]          = useState(false);
  const [callStatus,   setCallStatus]  = useState('idle'); // 'idle'|'connecting'|'ringing'|'active'
  const [timerRunning, setTimerRunning]= useState(false);
  const [callSeconds,  setCS]          = useState(0);
  const [recordingUrl, setRec]         = useState(null);

  // ── Inbound call ──
  const [incomingCall, setIncomingCall] = useState(null); // { invite, from, session }
  const [activeCallPhone, setActiveCallPhone] = useState(''); // phone number of current/last call
  const [smsSent,    setSmsSent]    = useState(false);
  const [smsSending, setSmsSending] = useState(false);

  // ── Notification permission ──
  const [notifPermission, setNotifPermission] = useState(() => {
    try { return Notification.permission; } catch { return 'unsupported'; }
  });

  // ── Call controls ──
  const [micActive,   setMic]     = useState(false);
  const [txPusherActive, setTxPA] = useState(false); // true when Twilio transcription is live
  const [interimText, setInterim] = useState('');
  const [aiThinking,  setAIT]     = useState(false);
  const [apiError,    setErr]     = useState(null);
  const [showTypeMode,setTypeMode]= useState(false);
  const [lineText,    setLT]      = useState('');
  const [lineSpeaker, setLS]      = useState('Client');
  const [lastAdded,   setLA]      = useState(null);
  const [lastFilled,  setLF]      = useState(null);
  const [txMinimised, setTxMin]   = useState(false);

  // ── Manual builder ──
  const [manualFields, setMF]  = useState([]);
  const [addingManual, setAM]  = useState(false);
  const [manualLabel,  setML]  = useState('');
  const [manualType,   setMT]  = useState('text');

  // ── Saved forms ──
  const [savedForms, setSavedForms] = useState(() => {
    try { return JSON.parse(localStorage.getItem('smq_saved_forms') || '[]'); } catch { return []; }
  });
  const [saveName,  setSaveName]  = useState('');
  const [formSaved, setFormSaved] = useState(false);

  // ── Form selector (fill-select phase dropdown) ──
  const [selectedFormKey, setSelectedFormKey] = useState(() => {
    // New Call (forceFillSelect, no phone): default to blank
    if (forceFillSelect && !effectiveInitialPhone) return 'blank';
    // Call Again (has phone): pre-select continue
    if (effectiveInitialPhone) return 'continue';
    // Otherwise default to first saved form or first template
    try {
      const saved = JSON.parse(localStorage.getItem('smq_saved_forms') || '[]');
      if (saved.length > 0) return `saved:${saved[0].id}`;
    } catch { /* ignore */ }
    return 'template:roof-replacement';
  });

  // ── Share ──
  const [copied, setCopied] = useState(false);

  // ── Dialpad ──
  const [dialNumber, setDialNum]       = useState(effectiveInitialPhone);
  const [dialContactsOpen, setDialContactsOpen] = useState(false);
  const [dialContactSearch, setDialContactSearch] = useState('');

  // ── Menu checklist (roofing niche) ──
  const [menuChecked, setMenuChecked]     = useState({}); // { itemKey: true }
  const menuCheckedRef = useRef({});
  const [menuAmbiguous, setMenuAmbiguous] = useState([]); // [{ id, label, candidates, minPrice, maxPrice }]
  const [priceOverrides, setPriceOverrides] = useState({}); // { itemKey: overridePrice }

  // ── Post-call analysis ──
  const [analysis,  setAnalysis]  = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [hasRec,    setHasRec]    = useState(false);

  // ── Done screen UI ──
  const [showTranscript, setShowTx]  = useState(false);
  const [editingData,    setEditData] = useState(false);
  const [editFields,     setEF]       = useState([]);
  const [editValues,     setEV]       = useState({});

  // ── Refs ──
  const phaseRef        = useRef(phase);
  const modeRef         = useRef(startAtFormSelect ? 'fill' : null);
  const nicheRef        = useRef(null);
  const fieldsRef       = useRef([]);
  const fvRef           = useRef({});
  const txRef           = useRef([]);
  const caRef           = useRef(false);
  const scRef           = useRef(sessionCode);
  const lsRef           = useRef('Client');
  const aiPendingRef    = useRef(0);
  const recognitionRef  = useRef(null);
  const intentStopRef   = useRef(false);
  const speechBufRef    = useRef('');
  const bufTimerRef     = useRef(null);
  const fillDebounceRef = useRef(null);
  const timerRef        = useRef(null);
  const mediaRecRef     = useRef(null);
  const recChunksRef    = useRef([]);
  const txDivRef        = useRef(null);
  const onLineRef       = useRef(null);
  const heartbeatRef    = useRef(null);
  const swDeviceRef   = useRef(null);  // SignalWire Call Fabric client
  const swCallRef     = useRef(null);  // active SignalWire call object
  const twilioCallSidRef  = useRef(null);  // SignalWire call ID for fetching recording
  const swCallerNumberRef = useRef('');    // SignalWire phone number for outbound caller ID
  const swEndCallRef      = useRef(null);  // ref to endCall for notification handler
  const whisperIntervalRef  = useRef(null);
  const whisperHeaderRef    = useRef(null);
  const transcriptPusherRef = useRef(null); // Twilio Real-Time Transcription Pusher subscription
  const lastYouTxRef    = useRef(false);   // unused — kept for cleanup safety
  const youWatchdogRef  = useRef(null);    // unused — kept for cleanup safety
  const remoteHungUpRef = useRef(false);   // true when disconnect was initiated by remote party
  const inboundRingtoneRef = useRef(null); // ringtone for inbound calls
  const inboundTitleRef    = useRef(null); // title flash interval for inbound calls
  const autoAnswerRef      = useRef(false); // set when user tapped Answer in a push notification
  const audioCtxRef        = useRef(null); // shared AudioContext, warmed on first user gesture
  const ringtoneAudioRef   = useRef(null); // <Audio> element for ringtone (primed on first gesture)
  const acceptInboundRef   = useRef(null); // updated each render to avoid stale closures in useEffect

  // Mirror state → refs
  useEffect(() => { phaseRef.current = phase; },       [phase]);
  useEffect(() => { modeRef.current  = mode; },        [mode]);
  useEffect(() => { nicheRef.current = niche; },       [niche]);
  useEffect(() => { fieldsRef.current = fields; },     [fields]);
  useEffect(() => { fvRef.current = fieldValues; },    [fieldValues]);
  useEffect(() => { txRef.current = transcript; },     [transcript]);
  useEffect(() => { caRef.current = callActive; },     [callActive]);
  useEffect(() => { scRef.current = sessionCode; },    [sessionCode]);
  useEffect(() => { lsRef.current = lineSpeaker; },    [lineSpeaker]);

  // Auto-scroll transcript
  useEffect(() => {
    if (txDivRef.current) txDivRef.current.scrollTop = txDivRef.current.scrollHeight;
  }, [transcript]);

  // Auto-scroll form to the field that was just filled
  const fieldElemRefs = useRef({});
  useEffect(() => {
    if (!lastFilled) return;
    const el = fieldElemRefs.current[lastFilled];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [lastFilled]);

  // Call timer — only starts when customer's phone begins ringing
  useEffect(() => {
    if (timerRunning) timerRef.current = setInterval(() => setCS(s => s + 1), 1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  // Cleanup on unmount
  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearTimeout(bufTimerRef.current);
    clearTimeout(youWatchdogRef.current);
    remoteHungUpRef.current = false;
    stopMic();
  }, []);

  // ── Pusher — viewer subscription ──────────────────────────────────────────
  useEffect(() => {
    if (!sessionCode || !hasPusher || !isViewer) return;
    const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
    pusher.connection.bind('error', err => {
      console.error('[Pusher viewer] connection error:', err);
    });
    const ch = pusher.subscribe(`demo-${sessionCode}`);
    ch.bind('state-update', snap => {
      if (snap.phase !== undefined) { setPhase(snap.phase); phaseRef.current = snap.phase; }
      if (snap.mode  !== undefined) { setMode(snap.mode);   modeRef.current  = snap.mode; }
      if (snap.fields !== undefined)      setFields(snap.fields);
      if (snap.fieldValues !== undefined) setFVals(snap.fieldValues);
      if (snap.transcript !== undefined)  setTx(snap.transcript);
      if (snap.callActive   !== undefined) setCA(snap.callActive);
      if (snap.analysis     !== undefined) setAnalysis(snap.analysis);
      if (snap.hasRecording)               setHasRec(true);
      if (snap.dialNumber   !== undefined) setDialNum(snap.dialNumber);
      if (snap.niche !== undefined) {
        const n = typeof snap.niche === 'string' ? NICHES.find(x => x.id === snap.niche) : snap.niche;
        setNiche(n || null);
        nicheRef.current = n || null;
      }
    });
    return () => { ch.unbind_all(); pusher.unsubscribe(`demo-${sessionCode}`); pusher.disconnect(); };
  }, [sessionCode, isViewer, hasPusher]);

  // ── Persistent inbound Device registration (presenter only) ─────────────
  useEffect(() => {
    if (isViewer) return;
    let client;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/signalwire-token');
        if (!res.ok) return;
        const { token, callerNumber } = await res.json();
        swCallerNumberRef.current = callerNumber;
        const { SignalWire } = await import('@signalwire/js');
        if (cancelled) return;
        client = await SignalWire({ token });
        swDeviceRef.current = client;

        await client.online({
          incomingCallHandlers: {
            all: (notification) => {
              const details = notification.invite.details;
              const callerFrom = details.caller_id_number || details.callerIdNumber || 'Unknown';
              // Session is passed via <Parameter name="session"> in twilio-voice.js
              const session = details.session || details.custom_data_session || null;
              console.log('[signalwire] Inbound call from:', callerFrom, 'session:', session, 'details:', JSON.stringify(details));

              if (autoAnswerRef.current) {
                autoAnswerRef.current = false;
                (async () => {
                  try {
                    const call = await notification.invite.accept({
                      rootElement: document.getElementById('sw-media'),
                      audio: true, video: false,
                    });
                    swCallRef.current = call;
                    // Listen for remote hangup
                    call.on('destroy', () => {
                      console.log('[signalwire] Inbound call destroyed');
                      remoteHungUpRef.current = true;
                      if (caRef.current) swEndCallRef.current?.();
                    });
                    if (acceptInboundRef.current) acceptInboundRef.current(call, callerFrom, session);
                  } catch (e) { console.warn('[signalwire] Auto-answer failed:', e.message); }
                })();
                return;
              }

              // Store the invite for manual answer
              setIncomingCall({ invite: notification.invite, from: callerFrom, session });
              startInboundRingtone();
              startTitleFlash();
              try { navigator.setAppBadge?.(1); } catch {}
            },
          },
        });
        console.log('[signalwire] Client online, listening for inbound calls');
      } catch (e) { console.warn('SignalWire inbound client init:', e.message); }
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
  }, [isViewer]);

  // ── Warm AudioContext without requiring user gesture ─────────────────────
  // getUserMedia (mic already granted for outbound calls) lets Chrome start
  // an AudioContext without an explicit user gesture. We stop the tracks
  // immediately — we just need the permission signal to unlock audio.
  useEffect(() => {
    if (isViewer) return;
    let cancelled = false;
    navigator.mediaDevices?.getUserMedia({ audio: true, video: false })
      .then(stream => {
        stream.getTracks().forEach(t => t.stop());
        if (cancelled) return;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ctx.resume().catch(() => {});
        audioCtxRef.current = ctx;
      })
      .catch(() => {
        // Mic not granted yet — fall back to first-click warm-up
        const warm = () => {
          if (audioCtxRef.current) return;
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            ctx.resume().catch(() => {});
            audioCtxRef.current = ctx;
          } catch {}
        };
        document.addEventListener('click', warm, { once: true });
        document.addEventListener('touchstart', warm, { once: true });
      });
    return () => { cancelled = true; };
  }, [isViewer]);

  // ── Silent audio loop — keeps iOS audio session alive ────────────────────
  // iOS Safari blocks unmuted audio without a prior user gesture, BUT allows
  // muted autoplay immediately. We start a muted silence loop on mount so the
  // audio element is already "active" when a call arrives — then we just unmute
  // and swap src, which iOS permits on an already-active element.
  useEffect(() => {
    if (isViewer) return;

    const audio = new Audio('/silence.wav');
    audio.loop = true;
    audio.volume = 0;
    audio.muted = true;     // muted = iOS allows autoplay without any gesture
    audio.preload = 'auto';
    ringtoneAudioRef.current = audio;

    // Preload ringtone so the swap is instant
    const preload = new Audio('/ringtone.wav');
    preload.preload = 'auto';

    // Start immediately — muted autoplay works on iOS without a user gesture
    audio.play().catch(() => {});

    // On first gesture: unmute so the audio session is fully active
    const unlock = () => {
      audio.muted = false;
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('touchstart', unlock, { passive: true });
    document.addEventListener('click', unlock);

    return () => {
      audio.pause();
      ringtoneAudioRef.current = null;
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
  }, [isViewer]);

  // ── Service Worker registration + push subscription (presenter only) ─────
  useEffect(() => {
    if (isViewer || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(e => console.warn('SW reg failed:', e));
    try { if (Notification.permission === 'granted') subscribeToPush(); } catch {}
  }, [isViewer]);

  // ── SW message listener (answer/decline from push notification) ───────────
  useEffect(() => {
    if (isViewer || !('serviceWorker' in navigator)) return;
    const handler = e => {
      const { type } = e.data || {};
      if (type === 'answer-call') {
        if (incomingCall) {
          const { invite, from, session } = incomingCall;
          (async () => {
            try {
              const call = await invite.accept({
                rootElement: document.getElementById('sw-media'),
                audio: true, video: false,
              });
              swCallRef.current = call;
              call.on('destroy', () => {
                remoteHungUpRef.current = true;
                if (caRef.current) swEndCallRef.current?.();
              });
              dismissIncomingCall();
              if (acceptInboundRef.current) acceptInboundRef.current(call, from, session);
            } catch (e) { console.warn('[signalwire] Answer failed:', e.message); }
          })();
        } else {
          autoAnswerRef.current = true;
        }
      }
      if (type === 'decline-call' && incomingCall) {
        incomingCall.invite.reject();
        dismissIncomingCall();
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [isViewer, incomingCall]);

  // ── Broadcast helper (presenter only) ────────────────────────────────────
  const broadcast = useCallback(async (extra = {}) => {
    if (isViewer || !scRef.current || !hasPusher) return;
    const data = {
      phase:       phaseRef.current,
      mode:        modeRef.current,
      niche:       nicheRef.current?.id ?? null,
      fields:      fieldsRef.current,
      fieldValues: fvRef.current,
      transcript:  txRef.current,
      callActive:  caRef.current,
      ...extra,
    };
    try {
      await apiFetch('/api/demo-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionCode: scRef.current, event: 'state-update', data }),
      });
    } catch { /* ignore broadcast errors */ }
  }, [isViewer, hasPusher]);

  // ── AI transcript handler ─────────────────────────────────────────────────
  const onTranscriptLine = useCallback(async (speaker, text, skipAdd = false) => {
    // Track when Twilio inbound_track produces 'You' results (cancels Web Speech API watchdog)
    if (speaker === 'You') lastYouTxRef.current = true;
    if (!skipAdd) {
      const line = { speaker, text };
      setTx(prev => [...prev, line]);
      txRef.current = [...txRef.current, line];
    }
    aiPendingRef.current += 1;
    setAIT(true);

    try {
      if (modeRef.current === 'build' && speaker === 'Client') {
        // Buffer short fragments
        const wordCount = text.trim().split(/\s+/).length;
        if (!skipAdd && wordCount < 5) {
          speechBufRef.current = speechBufRef.current ? `${speechBufRef.current} ${text}` : text;
          clearTimeout(bufTimerRef.current);
          bufTimerRef.current = setTimeout(() => {
            const buf = speechBufRef.current;
            if (buf) { speechBufRef.current = ''; onLineRef.current('Client', buf, true); }
          }, 5000);
          // Don't decrement here — finally block handles it to avoid double-decrement
          return;
        }
        clearTimeout(bufTimerRef.current);
        let line = text;
        if (!skipAdd && speechBufRef.current) {
          line = `${speechBufRef.current} ${text}`;
          speechBufRef.current = '';
        }

        const ctx  = txRef.current.slice(-4);
        const hint = nicheRef.current?.promptHint;
        const ctxWithHint = hint ? [{ speaker: 'System', text: hint }, ...ctx] : ctx;
        const rollingLabels = fieldsRef.current.map(f => f.label);
        const allNew = [];

        for (const chunk of splitIntoChunks(line)) {
          const res = await suggestField(chunk, ctxWithHint, rollingLabels);
          if (!res.suggest || !res.fields?.length) continue;
          const fresh = dedupFields(res.fields, rollingLabels);
          allNew.push(...fresh);
          rollingLabels.push(...fresh.map(f => f.label));
        }

        if (allNew.length) {
          const nextFields = [...fieldsRef.current, ...allNew];
          fieldsRef.current = nextFields;
          setFields(nextFields);
          setLA(allNew.map(f => f.label).join(', '));
          setTimeout(() => setLA(null), 3000);
        }

        // Always try to fill values for all current fields (build mode)
        if (fieldsRef.current.length > 0) {
          const fillRes = await fillFields(line, fieldsRef.current, txRef.current.slice(-6));
          if (fillRes.fills?.length) {
            setFVals(prev => {
              const next = { ...prev };
              fillRes.fills.forEach(({ key, value }) => { next[key] = value; });
              fvRef.current = next;
              return next;
            });
            const lastKey = fillRes.fills[fillRes.fills.length - 1]?.key;
            if (lastKey) { setLF(lastKey); setTimeout(() => setLF(k => k === lastKey ? null : k), 1800); }
            broadcast({ fields: fieldsRef.current, fieldValues: fvRef.current, transcript: txRef.current });
          } else {
            broadcast({ fields: fieldsRef.current, transcript: txRef.current });
          }
        } else {
          broadcast({ transcript: txRef.current });
        }
      }

      if (modeRef.current === 'fill') {
        // Debounce: wait 1.5s after last transcript line, then re-analyse the FULL transcript
        clearTimeout(fillDebounceRef.current);
        broadcast({ transcript: txRef.current });
        fillDebounceRef.current = setTimeout(async () => {
          if (!fieldsRef.current.length) return;
          try {
            const res = await fillFieldsFromTranscript(txRef.current, fieldsRef.current);
            if (res.fills?.length) {
              // REPLACE all field values (not merge) — gives full-comprehension semantics
              const next = {};
              res.fills.forEach(({ key, value }) => {
                if (value !== null && value !== undefined && value !== '') {
                  next[key] = value;
                }
              });
              fvRef.current = next;
              setFVals(next);
              broadcast({ fieldValues: next, transcript: txRef.current });
              const lastKey = res.fills[res.fills.length - 1]?.key;
              if (lastKey) {
                setLF(lastKey);
                setTimeout(() => setLF(k => k === lastKey ? null : k), 1800);
              }
            }
          } catch (err) {
            console.error('Fill error:', err);
          }
        }, 1500);
      }

      // ── Live roofing item detection ────────────────────────────────────────
      if (nicheRef.current?.id === 'roof-replacement') {
        const { toCheck, toUncheck, toAmbiguous } = detectFoodInText(text);
        if (toCheck.length || toUncheck.length) {
          setMenuChecked(prev => {
            const next = { ...prev };
            toCheck.forEach(k => { next[k] = true; });
            toUncheck.forEach(k => { delete next[k]; });
            menuCheckedRef.current = next;
            return next;
          });
        }
        if (toAmbiguous.length) {
          setMenuAmbiguous(prev => [...prev, ...toAmbiguous]);
        }
      }

      // For 'You' lines: just broadcast transcript update
      if (speaker === 'You') broadcast({ transcript: txRef.current });

    } catch (err) {
      console.error('AI error:', err);
      setErr('AI analysis failed — check your connection');
      setTimeout(() => setErr(null), 4000);
    } finally {
      aiPendingRef.current -= 1;
      if (aiPendingRef.current === 0) setAIT(false);
    }
  }, [broadcast]);

  onLineRef.current = onTranscriptLine;

  // ── Web Speech API ─────────────────────────────────────────────────────────
  const SpeechRec = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

  const startMic = () => {
    if (micActive) return;
    intentStopRef.current = false;
    if (SpeechRec) {
      const r = new SpeechRec();
      recognitionRef.current = r;
      r.continuous = true;
      r.interimResults = true;
      r.lang = 'en-US';
      r.onresult = e => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            setInterim('');
            // Web Speech API always captures the local mic = presenter = 'You'
            onLineRef.current('You', t.trim());
          } else { interim += t; }
        }
        setInterim(interim);
      };
      r.onerror = e => {
        console.warn('Speech recognition error:', e.error);
        if (e.error === 'not-allowed' || e.error === 'permission-denied') {
          setErr('Microphone access denied — check browser permissions');
          intentStopRef.current = true;
        } else if (e.error === 'audio-capture') {
          // Mic busy (e.g. WebRTC in use) — retry after short delay
          setTimeout(() => { if (!intentStopRef.current) { try { r.start(); } catch {} } }, 800);
        } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
          setErr(`Transcription error: ${e.error} — try Type mode`);
        }
        setTimeout(() => setErr(null), 5000);
      };
      r.onend = () => {
        setInterim('');
        if (!intentStopRef.current && recognitionRef.current) {
          try { r.start(); } catch { setMic(false); }
        } else { setMic(false); }
      };
      r.start();
      setMic(true);
    } else {
      setErr('Speech recognition not supported — use Type mode instead');
      setTimeout(() => setErr(null), 5000);
    }
  };

  const stopMic = () => {
    intentStopRef.current = true;
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setMic(false);
    setInterim('');
  };

  // ── Inbound call helpers ──────────────────────────────────────────────────
  const urlB64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  };

  const requestNotifPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    if (result === 'granted') subscribeToPush();
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

  const startInboundRingtone = () => {
    const audio = ringtoneAudioRef.current;
    if (audio) {
      // Unmute first (element already active from muted autoplay), then swap src.
      // iOS permits this on an already-active element — no new gesture needed.
      audio.muted = false;
      audio.pause();
      audio.src = '/ringtone.wav';
      audio.volume = 1;
      audio.loop = true;
      audio.currentTime = 0;
      audio.play().catch(() => {
        startOscillatorRingtone();
      });
      inboundRingtoneRef.current = {
        stop: () => {
          audio.pause();
          // Restore muted silence so session stays alive for next call
          audio.src = '/silence.wav';
          audio.volume = 0;
          audio.muted = true;
          audio.loop = true;
          audio.play().catch(() => {});
        },
      };
      return;
    }
    startOscillatorRingtone();
  };
  const startOscillatorRingtone = () => {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      if (!audioCtxRef.current) audioCtxRef.current = ctx;
      ctx.resume().catch(() => {});
      const playBeep = (time) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 480; osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
        osc.start(time); osc.stop(time + 0.4);
      };
      let t = ctx.currentTime;
      const interval = setInterval(() => { playBeep(t); playBeep(t + 0.5); t += 2.5; }, 2500);
      playBeep(t); playBeep(t + 0.5);
      inboundRingtoneRef.current = { stop: () => { clearInterval(interval); try { ctx.close(); } catch {} } };
    } catch {}
  };
  const stopInboundRingtone = () => { inboundRingtoneRef.current?.stop(); inboundRingtoneRef.current = null; };

  const startTitleFlash = () => {
    const orig = document.title;
    let on = true;
    inboundTitleRef.current = setInterval(() => {
      document.title = on ? '📞 Incoming Call' : orig;
      on = !on;
    }, 800);
  };
  const stopTitleFlash = () => {
    clearInterval(inboundTitleRef.current);
    document.title = 'Show My Quote';
  };

  const dismissIncomingCall = () => {
    stopInboundRingtone();
    stopTitleFlash();
    try { navigator.clearAppBadge?.(); } catch {}
    setIncomingCall(null);
  };

  // ── Accept an inbound call: transition to call phase + wire transcription ─
  // Called from the Answer button, SW message handler, and auto-answer path.
  const acceptInboundCallSetup = (call, from, session) => {
    const cp = 'call';
    setPhase(cp); phaseRef.current = cp;
    broadcast({ phase: cp });
    setCA(true); caRef.current = true;
    setCS(0);
    setCallStatus('active');
    // Only set activeCallPhone if not already set (outbound calls set it before the bridge leg arrives)
    setActiveCallPhone(prev => (prev && prev !== '') ? prev : (from && from !== 'Unknown' ? from : prev));
    setTimerRunning(true);
    // Only start heartbeat if not already running (outbound calls start it in startCall)
    if (!heartbeatRef.current) heartbeatRef.current = setInterval(() => broadcast({}), 2500);
    swCallRef.current = call;

    // Start browser mic + Web Speech API for presenter's voice ('You' track)
    startMic();

    // Subscribe to Pusher tx-{session} channel for AssemblyAI transcription (Client voice)
    if (session && hasPusher) {
      const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
      const channel = `tx-${session}`;
      const ch = pusher.subscribe(channel);
      ch.bind('transcript', ({ text, speaker }) => {
        if (text) onTranscriptLine(speaker || 'Client', text);
      });
      transcriptPusherRef.current = { pusher, channel };
      setTxPA(true);
      console.log('[smq] Subscribed to Pusher channel:', channel);
    }
    // Note: remote hangup is detected via the SignalWire notification handler
  };
  // Keep ref up-to-date so the persistent Device useEffect always calls the latest version
  acceptInboundRef.current = acceptInboundCallSetup;

  // ── Call lifecycle ────────────────────────────────────────────────────────
  const startCall = async (phoneNumber = '') => {
    // Transition to call phase
    const cp = 'call'; setPhase(cp); phaseRef.current = cp;
    broadcast({ phase: cp });
    setCA(true); caRef.current = true;
    setCS(0);
    setCallStatus('connecting');
    // Heartbeat — keeps viewer in sync every 2.5s
    heartbeatRef.current = setInterval(() => broadcast({}), 2500);

    // Connect via SignalWire if a number was provided
    if (phoneNumber) {
      setActiveCallPhone(phoneNumber);
      try {
        // Ensure the SignalWire client is online to receive the inbound bridge leg.
        // The persistent useEffect normally registers the client, but if it hasn't
        // finished yet we create one here and register it online.
        if (!swDeviceRef.current) {
          const tokenRes = await apiFetch('/api/signalwire-token');
          if (!tokenRes.ok) throw new Error('Token fetch failed');
          const { token, callerNumber } = await tokenRes.json();
          swCallerNumberRef.current = callerNumber;
          const { SignalWire } = await import('@signalwire/js');
          const client = await SignalWire({ token });
          swDeviceRef.current = client;
          // Register online with auto-answer handler for the bridge leg
          await client.online({
            incomingCallHandlers: {
              all: (notification) => {
                const details = notification.invite.details;
                const callerFrom = details.caller_id_number || details.callerIdNumber || 'Unknown';
                const session = details.session || details.custom_data_session || null;
                if (autoAnswerRef.current) {
                  autoAnswerRef.current = false;
                  (async () => {
                    try {
                      const call = await notification.invite.accept({
                        rootElement: document.getElementById('sw-media'),
                        audio: true, video: false,
                      });
                      swCallRef.current = call;
                      call.on('destroy', () => {
                        remoteHungUpRef.current = true;
                        if (caRef.current) swEndCallRef.current?.();
                      });
                      if (acceptInboundRef.current) acceptInboundRef.current(call, callerFrom, session);
                    } catch (e) { console.warn('[signalwire] Auto-answer failed:', e.message); }
                  })();
                }
              },
            },
          });
        }

        // Set auto-answer so the persistent inbound handler auto-accepts the bridge leg.
        // acceptInboundCallSetup will handle mic, timer, and Pusher transcription subscription.
        autoAnswerRef.current = true;

        // Initiate outbound call via server-side Compatibility REST API.
        // Flow: SignalWire rings the PSTN number → customer answers → LaML bridges to
        // our browser client (demo-presenter) → auto-answered → both parties connected.
        const outRes = await apiFetch('/api/signalwire-outbound', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: phoneNumber.replace(/[^\d+]/g, '') }),
        });

        if (!outRes.ok) {
          const err = await outRes.json().catch(() => ({}));
          console.error('[signalwire] Outbound failed:', outRes.status, err);
          throw new Error(err.error || 'Outbound call failed');
        }

        const { callSid } = await outRes.json();
        twilioCallSidRef.current = callSid || null;
        console.log('[signalwire] Outbound call initiated via REST API, sid:', callSid);

        setCallStatus('ringing');
      } catch (e) {
        console.error('[signalwire] Outbound call error:', e.message);
        autoAnswerRef.current = false;
        // Reset UI — don't leave user stuck on LIVE with no active call
        setCallStatus('idle');
        setCA(false);
        setTimerRunning(false);
        const msg = e.message?.includes('busy') || e.message?.includes('429') || e.message?.includes('21218')
          ? 'SignalWire is busy — wait 60 seconds and try again.'
          : `Call failed: ${e.message}. Try again in a moment.`;
        alert(msg);
        return;
      }
    }

    // Mic-only mode: use Web Speech API + local MediaRecorder (no WebRTC conflict)
    if (!phoneNumber) {
      setTimerRunning(true);
      startMic();
      // Local recording only for mic-only mode (no Twilio call to record server-side)
      navigator.mediaDevices?.getUserMedia({ audio: true }).then(stream => {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
        const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        recChunksRef.current = [];

        mr.ondataavailable = e => { if (e.data.size > 0) recChunksRef.current.push(e.data); };

        mr.onstop = () => {
          const blob = new Blob(recChunksRef.current, { type: 'audio/webm' });
          setRec(URL.createObjectURL(blob));
          broadcast({ hasRecording: true });
          stream.getTracks().forEach(t => t.stop());
        };

        mr.start();
        mediaRecRef.current = mr;
      }).catch(() => {});
    }
    // For Twilio calls: server-side recording is already enabled via record:'record-from-ringing'
    // in twilio-voice.js — we'll fetch it after the call ends
  };

  const endCall = async () => {
    stopMic();
    clearTimeout(bufTimerRef.current);
    clearTimeout(fillDebounceRef.current);
    clearTimeout(youWatchdogRef.current); youWatchdogRef.current = null;

    // Final full-transcript field extraction
    if (txRef.current.length > 0 && fieldsRef.current.length > 0) {
      fillFieldsFromTranscript(txRef.current, fieldsRef.current).then(res => {
        if (res.fills?.length) {
          const next = {};
          res.fills.forEach(({ key, value }) => {
            if (value !== null && value !== undefined && value !== '') next[key] = value;
          });
          // Preserve menu-checklist value — it's set by food detection, not AI
          const menuField = fieldsRef.current.find(f => f.type === 'menu-checklist');
          if (menuField && fvRef.current[menuField.key]) {
            next[menuField.key] = fvRef.current[menuField.key];
          }
          fvRef.current = next;
          setFVals(next);
        }
      }).catch(() => {});
    }

    // Re-scan full transcript for missed roofing items
    if (nicheRef.current?.id === 'roof-replacement' && txRef.current.length > 0) {
      const allChecked = {};
      txRef.current.forEach(line => {
        const { toCheck, toUncheck } = detectFoodInText(line.text);
        toCheck.forEach(k => { allChecked[k] = true; });
        toUncheck.forEach(k => { delete allChecked[k]; });
      });
      menuCheckedRef.current = allChecked;
      setMenuChecked(allChecked);
    }

    // Sync menu checklist → fieldValues so MENU shows as "captured"
    if (nicheRef.current?.id === 'roof-replacement') {
      setTimeout(() => {
        const menuField = fieldsRef.current.find(f => f.type === 'menu-checklist');
        if (menuField) {
          const checkedNames = Object.keys(menuCheckedRef.current).map(key => {
            const item = DEOSA_ALL_ITEMS.find(i => i.key === key);
            return item ? item.name : null;
          }).filter(Boolean);
          if (checkedNames.length) {
            setFVals(prev => {
              const next = { ...prev, [menuField.key]: checkedNames.join(', ') };
              fvRef.current = next;
              return next;
            });
          }
        }
      }, 200);
    }

    lastYouTxRef.current = false;
    clearInterval(heartbeatRef.current);
    clearInterval(whisperIntervalRef.current); whisperIntervalRef.current = null;
    // Capture call ID before clearing refs (needed to fetch server-side recording)
    const endedCallSid = twilioCallSidRef.current;
    // Hang up — safe to call even if already disconnected
    try {
      const call = swCallRef.current;
      if (call && call.state !== 'destroy') call.hangup();
    } catch {}
    // Keep the SignalWire client alive (swDeviceRef) for future inbound calls
    swCallRef.current = null;
    twilioCallSidRef.current = null;
    remoteHungUpRef.current = false;
    // Unsubscribe from Real-Time Transcription channel
    if (transcriptPusherRef.current) {
      const { pusher, channel } = transcriptPusherRef.current;
      try { pusher.unsubscribe(channel); pusher.disconnect(); } catch {}
      transcriptPusherRef.current = null;
      setTxPA(false);
    }
    // Stop local MediaRecorder (mic-only mode)
    try { if (mediaRecRef.current?.state === 'recording') mediaRecRef.current.stop(); } catch {}
    setCA(false); caRef.current = false;
    setCallStatus('idle');
    setTimerRunning(false);

    // Save call record to DB (best-effort, non-blocking)
    apiFetch('/api/save-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        direction:   activeCallPhone ? 'outbound' : 'inbound',
        from_number: activeCallPhone || null,
        duration:    callSeconds,
        transcript:  txRef.current,
        call_sid:    endedCallSid || null,
        status:      'completed',
        niche:       nicheRef.current?.id || null,
      }),
    }).catch(() => {});

    // Persist last-used form so "Continue" appears next time
    if (nicheRef.current?.id) {
      try { localStorage.setItem('smq_last_form', JSON.stringify({ type: 'template', nicheId: nicheRef.current.id, label: nicheRef.current.label || nicheRef.current.id })); } catch {}
    }

    setAnalysis(null); setAnalysing(false);
    const nextPhase = 'done';
    setPhase(nextPhase); phaseRef.current = nextPhase;
    broadcast({ callActive: false, phase: nextPhase });

    // Fetch Twilio server-side recording (if this was a Twilio call)
    if (endedCallSid) {
      // Poll for the recording — Twilio may take a few seconds to finalise it
      const pollRecording = async (attempts = 0) => {
        if (attempts > 15) return; // give up after ~30s
        try {
          const r = await apiFetch(`/api/twilio-recording?callSid=${endedCallSid}`);
          if (r.ok) {
            const data = await r.json();
            if (data.ready && data.recordingSid) {
              const streamUrl = `/api/twilio-recording?recordingSid=${data.recordingSid}&stream=true`;
              setRec(streamUrl);
              broadcast({ hasRecording: true });
              return;
            }
          }
        } catch (e) { console.warn('Recording poll error:', e.message); }
        setTimeout(() => pollRecording(attempts + 1), 2000);
      };
      pollRecording();
    }

    // Run full AI analysis — skip only if there is genuinely no transcript content
    // (API prompt already guards against hallucination for short transcripts)
    const meaningfulLines = txRef.current.filter(l => l.text && l.text.trim().length > 8);
    if (meaningfulLines.length < 1) return;
    setAnalysing(true);
    try {
      const r = await apiFetch('/api/demo-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Build menu summary for roofing niche
        body: (() => {
          const checkedMenuItems = Object.keys(menuCheckedRef.current).map(key => {
            const item = DEOSA_ALL_ITEMS.find(i => i.key === key);
            return item ? `${item.name} (£${item.price}pp)` : null;
          }).filter(Boolean);
          return JSON.stringify({
            transcript:  txRef.current,
            fields:      fieldsRef.current,
            fieldValues: fvRef.current,
            niche:       nicheRef.current?.label || null,
            menuItems:   checkedMenuItems,
          });
        })(),
      });
      if (r.ok) {
        const data = await r.json();
        setAnalysis(data);
        broadcast({ analysis: data });
      }
    } catch (e) { console.error('Demo analysis error:', e); }
    finally { setAnalysing(false); }
  };
  // Keep ref current so the persistent notification handler always calls the latest version
  swEndCallRef.current = endCall;


  // ── Phase transitions ─────────────────────────────────────────────────────
  const goToMode = (m) => {
    const code = generateCode();
    setCode(code); scRef.current = code;
    setMode(m);    modeRef.current = m;
    setPhase('session-setup'); phaseRef.current = 'session-setup';
    setTimeout(() => broadcast({ phase: 'session-setup', mode: m }), 150);
  };

  const afterSessionSetup = () => {
    if (mode === 'build') {
      setPhase('build-niche'); phaseRef.current = 'build-niche';
      broadcast({ phase: 'build-niche' });
    } else {
      setPhase('fill-select'); phaseRef.current = 'fill-select';
      broadcast({ phase: 'fill-select' });
    }
  };

  const selectNiche = (n) => {
    setNiche(n); nicheRef.current = n;
    const seed = n.seedFields.map((label, i) => ({
      key: `seed_${i}`, label, type: 'text', options: [],
    }));
    setFields(seed); fieldsRef.current = seed;
    setFVals({}); fvRef.current = {};
    setTx([]);    txRef.current  = [];
    setMenuChecked({}); menuCheckedRef.current = {}; setMenuAmbiguous([]);
    setPriceOverrides({});
    if (n.id !== 'blank') {
      try { localStorage.setItem('smq_last_form', JSON.stringify({ type: 'template', nicheId: n.id, label: n.label })); } catch {}
    }
    const phone = initPhoneRef.current || '';
    setDialNum(phone);
    const nextPhase = 'dial'; setPhase(nextPhase); phaseRef.current = nextPhase;
    broadcast({ phase: nextPhase, niche: n.id, fields: seed, fieldValues: {}, transcript: [], ...(phone && { dialNumber: phone }) });
  };

  const selectTemplate = (nicheId) => {
    const tpl = (TEMPLATE_FORMS[nicheId] || []).map(f => ({ ...f, key: `tpl_${f.key}` }));
    const n = NICHES.find(x => x.id === nicheId) || null;
    setNiche(n); nicheRef.current = n;
    setFields(tpl); fieldsRef.current = tpl;
    setFVals({}); fvRef.current = {};
    setTx([]);    txRef.current  = [];
    setMenuChecked({}); menuCheckedRef.current = {}; setMenuAmbiguous([]);
    setPriceOverrides({});
    try { localStorage.setItem('smq_last_form', JSON.stringify({ type: 'template', nicheId, label: n?.label || nicheId })); } catch {}
    const phone = initPhoneRef.current || '';
    setDialNum(phone);
    const nextPhase = 'dial'; setPhase(nextPhase); phaseRef.current = nextPhase;
    broadcast({ phase: nextPhase, niche: nicheId, fields: tpl, fieldValues: {}, transcript: [], ...(phone && { dialNumber: phone }) });
  };

  const useManualFields = () => {
    if (!manualFields.length) return;
    setFields(manualFields); fieldsRef.current = manualFields;
    setFVals({}); fvRef.current = {};
    setTx([]);    txRef.current  = [];
    const phone = initPhoneRef.current || '';
    setDialNum(phone);
    const nextPhase = 'dial'; setPhase(nextPhase); phaseRef.current = nextPhase;
    broadcast({ phase: nextPhase, fields: manualFields, fieldValues: {}, transcript: [], ...(phone && { dialNumber: phone }) });
  };

  const addLine = () => {
    if (!lineText.trim()) return;
    onLineRef.current(lineSpeaker, lineText.trim());
    setLT('');
  };

  const addManualField = () => {
    if (!manualLabel.trim()) return;
    setMF(prev => [...prev, {
      key: `mf_${Date.now()}`, label: manualLabel.trim(), type: manualType, options: [],
    }]);
    setML(''); setMT('text'); setAM(false);
  };

  const saveForm = () => {
    const name = saveName.trim() || (niche?.label ? `${niche.label} Form` : 'My Form');
    const newForm = {
      id: Date.now().toString(),
      name,
      niche: niche?.id || null,
      fields: fields.map(f => ({ ...f })),
      createdAt: Date.now(),
      recordingUrl: recordingUrl?.startsWith('/api/') ? recordingUrl : null,
    };
    const updated = [...savedForms, newForm];
    setSavedForms(updated);
    try { localStorage.setItem('smq_saved_forms', JSON.stringify(updated)); } catch {}
    setFormSaved(true);
  };

  const deleteSavedForm = (id) => {
    const updated = savedForms.filter(f => f.id !== id);
    setSavedForms(updated);
    try { localStorage.setItem('smq_saved_forms', JSON.stringify(updated)); } catch {}
  };

  const selectSavedForm = (form) => {
    const flds = form.fields.map(f => ({ ...f, key: `sv_${f.key}` }));
    setFields(flds); fieldsRef.current = flds;
    setFVals({}); fvRef.current = {};
    setTx([]);    txRef.current  = [];
    try { localStorage.setItem('smq_last_form', JSON.stringify({ type: 'saved', formId: form.id, label: form.name })); } catch {}
    const phone = initPhoneRef.current || '';
    setDialNum(phone);
    setNiche(null); nicheRef.current = null;
    const nextPhase = 'dial'; setPhase(nextPhase); phaseRef.current = nextPhase;
    broadcast({ phase: nextPhase, fields: flds, fieldValues: {}, transcript: [], ...(phone && { dialNumber: phone }) });
  };

  const reset = () => {
    dismissIncomingCall();
    stopMic();
    setPhase('landing'); phaseRef.current = 'landing';
    setMode(null); setCode(null); setNiche(null);
    setFields([]); setFVals({}); setTx([]);
    setCA(false); setCS(0); setRec(null);
    setMF([]); setML(''); setMT('text'); setAM(false);
    setSaveName(''); setFormSaved(false);
    setMenuChecked({}); menuCheckedRef.current = {}; setMenuAmbiguous([]);
    setPriceOverrides({});
    setAnalysis(null); setAnalysing(false);
    modeRef.current = null; nicheRef.current = null;
    fieldsRef.current = []; fvRef.current = {}; txRef.current = [];
    caRef.current = false; twilioCallSidRef.current = null; remoteHungUpRef.current = false;
    setActiveCallPhone(''); setSmsSent(false); setSmsSending(false);
    // Reset form selector: blank for New Call, continue for Call Again, else first saved/template
    if (forceFillSelect && !initialPhone) {
      setSelectedFormKey('blank');
    } else if (initialPhone) {
      setSelectedFormKey('continue');
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem('smq_saved_forms') || '[]');
        setSelectedFormKey(saved.length > 0 ? `saved:${saved[0].id}` : 'template:roof-replacement');
      } catch { setSelectedFormKey('template:roof-replacement'); }
    }
  };

  // ── Send SMS ──────────────────────────────────────────────────────────────
  const sendSms = async (text) => {
    if (!activeCallPhone || smsSending || smsSent) return;
    setSmsSending(true);
    try {
      const res = await apiFetch('/api/sms-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: activeCallPhone, body: text }),
      });
      if (res.ok) {
        setSmsSent(true);
      } else {
        const { error } = await res.json().catch(() => ({}));
        alert('Failed to send SMS: ' + (error || 'Unknown error'));
      }
    } catch (e) {
      alert('Failed to send SMS: ' + e.message);
    } finally {
      setSmsSending(false);
    }
  };

  // ── Share URL ─────────────────────────────────────────────────────────────
  const shareUrl = sessionCode ? `${window.location.origin}/demo?w=${sessionCode}` : '';
  const copyShare = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  // ── Menu checklist renderer (roofing niche) ──────────────────────────────
  const renderMenuChecklist = (f) => {
    const guestField = fields.find(fl => fl.label.toLowerCase().includes('guest'));
    const guestCount = parseInt((guestField ? fieldValues[guestField.key] : 0) || 0) || 0;

    // Compute running total
    let minPP = 0, maxPP = 0;
    Object.keys(menuChecked).forEach(key => {
      const item = DEOSA_ALL_ITEMS.find(i => i.key === key);
      if (item) { minPP += item.price; maxPP += item.price; }
    });
    menuAmbiguous.forEach(amb => { minPP += amb.minPrice; maxPP += amb.maxPrice; });
    const minTotal = minPP * guestCount;
    const maxTotal = maxPP * guestCount;
    const checkedCount = Object.keys(menuChecked).length;
    const isRange = minPP !== maxPP;

    return (
      <div key={f.key} className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ animation: 'slideUp 0.3s ease forwards' }}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Menu Selection</label>
          <div className="flex items-center gap-3">
            {checkedCount > 0 && (
              <span className="text-[10px] text-slate-400">{checkedCount} item{checkedCount !== 1 ? 's' : ''}</span>
            )}
            {(checkedCount > 0 || menuAmbiguous.length > 0) && (
              <div className={`text-sm font-black ${isRange ? 'text-amber-600' : 'text-green-600'}`}>
                {guestCount > 0
                  ? (isRange
                      ? `£${minTotal.toLocaleString()} – £${maxTotal.toLocaleString()}`
                      : `£${minTotal.toLocaleString()}`)
                  : (isRange
                      ? `£${minPP}–£${maxPP}pp`
                      : `£${minPP}pp`)}
                <span className="text-[10px] font-normal text-slate-400 ml-1">
                  {guestCount > 0 ? 'est.' : 'per person'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Ambiguous items needing clarification */}
        {menuAmbiguous.length > 0 && (
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
            <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2">Needs clarification</div>
            {menuAmbiguous.map(amb => (
              <div key={amb.id} className="mb-2 last:mb-0">
                <div className="text-xs font-semibold text-amber-800 mb-1.5">
                  "{amb.label}"
                  {amb.minPrice === amb.maxPrice
                    ? ` — £${amb.minPrice}pp`
                    : ` — £${amb.minPrice}–£${amb.maxPrice}pp`}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {amb.candidates.map(c => (
                    <button
                      key={c.key}
                      onClick={() => {
                        setMenuChecked(prev => { const next = { ...prev, [c.key]: true }; menuCheckedRef.current = next; return next; });
                        setMenuAmbiguous(prev => prev.filter(a => a.id !== amb.id));
                      }}
                      className="text-xs px-2.5 py-1 bg-white border border-amber-300 text-amber-800 rounded-lg hover:bg-amber-100 transition-colors font-medium"
                    >
                      {c.cuisine.split(' ')[0]}
                    </button>
                  ))}
                  <button
                    onClick={() => setMenuAmbiguous(prev => prev.filter(a => a.id !== amb.id))}
                    className="text-xs px-2 py-1 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Categorised checklist */}
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
          {DEOSA_MENU.map(cg => {
            const cuisineChecked = cg.sections.some(s => s.items.some(i => menuChecked[i.key]));
            return (
              <details key={cg.cuisine} className="group" open={cuisineChecked}>
                <summary className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 select-none list-none">
                  <div className="flex items-center gap-2">
                    {cuisineChecked && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                    <span className="text-xs font-semibold text-slate-700">{cg.cuisine}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform group-open:rotate-180 flex-shrink-0" />
                </summary>
                <div className="px-4 pb-3 space-y-3">
                  {cg.sections.map(section => (
                    <div key={section.name}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{section.name}</span>
                        <span className="text-[10px] text-slate-300">£{section.price}pp</span>
                      </div>
                      <div className="space-y-1">
                        {section.items.map(item => {
                          const isChecked = !!menuChecked[item.key];
                          return (
                            <button
                              key={item.key}
                              onClick={() => setMenuChecked(prev => {
                                const next = { ...prev };
                                if (next[item.key]) delete next[item.key];
                                else next[item.key] = true;
                                menuCheckedRef.current = next;
                                return next;
                              })}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all duration-200 ${
                                isChecked ? 'bg-green-50 border border-green-200' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all ${
                                isChecked ? 'bg-green-500 border-green-500' : 'border-slate-300'
                              }`}>
                                {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className={`flex-1 text-xs truncate ${isChecked ? 'text-green-800 font-medium' : 'text-slate-600'}`}>
                                {item.name}
                              </span>
                              <span className={`text-[10px] flex-shrink-0 text-right ${isChecked ? 'text-green-600 font-semibold' : 'text-slate-400'}`}>
                                £{section.price}pp
                                {guestCount > 0 && (
                                  <span className="block font-bold">
                                    £{(section.price * guestCount).toLocaleString()}
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    );
  };

  // Field display for the call panel (used in both build + fill modes)
  const renderField = (f) => {
    if (f.type === 'menu-checklist') return renderMenuChecklist(f);
    const val    = fieldValues[f.key];
    const filled = val !== undefined && val !== '' && val !== null && val !== false;
    const isHl   = lastFilled === f.key || lastAdded === f.label;
    const hl     = mode === 'fill' ? lastFilled === f.key : false;

    return (
      <div
        key={f.key}
        ref={el => { if (el) fieldElemRefs.current[f.key] = el; else delete fieldElemRefs.current[f.key]; }}
        className={`bg-white rounded-xl border px-4 py-3 transition-all duration-400
          ${hl ? 'border-green-400 shadow-[0_0_0_3px_rgba(74,222,128,0.15)]' : 'border-slate-200'}`}
        style={{ animation: 'slideUp 0.3s ease forwards' }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{f.label}</label>
          {hl && (
            <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <Check className="w-2.5 h-2.5" /> Filled
            </span>
          )}
          {!hl && filled && mode === 'fill' && (
            <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <Check className="w-2.5 h-2.5" /> Done
            </span>
          )}
          {mode === 'build' && (
            <span className="text-[10px] text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded-full">
              {f.type}
            </span>
          )}
        </div>
        <div className={`w-full px-3 py-2 rounded-lg border text-sm transition-all duration-300
          ${hl      ? 'border-green-300 bg-green-50 text-green-800'
          : filled  ? 'border-slate-200 bg-white text-slate-800'
          :           'border-slate-200 bg-slate-50 text-slate-300'}
          ${f.type === 'long-text' ? 'min-h-[48px]' : ''}`}
        >
          {filled
            ? (typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val))
            : (mode === 'fill' ? 'Listening…' : 'Field ready')}
        </div>
      </div>
    );
  };

  // ── Live call UI (shared between build + fill) ────────────────────────────
  const renderCallScreen = () => (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
      {/* Header */}
      <div className="flex-shrink-0 bg-slate-900 px-5 py-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rec</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full animate-pulse ${callStatus === 'connecting' ? 'bg-amber-400' : 'bg-green-400'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-widest ${callStatus === 'connecting' ? 'text-amber-400' : 'text-green-400'}`}>
            {callStatus === 'connecting' ? 'Connecting' : 'Live'}
          </span>
        </div>
        <span className="text-slate-400 font-mono text-sm ml-1">{fmt(callSeconds)}</span>
        <div className="flex-1" />
        {aiThinking && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>AI thinking…</span>
          </div>
        )}
        {!isViewer && (
          <button
            onClick={endCall}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            <PhoneOff className="w-3.5 h-3.5" /> End Call
          </button>
        )}
        {isViewer && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg">
            <Eye className="w-3.5 h-3.5" /> Viewing
          </div>
        )}
      </div>

      {/* AI banner */}
      <div className="flex-shrink-0 px-4 py-2 bg-green-50 border-b border-green-100 flex items-center gap-2">
        <Radio className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
        <span className="text-xs text-green-700 font-medium">
          {mode === 'build'
            ? 'AI listening — building your intake form from the conversation'
            : 'AI listening — filling your form in real time as the client speaks'}
        </span>
      </div>

      {/* Error */}
      {apiError && (
        <div className="flex-shrink-0 bg-red-50 border-b border-red-100 px-4 py-2 text-xs text-red-700 font-medium">
          ⚠ {apiError}
        </div>
      )}

      {/* Main panels */}
      <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>
        {/* Transcript */}
        <div className={`flex flex-col border-r border-slate-200 bg-white overflow-hidden transition-all duration-300 flex-shrink-0 ${txMinimised ? 'w-10' : 'w-[42%]'}`}>
          <div className="px-3 py-3 border-b border-slate-100 flex-shrink-0 flex items-center justify-between gap-2">
            {!txMinimised && (
              <div className="flex items-center gap-2 min-w-0">
                {micActive && (
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold text-green-600 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Listening
                  </span>
                )}
                {!micActive && txPusherActive && (
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-500 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    Both sides
                  </span>
                )}
              </div>
            )}
            <button
              onClick={() => setTxMin(v => !v)}
              className="w-6 h-6 flex-shrink-0 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors rounded ml-auto"
              title={txMinimised ? 'Expand transcript' : 'Collapse transcript'}
            >
              {txMinimised ? <ChevronRight className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
            </button>
          </div>

          {!txMinimised && (
            <>
              <div ref={txDivRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                {transcript.length === 0 && (
                  <div className="text-center py-8 space-y-2">
                    {micActive ? (
                      <>
                        <div className="flex justify-center gap-1 mb-3">
                          {[0,1,2,3].map(i => (
                            <span key={i} className="w-1 h-4 bg-green-400 rounded-full animate-pulse"
                              style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </div>
                        <p className="text-slate-400 text-xs">Listening for speech…</p>
                      </>
                    ) : (
                      <p className="text-slate-300 text-xs">Transcript will appear here</p>
                    )}
                  </div>
                )}
                {transcript.map((line, i) => (
                  <div
                    key={i}
                    className={`flex ${line.speaker !== 'You' ? 'justify-end' : 'justify-start'}`}
                    style={{ animation: 'slideUp 0.25s ease forwards' }}
                  >
                    <div className={`max-w-[88%] px-2.5 py-1.5 rounded-2xl text-[11px] leading-snug
                      ${line.speaker === 'You'
                        ? 'bg-slate-100 text-slate-800 rounded-tl-sm'
                        : 'bg-sky-400 text-white rounded-tr-sm'}`}>
                      {line.text}
                    </div>
                  </div>
                ))}
                {interimText && (
                  <div className="flex justify-start">
                    <div className="max-w-[88%] px-2.5 py-1.5 rounded-2xl text-[11px] bg-slate-50 text-slate-400 italic rounded-tl-sm border border-slate-200">
                      {interimText}
                    </div>
                  </div>
                )}
              </div>

              {/* Mic controls */}
              {!isViewer && (
                <div className="flex-shrink-0 border-t border-slate-100 p-3">
                  <button
                    onClick={micActive ? stopMic : startMic}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors
                      ${micActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                  >
                    {micActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {micActive ? 'Stop mic' : 'Start mic'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Form panel */}
        <div className="flex-1 flex flex-col bg-[#F7F7F5] overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {mode === 'build' ? 'Form — Auto-building' : 'Form — Auto-filling'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {fields.length} {fields.length === 1 ? 'field' : 'fields'}
                {mode === 'fill'
                  ? ` · ${Object.keys(fieldValues).length} filled`
                  : ' extracted so far'}
              </p>
            </div>
            {lastAdded && (
              <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-100 px-2 py-1 rounded-full">
                + {lastAdded}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {fields.length === 0 && (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                <p className="text-slate-300 text-sm">
                  {mode === 'build'
                    ? 'Form fields appear here as your client describes their process…'
                    : 'Start the call to begin filling the form…'}
                </p>
              </div>
            )}
            <div className="space-y-3">
              {fields.map(f => renderField(f))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Notification permission banner (presenter only, until granted/dismissed) ─
  const notifBanner = !isViewer && notifPermission === 'default' ? (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-xl px-5 py-3 flex items-center gap-4 shadow-xl text-sm max-w-sm w-full mx-4">
      <Bell className="w-4 h-4 text-green-400 flex-shrink-0" />
      <span className="flex-1">Enable notifications to be alerted for incoming calls</span>
      <button onClick={requestNotifPermission} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg font-medium transition-colors flex-shrink-0">
        Enable
      </button>
      <button onClick={() => setNotifPermission('dismissed')} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  ) : null;

  // ── Incoming call modal (shown over any phase when an inbound call arrives) ─
  const incomingCallModal = incomingCall ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-80 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Phone className="w-8 h-8 text-green-600" />
        </div>
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Incoming call</p>
        <p className="text-xl font-semibold text-slate-800 mb-6">{incomingCall.from}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { incomingCall.invite.reject(); dismissIncomingCall(); }}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <PhoneOff className="w-4 h-4" /> Decline
          </button>
          <button
            onClick={async () => {
              const { invite, from, session } = incomingCall;
              try {
                const call = await invite.accept({
                  rootElement: document.getElementById('sw-media'),
                  audio: true, video: false,
                });
                swCallRef.current = call;
                call.on('destroy', () => {
                  remoteHungUpRef.current = true;
                  if (caRef.current) swEndCallRef.current?.();
                });
                dismissIncomingCall();
                acceptInboundCallSetup(call, from, session);
              } catch (e) { console.warn('[signalwire] Answer failed:', e.message); }
            }}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl py-3 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" /> Answer
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // ── Form selector helpers (must be before any early returns — Rules of Hooks) ──
  // Resolve the "Continue" form data: prefer initialNiche prop, fall back to localStorage, then first template
  const continueFormData = useMemo(() => {
    if (initialNiche) {
      const n = NICHES.find(x => x.id === initialNiche);
      if (n) return { type: 'template', nicheId: initialNiche, label: n.label };
    }
    try {
      const stored = JSON.parse(localStorage.getItem('smq_last_form') || 'null');
      if (stored) return stored;
    } catch { /* ignore */ }
    // For New Call / Call Again flows always show a Continue option — default to first template
    if (effectiveInitialPhone || forceFillSelect) {
      const first = NICHES.find(n => n.id !== 'blank');
      if (first) return { type: 'template', nicheId: first.id, label: first.label };
    }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNiche, forceFillSelect, effectiveInitialPhone]);
  const continueNicheLabel = continueFormData?.label || null;

  // ── Phase renderers ───────────────────────────────────────────────────────

  if (phase === 'waiting') {
    return (
      <PageShell onHome={onHome} onBookDemo={onBookDemo} isViewer sessionCode={sessionCode}>
        <div className="flex-1 flex items-center justify-center bg-[#F7F7F5]">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="absolute inset-0 bg-green-500 rounded-full opacity-20 animate-ping" />
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <Eye className="w-7 h-7 text-white" />
              </div>
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Waiting for presenter…</h2>
            <p className="text-slate-500 text-sm">Session <span className="font-mono font-bold">{sessionCode}</span> — you'll be connected as soon as they start.</p>
            {!hasPusher && (
              <p className="mt-4 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Real-time sync (Pusher) is not configured — contact the presenter.
              </p>
            )}
          </div>
        </div>
      </PageShell>
    );
  }

  if (phase === 'landing') {
    return (
      <PageShell onHome={onHome} onBookDemo={onBookDemo} onDashboard={onGoToDashboard} overlay={<>{incomingCallModal}{notifBanner}</>}>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#F7F7F5]">
          <div className="w-full max-w-3xl">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-xs font-bold px-4 py-2 rounded-full border border-green-100 mb-5">
                Live interactive demo tool
              </span>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Choose your demo</h1>
              <p className="text-slate-500 text-base max-w-lg mx-auto">
                Two ways to show what Show My Quote does — both work live while your client watches from their browser.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Fill a Form — primary */}
              <button
                onClick={() => goToMode('fill')}
                className="text-left bg-white rounded-2xl border border-slate-200 p-7 hover:border-slate-400 hover:shadow-md transition-all group"
              >
                <h2 className="text-xl font-black text-slate-900 mb-3">Fill a Form</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-5">
                  Choose from a ready-made template or build your own form manually. Then roleplay a customer call — watch every field fill itself as you speak.
                </p>
                <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-600">
                  {['Pre-built templates per niche', 'Or build your own form', 'Live call fills all fields', 'Client sees it happening in real time'].map(t => (
                    <li key={t} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-900 group-hover:text-green-700 transition-colors">
                  Start <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              {/* Build a Form — secondary */}
              <button
                onClick={() => goToMode('build')}
                className="text-left px-5 py-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-white transition-all flex items-center justify-between group"
              >
                <div>
                  <span className="text-sm font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">Build a Form</span>
                  <span className="text-xs text-slate-400 ml-2">AI builds your intake form live from the call</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (phase === 'session-setup') {
    return (
      <PageShell onHome={onHome} onBookDemo={onBookDemo}>
        <div className="flex-1 flex items-center justify-center px-6 py-10 bg-[#F7F7F5]">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 mb-2">Share the link first</h2>
              <p className="text-slate-500 text-sm">Send this link to your client so they can watch the demo live from their browser.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Client view link</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 font-mono break-all">
                  {shareUrl}
                </div>
                <button
                  onClick={copyShare}
                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors flex-shrink-0
                    ${copied ? 'bg-green-100 text-green-700' : 'bg-slate-900 text-white hover:bg-slate-700'}`}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {!hasPusher && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <p className="text-amber-800 text-sm font-semibold mb-1">Pusher not configured</p>
                <p className="text-amber-700 text-xs leading-relaxed">
                  Add VITE_PUSHER_KEY + VITE_PUSHER_CLUSTER to your environment to enable real-time viewer sync. Until then, only you will see the live updates.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setPhase('landing'); phaseRef.current = 'landing'; }}
                className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={afterSessionSetup}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (phase === 'build-niche') {
    return (
      <PageShell onHome={onHome} onBookDemo={onBookDemo}>
        <div className="flex-1 overflow-y-auto bg-[#F7F7F5] px-6 py-10">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Step 1</p>
              <h2 className="text-2xl font-black text-slate-900 mb-2">What's your niche?</h2>
              <p className="text-slate-500 text-sm">Select your business type so we can tailor the AI's field detection and your follow-up SMS template.</p>
            </div>

            <div className="mb-6">
              <button
                onClick={() => selectNiche({ id: 'blank', label: null, seedFields: [], smsTemplate: '', promptHint: '' })}
                className="text-sm text-slate-400 hover:text-slate-700 underline underline-offset-4 transition-colors"
              >
                Skip — start with a blank form
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {NICHES.map(n => {
                const Icon = n.Icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => selectNiche(n)}
                    className="text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-900 hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-slate-900 transition-colors">
                      <Icon className="w-5 h-5 text-slate-700 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">{n.label}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{n.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  const getPreviewFields = (key) => {
    if (!key || key === 'blank') return [];
    if (key === 'continue') {
      if (!continueFormData) return [];
      if (continueFormData.type === 'template') return (TEMPLATE_FORMS[continueFormData.nicheId] || []).slice(0, 5);
      if (continueFormData.type === 'saved') return savedForms.find(f => f.id === continueFormData.formId)?.fields?.slice(0, 5) || [];
      return [];
    }
    if (key.startsWith('saved:')) {
      const id = key.slice(6);
      return savedForms.find(f => f.id === id)?.fields?.slice(0, 5) || [];
    }
    if (key.startsWith('template:')) {
      const nicheId = key.slice(9);
      return (TEMPLATE_FORMS[nicheId] || []).slice(0, 5);
    }
    return [];
  };

  const handleStartWithForm = () => {
    if (!selectedFormKey) return;
    if (selectedFormKey === 'continue') {
      if (!continueFormData) return;
      if (continueFormData.type === 'template') selectTemplate(continueFormData.nicheId);
      else if (continueFormData.type === 'saved') {
        const form = savedForms.find(f => f.id === continueFormData.formId);
        if (form) selectSavedForm(form);
      }
    } else if (selectedFormKey === 'blank') {
      // Start with no predefined fields — just go to dial
      setNiche(null); nicheRef.current = null;
      setFields([]); fieldsRef.current = [];
      setFVals({}); fvRef.current = {};
      setTx([]); txRef.current = [];
      setMenuChecked({}); menuCheckedRef.current = {};
      const phone = initPhoneRef.current || '';
      setDialNum(phone);
      const nextPhase = 'dial'; setPhase(nextPhase); phaseRef.current = nextPhase;
      broadcast({ phase: nextPhase, niche: null, fields: [], fieldValues: {}, transcript: [], ...(phone && { dialNumber: phone }) });
    } else if (selectedFormKey.startsWith('saved:')) {
      const id = selectedFormKey.slice(6);
      const form = savedForms.find(f => f.id === id);
      if (form) selectSavedForm(form);
    } else if (selectedFormKey.startsWith('template:')) {
      const nicheId = selectedFormKey.slice(9);
      selectTemplate(nicheId);
    }
  };

  if (phase === 'fill-select') {
    const previewFields = getPreviewFields(selectedFormKey);
    return (
      <PageShell onHome={onHome} onBookDemo={onBookDemo} onDashboard={onGoToDashboard}>
        <div className="flex-1 flex items-center justify-center bg-[#F7F7F5] px-6 py-10">
          <div className="w-full max-w-sm">
            {onEnterApp && (
              <button onClick={onEnterApp} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-6 transition-colors">
                ← Back to app
              </button>
            )}
            <div className="mb-6">
              {initPhoneRef.current && (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Calling {initPhoneRef.current}</p>
              )}
              <h2 className="text-xl font-bold text-slate-900">Choose a form</h2>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Form</label>
              <div className="relative">
                <select
                  value={selectedFormKey}
                  onChange={e => setSelectedFormKey(e.target.value)}
                  className="w-full appearance-none text-sm border border-slate-200 rounded-xl px-3 py-2.5 pr-8 bg-slate-50 focus:ring-2 focus:ring-slate-900 outline-none cursor-pointer text-slate-800"
                >
                  {continueNicheLabel && (
                    <option value="continue">Continue from last</option>
                  )}
                  <option value="blank">Build a form (blank)</option>
                  {savedForms.length > 0 && (
                    <optgroup label="Your saved forms">
                      {savedForms.map(f => (
                        <option key={f.id} value={`saved:${f.id}`}>{f.name}</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Templates">
                    {NICHES.filter(n => n.id !== 'custom').map(n => (
                      <option key={n.id} value={`template:${n.id}`}>{n.label}</option>
                    ))}
                  </optgroup>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {previewFields.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                  {previewFields.map(f => (
                    <div key={f.key} className="flex items-center gap-1.5 text-xs text-slate-400">
                      <div className="w-1 h-1 bg-slate-300 rounded-full flex-shrink-0" />
                      {f.label}
                    </div>
                  ))}
                  {(() => {
                    let total = 0;
                    if (selectedFormKey === 'continue' && continueFormData) {
                      if (continueFormData.type === 'template') total = (TEMPLATE_FORMS[continueFormData.nicheId] || []).length;
                      else if (continueFormData.type === 'saved') total = savedForms.find(f => f.id === continueFormData.formId)?.fields?.length || 0;
                    } else if (selectedFormKey.startsWith('saved:')) total = savedForms.find(f => f.id === selectedFormKey.slice(6))?.fields?.length || 0;
                    else if (selectedFormKey.startsWith('template:')) total = (TEMPLATE_FORMS[selectedFormKey.slice(9)] || []).length;
                    return total > 5 ? <div className="text-xs text-slate-300">+{total - 5} more fields</div> : null;
                  })()}
                </div>
              )}
            </div>

            <button
              onClick={handleStartWithForm}
              className="mt-4 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  // ── Dialpad phase ─────────────────────────────────────────────────────────
  if (phase === 'dial') {
    const KEYS = ['1','2','3','4','5','6','7','8','9','*','0','#'];
    const pressKey = (k) => {
      const next = dialNumber.length < 15 ? dialNumber + k : dialNumber;
      setDialNum(next);
      broadcast({ dialNumber: next });
    };
    const del = () => {
      const next = dialNumber.slice(0, -1);
      setDialNum(next);
      broadcast({ dialNumber: next });
    };

    const DEMO_CONTACTS = [
      { id: 'dc1', name: 'Mike Harris',         phone: '+1 (713) 555-0142', eventType: 'Full Replacement', initials: 'MH', color: 'bg-blue-100 text-blue-700' },
      { id: 'dc2', name: 'Michael Chen',       phone: '+44 7700 900456', eventType: 'Corporate', initials: 'MC', color: 'bg-blue-100 text-blue-700' },
      { id: 'dc3', name: 'Tom Bradley',        phone: '+1 (832) 555-0198', eventType: 'Roof Repair',     initials: 'TB', color: 'bg-amber-100 text-amber-700' },
      { id: 'dc4', name: 'Rivera Family',      phone: '+44 7700 900321', eventType: 'Birthday',  initials: 'RF', color: 'bg-orange-100 text-orange-700' },
      { id: 'dc5', name: 'TechCorp Inc.',       phone: '+44 7700 900654', eventType: 'Corporate', initials: 'TC', color: 'bg-green-100 text-green-700' },
      { id: 'dc6', name: 'Aisha Okafor',       phone: '+44 7700 900987', eventType: 'Birthday',  initials: 'AO', color: 'bg-yellow-100 text-yellow-700' },
    ];

    const filteredContacts = DEMO_CONTACTS.filter(c =>
      c.name.toLowerCase().includes(dialContactSearch.toLowerCase()) ||
      c.phone.includes(dialContactSearch) ||
      c.eventType.toLowerCase().includes(dialContactSearch.toLowerCase())
    );

    return (
      <PageShell onHome={onHome} onBookDemo={onBookDemo} isViewer={isViewer} sessionCode={sessionCode} onReset={!isViewer ? reset : undefined}>
        <div className="flex-1 flex flex-col items-center justify-center bg-[#F7F7F5] px-4 py-10 gap-4">

          {/* Context card */}
          <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3 flex items-center gap-2 shadow-sm">
            {niche?.Icon && <niche.Icon className="w-4 h-4 text-green-600" />}
            <span className="text-sm font-semibold text-slate-700">
              {mode === 'build' ? `Build form · ${niche?.label || 'Custom'}` : `Fill form · ${niche?.label || 'Custom'}`}
            </span>
          </div>

          {/* Dialpad card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-7 w-full max-w-[300px] shadow-sm">
            <h2 className="text-center text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Dial</h2>

            {/* Number display */}
            <div className="relative flex items-center justify-center min-h-[52px] mb-2">
              <span className="text-3xl font-light tracking-widest text-slate-900 text-center break-all px-8">
                {dialNumber || <span className="text-slate-300 text-lg font-normal">+44 xxx xxx xxxx</span>}
              </span>
              {dialNumber && (
                <button onClick={del} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xl transition-colors p-1">⌫</button>
              )}
            </div>

            {/* Paste + Contacts buttons */}
            {!isViewer && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <button
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      const digits = text.replace(/[^\d+]/g, '').slice(0, 15);
                      if (digits) { setDialNum(digits); broadcast({ dialNumber: digits }); }
                    } catch { setErr('Clipboard access denied'); setTimeout(() => setErr(null), 3000); }
                  }}
                  className="text-xs text-green-600 hover:text-green-700 font-medium border border-green-200 hover:border-green-400 bg-green-50 hover:bg-green-100 px-3 py-1 rounded-lg transition-colors"
                >
                  Paste number
                </button>
                <button
                  onClick={() => setDialContactsOpen(true)}
                  className="text-xs text-slate-600 hover:text-slate-800 font-medium border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 px-3 py-1 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Users className="w-3 h-3" /> Contacts
                </button>
              </div>
            )}

            {/* Keypad */}
            <div className={`grid grid-cols-3 gap-2.5 mb-5 ${isViewer ? 'pointer-events-none opacity-50' : ''}`}>
              {KEYS.map(k => (
                <button
                  key={k}
                  onClick={() => pressKey(k)}
                  className="h-14 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-xl font-semibold text-slate-800 transition-colors select-none"
                >
                  {k}
                </button>
              ))}
            </div>

            {/* Call button / viewer waiting */}
            {isViewer ? (
              <div className="w-full h-14 rounded-xl bg-slate-100 flex items-center justify-center gap-2 text-slate-400 text-sm font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" /> Waiting for presenter to dial…
              </div>
            ) : (
              <button
                onClick={() => dialNumber && startCall(dialNumber)}
                disabled={!dialNumber}
                className="w-full h-14 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-white font-bold text-base transition-colors"
              >
                <Phone className="w-5 h-5" /> Call
              </button>
            )}

            {/* Skip / mic-only (presenter only) */}
            {!isViewer && (
              <button
                onClick={() => startCall('')}
                className="w-full mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
              >
                Skip — use mic only (no outbound call)
              </button>
            )}
          </div>

        </div>

        {/* ── Contacts bottom sheet ── */}
        {dialContactsOpen && (
          <>
            <div
              className="fixed inset-0 z-[60] bg-black/40"
              onClick={() => { setDialContactsOpen(false); setDialContactSearch(''); }}
            />
            <div className="fixed bottom-0 left-0 right-0 z-[61] bg-white rounded-t-2xl shadow-2xl flex flex-col" style={{ maxHeight: '70vh' }}>
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-8 h-1 bg-slate-200 rounded-full" />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
                <span className="font-semibold text-slate-900 text-sm">Contacts</span>
                <button
                  onClick={() => { setDialContactsOpen(false); setDialContactSearch(''); }}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Search */}
              <div className="px-4 py-3 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    autoFocus
                    value={dialContactSearch}
                    onChange={e => setDialContactSearch(e.target.value)}
                    placeholder="Search contacts…"
                    className="w-full pl-8 pr-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
              {/* List */}
              <div className="overflow-y-auto flex-1 px-3 pb-6">
                {filteredContacts.length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-8">No contacts found</p>
                )}
                {filteredContacts.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setDialNum(c.phone);
                      broadcast({ dialNumber: c.phone });
                      setDialContactsOpen(false);
                      setDialContactSearch('');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${c.color}`}>
                      {c.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{c.name}</div>
                      <div className="text-xs text-slate-400 truncate">{c.phone} · {c.eventType}</div>
                    </div>
                    <Phone className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </PageShell>
    );
  }

  if (phase === 'call') {
    // If viewer and presenter hasn't started call yet, show waiting
    if (isViewer && !callActive && transcript.length === 0) {
      return (
        <PageShell onHome={onHome} onBookDemo={onBookDemo} isViewer sessionCode={sessionCode}>
          <div className="flex-1 flex items-center justify-center bg-[#F7F7F5]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
              <p className="text-slate-600 font-semibold">Presenter is setting up the call…</p>
              <p className="text-slate-400 text-sm mt-1">You'll see the live transcript as soon as it starts.</p>
            </div>
          </div>
        </PageShell>
      );
    }

    if (!callActive && !isViewer) {
      // Start call screen
      return (
        <PageShell onHome={onHome} onBookDemo={onBookDemo} onReset={reset}>
          <div className="flex-1 flex items-center justify-center bg-[#F7F7F5]">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <PhoneCall className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Ready to start</h2>
              <p className="text-slate-500 text-sm mb-6">
                {mode === 'build'
                  ? `Form will build itself as you chat — niche: ${niche?.label}`
                  : `${fields.length} fields ready to fill`}
              </p>
              <button
                onClick={() => startCall(effectiveInitialPhone || '')}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold text-sm transition-colors shadow-md mx-auto"
              >
                <Phone className="w-4 h-4" /> Start Call
              </button>
            </div>
          </div>
        </PageShell>
      );
    }

    // Live quote total for header — roofing niche only for now
    let callQuoteTotal = null;
    if (niche?.id === 'roof-replacement' && Object.keys(menuChecked).length > 0) {
      let pp = 0;
      Object.keys(menuChecked).forEach(key => {
        const item = DEOSA_ALL_ITEMS.find(i => i.key === key);
        if (item) pp += priceOverrides[item.key] !== undefined ? priceOverrides[item.key] : item.price;
      });
      if (pp > 0) {
        const guestField = fields.find(fl => fl.label.toLowerCase().includes('guest'));
        const guestCount = parseInt((guestField ? fieldValues[guestField.key] : 0) || 0) || 0;
        callQuoteTotal = guestCount > 0
          ? { text: `£${(pp * guestCount).toLocaleString()}`, sub: `${guestCount} guests` }
          : { text: `£${pp}pp`, sub: 'per person' };
      }
    }

    return (
      <PageShell onHome={onHome} onBookDemo={onBookDemo} isViewer={isViewer} sessionCode={sessionCode} onReset={!isViewer ? reset : undefined} quoteTotal={callQuoteTotal} overlay={<>{incomingCallModal}{notifBanner}</>}>
        {renderCallScreen()}
      </PageShell>
    );
  }

  if (phase === 'done') {
    const filledCount = fields.filter(f => fieldValues[f.key] !== undefined && fieldValues[f.key] !== '').length;

    return (
      <PageShell onHome={onHome} onBookDemo={onBookDemo} isViewer={isViewer} sessionCode={sessionCode} onReset={!isViewer ? reset : undefined} onDashboard={!isViewer ? onGoToDashboard : undefined} overlay={<>{incomingCallModal}{notifBanner}</>}>
        <div className="flex-1 overflow-y-auto bg-[#F7F7F5] px-6 py-10">
          <div className="max-w-2xl mx-auto">

            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">
                {mode === 'build' ? 'Form built from the call' : 'Form filled from the call'}
              </h2>
              <p className="text-slate-500 text-sm">
                {mode === 'build'
                  ? `${fields.length} fields extracted · ${filledCount} values captured — zero typing.`
                  : `${filledCount} of ${fields.length} fields filled — entirely from the call.`}
              </p>
            </div>

            {/* AI Analysing spinner */}
            {analysing && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-green-500 animate-spin flex-shrink-0" />
                <div>
                  <div className="text-sm font-bold text-slate-700">AI is analysing your call…</div>
                  <div className="text-xs text-slate-400 mt-0.5">Generating summary, SMS, follow-up email and invoice</div>
                </div>
              </div>
            )}

            {/* AI Summary */}
            {analysis?.summary && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-bold text-slate-700">AI Call Summary</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{analysis.summary}</p>
              </div>
            )}

            {/* Quote / Invoice */}
            {(() => {
              // Build line items — for catering use exact menu data, for others use AI quote
              let lineItems = [];
              let isExact = false;

              if (niche?.id === 'roof-replacement' && Object.keys(menuChecked).length > 0) {
                // Exact pricing from live menu checklist
                isExact = true;
                DEOSA_MENU.forEach(cg => {
                  cg.sections.forEach(section => {
                    section.items.filter(i => menuChecked[i.key]).forEach(item => {
                      const basePrice = section.price;
                      const effectivePrice = priceOverrides[item.key] !== undefined ? priceOverrides[item.key] : basePrice;
                      lineItems.push({
                        itemKey: item.key,
                        description: item.name,
                        note: `${cg.cuisine} · ${section.name}`,
                        qty: 1,
                        unitPrice: effectivePrice,
                        basePrice,
                        perPerson: true,
                      });
                    });
                  });
                });
              } else if (analysis?.quote?.lineItems?.length > 0) {
                lineItems = analysis.quote.lineItems.map((li, idx) => ({
                  itemKey: `ai_${idx}`,
                  description: li.description,
                  note: li.note || null,
                  qty: li.qty || 1,
                  unitPrice: priceOverrides[`ai_${idx}`] !== undefined ? priceOverrides[`ai_${idx}`] : (li.unitPrice || 0),
                  basePrice: li.unitPrice || 0,
                  perPerson: false,
                }));
              }

              if (!lineItems.length && !analysing) return null;
              if (!lineItems.length && analysing) return null;

              // Compute totals
              const guestField = fields.find(fl => fl.label.toLowerCase().includes('guest') && !fl.label.toLowerCase().includes('children'));
              const guestCount = parseInt((guestField ? fieldValues[guestField.key] : 0) || 0) || 0;

              let subtotal = 0;
              lineItems.forEach(li => {
                subtotal += li.perPerson
                  ? li.unitPrice * (guestCount || 1)
                  : li.qty * li.unitPrice;
              });

              // Grab event details from fieldValues
              const eventDateField = fields.find(fl => fl.label.toLowerCase().includes('date'));
              const venueField = fields.find(fl => fl.label.toLowerCase().includes('venue'));
              const eventDate = eventDateField ? fieldValues[eventDateField.key] : null;
              const venue = venueField ? fieldValues[venueField.key] : null;

              // Quote ref — simple incrementing based on session code
              const quoteRef = `SMQ-${(sessionCode || 'DEMO').slice(0, 6)}`;
              const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

              return (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-5">
                  {/* Quote header */}
                  <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-green-600" />
                        <h3 className="text-sm font-bold text-slate-700">
                          {isExact ? 'Quote Estimate' : 'Quote Estimate'}
                        </h3>
                        {isExact && (
                          <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Exact pricing</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">{quoteRef} · {today}</div>
                    </div>
                    {subtotal > 0 && (
                      <div className="text-right">
                        <div className="text-xl font-black text-green-600">
                          £{subtotal.toLocaleString()}
                        </div>
                        {isExact && guestCount > 0 && (
                          <div className="text-[10px] text-slate-400">{guestCount} guests</div>
                        )}
                        {isExact && !guestCount && (
                          <div className="text-[10px] text-slate-400">+ guest count for total</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Event details strip */}
                  {(eventDate || venue || (guestCount > 0)) && (
                    <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4">
                      {eventDate && (
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Event date</div>
                          <div className="text-xs font-semibold text-slate-700">{String(eventDate)}</div>
                        </div>
                      )}
                      {venue && (
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Location</div>
                          <div className="text-xs font-semibold text-slate-700">{String(venue)}</div>
                        </div>
                      )}
                      {guestCount > 0 && (
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Guests</div>
                          <div className="text-xs font-semibold text-slate-700">{guestCount}</div>
                        </div>
                      )}
                      {niche?.label && (
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Service</div>
                          <div className="text-xs font-semibold text-slate-700">{niche.label}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Line items */}
                  <div className="divide-y divide-slate-100">
                    {lineItems.map((li, i) => {
                      const lineTotal = li.perPerson
                        ? li.unitPrice * (guestCount || 1)
                        : li.qty * li.unitPrice;
                      return (
                        <div key={i} className="px-6 py-3 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-slate-800">{li.description}</div>
                            {li.note && <div className="text-[10px] text-slate-400 mt-0.5">{li.note}</div>}
                            {!li.perPerson && (
                              <div className="flex items-center gap-1 mt-0.5">
                                {li.qty > 1 && <span className="text-[10px] text-slate-400">{li.qty} ×</span>}
                                <span className="text-[10px] text-slate-400">£</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={li.unitPrice}
                                  onChange={e => setPriceOverrides(prev => ({ ...prev, [li.itemKey]: parseFloat(e.target.value) || 0 }))}
                                  className="w-16 text-[10px] text-slate-600 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                />
                                {li.basePrice !== li.unitPrice && (
                                  <button onClick={() => setPriceOverrides(prev => { const n = { ...prev }; delete n[li.itemKey]; return n; })}
                                    className="text-[10px] text-slate-400 hover:text-red-500 ml-1">reset</button>
                                )}
                              </div>
                            )}
                            {li.perPerson && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] text-slate-400">£</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={li.unitPrice}
                                  onChange={e => setPriceOverrides(prev => ({ ...prev, [li.itemKey]: parseFloat(e.target.value) || 0 }))}
                                  className="w-16 text-[10px] text-slate-600 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-green-400 focus:border-green-400"
                                />
                                <span className="text-[10px] text-slate-400">pp{guestCount > 0 ? ` × ${guestCount} guests` : ''}</span>
                                {li.basePrice !== li.unitPrice && (
                                  <button onClick={() => setPriceOverrides(prev => { const n = { ...prev }; delete n[li.itemKey]; return n; })}
                                    className="text-[10px] text-slate-400 hover:text-red-500 ml-1">reset</button>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-sm font-bold text-slate-900 ml-4 flex-shrink-0">
                            {guestCount > 0 || !li.perPerson
                              ? `£${lineTotal.toLocaleString()}`
                              : `£${li.unitPrice}pp`}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total row */}
                  {subtotal > 0 && (
                    <div className="px-6 py-4 border-t-2 border-slate-900 flex items-center justify-between">
                      <div className="text-sm font-bold text-slate-900">
                        {isExact ? 'Total estimate' : 'Total estimate'}
                      </div>
                      <div className="text-lg font-black text-slate-900">£{subtotal.toLocaleString()}</div>
                    </div>
                  )}

                  {/* Footer note */}
                  <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
                    <div className="text-[10px] text-slate-400">
                      {isExact
                        ? `Prices based on quoted materials. Final quote subject to site survey confirmation.`
                        : `Estimate based on call discussion. Final quote subject to written confirmation.`}
                    </div>
                    {!guestCount && isExact && (
                      <div className="text-[10px] text-amber-500 mt-1">
                        Guest count not captured — totals shown per person. Edit captured data above to add guest count.
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Captured form data */}
            {fields.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-700">Captured data</h3>
                  {!isViewer && (
                    editingData ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setFields(editFields);
                            const newFV = {};
                            editFields.forEach(f => {
                              if (editValues[f.key] !== undefined) newFV[f.key] = editValues[f.key];
                            });
                            setFVals(newFV);
                            setEditData(false);
                          }}
                          className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditData(false)}
                          className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                          {filledCount}/{fields.length} filled
                        </span>
                        <button
                          onClick={() => { setEF(fields.map(f => ({ ...f }))); setEV({ ...fieldValues }); setEditData(true); }}
                          className="text-xs text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      </div>
                    )
                  )}
                  {isViewer && (
                    <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                      {filledCount}/{fields.length} filled
                    </span>
                  )}
                </div>

                {editingData ? (
                  <div className="space-y-2">
                    {editFields.map((f, i) => (
                      <div key={f.key} className="flex items-center gap-2">
                        <input
                          value={f.label}
                          onChange={e => setEF(prev => prev.map((ef, j) => j === i ? { ...ef, label: e.target.value } : ef))}
                          placeholder="Field name"
                          className="w-32 flex-shrink-0 px-2 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-slate-900"
                        />
                        <input
                          value={editValues[f.key] || ''}
                          onChange={e => setEV(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder="Value"
                          className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-slate-900"
                        />
                        <button
                          onClick={() => { setEF(prev => prev.filter((_, j) => j !== i)); setEV(prev => { const n = { ...prev }; delete n[f.key]; return n; }); }}
                          className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => { const key = `custom_${Date.now()}`; setEF(prev => [...prev, { key, label: '', type: 'text' }]); }}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-green-600 transition-colors mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add field
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fields.map(f => (
                      <div key={f.key} className="flex items-start gap-3">
                        <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center ${
                          fieldValues[f.key] ? 'bg-green-500' : 'bg-slate-200'
                        }`}>
                          {fieldValues[f.key] && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{f.label}</div>
                          <div className="text-sm text-slate-800 mt-0.5">
                            {fieldValues[f.key] !== undefined && fieldValues[f.key] !== ''
                              ? String(fieldValues[f.key])
                              : <span className="text-slate-300 italic">Not captured</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Full transcript */}
            {transcript.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 mb-5 overflow-hidden">
                <button
                  onClick={() => setShowTx(s => !s)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-bold text-slate-700">Full transcript</span>
                    <span className="text-xs text-slate-400">({transcript.length} lines)</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showTranscript ? 'rotate-180' : ''}`} />
                </button>
                {showTranscript && (
                  <div className="border-t border-slate-100 px-6 py-4 max-h-80 overflow-y-auto space-y-2">
                    {transcript.map((line, i) => (
                      <div key={i} className={`flex items-start gap-2 ${line.speaker === 'You' ? 'flex-row-reverse' : ''}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider flex-shrink-0 mt-1.5 ${
                          line.speaker === 'You' ? 'text-green-600' : 'text-slate-400'
                        }`}>{line.speaker}</span>
                        <p className={`text-xs leading-relaxed rounded-xl px-3 py-2 max-w-[80%] ${
                          line.speaker === 'You' ? 'bg-green-50 text-green-900' : 'bg-slate-100 text-slate-700'
                        }`}>{line.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SMS */}
            {analysis?.sms && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-700">Ready-to-send SMS</h3>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed mb-3">
                  {analysis.sms}
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => navigator.clipboard.writeText(analysis.sms)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy SMS
                  </button>
                  {activeCallPhone && (
                    <button
                      onClick={() => sendSms(analysis.sms)}
                      disabled={smsSending || smsSent}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                        smsSent
                          ? 'text-green-600'
                          : smsSending
                          ? 'text-slate-400 cursor-wait'
                          : 'text-green-700 hover:text-green-900'
                      }`}
                    >
                      {smsSent ? (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Sent</>
                      ) : smsSending ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                      ) : (
                        <><Send className="w-3.5 h-3.5" /> Send to {activeCallPhone}</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Email */}
            {analysis?.email && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-700">Follow-up email draft</h3>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</div>
                <div className="text-sm text-slate-800 font-semibold mb-3">{analysis.email.subject}</div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-3 max-h-56 overflow-y-auto">
                  {analysis.email.body}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(`Subject: ${analysis.email.subject}\n\n${analysis.email.body}`)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy email
                </button>
              </div>
            )}


            {/* Recording — presenter */}
            {recordingUrl && !isViewer && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Play className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-700">Call recording</h3>
                </div>
                <audio controls src={recordingUrl} className="w-full" />
              </div>
            )}

            {/* Recording — viewer */}
            {isViewer && hasRec && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5 flex items-center gap-3">
                <Play className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <div className="text-sm font-bold text-slate-700">Call recording</div>
                  <div className="text-xs text-slate-400 mt-0.5">Saved on presenter's device — ask them to share it with you</div>
                </div>
              </div>
            )}

            {/* Save form as template */}
            {!isViewer && fields.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
                <div className="flex items-center gap-2 mb-4">
                  <Bookmark className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-700">Save this form as a template</h3>
                </div>
                {formSaved ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 font-semibold">
                    <Check className="w-4 h-4" />
                    Saved! Select it next time from "Fill a Form" → your saved forms.
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 mb-3">
                      <input
                        value={saveName}
                        onChange={e => setSaveName(e.target.value)}
                        placeholder={niche?.label ? `${niche.label} Form` : 'My Form'}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                      />
                      <button
                        onClick={saveForm}
                        className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">Saves the field structure so you can reuse it on future calls.</p>
                  </>
                )}
              </div>
            )}

            {/* Enter dashboard */}
            {!isViewer && onEnterApp && (
              <button
                onClick={onEnterApp}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-4 rounded-2xl text-sm font-bold hover:bg-green-700 transition-colors mb-4 shadow-sm"
              >
                <LayoutGrid className="w-4 h-4" />
                Explore the full dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {/* CTA */}
            <div className="bg-slate-900 rounded-2xl p-6 text-center mb-4">
              <h3 className="text-white font-black text-lg mb-2">Want this in your business?</h3>
              <p className="text-slate-400 text-sm mb-5">Book a 15-minute call — we'll set it up with your real questions and pricing.</p>
              <button
                onClick={onBookDemo}
                className="w-full py-3 bg-white text-slate-900 text-sm font-bold rounded-xl hover:bg-slate-100 transition-colors"
              >
                Book a free demo
              </button>
            </div>

            {!isViewer && (
              <div className="flex justify-center">
                <button onClick={reset} className="text-sm text-slate-400 hover:text-slate-700 transition-colors underline underline-offset-2">
                  ↺ New demo
                </button>
              </div>
            )}
          </div>
        </div>
      </PageShell>
    );
  }

  // Fallback for viewer receiving partial state mid-session
  return (
    <PageShell onHome={onHome} onBookDemo={onBookDemo} isViewer={isViewer} sessionCode={sessionCode} onReset={!isViewer ? reset : undefined}>
      <div className="flex-1 flex items-center justify-center bg-[#F7F7F5]">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    </PageShell>
  );
}

// ── Page shell (nav + viewer banner) ─────────────────────────────────────────

function PageShell({ children, onHome, onBookDemo, isViewer, sessionCode, onReset, quoteTotal, overlay, onDashboard }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Hidden container for SignalWire audio-only WebRTC calls */}
      <div id="sw-media" style={{ display: 'none' }} />
      {/* Viewer banner */}
      {isViewer && (
        <div className="flex-shrink-0 bg-slate-900 px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-slate-300 font-medium">Watching live demo</span>
            {sessionCode && (
              <span className="text-xs text-slate-500 font-mono bg-slate-800 px-2 py-0.5 rounded">
                Session {sessionCode}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500">Show My Quote</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-shrink-0 flex items-center justify-between px-6 md:px-10 py-4 border-b border-slate-100 bg-white">
        <button onClick={onHome}>
          <img src="/logo.svg" alt="Show My Quote" className="h-12 w-auto" />
        </button>
        <div className="flex items-center gap-3">
          {!isViewer && onReset && (
            <button
              onClick={onReset}
              className="hidden md:flex items-center gap-1.5 px-4 py-2 text-sm text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-400 rounded-full transition-colors"
            >
              ↺ New demo
            </button>
          )}
          {!isViewer && onDashboard && (
            <button onClick={onDashboard} className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
              Dashboard →
            </button>
          )}
          {!isViewer && (
            <button onClick={onHome} className="hidden md:inline-flex px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Back to site
            </button>
          )}
          {quoteTotal && (
            <div className="flex flex-col items-end px-5 py-2 bg-green-600 text-white rounded-full shadow-md transition-all duration-300">
              <span className="text-lg font-black leading-tight">{quoteTotal.text}</span>
              <span className="text-[10px] font-medium opacity-75 leading-tight">{quoteTotal.sub}</span>
            </div>
          )}
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
        {children}
      </div>

      {/* Overlay (e.g. incoming call modal) */}
      {overlay}
    </div>
  );
}
