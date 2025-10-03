#!/bin/bash

# SSL Cron Setup Script for TecnoAging API
# This script sets up automatic SSL certificate renewal via cron

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

# Check if domain is provided
if [ -z "$1" ]; then
    print_error "Usage: $0 <domain-name>"
    print_error "Example: $0 api.tecnoaging.com"
    exit 1
fi

DOMAIN=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RENEWAL_SCRIPT="$SCRIPT_DIR/ssl-renewal.sh"

print_status "Setting up SSL renewal cron job for domain: $DOMAIN"

# Check if renewal script exists
if [ ! -f "$RENEWAL_SCRIPT" ]; then
    print_error "SSL renewal script not found: $RENEWAL_SCRIPT"
    exit 1
fi

# Make renewal script executable
chmod +x "$RENEWAL_SCRIPT"
print_success "SSL renewal script made executable"

# Create log directory
sudo mkdir -p /var/log
sudo touch /var/log/ssl-renewal.log
sudo chown $USER:$USER /var/log/ssl-renewal.log
print_success "SSL renewal log file created"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "ssl-renewal.sh"; then
    print_warning "SSL renewal cron job already exists"
    print_status "Current cron jobs:"
    crontab -l | grep "ssl-renewal.sh"
    
    read -p "Do you want to replace the existing cron job? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Keeping existing cron job"
        exit 0
    fi
fi

# Create temporary cron file
TEMP_CRON=$(mktemp)

# Get existing cron jobs (excluding SSL renewal)
(crontab -l 2>/dev/null | grep -v "ssl-renewal.sh") > "$TEMP_CRON" || true

# Add SSL renewal cron job
cat >> "$TEMP_CRON" << EOF

# SSL Certificate Renewal for $DOMAIN
# Runs twice daily at 2:00 AM and 2:00 PM
0 2,14 * * * $RENEWAL_SCRIPT $DOMAIN >> /var/log/ssl-renewal.log 2>&1

# SSL Certificate Renewal Check (weekly)
# Runs every Sunday at 3:00 AM
0 3 * * 0 $RENEWAL_SCRIPT $DOMAIN >> /var/log/ssl-renewal.log 2>&1
EOF

# Install the new cron job
crontab "$TEMP_CRON"
rm "$TEMP_CRON"

print_success "SSL renewal cron job installed successfully"

# Show the installed cron jobs
print_status "Current SSL-related cron jobs:"
crontab -l | grep -A 2 -B 1 "ssl-renewal.sh"

# Test the renewal script
print_status "Testing SSL renewal script..."
if "$RENEWAL_SCRIPT" "$DOMAIN"; then
    print_success "SSL renewal script test passed"
else
    print_warning "SSL renewal script test had issues (this is normal if certificate doesn't need renewal)"
fi

print_success "SSL cron setup completed successfully!"
print_status "SSL certificates will be automatically renewed:"
print_status "- Twice daily at 2:00 AM and 2:00 PM"
print_status "- Weekly check every Sunday at 3:00 AM"
print_status "- Logs are written to: /var/log/ssl-renewal.log"

# Display next steps
echo ""
print_status "Next steps:"
echo "1. Monitor the SSL renewal logs: tail -f /var/log/ssl-renewal.log"
echo "2. Test manual renewal: $RENEWAL_SCRIPT $DOMAIN force"
echo "3. Check certificate status: sudo certbot certificates"
echo "4. View cron jobs: crontab -l"
echo ""
print_status "To remove the SSL renewal cron job:"
echo "crontab -e"
echo "# Then delete the lines containing 'ssl-renewal.sh'"
