import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';

export default function SignIn({ onHome, onEnterApp }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = e => {
    e.preventDefault();
    onEnterApp();
  };

  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 md:py-5 backdrop-blur-md bg-white/10">
        <div className="flex-shrink-0">
          <button onClick={onHome}>
            <img src="/logo.svg" alt="Show My Quote" className="h-12 w-auto" />
          </button>
        </div>

        <div className="hidden md:flex items-center bg-white/70 backdrop-blur-md border border-white/60 rounded-full px-2 py-1.5 shadow-sm gap-0.5">
          {[
            { label: 'Home'           },
            { label: 'Features'       },
            { label: 'Getting started'},
            { label: 'Contact'        },
          ].map(({ label }) => (
            <button
              key={label}
              onClick={onHome}
              className="px-4 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-full transition-colors"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onHome}
            className="px-4 md:px-5 py-2 md:py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-700 transition-colors shadow-md">
            Book a Demo
          </button>
        </div>
      </nav>

      {/* Back link */}
      <div className="px-10 pt-8">
        <button onClick={onHome}
          className="flex items-center space-x-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to home</span>
        </button>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-10 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 mb-2">Sign in</h1>
            <p className="text-slate-500 text-sm">Welcome back to Show My Quote.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Password
              </label>
              <input
                required
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 transition placeholder:text-slate-300"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <a href="#" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">
                Forgot password?
              </a>
            </div>

            <button type="submit"
              className="w-full py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition-colors shadow-sm">
              Sign in
            </button>
          </form>

          <p className="text-sm text-slate-500 text-center mt-6">
            Don't have an account?{' '}
            <button onClick={onHome}
              className="font-semibold text-slate-900 hover:underline underline-offset-2">
              Book a demo
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
