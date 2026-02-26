import React, { useState } from 'react';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';

export default function BookDemo({ onHome, onEnterApp }) {
  const [form, setForm] = useState({
    name: '', business: '', email: '', phone: '', guests: '', message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = e => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white">

      {/* Navbar — matches homepage */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 md:py-5 backdrop-blur-md bg-white/10">
        <div className="flex-shrink-0">
          <button onClick={onHome}>
            <img src="/logo.svg" alt="Show My Quote" className="h-12 w-auto" />
          </button>
        </div>

        <div className="hidden md:flex items-center bg-white/70 backdrop-blur-md border border-white/60 rounded-full px-2 py-1.5 shadow-sm gap-0.5">
          {[
            { label: 'Features',        id: 'features'     },
            { label: 'Getting started', id: 'how-it-works' },
            { label: 'Contact',         id: 'contact'      },
          ].map(({ label, id }) => (
            <button key={id} onClick={() => onHome(id)}
              className="px-4 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-full transition-colors">
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onEnterApp}
            className="hidden md:inline-flex px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Sign in
          </button>
          <button onClick={onHome}
            className="px-4 md:px-5 py-2 md:py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-700 transition-colors shadow-md">
            Home
          </button>
        </div>
      </nav>

      {/* Back link */}
      <div className="px-4 md:px-10 pt-6 md:pt-8">
        <button onClick={onHome}
          className="flex items-center space-x-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to home</span>
        </button>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-10 py-8 md:py-12 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-start">

        {/* Left — pitch */}
        <div className="pt-2">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Book a Demo</p>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-6">
            See Show My Quote<br />in action — live.
          </h1>
          <p className="text-slate-600 text-base leading-relaxed mb-8">
            In 15 minutes we'll show you how to turn a phone enquiry into a professional quote before the call ends.
          </p>

          <div className="space-y-4">
            {[
              { title: 'Live call transcription',   desc: 'Watch fields fill in as your client speaks.' },
              { title: 'Instant quote generation',  desc: 'AI builds a quote from the call automatically.' },
              { title: 'Send in one click',         desc: 'Branded PDF quote sent straight to the client.' },
            ].map(item => (
              <div key={item.title}>
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form */}
        <div className="bg-[#F7F7F5] rounded-2xl border border-slate-200 p-6 md:p-8">
          {submitted ? (
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-5">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Request received!</h2>
              <p className="text-slate-500 text-sm mb-6 max-w-xs leading-relaxed">
                We'll be in touch within one business day to confirm your 15-minute slot.
              </p>
              <button onClick={onHome}
                className="text-sm font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2 transition-colors">
                Back to home
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Request your demo</h2>
                <p className="text-sm text-slate-500">We'll confirm a 15-minute slot by email.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Your Name
                  </label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={set('name')}
                    placeholder="Jane Smith"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition placeholder:text-slate-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Business Name
                  </label>
                  <input
                    required
                    type="text"
                    value={form.business}
                    onChange={set('business')}
                    placeholder="Elite Catering Co."
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="jane@elitecatering.co.uk"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition placeholder:text-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="+44 7700 900000"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition placeholder:text-slate-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Events per month
                  </label>
                  <select
                    value={form.guests}
                    onChange={set('guests')}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition"
                  >
                    <option value="">Select…</option>
                    <option>1–5</option>
                    <option>6–15</option>
                    <option>16–30</option>
                    <option>30+</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Anything you'd like us to know?
                </label>
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={set('message')}
                  placeholder="Tell us about your business or what you're hoping to achieve…"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition resize-none placeholder:text-slate-300"
                />
              </div>

              <button type="submit"
                className="w-full py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors shadow-sm">
                Book my demo
              </button>

              <p className="text-xs text-slate-400 text-center">
                No commitment. We'll confirm your slot within one business day.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-100 px-4 md:px-10 py-6 md:py-8 mt-8 md:mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-slate-400">© 2025 Show My Quote. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <button onClick={onHome} className="text-xs text-slate-400 hover:text-slate-900 transition-colors">Home</button>
          <a href="#" className="text-xs text-slate-400 hover:text-slate-900 transition-colors">Privacy policy</a>
          <a href="#" className="text-xs text-slate-400 hover:text-slate-900 transition-colors">Terms of service</a>
        </div>
      </footer>

    </div>
  );
}
