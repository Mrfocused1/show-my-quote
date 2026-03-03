import React, { useState, useEffect, useRef } from 'react';
import {
  Phone, FileText, TrendingUp, DollarSign, Calendar,
  Users, ChevronRight, Inbox, Settings, LayoutGrid,
  Tag, Package, Sliders, PhoneOff, Pause, Mic, Radio, Home,
  X, CheckCircle2
} from 'lucide-react';

// ─── Integration logos ────────────────────────────────────────────────────────

const INTEGRATIONS = [
  { name: 'Excel',           slug: 'microsoftexcel',  color: '#217346' },
  { name: 'Gmail',           slug: 'gmail',           color: '#EA4335' },
  { name: 'Notion',          slug: 'notion',          color: '#000000' },
  { name: 'Google Calendar', slug: 'googlecalendar',  color: '#4285F4' },
  { name: 'Xero',            slug: 'xero',            color: '#13B5EA' },
  { name: 'Slack',           slug: 'slack',           color: '#4A154B' },
  { name: 'WhatsApp',        slug: 'whatsapp',        color: '#25D366' },
  { name: 'Stripe',          slug: 'stripe',          color: '#635BFF' },
  { name: 'Zapier',          slug: 'zapier',          color: '#FF4A00' },
  { name: 'HubSpot',         slug: 'hubspot',         color: '#FF7A59' },
  { name: 'Outlook',         slug: 'microsoftoutlook',color: '#0078D4' },
  { name: 'Google Sheets',   slug: 'googlesheets',    color: '#34A853' },
  { name: 'QuickBooks',      slug: 'quickbooks',      color: '#2CA01C' },
  { name: 'Mailchimp',       slug: 'mailchimp',       color: '#FFE01B' },
];

function BrandIcon({ slug, color }) {
  const [html, setHtml] = useState(null);
  useEffect(() => {
    fetch(`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${slug}.svg`)
      .then(r => r.text())
      .then(text => setHtml(text.replace('<svg ', `<svg fill="${color}" `)))
      .catch(() => {});
  }, [slug]);
  return (
    <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: html || '' }} />
  );
}

const ROTATING_WORDS = ['quote', 'paperwork', 'typing', 'measuring', 'admin', 'follow-up'];

function RotatingWord() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % ROTATING_WORDS.length);
        setVisible(true);
      }, 350);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="text-green-600"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.35s ease' }}
    >
      {ROTATING_WORDS[index]}
    </span>
  );
}

function IntegrationTicker() {
  return (
    <div
      className="overflow-hidden mt-1"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
      }}
    >
      <div className="flex anim-marquee" style={{ width: 'max-content' }}>
        {[...INTEGRATIONS, ...INTEGRATIONS].map((item, i) => (
          <div key={i} className="mx-3 flex-shrink-0">
            <div className="w-14 h-14 flex items-center justify-center p-1">
              <BrandIcon slug={item.slug} color={item.color} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const FORM_FIELDS = [
  { key: 'name',     label: 'Customer Name',   placeholder: 'Listening…', half: false },
  { key: 'address',  label: 'Job Address',     placeholder: 'Listening…', half: false },
  { key: 'type',     label: 'Work Type',       placeholder: 'Listening…', half: true  },
  { key: 'size',     label: 'Roof Size',       placeholder: 'Listening…', half: true  },
  { key: 'pitch',    label: 'Pitch / Slope',   placeholder: 'Listening…', half: true  },
  { key: 'stories',  label: 'Storeys',         placeholder: 'Listening…', half: true  },
  { key: 'material', label: 'Material',        placeholder: 'Listening…', half: true  },
  { key: 'tearoff',  label: 'Tear-off',        placeholder: 'Listening…', half: true  },
];

const DEMO_SEQUENCE = [
  { delay: 1200,
    line: { speaker: 'You', text: "Thanks for calling — what can I help you with today?" } },
  { delay: 5000,
    line: { speaker: 'Client', text: "Hey, this is Mike Harris. My roof's had it — I need a full replacement." },
    fills: [{ field: 'name', value: 'Mike Harris' }, { field: 'type', value: 'Full replacement' }] },
  { delay: 10000,
    line: { speaker: 'Client', text: "Property's at 4821 Westgate Drive, Houston." },
    fills: [{ field: 'address', value: '4821 Westgate Dr, Houston TX' }] },
  { delay: 14500,
    line: { speaker: 'You', text: "Got it. How many stories, and any idea on the roof size?" } },
  { delay: 18000,
    line: { speaker: 'Client', text: "Two stories. I'd say about 28 squares." },
    fills: [{ field: 'stories', value: '2 stories' }, { field: 'size', value: '~28 squares' }] },
  { delay: 23000,
    line: { speaker: 'You', text: "What's the pitch like — is it steep or more moderate?" } },
  { delay: 26500,
    line: { speaker: 'Client', text: "Moderate, maybe a 6:12. And I want architectural shingles, 30-year." },
    fills: [{ field: 'pitch', value: '6:12 (moderate)' }, { field: 'material', value: '30-yr architectural' }] },
  { delay: 32000,
    line: { speaker: 'You', text: "We'll need to tear off the old one — is it a single layer?" } },
  { delay: 34500,
    line: { speaker: 'Client', text: "Yeah, just the one layer. How soon can you get out there?" },
    fills: [{ field: 'tearoff', value: 'Yes — 1 layer' }] },
];

const LOOP_TOTAL = DEMO_SEQUENCE[DEMO_SEQUENCE.length - 1].delay + 5500;

// ─── Sidebar icons ────────────────────────────────────────────────────────────

const SIDE_NAV = [
  { Icon: Home,       active: false },
  { Icon: Inbox,      active: false },
  { Icon: Phone,      active: true  },   // Calls — active
  { Icon: FileText,   active: false },
  { Icon: TrendingUp, active: false },
  { Icon: DollarSign, active: false },
  { Icon: LayoutGrid, active: false },
  { Icon: Tag,        active: false },
  { Icon: Package,    active: false },
  { Icon: Sliders,    active: false },
  { Icon: Settings,   active: false },
];

// ─── Live Call Demo ───────────────────────────────────────────────────────────

function LiveCallDemo() {
  const [phase, setPhase]         = useState('dialling');
  const [transcript, setTranscript] = useState([]);
  const [formData, setFormData]   = useState({});
  const [recentField, setRecentField] = useState(null);
  const [timer, setTimer]         = useState(0);
  const transcriptRef = useRef(null);
  const timerRef      = useRef(null);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  useEffect(() => {
    const ids = [];

    const run = () => {
      setPhase('dialling');
      setTranscript([]);
      setFormData({});
      setRecentField(null);
      setTimer(0);
      clearInterval(timerRef.current);

      ids.push(setTimeout(() => {
        setPhase('live');
        timerRef.current = setInterval(() => setTimer(s => s + 1), 1000);
      }, 1000));

      DEMO_SEQUENCE.forEach(({ delay, line, fills }) => {
        ids.push(setTimeout(() => {
          if (line) setTranscript(p => [...p, { ...line, id: Math.random() }]);
          if (fills) {
            fills.forEach(({ field, value }) => {
              setFormData(p => ({ ...p, [field]: value }));
              setRecentField(field);
              ids.push(setTimeout(() => setRecentField(f => f === field ? null : f), 1800));
            });
          }
        }, delay));
      });

      ids.push(setTimeout(() => { setPhase('done'); clearInterval(timerRef.current); }, LOOP_TOTAL - 3000));
      ids.push(setTimeout(() => { clearInterval(timerRef.current); run(); }, LOOP_TOTAL));
    };

    ids.push(setTimeout(run, 400));
    return () => { ids.forEach(clearTimeout); clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (transcriptRef.current)
      transcriptRef.current.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript]);

  // ── Dialling screen ──────────────────────────────────────────────────────────
  if (phase === 'dialling') {
    return (
      <div className="bg-white flex-1 h-full flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <Phone className="w-6 h-6 text-green-600" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-green-500/40 animate-ping" />
        </div>
        <div className="text-center">
          <div className="text-slate-900 font-bold text-sm">Mike Harris</div>
          <div className="text-slate-400 text-xs mt-0.5">+1 (713) 555-0142</div>
          <div className="text-slate-400 text-xs mt-2 animate-pulse">Connecting…</div>
        </div>
      </div>
    );
  }

  // ── Live / Done screen ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* Top bar — exact match to real app's call header */}
      <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Recording</span>
          </div>
          <div className="h-3 w-px bg-white/20" />
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${
            phase === 'live'
              ? 'bg-[#F0F0EE]0/20 text-green-400 border-green-500/30'
              : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
          }`}>
            {phase === 'live' ? 'LIVE' : 'ENDED'}
          </span>
          <span className="text-xs font-mono font-bold">{fmt(timer)}</span>
        </div>
        <span className="hidden sm:inline text-[10px] font-semibold text-slate-300">Live Call Dashboard</span>
        <div className="flex items-center gap-1.5">
          <button className="flex items-center gap-1 px-1.5 py-1 rounded text-[9px] font-medium bg-white/10 text-slate-300">
            <Mic className="w-2.5 h-2.5" /> Mute
          </button>
          <button className="flex items-center gap-1 px-1.5 py-1 rounded text-[9px] font-medium bg-white/10 text-slate-300">
            <Pause className="w-2.5 h-2.5" /> Hold
          </button>
          <button className="flex items-center gap-1 px-1.5 py-1 rounded text-[9px] font-medium bg-red-500 text-white ml-1">
            <PhoneOff className="w-2.5 h-2.5" /> End
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: auto-fill form ── */}
        <div className="border-r border-slate-100 overflow-y-auto p-3" style={{ width: '55%' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">Client Details</span>
            <span className="text-[7px] bg-[#F0F0EE] text-green-700 border border-green-100 px-1 py-0.5 rounded-full font-semibold">
              Auto-filling from call
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FORM_FIELDS.map(f => {
              const highlighted = recentField === f.key;
              const filled      = !!formData[f.key];
              return (
                <div key={f.key} className={f.half ? 'w-[calc(50%-4px)]' : 'w-full'}>
                  <label className="text-[7px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                    {f.label}
                    {highlighted && (
                      <span className="text-[7px] text-green-600 normal-case tracking-normal animate-pulse">● filling</span>
                    )}
                    {filled && !highlighted && (
                      <span className="text-[7px] text-green-500">✓</span>
                    )}
                  </label>
                  <input
                    readOnly
                    value={formData[f.key] || ''}
                    placeholder={f.placeholder}
                    className={`w-full px-1.5 py-0.5 rounded border text-[7px] outline-none transition-all duration-300 ${
                      highlighted
                        ? 'border-green-400 bg-[#F0F0EE] text-green-900 shadow-sm shadow-green-100'
                        : filled
                        ? 'border-slate-300 bg-white text-slate-900'
                        : 'border-slate-200 bg-slate-50 text-slate-300'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: live transcript ── */}
        <div className="flex flex-col bg-slate-50 overflow-hidden" style={{ width: '45%' }}>
          <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-1.5 flex-shrink-0">
            <Radio className="w-3 h-3 text-slate-400" />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Live Transcript</span>
          </div>

          <div ref={transcriptRef} className="flex-1 overflow-hidden p-3 space-y-3">
            {transcript.length === 0 ? (
              <div className="flex items-center justify-center h-full gap-1 py-8">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"
                    style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            ) : (
              transcript.map(line => (
                <div key={line.id}
                  className={`flex gap-2 anim-slide-up ${line.speaker === 'You' ? '' : 'flex-row-reverse'}`}>
                  <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold ${
                    line.speaker === 'You' ? 'bg-slate-200 text-slate-700' : 'bg-sky-400 text-white'
                  }`}>
                    {line.speaker[0]}
                  </div>
                  <div className={`max-w-[82%] px-2.5 py-2 rounded-2xl text-[10px] leading-relaxed ${
                    line.speaker === 'You'
                      ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                      : 'bg-sky-400 text-white rounded-tr-sm'
                  }`}>
                    {line.text}
                  </div>
                </div>
              ))
            )}
            {transcript.length > 0 && phase === 'live' && (
              <div className="flex gap-1 pl-7">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"
                    style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App Mockup Shell ─────────────────────────────────────────────────────────

function AppMockup() {
  return (
    <div className="w-full h-full rounded-tl-2xl overflow-hidden shadow-2xl flex"
         style={{ border: '1px solid rgba(148,163,184,0.3)' }}>

      {/* Sidebar — matches real app: bg-[#F7F7F5], light nav items */}
      <div className="bg-[#F7F7F5] border-r border-slate-200 flex flex-col items-center pt-2.5 pb-3 flex-shrink-0"
           style={{ width: '40px' }}>
        {SIDE_NAV.map(({ Icon, active }, i) => (
          <div key={i}
            className={`w-7 h-7 rounded-md flex items-center justify-center mb-0.5 transition-colors ${
              active ? 'bg-slate-200/60' : ''
            }`}>
            <Icon className={`w-3.5 h-3.5 ${active ? 'text-slate-800' : 'text-slate-400'}`} />
          </div>
        ))}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">

        {/* App header — matches real app */}
        <div className="h-9 border-b border-slate-200 flex items-center px-4 bg-white/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center text-slate-500">
            <span className="text-[10px] font-medium px-1 hover:bg-slate-100 rounded cursor-pointer">
              Show My Quote
            </span>
            <ChevronRight className="w-3 h-3 mx-0.5 text-slate-300" />
            <span className="text-[10px] font-medium text-slate-500 px-1">Calls</span>
            <ChevronRight className="w-3 h-3 mx-0.5 text-slate-300" />
            <span className="text-[10px] font-semibold text-slate-800 px-1">Live Call</span>
          </div>
          <div className="ml-auto w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-semibold border border-slate-300">
            MH
          </div>
        </div>

        {/* Live call view */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <LiveCallDemo />
        </div>
      </div>
    </div>
  );
}

// ─── Features Section ─────────────────────────────────────────────────────────

const DEMO_PACKAGES = [
  { id: 'p1', name: 'Repair',   desc: 'Spot fix',      price: 850  },
  { id: 'p2', name: 'Re-roof',  desc: '28 squares',    price: 4800 },
  { id: 'p3', name: 'Premium',  desc: 'Lifetime warr', price: 6200 },
];
const DEMO_TEAM = [
  { id: 'standard', label: '30-yr architectural shingles', multiplier: 1.0  },
  { id: 'impact',   label: 'Impact-resistant (Class 4)',   multiplier: 1.22 },
];
const DEMO_ADDONS = [
  { id: 'gutters', label: 'Gutter replacement', price: 1200 },
  { id: 'fascia',  label: 'Fascia & soffit',    price: 650  },
  { id: 'ridge',   label: 'Ridge ventilation',  price: 420  },
  { id: 'decking', label: 'Decking repair',     price: 380  },
];

const CUSTOM_STEPS = [
  { delay: 1500,  change: { packageId: 'p2' },                                  flash: 'package' },
  { delay: 4000,  change: { packageId: 'p3' },                                  flash: 'package' },
  { delay: 7000,  change: { teamId: 'impact' },                                 flash: 'team'    },
  { delay: 10000, change: { addons: ['gutters'] },                              flash: 'addons'  },
  { delay: 12500, change: { addons: ['gutters', 'fascia'] },                    flash: 'addons'  },
  { delay: 15000, change: { addons: ['gutters', 'fascia', 'ridge'] },           flash: 'addons'  },
];
const CUSTOM_LOOP = CUSTOM_STEPS[CUSTOM_STEPS.length - 1].delay + 5000;

function CustomisationDemo() {
  const [packageId, setPackageId] = useState('p1');
  const [teamId,    setTeamId]    = useState('standard');
  const [addons,    setAddons]    = useState([]);
  const [flash,     setFlash]     = useState(null);

  useEffect(() => {
    const ids = [];
    const run = () => {
      setPackageId('p1'); setTeamId('standard'); setAddons([]); setFlash(null);
      CUSTOM_STEPS.forEach(({ delay, change, flash: f }) => {
        ids.push(setTimeout(() => {
          if (change.packageId !== undefined) setPackageId(change.packageId);
          if (change.teamId    !== undefined) setTeamId(change.teamId);
          if (change.addons    !== undefined) setAddons(change.addons);
          setFlash(f);
          ids.push(setTimeout(() => setFlash(null), 1400));
        }, delay));
      });
      ids.push(setTimeout(run, CUSTOM_LOOP));
    };
    ids.push(setTimeout(run, 400));
    return () => ids.forEach(clearTimeout);
  }, []);

  const pkg        = DEMO_PACKAGES.find(p => p.id === packageId);
  const team       = DEMO_TEAM.find(t => t.id === teamId);
  const addonTotal = DEMO_ADDONS.filter(a => addons.includes(a.id)).reduce((s, a) => s + a.price, 0);
  const subtotal   = Math.round(pkg.price * team.multiplier) + addonTotal;
  const bundle     = addons.includes('gutters') && teamId === 'impact' ? 0.05 : 0;
  const total      = Math.round(subtotal * (1 - bundle));
  const hl = key => flash === key
    ? 'border-green-400 bg-[#F0F0EE] shadow-sm shadow-green-100'
    : 'border-slate-200 bg-white';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden w-full" style={{ maxWidth: '360px' }}>

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">Build Your Quote</p>
          <p className="text-xs text-slate-400 mt-0.5">Mike Harris · Full Reroof</p>
        </div>
        <span className="text-[10px] bg-[#F0F0EE] text-green-700 border border-green-100 px-2 py-0.5 rounded-full font-semibold">
          Live preview
        </span>
      </div>

      <div className="p-5 space-y-5">

        {/* Package */}
        <div className={`rounded-xl border p-3 transition-all duration-500 ${hl('package')}`}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Service Type</p>
          <div className="space-y-1.5">
            {DEMO_PACKAGES.map(p => (
              <div key={p.id}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs transition-all duration-300 cursor-pointer ${
                  p.id === packageId
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-100 text-slate-600 hover:border-slate-200'
                }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${p.id === packageId ? 'border-white bg-white' : 'border-slate-300'}`}>
                    {p.id === packageId && <div className="w-full h-full rounded-full bg-slate-900 scale-50" />}
                  </div>
                  <span className="font-medium">{p.name}</span>
                  <span className={`text-[10px] ${p.id === packageId ? 'text-slate-400' : 'text-slate-400'}`}>{p.desc}</span>
                </div>
                <span className={p.id === packageId ? 'text-slate-300' : 'text-slate-400'}>${p.price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className={`rounded-xl border p-3 transition-all duration-500 ${hl('team')}`}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Material Grade</p>
          <div className="space-y-1">
            {DEMO_TEAM.map(t => (
              <div key={t.id}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-300 cursor-pointer ${
                  t.id === teamId ? 'bg-slate-900 text-white' : 'text-slate-500'
                }`}>
                <div className={`w-2 h-2 rounded-full border flex-shrink-0 ${t.id === teamId ? 'border-white bg-white' : 'border-slate-300'}`} />
                {t.label}
                {t.id !== 'standard' && t.id === teamId && (
                  <span className="ml-auto text-slate-400 text-[9px]">+{Math.round((t.multiplier - 1) * 100)}%</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add-ons */}
        <div className={`rounded-xl border p-3 transition-all duration-500 ${hl('addons')}`}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Add-ons</p>
          <div className="grid grid-cols-2 gap-1.5">
            {DEMO_ADDONS.map(a => {
              const on = addons.includes(a.id);
              return (
                <div key={a.id}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] transition-all duration-300 ${
                    on ? 'border-green-300 bg-[#F0F0EE] text-green-800' : 'border-slate-100 text-slate-500'
                  }`}>
                  <div className={`w-3 h-3 rounded flex-shrink-0 flex items-center justify-center border ${
                    on ? 'bg-[#F0F0EE]0 border-green-500' : 'border-slate-300'
                  }`}>
                    {on && <span className="text-white text-[8px] font-bold">✓</span>}
                  </div>
                  <span className="font-medium truncate">{a.label}</span>
                  <span className="ml-auto text-[9px] text-slate-400">+${a.price.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Price breakdown */}
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{pkg.name} ({pkg.desc})</span>
            <span>${pkg.price.toLocaleString()}</span>
          </div>
          {teamId !== 'standard' && (
            <div className="flex justify-between text-xs text-slate-500 anim-slide-up">
              <span>Impact-resistant upgrade (+{Math.round((team.multiplier - 1) * 100)}%)</span>
              <span>+${Math.round(pkg.price * (team.multiplier - 1)).toLocaleString()}</span>
            </div>
          )}
          {addonTotal > 0 && (
            <div className="flex justify-between text-xs text-slate-500 anim-slide-up">
              <span>Add-ons</span>
              <span>+${addonTotal.toLocaleString()}</span>
            </div>
          )}
          {bundle > 0 && (
            <div className="flex justify-between text-xs text-green-600 font-medium anim-slide-up">
              <span>Bundle discount (5%)</span>
              <span>−${Math.round(subtotal * bundle).toLocaleString()}</span>
            </div>
          )}
          <div className="border-t border-slate-200 pt-1.5 mt-1 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-900">Total</span>
            <span className="text-lg font-black text-slate-900">${total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const LEFT_FEATURES = [
  {
    title: 'AI listens while you talk',
    desc: 'Our AI works silently in the background — transcribing every word while you lead the conversation. No headset, no typing, no second screen.',
  },
  {
    title: 'Quote fields fill themselves',
    desc: 'Customer name, address, roof size, pitch, material, tear-off — all captured from what\'s said and entered into your quote automatically.',
  },
  {
    title: 'Quote built before you hang up',
    desc: 'A complete, itemised roofing quote is ready before the call ends — pulled straight from the conversation. Nothing to type after.',
  },
];

const RIGHT_FEATURES = [
  {
    title: 'Your rates, your materials',
    desc: 'Set your own price per square, material markups and labour rates — every quote reflects exactly what you charge.',
  },
  {
    title: 'Full lead pipeline',
    desc: 'Every call logged, every lead tracked — from first inquiry to signed job, in one place.',
  },
  {
    title: 'Send in one click',
    desc: 'A professional PDF quote is ready the moment you hang up. Send it before a competitor even calls them back.',
  },
];

function FeaturesSection({ onBookDemo }) {
  return (
    <section id="features" className="bg-white py-16 md:py-24 relative">
      <div className="max-w-6xl mx-auto px-6 md:px-10">

        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
            Everything you need to quote faster
          </h2>
          <p className="text-slate-500 text-base md:text-lg max-w-lg mx-auto">
            You handle the conversation. Show My Quote works in the background — transcribing, auto-filling your quote form and calculating the total in real time.
          </p>
        </div>

        {/* 3-col on desktop, stacked on mobile */}
        <div className="flex flex-col lg:flex-row items-center gap-10">

          {/* Left features */}
          <div className="w-full lg:flex-1 space-y-8 md:space-y-10">
            {LEFT_FEATURES.map(({ title, desc }) => (
              <div key={title}>
                <p className="font-bold text-slate-900 mb-1">{title}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Customisation demo */}
          <CustomisationDemo />

          {/* Right features */}
          <div className="w-full lg:flex-1 space-y-8 md:space-y-10">
            {RIGHT_FEATURES.map(({ title, desc }) => (
              <div key={title}>
                <p className="font-bold text-slate-900 mb-1">{title}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <button onClick={onBookDemo}
            className="px-8 py-4 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-700 transition-colors shadow-lg">
            Book a 15-minute demo
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── How It Works Section ────────────────────────────────────────────────────

function DataEntriesAnim() {
  const ITEMS = ['Shingles (28 sq)', 'Underlayment', 'Flashing', 'Labor', 'Disposal & haul-off'];
  const [activeRow, setActiveRow] = useState(-1);
  const [chars, setChars] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => { setDone(false); setActiveRow(-1); setChars(0); }, 1200);
      return () => clearTimeout(t);
    }
    if (activeRow === -1) {
      const t = setTimeout(() => { setActiveRow(0); setChars(0); }, 600);
      return () => clearTimeout(t);
    }
    const word = ITEMS[activeRow];
    if (chars < word.length) {
      const t = setTimeout(() => setChars(c => c + 1), 65);
      return () => clearTimeout(t);
    }
    if (activeRow < ITEMS.length - 1) {
      const t = setTimeout(() => { setActiveRow(r => r + 1); setChars(0); }, 300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setDone(true), 200);
    return () => clearTimeout(t);
  }, [activeRow, chars, done]);

  return (
    <div className="bg-slate-800 rounded-xl p-3 flex flex-col gap-1.5 overflow-hidden">
      {ITEMS.map((item, i) => {
        const visible = activeRow !== -1 && i <= activeRow;
        const text = i < activeRow ? item : item.slice(0, chars);
        const isCurrent = i === activeRow && !done;
        return (
          <div
            key={item}
            style={{
              opacity:    visible ? 1 : 0,
              transition: 'opacity 0.2s ease',
            }}
            className="flex items-center bg-slate-700 rounded px-2.5 py-1 border border-slate-600"
          >
            <span className="text-xs font-medium text-slate-300">{text}</span>
            {isCurrent && <span className="text-xs text-slate-500 ml-px">|</span>}
          </div>
        );
      })}
    </div>
  );
}

function PricingAnim() {
  const ITEMS = [
    { label: 'Shingles (28 sq)',    price: '$2,520' },
    { label: 'Underlayment',        price: '$420'   },
    { label: 'Flashing',            price: '$280'   },
    { label: 'Labor',               price: '$1,680' },
    { label: 'Disposal & haul-off', price: '$350'   },
  ];
  const [activePrice, setActivePrice] = useState(-1);
  const [chars, setChars] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => { setDone(false); setActivePrice(-1); setChars(0); }, 1400);
      return () => clearTimeout(t);
    }
    if (activePrice === -1) {
      const t = setTimeout(() => { setActivePrice(0); setChars(0); }, 600);
      return () => clearTimeout(t);
    }
    const price = ITEMS[activePrice].price;
    if (chars < price.length) {
      const t = setTimeout(() => setChars(c => c + 1), 80);
      return () => clearTimeout(t);
    }
    if (activePrice < ITEMS.length - 1) {
      const t = setTimeout(() => { setActivePrice(r => r + 1); setChars(0); }, 280);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setDone(true), 200);
    return () => clearTimeout(t);
  }, [activePrice, chars, done]);

  return (
    <div className="bg-slate-800 rounded-xl p-3 flex flex-col gap-1.5 overflow-hidden">
      {ITEMS.map((item, i) => {
        const priceText = i < activePrice ? item.price : i === activePrice ? item.price.slice(0, chars) : '';
        const isCurrent = i === activePrice && !done;
        return (
          <div key={item.label} className="flex items-center justify-between bg-slate-700 rounded px-2.5 py-1 border border-slate-600">
            <span className="text-xs font-medium text-slate-300">{item.label}</span>
            <div className="flex items-center min-w-[3rem] justify-end">
              <span className="text-xs font-bold text-white">{priceText}</span>
              {isCurrent && <span className="text-xs text-slate-500 ml-px">|</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LogicAnim() {
  const RULE = 'add $150 per storey above 1';
  const [stage, setStage] = useState(0);
  const [chars, setChars] = useState(0);
  const [priceFlash, setPriceFlash] = useState(false);

  useEffect(() => {
    if (stage === 0) { const t = setTimeout(() => setStage(1), 500);           return () => clearTimeout(t); }
    if (stage === 1) { const t = setTimeout(() => setStage(2), 400);           return () => clearTimeout(t); }
    if (stage === 2) { const t = setTimeout(() => { setStage(3); setChars(0); }, 300); return () => clearTimeout(t); }
    if (stage === 3) {
      if (chars < RULE.length) { const t = setTimeout(() => setChars(c => c + 1), 58); return () => clearTimeout(t); }
      const t = setTimeout(() => setStage(4), 550);
      return () => clearTimeout(t);
    }
    if (stage === 4) { const t = setTimeout(() => setStage(5), 600);           return () => clearTimeout(t); }
    if (stage >= 5 && stage <= 7) { const t = setTimeout(() => setStage(s => s + 1), 700); return () => clearTimeout(t); }
    if (stage === 8) { const t = setTimeout(() => setStage(9), 1800);          return () => clearTimeout(t); }
    if (stage === 9) { const t = setTimeout(() => { setStage(0); setChars(0); }, 0); return () => clearTimeout(t); }
  }, [stage, chars]);

  useEffect(() => {
    if (stage >= 6 && stage <= 8) {
      setPriceFlash(true);
      const t = setTimeout(() => setPriceFlash(false), 350);
      return () => clearTimeout(t);
    }
  }, [stage]);

  const guests = stage >= 5 ? (stage - 4) : 0;
  const price  = stage >= 5 ? 1680 + Math.max(0, stage - 5) * 150 : 1680;

  const fadeIn = (n) => ({
    opacity:    stage >= n ? 1 : 0,
    transition: 'opacity 0.25s ease',
  });

  return (
    <div className="bg-slate-800 rounded-xl p-3 flex flex-col gap-1.5 overflow-hidden">

      <div style={fadeIn(1)} className="flex items-center justify-between bg-slate-700 rounded px-2.5 py-1.5 border border-slate-600">
        <span className="text-xs font-medium text-slate-300">Labor</span>
        <span className="text-xs font-bold" style={{ color: priceFlash ? '#4ade80' : '#f1f5f9', transition: 'color 0.2s ease' }}>
          ${price.toLocaleString()}
        </span>
      </div>

      <div style={fadeIn(2)} className="bg-slate-700 rounded px-2.5 py-1.5 border border-slate-600">
        <p className="text-[10px] text-slate-500 mb-0.5 uppercase tracking-wide">Add a rule</p>
        <div className="flex items-center min-h-[16px]">
          <span className="text-xs text-slate-300">{RULE.slice(0, chars)}</span>
          {stage === 3 && <span className="text-xs text-slate-500 ml-px">|</span>}
        </div>
      </div>

      <div style={fadeIn(5)} className="flex items-center justify-between bg-slate-700 rounded px-2.5 py-1.5 border border-slate-600">
        <span className="text-xs text-slate-500">Storeys</span>
        <span className="text-xs font-bold text-white">{guests}</span>
      </div>

    </div>
  );
}

function PublishAnim() {
  const ITEMS = [
    { label: 'Shingles (28 sq)',    price: 2520 },
    { label: 'Underlayment',        price: 420  },
    { label: 'Flashing & valleys',  price: 280  },
    { label: 'Labor',               price: 1680 },
    { label: 'Disposal & haul-off', price: 350  },
  ];
  const [phase, setPhase] = useState(0);
  const [priceFlash, setPriceFlash] = useState(false);

  useEffect(() => {
    const delays = [500, 380, 380, 380, 380, 380, 700, 1800];
    const t = setTimeout(
      () => setPhase(p => (p >= 7 ? 0 : p + 1)),
      delays[Math.min(phase, delays.length - 1)],
    );
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase >= 1 && phase <= 5) {
      setPriceFlash(true);
      const t = setTimeout(() => setPriceFlash(false), 350);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const total = ITEMS.slice(0, phase).reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="bg-slate-800 rounded-xl p-3 flex flex-col gap-1.5 overflow-hidden">

      <div className="flex items-center justify-between bg-slate-700 rounded px-2.5 py-1.5 border border-slate-600">
        <span className="text-xs font-semibold text-slate-500">Total</span>
        <span className="text-xs font-black" style={{ color: priceFlash ? '#4ade80' : '#f1f5f9', transition: 'color 0.2s ease' }}>
          {total > 0 ? `$${total.toLocaleString()}` : '—'}
        </span>
      </div>

      {ITEMS.map((item, i) => {
        const ticked = phase >= i + 1;
        return (
          <div key={item.label} className="flex items-center justify-between bg-slate-700 rounded px-2.5 py-1 border border-slate-600">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: ticked ? '#22c55e' : '#334155', transition: 'background-color 0.25s ease' }}
              >
                <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" style={{ opacity: ticked ? 1 : 0, transition: 'opacity 0.2s ease' }}>
                  <polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-xs font-medium text-slate-300">{item.label}</span>
            </div>
            <span className="text-xs text-slate-500">${item.price.toLocaleString()}</span>
          </div>
        );
      })}

      <div
        className="flex items-center justify-center bg-green-900/30 rounded px-2.5 py-1.5 border border-green-700/50"
        style={{
          opacity:    phase >= 6 ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      >
        <span className="text-xs font-bold text-green-400">Quote sent ✓</span>
      </div>

    </div>
  );
}

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Add your services and materials',
    desc:  'Enter your line items — shingles, underlayment, flashing, labour, disposal. Set your price per square, per unit or flat fee. Your materials, your rates.',
    Anim: DataEntriesAnim,
  },
  {
    step: '02',
    title: 'Set your pricing',
    desc:  'Add prices to each line item. Per-square rates, per-unit costs, flat fees — all supported. Update them any time and every quote reflects the change instantly.',
    Anim: PricingAnim,
  },
  {
    step: '03',
    title: 'Add rules if needed',
    desc:  'Layer in smart logic: storey surcharges, steep pitch multipliers, material upgrade markups, travel fees. Applied automatically from what\'s said on the call.',
    Anim: LogicAnim,
  },
  {
    step: '04',
    title: 'Go live and start quoting',
    desc:  'You\'re ready. Show My Quote listens on every call, fills your form and builds the quote in real time. Send it before you hang up.',
    Anim: PublishAnim,
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-slate-900 py-20 relative">
      <div className="max-w-6xl mx-auto px-6 md:px-10">

        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Getting started</p>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
            Up and running in minutes
          </h2>
          <p className="text-slate-400 text-base max-w-md mx-auto">
            Four steps to your first quote. No technical setup. No training required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {HOW_IT_WORKS.map(({ step, title, desc, Anim }) => (
            <div key={step} className="flex flex-col gap-4">
              <Anim />
              <div>
                <p className="font-bold text-white mb-1.5 text-sm leading-snug">{title}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

// ─── Vendor Types Section ─────────────────────────────────────────────────────

const USE_CASES = [
  {
    title: 'Residential re-roof',
    desc:  'Quote full replacements on the call — roof size, pitch, material, tear-off and decking all captured before you hang up.',
    cta:   'See reroof quoting',
    Icon: () => (
      <svg viewBox="0 0 80 72" fill="none" className="w-full h-full">
        <rect x="16" y="36" width="48" height="32" rx="2" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
        <path d="M8 38 L40 10 L72 38Z" fill="#dcfce7" stroke="#16a34a" strokeWidth="2" strokeLinejoin="round"/>
        <line x1="16" y1="32" x2="30" y2="20" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
        <line x1="26" y1="36" x2="40" y2="22" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
        <line x1="36" y1="38" x2="50" y2="24" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
        <line x1="46" y1="37" x2="60" y2="27" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
        <rect x="32" y="50" width="16" height="18" rx="2" fill="white" stroke="#16a34a" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    title: 'Storm damage & insurance',
    desc:  'Scope hail and wind damage on the call, build an insurance-ready quote and get it to the homeowner before the adjuster shows up.',
    cta:   'See storm damage quoting',
    Icon: () => (
      <svg viewBox="0 0 80 72" fill="none" className="w-full h-full">
        <rect x="16" y="36" width="48" height="32" rx="2" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
        <path d="M8 38 L40 10 L72 38Z" fill="#dcfce7" stroke="#16a34a" strokeWidth="2" strokeLinejoin="round"/>
        <rect x="32" y="50" width="16" height="18" rx="2" fill="white" stroke="#16a34a" strokeWidth="1.5"/>
        <ellipse cx="46" cy="14" rx="9" ry="7" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5"/>
        <path d="M48 18 L43 28 L47 28 L42 40 L52 26 L47 26Z" fill="#16a34a" opacity="0.7"/>
      </svg>
    ),
  },
  {
    title: 'Roof repairs',
    desc:  'Quote spot repairs, flashing, valleys and leak fixes in minutes — not after a follow-up visit. Capture the scope while you have them on the line.',
    cta:   'See repair quoting',
    Icon: () => (
      <svg viewBox="0 0 80 72" fill="none" className="w-full h-full">
        <rect x="16" y="36" width="48" height="32" rx="2" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
        <path d="M8 38 L40 10 L72 38Z" fill="#dcfce7" stroke="#16a34a" strokeWidth="2" strokeLinejoin="round"/>
        <rect x="32" y="50" width="16" height="18" rx="2" fill="white" stroke="#16a34a" strokeWidth="1.5"/>
        <circle cx="56" cy="22" r="10" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5"/>
        <path d="M52 20 Q54 16 58 18 L60 26 L52 24Z" fill="#16a34a" opacity="0.5"/>
        <line x1="56" y1="26" x2="62" y2="32" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: 'Commercial flat roofing',
    desc:  'Handle TPO, EPDM and metal panel enquiries — quote by square footage, membrane type and warranty tier while you\'re still on the call.',
    cta:   'See commercial quoting',
    Icon: () => (
      <svg viewBox="0 0 80 72" fill="none" className="w-full h-full">
        <rect x="8" y="30" width="64" height="38" rx="2" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
        <rect x="8" y="22" width="64" height="12" rx="2" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
        <rect x="20" y="40" width="12" height="16" rx="1" fill="white" stroke="#16a34a" strokeWidth="1.5" opacity="0.7"/>
        <rect x="36" y="40" width="12" height="16" rx="1" fill="white" stroke="#16a34a" strokeWidth="1.5" opacity="0.7"/>
        <rect x="52" y="40" width="12" height="16" rx="1" fill="white" stroke="#16a34a" strokeWidth="1.5" opacity="0.7"/>
        <rect x="30" y="14" width="8" height="10" rx="1" fill="#16a34a" opacity="0.4" stroke="#16a34a" strokeWidth="1.5"/>
        <rect x="46" y="14" width="8" height="10" rx="1" fill="#16a34a" opacity="0.4" stroke="#16a34a" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    title: 'Gutter & fascia',
    desc:  'Quote gutters, fascia, soffit and downspouts as standalone jobs or alongside roofing work — all line items ready from a single call.',
    cta:   'See gutter quoting',
    Icon: () => (
      <svg viewBox="0 0 80 72" fill="none" className="w-full h-full">
        <rect x="16" y="36" width="48" height="32" rx="2" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
        <path d="M8 38 L40 10 L72 38Z" fill="#dcfce7" stroke="#16a34a" strokeWidth="2" strokeLinejoin="round"/>
        <rect x="14" y="36" width="52" height="5" rx="2" fill="white" stroke="#16a34a" strokeWidth="1.5"/>
        <rect x="14" y="40" width="4" height="26" rx="1" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5"/>
        <rect x="32" y="50" width="16" height="18" rx="2" fill="white" stroke="#16a34a" strokeWidth="1.5"/>
        <ellipse cx="16" cy="67" rx="3.5" ry="2.5" fill="#16a34a" opacity="0.3"/>
      </svg>
    ),
  },
  {
    title: 'Emergency & leak response',
    desc:  'On a leak call? Capture the address, damage scope and urgency while you dispatch. Quote the repair before the truck arrives.',
    cta:   'See emergency quoting',
    Icon: () => (
      <svg viewBox="0 0 80 72" fill="none" className="w-full h-full">
        <rect x="16" y="36" width="48" height="32" rx="2" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
        <path d="M8 38 L40 10 L72 38Z" fill="#dcfce7" stroke="#16a34a" strokeWidth="2" strokeLinejoin="round"/>
        <rect x="32" y="50" width="16" height="18" rx="2" fill="white" stroke="#16a34a" strokeWidth="1.5"/>
        <path d="M37 20 L40 28 L38.5 28 L41.5 36" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
        <ellipse cx="40" cy="52" rx="3" ry="4" fill="#16a34a" opacity="0.4"/>
        <ellipse cx="32" cy="57" rx="2.5" ry="3.5" fill="#16a34a" opacity="0.3"/>
        <ellipse cx="48" cy="55" rx="2" ry="3" fill="#16a34a" opacity="0.3"/>
      </svg>
    ),
  },
];

// ─── Vendor Sheet Data ────────────────────────────────────────────────────────

const SHEET_DATA = {
  'Residential re-roof': {
    desc: 'Quote full roof replacements on the call — size, pitch, material, tear-off and decking all captured automatically so you can send a price before a competitor calls them back.',
    stats: [
      { value: '< 5 min', label: 'Average quote time' },
      { value: '94%',     label: 'Enquiries converted to quote' },
      { value: '$0',      label: 'Extra admin per job' },
    ],
    steps: [
      { step: '1', title: 'You take the homeowner call',            desc: 'No AI agent. You lead the conversation — address, roof size, pitch, material preferences, tear-off details. Our AI listens silently and captures every detail.' },
      { step: '2', title: 'AI fills your form in real time',        desc: 'Customer name, address, squares, pitch, material grade, layers and add-ons — all extracted from the conversation and entered into your quote template automatically.' },
      { step: '3', title: 'Quote ready before you hang up',         desc: 'A branded, itemised reroof quote is generated from the call. Review it, adjust if needed, and send it straight from the app.' },
    ],
    quote: {
      client:   'Mike Harris',
      subtitle: 'Full Roof Replacement · 4821 Westgate Dr, Houston TX',
      flags:    ['28 squares', 'Tear-off included'],
      lines: [
        { label: '30-yr architectural shingles — 28 squares', price: '$2,520' },
        { label: 'Synthetic underlayment',                    price: '+$420'  },
        { label: 'Drip edge & flashing',                      price: '+$280'  },
        { label: 'Labor — 2-storey, moderate pitch',          price: '+$1,680'},
        { label: 'Tear-off & disposal (1 layer)',              price: '+$350'  },
        { label: 'Ridge cap & vents',                          price: '+$220'  },
      ],
      note:          null,
      meta:          '28 sq · 6:12 pitch · 2-storey · Houston TX',
      strikethrough: null,
      total:         '$5,470',
      sentIn:        '1:02',
    },
    features: [
      { title: 'Square footage auto-calc',    desc: 'Roof size is captured on the call — or estimated from the address. Price-per-square rates apply instantly to every line item.' },
      { title: 'Pitch & storey surcharges',   desc: 'Steep pitch and multi-storey multipliers are pre-set in your rules. Captured on the call, applied to the quote automatically.' },
      { title: 'Material tier selection',     desc: '3-tab, architectural, impact-resistant — your material options and markups are pre-set. Mentioned on the call, added to the quote.' },
      { title: 'Tear-off & disposal costing', desc: 'Number of existing layers is captured and your per-layer disposal rate applied as a line item. No separate calculation.' },
    ],
    featuresLabel: 'Re-roof specific features',
    cta: {
      headline: 'Quote your next reroof call before you hang up.',
      sub:      'Book a demo and see how Show My Quote turns a homeowner call into a sent quote.',
    },
  },

  'Storm damage & insurance': {
    desc: 'Scope hail and wind damage live on the call, build an insurance-ready line-by-line quote and get it to the homeowner before the adjuster even shows up.',
    stats: [
      { value: '< 6 min', label: 'Average scope time' },
      { value: '91%',     label: 'Quotes match adjuster scope' },
      { value: '$0',      label: 'Extra admin per claim' },
    ],
    steps: [
      { step: '1', title: 'You take the damage call',          desc: 'No AI agent. You talk through the damage — date of loss, affected areas, hail size, granule loss, dents. Our AI captures every detail in real time.' },
      { step: '2', title: 'AI builds the scope automatically', desc: 'Damage areas, replacement materials, quantities and add-ons — extracted from the call and entered into your insurance quote template.' },
      { step: '3', title: 'Insurance quote ready immediately', desc: 'A line-by-line scope of loss is generated from the call — formatted for insurance submission and ready to send before the homeowner calls another roofer.' },
    ],
    quote: {
      client:   'Dave & Kim Schultz',
      subtitle: 'Hail Damage Claim · 2240 Creekside Blvd, Katy TX',
      flags:    ['Hail damage', 'Insurance claim'],
      lines: [
        { label: 'Full roof replacement — 32 sq (hail damaged)',  price: '$4,160' },
        { label: 'Synthetic underlayment',                        price: '+$480'  },
        { label: 'Impact-resistant shingles upgrade (Class 4)',   price: '+$960'  },
        { label: 'Ridge vent replacement',                        price: '+$280'  },
        { label: 'Gutters & downspouts (hail dented)',            price: '+$1,440'},
        { label: 'Fascia board replacement — 60 lin ft',          price: '+$540'  },
        { label: 'Tear-off & disposal',                           price: '+$400'  },
      ],
      note:          'Insurance scope of loss — Katy TX',
      meta:          '32 sq · hail damage · Katy TX',
      strikethrough: null,
      total:         '$8,260',
      sentIn:        '1:18',
    },
    features: [
      { title: 'Insurance-ready line items',  desc: 'Each item is formatted as a scope of loss line — matching the detail insurers and adjusters expect to see on a claim submission.' },
      { title: 'Damage area capture',         desc: 'Affected roof sections, gutters, fascia and skylights are noted on the call and quoted as separate line items automatically.' },
      { title: 'Class 4 upgrade pricing',     desc: 'Impact-resistant shingle upgrades are pre-built in your price list — mentioned on the call, added to the quote with your mark-up.' },
      { title: 'Date of loss & policy notes', desc: 'Storm date, policy number and adjuster name are captured on the call and included in the quote header automatically.' },
    ],
    featuresLabel: 'Insurance claim features',
    cta: {
      headline: 'Be the first quote in the homeowner\'s inbox.',
      sub:      'Book a demo and see how Show My Quote turns a storm damage call into a sent insurance scope.',
    },
  },

  'Roof repairs': {
    desc: 'Quote spot repairs, flashing replacements, valley re-runs and leak fixes in minutes — not after a follow-up visit. Capture the details while you have the customer on the line.',
    stats: [
      { value: '< 3 min', label: 'Average quote time' },
      { value: '89%',     label: 'First-call conversions' },
      { value: '$0',      label: 'Extra admin per repair' },
    ],
    steps: [
      { step: '1', title: 'Customer calls about a leak or damage', desc: 'No AI agent. You ask the diagnostic questions — where the leak is, how long it\'s been happening, what\'s visible. Our AI listens and records every answer.' },
      { step: '2', title: 'AI builds the repair scope',            desc: 'Repair type, area size, materials and any related work are extracted from the call and entered into your repair quote template automatically.' },
      { step: '3', title: 'Repair quote sent on the call',         desc: 'A clear, itemised repair quote is generated and ready to send the moment you hang up — so the customer can approve while the problem is fresh in their mind.' },
    ],
    quote: {
      client:   'Randy Collins',
      subtitle: 'Roof Repair · 8845 Hollow Oak Dr, Sugar Land TX',
      flags:    ['Valley flashing', 'Active leak'],
      lines: [
        { label: 'Valley re-flash — 18 linear ft',                 price: '$420'  },
        { label: 'Shingle replacement — storm lifted (12 sq ft)',   price: '+$240' },
        { label: 'Pipe boot replacement ×2',                       price: '+$180' },
        { label: 'Attic inspection & moisture check',              price: '+$120' },
        { label: 'Labor — half day',                               price: '+$450' },
      ],
      note:          null,
      meta:          'Valley + pipe boots · Sugar Land TX',
      strikethrough: null,
      total:         '$1,410',
      sentIn:        '0:48',
    },
    features: [
      { title: 'Repair type library',         desc: 'Valley flashing, pipe boots, skylights, ridge damage, blow-offs — your common repair types are pre-priced and ready to quote on mention.' },
      { title: 'Linear ft & sq ft pricing',   desc: 'Flashing by the linear foot, shingle repair by the square foot — both pricing models supported. Dimensions captured on the call.' },
      { title: 'Diagnostic fee option',       desc: 'Include an inspection fee as a separate line item — with the option to credit it back against the repair if they proceed.' },
      { title: 'Photo note capture',          desc: 'Mention of photos or video sent by the customer is logged against the job automatically so nothing slips through.' },
    ],
    featuresLabel: 'Repair-specific features',
    cta: {
      headline: 'Quote the repair before you hang up.',
      sub:      'Book a demo and see how Show My Quote handles repair calls in real time.',
    },
  },

  'Commercial flat roofing': {
    desc: 'Handle TPO, EPDM, modified bitumen and metal panel enquiries — quote by square footage, membrane type and warranty tier while you\'re still on the call with the building owner.',
    stats: [
      { value: '< 7 min', label: 'Average quote time' },
      { value: '86%',     label: 'Quotes sent same day' },
      { value: '$0',      label: 'Extra admin per job' },
    ],
    steps: [
      { step: '1', title: 'Building owner calls for a quote',   desc: 'No AI agent. You discuss the roof — building type, square footage, membrane, drainage, existing warranty. Our AI records every detail silently.' },
      { step: '2', title: 'AI builds the commercial scope',     desc: 'Roof area, membrane type, insulation, drainage upgrades and warranty tier — all captured and entered into your commercial quote template.' },
      { step: '3', title: 'Commercial quote ready immediately', desc: 'A detailed scope and price is ready to send before you hang up — professional enough for a facilities manager or property owner.' },
    ],
    quote: {
      client:   'Peakstone Properties',
      subtitle: 'TPO Re-roof · 450 Commerce Park Dr, Houston TX',
      flags:    ['60-mil TPO', 'Warranty 20yr'],
      lines: [
        { label: '60-mil TPO membrane — 85 squares',      price: '$12,750' },
        { label: '2" polyiso insulation board',           price: '+$3,400' },
        { label: 'Tapered insulation — drain areas',      price: '+$1,200' },
        { label: 'Seam welding & adhesive',               price: '+$1,700' },
        { label: 'Curb flashing & penetrations',          price: '+$850'   },
        { label: '20-year manufacturer warranty',         price: '+$900'   },
        { label: 'Tear-off & disposal',                   price: '+$1,275' },
      ],
      note:          null,
      meta:          '85 sq · TPO 60-mil · Commerce Park Dr',
      strikethrough: null,
      total:         '$22,075',
      sentIn:        '1:24',
    },
    features: [
      { title: 'Membrane type selector',        desc: 'TPO, EPDM, modified bitumen and metal panel — each membrane type has its own pricing schedule. One mention on the call selects it.' },
      { title: 'Insulation & build-up options', desc: 'Polyiso, EPS and tapered insulation layers are pre-priced per square and added to the quote when discussed on the call.' },
      { title: 'Warranty tier pricing',         desc: 'NDL, 10-year, 15-year and 20-year manufacturer warranties are pre-built add-ons. Selected on the call, priced and added automatically.' },
      { title: 'Penetration & curb count',      desc: 'Number of HVAC curbs, pipes and penetrations is captured and your per-unit flashing rate applied automatically as a line item.' },
    ],
    featuresLabel: 'Commercial roofing features',
    cta: {
      headline: 'Quote commercial jobs without the back-and-forth.',
      sub:      'Book a demo and see how Show My Quote handles flat roofing scopes in real time.',
    },
  },

  'Gutter & fascia': {
    desc: 'Quote gutters, fascia, soffit and downspouts as standalone jobs or alongside roofing work — all line items ready from a single call, no follow-up needed.',
    stats: [
      { value: '< 3 min', label: 'Average quote time' },
      { value: '92%',     label: 'Same-day quote rate' },
      { value: '$0',      label: 'Extra admin per job' },
    ],
    steps: [
      { step: '1', title: 'Customer calls about gutters or fascia', desc: 'No AI agent. You ask the questions — linear footage, gutter profile, downspout count, fascia condition. Our AI listens and logs the answers.' },
      { step: '2', title: 'AI fills the quote form',                desc: 'Linear feet, profile, colour, downspout count and any fascia or soffit work — extracted from the call and entered into your quote template automatically.' },
      { step: '3', title: 'Quote ready to send immediately',        desc: 'A clear, itemised gutter and fascia quote is ready before the call ends. Send it while you have the customer\'s attention.' },
    ],
    quote: {
      client:   'Tom Garland',
      subtitle: 'Gutters & Fascia · 1122 Pecan Grove Rd, Pearland TX',
      flags:    ['K-style 6"', 'Fascia replacement'],
      lines: [
        { label: 'K-style 6" seamless aluminium gutters — 140 lin ft', price: '$1,820' },
        { label: 'Downspout installation ×5',                          price: '+$350'  },
        { label: 'Gutter guard / leaf protection — 140 lin ft',        price: '+$840'  },
        { label: 'Fascia board replacement — 140 lin ft',              price: '+$980'  },
        { label: 'Soffit repair — 4 panels',                           price: '+$320'  },
      ],
      note:          null,
      meta:          '140 lin ft · K-style · Pearland TX',
      strikethrough: null,
      total:         '$4,310',
      sentIn:        '0:54',
    },
    features: [
      { title: 'Linear foot pricing',   desc: 'Gutter and fascia pricing by the linear foot is pre-set in your rate card. Footage captured on the call multiplies automatically.' },
      { title: 'Profile & size options', desc: 'K-style and half-round in 5" and 6" profiles — each pre-priced. Mentioned on the call, selected and added to the quote instantly.' },
      { title: 'Gutter guard add-on',   desc: 'Your gutter guard product and per-linear-foot rate is pre-built. Add it to any gutter job with a single mention on the call.' },
      { title: 'Downspout count',       desc: 'Number of downspouts is captured on the call and your per-unit installation rate applied automatically to the line item.' },
    ],
    featuresLabel: 'Gutter & fascia features',
    cta: {
      headline: 'Quote gutters and fascia jobs before you hang up.',
      sub:      'Book a demo and see how Show My Quote handles gutter enquiries in real time.',
    },
  },

  'Emergency & leak response': {
    desc: 'On an emergency leak call? Capture the address, damage scope and urgency while you dispatch your crew. Quote the repair before the truck arrives.',
    stats: [
      { value: '< 2 min', label: 'Quote time on the call' },
      { value: '97%',     label: 'Emergency calls converted' },
      { value: '$0',      label: 'Admin while dispatching' },
    ],
    steps: [
      { step: '1', title: 'Customer calls with a leak emergency',  desc: 'No AI agent. You triage on the call — location, severity, how long it\'s been leaking, any visible interior damage. Our AI captures everything.' },
      { step: '2', title: 'AI builds the emergency scope',         desc: 'Address, damage area, tarp size, emergency call-out fee and estimated repair scope — all entered into your quote template as you talk.' },
      { step: '3', title: 'Quote sent before the truck arrives',   desc: 'The emergency response and estimated repair quote is generated and sent. Customer knows the cost before your crew shows up.' },
    ],
    quote: {
      client:   'Sandra Park',
      subtitle: 'Emergency Leak Response · 3310 Heather Glen Dr, Rosenberg TX',
      flags:    ['Active leak', 'Same-day dispatch'],
      lines: [
        { label: 'Emergency call-out fee',                        price: '$250'  },
        { label: 'Emergency tarp — 20×30 ft',                    price: '+$380' },
        { label: 'Temporary repair — roof penetration seal ×2',  price: '+$280' },
        { label: 'Damaged shingle replacement — 4 squares',      price: '+$560' },
        { label: 'Flashing repair — chimney base',               price: '+$320' },
      ],
      note:          'Permanent repair quote follows after full inspection',
      meta:          'Emergency · same-day · Rosenberg TX',
      strikethrough: null,
      total:         '$1,790',
      sentIn:        '0:38',
    },
    features: [
      { title: 'Emergency fee as line item', desc: 'Your after-hours or emergency call-out rate is pre-set and added to the quote automatically — no awkward conversation about it.' },
      { title: 'Tarp size pricing',          desc: 'Emergency tarp coverage is priced by size in your settings. Noted on the call, the correct tarp size and price is added to the quote.' },
      { title: 'Dispatch address capture',   desc: 'The full address is captured immediately as the customer calls in — so your crew gets the right location before you\'ve even hung up.' },
      { title: 'Follow-up scope reminder',   desc: 'Emergency quotes automatically include a note for follow-up full inspection — so the job stays in your pipeline.' },
    ],
    featuresLabel: 'Emergency response features',
    cta: {
      headline: 'Quote while you dispatch.',
      sub:      'Book a demo and see how Show My Quote handles emergency roofing calls.',
    },
  },
};

// ─── Workflow Demo Data ───────────────────────────────────────────────────────

const WORKFLOW_DATA = {
  'Residential re-roof': {
    fields: [
      { key: 'address',  label: 'Job address',  placeholder: 'Listening…' },
      { key: 'size',     label: 'Roof size',    placeholder: 'Listening…' },
      { key: 'pitch',    label: 'Pitch',        placeholder: 'Listening…' },
      { key: 'material', label: 'Material',     placeholder: 'Listening…' },
      { key: 'tearoff',  label: 'Tear-off',     placeholder: 'Listening…' },
    ],
    steps: [
      { speaker: 'Client', text: "It's 4821 Westgate Drive, Houston — I need a full reroof.",          fills: [{ key: 'address', value: '4821 Westgate Dr, Houston TX' }] },
      { speaker: 'You',    text: "Any idea on the roof size? And how many storeys?",                    fills: [] },
      { speaker: 'Client', text: "About 28 squares, two-storey, moderate pitch.",                      fills: [{ key: 'size', value: '28 sq (~2,800 ft²)', price: '$2,520' }, { key: 'pitch', value: '6:12 — moderate' }] },
      { speaker: 'Client', text: "30-year architectural shingles, full tear-off — one layer.",         fills: [{ key: 'material', value: '30-yr architectural', price: '+$420' }, { key: 'tearoff', value: 'Yes — 1 layer', price: '+$350' }] },
    ],
    quote: { total: '$5,470', label: '28 sq · architectural · tear-off included', sentIn: '1:02' },
  },
  'Storm damage & insurance': {
    fields: [
      { key: 'address',  label: 'Property',     placeholder: 'Listening…' },
      { key: 'damage',   label: 'Damage type',  placeholder: 'Listening…' },
      { key: 'size',     label: 'Roof size',    placeholder: 'Listening…' },
      { key: 'gutters',  label: 'Gutters',      placeholder: 'Listening…' },
      { key: 'upgrade',  label: 'Material',     placeholder: 'Listening…' },
    ],
    steps: [
      { speaker: 'Client', text: "2240 Creekside, Katy — we got hammered by hail last week.",          fills: [{ key: 'address', value: '2240 Creekside, Katy TX' }, { key: 'damage', value: 'Hail damage' }] },
      { speaker: 'You',    text: "Roughly how big is the roof — and did the gutters take a hit?",      fills: [] },
      { speaker: 'Client', text: "About 32 squares. Gutters are dented all the way round.",            fills: [{ key: 'size', value: '32 sq', price: '$4,160' }, { key: 'gutters', value: 'Full replacement', price: '+$1,440' }] },
      { speaker: 'Client', text: "Can we upgrade to impact-resistant while we're at it?",              fills: [{ key: 'upgrade', value: 'Class 4 impact-resistant', price: '+$960' }] },
    ],
    quote: { total: '$8,260', label: 'Storm damage · 32 sq · gutters + Class 4 upgrade', sentIn: '1:18' },
  },
  'Roof repairs': {
    fields: [
      { key: 'address',  label: 'Location',     placeholder: 'Listening…' },
      { key: 'issue',    label: 'Issue',        placeholder: 'Listening…' },
      { key: 'flashing', label: 'Flashing',     placeholder: 'Listening…' },
      { key: 'shingles', label: 'Shingles',     placeholder: 'Listening…' },
      { key: 'extras',   label: 'Add-ons',      placeholder: 'Listening…' },
    ],
    steps: [
      { speaker: 'Client', text: "8845 Hollow Oak Drive, Sugar Land — I've got a leak in the valley.", fills: [{ key: 'address', value: '8845 Hollow Oak, Sugar Land' }, { key: 'issue', value: 'Active valley leak' }] },
      { speaker: 'You',    text: "We'll re-flash the valley. Any missing or lifted shingles too?",     fills: [] },
      { speaker: 'Client', text: "Yeah, a few blown off on the back slope.",                           fills: [{ key: 'flashing', value: 'Valley re-flash 18 ft', price: '$420' }, { key: 'shingles', value: 'Blown-off replacement', price: '+$240' }] },
      { speaker: 'Client', text: "Two pipe boots are cracked and leaking as well.",                    fills: [{ key: 'extras', value: 'Pipe boots ×2', price: '+$180' }] },
    ],
    quote: { total: '$1,410', label: 'Valley re-flash · blown-off shingles · pipe boots', sentIn: '0:48' },
  },
  'Commercial flat roofing': {
    fields: [
      { key: 'address',    label: 'Building',    placeholder: 'Listening…' },
      { key: 'size',       label: 'Roof area',   placeholder: 'Listening…' },
      { key: 'membrane',   label: 'Membrane',    placeholder: 'Listening…' },
      { key: 'insulation', label: 'Insulation',  placeholder: 'Listening…' },
      { key: 'warranty',   label: 'Warranty',    placeholder: 'Listening…' },
    ],
    steps: [
      { speaker: 'Client', text: "450 Commerce Park Drive — we need the whole flat roof replaced.",    fills: [{ key: 'address', value: '450 Commerce Park Dr, Houston' }] },
      { speaker: 'You',    text: "Roughly how many squares, and what membrane are you looking for?",   fills: [] },
      { speaker: 'Client', text: "About 85 squares — 60-mil TPO with polyiso insulation.",            fills: [{ key: 'size', value: '85 sq', price: '$12,750' }, { key: 'membrane', value: '60-mil TPO' }, { key: 'insulation', value: 'Polyiso 2"', price: '+$3,400' }] },
      { speaker: 'Client', text: "And we need a 20-year manufacturer warranty on this one.",           fills: [{ key: 'warranty', value: '20-year NDL warranty', price: '+$900' }] },
    ],
    quote: { total: '$22,075', label: '85 sq · TPO 60-mil · polyiso · 20-yr warranty', sentIn: '1:24' },
  },
  'Gutter & fascia': {
    fields: [
      { key: 'address',  label: 'Property',     placeholder: 'Listening…' },
      { key: 'gutters',  label: 'Gutters',      placeholder: 'Listening…' },
      { key: 'downsp',   label: 'Downspouts',   placeholder: 'Listening…' },
      { key: 'guard',    label: 'Gutter guard', placeholder: 'Listening…' },
      { key: 'fascia',   label: 'Fascia',       placeholder: 'Listening…' },
    ],
    steps: [
      { speaker: 'Client', text: "1122 Pecan Grove, Pearland — gutters are sagging and rusted out.",  fills: [{ key: 'address', value: '1122 Pecan Grove, Pearland TX' }] },
      { speaker: 'You',    text: "How many linear feet roughly, and are you wanting gutter guard?",    fills: [] },
      { speaker: 'Client', text: "About 140 feet. Yes add the guard — and 5 downspouts.",             fills: [{ key: 'gutters', value: 'K-style 6" · 140 lin ft', price: '$1,820' }, { key: 'downsp', value: '×5 downspouts', price: '+$350' }, { key: 'guard', value: 'Guard · 140 lin ft', price: '+$840' }] },
      { speaker: 'Client', text: "The fascia is pretty rotten too — probably needs replacing.",        fills: [{ key: 'fascia', value: 'Fascia · 140 lin ft', price: '+$980' }] },
    ],
    quote: { total: '$4,310', label: '140 ft gutters + guard + fascia · Pearland TX', sentIn: '0:54' },
  },
  'Emergency & leak response': {
    fields: [
      { key: 'address',  label: 'Address',      placeholder: 'Listening…' },
      { key: 'issue',    label: 'Issue',        placeholder: 'Listening…' },
      { key: 'tarp',     label: 'Tarp needed',  placeholder: 'Listening…' },
      { key: 'repair',   label: 'Repair scope', placeholder: 'Listening…' },
      { key: 'dispatch', label: 'Dispatch',     placeholder: 'Listening…' },
    ],
    steps: [
      { speaker: 'Client', text: "3310 Heather Glen, Rosenberg — water's coming through the ceiling right now.", fills: [{ key: 'address', value: '3310 Heather Glen, Rosenberg' }, { key: 'issue', value: 'Active interior leak' }] },
      { speaker: 'You',    text: "We'll get someone out today. Do we need a tarp?",                    fills: [] },
      { speaker: 'Client', text: "Yes please, before it rains again tonight.",                        fills: [{ key: 'tarp', value: '20×30 tarp', price: '$380' }, { key: 'dispatch', value: 'Same-day · dispatching', price: '+$250' }] },
      { speaker: 'Client', text: "I can see cracked flashing around the chimney — probably the cause.", fills: [{ key: 'repair', value: 'Chimney flashing repair', price: '+$320' }] },
    ],
    quote: { total: '$1,790', label: 'Emergency tarp + chimney flashing + call-out', sentIn: '0:38' },
  },
};

// ─── Workflow Demo Component ───────────────────────────────────────────────────

function WorkflowDemo({ nicheKey }) {
  const seq = WORKFLOW_DATA[nicheKey];
  const [lines, setLines]               = useState([]);
  const [formData, setFormData]         = useState({});
  const [formPrices, setFormPrices]     = useState({});
  const [recentKey, setRecentKey]       = useState(null);
  const [quoteVisible, setQuoteVisible] = useState(false);
  const [sendStep, setSendStep]         = useState(0);
  const [runKey, setRunKey]             = useState(0);

  useEffect(() => {
    const timers = [];
    setLines([]);
    setFormData({});
    setFormPrices({});
    setRecentKey(null);
    setQuoteVisible(false);
    setSendStep(0);

    let t = 800;
    seq.steps.forEach((step, i) => {
      timers.push(setTimeout(() => {
        setLines(prev => [...prev, { id: i, speaker: step.speaker, text: step.text }]);
      }, t));
      t += 400;

      step.fills.forEach(({ key, value, price }) => {
        const ft = t;
        timers.push(setTimeout(() => {
          setFormData(prev => ({ ...prev, [key]: value }));
          if (price) setFormPrices(prev => ({ ...prev, [key]: price }));
          setRecentKey(key);
        }, ft));
        timers.push(setTimeout(() => {
          setRecentKey(k => (k === key ? null : k));
        }, ft + 1400));
        t += 400;
      });
      t += 1400;
    });

    timers.push(setTimeout(() => setQuoteVisible(true), t + 500));
    timers.push(setTimeout(() => setSendStep(1), t + 1400));
    timers.push(setTimeout(() => setSendStep(2), t + 1900));
    timers.push(setTimeout(() => setSendStep(3), t + 2400));
    timers.push(setTimeout(() => setRunKey(k => k + 1), t + 6000));
    return () => timers.forEach(clearTimeout);
  }, [runKey, nicheKey]);

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white flex flex-col" style={{ height: '380px' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Recording</span>
          </div>
          <div className="bg-white/10 rounded px-2 py-0.5">
            <span className="text-[9px] font-bold text-green-400">● LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] text-slate-400 bg-white/10 px-2 py-0.5 rounded">Mute</span>
          <span className="text-[8px] text-white bg-red-500 px-2 py-0.5 rounded">End</span>
        </div>
      </div>

      {/* Two-pane */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: form */}
        <div className="border-r border-slate-100 p-3 flex flex-col flex-shrink-0 overflow-hidden" style={{ width: '52%' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">Client Details</span>
            <span className="text-[7px] bg-green-50 text-green-700 border border-green-100 px-1 py-0.5 rounded-full font-semibold">Auto-filling</span>
          </div>
          <div className="space-y-1.5 flex-1">
            {seq.fields.map(f => {
              const highlighted = recentKey === f.key;
              const filled      = !!formData[f.key];
              const price       = formPrices[f.key];
              return (
                <div key={f.key}>
                  <label className="text-[7px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                    {f.label}
                    {highlighted && <span className="text-[6px] text-green-500 normal-case tracking-normal animate-pulse">● filling</span>}
                    {filled && !highlighted && <span className="text-[7px] text-green-500">✓</span>}
                  </label>
                  {filled ? (
                    <div className={`w-full px-1.5 py-0.5 rounded border text-[8px] flex items-center justify-between transition-all duration-300 ${
                      highlighted ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-white'
                    }`}>
                      <span className={highlighted ? 'text-green-900' : 'text-slate-800'}>{formData[f.key]}</span>
                      {price && <span className={`font-semibold flex-shrink-0 ml-1 ${highlighted ? 'text-green-700' : 'text-slate-500'}`}>{price}</span>}
                    </div>
                  ) : (
                    <div className="w-full px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[8px] text-slate-300">
                      {f.placeholder}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[6px] text-slate-400 mt-2 leading-tight border-t border-slate-100 pt-1.5">
            Prices auto-calculate from your own rate card — you set these up once when you onboard.
          </p>
        </div>

        {/* Right: transcript */}
        <div className="flex flex-col bg-slate-50 flex-1 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex-shrink-0">
            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider">Live Transcript</span>
          </div>
          <div className="flex-1 overflow-hidden p-2.5 space-y-2.5">
            {lines.length === 0 ? (
              <div className="flex items-center justify-center h-full gap-1">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1 h-1 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            ) : (
              lines.map(line => (
                <div key={line.id} className={`flex gap-1.5 ${line.speaker === 'You' ? '' : 'flex-row-reverse'}`}>
                  <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[7px] font-bold ${
                    line.speaker === 'You' ? 'bg-slate-200 text-slate-700' : 'bg-sky-400 text-white'
                  }`}>
                    {line.speaker[0]}
                  </div>
                  <div className={`max-w-[85%] px-2 py-1.5 rounded-xl text-[8px] leading-relaxed ${
                    line.speaker === 'You'
                      ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                      : 'bg-sky-400 text-white rounded-tr-sm'
                  }`}>
                    {line.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quote + send bar */}
      {quoteVisible && (
        <div className="flex-shrink-0 border-t border-slate-200 bg-[#F7F7F5] px-4 pt-2.5 pb-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="flex items-center gap-1 text-[8px] font-bold text-green-700">
                <CheckCircle2 className="w-3 h-3" /> Quote generated
              </p>
              <p className="text-[7px] text-slate-400 mt-0.5 leading-snug">{seq.quote.label}</p>
            </div>
            <div className="text-right">
              <p className="text-base font-black text-slate-900">{seq.quote.total}</p>
              <p className="text-[7px] text-slate-400">Sent in {seq.quote.sentIn}</p>
            </div>
          </div>
          {sendStep > 0 && (
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200">
              <span className="flex items-center gap-1 text-[7px] font-semibold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-2.5 h-2.5 text-green-500" /> Email sent
              </span>
              {sendStep > 1 && (
                <span className="flex items-center gap-1 text-[7px] font-semibold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-2.5 h-2.5 text-green-500" /> SMS sent
                </span>
              )}
              {sendStep > 2 && (
                <span className="flex items-center gap-1 text-[7px] font-semibold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-2.5 h-2.5 text-green-500" /> PDF invoice
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Use Case Sheet ───────────────────────────────────────────────────────────

function UseCaseSheet({ title, onClose, onBookDemo }) {
  const data = SHEET_DATA[title];

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:rounded-2xl shadow-2xl overflow-y-auto anim-slide-up"
        style={{ maxWidth: '780px', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-white z-10 border-b border-slate-100 px-8 py-5 flex items-center justify-between">
          <span className="bg-[#F0F0EE] text-green-700 border border-green-100 text-xs font-semibold px-2.5 py-1 rounded-full">
            Use case
          </span>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-8 pt-8 pb-12 space-y-10">

          {/* Title */}
          <div>
            <h2 className="text-3xl font-black text-slate-900 leading-tight mb-3">{title}</h2>
            <p className="text-slate-500 text-base leading-relaxed max-w-xl">{data.desc}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {data.stats.map(({ value, label }) => (
              <div key={label} className="bg-[#F7F7F5] rounded-2xl p-5 flex flex-col gap-2">
                <p className="text-2xl font-black text-slate-900">{value}</p>
                <p className="text-xs text-slate-500 leading-snug">{label}</p>
              </div>
            ))}
          </div>

          {/* Animated workflow demo */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Live workflow demo</p>
            <WorkflowDemo nicheKey={title} />
          </div>

          {/* Features grid */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">{data.featuresLabel}</p>
            <div className="grid grid-cols-2 gap-4">
              {data.features.map(({ title: ftitle, desc }) => (
                <div key={ftitle} className="bg-[#F7F7F5] rounded-2xl p-5">
                  <p className="font-bold text-slate-900 mb-1 text-sm">{ftitle}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-slate-900 rounded-2xl px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div>
              <p className="text-white font-black text-xl leading-tight mb-1">{data.cta.headline}</p>
              <p className="text-slate-400 text-sm leading-relaxed">{data.cta.sub}</p>
            </div>
            <button
              onClick={() => { onClose(); onBookDemo(); }}
              className="flex-shrink-0 px-6 py-3 bg-white text-slate-900 text-sm font-bold rounded-full hover:bg-slate-100 transition-colors shadow-md"
            >
              Book a demo
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Use Cases Section ────────────────────────────────────────────────────────

function UseCasesSection({ onBookDemo }) {
  const scrollRef = useRef(null);
  const [openSheet, setOpenSheet] = useState(null);

  const scroll = dir => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' });
    }
  };

  return (
    <section id="vendor-types" className="bg-white py-20 relative">
      <div className="px-10">

        {/* Top row: heading + arrows */}
        <div className="flex items-end justify-between mb-10">
          <h2 className="font-black text-slate-900 leading-tight max-w-xl"
              style={{ fontSize: 'clamp(32px, 3.5vw, 52px)' }}>
            Built for every roofing<br />job type
          </h2>
          <div className="flex items-center space-x-3 pb-2">
            <button onClick={() => scroll(-1)}
              className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:border-slate-400 hover:text-slate-700 transition-colors">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </button>
            <button onClick={() => scroll(1)}
              className="w-11 h-11 rounded-full bg-slate-900 flex items-center justify-center text-white hover:bg-slate-700 transition-colors">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable cards */}
        <div ref={scrollRef}
             className="flex space-x-5 overflow-x-auto pb-4"
             style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {USE_CASES.map(({ title, desc, cta, Icon }) => (
            <div key={title}
                 onClick={() => setOpenSheet(title)}
                 className="flex-shrink-0 flex flex-col border border-slate-200 rounded-2xl p-7 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all duration-200"
                 style={{ width: '290px' }}>
              {/* Icon area */}
              <div className="mb-6" style={{ width: '80px', height: '72px' }}>
                <Icon />
              </div>
              {/* Title */}
              <h3 className="text-lg font-bold text-slate-900 mb-3 leading-snug">{title}</h3>
              {/* Description */}
              <p className="text-sm text-slate-500 leading-relaxed flex-1">{desc}</p>
              {/* CTA */}
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-100">
                <span className="text-sm font-semibold text-slate-900">{cta}</span>
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {openSheet && (
        <UseCaseSheet title={openSheet} onClose={() => setOpenSheet(null)} onBookDemo={onBookDemo} />
      )}
      <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
           style={{ background: 'linear-gradient(to bottom, transparent, #F7F7F5)' }} />
    </section>
  );
}

// ─── Pricing Section ──────────────────────────────────────────────────────────

const PLANS = [
  {
    name:     'Standard',
    price:    189,
    desc:     'One number, unlimited conversations. Everything you need to quote on every call.',
    features: [
      'Phone number included (optional)',
      'Call transcription & recording',
      'Auto-logged call notes',
      'Unlimited calls & texts (local)',
      'AI quote builder',
      'PDF quote delivery',
    ],
    cta:       'Get started',
    highlight: true,
  },
  {
    name:     'Teams',
    price:    null,
    desc:     'Multiple numbers running on the same system — perfect for growing teams.',
    features: [
      'Everything in Standard',
      'Add multiple phone numbers',
      'Team member access',
      'Centralised quote dashboard',
      'Custom onboarding',
      'Dedicated account manager',
    ],
    cta:       'Book a consultation',
    highlight: false,
  },
];

function PricingSection({ onBookDemo }) {
  return (
    <section id="pricing" className="bg-[#F7F7F5] py-20 relative">
      <div className="max-w-4xl mx-auto px-6 md:px-10">

        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
            Simple, transparent pricing
          </h2>
          <p className="text-slate-500 text-base max-w-sm mx-auto">
            No setup fees. No hidden costs. Cancel any time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PLANS.map(({ name, price, desc, features, cta, highlight }) => (
            <div
              key={name}
              className={`rounded-2xl p-8 flex flex-col ${highlight ? 'bg-slate-900' : 'bg-white border border-slate-200'}`}
            >
              <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${highlight ? 'text-green-400' : 'text-slate-400'}`}>
                {name}
              </p>

              {price ? (
                <div className="flex items-end gap-1 mb-3">
                  <span className={`text-5xl font-black leading-none ${highlight ? 'text-white' : 'text-slate-900'}`}>${price}</span>
                  <span className={`text-sm mb-1 ${highlight ? 'text-slate-400' : 'text-slate-400'}`}>/mo</span>
                </div>
              ) : (
                <div className="mb-3">
                  <span className={`text-2xl font-black leading-none ${highlight ? 'text-white' : 'text-slate-900'}`}>Custom pricing</span>
                </div>
              )}

              <p className={`text-xs leading-relaxed mb-7 ${highlight ? 'text-slate-400' : 'text-slate-500'}`}>{desc}</p>

              <ul className="space-y-3 flex-1 mb-8">
                {features.map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <svg viewBox="0 0 10 10" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none">
                      <polyline
                        points="1.5,5 4,7.5 8.5,2.5"
                        stroke={highlight ? '#4ade80' : '#16a34a'}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className={`text-xs leading-relaxed ${highlight ? 'text-slate-300' : 'text-slate-600'}`}>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={onBookDemo}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${highlight ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-700'}`}
              >
                {cta}
              </button>
            </div>
          ))}
        </div>

      </div>
      <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
           style={{ background: 'linear-gradient(to bottom, transparent, #ffffff)' }} />
    </section>
  );
}

// ─── Final CTA Section ────────────────────────────────────────────────────────

function CTASection({ onBookDemo }) {
  return (
    <section className="bg-white px-6 md:px-10 py-8 pb-20">
      <div className="max-w-6xl mx-auto">
        <div className="bg-slate-900 rounded-3xl px-8 md:px-16 py-16 md:py-20 text-center relative overflow-hidden">
          {/* Subtle radial glow */}
          <div className="absolute inset-0 pointer-events-none"
               style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 70%)' }} />

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-5">Get started today</p>
          <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-5">
            Quote ready before<br />you hang up.
          </h2>
          <p className="text-slate-400 text-base max-w-sm mx-auto mb-10">
            Join roofing contractors who send professional quotes in minutes — not the next day.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={onBookDemo}
              className="px-7 py-3.5 bg-white text-slate-900 text-sm font-semibold rounded-full hover:bg-slate-100 transition-colors shadow-lg">
              Book a 15-minute demo
            </button>
            <a href="#"
              className="px-7 py-3.5 text-slate-400 text-sm font-medium rounded-full hover:text-white transition-colors border border-white/10 hover:border-white/20">
              View pricing
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Contact Section ──────────────────────────────────────────────────────────

function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <section id="contact" className="bg-[#F7F7F5] py-20">
      <div className="max-w-5xl mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">

          {/* Left */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Contact</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-5">
              Get in touch
            </h2>
            <p className="text-slate-500 text-base leading-relaxed mb-10">
              Have a question or want to learn more? Send us a message and we'll get back to you within one business day.
            </p>
            <div className="space-y-4">
              {[
                { label: 'Email',   value: 'hello@showmyquote.com' },
                { label: 'Support', value: 'support@showmyquote.com' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-sm text-slate-700">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            {submitted ? (
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <svg viewBox="0 0 10 10" className="w-5 h-5" fill="none">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Message sent!</h3>
                <p className="text-sm text-slate-500 leading-relaxed">We'll be in touch within one business day.</p>
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Your name</label>
                  <input
                    required type="text" value={form.name} onChange={set('name')}
                    placeholder="Jane Smith"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition placeholder:text-slate-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Email address</label>
                  <input
                    required type="email" value={form.email} onChange={set('email')}
                    placeholder="jane@yourbusiness.co.uk"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition placeholder:text-slate-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Message</label>
                  <textarea
                    required rows={4} value={form.message} onChange={set('message')}
                    placeholder="Tell us what you'd like to know…"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition resize-none placeholder:text-slate-300"
                  />
                </div>
                <button type="submit"
                  className="w-full py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors">
                  Send message
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer({ onBookDemo, onEnterApp, onTerms, onPrivacy }) {
  return (
    <footer className="bg-white border-t border-slate-100 px-6 md:px-10 pt-14 pb-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-12 mb-14">

          {/* Brand */}
          <div className="flex-shrink-0">
            <img src="/logo.svg" alt="Show My Quote" className="h-16 w-auto mb-4" />
            <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">
              AI-powered quoting for roofing contractors. Quote before you hang up.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-10">
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Product</p>
              <ul className="space-y-3">
                {['Features', 'How it works', 'Contact'].map(link => (
                  <li key={link}>
                    <a href="#" className="text-xs text-slate-400 hover:text-slate-900 transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Legal</p>
              <ul className="space-y-3">
                <li>
                  <button onClick={onPrivacy} className="text-xs text-slate-400 hover:text-slate-900 transition-colors text-left">
                    Privacy policy
                  </button>
                </li>
                <li>
                  <button onClick={onTerms} className="text-xs text-slate-400 hover:text-slate-900 transition-colors text-left">
                    Terms of service
                  </button>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">© 2025 Show My Quote. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <button onClick={onEnterApp}
              className="text-xs text-slate-400 hover:text-slate-900 transition-colors">
              Sign in
            </button>
            <button onClick={onBookDemo}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-full hover:bg-slate-700 transition-colors">
              Book a demo
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Homepage ─────────────────────────────────────────────────────────────────

export default function Homepage({ onEnterApp, onBookDemo, onTerms, onPrivacy, scrollTo, onScrollHandled }) {
  useEffect(() => {
    if (!scrollTo) return;
    const el = document.getElementById(scrollTo);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    onScrollHandled?.();
  }, [scrollTo]);

  return (
    <div className="min-h-screen"
         style={{ background: 'linear-gradient(145deg, #edf0f5 0%, #dce3ed 55%, #cdd5e2 100%)' }}>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 md:py-5 backdrop-blur-md bg-white/10">
        {/* Logo */}
        <div className="flex-shrink-0">
          <img src="/logo.svg" alt="Show My Quote" className="h-12 w-auto" />
        </div>

        {/* Centre pill nav */}
        <div className="hidden md:flex items-center bg-white/70 backdrop-blur-md border border-white/60 rounded-full px-2 py-1.5 shadow-sm gap-0.5">
          {[
            { label: 'Features',        id: 'features'      },
            { label: 'Getting started', id: 'how-it-works'  },
            { label: 'Contact',         id: 'contact'        },
          ].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
              className="px-4 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-full transition-colors"
            >
              {label}
            </button>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          <button onClick={onEnterApp}
            className="hidden md:inline-flex px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Sign in
          </button>
          <button onClick={onBookDemo}
            className="px-4 md:px-5 py-2 md:py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-700 transition-colors shadow-md">
            Book a Demo
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex flex-col md:flex-row overflow-hidden px-6 md:pl-10 md:pr-0 relative"
           style={{ minHeight: 'calc(100vh - 80px)' }}>

        {/* Left — copy */}
        <div className="w-full md:w-[44%] md:flex-shrink-0 md:self-center pt-8 md:pt-0 md:pr-10 text-center md:text-left">
          <h1 className="font-black text-slate-900 tracking-tight mb-7"
              style={{ fontSize: 'clamp(32px, 3.8vw, 54px)', lineHeight: '1.15' }}>
            The <RotatingWord /> is done<br />before you hang up.
          </h1>

          <p className="text-slate-600 text-base leading-relaxed mb-6">
            You're on the call. Our AI listens silently, transcribes every word and fills your quote form automatically. No typing. No follow-up.
          </p>

          <div className="flex flex-col sm:flex-row items-center md:items-start gap-3 mb-5">
            <button onClick={onBookDemo}
              className="px-6 py-3.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-700 transition-colors shadow-lg text-center w-full sm:w-auto">
              Book a 15-minute demo
            </button>
            <button onClick={() => document.getElementById('contact').scrollIntoView({ behavior: 'smooth' })}
              className="px-6 py-3.5 bg-white text-slate-800 text-sm font-semibold rounded-full border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm text-center w-full sm:w-auto">
              Contact us
            </button>
          </div>

          <p className="text-xl font-black text-slate-900 mb-3">Works with the tools you already use</p>
          <IntegrationTicker />
        </div>

        {/* Right — app mockup */}
        <div className="w-full mt-8 md:mt-0 md:flex-1 relative h-[400px] md:h-auto" style={{ minWidth: 0 }}>
          <AppMockup />
        </div>

        {/* Fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
             style={{ background: 'linear-gradient(to bottom, transparent, #ffffff)' }} />
      </div>

      <FeaturesSection onBookDemo={onBookDemo} />
      <HowItWorksSection />
      <UseCasesSection onBookDemo={onBookDemo} />
      {/* <PricingSection onBookDemo={onBookDemo} /> */}
      <CTASection onBookDemo={onBookDemo} />
      <ContactSection />
      <Footer onBookDemo={onBookDemo} onEnterApp={onEnterApp} onTerms={onTerms} onPrivacy={onPrivacy} />
    </div>
  );
}
