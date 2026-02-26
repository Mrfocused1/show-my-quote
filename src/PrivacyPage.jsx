import React from 'react';
import { ChevronLeft } from 'lucide-react';

const SECTIONS = [
  {
    title: '1. Who we are',
    body: `Show My Quote ("we", "us", "our") is the data controller responsible for your personal data. If you have any questions about this Privacy Policy or how we handle your data, please contact us at privacy@showmyquote.com.`,
  },
  {
    title: '2. What data we collect',
    body: `We collect data you provide directly — such as your name, business name, email address, and payment details when you register or book a demo. We also collect data generated through your use of the Service, including call transcriptions, quote records, and auto-logged call notes. Technical data such as IP addresses, browser type, and usage logs are collected automatically.`,
  },
  {
    title: '3. How we use your data',
    body: `We use your data to provide and operate the Service, process payments, send you important account communications, and improve the platform. We may use anonymised, aggregated data to analyse usage patterns and develop new features. We will not use your personal data for any purpose incompatible with these stated purposes.`,
  },
  {
    title: '4. Call recording and transcription',
    body: `The Service may record and transcribe telephone calls for the purpose of generating quotes. You are responsible for ensuring that all parties to a call are informed of any recording in accordance with applicable law, including the Telecommunications (Lawful Business Practice) (Interception of Communications) Regulations 2000 and any other relevant legislation. Call data is stored securely and retained only for as long as necessary to provide the Service.`,
  },
  {
    title: '5. Legal basis for processing',
    body: `We process your personal data on the following legal bases: (a) performance of a contract — to deliver the Service you have subscribed to; (b) legitimate interests — to improve the Service and prevent fraud; (c) legal obligation — where processing is required by law; and (d) consent — where you have explicitly opted in, such as for marketing communications.`,
  },
  {
    title: '6. Data sharing',
    body: `We do not sell your personal data. We may share data with trusted third-party service providers who assist us in operating the Service (such as payment processors, cloud hosting providers, and AI processing services), all of whom are bound by strict data processing agreements. We may disclose data where required by law or to protect our legal rights.`,
  },
  {
    title: '7. International transfers',
    body: `Some of our third-party providers may process data outside the UK or European Economic Area. Where this occurs, we ensure appropriate safeguards are in place, such as Standard Contractual Clauses approved by the Information Commissioner's Office (ICO), to protect your data to the same standard as within the UK.`,
  },
  {
    title: '8. Data retention',
    body: `We retain your personal data for as long as your account is active, or as long as necessary to provide the Service and comply with our legal obligations. Upon account closure, your data will be deleted or anonymised within 90 days, unless we are required by law to retain it for longer.`,
  },
  {
    title: '9. Your rights',
    body: `Under UK GDPR, you have the right to: access the personal data we hold about you; request correction of inaccurate data; request deletion of your data (subject to legal obligations); object to or restrict certain processing; and request a portable copy of your data. To exercise any of these rights, contact us at privacy@showmyquote.com. You also have the right to lodge a complaint with the Information Commissioner's Office (ico.org.uk).`,
  },
  {
    title: '10. Cookies',
    body: `We use cookies and similar tracking technologies to maintain your session, remember your preferences, and analyse how the Service is used. Essential cookies are necessary for the Service to function and cannot be disabled. You may disable non-essential cookies through your browser settings, though this may affect certain features.`,
  },
  {
    title: '11. Security',
    body: `We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, loss, or disclosure. This includes encryption in transit and at rest, access controls, and regular security reviews. However, no method of transmission over the internet is entirely secure, and we cannot guarantee absolute security.`,
  },
  {
    title: '12. Changes to this policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of material changes by email or via an in-app notice. Continued use of the Service after the effective date of any changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '13. Contact us',
    body: `For any privacy-related questions or to exercise your rights, please contact our Data Protection team at privacy@showmyquote.com or write to us at Show My Quote, England, United Kingdom.`,
  },
];

export default function PrivacyPage({ onHome }) {
  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-10 py-5 border-b border-slate-100">
        <button onClick={onHome} className="flex items-center space-x-2.5">
          <img src="/logo.svg" alt="Show My Quote" className="h-24 w-auto" />
        </button>
        <button onClick={onHome}
          className="px-5 py-2.5 bg-white text-slate-800 text-sm font-semibold rounded-full border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
          Back to home
        </button>
      </nav>

      {/* Back link */}
      <div className="px-10 pt-8">
        <button onClick={onHome}
          className="flex items-center space-x-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to home</span>
        </button>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-10 py-12">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Legal</p>
        <h1 className="text-4xl font-black text-slate-900 mb-3">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-12">Last updated: 1 January 2025</p>

        <div className="space-y-10">
          {SECTIONS.map(({ title, body }) => (
            <div key={title}>
              <h2 className="text-sm font-bold text-slate-900 mb-3">{title}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-slate-100">
          <button onClick={onHome}
            className="px-6 py-3 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-700 transition-colors">
            Back to home
          </button>
        </div>
      </div>

    </div>
  );
}
