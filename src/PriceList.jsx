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
  // ── Shingles & Underlayment ───────────────────────────────────────────────
  {
    id: 'cat-1', name: 'Shingles & Underlayment', color: 'amber', collapsed: true,
    items: [
      { id: 'i1',  name: '3-Tab shingles',                    price: 70,  unit: 'per square', notes: 'Economy option' },
      { id: 'i2',  name: '30-yr architectural shingles',      price: 90,  unit: 'per square', notes: 'Most popular' },
      { id: 'i3',  name: '50-yr architectural shingles',      price: 120, unit: 'per square', notes: 'Premium grade' },
      { id: 'i4',  name: 'Impact-resistant (Class 4)',        price: 130, unit: 'per square', notes: 'Insurance discount eligible' },
      { id: 'i5',  name: 'Metal standing seam',              price: 350, unit: 'per square', notes: '40–70 yr lifespan' },
      { id: 'i6',  name: 'Synthetic underlayment',            price: 15,  unit: 'per square', notes: '' },
      { id: 'i7',  name: 'Felt underlayment (15 lb)',         price: 8,   unit: 'per square', notes: '' },
      { id: 'i8',  name: 'Ice & water shield',               price: 22,  unit: 'per square', notes: 'Eaves & valleys' },
    ],
  },

  // ── Flashing & Trim ───────────────────────────────────────────────────────
  {
    id: 'cat-2', name: 'Flashing & Trim', color: 'blue', collapsed: true,
    items: [
      { id: 'i9',  name: 'Drip edge (aluminum)',             price: 120, unit: 'flat fee',   notes: 'Standard perimeter' },
      { id: 'i10', name: 'Valley flashing',                  price: 180, unit: 'flat fee',   notes: 'Open-cut valley' },
      { id: 'i11', name: 'Step flashing (chimney)',           price: 250, unit: 'flat fee',   notes: 'Brick chimney recount' },
      { id: 'i12', name: 'Pipe boot / plumbing flashing',    price: 45,  unit: 'per item',   notes: '' },
      { id: 'i13', name: 'Skylight flashing',                price: 150, unit: 'per item',   notes: '' },
      { id: 'i14', name: 'Ridge cap shingles',               price: 80,  unit: 'flat fee',   notes: '' },
      { id: 'i15', name: 'Hip cap shingles',                 price: 60,  unit: 'flat fee',   notes: '' },
    ],
  },

  // ── Labor ─────────────────────────────────────────────────────────────────
  {
    id: 'cat-3', name: 'Labor', color: 'purple', collapsed: true,
    items: [
      { id: 'i16', name: 'Installation labor — standard pitch', price: 60, unit: 'per square', notes: '4:12 to 6:12' },
      { id: 'i17', name: 'Installation labor — steep pitch',    price: 80, unit: 'per square', notes: '7:12 and above' },
      { id: 'i18', name: 'Steep pitch surcharge (25%)',         price: 0,  unit: 'flat fee',   notes: 'Applied via rule' },
      { id: 'i19', name: 'Multi-storey surcharge',              price: 150, unit: 'per storey', notes: 'Per storey above ground' },
      { id: 'i20', name: 'Hourly labor rate',                   price: 75, unit: 'per hour',   notes: 'Miscellaneous tasks' },
      { id: 'i21', name: 'Lead roofer (day rate)',              price: 450, unit: 'per shift',  notes: '8-hr shift' },
      { id: 'i22', name: 'Crew member (day rate)',              price: 250, unit: 'per shift',  notes: '8-hr shift' },
    ],
  },

  // ── Tear-Off & Disposal ───────────────────────────────────────────────────
  {
    id: 'cat-4', name: 'Tear-Off & Disposal', color: 'rose', collapsed: true,
    items: [
      { id: 'i23', name: 'Tear-off — 1 layer',               price: 12.50, unit: 'per square', notes: '' },
      { id: 'i24', name: 'Tear-off — 2 layers',              price: 20,    unit: 'per square', notes: 'Additional charge for double layer' },
      { id: 'i25', name: 'Dumpster / roll-off rental',       price: 350,   unit: 'flat fee',   notes: '10-yd container, 1 week' },
      { id: 'i26', name: 'Haul-off & disposal fee',          price: 80,    unit: 'flat fee',   notes: 'Landfill gate fee' },
      { id: 'i27', name: 'Decking replacement (per sheet)',   price: 85,    unit: 'per item',   notes: '4×8 OSB sheet' },
    ],
  },

  // ── Ventilation & Insulation ──────────────────────────────────────────────
  {
    id: 'cat-5', name: 'Ventilation & Insulation', color: 'teal', collapsed: true,
    items: [
      { id: 'i28', name: 'Ridge vent (per linear foot)',      price: 5,   unit: 'per item',   notes: '' },
      { id: 'i29', name: 'Box / static vent',                price: 45,  unit: 'per item',   notes: '' },
      { id: 'i30', name: 'Power attic ventilator',           price: 350, unit: 'per item',   notes: 'Solar or electric' },
      { id: 'i31', name: 'Soffit vent installation',         price: 25,  unit: 'per item',   notes: '' },
      { id: 'i32', name: 'Blown-in insulation (per sq ft)',  price: 2,   unit: 'per item',   notes: 'Attic insulation' },
    ],
  },

  // ── Gutters & Fascia ─────────────────────────────────────────────────────
  {
    id: 'cat-6', name: 'Gutters & Fascia', color: 'sky', collapsed: true,
    items: [
      { id: 'i33', name: 'Seamless aluminum gutters (5")',    price: 8,   unit: 'per linear ft', notes: '' },
      { id: 'i34', name: 'Seamless aluminum gutters (6")',    price: 10,  unit: 'per linear ft', notes: 'High-flow' },
      { id: 'i35', name: 'Downspout (per foot)',              price: 5,   unit: 'per linear ft', notes: '' },
      { id: 'i36', name: 'Gutter guards (premium)',           price: 12,  unit: 'per linear ft', notes: 'Micro-mesh' },
      { id: 'i37', name: 'Fascia board replacement',         price: 6,   unit: 'per linear ft', notes: '' },
      { id: 'i38', name: 'Soffit replacement',               price: 7,   unit: 'per linear ft', notes: '' },
      { id: 'i39', name: 'Gutter cleaning (per visit)',       price: 150, unit: 'flat fee',      notes: 'Single-storey' },
    ],
  },

  // ── Time & Scheduling ─────────────────────────────────────────────────────
  {
    id: 'cat-7', name: 'Time & Scheduling', color: 'indigo', collapsed: true,
    items: [
      { id: 'i40', name: 'Emergency call-out (same day)',     price: 350, unit: 'flat fee',   notes: 'Temporary fix included' },
      { id: 'i41', name: 'Weekend / holiday premium',        price: 200, unit: 'flat fee',   notes: '' },
      { id: 'i42', name: 'Rush scheduling surcharge',        price: 250, unit: 'flat fee',   notes: '< 48 hrs notice' },
      { id: 'i43', name: 'Hourly rate (emergency)',           price: 120, unit: 'per hour',   notes: '' },
      { id: 'i44', name: 'Tarping (emergency)',               price: 150, unit: 'flat fee',   notes: 'Temporary weather protection' },
    ],
  },

  // ── Location & Travel ─────────────────────────────────────────────────────
  {
    id: 'cat-8', name: 'Location & Travel', color: 'green', collapsed: true,
    items: [
      { id: 'i45', name: 'Local job (within 20 mi)',         price: 0,   unit: 'flat fee',   notes: 'No travel charge' },
      { id: 'i46', name: 'Travel fee (20–40 mi)',            price: 100, unit: 'flat fee',   notes: '' },
      { id: 'i47', name: 'Travel fee (40+ mi)',              price: 200, unit: 'flat fee',   notes: '' },
      { id: 'i48', name: 'Mileage rate',                     price: 0.67, unit: 'per mile',  notes: 'IRS standard 2024' },
    ],
  },

  // ── Service & Administration ───────────────────────────────────────────────
  {
    id: 'cat-9', name: 'Service & Administration', color: 'slate', collapsed: true,
    items: [
      { id: 'i49', name: 'Free estimate / site visit',       price: 0,   unit: 'flat fee',   notes: 'Complimentary' },
      { id: 'i50', name: 'Permit filing fee',                price: 150, unit: 'flat fee',   notes: 'Pulled from county' },
      { id: 'i51', name: 'Site inspection & report',         price: 120, unit: 'flat fee',   notes: 'Written damage assessment' },
      { id: 'i52', name: 'Insurance claim assistance',       price: 0,   unit: 'flat fee',   notes: 'No extra charge' },
      { id: 'i53', name: 'Extended warranty (10 yr)',        price: 350, unit: 'flat fee',   notes: 'Workmanship warranty' },
      { id: 'i54', name: 'Cancellation fee',                 price: 250, unit: 'flat fee',   notes: '< 7 days before start' },
    ],
  },
];

const UNITS = [
  'per square', 'per linear ft', 'flat fee', 'per hour', 'per shift',
  'per item', 'per mile', 'per storey', 'per day',
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
