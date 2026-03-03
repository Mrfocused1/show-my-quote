import { useState, useEffect, useRef } from 'react';

const BASE = import.meta.env.VITE_API_BASE || '';

export default function SignPage() {
  const token = new URLSearchParams(window.location.search).get('token');

  const [status, setStatus]   = useState('loading'); // loading | ready | signed | error | submitted
  const [doc, setDoc]         = useState(null);
  const [signerName, setSignerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg]   = useState('');

  const canvasRef   = useRef(null);
  const drawing     = useRef(false);
  const hasDrawn    = useRef(false);

  // ── Load signing request ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setStatus('error'); setErrMsg('Invalid signing link — no token found.'); return; }
    fetch(`${BASE}/api/sign-get?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setStatus('error'); setErrMsg(d.error); return; }
        setDoc(d);
        setSignerName(d.client_name || '');
        setStatus(d.already_signed ? 'signed' : 'ready');
      })
      .catch(() => { setStatus('error'); setErrMsg('Failed to load signing request.'); });
  }, [token]);

  // ── Canvas helpers ────────────────────────────────────────────────────────
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    };
  };

  const startDraw = e => {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    drawing.current = true;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = e => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    hasDrawn.current = true;
  };

  const endDraw = e => { e.preventDefault(); drawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!hasDrawn.current) { setErrMsg('Please draw your signature before submitting.'); return; }
    setErrMsg('');
    setSubmitting(true);
    const canvas = canvasRef.current;
    const signature_data = canvas.toDataURL('image/png');
    try {
      const r = await fetch(`${BASE}/api/sign-submit?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature_data, signer_name: signerName }),
      });
      const d = await r.json();
      if (!r.ok) { setErrMsg(d.error || 'Failed to submit.'); setSubmitting(false); return; }
      setStatus('submitted');
    } catch {
      setErrMsg('Network error — please try again.'); setSubmitting(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmt = n => '£' + (Number(n) || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', -apple-system, sans-serif", color: '#1e293b' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/logo.png" alt="Show My Quote" style={{ height: 32, width: 'auto' }} />
        <span style={{ fontSize: 13, color: '#64748b', marginLeft: 'auto' }}>Secure Document Signing</span>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 16px 64px' }}>

        {/* Loading */}
        {status === 'loading' && (
          <div style={{ textAlign: 'center', padding: 64, color: '#64748b' }}>Loading document…</div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div style={{ background: '#fff', border: '1px solid #fca5a5', borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Signing link invalid</div>
            <div style={{ color: '#64748b', fontSize: 14 }}>{errMsg}</div>
          </div>
        )}

        {/* Already signed */}
        {status === 'signed' && (
          <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>✓</div>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8, color: '#16a34a' }}>Already signed</div>
            <div style={{ color: '#64748b', fontSize: 14 }}>This document was signed on {new Date(doc?.signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</div>
            <div style={{ marginTop: 12, fontWeight: 600, fontSize: 15 }}>{doc?.document_title}</div>
          </div>
        )}

        {/* Success after submission */}
        {status === 'submitted' && (
          <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>✓</div>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8, color: '#16a34a' }}>Document signed!</div>
            <div style={{ color: '#64748b', fontSize: 14 }}>Your signature has been recorded. The business will be notified.</div>
            <div style={{ marginTop: 12, fontWeight: 600, fontSize: 15 }}>{doc?.document_title}</div>
          </div>
        )}

        {/* Ready to sign */}
        {status === 'ready' && doc && (
          <>
            {/* Document card */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 }}>Document</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#0f172a' }}>{doc.document_title}</div>
                {doc.client_name && <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Prepared for: <strong>{doc.client_name}</strong></div>}
              </div>

              {/* Document details */}
              {doc.document_data && (
                <div style={{ padding: '20px 24px' }}>
                  {doc.document_data.items?.length > 0 && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ textAlign: 'left', padding: '6px 0', color: '#94a3b8', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description</th>
                          <th style={{ textAlign: 'right', padding: '6px 0', color: '#94a3b8', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', width: 80 }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doc.document_data.items.map((it, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ padding: '8px 0', color: '#374151' }}>{it.desc}</td>
                            <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{fmt(it.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {doc.document_data.total != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '2px solid #0f172a', fontWeight: 800, fontSize: 16 }}>
                      <span>Total</span>
                      <span>{fmt(doc.document_data.total)}</span>
                    </div>
                  )}
                  {doc.document_data.notes && (
                    <div style={{ marginTop: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                      <strong>Notes:</strong> {doc.document_data.notes}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Signature section */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Sign this document</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Draw your signature in the box below using your mouse or finger.</div>
              </div>
              <div style={{ padding: '20px 24px' }}>

                {/* Name field */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your full name</label>
                  <input
                    value={signerName}
                    onChange={e => setSignerName(e.target.value)}
                    placeholder="Enter your name"
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                </div>

                {/* Canvas */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Signature</label>
                    <button onClick={clearCanvas} style={{ fontSize: 12, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px', borderRadius: 6, hover: 'none' }}>Clear</button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={520}
                    height={160}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                    style={{
                      width: '100%',
                      height: 160,
                      border: '2px dashed #e2e8f0',
                      borderRadius: 12,
                      background: '#fafafa',
                      cursor: 'crosshair',
                      display: 'block',
                      touchAction: 'none',
                    }}
                  />
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>Draw your signature above</div>
                </div>

                {/* Date */}
                <div style={{ marginBottom: 20, fontSize: 13, color: '#64748b' }}>
                  Date: <strong>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                </div>

                {errMsg && (
                  <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
                    {errMsg}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    width: '100%', padding: '14px', background: submitting ? '#94a3b8' : '#16a34a', color: '#fff',
                    border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', letterSpacing: '0.01em',
                  }}
                >
                  {submitting ? 'Submitting…' : 'Sign & Submit'}
                </button>

                <div style={{ marginTop: 12, fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 }}>
                  By signing, you agree to the terms outlined in the document above. Your IP address and timestamp are recorded.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
