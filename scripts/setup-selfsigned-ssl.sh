#!/bin/bash

# Self-signed SSL setup for TecnoAging API using an IP address (SAN)
# Usage: ./scripts/setup-selfsigned-ssl.sh <PUBLIC_IP>

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
ok() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1"; }

if [ -z "$1" ]; then
  err "Usage: $0 <PUBLIC_IP>"
  exit 1
fi

PUBLIC_IP="$1"

info "Configuring self-signed SSL for IP: ${PUBLIC_IP}"

# Ensure required packages
info "Installing required packages (nginx, openssl)..."
sudo apt update -y
sudo apt install -y nginx openssl
sudo systemctl enable nginx
sudo systemctl start nginx

# Create certificate directory
SSL_DIR="/etc/ssl/tecnoaging"
sudo mkdir -p "$SSL_DIR"

# Generate OpenSSL config with IP SAN
OPENSSL_CFG="/tmp/openssl-selfsigned-${PUBLIC_IP}.cnf"
cat > "$OPENSSL_CFG" <<EOF
[ req ]
default_bits       = 2048
prompt             = no
default_md         = sha256
req_extensions     = req_ext
distinguished_name = dn

[ dn ]
C  = BR
ST = SP
L  = SaoPaulo
O  = TecnoAging
OU = IT
CN = ${PUBLIC_IP}

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
IP.1 = ${PUBLIC_IP}
EOF

info "Generating self-signed certificate (valid 365 days)..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "${SSL_DIR}/tecnoaging.key" \
  -out "${SSL_DIR}/tecnoaging.crt" \
  -config "$OPENSSL_CFG" -extensions req_ext >/dev/null 2>&1

sudo chmod 600 "${SSL_DIR}/tecnoaging.key"
sudo chmod 644 "${SSL_DIR}/tecnoaging.crt"
ok "Certificate generated: ${SSL_DIR}/tecnoaging.crt"

# Create Nginx site config for self-signed cert
NGINX_SITE="/etc/nginx/sites-available/tecno-aging-selfsigned"
info "Creating Nginx config at ${NGINX_SITE}..."
sudo tee "$NGINX_SITE" >/dev/null <<NGINX
server {
    listen 80;
    server_name ${PUBLIC_IP};
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${PUBLIC_IP};

    ssl_certificate ${SSL_DIR}/tecnoaging.crt;
    ssl_certificate_key ${SSL_DIR}/tecnoaging.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;

    # API proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health endpoint
    location /status {
        proxy_pass http://localhost:3000/status;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    access_log /var/log/nginx/tecno-aging-access.log;
    error_log /var/log/nginx/tecno-aging-error.log;
}
NGINX

# Enable site
sudo ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/tecno-aging-selfsigned
sudo rm -f /etc/nginx/sites-enabled/default || true

info "Testing and reloading Nginx..."
sudo nginx -t
sudo systemctl reload nginx

# UFW rules
if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow 'Nginx Full' || true
  sudo ufw allow OpenSSH || true
fi

ok "Self-signed SSL configured for https://${PUBLIC_IP}"
echo ""
info "Next steps:"
echo "1) Update your .env CORS_ORIGIN=\"https://${PUBLIC_IP}\""
echo "2) Restart API: pm2 restart tecno-aging-api"
echo "3) Access: https://${PUBLIC_IP}/status (browser will warn due to self-signed cert)"


