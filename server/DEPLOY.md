# VPS Transcription Server — Deployment Guide

## What this replaces
| Service | Old cost | New cost |
|---|---|---|
| Railway (media relay) | $10/mo | $0 |
| AssemblyAI (speech-to-text) | ~$216/mo (8h/day) | $0 |
| Hetzner CX22 VPS | — | $6/mo |
| **Total** | **~$226/mo** | **$6/mo** |

*(Pusher stays for now — replace in Phase 2 for another $49/mo saving)*

---

## Step 1: Create Hetzner VPS

1. Go to [hetzner.com](https://hetzner.com) → Cloud → New project
2. Create server:
   - **Type**: CX22 (2 vCPU, 4 GB RAM) — ~$6/mo
   - **OS**: Ubuntu 22.04
   - **Location**: pick closest to US (Ashburn, VA)
   - Add your SSH key
3. Note the server's public IP

---

## Step 2: Set up DNS

In your domain registrar (or Cloudflare):

| Type | Name | Value |
|---|---|---|
| A | `transcribe` | `YOUR_VPS_IP` |

This creates `transcribe.showmyquote.com` → your VPS.

Wait 1-5 minutes for DNS to propagate before running setup.

---

## Step 3: Run the setup script

```bash
# From your local machine, upload the server files
scp -r server/ root@YOUR_VPS_IP:/opt/smq-transcription

# SSH in and run setup
ssh root@YOUR_VPS_IP
cd /opt/smq-transcription
bash setup.sh
```

The script will ask for:
- Your domain (e.g. `transcribe.showmyquote.com`)
- Your email (for SSL cert)
- Your Pusher credentials (App ID, Key, Secret, Cluster)

It will automatically:
- Install Node.js 20, Python 3.11, PM2, Nginx, Certbot
- Download the Whisper `base.en` model
- Configure SSL via Let's Encrypt
- Set up firewall
- Start both services and register them to auto-start on reboot

---

## Step 4: Update Vercel env var

In Vercel → your project → Settings → Environment Variables:

| Variable | New value |
|---|---|
| `TRANSCRIPTION_WS_URL` | `wss://transcribe.showmyquote.com` |

Then **redeploy** (push any commit, or trigger manual redeploy).

---

## Step 5: Test

1. Open your app at showmyquote.com
2. Make or receive a call
3. Watch the transcript appear in real-time
4. On the VPS: `pm2 logs smq-ws` to watch the audio being processed

---

## Useful Commands (on VPS)

```bash
pm2 status              # Are both services running?
pm2 logs smq-ws         # WebSocket server logs
pm2 logs smq-whisper    # Faster Whisper logs
pm2 restart all         # Restart both
pm2 stop all            # Stop both
```

---

## Whisper Model Options

Edit `/opt/smq-transcription/.env` and change `WHISPER_MODEL`:

| Model | Size | Speed (CPU) | Quality |
|---|---|---|---|
| `tiny.en` | 75 MB | ~0.2s/seg | OK |
| `base.en` | 150 MB | ~0.5s/seg | Good ✓ |
| `small.en` | 500 MB | ~1.5s/seg | Great |

After changing: `pm2 restart smq-whisper`

---

## Phase 2 — Remove Pusher (optional, save another $49/mo)

Phase 2 replaces the Pusher delivery channel with a direct WebSocket
from the browser to this VPS. This requires modifying DemoPage.jsx
to subscribe to the VPS directly instead of Pusher.

Not needed yet — do this when Pusher costs become a concern.
