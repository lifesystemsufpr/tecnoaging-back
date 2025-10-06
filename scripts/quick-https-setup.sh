#!/bin/bash

# Quick HTTPS Setup for Azure VM
# This script sets up a basic HTTPS configuration for immediate testing

set -e

echo "🚀 Quick HTTPS Setup for TecnoAging Backend"

# Configuration
DOMAIN="20.201.114.238"
APP_DIR="/home/azureuser/tecnoaging-back"
SSL_DIR="/etc/ssl/certs"
SSL_KEY_DIR="/etc/ssl/private"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}📋 Setting up HTTPS for domain: $DOMAIN${NC}"

# Install nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo "Installing nginx..."
    sudo apt update && sudo apt install -y nginx
fi

# Create SSL directories
sudo mkdir -p $SSL_DIR $SSL_KEY_DIR
sudo chmod 700 $SSL_KEY_DIR

# Generate self-signed certificate
echo "Generating self-signed certificate..."
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout $SSL_KEY_DIR/tecno-aging.key \
    -out $SSL_DIR/tecno-aging.crt \
    -subj "/C=BR/ST=State/L=City/O=TecnoAging/CN=$DOMAIN"

# Set permissions
sudo chmod 600 $SSL_KEY_DIR/tecno-aging.key
sudo chmod 644 $SSL_DIR/tecno-aging.crt

# Create nginx config
echo "Creating nginx configuration..."
sudo tee /etc/nginx/sites-available/tecno-aging-ssl > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate $SSL_DIR/tecno-aging.crt;
    ssl_certificate_key $SSL_KEY_DIR/tecno-aging.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    # CORS Headers
    add_header Access-Control-Allow-Origin "https://tecnoaging-front.vercel.app" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials "true" always;

    location / {
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://tecnoaging-front.vercel.app";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With";
            add_header Access-Control-Allow-Credentials "true";
            add_header Content-Length 0;
            return 204;
        }

        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/tecno-aging-ssl /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart nginx
sudo nginx -t && sudo systemctl restart nginx

# Configure firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

echo -e "${GREEN}✅ HTTPS setup completed!${NC}"
echo ""
echo "🔗 Your API is now available at:"
echo "• https://$DOMAIN/backend/auth/login"
echo "• https://$DOMAIN/health"
echo ""
echo "⚠️  Note: This uses a self-signed certificate."
echo "Browsers will show a security warning - this is normal for testing."
