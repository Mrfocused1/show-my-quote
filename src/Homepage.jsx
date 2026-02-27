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

const ROTATING_WORDS = ['quote', 'admin', 'typing', 'counting', 'paperwork', 'invoicing'];

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
  { key: 'name',     label: 'Client Name',    placeholder: 'Listening…', half: false },
  { key: 'date',     label: 'Wedding Date',   placeholder: 'Listening…', half: true  },
  { key: 'venue',    label: 'Venue',          placeholder: 'Listening…', half: true  },
  { key: 'package',  label: 'Package',        placeholder: 'Listening…', half: true  },
  { key: 'coverage', label: 'Coverage',       placeholder: 'Listening…', half: true  },
  { key: 'guests',   label: 'Guest Count',    placeholder: 'Listening…', half: false },
  { key: 'extras',   label: 'Add-ons',        placeholder: 'Listening…', half: true  },
  { key: 'budget',   label: 'Budget',         placeholder: 'Listening…', half: true  },
];

const DEMO_SEQUENCE = [
  { delay: 1200,
    line: { speaker: 'You', text: "Thanks for calling! How can I help you today?" } },
  { delay: 5000,
    line: { speaker: 'Client', text: "Hi, I'm Emma Clarke — we're getting married next summer and looking for a photographer." },
    fills: [{ field: 'name', value: 'Emma Clarke' }] },
  { delay: 9500,
    line: { speaker: 'Client', text: "We've already got our venue — Aynhoe Park in Oxfordshire." },
    fills: [{ field: 'venue', value: 'Aynhoe Park, Oxfordshire' }] },
  { delay: 13500,
    line: { speaker: 'You', text: "Lovely! What date have you set for the wedding?" } },
  { delay: 17000,
    line: { speaker: 'Client', text: "Saturday the 21st of June — ceremony at 2pm." },
    fills: [{ field: 'date', value: 'Sat 21 Jun, 2pm ceremony' }] },
  { delay: 22000,
    line: { speaker: 'You', text: "Are you thinking full-day coverage, from bridal prep through to the evening?" } },
  { delay: 24500,
    line: { speaker: 'Client', text: "Yes — full day, prep to first dance. And around 120 guests." },
    fills: [{ field: 'coverage', value: 'Full day (prep → first dance)' }, { field: 'guests', value: '120' }] },
  { delay: 29000,
    line: { speaker: 'You', text: "Would you like a second shooter, or solo coverage?" } },
  { delay: 31500,
    line: { speaker: 'Client', text: "A second shooter, please — and the Premium package." },
    fills: [{ field: 'package', value: 'Premium Collection' }] },
  { delay: 36000,
    line: { speaker: 'Client', text: "We'd also love a wedding film and an engagement shoot beforehand." },
    fills: [{ field: 'extras', value: 'Wedding film · Engagement shoot' }] },
  { delay: 40500,
    line: { speaker: 'You', text: "Wonderful. And what's your rough budget for photography?" } },
  { delay: 43000,
    line: { speaker: 'Client', text: "We're thinking around three and a half thousand pounds." },
    fills: [{ field: 'budget', value: '~£3,500' }] },
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
          <div className="text-slate-900 font-bold text-sm">Emma Clarke</div>
          <div className="text-slate-400 text-xs mt-0.5">+44 7700 900142</div>
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
                    className={`w-full px-1.5 py-1 rounded border text-[8px] outline-none transition-all duration-300 ${
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
        {/* Logo mark */}
        <img src="/logo.svg" alt="SMQ" className="w-6 h-6 object-contain mb-3" />
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
            EC
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
  { id: 'p1', name: 'Essential', hours: 6,  price: 1200 },
  { id: 'p2', name: 'Classic',   hours: 8,  price: 1800 },
  { id: 'p3', name: 'Premium',   hours: 10, price: 2500 },
];
const DEMO_TEAM = [
  { id: 'solo',   label: 'Solo photographer', multiplier: 1.0  },
  { id: 'second', label: '+ Second shooter',  multiplier: 1.35 },
];
const DEMO_ADDONS = [
  { id: 'film',       label: 'Wedding film',     price: 800 },
  { id: 'engagement', label: 'Engagement shoot', price: 350 },
  { id: 'album',      label: 'Luxury album',     price: 450 },
  { id: 'prints',     label: 'Print package',    price: 200 },
];

const CUSTOM_STEPS = [
  { delay: 1500,  change: { packageId: 'p2' },                                 flash: 'package' },
  { delay: 4000,  change: { packageId: 'p3' },                                 flash: 'package' },
  { delay: 7000,  change: { teamId: 'second' },                                flash: 'team'    },
  { delay: 10000, change: { addons: ['film'] },                                flash: 'addons'  },
  { delay: 12500, change: { addons: ['film', 'engagement'] },                  flash: 'addons'  },
  { delay: 15000, change: { addons: ['film', 'engagement', 'album'] },         flash: 'addons'  },
];
const CUSTOM_LOOP = CUSTOM_STEPS[CUSTOM_STEPS.length - 1].delay + 5000;

function CustomisationDemo() {
  const [packageId, setPackageId] = useState('p1');
  const [teamId,    setTeamId]    = useState('solo');
  const [addons,    setAddons]    = useState([]);
  const [flash,     setFlash]     = useState(null);

  useEffect(() => {
    const ids = [];
    const run = () => {
      setPackageId('p1'); setTeamId('solo'); setAddons([]); setFlash(null);
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
  const bundle     = addons.includes('film') && teamId === 'second' ? 0.05 : 0;
  const total      = Math.round(subtotal * (1 - bundle));
  const hl = key => flash === key
    ? 'border-green-400 bg-[#F0F0EE] shadow-sm shadow-green-100'
    : 'border-slate-200 bg-white';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden w-full" style={{ maxWidth: '360px' }}>

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">Build Your Package</p>
          <p className="text-xs text-slate-400 mt-0.5">Emma Clarke · June Wedding</p>
        </div>
        <span className="text-[10px] bg-[#F0F0EE] text-green-700 border border-green-100 px-2 py-0.5 rounded-full font-semibold">
          Live preview
        </span>
      </div>

      <div className="p-5 space-y-5">

        {/* Package */}
        <div className={`rounded-xl border p-3 transition-all duration-500 ${hl('package')}`}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Photography Package</p>
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
                  <span className={`text-[10px] ${p.id === packageId ? 'text-slate-400' : 'text-slate-400'}`}>{p.hours} hrs</span>
                </div>
                <span className={p.id === packageId ? 'text-slate-300' : 'text-slate-400'}>£{p.price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className={`rounded-xl border p-3 transition-all duration-500 ${hl('team')}`}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Photography Team</p>
          <div className="space-y-1">
            {DEMO_TEAM.map(t => (
              <div key={t.id}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-300 cursor-pointer ${
                  t.id === teamId ? 'bg-slate-900 text-white' : 'text-slate-500'
                }`}>
                <div className={`w-2 h-2 rounded-full border flex-shrink-0 ${t.id === teamId ? 'border-white bg-white' : 'border-slate-300'}`} />
                {t.label}
                {t.id !== 'solo' && t.id === teamId && (
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
                  <span className="ml-auto text-[9px] text-slate-400">+£{a.price}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Price breakdown */}
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{pkg.name} ({pkg.hours} hrs)</span>
            <span>£{pkg.price.toLocaleString()}</span>
          </div>
          {teamId !== 'solo' && (
            <div className="flex justify-between text-xs text-slate-500 anim-slide-up">
              <span>Second shooter (+{Math.round((team.multiplier - 1) * 100)}%)</span>
              <span>+£{Math.round(pkg.price * (team.multiplier - 1)).toLocaleString()}</span>
            </div>
          )}
          {addonTotal > 0 && (
            <div className="flex justify-between text-xs text-slate-500 anim-slide-up">
              <span>Add-ons</span>
              <span>+£{addonTotal.toLocaleString()}</span>
            </div>
          )}
          {bundle > 0 && (
            <div className="flex justify-between text-xs text-green-600 font-medium anim-slide-up">
              <span>Bundle discount (5%)</span>
              <span>−£{Math.round(subtotal * bundle).toLocaleString()}</span>
            </div>
          )}
          <div className="border-t border-slate-200 pt-1.5 mt-1 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-900">Total</span>
            <span className="text-lg font-black text-slate-900">£{total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const LEFT_FEATURES = [
  {
    title: 'AI listens while you talk',
    desc: 'Our AI works silently in the background — transcribing every word as you lead the conversation.',
  },
  {
    title: 'Forms fill themselves',
    desc: 'Wedding date, venue, package preferences, add-ons — detected from what\'s said and entered automatically. No typing.',
  },
  {
    title: 'Quote built instantly',
    desc: 'A complete, itemised quote is ready before you even hang up — generated from the live conversation.',
  },
];

const RIGHT_FEATURES = [
  {
    title: 'Your packages, your prices',
    desc: 'Set your own packages and pricing rules — every quote reflects exactly what you charge.',
  },
  {
    title: 'Full enquiry pipeline',
    desc: 'Every call logged, every lead tracked — from first enquiry to confirmed booking, in one place.',
  },
  {
    title: 'Send in one click',
    desc: 'A branded PDF quote is ready the moment you hang up. Send it to the client straight from the call.',
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
            You stay in the conversation. Show My Quote works silently in the background — transcribing, filling forms and building quotes in real time.
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
  const ITEMS = ['Waiters', 'Soft drinks', '3 course meal', 'Cutlery', 'Celebration cake'];
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
              transform:  visible ? 'translateY(0)' : 'translateY(4px)',
              transition: 'opacity 0.2s ease, transform 0.2s ease',
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
    { label: 'Waiters',          price: '£450'  },
    { label: 'Soft drinks',      price: '£8pp'  },
    { label: '3 course meal',    price: '£65pp' },
    { label: 'Cutlery',          price: '£120'  },
    { label: 'Celebration cake', price: '£280'  },
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
  const RULE = 'add £100 for every 30 guests';
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

  const guests = stage >= 5 ? (stage - 4) * 30 : 0;
  const price  = stage >= 5 ? 280 + Math.max(0, stage - 5) * 100 : 280;

  const fadeIn = (n) => ({
    opacity:    stage >= n ? 1 : 0,
    transform:  stage >= n ? 'translateY(0)' : 'translateY(4px)',
    transition: 'opacity 0.25s ease, transform 0.25s ease',
  });

  return (
    <div className="bg-slate-800 rounded-xl p-3 flex flex-col gap-1.5 overflow-hidden">

      <div style={fadeIn(1)} className="flex items-center justify-between bg-slate-700 rounded px-2.5 py-1.5 border border-slate-600">
        <span className="text-xs font-medium text-slate-300">Celebration cake</span>
        <span className="text-xs font-bold" style={{ color: priceFlash ? '#4ade80' : '#f1f5f9', transition: 'color 0.2s ease' }}>
          £{price}
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
        <span className="text-xs text-slate-500">Guests</span>
        <span className="text-xs font-bold text-white">{guests}</span>
      </div>

    </div>
  );
}

function PublishAnim() {
  const ITEMS = [
    { label: 'Waiters',          price: 450  },
    { label: 'Soft drinks',      price: 240  },
    { label: '3 course meal',    price: 1950 },
    { label: 'Cutlery',          price: 120  },
    { label: 'Celebration cake', price: 280  },
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
          {total > 0 ? `£${total.toLocaleString('en-GB')}` : '—'}
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
            <span className="text-xs text-slate-500">£{item.price.toLocaleString('en-GB')}</span>
          </div>
        );
      })}

      <div
        className="flex items-center justify-center bg-green-900/30 rounded px-2.5 py-1.5 border border-green-700/50"
        style={{
          opacity:    phase >= 6 ? 1 : 0,
          transform:  phase >= 6 ? 'translateY(0)' : 'translateY(4px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
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
    title: 'Create your data entries',
    desc:  'Add your services, packages and line items — whether you\'re a photographer building packages, a venue listing hire options, or a florist pricing arrangements.',
    Anim: DataEntriesAnim,
  },
  {
    step: '02',
    title: 'Add pricing, timing & length',
    desc:  'Set your prices, durations and coverage lengths against each entry. Fixed fees, per-hour rates, per-head pricing — all supported. Your rates, your rules.',
    Anim: PricingAnim,
  },
  {
    step: '03',
    title: 'Add logic if needed',
    desc:  'Layer in smart rules: volume discounts, second-shooter multipliers, travel fees by distance, seasonal uplift. Applied automatically from the call.',
    Anim: LogicAnim,
  },
  {
    step: '04',
    title: 'Publish and start quoting',
    desc:  'Go live in minutes. Show My Quote listens in the background, fills your forms and builds the quote. Send it before you hang up.',
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
    title: 'Wedding photography',
    desc:  'Turn enquiry calls into itemised photography packages — coverage hours, second shooters, films and albums quoted before you hang up.',
    cta:   'See photography quoting',
    Icon: () => (
      <svg viewBox="0 0 80 72" fill="none" className="w-full h-full">
        <rect x="8" y="26" width="64" height="40" rx="5" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
        <rect x="28" y="14" width="20" height="14" rx="3" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
        <circle cx="40" cy="46" r="14" fill="white" stroke="#16a34a" strokeWidth="2"/>
        <circle cx="40" cy="46" r="8" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5"/>
        <rect x="56" y="30" width="8" height="6" rx="1.5" fill="#16a34a" opacity="0.5" stroke="#16a34a" strokeWidth="1.5"/>
        <circle cx="18" cy="34" r="3" fill="#16a34a" opacity="0.4"/>
      </svg>
    ),
  },
  {
    title: 'Wedding venues',
    desc:  'Quote venue hire, exclusive use packages and add-ons in real time — every detail captured from the call without needing to follow up.',
    cta:   'See venue quoting',
    Icon: () => (
      <svg viewBox="0 0 80 72" fill="none" className="w-full h-full">
        <rect x="14" y="28" width="52" height="40" rx="3" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
        <path d="M8 30 L40 6 L72 30Z" fill="#dcfce7" stroke="#16a34a" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M32 68 L32 52 Q32 44 40 44 Q48 44 48 52 L48 68Z" fill="white" stroke="#16a34a" strokeWidth="1.5"/>
        <rect x="18" y="36" width="10" height="10" rx="1.5" fill="#16a34a" opacity="0.3" stroke="#16a34a" strokeWidth="1.5"/>
        <rect x="52" y="36" width="10" height="10" rx="1.5" fill="#16a34a" opacity="0.3" stroke="#16a34a" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    title: 'Floral & styling',
    desc:  'From bridal bouquets to full venue decoration — capture the vision on the call and produce a detailed floral quote instantly.',
    cta:   'See floral quoting',
    Icon: () => (
      <svg viewBox="0 0 80 72" fill="none" className="w-full h-full">
        <line x1="40" y1="70" x2="40" y2="42" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M40 55 C30 50 22 40 28 30 C34 38 40 48 40 55Z" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5"/>
        <ellipse cx="40" cy="24" rx="5" ry="9" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5"/>
        <ellipse cx="40" cy="24" rx="5" ry="9" transform="rotate(60 40 33)" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5"/>
        <ellipse cx="40" cy="24" rx="5" ry="9" transform="rotate(120 40 33)" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5"/>
        <ellipse cx="40" cy="24" rx="5" ry="9" transform="rotate(180 40 33)" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5"/>
        <ellipse cx="40" cy="24" rx="5" ry="9" transform="rotate(240 40 33)" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5"/>
        <ellipse cx="40" cy="24" rx="5" ry="9" transform="rotate(300 40 33)" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.5"/>
        <circle cx="40" cy="33" r="6" fill="#16a34a"/>
      </svg>
    ),
  },
  {
    title: 'Wedding planning',
    desc:  'Turn initial consultations into comprehensive service proposals — every planning requirement noted and priced before the call ends.',
    cta:   'See planning quoting',
    Icon: () => (
      <svg viewBox="0 0 80 72" fill="none" className="w-full h-full">
        <rect x="16" y="14" width="48" height="56" rx="4" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
        <rect x="28" y="8" width="24" height="12" rx="3" fill="white" stroke="#16a34a" strokeWidth="2"/>
        <circle cx="27" cy="32" r="3" fill="#16a34a"/>
        <line x1="35" y1="32" x2="55" y2="32" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="27" cy="44" r="3" fill="#16a34a" opacity="0.5"/>
        <line x1="35" y1="44" x2="55" y2="44" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
        <circle cx="27" cy="56" r="3" fill="#16a34a" opacity="0.3"/>
        <line x1="35" y1="56" x2="48" y2="56" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
      </svg>
    ),
  },
  {
    title: 'Entertainment & music',
    desc:  'Quote DJ sets, live bands, ceremony musicians and sound equipment — set times, travel and extras captured automatically.',
    cta:   'See entertainment quoting',
    Icon: () => (
      <svg viewBox="0 0 80 72" fill="none" className="w-full h-full">
        <path d="M34 14 L34 52 Q34 60 26 60 Q18 60 18 52 Q18 44 26 44 Q30 44 34 47 L34 20 L62 14 L62 48 Q62 56 54 56 Q46 56 46 48 Q46 40 54 40 Q58 40 62 43 L62 20 Z" fill="#dcfce7" stroke="#16a34a" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M68 18 L69.5 22 L74 22 L70.5 25 L72 29 L68 26.5 L64 29 L65.5 25 L62 22 L66.5 22Z" fill="#16a34a" opacity="0.5"/>
        <path d="M12 26 L13 29 L16 29 L13.5 31 L14.5 34 L12 32.5 L9.5 34 L10.5 31 L8 29 L11 29Z" fill="#16a34a" opacity="0.3"/>
      </svg>
    ),
  },
  {
    title: 'Wedding catering',
    desc:  'Handle complex catering enquiries with dietary needs, guest counts and service styles — all quoted before the call ends.',
    cta:   'See catering quoting',
    Icon: () => (
      <svg viewBox="0 0 80 72" fill="none" className="w-full h-full">
        <ellipse cx="40" cy="50" rx="28" ry="6" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
        <path d="M12 50 Q12 22 40 22 Q68 22 68 50Z" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
        <rect x="36" y="13" width="8" height="10" rx="3" fill="#16a34a" opacity="0.5" stroke="#16a34a" strokeWidth="1.5"/>
        <ellipse cx="40" cy="58" rx="30" ry="5" fill="white" stroke="#16a34a" strokeWidth="1.5"/>
        <line x1="18" y1="30" x2="18" y2="58" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M14 30 L22 30" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="62" y1="30" x2="62" y2="58" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
];

// ─── Vendor Sheet Data ────────────────────────────────────────────────────────

const SHEET_DATA = {
  'Wedding photography': {
    desc: 'Turn every enquiry call into a detailed, itemised photography package — coverage hours, second shooters, films and albums all quoted before you hang up.',
    stats: [
      { value: '< 4 min', label: 'Average quote time' },
      { value: '93%',     label: 'Enquiries converted to quote' },
      { value: '£0',      label: 'Extra admin per booking' },
    ],
    steps: [
      { step: '1', title: 'You take the enquiry call',              desc: 'No AI agent. You lead the conversation — coverage needs, venue details, package preferences. Our AI listens silently and captures every detail.' },
      { step: '2', title: 'AI fills your form in real time',        desc: 'Wedding date, venue, coverage hours, team size and add-ons — all extracted from the conversation and entered into your quote template automatically.' },
      { step: '3', title: 'Package quote ready before you hang up', desc: 'A branded, itemised photography quote is generated from the call and ready to send the moment it ends. No typing, no follow-up admin.' },
    ],
    quote: {
      client:   'Emma & James Clarke',
      subtitle: 'Full-Day Wedding Photography · Sat 21 Jun · Aynhoe Park, Oxfordshire',
      flags:    ['Second shooter', 'Wedding film'],
      lines: [
        { label: 'Premium Collection — full day, 10 hrs coverage', price: '£2,500'   },
        { label: 'Second shooter (+35%)',                           price: '+£875'    },
        { label: 'Cinematic wedding film',                          price: '+£800'    },
        { label: 'Engagement session (60 min)',                     price: '+£350'    },
        { label: 'Online gallery — unlimited downloads',            price: 'Included' },
        { label: 'Print credit & luxury album',                     price: '+£450'    },
      ],
      note:          null,
      meta:          '10 hrs · 2 photographers · Aynhoe Park',
      strikethrough: null,
      total:         '£4,975',
      sentIn:        '0:52',
    },
    features: [
      { title: 'Package tier builder',    desc: 'Essential, Classic and Premium packages pre-set with hours, team size and deliverables — select on the call, priced instantly.' },
      { title: 'Second shooter pricing',  desc: 'Your second shooter rate is pre-set as a percentage or fixed fee. Mentioned on the call — added to the quote automatically.' },
      { title: 'Film & album add-ons',    desc: 'Wedding films, engagement shoots, luxury albums and print credits are pre-built add-ons ready to quote with a single mention.' },
      { title: 'Travel fee automation',   desc: 'Distance to the venue is captured on the call and your travel rate applied as a line item automatically — no separate calculation.' },
    ],
    featuresLabel: 'Photography-specific features',
    cta: {
      headline: 'Quote your next wedding enquiry in under 4 minutes.',
      sub:      'Book a demo and see how Show My Quote turns a photography enquiry call into a sent quote.',
    },
  },

  'Wedding venues': {
    desc: 'Quote venue hire, exclusive use packages, catering allowances and extras in real time — every detail captured from the call without needing to follow up.',
    stats: [
      { value: '< 5 min', label: 'Average quote time' },
      { value: '91%',     label: 'Enquiries converted to quote' },
      { value: '£0',      label: 'Extra admin per enquiry' },
    ],
    steps: [
      { step: '1', title: 'You take the venue enquiry',           desc: 'No AI agent. You lead the conversation — wedding date, guest count, spaces required, catering preferences. Our AI listens silently throughout.' },
      { step: '2', title: 'AI fills your form in real time',      desc: 'Date, guest headcount, package tier, catering allowance and extras — all extracted and entered into your quote template as the call progresses.' },
      { step: '3', title: 'Venue quote ready before you hang up', desc: 'A full venue hire quote — spaces, packages, catering and extras — is generated from the call and ready to send immediately.' },
    ],
    quote: {
      client:   'Sophie & Daniel Whitmore',
      subtitle: 'Exclusive Use Venue Hire · Sat 14 Sep · Thornfield Manor, Kent',
      flags:    ['Exclusive use', 'Civil ceremony'],
      lines: [
        { label: 'Exclusive use hire — full day (ceremony to midnight)', price: '£8,500'  },
        { label: 'Bridal suite & getting-ready room',                    price: '+£600'   },
        { label: 'Ceremony room setup & chair hire',                     price: '+£850'   },
        { label: 'Catering allowance (150 guests)',                      price: '+£9,750' },
        { label: 'Evening reception extension (midnight → 1am)',         price: '+£750'   },
        { label: 'Grounds & garden hire for outdoor ceremony',           price: '+£500'   },
      ],
      note:          null,
      meta:          '150 guests · full day · Thornfield Manor, Kent',
      strikethrough: null,
      total:         '£20,950',
      sentIn:        '1:08',
    },
    features: [
      { title: 'Package tier selector',    desc: 'Midweek, weekend and exclusive use packages are pre-set with pricing. Guest count auto-adjusts the catering allowance line item.' },
      { title: 'Capacity-based pricing',   desc: 'Guest headcount is captured on the call and catering allowances, staffing and table hire costs calculated automatically.' },
      { title: 'Space & room add-ons',     desc: 'Ceremony rooms, bridal suites, garden hire and marquee spaces are pre-built add-ons — mentioned on the call, added to the quote instantly.' },
      { title: 'Catering allowance logic', desc: 'Your per-head catering rate is pre-set. Guest count captured on the call multiplies automatically into the catering line item.' },
    ],
    featuresLabel: 'Venue-specific features',
    cta: {
      headline: 'Quote every venue enquiry before the call ends.',
      sub:      'Book a demo and see how Show My Quote handles complex venue hire enquiries in real time.',
    },
  },

  'Floral & styling': {
    desc: 'From bridal bouquets to full venue transformation — capture the vision on the call and produce a detailed, itemised floral quote before you hang up.',
    stats: [
      { value: '< 6 min', label: 'Average quote time' },
      { value: '88%',     label: 'Enquiries converted to quote' },
      { value: '£0',      label: 'Extra admin per booking' },
    ],
    steps: [
      { step: '1', title: "You discuss the couple's vision",         desc: "No AI agent. You lead the consultation — colour palette, flower preferences, venue spaces, styling scale. Our AI listens and captures every detail." },
      { step: '2', title: 'AI builds the floral brief automatically', desc: 'Bridal party sizes, arrangement types, table count and styling elements — all extracted from conversation and entered into your quote template.' },
      { step: '3', title: 'Itemised floral quote ready instantly',   desc: 'A detailed, line-by-line floral and styling quote is generated from the call and ready to send the moment you hang up.' },
    ],
    quote: {
      client:   'Olivia & Marcus Pemberton',
      subtitle: 'Full Wedding Florals · Fri 6 Sep · The Old Rectory, Suffolk',
      flags:    ['Seasonal blooms', 'Church + reception'],
      lines: [
        { label: 'Bridal bouquet — garden-style, mixed florals', price: '£350'    },
        { label: 'Bridesmaid bouquets ×4',                       price: '+£560'   },
        { label: 'Buttonholes ×8 (groom, groomsmen, fathers)',   price: '+£160'   },
        { label: 'Ceremony arch — full floral draping',          price: '+£1,200' },
        { label: 'Church pew ends ×16',                          price: '+£480'   },
        { label: 'Table centrepieces ×20 (reception)',           price: '+£1,800' },
        { label: 'Delivery, setup & breakdown',                  price: '+£350'   },
      ],
      note:          null,
      meta:          '20 tables · Church + reception · The Old Rectory, Suffolk',
      strikethrough: null,
      total:         '£4,900',
      sentIn:        '1:14',
    },
    features: [
      { title: 'Item-by-item floral quoting', desc: 'Bouquets, buttonholes, ceremony arches, pew ends and centrepieces are pre-built items in your price list — quoted per unit on the call.' },
      { title: 'Table count auto-pricing',    desc: 'Reception table count is captured on the call and your centrepiece rate multiplied automatically — no manual calculation needed.' },
      { title: 'Bridal party sizing',         desc: 'Number of bridesmaids, groomsmen and flower girls is captured and bouquets, buttonholes and corsages added to the quote per head.' },
      { title: 'Delivery & setup costing',    desc: 'Your delivery, setup and breakdown rates are pre-set. Distance to venue is noted and travel cost added automatically.' },
    ],
    featuresLabel: 'Floral-specific features',
    cta: {
      headline: 'Quote your next floral consultation before you hang up.',
      sub:      'Book a demo and see how Show My Quote handles the detail of wedding floral enquiries.',
    },
  },

  'Wedding planning': {
    desc: 'Turn initial consultations into comprehensive service proposals — every planning requirement noted and priced before the call ends, with no follow-up admin.',
    stats: [
      { value: '< 5 min', label: 'Average quote time' },
      { value: '96%',     label: 'Enquiries converted to quote' },
      { value: '£0',      label: 'Extra admin per booking' },
    ],
    steps: [
      { step: '1', title: 'You lead the initial consultation',      desc: 'No AI agent. You guide the conversation — service scope, wedding scale, supplier needs, timeline. Our AI listens and builds the brief in real time.' },
      { step: '2', title: 'AI captures the full planning scope',    desc: 'Service tier, guest count, supplier coordination needs, day-of management and extras — all extracted and entered into your proposal template automatically.' },
      { step: '3', title: 'Service proposal ready before you hang up', desc: 'A clear, itemised planning proposal is generated from the call and ready to send the moment it ends — no admin required.' },
    ],
    quote: {
      client:   'Charlotte & Ben Ashworth',
      subtitle: 'Full Wedding Planning Service · Aug 2025 · Bamburgh Castle, Northumberland',
      flags:    ['Full planning', 'Supplier coordination'],
      lines: [
        { label: 'Full planning service — conception to day-of',      price: '£4,800'   },
        { label: 'Supplier sourcing & coordination (12 suppliers)',    price: '+£1,200'  },
        { label: 'On-the-day coordination team (2 coordinators)',      price: '+£800'    },
        { label: 'Rehearsal dinner planning & management',             price: '+£400'    },
        { label: 'Guest communication & RSVP management',             price: '+£350'    },
        { label: 'Budget tracking & payment schedule management',      price: 'Included' },
      ],
      note:          null,
      meta:          '180 guests · full service · Bamburgh Castle',
      strikethrough: null,
      total:         '£7,550',
      sentIn:        '0:56',
    },
    features: [
      { title: 'Service tier builder',        desc: 'Full planning, partial planning and day-of coordination tiers are pre-set. Select the right scope on the call and the quote builds itself.' },
      { title: 'Supplier count pricing',      desc: 'Number of suppliers to coordinate is captured on the call and your per-supplier coordination rate applied automatically.' },
      { title: 'Add-on service modules',      desc: 'Rehearsal dinner planning, RSVP management, seating plans and décor coordination are pre-built add-ons ready to quote on mention.' },
      { title: 'Payment schedule generation', desc: 'Your deposit and instalment schedule is automatically included in the proposal — based on months to wedding and service tier.' },
    ],
    featuresLabel: 'Planning-specific features',
    cta: {
      headline: 'Deliver your service proposal before you end the call.',
      sub:      'Book a demo and see how Show My Quote turns a planning consultation into a sent proposal.',
    },
  },

  'Entertainment & music': {
    desc: 'Quote DJ sets, live bands, ceremony musicians and sound equipment — set times, travel fees and extras captured automatically from every enquiry call.',
    stats: [
      { value: '< 3 min', label: 'Average quote time' },
      { value: '94%',     label: 'Enquiries converted to quote' },
      { value: '£0',      label: 'Extra admin per booking' },
    ],
    steps: [
      { step: '1', title: 'You take the entertainment enquiry',     desc: 'No AI agent. You lead the conversation — event type, timings, venue, act preferences, sound requirements. Our AI listens silently and captures everything.' },
      { step: '2', title: 'AI fills the booking form in real time', desc: 'Set times, performance hours, equipment needs, travel distance and extras — all extracted from the call and entered into your quote template automatically.' },
      { step: '3', title: 'Entertainment quote ready instantly',    desc: 'A detailed performance and equipment quote is generated from the call and ready to send the moment you hang up.' },
    ],
    quote: {
      client:   'Lucy & Tom Richardson',
      subtitle: 'Wedding Entertainment Package · Sat 29 Mar · Elmore Court, Gloucestershire',
      flags:    ['DJ + Live band', 'Ceremony music'],
      lines: [
        { label: 'Live band — 3-piece (2 × 45 min sets)',      price: '£2,400' },
        { label: 'DJ set — ceremony to close (6 hrs)',          price: '+£1,200'},
        { label: 'Ceremony acoustic duo (ceremony & drinks)',   price: '+£600'  },
        { label: 'Full PA & lighting rig',                     price: '+£800'  },
        { label: 'Wireless mic for speeches',                  price: '+£150'  },
        { label: 'Travel & transport (145 miles)',              price: '+£290'  },
      ],
      note:          null,
      meta:          '6 hrs performance · full PA · Elmore Court, Gloucestershire',
      strikethrough: null,
      total:         '£5,440',
      sentIn:        '0:44',
    },
    features: [
      { title: 'Set time & hour pricing',   desc: 'Performance hours and set lengths are captured on the call and your hourly or fixed-set rates applied automatically to the quote.' },
      { title: 'Equipment hire line items', desc: 'PA systems, lighting rigs, wireless mics and screens are pre-priced in your settings and added to the quote when mentioned on the call.' },
      { title: 'Travel fee automation',     desc: 'Venue distance is captured and your mileage rate applied automatically as a line item — no separate calculation required.' },
      { title: 'Multi-act quoting',         desc: 'Bands, DJs, acoustic duos and ceremony musicians are quoted as separate line items — combined into a single clear quote from one call.' },
    ],
    featuresLabel: 'Entertainment-specific features',
    cta: {
      headline: 'Quote your next entertainment enquiry before you hang up.',
      sub:      'Book a demo and see how Show My Quote turns a wedding entertainment call into a sent quote.',
    },
  },

  'Wedding catering': {
    desc: 'Handle complex catering enquiries with dietary needs, guest counts and service styles — every detail captured live on the call and quoted before you hang up.',
    stats: [
      { value: '< 4 min', label: 'Average quote time' },
      { value: '94%',     label: 'Enquiries converted to quote' },
      { value: '£0',      label: 'Extra admin per booking' },
    ],
    steps: [
      { step: '1', title: 'You answer and lead the call',    desc: 'No AI agent. You speak with the couple naturally — asking about guest count, menu preferences and dietary requirements. Our AI simply listens in the background.' },
      { step: '2', title: 'AI fills your form in real time', desc: "Guest count, venue, dietary needs, service style and menu choices — detected from what's said and entered into your quote template automatically." },
      { step: '3', title: 'Quote ready before you hang up',  desc: 'A branded, itemised catering quote is generated from the call and ready to send the moment it ends. No typing, no follow-up admin.' },
    ],
    quote: {
      client:   'Sarah & James Thompson',
      subtitle: 'Wedding Reception Catering · Sat 12 Jul · The Orchid Barn, Surrey',
      flags:    ['Gluten-free ×4', 'Vegan ×6', 'Nut allergy ×1'],
      lines: [
        { label: 'Classic Elegance — Plated 3-course (120 guests)', price: '£10,200' },
        { label: 'Plated service uplift (+40%)',                     price: '+£4,080' },
        { label: 'Welcome drinks reception',                         price: '+£960'   },
        { label: 'Evening canapé station',                           price: '+£1,440' },
        { label: 'Bar package (per head)',                           price: '+£3,000' },
        { label: 'Dietary alternates (GF / Vegan / Nut-free)',      price: '+£480'   },
        { label: 'Lead manager + 14 staff (8 hrs)',                 price: '+£3,200' },
      ],
      note:          'Volume discount (5%) applied',
      meta:          '120 guests · 8 hrs · The Orchid Barn',
      strikethrough: '£23,360',
      total:         '£22,192',
      sentIn:        '0:47',
    },
    features: [
      { title: 'Dietary flag detection',    desc: 'Gluten-free, vegan, nut allergies and more are extracted from the call and priced as alternates automatically.' },
      { title: 'Tiered staffing ratios',    desc: 'Staff headcount auto-scales to guest count and service style — your exact ratios, your rates.' },
      { title: 'Multi-course menu builder', desc: 'Canapés, plated dinners, evening buffets and late-night snacks quoted as discrete line items from a single call.' },
      { title: 'Venue & date capture',      desc: 'Venue name and event date are captured live and displayed on the quote so nothing is missed.' },
    ],
    featuresLabel: 'Catering-specific features',
    cta: {
      headline: 'Quote your next catering enquiry before the call ends.',
      sub:      'Book a demo and see how Show My Quote handles complex wedding catering enquiries in real time.',
    },
  },
};

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

          {/* How it works */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">How it works</p>
            <div className="space-y-5">
              {data.steps.map(({ step, title: stepTitle, desc }) => (
                <div key={step} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center">{step}</div>
                  <div className="pt-1">
                    <p className="font-bold text-slate-900 mb-1">{stepTitle}</p>
                    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sample quote */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Sample quote preview</p>
            <div className="bg-[#F7F7F5] rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">{data.quote.client}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{data.quote.subtitle}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className="text-[10px] bg-[#F0F0EE] text-green-700 border border-green-100 px-2 py-0.5 rounded-full font-semibold">Auto-generated</span>
                  {data.quote.flags && (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {data.quote.flags.map(flag => (
                        <span key={flag} className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full font-semibold">{flag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-5 space-y-2">
                {data.quote.lines.map(({ label, price }) => (
                  <div key={label} className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-slate-600 leading-snug">{label}</span>
                    <span className="font-semibold text-slate-900 flex-shrink-0">{price}</span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-3 mt-2 flex items-center justify-between">
                  <div>
                    {data.quote.note && <p className="text-xs text-green-600 font-semibold">{data.quote.note}</p>}
                    <p className="text-xs text-slate-400 mt-0.5">{data.quote.meta}</p>
                  </div>
                  <div className="text-right">
                    {data.quote.strikethrough && <p className="text-xs text-slate-400 line-through">{data.quote.strikethrough}</p>}
                    <p className="text-xl font-black text-slate-900">{data.quote.total}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border-t border-slate-100 px-6 py-3 flex items-center justify-between">
                <p className="text-xs text-slate-400">Quote sent via email & PDF · Valid 14 days</p>
                <div className="flex items-center gap-1 text-xs font-semibold text-green-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Sent in {data.quote.sentIn}
                </div>
              </div>
            </div>
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
            Built for every wedding<br />vendor type
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
                  <span className={`text-5xl font-black leading-none ${highlight ? 'text-white' : 'text-slate-900'}`}>£{price}</span>
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
            Join wedding vendors who send professional quotes in minutes — not days.
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
              AI-powered quoting for wedding vendors. Quote before you hang up.
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
            You take the call. Our AI listens in the background, transcribes the conversation and fills your forms — automatically.
          </p>

          <div className="flex flex-col sm:flex-row items-center md:items-start gap-3 mb-5">
            <button onClick={onBookDemo}
              className="px-6 py-3.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-700 transition-colors shadow-lg text-center w-full sm:w-auto">
              Book a 15-minute demo
            </button>
            <button onClick={onEnterApp}
              className="px-6 py-3.5 bg-white text-slate-800 text-sm font-semibold rounded-full border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm text-center w-full sm:w-auto">
              See how it works
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
