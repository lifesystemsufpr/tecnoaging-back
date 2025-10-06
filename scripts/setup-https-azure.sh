#!/bin/bash

# HTTPS Setup Script for Azure VM
# This script sets up SSL certificates using Let's Encrypt

set -e

echo "🔐 Setting up HTTPS/SSL for TecnoAging Backend on Azure VM"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="20.201.114.238"  # Your Azure VM IP
EMAIL="your-email@example.com"  # Change this to your email
APP_DIR="/home/azureuser/tecnoaging-back"
NGINX_DIR="/etc/nginx"
SSL_DIR="/etc/ssl/certs"
SSL_KEY_DIR="/etc/ssl/private"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "App Directory: $APP_DIR"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run this script as root or with sudo${NC}"
    exit 1
fi

# Update system packages
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Install required packages
echo -e "${YELLOW}📦 Installing required packages...${NC}"
apt install -y nginx certbot python3-certbot-nginx openssl

# Create SSL directories
echo -e "${YELLOW}📁 Creating SSL directories...${NC}"
mkdir -p $SSL_DIR
mkdir -p $SSL_KEY_DIR
chmod 700 $SSL_KEY_DIR

# Generate self-signed certificate (temporary)
echo -e "${YELLOW}🔑 Generating self-signed certificate...${NC}"
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout $SSL_KEY_DIR/tecno-aging.key \
    -out $SSL_DIR/tecno-aging.crt \
    -subj "/C=BR/ST=State/L=City/O=Organization/CN=$DOMAIN"

# Set proper permissions
chmod 600 $SSL_KEY_DIR/tecno-aging.key
chmod 644 $SSL_DIR/tecno-aging.crt

# Create Nginx configuration
echo -e "${YELLOW}⚙️  Creating Nginx configuration...${NC}"
cat > $NGINX_DIR/sites-available/tecno-aging-ssl << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL Configuration
    ssl_certificate $SSL_DIR/tecno-aging.crt;
    ssl_certificate_key $SSL_KEY_DIR/tecno-aging.key;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # CORS Headers
    add_header Access-Control-Allow-Origin "https://tecnoaging-front.vercel.app" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials "true" always;

    # Handle preflight requests
    location / {
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://tecnoaging-front.vercel.app";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With";
            add_header Access-Control-Allow-Credentials "true";
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type "text/plain; charset=utf-8";
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
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
echo -e "${YELLOW}🔗 Enabling Nginx site...${NC}"
ln -sf $NGINX_DIR/sites-available/tecno-aging-ssl $NGINX_DIR/sites-enabled/

# Remove default site
rm -f $NGINX_DIR/sites-enabled/default

# Test Nginx configuration
echo -e "${YELLOW}🧪 Testing Nginx configuration...${NC}"
nginx -t

# Start and enable services
echo -e "${YELLOW}🚀 Starting services...${NC}"
systemctl enable nginx
systemctl restart nginx
systemctl enable pm2-azureuser
systemctl restart pm2-azureuser

# Configure firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Create environment file
echo -e "${YELLOW}📝 Creating production environment file...${NC}"
cat > $APP_DIR/.env << EOF
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/tecno_aging_db"

# JWT Configuration
JWT_SECRET="$(openssl rand -base64 32)"

# Application Configuration
PORT=3000
NODE_ENV=production

# HTTPS Configuration
HTTPS_ENABLED=true
SSL_KEY_PATH=$SSL_KEY_DIR/tecno-aging.key
SSL_CERT_PATH=$SSL_DIR/tecno-aging.crt

# CORS Configuration
CORS_ORIGIN="https://tecnoaging-front.vercel.app"

# API Configuration
API_PREFIX="backend"
API_VERSION="v1"

# Logging Configuration
LOG_LEVEL="info"

# Security Configuration
BCRYPT_ROUNDS=12

# Swagger Configuration (disabled in production)
SWAGGER_ENABLED=false

# Health Check Configuration
HEALTH_CHECK_TIMEOUT=5000
HEALTH_HEAP_LIMIT_MB=200
HEALTH_RSS_LIMIT_MB=300
EOF

echo -e "${GREEN}✅ HTTPS setup completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Update your database credentials in $APP_DIR/.env"
echo "2. Restart your application: pm2 restart all"
echo "3. Test the connection: curl -k https://$DOMAIN/health"
echo ""
echo -e "${YELLOW}🔗 Your API endpoints:${NC}"
echo "• Health Check: https://$DOMAIN/health"
echo "• Login: https://$DOMAIN/backend/auth/login"
echo "• API Base: https://$DOMAIN/backend"
echo ""
echo -e "${YELLOW}⚠️  Note: This uses a self-signed certificate.${NC}"
echo "For production, consider using Let's Encrypt with a proper domain name."
