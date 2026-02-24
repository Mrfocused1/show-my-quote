import React, { useState } from 'react';
import {
  Package, Clock, Users, Sliders, Zap, Phone, Plus, Trash2,
  Check, X, ChevronDown, Calculator, AlertCircle
} from 'lucide-react';

// ─── Mock data ───────────────────────────────────────────────────────────────

export const MOCK_TEMPLATES = [
  {
    id: 'tmpl-1',
    name: 'Wedding Reception',
    description: 'Full plated dinner with open bar, staff, and tiered guest pricing.',
    eventType: 'Wedding',
    itemCount: 8,
    lastUsed: '2 days ago',
    quotesGenerated: 12,
  },
  {
    id: 'tmpl-2',
    name: 'Corporate Buffet',
    description: 'Self-service buffet for corporate retreats and team events.',
    eventType: 'Corporate',
    itemCount: 5,
    lastUsed: '1 week ago',
    quotesGenerated: 7,
  },
  {
    id: 'tmpl-3',
    name: 'Birthday Celebration',
    description: 'Family-style sharing plates and drinks for birthday parties.',
    eventType: 'Birthday',
    itemCount: 6,
    lastUsed: '3 days ago',
    quotesGenerated: 4,
  },
];

const EMPTY_TEMPLATE = {
  name: '',
  description: '',
  eventType: 'Wedding',
  items: [
    { id: 'i1', name: 'Three-Course Dinner', category: 'Food',  price: 85, unit: 'per person' },
    { id: 'i2', name: 'Welcome Drinks',      category: 'Drink', price: 15, unit: 'per person' },
    { id: 'i3', name: 'Wine with Dinner',    category: 'Drink', price: 25, unit: 'per person' },
  ],
  timings: [
    { id: 't1', label: 'Setup & Prep',    hours: 2, extraHourRate: 200 },
    { id: 't2', label: 'Drinks Reception', hours: 1, extraHourRate: 250 },
    { id: 't3', label: 'Dinner Service',   hours: 3, extraHourRate: 300 },
    { id: 't4', label: 'Evening Event',    hours: 2, extraHourRate: 200 },
  ],
  guestCount: 100,
  guestTiers: [
    { id: 'g1', label: 'Intimate (up to 50)', max: 50,  adjustment: 15  },
    { id: 'g2', label: 'Standard (51–150)',   max: 150, adjustment: 0   },
    { id: 'g3', label: 'Large (151–300)',     max: 300, adjustment: -8  },
  ],
  staff: [
    { id: 's1', role: 'Waiter / Server',     count: 6, ratePerShift: 180 },
    { id: 's2', role: 'Head Chef',           count: 1, ratePerShift: 450 },
    { id: 's3', role: 'Sous Chef',           count: 2, ratePerShift: 300 },
    { id: 's4', role: 'Event Coordinator',   count: 1, ratePerShift: 350 },
  ],
  rules: [
    { id: 'r1', ifField: 'Guest Count',      operator: '>',  ifValue: '150', thenField: 'Food Subtotal', thenAction: 'Apply % discount', thenValue: '5'    },
    { id: 'r2', ifField: 'Total Event Hours', operator: '>',  ifValue: '6',   thenField: 'Staff Cost',    thenAction: 'Multiply by factor', thenValue: '1.25' },
  ],
};

const BLANK_TEMPLATE = {
  name: '',
  description: '',
  eventType: 'Wedding',
  items: [],
  timings: [],
  guestCount: 0,
  guestTiers: [],
  staff: [],
  rules: [],
};

const FIELD_OPTIONS  = ['Guest Count', 'Total Event Hours', 'Food Subtotal', 'Drink Subtotal', 'Staff Count', 'Item Count'];
const ACTION_OPTIONS = ['Add flat fee', 'Subtract flat fee', 'Add % surcharge', 'Apply % discount', 'Multiply by factor'];

const MOCK_CALLS_FOR_CONNECT = [
  { id: 'call-101', caller: 'Sarah Jenkins', extracted: { guestCount: 120, eventType: 'Wedding',   serviceStyle: 'Plated', dietary: ['Nut Allergy', 'Vegan'] } },
  { id: 'call-102', caller: 'Michael Chen',  extracted: { guestCount: 50,  eventType: 'Corporate', serviceStyle: 'Buffet', dietary: []                        } },
];

// ─── Templates list page ──────────────────────────────────────────────────────

export function TemplatesView({ navigateTo }) {
  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catering Templates</h1>
          <p className="text-slate-500 text-sm mt-1">
            Build reusable quote flows — items, timings, staff, guest tiers, and auto logic.
          </p>
        </div>
        <button
          onClick={() => navigateTo('template-builder', { ...BLANK_TEMPLATE, isNew: true })}
          className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition shadow-sm flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" /> New Template
        </button>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {MOCK_TEMPLATES.map(tmpl => (
          <div
            key={tmpl.id}
            onClick={() => navigateTo('template-builder', { ...EMPTY_TEMPLATE, ...tmpl, isNew: false })}
            className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-md hover:border-slate-400 cursor-pointer transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-slate-600" />
              </div>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{tmpl.eventType}</span>
            </div>
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{tmpl.name}</h3>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{tmpl.description}</p>
            <div className="flex items-center gap-3 mt-4 text-xs text-slate-400 border-t border-slate-100 pt-4">
              <span>{tmpl.itemCount} items</span>
              <span>·</span>
              <span>{tmpl.quotesGenerated} quotes</span>
              <span className="ml-auto">Updated {tmpl.lastUsed}</span>
            </div>
          </div>
        ))}

        {/* New from scratch card */}
        <div
          onClick={() => navigateTo('template-builder', { ...BLANK_TEMPLATE, isNew: true })}
          className="border-2 border-dashed border-slate-200 rounded-xl p-6 hover:border-slate-400 hover:bg-slate-50 cursor-pointer transition-all flex flex-col items-center justify-center text-center min-h-[180px] group"
        >
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-slate-200 transition-colors">
            <Plus className="w-5 h-5 text-slate-500" />
          </div>
          <div className="text-sm font-medium text-slate-600">Create from scratch</div>
          <div className="text-xs text-slate-400 mt-1">Build a custom quote flow</div>
        </div>
      </div>
    </div>
  );
}

// ─── Template builder ─────────────────────────────────────────────────────────

export function TemplateBuilderView({ initialData, navigateTo }) {
  const base = initialData?.isNew ? BLANK_TEMPLATE : EMPTY_TEMPLATE;
  const [template, setTemplate] = useState(
    initialData ? { ...base, ...initialData } : { ...BLANK_TEMPLATE }
  );
  const [activeTab, setActiveTab]     = useState('items');
  const [connectedCall, setConnectedCall] = useState(null);
  const [showCallPicker, setShowCallPicker] = useState(false);
  const [saved, setSaved]             = useState(false);
  const [addingRule, setAddingRule]   = useState(false);
  const [newRule, setNewRule]         = useState({
    ifField: 'Guest Count', operator: '>', ifValue: '',
    thenField: 'Food Subtotal', thenAction: 'Add % surcharge', thenValue: '',
  });

  const update = (field, value) => setTemplate(p => ({ ...p, [field]: value }));

  const connectCall = (call) => {
    setConnectedCall(call);
    setShowCallPicker(false);
    update('guestCount', call.extracted.guestCount);
    update('eventType', call.extracted.eventType);
  };

  // ── Live pricing engine ──
  const foodBase  = template.items.filter(i => i.category === 'Food').reduce((s, i)  => s + i.price, 0);
  const drinkBase = template.items.filter(i => i.category === 'Drink').reduce((s, i) => s + i.price, 0);
  const otherBase = template.items.filter(i => i.category === 'Other').reduce((s, i) => s + i.price, 0);
  const activeTier = template.guestTiers.find(t => template.guestCount <= t.max)
    ?? template.guestTiers[template.guestTiers.length - 1];
  const ppAdjust   = activeTier?.adjustment ?? 0;
  const adjustedPP = foodBase + drinkBase + otherBase + ppAdjust;
  const foodTotal  = adjustedPP * template.guestCount;
  const staffTotal = template.staff.reduce((s, m) => s + m.count * m.ratePerShift, 0);
  const subtotal   = foodTotal + staffTotal;
  const adminFee   = subtotal * 0.18;
  const total      = subtotal + adminFee;

  const tabs = [
    { id: 'items',   label: 'Menu Items',    icon: Package },
    { id: 'timings', label: 'Timings',        icon: Clock   },
    { id: 'guests',  label: 'Guests & Staff', icon: Users   },
    { id: 'logic',   label: 'Logic Rules',    icon: Sliders },
  ];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">

      {/* ── LEFT: builder canvas ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header + tabs */}
        <div className="px-8 pt-6 pb-0 border-b border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex-1">
              <input
                type="text"
                value={template.name}
                onChange={e => update('name', e.target.value)}
                placeholder="Template name (e.g. Wedding Reception)"
                className="text-2xl font-bold text-slate-900 w-full outline-none placeholder-slate-300 border-b border-transparent focus:border-slate-200 transition-colors bg-transparent"
              />
              <input
                type="text"
                value={template.description}
                onChange={e => update('description', e.target.value)}
                placeholder="Short description..."
                className="text-sm text-slate-500 mt-1.5 w-full outline-none placeholder-slate-300 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                value={template.eventType}
                onChange={e => update('eventType', e.target.value)}
                className="text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-slate-50 outline-none"
              >
                {['Wedding', 'Corporate', 'Birthday', 'Social', 'Other'].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <button
                onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
                className="bg-slate-900 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-slate-800 transition flex items-center gap-2"
              >
                {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : 'Save Template'}
              </button>
            </div>
          </div>

          <div className="flex gap-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'logic' && template.rules.length > 0 && (
                  <span className="ml-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">
                    {template.rules.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'items'   && <ItemsTab   template={template} update={update} />}
          {activeTab === 'timings' && <TimingsTab  template={template} update={update} />}
          {activeTab === 'guests'  && <GuestsStaffTab template={template} update={update} connectedCall={connectedCall} />}
          {activeTab === 'logic'   && (
            <LogicTab
              template={template} update={update}
              addingRule={addingRule} setAddingRule={setAddingRule}
              newRule={newRule} setNewRule={setNewRule}
            />
          )}
        </div>
      </div>

      {/* ── RIGHT: preview + call connector ── */}
      <div className="w-80 border-l border-slate-200 bg-slate-50 flex flex-col overflow-hidden flex-shrink-0">

        {/* Connect to Call */}
        <div className="p-5 border-b border-slate-200 bg-white">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5" /> Connect to Call
          </div>
          {connectedCall ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-green-900">{connectedCall.caller}</div>
                <div className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {connectedCall.extracted.guestCount} guests auto-filled
                </div>
              </div>
              <button onClick={() => setConnectedCall(null)} className="text-green-400 hover:text-green-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowCallPicker(o => !o)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-50 flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Select a call to auto-fill...
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showCallPicker && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-20 mt-1 py-1">
                  {MOCK_CALLS_FOR_CONNECT.map(call => (
                    <button
                      key={call.id}
                      onClick={() => connectCall(call)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-slate-900">{call.caller}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {call.extracted.eventType} · {call.extracted.guestCount} guests · {call.extracted.serviceStyle}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {connectedCall && (
            <div className="mt-3 space-y-1">
              {connectedCall.extracted.dietary?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {connectedCall.extracted.dietary.map(d => (
                    <span key={d} className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded">
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live price preview */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Preview</div>

          {/* Per-person breakdown */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Per Person</div>
            {foodBase  > 0 && <div className="flex justify-between text-slate-600"><span>Food</span><span className="font-medium">£{foodBase}</span></div>}
            {drinkBase > 0 && <div className="flex justify-between text-slate-600"><span>Drinks</span><span className="font-medium">£{drinkBase}</span></div>}
            {otherBase > 0 && <div className="flex justify-between text-slate-600"><span>Other</span><span className="font-medium">£{otherBase}</span></div>}
            {ppAdjust !== 0 && (
              <div className={`flex justify-between text-xs ${ppAdjust > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                <span>Tier adjust</span>
                <span>{ppAdjust > 0 ? '+' : ''}{ppAdjust}/pp</span>
              </div>
            )}
            <div className="border-t border-slate-100 pt-2 flex justify-between font-semibold text-slate-900">
              <span>Total /pp</span><span>£{adjustedPP}</span>
            </div>
          </div>

          {/* Total breakdown */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              For {template.guestCount} Guests
            </div>
            <div className="flex justify-between text-slate-600"><span>Food & Drinks</span><span className="font-medium">£{foodTotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-slate-600"><span>Staff</span><span className="font-medium">£{staffTotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-slate-400 text-xs border-t border-slate-100 pt-2">
              <span>Service fee (18%)</span><span>£{Math.round(adminFee).toLocaleString()}</span>
            </div>
            <div className="border-t-2 border-slate-900 pt-2 flex justify-between font-bold text-slate-900 text-base">
              <span>Total</span><span>£{Math.round(total).toLocaleString()}</span>
            </div>
          </div>

          {/* Active tier */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Active Tier</div>
            <div className="font-medium text-slate-900">{activeTier?.label || '—'}</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {ppAdjust === 0 ? 'No price adjustment' : ppAdjust > 0 ? `+£${ppAdjust}/pp surcharge` : `−£${Math.abs(ppAdjust)}/pp discount`}
            </div>
          </div>

          {/* Active rules */}
          {template.rules.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs text-blue-700 space-y-1">
              <div className="font-semibold mb-2">{template.rules.length} logic rule{template.rules.length > 1 ? 's' : ''} active</div>
              {template.rules.map(r => (
                <div key={r.id} className="opacity-80">
                  IF {r.ifField} {r.operator} {r.ifValue} → {r.thenAction} {r.thenValue}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => navigateTo('quote-builder', {
              name: connectedCall?.caller || '',
              guestCount: template.guestCount,
              serviceStyle: template.eventType === 'Corporate' ? 'Buffet' : 'Plated',
              dietary: connectedCall?.extracted?.dietary || [],
            })}
            className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-md hover:bg-slate-800 transition text-sm flex items-center justify-center gap-2"
          >
            <Calculator className="w-4 h-4" /> Generate Quote
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Menu Items ──────────────────────────────────────────────────────────

function ItemsTab({ template, update }) {
  const [editingId, setEditingId] = useState(null);

  const addItem = (category) => {
    const item = { id: `i${Date.now()}`, name: '', category, price: 0, unit: 'per person' };
    update('items', [...template.items, item]);
    setEditingId(item.id);
  };

  const updateItem = (id, field, value) =>
    update('items', template.items.map(i => i.id === id ? { ...i, [field]: value } : i));

  const removeItem = (id) =>
    update('items', template.items.filter(i => i.id !== id));

  const catColor = { Food: 'bg-amber-400', Drink: 'bg-blue-400', Other: 'bg-slate-400' };

  return (
    <div className="max-w-3xl space-y-8">
      {['Food', 'Drink', 'Other'].map(cat => (
        <div key={cat}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${catColor[cat]}`} />
              {cat}
              <span className="text-xs text-slate-400 font-normal">
                ({template.items.filter(i => i.category === cat).length})
              </span>
            </h3>
            <button
              onClick={() => addItem(cat)}
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 border border-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-50 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add {cat} Item
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            {template.items.filter(i => i.category === cat).length === 0 ? (
              <div className="px-5 py-4 text-sm text-slate-400 italic">
                No {cat.toLowerCase()} items yet.
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left font-medium">Item Name</th>
                    <th className="px-4 py-2.5 text-left font-medium w-32">Price</th>
                    <th className="px-4 py-2.5 text-left font-medium w-36">Unit</th>
                    <th className="px-4 py-2.5 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {template.items.filter(i => i.category === cat).map(item => (
                    <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5">
                        {editingId === item.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={item.name}
                            onChange={e => updateItem(item.id, 'name', e.target.value)}
                            onBlur={() => setEditingId(null)}
                            className="w-full outline-none border-b border-slate-300 pb-0.5 bg-transparent"
                            placeholder="Item name..."
                          />
                        ) : (
                          <span
                            onClick={() => setEditingId(item.id)}
                            className={`cursor-text ${item.name ? 'text-slate-900' : 'text-slate-300 italic'}`}
                          >
                            {item.name || 'Click to name...'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 text-slate-400">
                          £
                          <input
                            type="number"
                            value={item.price}
                            onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                            className="w-20 outline-none border-b border-transparent focus:border-slate-300 bg-transparent text-slate-900"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={item.unit}
                          onChange={e => updateItem(item.id, 'unit', e.target.value)}
                          className="text-xs border border-slate-200 rounded px-2 py-1 bg-slate-50 outline-none text-slate-600"
                        >
                          {['per person', 'flat fee', 'per hour', 'per table'].map(u => (
                            <option key={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Timings ─────────────────────────────────────────────────────────────

function TimingsTab({ template, update }) {
  const addTiming = () => {
    const t = { id: `t${Date.now()}`, label: '', hours: 1, extraHourRate: 0 };
    update('timings', [...template.timings, t]);
  };

  const updateTiming = (id, field, value) =>
    update('timings', template.timings.map(t => t.id === id ? { ...t, [field]: value } : t));

  const removeTiming = (id) =>
    update('timings', template.timings.filter(t => t.id !== id));

  const totalHours = template.timings.reduce((s, t) => s + (parseFloat(t.hours) || 0), 0);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-slate-900">Event Timeline</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Define phases and the extra-hour surcharge if the event runs over.
          </p>
        </div>
        <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
          {totalHours}h total
        </span>
      </div>

      <div className="space-y-3">
        {template.timings.map((timing, idx) => (
          <div
            key={timing.id}
            className="border border-slate-200 rounded-lg bg-white p-4 flex items-center gap-4 group hover:border-slate-300 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-medium flex-shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Phase Name</label>
                <input
                  type="text"
                  value={timing.label}
                  onChange={e => updateTiming(timing.id, 'label', e.target.value)}
                  placeholder="e.g. Dinner Service"
                  className="w-full outline-none border-b border-slate-200 focus:border-slate-400 bg-transparent text-slate-900 pb-0.5"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Default Hours</label>
                <input
                  type="number"
                  value={timing.hours}
                  onChange={e => updateTiming(timing.id, 'hours', parseFloat(e.target.value) || 0)}
                  className="w-full outline-none border-b border-slate-200 focus:border-slate-400 bg-transparent text-slate-900 pb-0.5"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Extra Hour Rate (£)</label>
                <input
                  type="number"
                  value={timing.extraHourRate}
                  onChange={e => updateTiming(timing.id, 'extraHourRate', parseFloat(e.target.value) || 0)}
                  placeholder="0 = included"
                  className="w-full outline-none border-b border-slate-200 focus:border-slate-400 bg-transparent text-slate-900 pb-0.5"
                />
              </div>
            </div>
            <button
              onClick={() => removeTiming(timing.id)}
              className="text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        <button
          onClick={addTiming}
          className="w-full border-2 border-dashed border-slate-200 rounded-lg p-3 text-sm text-slate-400 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Phase
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Guests & Staff ──────────────────────────────────────────────────────

function GuestsStaffTab({ template, update, connectedCall }) {
  const updateTier  = (id, f, v) => update('guestTiers', template.guestTiers.map(t => t.id === id ? { ...t, [f]: v } : t));
  const addTier     = () => update('guestTiers', [...template.guestTiers, { id: `g${Date.now()}`, label: '', max: 500, adjustment: 0 }]);
  const removeTier  = (id) => update('guestTiers', template.guestTiers.filter(t => t.id !== id));

  const updateStaff = (id, f, v) => update('staff', template.staff.map(s => s.id === id ? { ...s, [f]: v } : s));
  const addStaff    = () => update('staff', [...template.staff, { id: `s${Date.now()}`, role: '', count: 1, ratePerShift: 180 }]);
  const removeStaff = (id) => update('staff', template.staff.filter(s => s.id !== id));

  const activeTier = template.guestTiers.find(t => template.guestCount <= t.max)
    ?? template.guestTiers[template.guestTiers.length - 1];

  return (
    <div className="max-w-3xl space-y-10">

      {/* ── Guest count + tiers ── */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-1">Guest Count</h3>
        <p className="text-sm text-slate-500 mb-4">
          Tiers automatically adjust the per-person price. The active tier updates as you type.
        </p>

        <div className="flex items-center gap-5 mb-6">
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4 shadow-sm">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Guests</label>
              <input
                type="number"
                value={template.guestCount}
                onChange={e => update('guestCount', parseInt(e.target.value) || 0)}
                className="text-3xl font-bold text-slate-900 w-28 outline-none bg-transparent"
              />
            </div>
            {connectedCall && (
              <span className="text-xs text-green-600 bg-green-50 border border-green-100 px-2 py-1 rounded flex items-center gap-1">
                <Zap className="w-3 h-3" /> From call
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500">
            Active: <span className="font-medium text-slate-900">{activeTier?.label || '—'}</span>
            <div className="text-xs mt-0.5 text-slate-400">
              {(activeTier?.adjustment ?? 0) === 0
                ? 'No price adjustment'
                : activeTier.adjustment > 0
                  ? `+£${activeTier.adjustment}/pp surcharge`
                  : `−£${Math.abs(activeTier.adjustment)}/pp discount`}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-700">Guest Count Tiers</span>
          <button
            onClick={addTier}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 border border-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Tier
          </button>
        </div>
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left font-medium">Label</th>
                <th className="px-4 py-2.5 text-left font-medium w-36">Up to (guests)</th>
                <th className="px-4 py-2.5 text-left font-medium w-44">Price Adjustment</th>
                <th className="px-4 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {template.guestTiers.map(tier => (
                <tr
                  key={tier.id}
                  className={`group transition-colors ${activeTier?.id === tier.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      value={tier.label}
                      onChange={e => updateTier(tier.id, 'label', e.target.value)}
                      placeholder="e.g. Small (up to 50)"
                      className="w-full outline-none bg-transparent text-slate-900 border-b border-transparent focus:border-slate-300 pb-0.5"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      value={tier.max}
                      onChange={e => updateTier(tier.id, 'max', parseInt(e.target.value) || 0)}
                      className="w-24 outline-none bg-transparent text-slate-900 border-b border-transparent focus:border-slate-300 pb-0.5"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={tier.adjustment}
                        onChange={e => updateTier(tier.id, 'adjustment', parseFloat(e.target.value) || 0)}
                        className="w-20 outline-none bg-transparent text-slate-900 border-b border-transparent focus:border-slate-300 pb-0.5"
                      />
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        tier.adjustment > 0 ? 'bg-amber-50 text-amber-700' :
                        tier.adjustment < 0 ? 'bg-green-50 text-green-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {tier.adjustment > 0 ? `+£${tier.adjustment}/pp` :
                         tier.adjustment < 0 ? `−£${Math.abs(tier.adjustment)}/pp` : 'No change'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => removeTier(tier.id)}
                      className="text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Staff ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-900">Staff</h3>
            <p className="text-sm text-slate-500 mt-0.5">Define roles, headcount, and per-shift rates.</p>
          </div>
          <button
            onClick={addStaff}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 border border-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Role
          </button>
        </div>
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left font-medium">Role</th>
                <th className="px-4 py-2.5 text-left font-medium w-24">Count</th>
                <th className="px-4 py-2.5 text-left font-medium w-36">Rate / Shift (£)</th>
                <th className="px-4 py-2.5 text-left font-medium w-28">Subtotal</th>
                <th className="px-4 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {template.staff.map(member => (
                <tr key={member.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      value={member.role}
                      onChange={e => updateStaff(member.id, 'role', e.target.value)}
                      placeholder="e.g. Waiter"
                      className="w-full outline-none bg-transparent text-slate-900 border-b border-transparent focus:border-slate-300 pb-0.5"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      value={member.count}
                      onChange={e => updateStaff(member.id, 'count', parseInt(e.target.value) || 0)}
                      className="w-16 outline-none bg-transparent text-slate-900 border-b border-transparent focus:border-slate-300 pb-0.5"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 text-slate-400">
                      £
                      <input
                        type="number"
                        value={member.ratePerShift}
                        onChange={e => updateStaff(member.id, 'ratePerShift', parseFloat(e.target.value) || 0)}
                        className="w-20 outline-none bg-transparent text-slate-900 border-b border-transparent focus:border-slate-300 pb-0.5"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 font-medium">
                    ${(member.count * member.ratePerShift).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => removeStaff(member.id)}
                      className="text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-4 py-2.5 text-xs font-semibold text-slate-500" colSpan={3}>Total Staff Cost</td>
                <td className="px-4 py-2.5 font-bold text-slate-900">
                  ${template.staff.reduce((s, m) => s + m.count * m.ratePerShift, 0).toLocaleString()}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Logic Rules ─────────────────────────────────────────────────────────

function LogicTab({ template, update, addingRule, setAddingRule, newRule, setNewRule }) {
  const deleteRule = (id) => update('rules', template.rules.filter(r => r.id !== id));

  const addRule = () => {
    if (!newRule.ifValue || !newRule.thenValue) return;
    update('rules', [...template.rules, { ...newRule, id: `r${Date.now()}` }]);
    setNewRule({ ifField: 'Guest Count', operator: '>', ifValue: '', thenField: 'Food Subtotal', thenAction: 'Add % surcharge', thenValue: '' });
    setAddingRule(false);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h3 className="font-semibold text-slate-900 mb-1">Logic Rules</h3>
        <p className="text-sm text-slate-500">
          Rules fire automatically when a field changes — no manual calculation needed.
          Connect a call and watch them apply instantly.
        </p>
      </div>

      <div className="space-y-3">
        {template.rules.map((rule, idx) => (
          <div
            key={rule.id}
            className="border border-slate-200 rounded-lg bg-white p-4 flex items-center gap-3 group hover:border-slate-300 transition-colors"
          >
            <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-xs flex items-center justify-center flex-shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 flex items-center gap-2 flex-wrap text-sm">
              <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-xs">IF</span>
              <span className="font-medium text-slate-900">{rule.ifField}</span>
              <span className="text-slate-400 font-mono">{rule.operator}</span>
              <span className="font-mono text-slate-900 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-xs">{rule.ifValue}</span>
              <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-xs">THEN</span>
              <span className="font-medium text-slate-900">{rule.thenField}</span>
              <span className="text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded text-xs">
                {rule.thenAction} {rule.thenValue}{rule.thenAction.includes('%') ? '%' : '×'}
              </span>
            </div>
            <button
              onClick={() => deleteRule(rule.id)}
              className="text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {addingRule ? (
          <div className="border-2 border-slate-300 rounded-lg bg-white p-5 space-y-4">
            <div className="text-sm font-semibold text-slate-700">New Rule</div>

            {/* IF row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1.5 rounded text-xs flex-shrink-0">IF</span>
              <select
                value={newRule.ifField}
                onChange={e => setNewRule(p => ({ ...p, ifField: e.target.value }))}
                className="text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-slate-50 outline-none"
              >
                {FIELD_OPTIONS.map(f => <option key={f}>{f}</option>)}
              </select>
              <select
                value={newRule.operator}
                onChange={e => setNewRule(p => ({ ...p, operator: e.target.value }))}
                className="text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-slate-50 outline-none w-16 text-center font-mono"
              >
                {['>', '<', '=', '>=', '<='].map(o => <option key={o}>{o}</option>)}
              </select>
              <input
                type="text"
                value={newRule.ifValue}
                onChange={e => setNewRule(p => ({ ...p, ifValue: e.target.value }))}
                placeholder="value"
                className="text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-slate-50 outline-none w-24 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* THEN row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1.5 rounded text-xs flex-shrink-0">THEN</span>
              <select
                value={newRule.thenField}
                onChange={e => setNewRule(p => ({ ...p, thenField: e.target.value }))}
                className="text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-slate-50 outline-none"
              >
                {FIELD_OPTIONS.map(f => <option key={f}>{f}</option>)}
              </select>
              <select
                value={newRule.thenAction}
                onChange={e => setNewRule(p => ({ ...p, thenAction: e.target.value }))}
                className="text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-slate-50 outline-none"
              >
                {ACTION_OPTIONS.map(a => <option key={a}>{a}</option>)}
              </select>
              <input
                type="text"
                value={newRule.thenValue}
                onChange={e => setNewRule(p => ({ ...p, thenValue: e.target.value }))}
                placeholder="amount"
                className="text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-slate-50 outline-none w-24 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={addRule}
                className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition"
              >
                Add Rule
              </button>
              <button
                onClick={() => setAddingRule(false)}
                className="border border-slate-200 text-slate-600 px-4 py-2 rounded-md text-sm hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingRule(true)}
            className="w-full border-2 border-dashed border-slate-200 rounded-lg p-4 text-sm text-slate-400 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Logic Rule
          </button>
        )}
      </div>

      {template.rules.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            {template.rules.length} rule{template.rules.length > 1 ? 's' : ''} active.
            Connect a call on the right panel to see them fire automatically.
          </span>
        </div>
      )}
    </div>
  );
}
