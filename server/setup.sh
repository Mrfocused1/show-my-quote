#!/usr/bin/env bash
# =============================================================================
# Show My Quote — VPS Transcription Server Setup
# =============================================================================
# Tested on: Hetzner CX22 (2 vCPU / 4 GB RAM), Ubuntu 22.04 LTS
#
# What this script installs:
#   - Node.js 20 (WebSocket server)
#   - Python 3.11 + venv (Faster Whisper)
#   - PM2 (process manager + auto-restart on reboot)
#   - Nginx (SSL termination + WebSocket proxy)
#   - Certbot (free Let's Encrypt SSL)
#   - UFW firewall rules
#
# Usage:
#   1. SSH into your VPS as root
#   2. Upload this script:  scp server/setup.sh root@YOUR_VPS_IP:/root/setup.sh
#   3. Run:                 bash /root/setup.sh
#   4. Follow the prompts
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()     { echo -e "${RED}[ERR]${NC}  $*"; exit 1; }

# ── Preflight ─────────────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && die "Run as root (ssh root@your-vps)"
[[ $(uname -s) == "Linux" ]] || die "Linux required"

info "============================================================"
info "  Show My Quote — VPS Transcription Server"
info "============================================================"

# ── Collect inputs ────────────────────────────────────────────────────────────
read -rp "Your domain for this server (e.g. transcribe.showmyquote.com): " DOMAIN
[[ -z "$DOMAIN" ]] && die "Domain is required"

read -rp "Your email (for Let's Encrypt cert): " EMAIL
[[ -z "$EMAIL" ]] && die "Email is required"

read -rp "Pusher App ID: " PUSHER_APP_ID
read -rp "Pusher Key:    " PUSHER_KEY
read -rp "Pusher Secret: " PUSHER_SECRET
read -rp "Pusher Cluster (default: us2): " PUSHER_CLUSTER
PUSHER_CLUSTER="${PUSHER_CLUSTER:-us2}"

WHISPER_MODEL="${WHISPER_MODEL:-base.en}"
APP_DIR="/opt/smq-transcription"

info "Domain:        $DOMAIN"
info "App directory: $APP_DIR"
info "Whisper model: $WHISPER_MODEL"
echo ""

# ── System update ─────────────────────────────────────────────────────────────
info "Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ── Install essentials ────────────────────────────────────────────────────────
info "Installing essentials..."
apt-get install -y -qq \
  curl git unzip build-essential \
  python3.11 python3.11-venv python3-pip \
  ffmpeg \
  nginx \
  ufw \
  certbot python3-certbot-nginx

# ── Node.js 20 ────────────────────────────────────────────────────────────────
if ! node --version 2>/dev/null | grep -q "v20"; then
  info "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - -qq
  apt-get install -y -qq nodejs
fi
info "Node.js: $(node --version)"

# ── PM2 ───────────────────────────────────────────────────────────────────────
info "Installing PM2..."
npm install -g pm2 --quiet

# ── App directory ─────────────────────────────────────────────────────────────
info "Setting up app directory at $APP_DIR..."
mkdir -p "$APP_DIR"

# Copy server files (assumes this script is run from the repo's server/ dir,
# OR files are already in $APP_DIR — whichever comes first)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$SCRIPT_DIR" != "$APP_DIR" ]]; then
  info "Copying server files from $SCRIPT_DIR → $APP_DIR"
  cp -r "$SCRIPT_DIR"/. "$APP_DIR/"
fi

cd "$APP_DIR"

# ── Node deps ─────────────────────────────────────────────────────────────────
info "Installing Node.js dependencies..."
npm install --omit=dev

# ── Python venv + Faster Whisper ──────────────────────────────────────────────
info "Creating Python virtual environment..."
python3.11 -m venv venv

info "Installing Python dependencies (this may take a few minutes)..."
venv/bin/pip install --quiet --upgrade pip
venv/bin/pip install --quiet -r requirements.txt

info "Pre-downloading Whisper model '${WHISPER_MODEL}'..."
venv/bin/python -c "
from faster_whisper import WhisperModel
import sys
try:
    print('Downloading model...')
    WhisperModel('${WHISPER_MODEL}', device='cpu', compute_type='int8')
    print('Model downloaded successfully')
except Exception as e:
    print(f'Warning: model download failed: {e}', file=sys.stderr)
"

# ── .env file ─────────────────────────────────────────────────────────────────
info "Writing .env..."
cat > "$APP_DIR/.env" << EOF
PORT=8080
PUSHER_APP_ID=${PUSHER_APP_ID}
PUSHER_KEY=${PUSHER_KEY}
PUSHER_SECRET=${PUSHER_SECRET}
PUSHER_CLUSTER=${PUSHER_CLUSTER}
WHISPER_URL=http://localhost:8001
WHISPER_MODEL=${WHISPER_MODEL}
WHISPER_PORT=8001
EOF
chmod 600 "$APP_DIR/.env"

# ── Patch ecosystem.config.js with correct cwd ────────────────────────────────
sed -i "s|/opt/smq-transcription|${APP_DIR}|g" "$APP_DIR/ecosystem.config.js"

# ── Nginx config ──────────────────────────────────────────────────────────────
info "Configuring Nginx..."
cat > /etc/nginx/sites-available/smq-transcription << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # WebSocket upgrade
    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/smq-transcription /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── Let's Encrypt SSL ─────────────────────────────────────────────────────────
info "Obtaining SSL certificate for ${DOMAIN}..."
warn "Make sure ${DOMAIN} DNS A record already points to this server's IP!"
read -rp "DNS is ready? Press Enter to continue (Ctrl+C to abort)..."

certbot --nginx \
  --non-interactive \
  --agree-tos \
  -m "$EMAIL" \
  -d "$DOMAIN" \
  --redirect

info "SSL certificate installed."

# ── UFW firewall ──────────────────────────────────────────────────────────────
info "Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ── PM2 startup ───────────────────────────────────────────────────────────────
info "Starting services with PM2..."
cd "$APP_DIR"

# Load .env vars into environment for PM2
set -a; source .env; set +a

pm2 start ecosystem.config.js
pm2 save

# Register PM2 to start on boot
PM2_STARTUP=$(pm2 startup systemd -u root --hp /root | tail -1)
eval "$PM2_STARTUP"

# ── Health check ──────────────────────────────────────────────────────────────
info "Waiting for services to start..."
sleep 5

if curl -sf "http://localhost:8080/health" > /dev/null; then
  info "WebSocket server: OK"
else
  warn "WebSocket server health check failed — check: pm2 logs smq-ws"
fi

if curl -sf "http://localhost:8001/health" > /dev/null; then
  info "Whisper service: OK"
else
  warn "Whisper service health check failed — check: pm2 logs smq-whisper"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "  WebSocket URL (set this in Vercel):"
echo -e "  ${YELLOW}TRANSCRIPTION_WS_URL=wss://${DOMAIN}${NC}"
echo ""
echo "  Useful commands:"
echo "    pm2 status          — check service status"
echo "    pm2 logs smq-ws     — WebSocket server logs"
echo "    pm2 logs smq-whisper — Whisper service logs"
echo "    pm2 restart all     — restart both services"
echo ""
echo "  Next step:"
echo "    Go to Vercel → Settings → Environment Variables"
echo "    Set TRANSCRIPTION_WS_URL = wss://${DOMAIN}"
echo "    Redeploy the Vercel project"
echo ""
