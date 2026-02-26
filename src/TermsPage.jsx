import React from 'react';
import { ChevronLeft } from 'lucide-react';

const SECTIONS = [
  {
    title: '1. Acceptance of terms',
    body: `By accessing or using Show My Quote ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, you must not use the Service. These terms apply to all users, including sole traders, limited companies, and individuals acting on behalf of a business.`,
  },
  {
    title: '2. Description of service',
    body: `Show My Quote provides an AI-assisted quoting platform for wedding vendors. The Service listens to telephone enquiry calls, transcribes the conversation, and generates a structured quote based on information you have configured. A phone number may optionally be provided as part of the Service. Unlimited local calls and texts are included within your country of registration.`,
  },
  {
    title: '3. Your account',
    body: `You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You must notify us immediately at support@showmyquote.com if you suspect any unauthorised use of your account. We reserve the right to suspend or terminate accounts that violate these terms.`,
  },
  {
    title: '4. Acceptable use',
    body: `You agree not to use the Service for any unlawful purpose or in any way that could damage, disable, or impair the platform. You must not attempt to gain unauthorised access to any part of the Service, reverse-engineer the software, or use the Service to transmit spam or unsolicited communications. Recording of calls must comply with applicable law, including informing callers where required.`,
  },
  {
    title: '5. Payment and billing',
    body: `Subscription fees are billed monthly in advance. All prices are displayed in GBP and are exclusive of VAT where applicable. Payments are processed securely via a third-party payment provider. If a payment fails, we will notify you and may suspend access until the outstanding balance is settled. No refunds are issued for partial months of service.`,
  },
  {
    title: '6. Data and privacy',
    body: `Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. You retain ownership of all data you upload or generate through the Service. By using the Service, you grant Show My Quote a limited licence to process that data solely to provide and improve the Service.`,
  },
  {
    title: '7. Intellectual property',
    body: `All intellectual property rights in the Service — including software, designs, trademarks, and content — are owned by or licenced to Show My Quote. Nothing in these Terms transfers any intellectual property rights to you. You may not copy, modify, distribute, or create derivative works from any part of the Service without our prior written consent.`,
  },
  {
    title: '8. Limitation of liability',
    body: `To the fullest extent permitted by law, Show My Quote shall not be liable for any indirect, incidental, special, or consequential loss or damage arising from your use of the Service, including loss of profits, loss of data, or business interruption. Our total aggregate liability shall not exceed the fees paid by you in the three months preceding the claim.`,
  },
  {
    title: '9. Termination',
    body: `You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period. We reserve the right to suspend or terminate your account immediately if you breach these Terms, with or without notice.`,
  },
  {
    title: '10. Changes to these terms',
    body: `We may update these Terms from time to time. We will notify you of any material changes by email or via an in-app notice at least 14 days before they take effect. Continued use of the Service after that date constitutes your acceptance of the revised Terms.`,
  },
  {
    title: '11. Governing law',
    body: `These Terms are governed by and construed in accordance with the laws of England and Wales. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.`,
  },
  {
    title: '12. Contact',
    body: `If you have any questions about these Terms, please contact us at legal@showmyquote.com.`,
  },
];

export default function TermsPage({ onHome }) {
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
        <h1 className="text-4xl font-black text-slate-900 mb-3">Terms of Service</h1>
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
