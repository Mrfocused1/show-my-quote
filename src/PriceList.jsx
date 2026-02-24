import React, { useState } from 'react';
import { Plus, Trash2, Search, ChevronDown, ChevronRight, Edit3, Check, X } from 'lucide-react';

// ─── Colour palette per category ─────────────────────────────────────────────
const CAT_COLORS = {
  amber:   { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-100'    },
  blue:    { dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-700 border-blue-100'       },
  green:   { dot: 'bg-green-400',   badge: 'bg-green-50 text-green-700 border-green-100'    },
  purple:  { dot: 'bg-purple-400',  badge: 'bg-purple-50 text-purple-700 border-purple-100' },
  rose:    { dot: 'bg-rose-400',    badge: 'bg-rose-50 text-rose-700 border-rose-100'       },
  slate:   { dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-600 border-slate-200'   },
  teal:    { dot: 'bg-teal-400',    badge: 'bg-teal-50 text-teal-700 border-teal-100'       },
  orange:  { dot: 'bg-orange-400',  badge: 'bg-orange-50 text-orange-700 border-orange-100' },
  indigo:  { dot: 'bg-indigo-400',  badge: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  emerald: { dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  sky:     { dot: 'bg-sky-400',     badge: 'bg-sky-50 text-sky-700 border-sky-100'          },
  pink:    { dot: 'bg-pink-400',    badge: 'bg-pink-50 text-pink-700 border-pink-100'       },
};
const COLOR_KEYS = Object.keys(CAT_COLORS);

// ─── Seed data ────────────────────────────────────────────────────────────────
const SEED = [
  // ── Food ──────────────────────────────────────────────────────────────────
  {
    id: 'cat-1', name: 'Starters', color: 'amber', collapsed: true,
    items: [
      { id: 'i1',  name: 'Caesar Salad',              price: 12,  unit: 'per person', notes: '' },
      { id: 'i2',  name: 'Soup of the Day',            price: 8,   unit: 'per person', notes: '' },
      { id: 'i3',  name: 'Bruschetta Board',           price: 14,  unit: 'per person', notes: 'Serves 2' },
      { id: 'i4',  name: 'Prawn Cocktail',             price: 18,  unit: 'per person', notes: '' },
      { id: 'i5',  name: 'Smoked Salmon Blini',        price: 16,  unit: 'per person', notes: '' },
      { id: 'i6',  name: 'Canapé Selection (6 pcs)',   price: 22,  unit: 'per person', notes: 'Passed around' },
    ],
  },
  {
    id: 'cat-2', name: 'Mains', color: 'blue', collapsed: true,
    items: [
      { id: 'i7',  name: 'Beef Wellington',            price: 68,  unit: 'per person', notes: '' },
      { id: 'i8',  name: 'Pan-Seared Salmon',          price: 42,  unit: 'per person', notes: '' },
      { id: 'i9',  name: 'Chicken Supreme',            price: 35,  unit: 'per person', notes: '' },
      { id: 'i10', name: 'Slow-Roast Lamb Shoulder',   price: 52,  unit: 'per person', notes: '' },
      { id: 'i11', name: 'Mushroom Wellington',        price: 28,  unit: 'per person', notes: 'Vegan' },
      { id: 'i12', name: 'Buffet (3-course spread)',   price: 38,  unit: 'per person', notes: 'Self-service' },
    ],
  },
  {
    id: 'cat-3', name: 'Desserts', color: 'rose', collapsed: true,
    items: [
      { id: 'i13', name: 'Crème Brûlée',               price: 12,  unit: 'per person', notes: '' },
      { id: 'i14', name: 'Chocolate Fondant',          price: 11,  unit: 'per person', notes: '' },
      { id: 'i15', name: 'Seasonal Sorbet',            price: 8,   unit: 'per person', notes: 'Vegan' },
      { id: 'i16', name: 'Cheeseboard & Chutney',      price: 15,  unit: 'per person', notes: 'Serves 2–3' },
      { id: 'i17', name: 'Wedding Cake (cutting fee)', price: 3,   unit: 'per person', notes: 'Customer supplies cake' },
    ],
  },

  // ── Drinks & Bar ──────────────────────────────────────────────────────────
  {
    id: 'cat-4', name: 'Drinks & Bar', color: 'teal', collapsed: true,
    items: [
      { id: 'i18', name: 'Welcome Drink (Prosecco)',   price: 8,   unit: 'per person', notes: '' },
      { id: 'i19', name: 'Wine Package (half bottle)', price: 22,  unit: 'per person', notes: 'Red or white' },
      { id: 'i20', name: 'Open Bar — 4 hours',        price: 55,  unit: 'per person', notes: 'House spirits & mixers' },
      { id: 'i21', name: 'Open Bar — 6 hours',        price: 75,  unit: 'per person', notes: 'House spirits & mixers' },
      { id: 'i22', name: 'Soft Drinks & Water Station', price: 6, unit: 'per person', notes: '' },
      { id: 'i23', name: 'Cocktail Reception (2 hrs)', price: 30, unit: 'per person', notes: '4 cocktails per person' },
      { id: 'i24', name: 'Mocktail Package',           price: 14,  unit: 'per person', notes: 'Alcohol-free' },
      { id: 'i25', name: 'Tea & Coffee Service',       price: 5,   unit: 'per person', notes: '' },
      { id: 'i26', name: 'Late Bar Extension (1 hr)',  price: 12,  unit: 'per person', notes: 'Per extra hour' },
    ],
  },

  // ── Staff & Labour ────────────────────────────────────────────────────────
  {
    id: 'cat-5', name: 'Staff & Labour', color: 'purple', collapsed: true,
    items: [
      { id: 'i27', name: 'Head Chef',                  price: 450, unit: 'per shift',  notes: '8-hr shift' },
      { id: 'i28', name: 'Sous Chef',                  price: 300, unit: 'per shift',  notes: '8-hr shift' },
      { id: 'i29', name: 'Commis Chef',                price: 180, unit: 'per shift',  notes: '8-hr shift' },
      { id: 'i30', name: 'Kitchen Porter',             price: 120, unit: 'per shift',  notes: '8-hr shift' },
      { id: 'i31', name: 'Event Coordinator',          price: 400, unit: 'per shift',  notes: 'Lead on-site contact' },
      { id: 'i32', name: 'Head Waiter / Maitre d\'',   price: 260, unit: 'per shift',  notes: '' },
      { id: 'i33', name: 'Waiter / Server',            price: 180, unit: 'per shift',  notes: '8-hr shift' },
      { id: 'i34', name: 'Bartender',                  price: 200, unit: 'per shift',  notes: '' },
      { id: 'i35', name: 'Bar Back',                   price: 140, unit: 'per shift',  notes: 'Bar support' },
      { id: 'i36', name: 'Runner',                     price: 130, unit: 'per shift',  notes: 'Food & dish running' },
      { id: 'i37', name: 'Security / Door Staff',      price: 220, unit: 'per shift',  notes: 'SIA licensed' },
      { id: 'i38', name: 'Cleaning Staff',             price: 150, unit: 'per shift',  notes: 'Post-event clean' },
      { id: 'i39', name: 'Overtime Rate (per person)', price: 30,  unit: 'per hour',   notes: 'Beyond agreed hours' },
    ],
  },

  // ── Time & Scheduling ─────────────────────────────────────────────────────
  {
    id: 'cat-6', name: 'Time & Scheduling', color: 'indigo', collapsed: true,
    items: [
      { id: 'i40', name: 'Setup Time (standard)',      price: 200, unit: 'flat fee',   notes: 'Up to 2 hrs pre-event' },
      { id: 'i41', name: 'Extended Setup (per hour)',  price: 85,  unit: 'per hour',   notes: 'Beyond 2-hr standard' },
      { id: 'i42', name: 'Breakdown / Strike',         price: 150, unit: 'flat fee',   notes: 'Post-event clear-down' },
      { id: 'i43', name: 'Early Access Fee',           price: 120, unit: 'flat fee',   notes: 'Venue access before 8am' },
      { id: 'i44', name: 'Late Finish Surcharge',      price: 100, unit: 'flat fee',   notes: 'Finish after midnight' },
      { id: 'i45', name: 'Weekend Premium',            price: 15,  unit: 'per person', notes: 'Sat & Sun events' },
      { id: 'i46', name: 'Bank Holiday Premium',       price: 20,  unit: 'per person', notes: 'All UK bank holidays' },
      { id: 'i47', name: 'Same-Day Booking Surcharge', price: 250, unit: 'flat fee',   notes: '< 48 hrs notice' },
      { id: 'i48', name: 'Time on Site (per hour)',    price: 120, unit: 'per hour',   notes: 'General hourly rate' },
    ],
  },

  // ── Location & Travel ─────────────────────────────────────────────────────
  {
    id: 'cat-7', name: 'Location & Travel', color: 'sky', collapsed: true,
    items: [
      { id: 'i49', name: 'Local Travel (within 10 mi)', price: 0,  unit: 'flat fee',   notes: 'Complimentary' },
      { id: 'i50', name: 'Regional Travel (10–30 mi)',  price: 80, unit: 'flat fee',   notes: '' },
      { id: 'i51', name: 'Extended Travel (30–60 mi)',  price: 180, unit: 'flat fee',  notes: '' },
      { id: 'i52', name: 'National Travel (60 mi+)',    price: 350, unit: 'flat fee',  notes: 'Plus accommodation' },
      { id: 'i53', name: 'Mileage (staff vehicles)',    price: 0.45, unit: 'per mile', notes: 'HMRC rate' },
      { id: 'i54', name: 'Overnight Accommodation',     price: 120, unit: 'per person', notes: 'Per staff member' },
      { id: 'i55', name: 'Congestion / ULEZ Charge',    price: 25,  unit: 'flat fee',  notes: 'Central London events' },
      { id: 'i56', name: 'Parking (per vehicle)',       price: 20,  unit: 'per item',  notes: 'On-site or nearby' },
      { id: 'i57', name: 'Toll / Ferry Charges',        price: 30,  unit: 'flat fee',  notes: 'Where applicable' },
    ],
  },

  // ── Equipment & Rentals ───────────────────────────────────────────────────
  {
    id: 'cat-8', name: 'Equipment & Rentals', color: 'green', collapsed: true,
    items: [
      { id: 'i58', name: 'Round Table (seats 10)',      price: 45,  unit: 'per item',  notes: '' },
      { id: 'i59', name: 'Folding Chair',               price: 3,   unit: 'per item',  notes: '' },
      { id: 'i60', name: 'Chiavari Chair',              price: 8,   unit: 'per item',  notes: '' },
      { id: 'i61', name: 'Tablecloth (round)',          price: 12,  unit: 'per item',  notes: '' },
      { id: 'i62', name: 'Linen Napkins (set of 10)',   price: 18,  unit: 'per item',  notes: '' },
      { id: 'i63', name: 'Crockery Set (per 10 covers)', price: 40, unit: 'per item',  notes: 'Plates, bowls, side plates' },
      { id: 'i64', name: 'Cutlery Set (per 10 covers)', price: 25,  unit: 'per item',  notes: 'Starter, main, dessert' },
      { id: 'i65', name: 'Glassware Set (per 10)',      price: 30,  unit: 'per item',  notes: 'Wine, water, champagne' },
      { id: 'i66', name: 'Chafing Dish / Bain Marie',   price: 35,  unit: 'per item',  notes: 'Keeps food warm' },
      { id: 'i67', name: 'Buffet Stand & Risers',       price: 60,  unit: 'per item',  notes: 'Tiered display' },
      { id: 'i68', name: 'Bar Counter (portable)',      price: 300, unit: 'flat fee',  notes: 'Full bar setup' },
      { id: 'i69', name: 'Cocktail Poseur Table',       price: 20,  unit: 'per item',  notes: '' },
      { id: 'i70', name: 'Dance Floor (per sq m)',      price: 12,  unit: 'per item',  notes: 'Wooden parquet' },
      { id: 'i71', name: 'Marquee / Tent (small)',      price: 600, unit: 'flat fee',  notes: 'Up to 50 guests' },
      { id: 'i72', name: 'Marquee / Tent (large)',      price: 1200, unit: 'flat fee', notes: '50–150 guests' },
      { id: 'i73', name: 'Generator (day hire)',        price: 250, unit: 'flat fee',  notes: 'Where mains unavailable' },
      { id: 'i74', name: 'AV / PA System',              price: 300, unit: 'flat fee',  notes: 'Speakers, mic, mixer' },
      { id: 'i75', name: 'Portable Toilet Unit',        price: 180, unit: 'per item',  notes: 'Outdoor events' },
      { id: 'i76', name: 'Patio Heater',                price: 45,  unit: 'per item',  notes: '' },
      { id: 'i77', name: 'Cool Box / Ice Storage',      price: 30,  unit: 'per item',  notes: '' },
    ],
  },

  // ── Service & Administration ───────────────────────────────────────────────
  {
    id: 'cat-9', name: 'Service & Administration', color: 'slate', collapsed: true,
    items: [
      { id: 'i78', name: 'Initial Consultation',        price: 0,   unit: 'flat fee',  notes: 'Complimentary (1 hr)' },
      { id: 'i79', name: 'Menu Tasting Session',        price: 150, unit: 'flat fee',  notes: 'Up to 4 guests' },
      { id: 'i80', name: 'Site Visit / Recce',          price: 80,  unit: 'flat fee',  notes: 'Outside local area +travel' },
      { id: 'i81', name: 'Event Planning & Admin',      price: 250, unit: 'flat fee',  notes: 'Full event management' },
      { id: 'i82', name: 'Risk Assessment & Method Statement', price: 120, unit: 'flat fee', notes: '' },
      { id: 'i83', name: 'Public Liability Insurance',  price: 95,  unit: 'flat fee',  notes: 'Per event (if not covered)' },
      { id: 'i84', name: 'Menu Design & Printing',      price: 75,  unit: 'flat fee',  notes: 'Per 50 menus' },
      { id: 'i85', name: 'Service Charge',              price: 12.5, unit: 'per person', notes: 'Optional gratuity' },
      { id: 'i86', name: 'Rush / Last-Minute Fee',      price: 200, unit: 'flat fee',  notes: '< 1 week notice' },
      { id: 'i87', name: 'Cancellation Fee (30 days)',  price: 25,  unit: 'per person', notes: '25% of agreed total' },
    ],
  },

  // ── Dietary & Special Requirements ───────────────────────────────────────
  {
    id: 'cat-10', name: 'Dietary & Special Requirements', color: 'orange', collapsed: true,
    items: [
      { id: 'i88', name: 'Allergen Management (14)',    price: 75,  unit: 'flat fee',  notes: 'Full allergen assessment' },
      { id: 'i89', name: 'Vegan Menu Supplement',       price: 4,   unit: 'per person', notes: 'Per vegan guest' },
      { id: 'i90', name: 'Gluten-Free Prep Surcharge',  price: 5,   unit: 'per person', notes: 'Dedicated prep area' },
      { id: 'i91', name: 'Halal Certified Menu',        price: 6,   unit: 'per person', notes: 'Certified supplier' },
      { id: 'i92', name: 'Kosher Catering',             price: 12,  unit: 'per person', notes: 'Requires licensed kitchen' },
      { id: 'i93', name: 'Children\'s Menu',            price: 18,  unit: 'per person', notes: 'Under-12s' },
      { id: 'i94', name: 'Nut-Free Kitchen Protocol',   price: 50,  unit: 'flat fee',  notes: '' },
    ],
  },

  // ── Décor & Presentation ─────────────────────────────────────────────────
  {
    id: 'cat-11', name: 'Décor & Presentation', color: 'pink', collapsed: true,
    items: [
      { id: 'i95', name: 'Floral Centrepiece (table)',  price: 45,  unit: 'per table', notes: 'Fresh flowers' },
      { id: 'i96', name: 'Balloon Arch / Display',      price: 180, unit: 'flat fee',  notes: '' },
      { id: 'i97', name: 'Themed Table Backdrop',       price: 250, unit: 'flat fee',  notes: '' },
      { id: 'i98', name: 'Printed Menu Cards',          price: 2,   unit: 'per person', notes: 'Personalised' },
      { id: 'i99', name: 'Place Name Cards',            price: 1.5, unit: 'per person', notes: '' },
      { id: 'i100', name: 'Table Number Stands',        price: 5,   unit: 'per table', notes: '' },
      { id: 'i101', name: 'Candle / Tealight Package',  price: 3,   unit: 'per table', notes: '' },
      { id: 'i102', name: 'Charger Plates (per 10)',    price: 30,  unit: 'per item',  notes: 'Decorative base plate' },
      { id: 'i103', name: 'Photo / Display Board',      price: 95,  unit: 'flat fee',  notes: 'Welcome / seating display' },
    ],
  },

  // ── Logistics & Transport ────────────────────────────────────────────────
  {
    id: 'cat-12', name: 'Logistics & Transport', color: 'emerald', collapsed: true,
    items: [
      { id: 'i104', name: 'Refrigerated Van (day hire)', price: 180, unit: 'flat fee', notes: 'Temperature-controlled' },
      { id: 'i105', name: 'Standard Catering Van',       price: 120, unit: 'flat fee', notes: '' },
      { id: 'i106', name: 'Cold Storage Unit (on-site)', price: 90,  unit: 'flat fee', notes: 'Day hire' },
      { id: 'i107', name: 'Load-In Labour (per person)', price: 60,  unit: 'per shift', notes: '2-hr load-in' },
      { id: 'i108', name: 'Load-Out Labour (per person)', price: 60, unit: 'per shift', notes: '2-hr load-out' },
      { id: 'i109', name: 'Waste Removal & Recycling',   price: 80,  unit: 'flat fee', notes: 'Licensed waste carrier' },
      { id: 'i110', name: 'Food Waste Disposal',         price: 40,  unit: 'flat fee', notes: 'Compliant disposal' },
      { id: 'i111', name: 'Specialist Equipment Courier', price: 150, unit: 'flat fee', notes: 'Large/fragile items' },
    ],
  },
];

const UNITS = [
  'per person', 'per shift', 'flat fee', 'per hour', 'per table',
  'per item', 'per mile', 'per day', 'per event',
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function PriceListView() {
  const [categories, setCategories] = useState(SEED);
  const [query, setQuery]           = useState('');
  const [activeTab, setActiveTab]   = useState('all');
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat]   = useState(false);

  // ── helpers ──
  const updateCats = (fn) => setCategories(fn);

  const toggleCollapse = (catId) =>
    updateCats(cs => cs.map(c => c.id === catId ? { ...c, collapsed: !c.collapsed } : c));

  const addItem = (catId) => {
    const item = { id: `i${Date.now()}`, name: '', price: 0, unit: 'per person', notes: '' };
    updateCats(cs => cs.map(c => c.id === catId ? { ...c, items: [...c.items, item] } : c));
    startEdit(item);
  };

  const removeItem = (catId, itemId) =>
    updateCats(cs => cs.map(c => c.id === catId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c));

  const removeCat = (catId) => {
    if (activeTab === catId) setActiveTab('all');
    updateCats(cs => cs.filter(c => c.id !== catId));
  };

  const startEdit = (item) => { setEditingItem(item.id); setEditForm({ ...item }); };
  const cancelEdit = ()     => { setEditingItem(null); setEditForm({}); };

  const saveEdit = (catId) => {
    updateCats(cs => cs.map(c =>
      c.id === catId ? { ...c, items: c.items.map(i => i.id === editForm.id ? { ...editForm } : i) } : c
    ));
    setEditingItem(null);
    setEditForm({});
  };

  const addCategory = () => {
    if (!newCatName.trim()) return;
    const color = COLOR_KEYS[categories.length % COLOR_KEYS.length];
    const newCat = { id: `cat-${Date.now()}`, name: newCatName.trim(), color, collapsed: true, items: [] };
    updateCats(cs => [...cs, newCat]);
    setActiveTab(newCat.id);
    setNewCatName('');
    setAddingCat(false);
  };

  // ── filtered view — tab takes priority; search overrides tab ──
  const q = query.toLowerCase();
  const tabFiltered = q
    ? categories
    : activeTab === 'all' ? categories : categories.filter(c => c.id === activeTab);

  const visible = tabFiltered.map(cat => ({
    ...cat,
    items: q ? cat.items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.notes.toLowerCase().includes(q) ||
      cat.name.toLowerCase().includes(q)
    ) : cat.items,
  })).filter(cat => !q || cat.items.length > 0);

  // ── stats ──
  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
  const allPrices  = categories.flatMap(c => c.items.map(i => i.price));
  const minPrice   = allPrices.length ? Math.min(...allPrices) : 0;
  const maxPrice   = allPrices.length ? Math.max(...allPrices) : 0;

  return (
    <div className="max-w-5xl mx-auto p-8">

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Price List</h1>
          <p className="text-slate-500 text-sm mt-1">
            Your master catalogue of every item and its price. Use these in templates and quotes.
          </p>
        </div>
        <button
          onClick={() => setAddingCat(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Items',   value: totalItems },
          { label: 'Categories',    value: categories.length },
          { label: 'Price Range',   value: `£${minPrice} – £${maxPrice}` },
        ].map((s, i) => (
          <div key={i} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm">
            <div className="text-xs text-slate-400 mb-1">{s.label}</div>
            <div className="text-xl font-bold text-slate-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-5 border-b border-slate-200 scrollbar-hide">
        {[{ id: 'all', name: 'All', color: 'slate' }, ...categories].map(tab => {
          const isActive = activeTab === tab.id;
          const colors = CAT_COLORS[tab.color] ?? CAT_COLORS.slate;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setQuery(''); }}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 rounded-t-md text-sm font-medium transition-colors flex-shrink-0 border-b-2 -mb-px ${
                isActive
                  ? 'border-slate-900 text-slate-900 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.id !== 'all' && (
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
              )}
              {tab.name}
              {tab.id !== 'all' && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-normal ${
                  isActive ? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-400'
                }`}>
                  {categories.find(c => c.id === tab.id)?.items.length ?? 0}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); if (e.target.value) setActiveTab('all'); }}
          placeholder={activeTab === 'all' ? 'Search all categories…' : `Search in ${categories.find(c => c.id === activeTab)?.name ?? ''}…`}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg bg-white text-sm outline-none focus:ring-1 focus:ring-slate-900 transition"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Add category inline form */}
      {addingCat && (
        <div className="border-2 border-slate-300 rounded-lg bg-white p-4 mb-4 flex items-center gap-3">
          <input
            autoFocus
            type="text"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') setAddingCat(false); }}
            placeholder="Category name (e.g. Canapés, Vegan Mains...)"
            className="flex-1 outline-none text-sm text-slate-900 border-b border-slate-300 pb-0.5 bg-transparent"
          />
          <button onClick={addCategory} className="bg-slate-900 text-white px-3 py-1.5 rounded-md text-sm hover:bg-slate-800 transition">
            Add
          </button>
          <button onClick={() => setAddingCat(false)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-5">
        {visible.map(cat => {
          const colors = CAT_COLORS[cat.color] ?? CAT_COLORS.slate;
          return (
            <div key={cat.id} className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">

              {/* Category header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50 group">
                <button
                  onClick={() => toggleCollapse(cat.id)}
                  className="flex items-center gap-2.5 text-left flex-1"
                >
                  {cat.collapsed
                    ? <ChevronRight className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />
                  }
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                  <span className="font-semibold text-slate-900 text-sm">{cat.name}</span>
                  <span className="text-xs text-slate-400 font-normal">{cat.items.length} items</span>
                </button>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => addItem(cat.id)}
                    className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 border border-slate-200 px-2.5 py-1 rounded-md hover:bg-white transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                  <button
                    onClick={() => removeCat(cat.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Items table */}
              {!cat.collapsed && (
                <>
                  {cat.items.length === 0 ? (
                    <div className="px-5 py-5 text-sm text-slate-400 italic flex items-center gap-2">
                      No items yet.
                      <button
                        onClick={() => addItem(cat.id)}
                        className="not-italic text-slate-600 underline underline-offset-2 hover:text-slate-900"
                      >
                        Add the first one.
                      </button>
                    </div>
                  ) : (
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="px-5 py-2.5 text-left font-medium">Item Name</th>
                          <th className="px-5 py-2.5 text-left font-medium w-32">Price</th>
                          <th className="px-5 py-2.5 text-left font-medium w-36">Unit</th>
                          <th className="px-5 py-2.5 text-left font-medium">Notes</th>
                          <th className="px-5 py-2.5 w-20" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {cat.items.map(item => (
                          <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                            {editingItem === item.id ? (
                              /* ── Edit row ── */
                              <>
                                <td className="px-5 py-2.5">
                                  <input
                                    autoFocus
                                    type="text"
                                    value={editForm.name}
                                    onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Item name"
                                    className="w-full outline-none border-b border-slate-400 bg-transparent text-slate-900 pb-0.5"
                                  />
                                </td>
                                <td className="px-5 py-2.5">
                                  <div className="flex items-center gap-1 text-slate-400">
                                    £
                                    <input
                                      type="number"
                                      value={editForm.price}
                                      onChange={e => setEditForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                                      className="w-20 outline-none border-b border-slate-400 bg-transparent text-slate-900 pb-0.5"
                                    />
                                  </div>
                                </td>
                                <td className="px-5 py-2.5">
                                  <select
                                    value={editForm.unit}
                                    onChange={e => setEditForm(p => ({ ...p, unit: e.target.value }))}
                                    className="text-xs border border-slate-200 rounded px-2 py-1 bg-slate-50 outline-none"
                                  >
                                    {UNITS.map(u => <option key={u}>{u}</option>)}
                                  </select>
                                </td>
                                <td className="px-5 py-2.5">
                                  <input
                                    type="text"
                                    value={editForm.notes}
                                    onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                                    placeholder="Optional note..."
                                    className="w-full outline-none border-b border-slate-200 focus:border-slate-400 bg-transparent text-slate-500 pb-0.5 text-xs"
                                  />
                                </td>
                                <td className="px-5 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => saveEdit(cat.id)}
                                      className="text-green-600 hover:text-green-800"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              /* ── Read row ── */
                              <>
                                <td className="px-5 py-2.5 font-medium text-slate-900">{item.name}</td>
                                <td className="px-5 py-2.5">
                                  <span className="font-semibold text-slate-900">£{item.price}</span>
                                </td>
                                <td className="px-5 py-2.5">
                                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ${colors.badge}`}>
                                    {item.unit}
                                  </span>
                                </td>
                                <td className="px-5 py-2.5 text-xs text-slate-400">{item.notes}</td>
                                <td className="px-5 py-2.5">
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => startEdit(item)}
                                      className="text-slate-400 hover:text-slate-700"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => removeItem(cat.id, item.id)}
                                      className="text-slate-300 hover:text-red-400"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {/* Add item footer row */}
                  <div className="border-t border-slate-100">
                    <button
                      onClick={() => addItem(cat.id)}
                      className="w-full text-left px-5 py-2.5 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-3 h-3" /> Add item to {cat.name}
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Empty search state */}
        {query && visible.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">
            No items match <span className="font-medium text-slate-600">"{query}"</span>
          </div>
        )}
      </div>
    </div>
  );
}
