import React, { useState, useRef, useEffect, useCallback } from 'react';
import Pusher from 'pusher-js';
import {
  Phone, PhoneCall, PhoneOff, Mic, MicOff, Radio, Check, CheckCircle2,
  Copy, Plus, Trash2, X, ArrowRight, ChevronRight, MessageSquare,
  LayoutGrid, Eye, Link2, Loader2, Camera, Utensils, Building2,
  Flower2, Calendar, Music, Wand2, ClipboardList, Play, Mail, FileText, Sparkles,
} from 'lucide-react';
import { suggestField, fillFields } from './openaiHelper.js';

// ── Niche configuration ───────────────────────────────────────────────────────

const NICHES = [
  {
    id: 'wedding-photography',
    label: 'Wedding Photography',
    Icon: Camera,
    desc: 'Dates, venues, coverage type, packages, add-ons',
    seedFields: ['Event Date', 'Venue Name', 'Coverage Type', 'Guest Count', 'Package'],
    smsTemplate: "Hi {name}! Great speaking with you. I'll get your photography quote for {date} at {venue} across to you today. Looking forward to capturing your day!",
    promptHint: 'Wedding photography enquiry. Extract: event date, venue name/location, coverage type (ceremony only / ceremony+reception / full day), second shooter needed (yes/no), film or cinematic add-on, guest count, package tier (e.g. bronze/silver/gold/platinum), drone coverage, golden hour session, special requests.',
  },
  {
    id: 'wedding-catering',
    label: 'Wedding Catering',
    Icon: Utensils,
    desc: 'Guest count, service style, dietary needs, bar',
    seedFields: ['Event Date', 'Venue', 'Guest Count', 'Service Style', 'Bar Package'],
    smsTemplate: "Hi {name}! Lovely speaking with you. Your catering quote for {date} covering {guests} guests will be with you shortly. Excited to be part of your day!",
    promptHint: 'Wedding catering enquiry. Extract: event date, venue, guest count (adults + children separately), service style (plated sit-down / buffet / canapés / family style), dietary requirements (allergies, vegan, halal, gluten-free), bar package (open bar / wine & beer / soft drinks / no bar), evening food, setup and breakdown timing, budget range.',
  },
  {
    id: 'wedding-venue',
    label: 'Wedding Venue',
    Icon: Building2,
    desc: 'Capacity, packages, ceremony type, accommodation',
    seedFields: ['Event Date', 'Guest Count', 'Package', 'Ceremony Type', 'Bedrooms Needed'],
    smsTemplate: "Hi {name}! Wonderful chatting. I'll put your venue package together for {date} and send everything over today. We'd love to host your big day!",
    promptHint: 'Wedding venue enquiry. Extract: event date, guest count (day / evening separately), venue package or hire option, ceremony type (civil ceremony / blessing / reception only), exclusive use or shared, bar package, catering (in-house or external), bedrooms/accommodation, honeymoon suite, budget.',
  },
  {
    id: 'florist-styling',
    label: 'Floral & Styling',
    Icon: Flower2,
    desc: 'Bridal party, arrangements, centrepieces, delivery',
    seedFields: ['Event Date', 'Venue', 'Bridal Party Size', 'Arrangements', 'Delivery & Setup'],
    smsTemplate: "Hi {name}! So exciting to be planning your florals. I'll get your quote together for {date} at {venue} — bouquets, arrangements and everything in between. Speak soon!",
    promptHint: 'Wedding florist/styling enquiry. Extract: event date, venue, bridal party size (number of bridesmaids, groomsmen), bridal bouquet style, ceremony arch or backdrop, aisle flowers, pew ends, table centrepiece count and style, additional items (flower girl, button holes, cake flowers), delivery and setup time.',
  },
  {
    id: 'wedding-planning',
    label: 'Wedding Planning',
    Icon: Calendar,
    desc: 'Planning tier, guest list, suppliers, theme',
    seedFields: ['Event Date', 'Guest Count', 'Venue', 'Planning Tier', 'Budget Range'],
    smsTemplate: "Hi {name}! Loved hearing about your plans. I'll put your planning package together for {date} and send it across shortly. Can't wait to start!",
    promptHint: 'Wedding planning enquiry. Extract: event date, guest count, venue (confirmed or still searching), planning tier (full planning / partial planning / day-of coordination), suppliers already booked, budget range, wedding style or theme, key priorities or challenges.',
  },
  {
    id: 'entertainment',
    label: 'Entertainment & Music',
    Icon: Music,
    desc: 'Act type, sets, DJ hours, PA, travel distance',
    seedFields: ['Event Date', 'Venue', 'Act Type', 'Performance Duration', 'Guest Count'],
    smsTemplate: "Hi {name}! Great to chat. Your entertainment quote for {date} at {venue} — sets, DJ and travel — will be with you shortly. Can't wait to perform!",
    promptHint: 'Entertainment/music enquiry. Extract: event date, venue, act type (live band / DJ / both), number of band members, performance sets and durations, DJ hours, PA and sound system required, lighting rig, travel distance or location, accommodation needed, guest count for sizing.',
  },
  {
    id: 'custom',
    label: 'Other / Custom',
    Icon: LayoutGrid,
    desc: 'Any wedding or events business niche',
    seedFields: [],
    smsTemplate: "Hi {name}! Great speaking with you. I'll get your quote together and send it across shortly. Looking forward to working with you!",
    promptHint: 'General wedding/events vendor enquiry. Extract all relevant details the client mentions: event date, venue, guest count, specific service requirements, budget range, and any special requests.',
  },
];

// ── Template forms (one per niche) ───────────────────────────────────────────

const TEMPLATE_FORMS = {
  'wedding-photography': [
    { key: 'date',     label: 'Event Date',       type: 'date' },
    { key: 'venue',    label: 'Venue Name',        type: 'text' },
    { key: 'coverage', label: 'Coverage Required', type: 'select', options: ['Ceremony Only', 'Ceremony + Reception', 'Full Day'] },
    { key: 'guests',   label: 'Guest Count',       type: 'number' },
    { key: 'shooter2', label: 'Second Shooter',    type: 'toggle' },
    { key: 'film',     label: 'Film / Cinematic Add-on', type: 'toggle' },
    { key: 'budget',   label: 'Budget Range',      type: 'text' },
    { key: 'requests', label: 'Special Requests',  type: 'long-text' },
  ],
  'wedding-catering': [
    { key: 'date',     label: 'Event Date',             type: 'date' },
    { key: 'venue',    label: 'Venue',                  type: 'text' },
    { key: 'guests',   label: 'Guest Count (Adults)',   type: 'number' },
    { key: 'children', label: 'Children Attending',     type: 'number' },
    { key: 'style',    label: 'Service Style',          type: 'select', options: ['Plated Sit-down', 'Buffet', 'Canapés', 'Family Style'] },
    { key: 'dietary',  label: 'Dietary Requirements',   type: 'long-text' },
    { key: 'bar',      label: 'Bar Package',            type: 'select', options: ['Open Bar', 'Wine & Beer', 'Soft Drinks Only', 'No Bar'] },
    { key: 'evening',  label: 'Evening Food',           type: 'text' },
  ],
  'wedding-venue': [
    { key: 'date',     label: 'Event Date',     type: 'date' },
    { key: 'guests',   label: 'Day Guests',     type: 'number' },
    { key: 'evening',  label: 'Evening Guests', type: 'number' },
    { key: 'package',  label: 'Package',        type: 'select', options: ['Bronze', 'Silver', 'Gold', 'Exclusive Use'] },
    { key: 'ceremony', label: 'Ceremony Type',  type: 'select', options: ['Civil Ceremony', 'Blessing', 'Reception Only'] },
    { key: 'bar',      label: 'Bar Package',    type: 'text' },
    { key: 'rooms',    label: 'Bedrooms Needed',type: 'number' },
    { key: 'budget',   label: 'Budget',         type: 'text' },
  ],
  'florist-styling': [
    { key: 'date',        label: 'Event Date',             type: 'date' },
    { key: 'venue',       label: 'Venue',                  type: 'text' },
    { key: 'bridesmaids', label: 'Bridesmaids Count',      type: 'number' },
    { key: 'bouquet',     label: 'Bridal Bouquet Style',   type: 'text' },
    { key: 'arch',        label: 'Ceremony Arch / Backdrop', type: 'toggle' },
    { key: 'tables',      label: 'Table Centrepieces',     type: 'number' },
    { key: 'pews',        label: 'Pew Ends / Aisle Decor', type: 'toggle' },
    { key: 'delivery',    label: 'Delivery & Setup Time',  type: 'text' },
  ],
  'wedding-planning': [
    { key: 'date',      label: 'Event Date',       type: 'date' },
    { key: 'guests',    label: 'Guest Count',      type: 'number' },
    { key: 'venue',     label: 'Venue',            type: 'text' },
    { key: 'tier',      label: 'Planning Tier',   type: 'select', options: ['Full Planning', 'Partial Planning', 'Day-of Coordination'] },
    { key: 'suppliers', label: 'Suppliers Booked',type: 'number' },
    { key: 'budget',    label: 'Budget Range',     type: 'text' },
    { key: 'theme',     label: 'Style / Theme',    type: 'text' },
  ],
  'entertainment': [
    { key: 'date',    label: 'Event Date',            type: 'date' },
    { key: 'venue',   label: 'Venue',                 type: 'text' },
    { key: 'act',     label: 'Act Type',              type: 'select', options: ['Band Only', 'DJ Only', 'Band + DJ'] },
    { key: 'sets',    label: 'Performance Sets',      type: 'text' },
    { key: 'djhours', label: 'DJ Hours',              type: 'number' },
    { key: 'pa',      label: 'PA / Sound Required',   type: 'toggle' },
    { key: 'travel',  label: 'Travel Distance (mi)',  type: 'number' },
    { key: 'guests',  label: 'Guest Count',           type: 'number' },
  ],
};

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

export default function DemoPage({ onHome, onBookDemo }) {
  // ── Detect viewer mode ──
  const params = new URLSearchParams(window.location.search);
  const watchCode = params.get('watch');
  const isViewer = !!watchCode;

  // ── Pusher config ──
  const PUSHER_KEY     = import.meta.env.VITE_PUSHER_KEY;
  const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER;
  const hasPusher = !!PUSHER_KEY;

  // ── Phase state ──
  const [phase, setPhase] = useState(isViewer ? 'waiting' : 'landing');
  const [mode,  setMode]  = useState(null); // 'build' | 'fill'
  const [sessionCode, setCode] = useState(isViewer ? watchCode : null);

  // ── Call data ──
  const [niche,       setNiche]  = useState(null);
  const [fields,      setFields] = useState([]);
  const [fieldValues, setFVals]  = useState({});
  const [transcript,  setTx]     = useState([]);
  const [callActive,  setCA]     = useState(false);
  const [callSeconds, setCS]     = useState(0);
  const [recordingUrl, setRec]   = useState(null);

  // ── Call controls ──
  const [micActive,   setMic]     = useState(false);
  const [interimText, setInterim] = useState('');
  const [aiThinking,  setAIT]     = useState(false);
  const [apiError,    setErr]     = useState(null);
  const [showTypeMode,setTypeMode]= useState(false);
  const [lineText,    setLT]      = useState('');
  const [lineSpeaker, setLS]      = useState('Client');
  const [lastAdded,   setLA]      = useState(null);
  const [lastFilled,  setLF]      = useState(null);

  // ── Manual builder ──
  const [manualFields, setMF]  = useState([]);
  const [addingManual, setAM]  = useState(false);
  const [manualLabel,  setML]  = useState('');
  const [manualType,   setMT]  = useState('text');

  // ── Share ──
  const [copied, setCopied] = useState(false);

  // ── Dialpad ──
  const [dialNumber, setDialNum] = useState('');

  // ── Post-call analysis ──
  const [analysis,  setAnalysis]  = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [hasRec,    setHasRec]    = useState(false);

  // ── Refs ──
  const phaseRef        = useRef(phase);
  const modeRef         = useRef(null);
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
  const timerRef        = useRef(null);
  const mediaRecRef     = useRef(null);
  const recChunksRef    = useRef([]);
  const txDivRef        = useRef(null);
  const onLineRef       = useRef(null);
  const heartbeatRef    = useRef(null);
  const twilioDeviceRef   = useRef(null);
  const twilioCallRef     = useRef(null);
  const whisperIntervalRef  = useRef(null);
  const whisperHeaderRef    = useRef(null);
  const transcriptPusherRef = useRef(null); // Twilio Real-Time Transcription Pusher subscription

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

  // Call timer
  useEffect(() => {
    if (callActive) timerRef.current = setInterval(() => setCS(s => s + 1), 1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [callActive]);

  // Cleanup on unmount
  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearTimeout(bufTimerRef.current);
    stopMic();
  }, []);

  // ── Pusher — viewer subscription ──────────────────────────────────────────
  useEffect(() => {
    if (!sessionCode || !hasPusher || !isViewer) return;
    const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
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
      await fetch('/api/demo-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionCode: scRef.current, event: 'state-update', data }),
      });
    } catch { /* ignore broadcast errors */ }
  }, [isViewer, hasPusher]);

  // ── AI transcript handler ─────────────────────────────────────────────────
  const onTranscriptLine = useCallback(async (speaker, text, skipAdd = false) => {
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
          aiPendingRef.current -= 1;
          if (aiPendingRef.current === 0) setAIT(false);
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

      if (modeRef.current === 'fill' && speaker === 'Client') {
        const ctx = txRef.current.slice(-4);
        const res = await fillFields(text, fieldsRef.current, ctx);
        if (res.fills?.length) {
          setFVals(prev => {
            const next = { ...prev };
            res.fills.forEach(({ key, value }) => { next[key] = value; });
            fvRef.current = next;
            broadcast({ fieldValues: next, transcript: txRef.current });
            return next;
          });
          const lastKey = res.fills[res.fills.length - 1]?.key;
          if (lastKey) {
            setLF(lastKey);
            setTimeout(() => setLF(k => k === lastKey ? null : k), 1800);
          }
        } else {
          broadcast({ transcript: txRef.current });
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
      r.lang = 'en-GB';
      r.onresult = e => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            setInterim('');
            onLineRef.current(lsRef.current, t.trim());
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

  // ── Call lifecycle ────────────────────────────────────────────────────────
  const startCall = async (phoneNumber = '') => {
    // Transition to call phase
    const cp = 'call'; setPhase(cp); phaseRef.current = cp;
    broadcast({ phase: cp });
    setCA(true); caRef.current = true;
    setCS(0);
    // Heartbeat — keeps viewer in sync every 2.5s
    heartbeatRef.current = setInterval(() => broadcast({}), 2500);

    // Connect via Twilio if a number was provided
    if (phoneNumber) {
      try {
        const tokenRes = await fetch('/api/twilio-token');
        if (tokenRes.ok) {
          const { token } = await tokenRes.json();
          const { Device } = await import('@twilio/voice-sdk');
          const device = new Device(token, { logLevel: 1 });
          twilioDeviceRef.current = device;
          await device.register();
          const call = await device.connect({ params: { To: phoneNumber } });
          twilioCallRef.current = call;
          // Auto-end when remote party hangs up
          call.on('disconnect', () => { if (caRef.current) endCall(); });
          // Start transcription + subscribe to Pusher when call is accepted
          call.on('accept', async (acceptedCall) => {
            const callSid = acceptedCall?.parameters?.CallSid || call.parameters?.CallSid;
            if (!callSid) return;
            // Start transcription via REST API (safer than TwiML — won't block Dial)
            try {
              await fetch('/api/start-transcription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callSid }),
              });
            } catch (e) { console.warn('Could not start transcription:', e.message); }
            // Subscribe to Pusher for live transcript events
            if (PUSHER_KEY && PUSHER_CLUSTER) {
              const p = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
              const ch = p.subscribe(`call-${callSid}`);
              ch.bind('transcript', ({ speaker, text }) => {
                if (onLineRef.current) onLineRef.current(speaker, text);
              });
              transcriptPusherRef.current = { pusher: p, callSid };
              console.log('Transcription started for call-' + callSid);
            }
          });
        }
      } catch (e) {
        console.warn('Twilio unavailable, mic-only mode:', e.message);
      }
    }

    // Mic-only mode: use Web Speech API (no WebRTC conflict)
    if (!phoneNumber) startMic();

    // Record audio for playback (Twilio Real-Time Transcription handles live captions for phone calls)
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
  };

  const endCall = async () => {
    stopMic();
    clearTimeout(bufTimerRef.current);
    clearInterval(heartbeatRef.current);
    clearInterval(whisperIntervalRef.current); whisperIntervalRef.current = null;
    // Disconnect Twilio
    try { twilioCallRef.current?.disconnect(); } catch {}
    try { twilioDeviceRef.current?.destroy(); } catch {}
    twilioCallRef.current = null; twilioDeviceRef.current = null;
    // Unsubscribe from Real-Time Transcription channel
    if (transcriptPusherRef.current) {
      const { pusher, callSid } = transcriptPusherRef.current;
      try { pusher.unsubscribe(`call-${callSid}`); pusher.disconnect(); } catch {}
      transcriptPusherRef.current = null;
    }
    try { if (mediaRecRef.current?.state === 'recording') mediaRecRef.current.stop(); } catch {}
    setCA(false); caRef.current = false;
    const nextPhase = 'done';
    setPhase(nextPhase); phaseRef.current = nextPhase;
    broadcast({ callActive: false, phase: nextPhase });

    // Run full AI analysis — only if there's actual transcript content
    if (!txRef.current.length) return;
    setAnalysing(true);
    try {
      const r = await fetch('/api/demo-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript:  txRef.current,
          fields:      fieldsRef.current,
          fieldValues: fvRef.current,
          niche:       nicheRef.current?.label || null,
        }),
      });
      if (r.ok) {
        const data = await r.json();
        setAnalysis(data);
        broadcast({ analysis: data });
      }
    } catch (e) { console.error('Demo analysis error:', e); }
    finally { setAnalysing(false); }
  };

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
    setDialNum('');
    const nextPhase = 'dial'; setPhase(nextPhase); phaseRef.current = nextPhase;
    broadcast({ phase: nextPhase, niche: n.id, fields: seed, fieldValues: {}, transcript: [] });
  };

  const selectTemplate = (nicheId) => {
    const tpl = (TEMPLATE_FORMS[nicheId] || []).map(f => ({ ...f, key: `tpl_${f.key}` }));
    const n = NICHES.find(x => x.id === nicheId) || null;
    setNiche(n); nicheRef.current = n;
    setFields(tpl); fieldsRef.current = tpl;
    setFVals({}); fvRef.current = {};
    setTx([]);    txRef.current  = [];
    setDialNum('');
    const nextPhase = 'dial'; setPhase(nextPhase); phaseRef.current = nextPhase;
    broadcast({ phase: nextPhase, niche: nicheId, fields: tpl, fieldValues: {}, transcript: [] });
  };

  const useManualFields = () => {
    if (!manualFields.length) return;
    setFields(manualFields); fieldsRef.current = manualFields;
    setFVals({}); fvRef.current = {};
    setTx([]);    txRef.current  = [];
    setDialNum('');
    const nextPhase = 'dial'; setPhase(nextPhase); phaseRef.current = nextPhase;
    broadcast({ phase: nextPhase, fields: manualFields, fieldValues: {}, transcript: [] });
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

  const reset = () => {
    stopMic();
    setPhase('landing'); phaseRef.current = 'landing';
    setMode(null); setCode(null); setNiche(null);
    setFields([]); setFVals({}); setTx([]);
    setCA(false); setCS(0); setRec(null);
    setMF([]); setML(''); setMT('text'); setAM(false);
    modeRef.current = null; nicheRef.current = null;
    fieldsRef.current = []; fvRef.current = {}; txRef.current = [];
    caRef.current = false;
  };

  // ── Share URL ─────────────────────────────────────────────────────────────
  const shareUrl = sessionCode ? `${window.location.origin}/demo?watch=${sessionCode}` : '';
  const copyShare = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  // Field display for the call panel (used in both build + fill modes)
  const renderField = (f) => {
    const val    = fieldValues[f.key];
    const filled = val !== undefined && val !== '' && val !== null && val !== false;
    const isHl   = lastFilled === f.key || lastAdded === f.label;
    const hl     = mode === 'fill' ? lastFilled === f.key : false;

    return (
      <div
        key={f.key}
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
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Live</span>
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
          <>
            <button
              onClick={() => setTypeMode(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${showTypeMode ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              Type
            </button>
            <button
              onClick={endCall}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <PhoneOff className="w-3.5 h-3.5" /> End Call
            </button>
          </>
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
        <div className="w-[42%] flex flex-col border-r border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Transcript</p>
          </div>
          <div ref={txDivRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {transcript.length === 0 && (
              <p className="text-center text-slate-300 text-sm py-8">
                {micActive ? 'Listening…' : 'Transcript will appear here'}
              </p>
            )}
            {transcript.map((line, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${line.speaker !== 'You' ? 'flex-row-reverse' : ''}`}
                style={{ animation: 'slideUp 0.25s ease forwards' }}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0
                  ${line.speaker === 'You' ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-white'}`}>
                  {line.speaker === 'You' ? 'Y' : 'C'}
                </div>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed
                  ${line.speaker === 'You'
                    ? 'bg-slate-100 text-slate-800 rounded-tl-sm'
                    : 'bg-slate-800 text-white rounded-tr-sm'}`}>
                  {line.text}
                </div>
              </div>
            ))}
            {interimText && (
              <div className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {lineSpeaker === 'You' ? 'Y' : 'C'}
                </div>
                <div className="max-w-[80%] px-3 py-2 rounded-2xl text-sm bg-slate-50 text-slate-400 italic rounded-tl-sm border border-slate-200">
                  {interimText}
                </div>
              </div>
            )}
          </div>

          {/* Mic / Type controls */}
          {!isViewer && (
            <div className="flex-shrink-0 border-t border-slate-100 p-3 space-y-2">
              {/* Mic button + speaker toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={micActive ? stopMic : startMic}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex-shrink-0
                    ${micActive
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                >
                  {micActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {micActive ? 'Stop mic' : 'Start mic'}
                </button>
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 text-xs">
                  {['You', 'Client'].map(s => (
                    <button
                      key={s}
                      onClick={() => setLS(s)}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors
                        ${lineSpeaker === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type mode */}
              {showTypeMode && (
                <div className="flex gap-2">
                  <input
                    value={lineText}
                    onChange={e => setLT(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addLine()}
                    placeholder={`Type as ${lineSpeaker}…`}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <button
                    onClick={addLine}
                    className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form panel */}
        <div className="flex-1 flex flex-col bg-[#F7F7F5] overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {mode === 'build' ? 'Intake Form — Auto-building' : 'Intake Form — Auto-filling'}
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
      <PageShell onHome={onHome} onBookDemo={onBookDemo}>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#F7F7F5]">
          <div className="w-full max-w-3xl">
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-xs font-bold px-4 py-2 rounded-full border border-green-100 mb-5">
                <Radio className="w-3.5 h-3.5" /> Live interactive demo tool
              </span>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">Choose your demo</h1>
              <p className="text-slate-500 text-base max-w-lg mx-auto">
                Two ways to show what Show My Quote does — both work live while your client watches from their browser.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Build a Form */}
              <button
                onClick={() => goToMode('build')}
                className="text-left bg-white rounded-2xl border border-slate-200 p-7 hover:border-slate-400 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-5 group-hover:bg-slate-700 transition-colors">
                  <Wand2 className="w-6 h-6 text-white" />
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Option 1</div>
                <h2 className="text-xl font-black text-slate-900 mb-3">Build a Form</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-5">
                  Ask your client what questions they normally ask <em>their</em> customers. Our AI listens and builds an intake form — field by field — as they describe their process.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  {['Pick your niche first', 'AI tailors its field detection', 'Form builds live in real time', 'Get an SMS template at the end'].map(t => (
                    <li key={t} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  Start <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              {/* Fill a Form */}
              <button
                onClick={() => goToMode('fill')}
                className="text-left bg-white rounded-2xl border border-slate-200 p-7 hover:border-slate-400 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mb-5 group-hover:bg-green-700 transition-colors">
                  <ClipboardList className="w-6 h-6 text-white" />
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Option 2</div>
                <h2 className="text-xl font-black text-slate-900 mb-3">Fill a Form</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-5">
                  Choose from a ready-made template or build your own form manually. Then roleplay a customer call — watch every field fill itself as you speak.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  {['Pre-built templates per niche', 'Or build your own form', 'Live call fills all fields', 'Client sees it happening in real time'].map(t => (
                    <li key={t} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  Start <ArrowRight className="w-4 h-4" />
                </div>
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
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Link2 className="w-7 h-7 text-green-600" />
              </div>
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

  if (phase === 'fill-select') {
    return (
      <PageShell onHome={onHome} onBookDemo={onBookDemo}>
        <div className="flex-1 overflow-y-auto bg-[#F7F7F5] px-6 py-10">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Step 1</p>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Choose a form</h2>
              <p className="text-slate-500 text-sm">Pick a ready-made template for your niche, or build your own form with the fields you need.</p>
            </div>

            {/* Templates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {NICHES.filter(n => n.id !== 'custom').map(n => {
                const tpl = TEMPLATE_FORMS[n.id] || [];
                const Icon = n.Icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => selectTemplate(n.id)}
                    className="text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-900 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                        <Icon className="w-4 h-4 text-slate-700 group-hover:text-white transition-colors" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{n.label}</h3>
                    </div>
                    <div className="space-y-1">
                      {tpl.slice(0, 4).map(f => (
                        <div key={f.key} className="flex items-center gap-1.5 text-xs text-slate-400">
                          <div className="w-1 h-1 bg-slate-300 rounded-full" />
                          {f.label}
                        </div>
                      ))}
                      {tpl.length > 4 && (
                        <div className="text-xs text-slate-300">+{tpl.length - 4} more fields</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Build manually */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Plus className="w-4 h-4 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Build your own</h3>
                  <p className="text-xs text-slate-400">Add exactly the fields you need</p>
                </div>
              </div>

              {/* Field list */}
              {manualFields.length > 0 && (
                <div className="space-y-2 mb-4">
                  {manualFields.map((f, i) => (
                    <div key={f.key} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                      <span className="flex-1 text-sm text-slate-700">{f.label}</span>
                      <span className="text-xs text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded">{f.type}</span>
                      <button
                        onClick={() => setMF(prev => prev.filter((_, j) => j !== i))}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add field */}
              {addingManual ? (
                <div className="flex gap-2 mb-4">
                  <input
                    autoFocus
                    value={manualLabel}
                    onChange={e => setML(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addManualField()}
                    placeholder="Field label, e.g. Guest Count"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <select
                    value={manualType}
                    onChange={e => setMT(e.target.value)}
                    className="px-2 py-2 rounded-lg border border-slate-200 text-sm bg-white outline-none"
                  >
                    {['text','number','date','toggle','select','long-text'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <button onClick={addManualField} className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-700">Add</button>
                  <button onClick={() => setAM(false)} className="px-3 py-2 text-slate-500 hover:text-slate-800"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <button
                  onClick={() => setAM(true)}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
                >
                  <Plus className="w-4 h-4" /> Add a field
                </button>
              )}

              <button
                onClick={useManualFields}
                disabled={manualFields.length === 0}
                className="w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Use this form →
              </button>
            </div>
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

    return (
      <PageShell onHome={onHome} onBookDemo={onBookDemo} isViewer={isViewer} sessionCode={sessionCode}>
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
            <div className="flex items-center justify-center gap-2 min-h-[52px] mb-2">
              <span className="text-3xl font-light tracking-widest text-slate-900 text-center break-all">
                {dialNumber || <span className="text-slate-300 text-lg font-normal">+44 xxx xxx xxxx</span>}
              </span>
              {dialNumber && (
                <button onClick={del} className="text-slate-400 hover:text-slate-700 text-xl transition-colors flex-shrink-0">⌫</button>
              )}
            </div>

            {/* Paste button */}
            {!isViewer && (
              <div className="flex justify-center mb-4">
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
        <PageShell onHome={onHome} onBookDemo={onBookDemo}>
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
                onClick={startCall}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold text-sm transition-colors shadow-md mx-auto"
              >
                <Phone className="w-4 h-4" /> Start Call
              </button>
            </div>
          </div>
        </PageShell>
      );
    }

    return (
      <PageShell onHome={onHome} onBookDemo={onBookDemo} isViewer={isViewer} sessionCode={sessionCode}>
        {renderCallScreen()}
      </PageShell>
    );
  }

  if (phase === 'done') {
    const filledCount = fields.filter(f => fieldValues[f.key] !== undefined && fieldValues[f.key] !== '').length;

    return (
      <PageShell onHome={onHome} onBookDemo={onBookDemo} isViewer={isViewer} sessionCode={sessionCode}>
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
                  <Sparkles className="w-4 h-4 text-green-500" />
                  <h3 className="text-sm font-bold text-slate-700">AI Call Summary</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{analysis.summary}</p>
              </div>
            )}

            {/* Captured form data */}
            {fields.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-700">Captured data</h3>
                  <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                    {filledCount}/{fields.length} filled
                  </span>
                </div>
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
                <button
                  onClick={() => navigator.clipboard.writeText(analysis.sms)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy SMS
                </button>
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

            {/* Invoice items */}
            {analysis?.invoiceItems?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-700">Suggested invoice items</h3>
                </div>
                <div className="space-y-2">
                  {analysis.invoiceItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-800">{item.description}</div>
                        <div className="text-xs text-slate-400">Qty: {item.qty}</div>
                      </div>
                      <div className="text-sm font-bold text-slate-900 ml-4 flex-shrink-0">{item.rate}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recording — presenter */}
            {recordingUrl && !isViewer && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Play className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-700">Call recording</h3>
                  <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">Local · Twilio cloud coming soon</span>
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
                  Start over
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
    <PageShell onHome={onHome} onBookDemo={onBookDemo} isViewer={isViewer} sessionCode={sessionCode}>
      <div className="flex-1 flex items-center justify-center bg-[#F7F7F5]">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    </PageShell>
  );
}

// ── Page shell (nav + viewer banner) ─────────────────────────────────────────

function PageShell({ children, onHome, onBookDemo, isViewer, sessionCode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
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
          {!isViewer && (
            <button onClick={onHome} className="hidden md:inline-flex px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Back to site
            </button>
          )}
          <button
            onClick={onBookDemo}
            className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-700 transition-colors shadow-md"
          >
            Book a demo
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}
