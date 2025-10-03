#!/bin/bash

# SSL Setup Script for TecnoAging API on Azure VM
# This script installs and configures SSL with Let's Encrypt and Nginx

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

# Check if domain is provided
if [ -z "$1" ]; then
    print_error "Usage: $0 <domain-name> [email]"
    print_error "Example: $0 api.tecnoaging.com admin@tecnoaging.com"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-"admin@$DOMAIN"}

print_status "Setting up SSL for domain: $DOMAIN"
print_status "Email for Let's Encrypt: $EMAIL"

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Nginx if not already installed
if ! command -v nginx &> /dev/null; then
    print_status "Installing Nginx..."
    sudo apt install nginx -y
    sudo systemctl enable nginx
    sudo systemctl start nginx
    print_success "Nginx installed and started"
else
    print_success "Nginx is already installed"
fi

# Install Certbot
print_status "Installing Certbot..."
sudo apt install certbot python3-certbot-nginx -y
print_success "Certbot installed"

# Create web root directory for ACME challenges
print_status "Creating web root directory..."
sudo mkdir -p /var/www/html
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# Create initial Nginx configuration (HTTP only for ACME challenge)
print_status "Creating initial Nginx configuration..."
sudo tee /etc/nginx/sites-available/tecno-aging-ssl > /dev/null <<EOF
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/tecno-aging-ssl /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
print_status "Testing Nginx configuration..."
sudo nginx -t

# Reload Nginx
print_status "Reloading Nginx..."
sudo systemctl reload nginx

# Obtain SSL certificate
print_status "Obtaining SSL certificate from Let's Encrypt..."
sudo certbot certonly --webroot -w /var/www/html -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive

if [ $? -eq 0 ]; then
    print_success "SSL certificate obtained successfully"
else
    print_error "Failed to obtain SSL certificate"
    exit 1
fi

# Update Nginx configuration with SSL
print_status "Updating Nginx configuration with SSL..."
sudo tee /etc/nginx/sites-available/tecno-aging-ssl > /dev/null <<EOF
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:ECDHE-RSA-DES-CBC3-SHA:EDH-RSA-DES-CBC3-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES256-SHA256:AES128-SHA:AES256-SHA:DES-CBC3-SHA:!DSS;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self';" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Main application proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$server_name;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Health check endpoint (no rate limiting)
    location /status {
        proxy_pass http://localhost:3000/status;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # API documentation (if enabled)
    location /api/docs {
        proxy_pass http://localhost:3000/api/docs;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Logging
    access_log /var/log/nginx/tecno-aging-access.log;
    error_log /var/log/nginx/tecno-aging-error.log;
}
EOF

# Test Nginx configuration
print_status "Testing updated Nginx configuration..."
sudo nginx -t

# Reload Nginx
print_status "Reloading Nginx with SSL configuration..."
sudo systemctl reload nginx

# Setup automatic certificate renewal
print_status "Setting up automatic certificate renewal..."
sudo tee /etc/cron.d/certbot > /dev/null <<EOF
# Renew Let's Encrypt certificates twice daily
0 */12 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
EOF

# Configure firewall
print_status "Configuring firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable

# Test SSL configuration
print_status "Testing SSL configuration..."
sleep 5
if curl -sSf https://$DOMAIN/status > /dev/null 2>&1; then
    print_success "SSL is working correctly!"
else
    print_warning "SSL setup complete, but application may not be running yet."
    print_warning "Make sure your NestJS application is running on port 3000"
fi

print_success "SSL setup completed successfully!"
print_status "Your API is now available at: https://$DOMAIN"
print_status "Certificate will auto-renew every 12 hours"
print_status "Nginx logs are available at: /var/log/nginx/"

# Display next steps
echo ""
print_status "Next steps:"
echo "1. Update your .env file with the correct CORS_ORIGIN for HTTPS"
echo "2. Restart your NestJS application: pm2 restart tecno-aging-api"
echo "3. Test your API: curl https://$DOMAIN/status"
echo ""
print_status "To monitor SSL certificate expiration:"
echo "sudo certbot certificates"
echo ""
print_status "To check Nginx status:"
echo "sudo systemctl status nginx"
echo ""
print_status "To view Nginx logs:"
echo "sudo tail -f /var/log/nginx/tecno-aging-access.log"
echo "sudo tail -f /var/log/nginx/tecno-aging-error.log"
