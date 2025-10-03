# Production Deployment Guide

This guide explains how to deploy the TecnoAging NestJS application to production directly on an Azure VM.

## 🚀 Quick Start

### Prerequisites

- Azure VM with Ubuntu 20.04+ or similar Linux distribution
- Node.js 18+ installed
- PostgreSQL database (can be on same VM or external)
- PM2 for process management
- Nginx for reverse proxy (optional but recommended)
- Environment variables configured

### 1. VM Setup

#### Install Node.js
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### Install PM2
```bash
sudo npm install -g pm2
```

#### Install PostgreSQL (if using local database)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### 2. Application Deployment

#### Clone and Setup
```bash
# Clone your repository
git clone <your-repo-url>
cd backend

# Install dependencies
npm install

# Build the application
npm run build
```

#### Environment Configuration
Create `.env` file with your production values:

```bash
cp env.example .env
```

Edit `.env` with your values:
- `DATABASE_URL`: Your PostgreSQL connection string
- `JWT_SECRET`: A secure random string for JWT signing
- `CORS_ORIGIN`: Your frontend domain
- `PORT`: Port for the application (default: 3000)
- Other configuration as needed

### 3. Database Setup

#### Run Migrations
```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run migrate:deploy

# Seed the database (optional)
npm run prisma:seed
```

### 4. Process Management with PM2

#### Create PM2 Ecosystem File
Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'tecno-aging-api',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

#### Start Application
```bash
# Create logs directory
mkdir logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 5. Nginx Configuration (Optional)

#### Install Nginx
```bash
sudo apt install nginx
```

#### Create Nginx Configuration
Create `/etc/nginx/sites-available/tecno-aging`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/tecno-aging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Health Checks

The application includes built-in health checks:

- **Endpoint**: `GET /status`
- **Monitoring**: Memory usage (heap and RSS)
- **PM2 monitoring**: `pm2 monit`

### 7. Security Best Practices

#### Firewall Configuration
```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

#### SSL Certificate (with Let's Encrypt)

**Option 1: Automated Setup (Recommended)**
```bash
# Make the SSL setup script executable
chmod +x scripts/setup-ssl.sh

# Run the SSL setup script
./scripts/setup-ssl.sh your-domain.com your-email@example.com
```

**Option 2: Manual Setup**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Create initial Nginx configuration for ACME challenge
sudo cp nginx/tecno-aging-ssl.conf /etc/nginx/sites-available/tecno-aging-ssl
sudo sed -i 's/your-domain.com/your-actual-domain.com/g' /etc/nginx/sites-available/tecno-aging-ssl

# Enable the site
sudo ln -s /etc/nginx/sites-available/tecno-aging-ssl /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Setup automatic renewal
sudo crontab -e
# Add this line:
# 0 */12 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

### 8. SSL Configuration and Management

#### Update Environment Variables for HTTPS
After setting up SSL, update your `.env` file:

```bash
# Update CORS origin to use HTTPS
CORS_ORIGIN="https://your-domain.com"

# Optional: Enable direct HTTPS in NestJS (not recommended with Nginx)
HTTPS_ENABLED=false
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem
```

#### SSL Certificate Management
```bash
# Check certificate status
sudo certbot certificates

# Test certificate renewal
sudo certbot renew --dry-run

# Force certificate renewal
sudo certbot renew --force-renewal

# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout | grep "Not After"

# View Nginx SSL configuration
sudo nginx -T | grep -A 20 -B 5 ssl
```

#### Self-signed SSL (using public IP)

Use this for testing or when you don't have a domain. Browsers will show a security warning.

```bash
# Generate and configure self-signed SSL for your VM public IP
chmod +x scripts/setup-selfsigned-ssl.sh
./scripts/setup-selfsigned-ssl.sh 20.201.114.238

# Update CORS to use HTTPS with IP
sed -i 's|CORS_ORIGIN=.*|CORS_ORIGIN="https://20.201.114.238"|g' .env || true

# Restart API
pm2 restart tecno-aging-api
```

Optional: you can use the reference Nginx file `nginx/tecno-aging-selfsigned.conf` and adjust the IP if needed.

#### SSL Troubleshooting
```bash
# Check SSL configuration
sudo nginx -t

# View SSL logs
sudo tail -f /var/log/nginx/tecno-aging-error.log

# Test SSL connection
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check SSL rating (external tool)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
```

### 9. Common Commands

```bash
# Check application status
pm2 status

# View logs
pm2 logs tecno-aging-api

# Restart application
pm2 restart tecno-aging-api

# Stop application
pm2 stop tecno-aging-api

# Monitor resources
pm2 monit

# Check health status
curl http://localhost:3000/status

# Update application
git pull
npm install
npm run build
pm2 restart tecno-aging-api
```

### 10. Backup and Maintenance

#### Database Backup
```bash
# Create backup script
#!/bin/bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Log Rotation
```bash
# Install logrotate
sudo apt install logrotate

# Create logrotate configuration for PM2 logs
```

### 11. Monitoring and Alerts

Consider setting up:
- Application monitoring (New Relic, DataDog, etc.)
- Server monitoring (Azure Monitor, Nagios, etc.)
- Log aggregation (ELK Stack, Splunk, etc.)
- Uptime monitoring (Pingdom, UptimeRobot, etc.)
