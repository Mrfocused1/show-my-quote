import React, { useState, useRef, useEffect, useCallback } from 'react';
import Pusher from 'pusher-js';
import {
  Phone, PhoneCall, PhoneOff, Mic, MicOff, Radio, Check, CheckCircle2,
  Copy, Plus, Trash2, X, ArrowRight, ChevronRight, ChevronDown, ChevronUp, Minus, MessageSquare,
  LayoutGrid, Eye, Link2, Loader2, Camera, Utensils, Building2,
  Flower2, Calendar, Music, Wand2, ClipboardList, Play, Mail, FileText, Sparkles,
  Bookmark, Edit2,
} from 'lucide-react';
import { suggestField, fillFields, fillFieldsFromTranscript } from './openaiHelper.js';

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
    { key: 'date',     label: 'Event Date',           type: 'date' },
    { key: 'venue',    label: 'Venue',                type: 'text' },
    { key: 'guests',   label: 'Guest Count (Adults)', type: 'number' },
    { key: 'children', label: 'Children Attending',   type: 'number' },
    { key: 'style',    label: 'Service Style',        type: 'select',   options: ['Plated Sit-down', 'Buffet', 'Canapés', 'Family Style'],
      hint: 'How food will be served: plated sit-down, buffet, canapés, or family style. Only fill if explicitly stated.' },
    { key: 'dietary',  label: 'Dietary Requirements', type: 'long-text',
      hint: 'ONLY dietary restrictions, allergies or intolerances (e.g. halal, vegan, gluten-free, nut allergy). Do NOT put food orders, menu choices or dish names here.' },
    { key: 'bar',      label: 'Bar Package',          type: 'select',   options: ['Open Bar', 'Wine & Beer', 'Soft Drinks Only', 'No Bar'],
      hint: 'Drink/bar preference only. Fill with closest option or leave empty if not mentioned.' },
    { key: 'evening',  label: 'Evening Food',         type: 'text',
      hint: 'ONLY fill if a SEPARATE evening buffet or late-night food was explicitly discussed (e.g. "evening buffet", "midnight snacks"). Leave empty if only main reception food was discussed.' },
    { key: 'menu_selection', label: 'Menu', type: 'menu-checklist' },
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

// ── De'Osa Menu Data ──────────────────────────────────────────────────────────

const DEOSA_MENU = [
  {
    cuisine: 'Nigerian Cuisine',
    sections: [
      {
        name: 'Starters', price: 8,
        items: [
          { key: 'ng_st_puff_puff',      name: 'Puff Puff',                           keywords: ['puff puff'] },
          { key: 'ng_st_moyin',           name: 'Moyin Moyin',                         keywords: ['moyin moyin', 'moin moin', 'moimoi', 'moi moi', 'moymoy', 'moyin', 'moin', 'moaning moaning', 'moaning', 'morning morning', 'mine mine', 'morn morn', 'moine', 'moyne moyne', 'moyene'] },
          { key: 'ng_st_gizzard',         name: 'Spicy Gizzard',                       keywords: ['gizzard'] },
          { key: 'ng_st_kebab',           name: 'Spicy Shish Kebab',                   keywords: ['shish kebab', 'kebab'] },
          { key: 'ng_st_plantain_salmon', name: 'Plantain & Smoked Salmon Sticks',     keywords: ['smoked salmon', 'salmon sticks'] },
          { key: 'ng_st_pepper_soup',     name: 'Assorted Meat / Fish Pepper Soup',    keywords: ['pepper soup', 'assorted meat', 'assorted', 'assaulted meat', 'assaulted'] },
          { key: 'ng_st_spring_rolls',    name: 'Spring Rolls with Sauce',             keywords: ['spring rolls', 'spring roll', 'for roll', 'four roll', 'for rolls', 'four rolls'] },
          { key: 'ng_st_ugba',            name: 'Fermented Oil Bean Seed (Ugba)',      keywords: ['ugba', 'oil bean', 'agba', 'ogba', 'uguba', 'oogba', 'ugbah', 'ugbe', 'uba'] },
          { key: 'ng_st_king_prawns',     name: 'Crispy Breaded King Prawns',          keywords: ['king prawns', 'breaded prawns'] },
          { key: 'ng_st_prawns_lettuce',  name: 'Cooked Prawns on Lettuce',            keywords: ['prawns on lettuce'] },
          { key: 'ng_st_wings',           name: 'Chicken Wings with BBQ Sauce',        keywords: ['chicken wings', 'bbq wings'] },
        ],
      },
      {
        name: 'Mains', price: 22,
        items: [
          { key: 'ng_mn_jollof',     name: 'Jollof / Fried / Coconut / White Rice',                 keywords: ['jollof rice', 'fried rice', 'coconut rice', 'white rice', 'jollof', 'love rice', 'lof rice', 'jalof', 'jolof'] },
          { key: 'ng_mn_soups',      name: 'Egusi / Eforiro / Ewedu / Ogbono / Edikaikong / Banga', keywords: ['egusi', 'egorsi', 'egoshi', 'agushi', 'igusi', 'egoozy', 'eforiro', 'efariro', 'efforiro', 'iforiro', 'ewedu', 'ewedo', 'e wedu', 'awedu', 'ogbono', 'ogbono soup', 'agbono', 'ugbono', 'edikaikong', 'edika', 'edi kai kong', 'adikaikong', 'adika', 'banga soup', 'banga'] },
          { key: 'ng_mn_swallow',    name: 'Semolina / Pounded Yam / Garri / Amala',                keywords: ['semolina', 'pounded yam', 'garri', 'gari', 'gary', 'garry', 'amala', 'amella', 'ah mala', 'swallow', 'eba'] },
          { key: 'ng_mn_roasted',    name: 'Roasted Potatoes with Lamb / Chicken / Turkey',         keywords: ['roasted potatoes', 'roasted lamb', 'roasted turkey'] },
          { key: 'ng_mn_yam_omelet', name: 'Boiled Yam and Omelette',                               keywords: ['boiled yam', 'yam omelette'] },
          { key: 'ng_mn_dodo_omelet',name: 'Dodo (Fried Plantain) with Omelette',                   keywords: ['dodo omelette', 'plantain omelette', 'dodo', 'fried plantain omelette'] },
          { key: 'ng_mn_asaro',      name: 'Asaro (Yam Porridge) and Dodo',                         keywords: ['asaro', 'yam porridge', 'asaro yam', 'osharo', 'assaro', 'azaro', 'osaro', 'ah saro'] },
        ],
      },
      {
        name: 'Desserts', price: 7,
        items: [
          { key: 'ng_ds_fruit_salad',  name: 'Fresh Tropical Fruit Salad', keywords: ['fruit salad', 'tropical fruit'] },
          { key: 'ng_ds_banana_cake',  name: 'Banana Cake and Ice Cream',  keywords: ['banana cake ice cream'] },
          { key: 'ng_ds_choc_gateau',  name: 'Chocolate Gateau',           keywords: ['gateau', 'chocolate gateau'] },
          { key: 'ng_ds_apple_pie',    name: 'Apple Pie with Ice Cream',   keywords: ['apple pie'] },
        ],
      },
    ],
  },
  {
    cuisine: 'Ghanaian Cuisine',
    sections: [
      {
        name: 'Mains', price: 22,
        items: [
          { key: 'gh_mn_banku',    name: 'Banku with Okro Soup',             keywords: ['banku', 'banco', 'bankoo', 'bangku', 'baku', 'banko', 'bunko', 'okro soup'] },
          { key: 'gh_mn_kelewele', name: 'Kelewele (Spiced Fried Plantain)', keywords: ['kelewele', 'kele wele', 'kelewele chicken', 'kelley kelly', 'kelewelay', 'kelly willie', 'kelly willy', 'keli wele', 'kelo wele', 'kilowele'] },
          { key: 'gh_mn_fufu',     name: 'Fufu with Groundnut Soup',         keywords: ['ghanaian fufu', 'fufu groundnut', 'ghana fufu', 'fufu', 'fofo', 'foo foo'] },
          { key: 'gh_mn_jollof',   name: 'Jollof Rice (Ghanaian)',           keywords: ['ghanaian jollof', 'ghana jollof'] },
          { key: 'gh_mn_kenkey',   name: 'Kenkey',                           keywords: ['kenkey', 'kenkay', 'kenke', 'kinkey', 'ken key', 'kenkee', 'kenki', 'kenke fish'] },
          { key: 'gh_mn_omo_tuo',  name: 'Omo Tuo (Mashed Rice Balls)',      keywords: ['omo tuo', 'omo two', 'omoe tuo', 'omotuo', 'omo to', 'amo tuo', 'omo too', 'omoh tuo', 'omo tow'] },
          { key: 'gh_mn_waakye',   name: 'Waakye (Rice and Beans)',          keywords: ['waakye', 'wahchay', 'waakey', 'watchee', 'wahchi', 'wachie', 'wachi', 'watch'] },
          { key: 'gh_mn_ampesi',   name: "Yam Ampesi with Dosa Sauce",       keywords: ['yam ampesi', 'ampesi', 'am pesi', 'ampasi', 'umpesi', 'ampezi', 'ampesee'] },
          { key: 'gh_mn_shito',    name: 'Shito Chicken Stew / Curry',       keywords: ['shito', 'chateau chicken', 'chatou chicken', 'chato chicken', 'shato chicken', 'shatow', 'chato', 'shato'] },
          { key: 'gh_mn_goat',     name: 'Goat Curry / Beef Stew / Curry',   keywords: ['goat curry', 'beef stew', 'beef curry'] },
          { key: 'gh_mn_fish',     name: 'Fish Stew / Red Snapper / Tilapia',keywords: ['red snapper', 'tilapia', 'fish curry'] },
        ],
      },
    ],
  },
  {
    cuisine: 'Sierra Leonean Cuisine',
    sections: [
      {
        name: 'Mains', price: 22,
        items: [
          { key: 'sl_mn_jollof',     name: 'Jollof Rice & Stew (Sierra Leonean)', keywords: ['sierra leonean jollof', 'sierra leone jollof'] },
          { key: 'sl_mn_fried_rice', name: 'Boneless Chicken / Seafood Fried Rice',keywords: ['seafood fried rice', 'chicken fried rice'] },
          { key: 'sl_mn_rice_sticks',name: 'Rice Sticks',                          keywords: ['rice sticks'] },
          { key: 'sl_mn_groundnut',  name: 'Groundnut Stew with Steamed Rice',     keywords: ['groundnut stew', 'ground nut stew', 'groundnut', 'groundnut soup', 'ground nut soup'] },
          { key: 'sl_mn_cassava',    name: 'Cassava Leaves with Meat / Fish',      keywords: ['cassava leaves', 'casava leaves', 'cassawa leaves', 'cassava leaf', 'casava leaf', 'cassava'] },
          { key: 'sl_mn_crain',      name: 'Crain Crain with Meat / Fish',         keywords: ['crain crain', 'crane crane', 'cran cran', 'krain krain', 'grain grain', 'cream cream', 'krane krane', 'kren kren', 'krain'] },
          { key: 'sl_mn_potato',     name: 'Potato Leaves with Meat / Fish',       keywords: ['potato leaves', 'potato leaf'] },
          { key: 'sl_mn_palm_oil',   name: 'Red Palm Oil Stew with Check Rice',    keywords: ['palm oil stew', 'red palm oil', 'palm oil', 'check rice'] },
          { key: 'sl_mn_fufu',       name: 'Fufu with Choice of Soup',             keywords: ['sierra fufu', 'fufu palm oil', 'salone fufu'] },
        ],
      },
    ],
  },
  {
    cuisine: 'Caribbean Cuisine',
    sections: [
      {
        name: 'Mains', price: 20,
        items: [
          { key: 'cb_mn_jerk_chicken',  name: 'Jerk Chicken',           keywords: ['jerk chicken'] },
          { key: 'cb_mn_jerk_wings',    name: 'Jerk Chicken Wings',     keywords: ['jerk chicken wings', 'jerk wings'] },
          { key: 'cb_mn_jerk_pork',     name: 'Jerk Pork',              keywords: ['jerk pork'] },
          { key: 'cb_mn_curried',       name: 'Curried Chicken',        keywords: ['curried chicken', 'curry chicken'] },
          { key: 'cb_mn_brown_chicken', name: 'Brown Stew Chicken',     keywords: ['brown stew chicken'] },
          { key: 'cb_mn_oxtail',        name: 'Oxtail',                 keywords: ['oxtail', 'ox tail', 'oxtails'] },
          { key: 'cb_mn_pepper_steak',  name: 'Pepper Steak',           keywords: ['pepper steak'] },
          { key: 'cb_mn_curry_goat',    name: 'Curry Goat',             keywords: ['curry goat'] },
          { key: 'cb_mn_stew_shrimp',   name: 'Stew Shrimp',            keywords: ['stew shrimp', 'shrimp stew'] },
          { key: 'cb_mn_brown_fish',    name: 'Brown Stew Fish',        keywords: ['brown stew fish', 'stew fish'] },
          { key: 'cb_mn_escovitch',     name: 'Escovitch Fish',         keywords: ['escovitch', 'escobeech', 'escobitch', 'escovish', 'eskovitch', 'escoviche', 'escowich', 'escobeach', 'escovet'] },
          { key: 'cb_mn_curry_shrimp',  name: 'Curry Shrimp',          keywords: ['curry shrimp'] },
        ],
      },
      {
        name: 'Specials', price: 24,
        items: [
          { key: 'cb_sp_callaloo', name: 'Callaloo',        keywords: ['callaloo', 'calaloo', 'callalou', 'calalou', 'callalu', 'kalaloo', 'kalalu', 'callalo', 'calalow', 'kalalow'] },
          { key: 'cb_sp_ackee',    name: 'Ackee & Cod Fish',keywords: ['ackee', 'aki', 'ackie', 'acky', 'ackee cod', 'echo see', 'ackey'] },
        ],
      },
      {
        name: 'Sides', price: 5,
        items: [
          { key: 'cb_sd_plantains', name: 'Plantains',      keywords: ['caribbean plantain', 'rice and peas plantain', 'plantain'] },
          { key: 'cb_sd_dumpling',  name: 'Fried Dumpling', keywords: ['fried dumpling', 'dumpling', 'fried dumplin', 'fry dumpling'] },
          { key: 'cb_sd_wings',     name: 'Wings (Side)',   keywords: ['wings side'] },
        ],
      },
      {
        name: 'Desserts', price: 7,
        items: [
          { key: 'cb_ds_rum_cake',  name: 'Rum Cake',        keywords: ['rum cake'] },
          { key: 'cb_ds_banana',    name: 'Banana Cake',     keywords: ['banana cake'] },
          { key: 'cb_ds_choc_cake', name: 'Chocolate Cake',  keywords: ['chocolate cake'] },
          { key: 'cb_ds_ice_cream', name: 'Ice Creams',      keywords: ['ice cream'] },
        ],
      },
    ],
  },
  {
    cuisine: 'Luxury Canapés',
    sections: [
      {
        name: 'Canapés', price: 4,
        items: [
          { key: 'cn_ackee_vol',     name: 'Ackee & Saltfish Vol au Vent',       keywords: ['vol au vent', 'ackee vol', 'vola vent', 'volu vent', 'vol vent', 'vow vent', 'vol au van'] },
          { key: 'cn_jerk_skewer',   name: 'Jerk Chicken Skewer & Plantain',     keywords: ['jerk skewer', 'chicken skewer'] },
          { key: 'cn_yam_plantain',  name: 'Fried Yam and Plantain Mix',         keywords: ['fried yam plantain', 'yam plantain mix'] },
          { key: 'cn_spring_rolls',  name: 'Spring Rolls with Sweet Chilli',     keywords: ['sweet chilli spring rolls', 'sweet chilli'] },
          { key: 'cn_king_prawns',   name: 'Crispy Breaded King Prawns (Canapé)',keywords: ['crispy king prawns', 'canapé prawns'] },
          { key: 'cn_fish_chips',    name: 'Mini British Fish and Chips',        keywords: ['fish and chips', 'mini fish'] },
          { key: 'cn_prawns_lettuce',name: 'Cooked Prawns on Lettuce (Canapé)', keywords: ['canapé prawns lettuce'] },
          { key: 'cn_wings_canape',  name: 'Chicken Wings BBQ (Canapé)',         keywords: ['canapé wings'] },
          { key: 'cn_butter_chicken',name: 'Crispy Chicken in Butter Mayonnaise',keywords: ['butter mayonnaise', 'butter chicken crispy'] },
          { key: 'cn_gizzard_plantain',name:'Spicy Gizzard & Diced Plantains',  keywords: ['gizzard plantain', 'gizzard diced'] },
          { key: 'cn_mini_burgers',  name: 'Mini Burgers',                       keywords: ['mini burgers', 'sliders'] },
          { key: 'cn_meat_pies',     name: 'Mini Mixed Meat Pies',               keywords: ['meat pies', 'mini pies'] },
          { key: 'cn_patties',       name: 'Mini Mixed Patties',                 keywords: ['patties', 'mini patties'] },
          { key: 'cn_puff_puff_bite',name: 'Puff Puff Bites (Canapé)',          keywords: ['puff puff bites'] },
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

// Detect food items mentioned in a transcript line
// Returns { toCheck: [key], toUncheck: [key], toAmbiguous: [{id, label, candidates, minPrice, maxPrice}] }
function detectFoodInText(text) {
  // Split into clauses so "remove X, but leave Y" is handled per-clause.
  // This prevents a removal phrase in one clause from unchecking items in another.
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
  // A clause with preservation language is never treated as a removal,
  // even if it also contains removal words from an adjacent clause.
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

    // Map from keyword → matching items for THIS clause
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
    // Sort by keyword length descending (longer = more specific = higher priority)
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

export default function DemoPage({ onHome, onBookDemo, onEnterApp }) {
  // ── Detect viewer mode ──
  const params = new URLSearchParams(window.location.search);
  const watchCode = params.get('w') || params.get('watch'); // 'w' is the short form
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
  const [callActive,   setCA]          = useState(false);
  const [callStatus,   setCallStatus]  = useState('idle'); // 'idle'|'connecting'|'ringing'|'active'
  const [timerRunning, setTimerRunning]= useState(false);
  const [callSeconds,  setCS]          = useState(0);
  const [recordingUrl, setRec]         = useState(null);

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

  // ── Share ──
  const [copied, setCopied] = useState(false);

  // ── Dialpad ──
  const [dialNumber, setDialNum] = useState('');

  // ── Menu checklist (catering niche) ──
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
  const fillDebounceRef = useRef(null);
  const timerRef        = useRef(null);
  const mediaRecRef     = useRef(null);
  const recChunksRef    = useRef([]);
  const txDivRef        = useRef(null);
  const onLineRef       = useRef(null);
  const heartbeatRef    = useRef(null);
  const twilioDeviceRef   = useRef(null);
  const twilioCallRef     = useRef(null);
  const twilioCallSidRef  = useRef(null);  // stored CallSid for fetching server-side recording
  const whisperIntervalRef  = useRef(null);
  const whisperHeaderRef    = useRef(null);
  const transcriptPusherRef = useRef(null); // Twilio Real-Time Transcription Pusher subscription
  const lastYouTxRef    = useRef(false);   // unused — kept for cleanup safety
  const youWatchdogRef  = useRef(null);    // unused — kept for cleanup safety
  const remoteHungUpRef = useRef(false);   // true when disconnect was initiated by remote party

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

      // ── Live food detection for catering niche ────────────────────────────
      if (nicheRef.current?.id === 'wedding-catering') {
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
          // Mute local ringback — don't play until remote party's phone rings
          try { device.audio.outgoing(false); } catch {}
          const call = await device.connect({ params: { To: phoneNumber, Session: scRef.current || '' } });
          twilioCallRef.current = call;

          // Subscribe to tx channel for Twilio Real-Time Transcription events
          if (PUSHER_KEY && PUSHER_CLUSTER && scRef.current) {
            const p = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
            const ch = p.subscribe(`tx-${scRef.current}`);
            ch.bind('transcript', ({ speaker, text }) => {
              if (onLineRef.current) onLineRef.current(speaker, text);
            });
            transcriptPusherRef.current = { pusher: p, channel: `tx-${scRef.current}` };
            setTxPA(true);
          }

          // Auto-end when remote party hangs up
          call.on('disconnect', () => {
            remoteHungUpRef.current = true;
            if (caRef.current) endCall();
          });
          // Capture CallSid on accept (needed for server-side recording after call ends).
          call.on('accept', () => {
            const sid = call.parameters?.CallSid;
            if (sid) {
              twilioCallSidRef.current = sid;
              console.log('[twilio] CallSid captured:', sid);
            } else {
              console.warn('[twilio] CallSid not available in call.parameters after accept');
            }
          });

          // 'ringing' fires when the remote party's phone starts ringing.
          // Only now: enable local ringback, start the mic, and start the timer.
          call.on('ringing', () => {
            setCallStatus('ringing');
            setTimerRunning(true);
            try { twilioDeviceRef.current?.audio.outgoing(true); } catch {}
            startMic();
          });
        }
      } catch (e) {
        console.warn('Twilio unavailable, mic-only mode:', e.message);
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

    // Re-scan full transcript for missed food items (catering niche)
    if (nicheRef.current?.id === 'wedding-catering' && txRef.current.length > 0) {
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
    if (nicheRef.current?.id === 'wedding-catering') {
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
    // Capture callSid before clearing refs (needed to fetch server-side recording)
    const endedCallSid = twilioCallSidRef.current;
    // Disconnect Twilio — only call disconnect() if the call is still open
    // (remote hangup already tears down the WebSocket; calling disconnect() again
    // causes "WebSocket is already in CLOSING or CLOSED state" error)
    try {
      const call = twilioCallRef.current;
      if (call && call.status() !== 'closed') call.disconnect();
    } catch {}
    try { twilioDeviceRef.current?.destroy(); } catch {}
    twilioCallRef.current = null; twilioDeviceRef.current = null;
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
    const nextPhase = 'done';
    setPhase(nextPhase); phaseRef.current = nextPhase;
    broadcast({ callActive: false, phase: nextPhase });

    // Fetch Twilio server-side recording (if this was a Twilio call)
    if (endedCallSid) {
      // Poll for the recording — Twilio may take a few seconds to finalise it
      const pollRecording = async (attempts = 0) => {
        if (attempts > 15) return; // give up after ~30s
        try {
          const r = await fetch(`/api/twilio-recording?callSid=${endedCallSid}`);
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

    // Run full AI analysis — only if there's actual transcript content
    if (!txRef.current.length) return;
    setAnalysing(true);
    try {
      const r = await fetch('/api/demo-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Build menu summary for catering niche
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
    setMenuChecked({}); menuCheckedRef.current = {}; setMenuAmbiguous([]);
    setPriceOverrides({});
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
    setDialNum('');
    setNiche(null); nicheRef.current = null;
    const nextPhase = 'dial'; setPhase(nextPhase); phaseRef.current = nextPhase;
    broadcast({ phase: nextPhase, fields: flds, fieldValues: {}, transcript: [] });
  };

  const reset = () => {
    stopMic();
    setPhase('landing'); phaseRef.current = 'landing';
    setMode(null); setCode(null); setNiche(null);
    setFields([]); setFVals({}); setTx([]);
    setCA(false); setCS(0); setRec(null);
    setMF([]); setML(''); setMT('text'); setAM(false);
    setSaveName(''); setFormSaved(false);
    setMenuChecked({}); menuCheckedRef.current = {}; setMenuAmbiguous([]);
    setPriceOverrides({});
    modeRef.current = null; nicheRef.current = null;
    fieldsRef.current = []; fvRef.current = {}; txRef.current = [];
    caRef.current = false; twilioCallSidRef.current = null; remoteHungUpRef.current = false;
  };

  // ── Share URL ─────────────────────────────────────────────────────────────
  const shareUrl = sessionCode ? `${window.location.origin}/demo?w=${sessionCode}` : '';
  const copyShare = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  // ── Menu checklist renderer (catering niche) ──────────────────────────────
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
                Live interactive demo tool
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
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Option 1</div>
                <h2 className="text-xl font-black text-slate-900 mb-3">Build a Form</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-5">
                  Ask your client what questions they normally ask <em>their</em> customers. Our AI listens and builds an intake form — field by field — as they describe their process.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  {['Pick your niche first', 'AI tailors its field detection', 'Form builds live in real time', 'Save created form at the end'].map(t => (
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

            {/* Your saved forms */}
            {savedForms.length > 0 && (
              <div className="mb-8">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Your saved forms</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedForms.map(form => (
                    <div key={form.id} className="bg-white rounded-2xl border border-green-200 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-slate-900 truncate">{form.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {form.fields.length} fields · {new Date(form.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteSavedForm(form.id)}
                          className="text-slate-300 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="space-y-1 mb-4">
                        {form.fields.slice(0, 4).map(f => (
                          <div key={f.key} className="flex items-center gap-1.5 text-xs text-slate-400">
                            <div className="w-1 h-1 bg-green-400 rounded-full flex-shrink-0" />
                            {f.label}
                          </div>
                        ))}
                        {form.fields.length > 4 && (
                          <div className="text-xs text-slate-300">+{form.fields.length - 4} more fields</div>
                        )}
                      </div>
                      <button
                        onClick={() => selectSavedForm(form)}
                        className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        Use this form →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

    // Live quote total for header — catering niche only for now
    let callQuoteTotal = null;
    if (niche?.id === 'wedding-catering' && Object.keys(menuChecked).length > 0) {
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
      <PageShell onHome={onHome} onBookDemo={onBookDemo} isViewer={isViewer} sessionCode={sessionCode} onReset={!isViewer ? reset : undefined} quoteTotal={callQuoteTotal}>
        {renderCallScreen()}
      </PageShell>
    );
  }

  if (phase === 'done') {
    const filledCount = fields.filter(f => fieldValues[f.key] !== undefined && fieldValues[f.key] !== '').length;

    return (
      <PageShell onHome={onHome} onBookDemo={onBookDemo} isViewer={isViewer} sessionCode={sessionCode} onReset={!isViewer ? reset : undefined}>
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

              if (niche?.id === 'wedding-catering' && Object.keys(menuChecked).length > 0) {
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
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Venue</div>
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
                        ? `Prices based on De'Osa catering menu. Final quote subject to full menu confirmation.`
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

function PageShell({ children, onHome, onBookDemo, isViewer, sessionCode, onReset, quoteTotal }) {
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
          {!isViewer && onReset && (
            <button
              onClick={onReset}
              className="hidden md:flex items-center gap-1.5 px-4 py-2 text-sm text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-400 rounded-full transition-colors"
            >
              ↺ New demo
            </button>
          )}
          {!isViewer && (
            <button onClick={onHome} className="hidden md:inline-flex px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Back to site
            </button>
          )}
          {quoteTotal ? (
            <div className="flex flex-col items-end px-5 py-2 bg-green-600 text-white rounded-full shadow-md transition-all duration-300">
              <span className="text-lg font-black leading-tight">{quoteTotal.text}</span>
              <span className="text-[10px] font-medium opacity-75 leading-tight">{quoteTotal.sub}</span>
            </div>
          ) : (
            <button
              onClick={onBookDemo}
              className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-700 transition-colors shadow-md"
            >
              Book a demo
            </button>
          )}
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}
