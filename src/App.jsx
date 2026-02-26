import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TemplatesView, TemplateBuilderView } from './TemplateBuilder.jsx';
import PriceListView from './PriceList.jsx';
import { transcribeAudio, suggestField, fillFields, analyzeFullConversation } from './openaiHelper.js';
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
  AlignLeft, Percent, MapPin, Timer, CalendarClock, Minus, Info, SlidersHorizontal
} from 'lucide-react';

// --- MOCK DATA ---
const MOCK_CALLS = [
  {
    id: 'call-101',
    caller: 'Sarah Jenkins',
    phone: '+1 (555) 019-8372',
    date: 'Oct 24, 2:30 PM',
    duration: '04:12',
    status: 'transcribed',
    transcript: [
      { speaker: 'Agent', text: 'Thanks for calling Elite Catering. How can I help you today?' },
      { speaker: 'Sarah', text: "Hi, I'm planning my wedding for next summer and wanted to get a rough idea of pricing." },
      { speaker: 'Agent', text: 'Congratulations! I can certainly help. Do you have a date and venue in mind?' },
      { speaker: 'Sarah', text: "Yes, we are looking at June 15th at the River Grove Estate. We're expecting around 120 guests." },
      { speaker: 'Agent', text: 'Perfect. River Grove is lovely. Were you thinking a seated dinner or something more casual?' },
      { speaker: 'Sarah', text: 'Probably a plated dinner. Oh, and my sister is severely allergic to nuts, so we need to be careful with that. Also need a few vegan options.' }
    ],
    extracted: {
      name: 'Sarah Jenkins',
      eventType: 'Wedding',
      date: '2027-06-15',
      venue: 'River Grove Estate',
      guestCount: 120,
      serviceStyle: 'Plated',
      dietary: ['Nut Allergy', 'Vegan']
    }
  },
  {
    id: 'call-102',
    caller: 'Michael Chen',
    phone: '+1 (555) 992-1102',
    date: 'Oct 24, 11:15 AM',
    duration: '02:45',
    status: 'transcribed',
    transcript: [
      { speaker: 'Agent', text: 'Elite Catering, speaking.' },
      { speaker: 'Michael', text: 'Hey, I need a caterer for a corporate retreat next month. About 50 people. Just a simple buffet lunch.' }
    ],
    extracted: {
      name: 'Michael Chen',
      eventType: 'Corporate',
      date: 'Next Month',
      guestCount: 50,
      serviceStyle: 'Buffet',
      dietary: []
    }
  }
];

const MOCK_CALL_LOGS = [
  {
    id: 'cl-1',
    caller: 'Sarah Jenkins',
    phone: '+44 7700 900123',
    email: 'sarah.jenkins@gmail.com',
    date: 'Today, 2:30 PM',
    duration: '4m 12s',
    status: 'transcribed',
    hasRecording: true,
    transcript: [
      { speaker: 'You',   text: "Thanks for calling Elite Catering. How can I help you today?" },
      { speaker: 'Sarah', text: "Hi, I'm looking to organise catering for my wedding next year." },
      { speaker: 'You',   text: "Congratulations! Do you have a date and venue in mind?" },
      { speaker: 'Sarah', text: "Yes — June 15th 2027 at River Grove Estate, in Berkshire." },
      { speaker: 'You',   text: "Lovely! How many guests are you expecting?" },
      { speaker: 'Sarah', text: "Around 120 guests — plated sit-down for the wedding breakfast." },
      { speaker: 'You',   text: "Any dietary requirements we should know about?" },
      { speaker: 'Sarah', text: "Yes — my sister has a severe nut allergy and we'd love a few vegan options." },
    ],
    extracted: { name: 'Sarah Jenkins', eventType: 'Wedding', date: 'Jun 15, 2027', venue: 'River Grove Estate', guestCount: 120, serviceStyle: 'Plated', dietary: ['Nut allergy (severe)', 'Vegan options'] },
    quote: { id: 'q1', amount: 12400, status: 'draft' },
    messages: [
      { type: 'email', direction: 'sent', subject: 'Your wedding catering quote', time: 'Today, 3:15 PM', body: 'Hi Sarah, please find your draft quote for June 15, 2027 at River Grove Estate. Let me know if you have any questions or would like to discuss further.' },
    ],
    invoice: null,
  },
  {
    id: 'cl-2',
    caller: 'Michael Chen',
    phone: '+44 7700 900456',
    email: 'michael.chen@techcorp.com',
    date: 'Today, 11:15 AM',
    duration: '2m 45s',
    status: 'transcribed',
    hasRecording: true,
    transcript: [
      { speaker: 'You',     text: "Elite Catering, speaking." },
      { speaker: 'Michael', text: "Hey, I need a caterer for a corporate retreat next month — about 50 people, simple buffet lunch." },
      { speaker: 'You',     text: "We'd be happy to help. Do you have a venue in mind?" },
      { speaker: 'Michael', text: "Yes, it's at our office in central London. Flexible on date within the next 3–4 weeks." },
    ],
    extracted: { name: 'Michael Chen', eventType: 'Corporate', date: 'Next Month', guestCount: 50, serviceStyle: 'Buffet', dietary: [] },
    quote: { id: 'q4', amount: 3100, status: 'draft' },
    messages: [],
    invoice: null,
  },
  {
    id: 'cl-3',
    caller: 'Emma & David',
    phone: '+44 7700 900789',
    email: 'emma.harper@gmail.com',
    date: 'Yesterday, 4:20 PM',
    duration: '6m 30s',
    status: 'transcribed',
    hasRecording: true,
    transcript: [
      { speaker: 'You',  text: "Elite Catering Co., how can I help?" },
      { speaker: 'Emma', text: "Hello! We're planning our wedding for August 2nd and would love to discuss catering." },
      { speaker: 'You',  text: "Wonderful! Tell me about the event — venue and guest numbers?" },
      { speaker: 'Emma', text: "About 180 guests at Elmwood Manor — it's an outdoor venue." },
      { speaker: 'You',  text: "Lovely. What style of service were you thinking?" },
      { speaker: 'Emma', text: "Family-style platters — very relaxed and sociable." },
    ],
    extracted: { name: 'Emma & David', eventType: 'Wedding', date: 'Aug 2, 2026', venue: 'Elmwood Manor', guestCount: 180, serviceStyle: 'Family Style', dietary: [] },
    quote: { id: 'q2', amount: 18200, status: 'sent' },
    messages: [
      { type: 'email', direction: 'sent', subject: 'Wedding catering proposal — Elmwood Manor', time: 'Yesterday, 5:30 PM', body: 'Dear Emma & David, we are delighted to present our proposal for your special day at Elmwood Manor. Please find the full quote at the link below.' },
      { type: 'sms',   direction: 'sent', text: "Hi Emma! Your quote has been sent to your email. Let us know if you have any questions 😊", time: 'Yesterday, 5:32 PM' },
    ],
    invoice: null,
  },
  {
    id: 'cl-4',
    caller: 'Rivera Family',
    phone: '+44 7700 900321',
    email: 'rivera.family@gmail.com',
    date: 'Oct 22, 10:00 AM',
    duration: '—',
    status: 'missed',
    hasRecording: false,
    transcript: [],
    extracted: { name: 'Rivera Family', eventType: 'Birthday', guestCount: 90, serviceStyle: 'Family Style', dietary: ['Gluten Free'] },
    quote: { id: 'q5', amount: 7800, status: 'viewed' },
    messages: [
      { type: 'email', direction: 'sent', subject: 'Sorry we missed your call', time: 'Oct 22, 11:00 AM', body: 'Hi, apologies for missing your call this morning. Please feel free to reply here with any questions, or call us back at your convenience.' },
    ],
    invoice: { id: 'INV-001', amount: 7800, status: 'unpaid', dueDate: 'Nov 15, 2025', items: [{ desc: 'Birthday Party Catering — 90 guests (Family Style)', amount: 7800 }] },
  },
];

const MOCK_MENUS = [
  {
    id: 'm1', name: 'Classic Elegance', type: 'Plated', basePrice: 85, tags: ['Standard'],
    description: 'A timeless plated dinner experience with refined presentation and personalized service.',
    minGuests: 50, maxGuests: 300,
    courses: [
      { name: 'Starters', items: ['Caesar Salad', 'French Onion Soup', 'Shrimp Cocktail'] },
      { name: 'Mains', items: ['Filet Mignon', 'Pan-Seared Salmon', 'Chicken Marsala'] },
      { name: 'Desserts', items: ['Crème Brûlée', 'Chocolate Lava Cake', 'Seasonal Sorbet'] },
    ]
  },
  {
    id: 'm2', name: 'Rustic Italian Feast', type: 'Family Style', basePrice: 65, tags: ['Popular'],
    description: 'Generous family-style platters inspired by the Italian countryside. Perfect for weddings and celebrations.',
    minGuests: 40, maxGuests: 250,
    courses: [
      { name: 'Antipasti', items: ['Bruschetta Board', 'Burrata & Prosciutto', 'Caprese Salad'] },
      { name: 'Mains', items: ['Braised Short Rib', 'Eggplant Parmigiana', 'Rosemary Roast Chicken'] },
      { name: 'Desserts', items: ['Tiramisu', 'Cannoli', 'Panna Cotta'] },
    ]
  },
  {
    id: 'm3', name: 'Modern Mediterranean', type: 'Buffet', basePrice: 55, tags: ['Healthy'],
    description: 'A fresh, vibrant buffet drawing from Mediterranean traditions. Great for corporate events.',
    minGuests: 20, maxGuests: 500,
    courses: [
      { name: 'Salads & Dips', items: ['Greek Salad', 'Hummus & Pita', 'Tabbouleh'] },
      { name: 'Mains', items: ['Lamb Kofta', 'Grilled Sea Bass', 'Stuffed Peppers'] },
      { name: 'Desserts', items: ['Baklava', 'Halva', 'Fresh Fruit Platter'] },
    ]
  },
];

const MOCK_RULES_INITIAL = [
  { id: 'r1', condition: 'serviceStyle = Plated',        action: 'Multiply staff labor by 1.4',  expression: 'staffCost × 1.4',            raw: 'multiply staff labor by 1.4 for plated service' },
  { id: 'r2', condition: 'guests > 150',                 action: 'Apply 5% volume discount',     expression: 'total × 0.95',               raw: 'apply 5% discount if guests exceed 150' },
  { id: 'r3', condition: 'dietary requirements > 0',     action: 'Add £5 per dietary req',       expression: 'total += dietaryCount × £5',  raw: 'charge £5 per dietary requirement' },
  { id: 'r4', condition: 'venueZone = Outside Metro',    action: 'Add flat travel fee £150',     expression: 'total += £150',              raw: 'add £150 travel fee for outside metro venues' },
];

const MOCK_QUOTES = [
  { id: 'q1', client: 'Sarah Jenkins', eventType: 'Wedding', eventDate: 'Jun 15, 2027', amount: 12400, status: 'draft', menu: 'Classic Elegance', guests: 120, serviceStyle: 'Plated', dietary: ['Nut Allergy', 'Vegan'] },
  { id: 'q2', client: 'Emma & David', eventType: 'Wedding', eventDate: 'Aug 2, 2026', amount: 18200, status: 'sent', menu: 'Rustic Italian Feast', guests: 180, serviceStyle: 'Family Style', dietary: [] },
  { id: 'q3', client: 'TechCorp Inc.', eventType: 'Corporate', eventDate: 'Nov 5, 2025', amount: 4200, status: 'won', menu: 'Modern Mediterranean', guests: 60, serviceStyle: 'Buffet', dietary: [] },
  { id: 'q4', client: 'Michael Chen', eventType: 'Corporate', eventDate: 'Next Month', amount: 3100, status: 'draft', menu: 'Modern Mediterranean', guests: 50, serviceStyle: 'Buffet', dietary: [] },
  { id: 'q5', client: 'Rivera Family', eventType: 'Birthday', eventDate: 'Dec 20, 2025', amount: 7800, status: 'viewed', menu: 'Rustic Italian Feast', guests: 90, serviceStyle: 'Family Style', dietary: ['Gluten Free'] },
];

const MOCK_INQUIRIES_INITIAL = [
  { id: 'i1', name: 'Sarah Jenkins', status: 'Drafting', eventDate: 'June 15, 2027', source: 'OpenPhone', value: '£12,400', eventType: 'Wedding', guests: 120, phone: '+1 (555) 019-8372', notes: 'Nut allergy, vegan options needed. Venue: River Grove Estate.' },
  { id: 'i2', name: 'Michael Chen', status: 'New Inquiry', eventDate: 'Next Month', source: 'OpenPhone', value: 'TBD', eventType: 'Corporate', guests: 50, phone: '+1 (555) 992-1102', notes: 'Simple buffet lunch for corporate retreat.' },
  { id: 'i3', name: 'Emma & David', status: 'Quote Sent', eventDate: 'Aug 2, 2026', source: 'Web Form', value: '£18,200', eventType: 'Wedding', guests: 180, phone: '+1 (555) 234-5678', notes: 'Outdoor venue, may need weather contingency plan.' },
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

// --- MAIN APP ---
// ─── Phone Dialer ─────────────────────────────────────────────────────────────
function PhoneDialer({ onClose, navigateTo }) {
  const [number, setNumber] = useState('');
  const [status, setStatus] = useState('idle'); // idle | dialing | connected | ended
  const [timer, setTimer] = useState(0);
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);
  const [transcript, setTranscript] = useState([]);

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

  useEffect(() => {
    if (status !== 'dialing') return;
    const t = setTimeout(() => setStatus('connected'), 2500);
    return () => clearTimeout(t);
  }, [status]);

  const DEMO_LINES = [
    { speaker: 'You',    text: 'Thanks for calling Elite Catering, how can I help?' },
    { speaker: 'Client', text: "Hi, I'm planning a wedding and wanted to get a quote." },
    { speaker: 'You',    text: 'Congratulations! Do you have a date in mind?' },
    { speaker: 'Client', text: 'June 15th next year, around 120 guests at River Grove Estate.' },
    { speaker: 'You',    text: 'Perfect. Were you thinking a plated dinner or buffet?' },
    { speaker: 'Client', text: 'Plated dinner please, and we need a few vegan options too.' },
  ];

  useEffect(() => {
    if (status !== 'connected') return;
    const timers = DEMO_LINES.map((line, i) =>
      setTimeout(() => setTranscript(t => [...t, line]), (i + 1) * 3500)
    );
    return () => timers.forEach(clearTimeout);
  }, [status]);

  const press = digit => {
    if (status === 'connected' || status === 'dialing') return;
    setNumber(n => n.length < 16 ? n + digit : n);
  };

  const showPanel = status === 'connected' || status === 'ended';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
      <div className={`bg-slate-900 w-full sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:flex-row transition-all duration-300 sm:${showPanel ? 'w-[680px]' : 'w-72'}`} style={{ maxHeight: '95vh' }}>

        {/* ── Keypad panel ── */}
        <div className="w-full sm:w-72 flex-shrink-0 flex flex-col p-5 sm:p-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                status === 'connected' ? 'bg-green-400 animate-pulse' :
                status === 'dialing'   ? 'bg-yellow-400 animate-pulse' : 'bg-slate-600'
              }`} />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {status === 'idle'      ? 'Ready to call' :
                 status === 'dialing'   ? 'Dialing…' :
                 status === 'connected' ? `Connected · ${fmt(timer)}` : 'Call ended'}
              </span>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Number display */}
          <div className="mb-5 bg-slate-800 rounded-xl px-4 py-3 min-h-[52px] flex items-center justify-center">
            <span className={`font-mono text-xl tracking-widest font-bold ${number ? 'text-white' : 'text-slate-600'}`}>
              {number || 'Enter number'}
            </span>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {KEYS.map(({ digit, sub }) => (
              <button
                key={digit}
                onClick={() => press(digit)}
                disabled={status === 'connected' || status === 'dialing'}
                className="flex flex-col items-center justify-center h-14 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors select-none"
              >
                <span className="text-white font-semibold text-lg leading-none">{digit}</span>
                {sub && <span className="text-slate-500 text-[9px] font-medium mt-0.5 tracking-widest">{sub}</span>}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          {(status === 'idle' || status === 'ended') && (
            <div className="flex gap-2">
              <button
                onClick={() => setNumber(n => n.slice(0, -1))}
                className="flex-1 h-12 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors text-lg"
              >⌫</button>
              <button
                onClick={() => { if (number) setStatus('dialing'); }}
                disabled={!number}
                className="flex-[2] h-12 flex items-center justify-center gap-2 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold transition-colors text-sm"
              >
                <Phone className="w-4 h-4" /> Call
              </button>
            </div>
          )}

          {status === 'dialing' && (
            <button
              onClick={() => setStatus('ended')}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold transition-colors text-sm"
            >
              <PhoneOff className="w-4 h-4" /> Cancel
            </button>
          )}

          {status === 'connected' && (
            <div className="flex gap-2">
              <button
                onClick={() => setMuted(m => !m)}
                className={`flex-1 h-12 flex flex-col items-center justify-center rounded-xl text-xs font-medium gap-1 transition-colors ${muted ? 'bg-yellow-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
              >
                {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {muted ? 'Unmute' : 'Mute'}
              </button>
              <button
                onClick={() => setHeld(h => !h)}
                className={`flex-1 h-12 flex flex-col items-center justify-center rounded-xl text-xs font-medium gap-1 transition-colors ${held ? 'bg-yellow-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
              >
                {held ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {held ? 'Resume' : 'Hold'}
              </button>
              <button
                onClick={() => setStatus('ended')}
                className="flex-1 h-12 flex flex-col items-center justify-center rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-medium gap-1 transition-colors"
              >
                <PhoneOff className="w-4 h-4" /> End
              </button>
            </div>
          )}
        </div>

        {/* ── Live transcript panel ── */}
        {showPanel && (
          <div className="flex-1 border-t sm:border-t-0 sm:border-l border-slate-700/50 flex flex-col overflow-hidden">
            {/* Status bar */}
            <div className="flex items-center gap-2 px-5 py-3 bg-slate-800/50 border-b border-slate-700/50 flex-shrink-0">
              {status === 'connected' ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Recording & Transcribing</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Call ended · Transcript saved</span>
                </>
              )}
            </div>

            {/* Transcript */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {transcript.length === 0 ? (
                <p className="text-slate-600 text-sm text-center mt-8 animate-pulse">Listening…</p>
              ) : transcript.map((line, i) => (
                <div key={i} className={`flex gap-2 ${line.speaker !== 'You' ? 'flex-row-reverse' : ''}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider pt-2 w-8 flex-shrink-0 ${line.speaker === 'You' ? 'text-slate-500' : 'text-green-400 text-right'}`}>
                    {line.speaker}
                  </span>
                  <div className={`px-3 py-2 rounded-xl text-sm max-w-[195px] leading-relaxed ${
                    line.speaker === 'You'
                      ? 'bg-slate-800 text-slate-200'
                      : 'bg-green-900/40 text-green-100 border border-green-800/40'
                  }`}>
                    {line.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Auto-extracted fields */}
            <div className="border-t border-slate-700/50 p-5 flex-shrink-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Auto-extracted</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  { label: 'Event type', value: transcript.length >= 2 ? 'Wedding'           : '' },
                  { label: 'Guests',     value: transcript.length >= 4 ? '120'               : '' },
                  { label: 'Date',       value: transcript.length >= 4 ? 'Jun 15'            : '' },
                  { label: 'Venue',      value: transcript.length >= 4 ? 'River Grove Estate': '' },
                  { label: 'Style',      value: transcript.length >= 6 ? 'Plated dinner'     : '' },
                  { label: 'Dietary',    value: transcript.length >= 6 ? 'Vegan options'     : '' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-slate-500">{label}</span>
                    <span className={`text-xs font-semibold ${value ? 'text-green-400' : 'text-slate-700'}`}>
                      {value || '—'}
                    </span>
                  </div>
                ))}
              </div>
              {status === 'ended' && transcript.length >= 4 && (
                <button
                  onClick={() => { onClose(); navigateTo('quote-builder'); }}
                  className="mt-4 w-full py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Build Quote from this Call →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GetMyQuoteApp({ onHome }) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeRecord, setActiveRecord] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigateTo = (view, record = null) => {
    setCurrentView(view);
    setActiveRecord(record);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-white text-slate-800 font-sans antialiased overflow-hidden">
      <Sidebar currentView={currentView} navigateTo={navigateTo} onHome={onHome} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white relative">
        <header className="h-14 border-b border-slate-200 flex items-center px-3 md:px-6 justify-between bg-white/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 min-w-0">
            <button
              className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors flex-shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <span className="hidden sm:inline hover:bg-slate-100 px-2 py-1 rounded cursor-pointer transition-colors whitespace-nowrap" onClick={() => navigateTo('workspace')}>Show My Quote</span>
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
          {currentView === 'workspace'     && <WorkspaceView navigateTo={navigateTo} />}
          {currentView === 'dashboard'     && <DashboardView navigateTo={navigateTo} onNewCall={() => navigateTo('calls')} />}
          {currentView === 'calls'         && <CallLogView initialId={activeRecord} navigateTo={navigateTo} />}
          {currentView === 'onboarding'    && <OnboardingView />}
          {currentView === 'quote-builder' && <QuoteBuilderView initialData={activeRecord} navigateTo={navigateTo} />}
          {currentView === 'quotes'        && <QuotesView navigateTo={navigateTo} />}
          {currentView === 'inquiries'     && <InquiriesView navigateTo={navigateTo} />}
          {currentView === 'menus'         && <MenusView />}
          {currentView === 'pricing-rules'    && <PricingRulesView />}
          {currentView === 'price-list'       && <PriceListView />}
          {currentView === 'settings'        && <SettingsView />}
          {currentView === 'templates'       && <TemplatesView navigateTo={navigateTo} />}
          {currentView === 'template-builder' && <TemplateBuilderView initialData={activeRecord} navigateTo={navigateTo} />}
        </main>
      </div>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} navigateTo={(v, r) => { setSearchOpen(false); navigateTo(v, r); }} />}
    </div>
  );
}

// --- VIEWS ---

// --- Workspace mock data ---
const MOCK_ACTIVITY = [
  { id: 1,  icon: Send,         color: 'text-blue-500',   bg: 'bg-blue-50',   title: 'Quote sent to Emma & David', sub: '£18,200 · Wedding · Aug 2026', time: '2h ago' },
  { id: 2,  icon: PhoneCall,    color: 'text-green-500',  bg: 'bg-green-50',  title: 'Call transcribed: Sarah Jenkins', sub: 'Wedding · 120 guests · River Grove', time: '3h ago' },
  { id: 3,  icon: Inbox,        color: 'text-yellow-500', bg: 'bg-yellow-50', title: 'New inquiry: Michael Chen', sub: 'Corporate retreat · 50 guests', time: '5h ago' },
  { id: 4,  icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50',  title: 'Quote won: TechCorp Inc.', sub: '£4,200 · Corporate · Nov 2025', time: 'Yesterday' },
  { id: 5,  icon: Package,      color: 'text-slate-500',  bg: 'bg-slate-100', title: "Menu updated: 'Classic Elegance'", sub: 'Base price adjusted to £85/pp', time: 'Yesterday' },
  { id: 6,  icon: Sliders,      color: 'text-purple-500', bg: 'bg-purple-50', title: 'Pricing rule added', sub: 'IF Guest Count > 150 THEN 5% discount', time: '2 days ago' },
  { id: 7,  icon: FileEdit,     color: 'text-blue-400',   bg: 'bg-blue-50',   title: 'Quote drafted: Rivera Family', sub: '£7,800 · Birthday · Dec 2025', time: '2 days ago' },
  { id: 8,  icon: PhoneCall,    color: 'text-green-500',  bg: 'bg-green-50',  title: 'Call transcribed: Michael Chen', sub: 'Corporate · 50 guests', time: '3 days ago' },
];

const MOCK_TEAM = [
  { name: 'Alex Morgan',  role: 'Owner',        initials: 'AM', color: 'bg-violet-200 text-violet-800', online: true },
  { name: 'Jamie Park',   role: 'Sales Manager', initials: 'JP', color: 'bg-blue-200 text-blue-800',    online: true },
  { name: 'Chris Rivera', role: 'Chef Lead',     initials: 'CR', color: 'bg-amber-200 text-amber-800',  online: false },
  { name: 'Sam Okafor',   role: 'Events Coord.', initials: 'SO', color: 'bg-green-200 text-green-800',  online: false },
];

const MOCK_INTEGRATIONS = [
  { name: 'OpenPhone',  desc: 'Call transcription & AI extraction', connected: true,  icon: Phone },
  { name: 'Stripe',     desc: 'Deposit & payment collection',        connected: false, icon: DollarSign },
  { name: 'Google Cal', desc: 'Tasting & event scheduling',           connected: true,  icon: Calendar },
  { name: 'HubSpot',   desc: 'CRM sync & lead tracking',             connected: false, icon: Globe },
];

// --- LIVE CALL MODAL ---
// Demo sequence: each entry fires at `delay` ms after call connects.
// `fills` populates form fields; `line` adds a transcript line.
const DEMO_SEQUENCE = [
  { delay: 1800,  line: { speaker: 'Agent',  text: "Thanks for calling Elite Catering Co. How can I help you today?" } },
  { delay: 4500,  line: { speaker: 'Caller', text: "Hi, my name is Sarah Jenkins. I'm looking to organise catering for my wedding." },
    fills: [{ field: 'name', value: 'Sarah Jenkins' }] },
  { delay: 8000,  line: { speaker: 'Agent',  text: "Congratulations! Do you have a date and venue in mind?" } },
  { delay: 11000, line: { speaker: 'Caller', text: "Yes — June 15th 2027 at River Grove Estate, in Berkshire." },
    fills: [{ field: 'eventDate', value: 'June 15, 2027' }, { field: 'venue', value: 'River Grove Estate' }, { field: 'address', value: 'River Grove Estate, Berkshire, RG8 7JT' }] },
  { delay: 15000, line: { speaker: 'Agent',  text: "Lovely! What time does the event start and how long do you need us on site?" } },
  { delay: 18000, line: { speaker: 'Caller', text: "Ceremony is at 2pm, then dinner at 7:30pm. We'd probably need you for about eight hours." },
    fills: [{ field: 'startTime', value: '14:00 (ceremony) · Dinner 19:30' }, { field: 'duration', value: '8 hours on site' }] },
  { delay: 22000, line: { speaker: 'Agent',  text: "Got it. How many guests and what style of service were you thinking?" } },
  { delay: 25000, line: { speaker: 'Caller', text: "Around 120 guests — plated sit-down for the wedding breakfast." },
    fills: [{ field: 'guestCount', value: '120' }, { field: 'eventType', value: 'Wedding Reception' }, { field: 'serviceStyle', value: 'Plated sit-down' }] },
  { delay: 29000, line: { speaker: 'Agent',  text: "And for drinks — are you thinking an open bar, wine packages, or something else?" } },
  { delay: 32000, line: { speaker: 'Caller', text: "Open bar for four hours would be ideal, with a welcome drink on arrival." },
    fills: [{ field: 'barRequirements', value: 'Open bar (4 hrs) · Welcome drink on arrival' }] },
  { delay: 36000, line: { speaker: 'Agent',  text: "Perfect. Any dietary requirements we should be aware of?" } },
  { delay: 38500, line: { speaker: 'Caller', text: "Yes — my sister has a severe nut allergy and we'd love a few vegan options." },
    fills: [{ field: 'dietary', value: 'Nut allergy (severe) · Vegan options required' }] },
  { delay: 42500, line: { speaker: 'Agent',  text: "Will there be any children attending?" } },
  { delay: 44500, line: { speaker: 'Caller', text: "Yes, around 10 children — mostly under 12, so a children's menu would be great." },
    fills: [{ field: 'childrenCount', value: '10 children (under 12) · Children\'s menu needed' }] },
  { delay: 48500, line: { speaker: 'Agent',  text: "What budget are you roughly working to for the day?" } },
  { delay: 51000, line: { speaker: 'Caller', text: "Somewhere between twelve and fifteen thousand pounds all in." },
    fills: [{ field: 'budget', value: '£12,000 – £15,000' }] },
  { delay: 55000, line: { speaker: 'Agent',  text: "And can I ask — how did you hear about Elite Catering?" } },
  { delay: 57500, line: { speaker: 'Caller', text: "A friend recommended you — Emma Davis. She used you for her wedding last year." },
    fills: [{ field: 'referralSource', value: 'Referral — Emma Davis (wedding, 2024)' }] },
  { delay: 61500, line: { speaker: 'Agent',  text: "Wonderful — Emma was a lovely event! Any special requests we haven't covered?" } },
  { delay: 64000, line: { speaker: 'Caller', text: "We'd love a cheese station as a late-night snack, and a chocolate fountain if possible." },
    fills: [{ field: 'specialRequests', value: 'Late-night cheese station · Chocolate fountain' }] },
  { delay: 68000, line: { speaker: 'Agent',  text: "Brilliant. Lastly, can I take your email and best contact number?" } },
  { delay: 71000, line: { speaker: 'Caller', text: "Yes — sarah.jenkins@gmail.com and my mobile is 07700 900123." },
    fills: [{ field: 'email', value: 'sarah.jenkins@gmail.com' }, { field: 'phone', value: '07700 900123' }] },
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

  const filteredClients = MOCK_INQUIRIES_INITIAL.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(clientSearch))
  );

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

function WorkspaceView({ navigateTo }) {
  const [liveCallOpen, setLiveCallOpen] = useState(false);

  const stats = [
    { label: 'Pipeline Value',  value: '£63,700', delta: '+12% this month', icon: TrendingUp },
    { label: 'Quotes Sent',     value: '12',      delta: '3 awaiting reply', icon: Send },
    { label: 'Conversion Rate', value: '40%',     delta: '+5% vs last month', icon: CheckCircle2 },
    { label: 'Avg Quote Size',  value: '£9,328',  delta: 'across 5 won', icon: DollarSign },
  ];

  const quickActions = [
    { label: 'Live Call',       icon: Phone,      desc: 'Start & record a live call',       action: () => setLiveCallOpen(true), color: 'bg-green-600 text-white hover:bg-green-700' },
    { label: 'New Quote',       icon: FileEdit,   desc: 'Start a blank quote',              view: 'quote-builder', color: 'bg-slate-900 text-white hover:bg-slate-800' },
    { label: 'Review Calls',    icon: PhoneCall,  desc: '2 calls ready for extraction',    view: 'calls',         color: 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-800' },
    { label: 'Add Inquiry',     icon: Plus,       desc: 'Log a new client inquiry',         view: 'inquiries',     color: 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-800' },
    { label: 'Browse Menus',    icon: Package,    desc: 'Edit packages & pricing',          view: 'menus',         color: 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-800' },
    { label: 'Pricing Rules',   icon: Sliders,    desc: 'Automate quote calculations',      view: 'pricing-rules', color: 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-800' },
  ];

  return (
    <>
    <div className="h-full overflow-y-auto">
      {/* Hero banner */}
      <div className="bg-slate-900 text-white px-4 md:px-10 py-8 md:py-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-xl font-bold border border-white/20">
                EC
              </div>
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Workspace</div>
                <h1 className="text-2xl font-bold">Elite Catering Co.</h1>
                <p className="text-slate-400 text-sm mt-0.5">Premium event catering · Est. 2018 · Admin Plan</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setLiveCallOpen(true)}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white text-sm font-semibold px-4 py-1.5 rounded-md transition shadow-sm"
              >
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Live Call
              </button>
              <button onClick={() => navigateTo('settings')} className="text-sm text-slate-300 border border-slate-600 px-4 py-1.5 rounded-md hover:bg-white/10 transition flex items-center gap-2">
                <Settings className="w-3.5 h-3.5" /> Workspace Settings
              </button>
            </div>
          </div>

          {/* Stat bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {stats.map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-lg px-5 py-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                  <s.icon className="w-3.5 h-3.5" /> {s.label}
                </div>
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-slate-400 mt-1">{s.delta}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left col: Quick actions + Activity */}
          <div className="lg:col-span-2 space-y-8">

            {/* Quick Actions */}
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => action.action ? action.action() : navigateTo(action.view)}
                    className={`${action.color} rounded-lg p-4 text-left transition-all shadow-sm group`}
                  >
                    <action.icon className="w-5 h-5 mb-3 opacity-80" />
                    <div className="font-semibold text-sm">{action.label}</div>
                    <div className={`text-xs mt-0.5 ${i <= 1 ? 'text-slate-300' : 'text-slate-400'}`}>{action.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Feed */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Recent Activity</h2>
                <span className="text-xs text-slate-400">Last 7 days</span>
              </div>
              <div className="border border-slate-200 rounded-lg bg-white shadow-sm divide-y divide-slate-100 overflow-hidden">
                {MOCK_ACTIVITY.map((event, i) => (
                  <div key={event.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group cursor-default">
                    <div className={`w-8 h-8 rounded-full ${event.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <event.icon className={`w-4 h-4 ${event.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{event.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">{event.sub}</div>
                    </div>
                    <div className="text-xs text-slate-400 flex-shrink-0 pt-0.5">{event.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right col: Team + Integrations */}
          <div className="space-y-6">

            {/* Team */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Team</h2>
                <button className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors">
                  <Plus className="w-3 h-3" /> Invite
                </button>
              </div>
              <div className="border border-slate-200 rounded-lg bg-white shadow-sm divide-y divide-slate-100 overflow-hidden">
                {MOCK_TEAM.map((member, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="relative flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-xs font-bold`}>
                        {member.initials}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${member.online ? 'bg-green-400' : 'bg-slate-300'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{member.name}</div>
                      <div className="text-xs text-slate-400">{member.role}</div>
                    </div>
                    {member.role === 'Owner' && <Shield className="w-3.5 h-3.5 text-slate-300" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Integrations */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Integrations</h2>
                <button onClick={() => navigateTo('settings')} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">Manage</button>
              </div>
              <div className="border border-slate-200 rounded-lg bg-white shadow-sm divide-y divide-slate-100 overflow-hidden">
                {MOCK_INTEGRATIONS.map((intg, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <intg.icon className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{intg.name}</div>
                      <div className="text-xs text-slate-400 truncate">{intg.desc}</div>
                    </div>
                    {intg.connected
                      ? <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full flex-shrink-0">Connected</span>
                      : <button onClick={() => navigateTo('settings')} className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0 hover:bg-slate-200 transition-colors">Connect</button>
                    }
                  </div>
                ))}
              </div>
            </div>

            {/* Plan */}
            <div className="border border-slate-200 rounded-lg bg-white shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-slate-900">Admin Plan</div>
                <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">Active</span>
              </div>
              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex justify-between"><span>Quotes this month</span><span className="font-medium text-slate-700">5 / unlimited</span></div>
                <div className="flex justify-between"><span>Team seats</span><span className="font-medium text-slate-700">4 / 10</span></div>
                <div className="flex justify-between"><span>Integrations</span><span className="font-medium text-slate-700">2 / 10</span></div>
              </div>
              <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-slate-800 h-1.5 rounded-full" style={{ width: '40%' }} />
              </div>
              <div className="text-xs text-slate-400 mt-1.5">40% of team seats used</div>
            </div>

          </div>
        </div>
      </div>
    </div>
    {liveCallOpen && <LiveCallModal onClose={() => setLiveCallOpen(false)} navigateTo={navigateTo} />}
    </>
  );
}

function DashboardView({ navigateTo, onNewCall }) {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Good morning, Team</h1>
          <p className="text-slate-500 mt-1">Here is what's happening today.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewCall}
            className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-500 transition shadow-sm flex items-center gap-2"
          >
            <Phone className="w-4 h-4" /> New Call +
          </button>
          <button
            onClick={() => navigateTo('quote-builder')}
            className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition shadow-sm flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" /> New Quote
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Open Inquiries', value: '14', icon: Inbox, trend: '+2 this week', view: 'inquiries' },
          { label: 'Draft Quotes', value: '8', icon: FileEdit, trend: 'Needs review', view: 'quotes' },
          { label: 'Sent (Awaiting)', value: '12', icon: Clock, trend: '£45k pipeline', view: 'quotes' },
          { label: 'Won This Month', value: '5', icon: CheckCircle2, trend: '£22k revenue', view: 'quotes' }
        ].map((metric, i) => (
          <div
            key={i}
            onClick={() => navigateTo(metric.view)}
            className="border border-slate-200 rounded-lg p-5 hover:border-slate-300 transition-colors group bg-white shadow-sm cursor-pointer"
          >
            <div className="flex items-center text-slate-500 mb-3">
              <metric.icon className="w-4 h-4 mr-2 group-hover:text-slate-800 transition-colors" />
              <span className="text-sm font-medium">{metric.label}</span>
            </div>
            <div className="text-3xl font-semibold text-slate-900">{metric.value}</div>
            <div className="text-xs text-slate-400 mt-2">{metric.trend}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <div className="border border-slate-200 rounded-lg p-6 bg-white shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <PhoneCall className="w-5 h-5 mr-2 text-slate-400" /> Recent Calls
            </h3>
            <button onClick={() => navigateTo('calls')} className="text-sm text-slate-500 hover:text-slate-900">View all</button>
          </div>
          <div className="space-y-3">
            {MOCK_CALLS.map(call => (
              <div
                key={call.id}
                onClick={() => navigateTo('calls', call.id)}
                className="group flex items-center justify-between p-3 -mx-3 rounded-md hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div>
                  <div className="font-medium text-slate-900 group-hover:text-blue-600">{call.caller}</div>
                  <div className="text-sm text-slate-500 mt-0.5">{call.extracted.eventType} • {call.duration}</div>
                </div>
                {call.status === 'transcribed' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Extracted
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg p-6 bg-white shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-slate-400" /> Upcoming Tastings
          </h3>
          <div className="space-y-4 text-sm">
            <div className="flex border-l-2 border-slate-800 pl-3 py-1">
              <div className="w-16 font-medium text-slate-500">Oct 26</div>
              <div>
                <div className="font-semibold text-slate-900">Jenkins Wedding Tasting</div>
                <div className="text-slate-500">2:00 PM • Plated Menu</div>
              </div>
            </div>
            <div className="flex border-l-2 border-slate-300 pl-3 py-1">
              <div className="w-16 font-medium text-slate-500">Oct 28</div>
              <div>
                <div className="font-semibold text-slate-900">Corporate Retreat Preview</div>
                <div className="text-slate-500">11:00 AM • Buffet</div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
                  <div className="text-xs text-slate-500 capitalize mb-1">{key.replace(/([A-Z])/g, ' £1').trim()}</div>
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
    guestCount: initialData?.guestCount || initialData?.guests || 100,
    serviceStyle: initialData?.serviceStyle || 'Buffet',
    selectedMenuId: null,
    rentalsAmount: 0,
    dietaryNotes: initialData?.dietary?.join(', ') || '',
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleUpdate = (field, value) => setQuoteState(prev => ({ ...prev, [field]: value }));

  const menu = MOCK_MENUS.find(m => m.id === quoteState.selectedMenuId) || MOCK_MENUS[0];
  const baseFoodCost = quoteState.guestCount * menu.basePrice;
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
            value={quoteState.clientName ? `${quoteState.clientName} — Catering Quote` : 'Untitled Quote'}
            onChange={(e) => handleUpdate('clientName', e.target.value.split(' —')[0])}
            className="text-4xl font-bold text-slate-900 w-full outline-none placeholder-slate-300 border-b border-transparent focus:border-slate-200 transition-colors"
            placeholder="Quote Title"
          />
        </div>

        <div className="space-y-10">
          {/* Event Details */}
          <div className="group relative">
            <h3 className="text-lg font-semibold border-b border-slate-100 pb-2 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-slate-400" /> Event Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-slate-500 mb-1">Guest Count</label>
                <input
                  type="number"
                  value={quoteState.guestCount}
                  onChange={(e) => handleUpdate('guestCount', parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Service Style</label>
                <select
                  value={quoteState.serviceStyle}
                  onChange={(e) => handleUpdate('serviceStyle', e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all"
                >
                  <option>Buffet</option>
                  <option>Family Style</option>
                  <option>Plated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Menu */}
          <div>
            <h3 className="text-lg font-semibold border-b border-slate-100 pb-2 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2 text-slate-400" /> Menu Selection
            </h3>
            <div className="space-y-3">
              {MOCK_MENUS.map(m => (
                <div
                  key={m.id}
                  onClick={() => handleUpdate('selectedMenuId', m.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    (quoteState.selectedMenuId === m.id) || (!quoteState.selectedMenuId && m.id === 'm1')
                      ? 'border-slate-800 bg-slate-50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-900">{m.name}</div>
                      <div className="text-sm text-slate-500">{m.type}</div>
                    </div>
                    <div className="font-medium text-slate-900">£{m.basePrice} <span className="text-slate-500 text-sm font-normal">/pp</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dietary */}
          <div>
            <h3 className="text-lg font-semibold border-b border-slate-100 pb-2 mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-slate-400" /> Dietary & Special Requirements
            </h3>
            <textarea
              value={quoteState.dietaryNotes}
              onChange={(e) => handleUpdate('dietaryNotes', e.target.value)}
              placeholder="e.g. 5 Vegans, 1 Nut Allergy. Surcharges apply automatically."
              className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all min-h-[80px] text-sm"
            />
          </div>

          {/* Rentals */}
          <div>
            <h3 className="text-lg font-semibold border-b border-slate-100 pb-2 mb-4 flex items-center">
              <Tag className="w-5 h-5 mr-2 text-slate-400" /> Rentals & Equipment
            </h3>
            <div className="text-sm">
              <label className="block text-slate-500 mb-1">Rentals Total (£)</label>
              <input
                type="number"
                value={quoteState.rentalsAmount}
                onChange={(e) => handleUpdate('rentalsAmount', parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full sm:w-1/2 p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all"
              />
              <p className="text-slate-400 text-xs mt-1">Tables, linens, glassware, AV, etc.</p>
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
              <span>Food Base ({quoteState.guestCount} @ £{menu.basePrice})</span>
              <span className="font-medium text-slate-900">£{baseFoodCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <div className="flex items-center">
                Staffing Labor
                <span className="ml-2 bg-slate-200 text-slate-600 text-[10px] px-1.5 rounded uppercase font-bold tracking-wide">
                  {quoteState.serviceStyle}
                </span>
              </div>
              <span className="font-medium text-slate-900">£{Math.round(staffingCost).toLocaleString()}</span>
            </div>
            {quoteState.rentalsAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Rentals & Equipment</span>
                <span className="font-medium text-slate-900">£{quoteState.rentalsAmount.toLocaleString()}</span>
              </div>
            )}
            {dietarySurcharge > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Dietary Adjustments</span>
                <span className="font-medium text-slate-900">£{dietarySurcharge.toLocaleString()}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-4 mt-2">
              <div className="flex justify-between text-slate-800 font-medium">
                <span>Subtotal</span>
                <span>£{Math.round(subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500 mt-2 text-xs">
                <span>Service & Admin (18%)</span>
                <span>£{Math.round(adminFee).toLocaleString()}</span>
              </div>
            </div>
            <div className="border-t-2 border-slate-900 pt-4 flex justify-between items-end">
              <div>
                <div className="text-xl font-bold text-slate-900">Total</div>
                <div className="text-xs text-slate-500 mt-1">Deposit (25%): ${Math.round(total * 0.25).toLocaleString()}</div>
              </div>
              <div className="text-2xl font-bold text-slate-900">£{Math.round(total).toLocaleString()}</div>
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
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Elite Catering Co.</div>
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
            <div className="flex justify-between"><span className="text-slate-600">Food & Beverage</span><span>£{Math.round(baseFoodCost).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Staffing & Service</span><span>£{Math.round(staffingCost).toLocaleString()}</span></div>
            {quoteState.rentalsAmount > 0 && <div className="flex justify-between"><span className="text-slate-600">Rentals</span><span>£{quoteState.rentalsAmount.toLocaleString()}</span></div>}
            {dietarySurcharge > 0 && <div className="flex justify-between"><span className="text-slate-600">Dietary Prep</span><span>£{dietarySurcharge.toLocaleString()}</span></div>}
            <div className="flex justify-between text-slate-500 border-t border-slate-100 pt-3"><span>Service & Admin</span><span>£{Math.round(adminFee).toLocaleString()}</span></div>
            <div className="flex justify-between font-bold text-slate-900 text-lg border-t-2 border-slate-900 pt-3">
              <span>Total</span><span>£{Math.round(total).toLocaleString()}</span>
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

function QuotesView({ navigateTo }) {
  const [filter, setFilter] = useState('all');
  const tabs = ['all', 'draft', 'sent', 'viewed', 'won', 'lost'];
  const filtered = filter === 'all' ? MOCK_QUOTES : MOCK_QUOTES.filter(q => q.status === filter);

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
              {tab === 'all' ? MOCK_QUOTES.length : MOCK_QUOTES.filter(q => q.status === tab).length}
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
                <td className="px-6 py-4 text-sm font-medium text-slate-900">£{quote.amount.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_STYLES[quote.status]}`}>
                    {quote.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-sm text-slate-500 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity">
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

function InquiriesView({ navigateTo }) {
  const [inquiries, setInquiries] = useState(MOCK_INQUIRIES_INITIAL);
  const [selected, setSelected] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [newForm, setNewForm] = useState({ name: '', phone: '', eventType: 'Wedding', eventDate: '', guests: '', notes: '' });

  const filtered = filterStatus === 'all' ? inquiries : inquiries.filter(i => i.status === filterStatus);

  const handleAdd = () => {
    if (!newForm.name) return;
    const created = { ...newForm, id: `i${Date.now()}`, status: 'New Inquiry', source: 'Manual', value: 'TBD' };
    setInquiries(prev => [created, ...prev]);
    setNewForm({ name: '', phone: '', eventType: 'Wedding', eventDate: '', guests: '', notes: '' });
    setNewOpen(false);
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Inquiries</h1>
            <div className="flex gap-2 relative">
              <button
                onClick={() => setFilterOpen(o => !o)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded bg-white hover:bg-slate-50 flex items-center"
              >
                <Sliders className="w-4 h-4 mr-2" /> Filter
                {filterStatus !== 'all' && <span className="ml-2 w-2 h-2 rounded-full bg-slate-800 inline-block" />}
              </button>
              {filterOpen && (
                <div className="absolute top-10 right-20 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1 min-w-[160px]">
                  {['all', 'New Inquiry', 'Drafting', 'Quote Sent'].map(s => (
                    <button
                      key={s}
                      onClick={() => { setFilterStatus(s); setFilterOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between ${filterStatus === s ? 'font-medium text-slate-900' : 'text-slate-600'}`}
                    >
                      {s === 'all' ? 'All Statuses' : s}
                      {filterStatus === s && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setNewOpen(true)}
                className="px-3 py-1.5 text-sm bg-slate-900 text-white rounded hover:bg-slate-800 flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" /> New
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[520px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="px-4 py-3 font-medium border-r border-slate-200 w-1/4">Name</th>
                  <th className="px-4 py-3 font-medium border-r border-slate-200">Status</th>
                  <th className="px-4 py-3 font-medium border-r border-slate-200">Event Date</th>
                  <th className="px-4 py-3 font-medium border-r border-slate-200">Source</th>
                  <th className="px-4 py-3 font-medium">Est. Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(inquiry => (
                  <tr
                    key={inquiry.id}
                    onClick={() => setSelected(selected?.id === inquiry.id ? null : inquiry)}
                    className={`cursor-pointer transition-colors group ${selected?.id === inquiry.id ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-4 py-3 border-r border-slate-200 font-medium flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-slate-400" /> {inquiry.name}
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[inquiry.status] || 'bg-slate-100 text-slate-700'}`}>
                        {inquiry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-slate-200 text-slate-600">{inquiry.eventDate}</td>
                    <td className="px-4 py-3 border-r border-slate-200 text-slate-500 flex items-center">
                      {inquiry.source === 'OpenPhone' && <Phone className="w-3 h-3 mr-1" />} {inquiry.source}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{inquiry.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">No inquiries found.</div>}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-30 md:relative md:inset-auto md:z-auto md:w-80 border-l border-slate-200 bg-slate-50 p-6 flex flex-col gap-5 overflow-y-auto shadow-xl md:shadow-none">
          <div className="flex justify-between items-start">
            <h2 className="text-lg font-semibold text-slate-900">{selected.name}</h2>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Status', value: selected.status },
              { label: 'Event Type', value: selected.eventType },
              { label: 'Event Date', value: selected.eventDate },
              { label: 'Guests', value: selected.guests },
              { label: 'Phone', value: selected.phone },
              { label: 'Source', value: selected.source },
              { label: 'Est. Value', value: selected.value },
            ].map(({ label, value }) => value && (
              <div key={label}>
                <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                <div className="font-medium text-slate-800">{value}</div>
              </div>
            ))}
            {selected.notes && (
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Notes</div>
                <div className="text-slate-700 text-sm bg-white border border-slate-200 rounded p-2">{selected.notes}</div>
              </div>
            )}
          </div>
          <button
            onClick={() => navigateTo('quote-builder', { name: selected.name, guestCount: selected.guests, serviceStyle: 'Buffet', dietary: [] })}
            className="w-full bg-slate-900 text-white font-medium py-2 rounded-md hover:bg-slate-800 transition text-sm flex items-center justify-center"
          >
            <Calculator className="w-4 h-4 mr-2" /> Build Quote
          </button>
        </div>
      )}

      {/* New Inquiry Modal */}
      {newOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-8" onClick={() => setNewOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold">New Inquiry</h2>
              <button onClick={() => setNewOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4 text-sm">
              {[
                { label: 'Client Name *', field: 'name', type: 'text', placeholder: 'Full name' },
                { label: 'Phone', field: 'phone', type: 'tel', placeholder: '+1 (555) 000-0000' },
                { label: 'Event Date', field: 'eventDate', type: 'text', placeholder: 'e.g. June 15, 2027' },
                { label: 'Guest Count', field: 'guests', type: 'number', placeholder: '100' },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label className="block text-slate-500 mb-1">{label}</label>
                  <input
                    type={type}
                    value={newForm[field]}
                    onChange={e => setNewForm(p => ({ ...p, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none"
                  />
                </div>
              ))}
              <div>
                <label className="block text-slate-500 mb-1">Event Type</label>
                <select
                  value={newForm.eventType}
                  onChange={e => setNewForm(p => ({ ...p, eventType: e.target.value }))}
                  className="w-full p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white outline-none"
                >
                  {['Wedding', 'Corporate', 'Birthday', 'Social', 'Other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Notes</label>
                <textarea
                  value={newForm.notes}
                  onChange={e => setNewForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Dietary needs, venue, special requests..."
                  className="w-full p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none min-h-[70px]"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleAdd} className="flex-1 bg-slate-900 text-white py-2 rounded-md font-medium hover:bg-slate-800 transition text-sm">
                Create Inquiry
              </button>
              <button onClick={() => setNewOpen(false)} className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-md font-medium hover:bg-slate-50 transition text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenusView() {
  const [menus, setMenus] = useState(MOCK_MENUS);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [newOpen, setNewOpen] = useState(false);

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
              <p className="text-slate-500 text-sm mt-1">Manage your catering menu offerings and per-person pricing.</p>
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
                <div className="text-2xl font-bold text-slate-900 mb-1">£{menu.basePrice}<span className="text-sm font-normal text-slate-500">/pp</span></div>
                <div className="text-xs text-slate-400">{menu.minGuests}–{menu.maxGuests} guests</div>
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
              {!editing && <div className="text-sm text-slate-500 mt-0.5">£{selected.basePrice}/pp · {selected.type}</div>}
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
                  { label: 'Base Price (£/pp)', field: 'basePrice', type: 'number' },
                  { label: 'Min Guests', field: 'minGuests', type: 'number' },
                  { label: 'Max Guests', field: 'maxGuests', type: 'number' },
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

  // add £X for every N guests
  let m = low.match(/(?:add|charge|include)\s+£(\d+(?:\.\d+)?)\s+(?:for\s+)?every\s+(\d+)\s+(?:guests?|people|persons?)/);
  if (m) return { condition: 'guests > 0', action: `Add £${m[1]} per ${m[2]} guests`, expression: `⌊guests ÷ ${m[2]}⌋ × £${m[1]}`, confidence: 'high' };

  // add/apply X% surcharge if guests exceed/over N
  m = low.match(/(?:add|apply|charge)\s+(\d+(?:\.\d+)?)%\s*(?:surcharge|markup|extra|more)?\s+(?:if|when)\s+guests?\s+(?:exceed|over|more\s+than|is\s+over|goes\s+over|>)\s*(\d+)/);
  if (m) return { condition: `guests > ${m[2]}`, action: `Add ${m[1]}% surcharge`, expression: `total × ${fmtMultiplier(1 + fix(m[1]) / 100)}`, confidence: 'high' };

  // apply X% discount if guests exceed N (volume)
  m = low.match(/(?:apply|give|add|offer)\s+(\d+(?:\.\d+)?)%\s+(?:volume\s+)?discount\s+(?:if|when|for)\s+guests?\s+(?:exceed|over|more\s+than|>)\s*(\d+)/);
  if (m) return { condition: `guests > ${m[2]}`, action: `Apply ${m[1]}% discount`, expression: `total × ${fmtMultiplier(1 - fix(m[1]) / 100)}`, confidence: 'high' };

  // apply X% discount if guests below N
  m = low.match(/(?:apply|give|add|offer)\s+(\d+(?:\.\d+)?)%\s+discount\s+(?:if|when|for)\s+guests?\s+(?:below|under|less\s+than|<)\s*(\d+)/);
  if (m) return { condition: `guests < ${m[2]}`, action: `Apply ${m[1]}% discount`, expression: `total × ${fmtMultiplier(1 - fix(m[1]) / 100)}`, confidence: 'high' };

  // add £X if guests exceed N
  m = low.match(/(?:add|charge|apply)\s+(?:a\s+)?(?:flat\s+)?£(\d+(?:\.\d+)?)\s+(?:fee\s+)?(?:if|when)\s+guests?\s+(?:exceed|over|more\s+than|>|is\s+over)\s*(\d+)/);
  if (m) return { condition: `guests > ${m[2]}`, action: `Add flat fee £${m[1]}`, expression: `total += £${m[1]}`, confidence: 'high' };

  // minimum quote/total of £X
  m = low.match(/minimum\s+(?:quote|total|price|charge|order)?\s*(?:of\s+)?£(\d+(?:\.\d+)?)/);
  if (m) return { condition: `total < £${m[1]}`, action: `Enforce minimum of £${m[1]}`, expression: `total = max(total, £${m[1]})`, confidence: 'high' };

  // charge £X per person/head/pp
  m = low.match(/(?:add|charge)\s+£(\d+(?:\.\d+)?)\s+per\s+(?:person|head|pp|guest)/);
  if (m) return { condition: 'guests > 0', action: `Add £${m[1]} per person`, expression: `total += guests × £${m[1]}`, confidence: 'high' };

  // X% surcharge for plated/buffet/family style
  m = low.match(/(\d+(?:\.\d+)?)%\s+(?:surcharge|markup|extra)\s+for\s+(plated|buffet|family\s+style|cocktail)/);
  if (m) { const s = m[2].replace(/\b\w/g, c => c.toUpperCase()).replace('Style', 'Style'); return { condition: `serviceStyle = ${s}`, action: `Apply ${m[1]}% surcharge`, expression: `total × ${fmtMultiplier(1 + fix(m[1]) / 100)}`, confidence: 'high' }; }

  // add £X for plated/buffet/family style
  m = low.match(/(?:add|charge)\s+£(\d+(?:\.\d+)?)\s+for\s+(plated|buffet|family\s+style|cocktail)/);
  if (m) { const s = m[2].replace(/\b\w/g, c => c.toUpperCase()).replace('Style', 'Style'); return { condition: `serviceStyle = ${s}`, action: `Add flat fee £${m[1]}`, expression: `total += £${m[1]}`, confidence: 'high' }; }

  // add £X for weekend/bank holiday
  m = low.match(/(?:add|charge)\s+£(\d+(?:\.\d+)?)\s+for\s+(?:weekend|bank\s+holiday|public\s+holiday)/);
  if (m) { const type = low.includes('weekend') ? 'Weekend' : 'Bank holiday'; return { condition: `day = ${type}`, action: `Add ${type} surcharge £${m[1]}`, expression: `total += £${m[1]}`, confidence: 'high' }; }

  // charge £X per dietary requirement
  m = low.match(/(?:add|charge)\s+£(\d+(?:\.\d+)?)\s+per\s+(?:dietary|vegan|allergy|requirement|special\s+requirement)/);
  if (m) return { condition: 'dietaryCount > 0', action: `Add £${m[1]} per dietary req`, expression: `total += dietaryCount × £${m[1]}`, confidence: 'high' };

  // multiply [total/food/staff] by X
  m = low.match(/multiply\s+(?:total|food|staff|labor|labour)\s+by\s+(\d+(?:\.\d+)?)/);
  if (m) return { condition: 'always', action: `Multiply total by ${m[1]}`, expression: `total × ${m[1]}`, confidence: 'high' };

  // reduce/subtract/deduct £X if/when
  m = low.match(/(?:reduce|subtract|deduct|remove)\s+£(\d+(?:\.\d+)?)\s+(?:if|when|for)\s+(.+)/);
  if (m) return { condition: m[2].trim(), action: `Deduct £${m[1]}`, expression: `total -= £${m[1]}`, confidence: 'medium' };

  // add X% for [event type]
  m = low.match(/add\s+(\d+(?:\.\d+)?)%\s+(?:surcharge\s+)?for\s+(wedding|corporate|birthday|social)/);
  if (m) { const et = m[2].charAt(0).toUpperCase() + m[2].slice(1); return { condition: `eventType = ${et}`, action: `Add ${m[1]}% surcharge`, expression: `total × ${fmtMultiplier(1 + fix(m[1]) / 100)}`, confidence: 'high' }; }

  // fallback — has a £ amount but pattern unknown
  if (/£\d+/.test(low) && t.length > 8) return { condition: '—', action: t, expression: 'Pattern not recognised', confidence: 'low' };

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
    'add £100 for every 30 guests',
    'apply 10% discount if guests exceed 150',
    'add 15% surcharge for plated service',
    'minimum quote of £2000',
    'charge £50 per dietary requirement',
    'add £200 for weekend events',
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
                  Try: "add £X for every N guests", "apply X% surcharge if guests exceed N", "minimum quote of £X", etc.
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

function SettingsView() {
  const [copied, setCopied] = useState(false);
  const [testStatus, setTestStatus] = useState(null);

  const webhookUrl = 'https://api.getmyquote.app/webhooks/openphone/catch';

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTest = () => {
    setTestStatus('loading');
    setTimeout(() => setTestStatus('success'), 1500);
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Settings & Integrations</h1>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold flex items-center">
            <Phone className="w-5 h-5 mr-2 text-indigo-600" /> OpenPhone Integration
          </h2>
          <p className="text-sm text-slate-500 mt-1">Connect OpenPhone to automatically transcribe calls and extract catering requirements.</p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
            <input
              type="password"
              defaultValue="op_live_xxxxxxxxxxxxxxxxxxxx"
              readOnly
              className="w-full p-2 border border-slate-300 rounded bg-slate-50 text-slate-500 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Webhook URL</label>
            <div className="flex">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex-1 p-2 border border-slate-300 rounded-l bg-slate-50 text-slate-500 font-mono text-sm"
              />
              <button
                onClick={handleCopy}
                className={`px-4 border border-l-0 border-slate-300 rounded-r transition-colors flex items-center gap-2 text-sm ${copied ? 'bg-green-50 text-green-700' : 'bg-white hover:bg-slate-50 text-slate-600'}`}
              >
                {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {testStatus === 'success' && (
              <span className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Connection successful
              </span>
            )}
            {testStatus === 'loading' && <span className="text-sm text-slate-500">Testing connection...</span>}
            {!testStatus && <span />}
            <button
              onClick={handleTest}
              disabled={testStatus === 'loading'}
              className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              Test Connection
            </button>
          </div>
        </div>
      </div>

      {/* Business Details */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-semibold">Business Details</h2>
          <p className="text-sm text-slate-500 mt-1">Appears on client-facing quotes and previews.</p>
        </div>
        <div className="p-6 space-y-4 text-sm">
          {[
            { label: 'Business Name', value: 'Elite Catering Co.' },
            { label: 'Contact Email', value: 'quotes@elitecatering.com' },
            { label: 'Phone', value: '+1 (555) 800-2200' },
            { label: 'Default Admin Fee %', value: '18' },
          ].map(({ label, value }) => (
            <div key={label}>
              <label className="block text-slate-500 mb-1">{label}</label>
              <input
                type="text"
                defaultValue={value}
                className="w-full p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all"
              />
            </div>
          ))}
          <div className="pt-2 flex justify-end">
            <button className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition shadow-sm">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Call Log View ────────────────────────────────────────────────────────────
function CallLogView({ initialId, navigateTo }) {
  const [selectedId, setSelectedId] = useState(
    (typeof initialId === 'string' ? initialId : null) || MOCK_CALL_LOGS[0].id
  );
  const [activeTab, setActiveTab]   = useState('transcript');
  const [fabState, setFabState]     = useState('icon'); // icon | keypad | active
  const [dialNumber, setDialNumber] = useState('');
  const [callSeconds, setCallSeconds] = useState(0);
  const [callMuted, setCallMuted]   = useState(false);
  const [callHeld,  setCallHeld]    = useState(false);
  const [liveLines, setLiveLines]   = useState([]);
  const [showDetail, setShowDetail] = useState(typeof initialId === 'string');
  const timerRef   = useRef(null);
  const timeoutIds = useRef([]);

  const selected = MOCK_CALL_LOGS.find(c => c.id === selectedId) || MOCK_CALL_LOGS[0];
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const LIVE_DEMO = [
    { speaker: 'You',    text: "Thanks for calling Elite Catering. How can I help?" },
    { speaker: 'Client', text: "Hi, I'm looking for catering for a wedding next summer." },
    { speaker: 'You',    text: "Wonderful! Do you have a date and venue in mind?" },
    { speaker: 'Client', text: "June 15th at River Grove Estate, around 120 guests." },
    { speaker: 'You',    text: "Perfect. Plated dinner or buffet?" },
    { speaker: 'Client', text: "Plated dinner — and we need some vegan options too." },
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

  const handleCallAgain = phone => {
    setDialNumber(phone);
    setFabState('keypad');
  };

  const selectCall = id => {
    setSelectedId(id);
    setActiveTab('transcript');
    setShowDetail(true);
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

  const tabs = [
    { id: 'transcript', label: 'Transcript' },
    { id: 'quote',      label: 'Quote' },
    { id: 'messages',   label: `Messages${selected.messages.length > 0 ? ` (${selected.messages.length})` : ''}` },
    { id: 'invoice',    label: 'Invoice' },
  ];

  return (
    <div className="flex h-full overflow-hidden relative">

      {/* ── Left: call list ── */}
      <div className={`w-full md:w-72 lg:w-80 border-r border-slate-200 flex-col bg-white flex-shrink-0 ${showDetail ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Call Log</h2>
            <p className="text-xs text-slate-400 mt-0.5">{MOCK_CALL_LOGS.length} calls</p>
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
          {MOCK_CALL_LOGS.map(call => {
            const st = CALL_STATUS[call.status] || CALL_STATUS.new;
            const isSel = selectedId === call.id;
            return (
              <button
                key={call.id}
                onClick={() => selectCall(call.id)}
                className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors border-l-[3px] ${isSel ? 'bg-slate-50 border-l-slate-900' : 'border-l-transparent'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 flex-shrink-0">
                      {call.caller.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 text-sm truncate">{call.caller}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{call.date}</div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${st.bgCls} ${st.textCls}`}>
                      <span className={`w-1 h-1 rounded-full flex-shrink-0 ${st.dotCls}`} />
                      {st.label}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-1">{call.duration}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-1.5 pl-10 truncate">
                  {call.extracted?.eventType} · {call.extracted?.guestCount ?? '—'} guests
                </div>
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
                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 flex-shrink-0 text-sm">
                  {selected.caller.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 text-sm">{selected.caller}</div>
                  <div className="text-xs text-slate-500 truncate">{selected.phone} · {selected.date} · {selected.duration}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleCallAgain(selected.phone)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                >
                  <PhoneForwarded className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Call again</span>
                </button>
              </div>
            </div>

            {/* Recording bar */}
            {selected.hasRecording && (
              <div className="px-4 md:px-6 py-2.5 bg-slate-900 text-white flex items-center gap-3 flex-shrink-0">
                <button className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0 transition-colors">
                  <Play className="w-3.5 h-3.5 ml-0.5" />
                </button>
                <div className="flex items-center gap-0.5 h-5 flex-1 min-w-0">
                  {Array.from({ length: 56 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-0.5 bg-green-400/50 rounded-full flex-shrink-0"
                      style={{ height: `${Math.max(15, Math.min(90, 35 + Math.sin(i * 0.9) * 28 + Math.cos(i * 0.35) * 18))}%` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{selected.duration}</span>
                <button className="text-slate-500 hover:text-white transition-colors flex-shrink-0">
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
                          <div className="font-semibold text-slate-900">{selected.caller} — Catering Quote</div>
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
                            <div className="text-3xl font-bold text-slate-900">£{selected.quote.amount.toLocaleString()}</div>
                          </div>
                          <button
                            onClick={() => navigateTo('quote-builder', selected.extracted)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                          >
                            <FileEdit className="w-4 h-4" /> View / Edit
                          </button>
                        </div>
                        <div className="flex gap-2.5">
                          <button className="flex-1 flex items-center justify-center gap-2 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                            <Send className="w-3.5 h-3.5" /> Send to client
                          </button>
                          <button className="flex-1 flex items-center justify-center gap-2 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors">
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
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                      <Mail className="w-4 h-4" /> Send Email
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-white transition-colors">
                      <MessageSquare className="w-4 h-4" /> Send SMS
                    </button>
                  </div>
                </div>
              )}

              {/* ── INVOICE ── */}
              {activeTab === 'invoice' && (
                <div className="p-4 md:p-6 max-w-lg">
                  {selected.invoice ? (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">Invoice #{selected.invoice.id}</div>
                          <div className="text-xs text-slate-400 mt-0.5">Due {selected.invoice.dueDate}</div>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${selected.invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {selected.invoice.status}
                        </span>
                      </div>
                      <div className="p-5 space-y-3">
                        {selected.invoice.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm gap-4">
                            <span className="text-slate-600">{item.desc}</span>
                            <span className="font-semibold text-slate-900 flex-shrink-0">£{item.amount.toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="border-t border-slate-100 pt-3 flex justify-between font-bold text-slate-900">
                          <span>Total</span>
                          <span>£{selected.invoice.amount.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="px-5 pb-5 flex gap-2.5">
                        <button className="flex-1 flex items-center justify-center gap-2 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        {selected.invoice.status !== 'paid' && (
                          <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors">
                            <Send className="w-3.5 h-3.5" /> Send
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                      <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center">
                        <ReceiptText className="w-7 h-7 text-slate-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">No invoice yet</div>
                        <div className="text-sm text-slate-500 mt-1">Create an invoice once the quote is accepted</div>
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                        <Plus className="w-4 h-4" /> Create Invoice
                      </button>
                    </div>
                  )}
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
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Call</span>
            <button onClick={() => setFabState('icon')} className="text-slate-500 hover:text-white p-1 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
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
                onClick={() => { if (dialNumber) startLiveCall(); }}
                disabled={!dialNumber}
                className="flex-[2] h-10 bg-green-500 hover:bg-green-400 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-lg flex items-center justify-center gap-2 text-sm transition-colors"
              >
                <Phone className="w-3.5 h-3.5" /> Call
              </button>
            </div>
          </div>
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
function SearchOverlay({ onClose, navigateTo }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const allItems = [
    ...MOCK_CALL_LOGS.map(c => ({ type: 'Call', label: c.caller, sub: `${c.extracted.eventType} • ${c.date}`, action: () => navigateTo('calls', c.id) })),
    ...MOCK_QUOTES.map(q => ({ type: 'Quote', label: q.client, sub: `${q.eventType} • £${q.amount.toLocaleString()} • ${q.status}`, action: () => navigateTo('quotes') })),
    ...MOCK_INQUIRIES_INITIAL.map(i => ({ type: 'Inquiry', label: i.name, sub: `${i.eventType} • ${i.status}`, action: () => navigateTo('inquiries') })),
    ...MOCK_MENUS.map(m => ({ type: 'Menu', label: m.name, sub: `${m.type} • £${m.basePrice}/pp`, action: () => navigateTo('menus') })),
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
  const [newField, setNewField] = useState({ label: '', type: 'text', options: '', price: '', priceUnit: 'per_head', formulaExpression: '', content: '' });
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
  const transcriptRef = useRef(null);   // DOM scroll ref
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
    { key: 'dcf_etype',   label: 'Event Type',             type: 'select',      options: ['Wedding','Corporate','Birthday','Social','Other'], price: 0, priceUnit: 'per_head', formulaExpression: '', content: '', suggested: false },
    { key: 'dcf_date',    label: 'Event Date',             type: 'date',        options: [], price: 0, priceUnit: 'per_head', formulaExpression: '', content: '', suggested: false },
    { key: 'dcf_guests',  label: 'Guest Count',            type: 'number',      options: [], price: 0, priceUnit: 'per_head', formulaExpression: '', content: '', suggested: false },
    { key: 'dcf_venue',   label: 'Venue',                  type: 'text',        options: [], price: 0, priceUnit: 'per_head', formulaExpression: '', content: '', suggested: false },
    { key: 'dcf_style',   label: 'Service Style',          type: 'select',      options: ['Plated','Buffet','Family Style','Canapés','BBQ'], price: 0, priceUnit: 'per_head', formulaExpression: '', content: '', suggested: false },
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
    setTimeout(() => setCallState('active'), 1500); // Remove when Twilio is wired
  };
  const endCall = () => {
    // TODO: Twilio.Device.disconnectAll()
    stopMic();
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
      suggested: false,
    }]);
    setNewField({ label: '', type: 'text', options: '', price: '', priceUnit: 'per_head', formulaExpression: '', content: '' });
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
    setStep('setup'); setMode('client'); setSelectedTemplateId('default'); setSavedBanner(null); setSession({ name: '', phone: '' }); setCallState('idle'); setCallSeconds(0);
    setTranscript([]); setFields([]); setFieldValues({});
    setAddingField(false); setNewField({ label: '', type: 'text', options: '', price: '', priceUnit: 'per_head', formulaExpression: '', content: '' });
    setLastAdded(null); setConversationSummary(''); setP1Transcript([]); setLineText('');
    setAiThinking(false); setApiError(null);
  };

  const typeDef = id => FIELD_TYPE_DEFS.find(d => d.id === id) || FIELD_TYPE_DEFS[0];

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
                <span className="text-sm text-slate-500 font-medium">£</span>
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
                <span className="font-semibold">{field.price > 0 ? `£${field.price}` : 'Set price'}</span>
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
              £{field.price || '—'} <span className="font-normal text-xs">{field.priceUnit === 'per_head' ? 'per head' : 'flat'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setVal(field.key, Math.max(0, (parseInt(val)||0) - 1))} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-700 font-bold text-lg leading-none">−</button>
              <span className="text-base font-bold text-slate-900 w-8 text-center tabular-nums">{parseInt(val) || 0}</span>
              <button onClick={() => setVal(field.key, (parseInt(val)||0) + 1)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-700 font-bold text-lg leading-none">+</button>
            </div>
            {field.price > 0 && (parseInt(val)||0) > 0 && (
              <span className="text-sm font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-xl">
                = £{(field.price * (parseInt(val)||0)).toFixed(2)}
              </span>
            )}
          </div>
        )}

        {field.type === 'currency' && (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">£</span>
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
                    <div className={`text-sm font-semibold ${selectedTemplateId === 'default' ? 'text-green-900' : 'text-slate-700'}`}>Default catering template</div>
                    <div className="text-[11px] text-slate-400">11 standard fields — name, event, guests, venue, dietary…</div>
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
                      <span className="text-sm text-amber-700 font-medium">£</span>
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
    const typeDef = id => FIELD_TYPE_DEFS.find(d => d.id === id) || FIELD_TYPE_DEFS[0];
    const SKIP = ['section-header','divider','instructions'];
    const savedName = session.name || 'Untitled form';
    return (
      <div className="h-full bg-[#F7F7F5] overflow-y-auto">
        <div className="w-full max-w-lg mx-auto py-10 px-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-1">Form saved</h2>
            <p className="text-slate-500 text-sm">
              <span className="font-semibold text-slate-700">{savedName}</span> has been saved to your template library.
            </p>
          </div>

          {conversationSummary && (
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">AI Summary</p>
              <p className="text-sm text-slate-600 leading-relaxed">{conversationSummary}</p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700">Saved intake form</h3>
              <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">{fields.filter(f => !SKIP.includes(f.type)).length} fields</span>
            </div>
            <div className="space-y-2.5">
              {fields.map(f => {
                if (f.type === 'divider') return <hr key={f.key} className="border-slate-100" />;
                if (f.type === 'section-header') return <div key={f.key} className="pt-1"><span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{f.label}</span></div>;
                if (f.type === 'instructions') return <div key={f.key} className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">{f.content || f.label}</div>;
                const def = typeDef(f.type);
                return (
                  <div key={f.key} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${def.bg}`}>
                      <def.Icon className={`w-3.5 h-3.5 ${def.text}`} />
                    </span>
                    <span className="text-sm text-slate-700">{f.label}</span>
                    <span className="text-[10px] text-slate-300 ml-auto">{def.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={reset}
              className="flex items-center gap-2 bg-slate-900 text-white px-8 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-700 transition-colors shadow-md"
            >
              Start new session
            </button>
          </div>
        </div>
      </div>
    );
  }

  // COMPLETE
  if (step === 'complete') {
    const LAYOUT_TYPES_COMPLETE = ['section-header','divider','instructions'];
    const renderCompleteValue = (f) => {
      if (LAYOUT_TYPES_COMPLETE.includes(f.type)) return null;
      const v = fieldValues[f.key];
      if (f.type === 'formula') return <span className="font-mono text-amber-800">{evaluateFormula(f.formulaExpression, fields, fieldValues)}</span>;
      if (v === undefined || v === '') return <span className="text-slate-300 italic">—</span>;
      if (f.type === 'toggle') return <span className={v ? 'text-green-700 font-semibold' : 'text-slate-500'}>{ v ? 'Yes' : 'No' }</span>;
      if (f.type === 'multi-check') return Array.isArray(v) && v.length ? v.join(', ') : <span className="text-slate-300 italic">—</span>;
      if (f.type === 'priced-item') {
        const qty = parseInt(v) || 0;
        return <span>{qty} {qty === 1 ? 'portion' : 'portions'}{f.price > 0 ? ` — £${(f.price * qty).toFixed(2)}` : ''}</span>;
      }
      if (f.type === 'currency') return `£${v}`;
      if (f.type === 'percentage') return `${v}%`;
      if (f.type === 'rating') return `${v} / 5 stars`;
      if (f.type === 'duration') return (v?.hours !== undefined) ? `${v.hours || 0}h ${v.minutes || 0}min` : String(v);
      if (f.type === 'email') return <a href={`mailto:${v}`} className="text-sky-600 underline">{v}</a>;
      if (f.type === 'url') return <a href={v} target="_blank" rel="noopener noreferrer" className="text-violet-600 underline">{v}</a>;
      if (f.type === 'long-text' || f.type === 'address') return <span className="whitespace-pre-wrap">{String(v)}</span>;
      return String(v);
    };
    const pricedTotal = fields
      .filter(f => f.type === 'priced-item' && f.price > 0 && parseInt(fieldValues[f.key]) > 0)
      .reduce((sum, f) => sum + f.price * (parseInt(fieldValues[f.key]) || 0), 0);
    const fillableFieldsComplete = fields.filter(f => !LAYOUT_TYPES_COMPLETE.includes(f.type) && f.type !== 'formula');
    const filledCount = fillableFieldsComplete.filter(f => {
      const v = fieldValues[f.key];
      return v !== undefined && v !== '' && v !== false && !(Array.isArray(v) && !v.length);
    }).length;
    return (
      <div className="h-full bg-[#F7F7F5] overflow-y-auto">
        <div className="w-full max-w-lg mx-auto py-8 px-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-1">Demo complete</h2>
            <p className="text-slate-500 text-sm">{session.name} — onboarding session finished.</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700">Completed intake form</h3>
              <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">{filledCount}/{fillableFieldsComplete.length} filled</span>
            </div>
            <div className="space-y-3">
              {fields.map(f => {
                if (f.type === 'divider') return <hr key={f.key} className="border-slate-100" />;
                if (f.type === 'section-header') return <div key={f.key} className="pt-2 pb-1"><span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{f.label}</span></div>;
                if (f.type === 'instructions') return <div key={f.key} className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">{f.content || f.label}</div>;
                const def = typeDef(f.type);
                return (
                  <div key={f.key} className="flex items-start gap-3">
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${def.bg}`}>
                      <def.Icon className={`w-3.5 h-3.5 ${def.text}`} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{f.label}</div>
                      <div className="text-sm text-slate-800">{renderCompleteValue(f)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {pricedTotal > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-0.5">Estimated food total</div>
                <div className="text-xs text-amber-600">Based on priced items selected</div>
              </div>
              <div className="text-2xl font-black text-amber-800">£{pricedTotal.toFixed(2)}</div>
            </div>
          )}
          {/* AI Conversation Log */}
          {(conversationSummary || p1Transcript.length > 0) && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                </div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">AI Conversation Log</span>
              </div>
              {conversationSummary && (
                <p className="text-sm text-slate-600 leading-relaxed mb-3">{conversationSummary}</p>
              )}
              {p1Transcript.length > 0 && (
                <details className="group">
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 select-none list-none flex items-center gap-1">
                    <svg className="w-3 h-3 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                    View full transcript ({p1Transcript.length} lines)
                  </summary>
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {p1Transcript.map((l, i) => (
                      <div key={i} className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{l.speaker}:</span> {l.text}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          <div className="flex justify-center gap-3">
            <button
              onClick={() => { setStep('p2'); setFieldValues({}); setTranscript([]); setCallState('idle'); setCallSeconds(0); }}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >Redo Customer Onboarding</button>
            <button
              onClick={reset}
              className="flex items-center gap-2 bg-slate-900 text-white px-8 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-700 transition-colors shadow-md"
            >New session</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
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

// --- SIDEBAR ---
function Sidebar({ currentView, navigateTo, onHome, isOpen, onClose }) {
  const navGroups = [
    {
      title: 'Workspace',
      items: [
        { id: 'dashboard', icon: Home, label: 'Dashboard' },
        { id: 'inquiries', icon: Inbox, label: 'Inquiries' },
        { id: 'quotes', icon: FileText, label: 'Quotes' },
        { id: 'calls', icon: Phone, label: 'Call Log', badge: '2' },
      ]
    },
    {
      title: 'Admin',
      items: [
        { id: 'onboarding', icon: UserPlus, label: 'Onboarding' },
        { id: 'templates', icon: LayoutGrid, label: 'Templates' },
        { id: 'price-list', icon: Tag, label: 'Price List' },
        { id: 'menus', icon: Package, label: 'Menus & Packages' },
        { id: 'pricing-rules', icon: Sliders, label: 'Pricing Rules' },
        { id: 'settings', icon: Settings, label: 'Settings' },
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
            <div className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{group.title}</div>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className={`w-full flex items-center px-3 py-1.5 rounded-md text-sm transition-colors ${
                    currentView === item.id
                      ? 'bg-slate-200/60 text-slate-900 font-medium'
                      : 'text-slate-600 hover:bg-slate-200/40 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`w-4 h-4 mr-3 ${currentView === item.id ? 'text-slate-800' : 'text-slate-400'}`} />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge && (
                    <span className="bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded ml-2 font-medium">{item.badge}</span>
                  )}
                </button>
              ))}
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
          <div className="font-medium text-slate-800">Elite Catering</div>
          <div className="text-xs">Admin Plan</div>
        </div>
      </div>
    </div>
    </>
  );
}
