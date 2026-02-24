import React, { useState, useRef, useEffect } from 'react';
import { TemplatesView, TemplateBuilderView } from './TemplateBuilder.jsx';
import PriceListView from './PriceList.jsx';
import {
  Home, Inbox, Phone, FileText, Settings,
  Menu as MenuIcon, Package, Sliders, Calendar,
  ChevronRight, Plus, Search, MoreHorizontal,
  CheckCircle2, Clock, AlertCircle, PhoneCall,
  FileEdit, Calculator, Trash2, Copy, Zap,
  X, Send, Eye, Check, Tag, DollarSign, Star,
  ChevronDown, Edit3, ArrowRight,
  Users, Activity, TrendingUp, Globe, Link2, Bell, Shield, LayoutGrid,
  Mic, MicOff, PhoneOff, Radio, Pause, Play, UserPlus
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
  { id: 'r1', condition: 'Service Style = Plated', action: 'Multiply Staff Labor by 1.4' },
  { id: 'r2', condition: 'Guest Count > 150', action: 'Apply 5% Volume Discount' },
  { id: 'r3', condition: 'Has Dietary: Vegan', action: 'Add £5 prep surcharge per vegan guest' },
  { id: 'r4', condition: 'Venue Zone = Outside Metro', action: 'Add flat £150 Travel Fee' }
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
export default function GetMyQuoteApp() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeRecord, setActiveRecord] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const navigateTo = (view, record = null) => {
    setCurrentView(view);
    setActiveRecord(record);
  };

  return (
    <div className="flex h-screen bg-white text-slate-800 font-sans antialiased overflow-hidden">
      <Sidebar currentView={currentView} navigateTo={navigateTo} />

      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white relative">
        <header className="h-14 border-b border-slate-200 flex items-center px-6 justify-between bg-white/80 backdrop-blur-sm z-10">
          <div className="flex items-center text-sm font-medium text-slate-500">
            <span onClick={() => navigateTo('workspace')} className="hover:bg-slate-100 px-2 py-1 rounded cursor-pointer transition-colors">Get My Quote Workspace</span>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-slate-800 capitalize px-2 py-1">{currentView.replace(/-/g, ' ')}</span>
            {activeRecord && (
              <>
                <ChevronRight className="w-4 h-4 mx-1" />
                <span className="text-slate-800 font-semibold px-2 py-1 truncate max-w-[200px]">
                  {activeRecord.name || activeRecord.caller || activeRecord.client || activeRecord.id}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-3">
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

        <main className="flex-1 overflow-auto">
          {currentView === 'workspace'     && <WorkspaceView navigateTo={navigateTo} />}
          {currentView === 'dashboard'     && <DashboardView navigateTo={navigateTo} />}
          {currentView === 'calls'         && <CallsListView navigateTo={navigateTo} />}
          {currentView === 'call-detail'   && <CallDetailView call={activeRecord} navigateTo={navigateTo} />}
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
      <div className="bg-slate-900 text-white px-10 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between">
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
            <div className="flex items-center gap-3">
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
          <div className="grid grid-cols-4 gap-4 mt-8">
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

      <div className="max-w-6xl mx-auto px-10 py-8">
        <div className="grid grid-cols-3 gap-8">

          {/* Left col: Quick actions + Activity */}
          <div className="col-span-2 space-y-8">

            {/* Quick Actions */}
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Quick Actions</h2>
              <div className="grid grid-cols-3 gap-3">
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

function DashboardView({ navigateTo }) {
  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8 pb-20">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Good morning, Team</h1>
          <p className="text-slate-500 mt-1">Here is what's happening today.</p>
        </div>
        <button
          onClick={() => navigateTo('quote-builder')}
          className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition shadow-sm flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" /> New Quote
        </button>
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
                onClick={() => navigateTo('call-detail', call)}
                className="group flex items-center justify-between p-3 -mx-3 rounded-md hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div>
                  <div className="font-medium text-slate-900 group-hover:text-blue-600">{call.caller}</div>
                  <div className="text-sm text-slate-500 mt-0.5">{call.extracted.eventType} • {call.duration}</div>
                </div>
                {call.status === 'transcribed' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    <Zap className="w-3 h-3 mr-1" /> Extracted
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
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Phone className="w-6 h-6 mr-3 text-slate-400" /> Call Inbox (OpenPhone)
          </h1>
          <p className="text-slate-500 mt-1">Live transcribed calls ready for quote generation.</p>
        </div>
      </div>
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
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
                    onClick={() => navigateTo('call-detail', call)}
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
    <div className="max-w-6xl mx-auto p-8 flex gap-8 h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="w-3/5 flex flex-col h-full bg-white border border-slate-200 rounded-lg shadow-sm">
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

      <div className="w-2/5 flex flex-col gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex-1 overflow-y-auto">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
            <Zap className="w-4 h-4 mr-2 text-yellow-500" /> AI Extracted Requirements
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
    <div className="max-w-7xl mx-auto p-6 flex gap-6 h-[calc(100vh-3.5rem)] relative">
      <div className="w-2/3 bg-white rounded-lg p-8 overflow-y-auto pb-32">
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
            <div className="grid grid-cols-2 gap-4 text-sm">
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
                className="w-1/2 p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none transition-all"
              />
              <p className="text-slate-400 text-xs mt-1">Tables, linens, glassware, AV, etc.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview Panel */}
      <div className="w-1/3 flex flex-col">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 shadow-sm sticky top-6">
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
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotes</h1>
          <p className="text-slate-500 mt-1 text-sm">All quotes across your pipeline.</p>
        </div>
        <button
          onClick={() => navigateTo('quote-builder')}
          className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition shadow-sm flex items-center"
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

      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
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
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Inquiries</h1>
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

          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
            <table className="w-full text-left text-sm border-collapse">
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
        <div className="w-80 border-l border-slate-200 bg-slate-50 p-6 flex flex-col gap-5 overflow-y-auto">
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
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Menus & Packages</h1>
              <p className="text-slate-500 text-sm mt-1">Manage your catering menu offerings and per-person pricing.</p>
            </div>
            <button
              onClick={handleNewMenu}
              className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition shadow-sm flex items-center"
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
        <div className="w-96 border-l border-slate-200 bg-white flex flex-col overflow-y-auto">
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

function PricingRulesView() {
  const [rules, setRules] = useState(MOCK_RULES_INITIAL);
  const [addOpen, setAddOpen] = useState(false);
  const [newRule, setNewRule] = useState({ condition: '', action: '' });

  const deleteRule = (id) => setRules(prev => prev.filter(r => r.id !== id));

  const addRule = () => {
    if (!newRule.condition || !newRule.action) return;
    setRules(prev => [...prev, { id: `r${Date.now()}`, ...newRule }]);
    setNewRule({ condition: '', action: '' });
    setAddOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Pricing Rules Engine</h1>
        <p className="text-slate-500 text-sm">Rules run sequentially when a quote is generated. Drag to reorder.</p>
      </div>

      <div className="space-y-4">
        {rules.map((rule, idx) => (
          <div key={rule.id} className="border border-slate-200 rounded-lg p-4 bg-white flex items-center justify-between shadow-sm hover:border-slate-300 transition-colors group">
            <div className="flex items-center space-x-4">
              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-medium flex-shrink-0">
                {idx + 1}
              </div>
              <div className="flex items-center flex-wrap gap-2 text-sm">
                <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">IF</span>
                <span className="text-slate-900">{rule.condition}</span>
                <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">THEN</span>
                <span className="text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded">{rule.action}</span>
              </div>
            </div>
            <button
              onClick={() => deleteRule(rule.id)}
              className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-4 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {addOpen ? (
          <div className="border-2 border-slate-300 rounded-lg p-5 bg-white space-y-4">
            <div className="text-sm font-semibold text-slate-700 mb-3">New Rule</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-slate-500 mb-1 text-xs uppercase tracking-wider">IF condition</label>
                <input
                  type="text"
                  value={newRule.condition}
                  onChange={e => setNewRule(p => ({ ...p, condition: e.target.value }))}
                  placeholder="e.g. Guest Count > 200"
                  className="w-full p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 text-xs uppercase tracking-wider">THEN action</label>
                <input
                  type="text"
                  value={newRule.action}
                  onChange={e => setNewRule(p => ({ ...p, action: e.target.value }))}
                  placeholder="e.g. Apply 10% discount"
                  className="w-full p-2 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={addRule} className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition">
                Add Rule
              </button>
              <button onClick={() => setAddOpen(false)} className="border border-slate-300 text-slate-600 px-4 py-2 rounded-md text-sm hover:bg-slate-50 transition">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddOpen(true)}
            className="w-full border-2 border-dashed border-slate-200 rounded-lg p-4 text-center text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-center text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-2" /> Add New Rule
          </button>
        )}
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

// --- SEARCH OVERLAY ---
function SearchOverlay({ onClose, navigateTo }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const allItems = [
    ...MOCK_CALLS.map(c => ({ type: 'Call', label: c.caller, sub: `${c.extracted.eventType} • ${c.date}`, action: () => navigateTo('call-detail', c) })),
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

// --- SIDEBAR ---
function Sidebar({ currentView, navigateTo }) {
  const navGroups = [
    {
      title: 'Workspace',
      items: [
        { id: 'dashboard', icon: Home, label: 'Dashboard' },
        { id: 'inquiries', icon: Inbox, label: 'Inquiries' },
        { id: 'quotes', icon: FileText, label: 'Quotes' },
        { id: 'calls', icon: Phone, label: 'Calls (OpenPhone)', badge: '2' },
      ]
    },
    {
      title: 'Admin',
      items: [
        { id: 'templates', icon: LayoutGrid, label: 'Templates' },
        { id: 'price-list', icon: Tag, label: 'Price List' },
        { id: 'menus', icon: Package, label: 'Menus & Packages' },
        { id: 'pricing-rules', icon: Sliders, label: 'Pricing Rules' },
        { id: 'settings', icon: Settings, label: 'Settings' },
      ]
    }
  ];

  return (
    <div className="w-64 bg-[#F7F7F5] border-r border-slate-200 h-full flex flex-col z-20">
      <div className="h-14 flex items-center px-4 font-semibold text-slate-800 border-b border-transparent">
        <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center mr-2 text-white shadow-sm">
          <MenuIcon className="w-4 h-4" />
        </div>
        Get My Quote
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
  );
}
