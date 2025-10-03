#!/bin/bash

# SSL Certificate Renewal Script for TecnoAging API
# This script handles SSL certificate renewal and post-renewal actions

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

# Log file
LOG_FILE="/var/log/ssl-renewal.log"

# Function to log with timestamp
log_with_timestamp() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to check if certificate needs renewal
check_certificate_expiry() {
    local domain=$1
    local cert_file="/etc/letsencrypt/live/$domain/cert.pem"
    
    if [ ! -f "$cert_file" ]; then
        print_error "Certificate file not found: $cert_file"
        return 1
    fi
    
    local expiry_date=$(openssl x509 -in "$cert_file" -noout -dates | grep "notAfter" | cut -d= -f2)
    local expiry_timestamp=$(date -d "$expiry_date" +%s)
    local current_timestamp=$(date +%s)
    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
    
    log_with_timestamp "Certificate for $domain expires in $days_until_expiry days"
    
    if [ $days_until_expiry -lt 30 ]; then
        print_warning "Certificate expires in $days_until_expiry days - renewal recommended"
        return 0
    else
        print_status "Certificate is valid for $days_until_expiry more days"
        return 1
    fi
}

# Function to renew certificate
renew_certificate() {
    local domain=$1
    
    print_status "Attempting to renew certificate for $domain..."
    log_with_timestamp "Starting certificate renewal for $domain"
    
    # Test renewal first
    if sudo certbot renew --dry-run --cert-name "$domain" > /dev/null 2>&1; then
        print_status "Dry run successful, proceeding with actual renewal..."
        
        # Perform actual renewal
        if sudo certbot renew --cert-name "$domain" --quiet; then
            print_success "Certificate renewed successfully for $domain"
            log_with_timestamp "Certificate renewed successfully for $domain"
            return 0
        else
            print_error "Certificate renewal failed for $domain"
            log_with_timestamp "Certificate renewal failed for $domain"
            return 1
        fi
    else
        print_error "Dry run failed for $domain - skipping renewal"
        log_with_timestamp "Dry run failed for $domain - skipping renewal"
        return 1
    fi
}

# Function to reload Nginx
reload_nginx() {
    print_status "Reloading Nginx configuration..."
    
    if sudo nginx -t; then
        if sudo systemctl reload nginx; then
            print_success "Nginx reloaded successfully"
            log_with_timestamp "Nginx reloaded successfully"
            return 0
        else
            print_error "Failed to reload Nginx"
            log_with_timestamp "Failed to reload Nginx"
            return 1
        fi
    else
        print_error "Nginx configuration test failed"
        log_with_timestamp "Nginx configuration test failed"
        return 1
    fi
}

# Function to restart application
restart_application() {
    print_status "Restarting TecnoAging API..."
    
    if command -v pm2 &> /dev/null; then
        if pm2 restart tecno-aging-api; then
            print_success "TecnoAging API restarted successfully"
            log_with_timestamp "TecnoAging API restarted successfully"
            return 0
        else
            print_warning "Failed to restart TecnoAging API via PM2"
            log_with_timestamp "Failed to restart TecnoAging API via PM2"
            return 1
        fi
    else
        print_warning "PM2 not found, skipping application restart"
        log_with_timestamp "PM2 not found, skipping application restart"
        return 1
    fi
}

# Function to test SSL endpoint
test_ssl_endpoint() {
    local domain=$1
    
    print_status "Testing SSL endpoint for $domain..."
    
    if curl -sSf "https://$domain/status" > /dev/null 2>&1; then
        print_success "SSL endpoint is working correctly"
        log_with_timestamp "SSL endpoint test passed for $domain"
        return 0
    else
        print_error "SSL endpoint test failed for $domain"
        log_with_timestamp "SSL endpoint test failed for $domain"
        return 1
    fi
}

# Function to send notification (if configured)
send_notification() {
    local message=$1
    local status=$2
    
    # Add notification logic here (email, Slack, etc.)
    # Example for email notification:
    # echo "$message" | mail -s "SSL Renewal $status" admin@yourdomain.com
    
    log_with_timestamp "Notification: $message"
}

# Main function
main() {
    local domain=${1:-"your-domain.com"}
    local force_renewal=${2:-false}
    
    print_status "Starting SSL renewal process for $domain"
    log_with_timestamp "SSL renewal process started for $domain"
    
    # Check if running as root or with sudo
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root - this script should typically run as a regular user with sudo privileges"
    fi
    
    # Check certificate expiry
    if [ "$force_renewal" = true ] || check_certificate_expiry "$domain"; then
        # Attempt renewal
        if renew_certificate "$domain"; then
            # Reload Nginx
            if reload_nginx; then
                # Restart application
                restart_application
                
                # Test endpoint
                if test_ssl_endpoint "$domain"; then
                    print_success "SSL renewal process completed successfully"
                    send_notification "SSL certificate renewed successfully for $domain" "SUCCESS"
                    log_with_timestamp "SSL renewal process completed successfully for $domain"
                    exit 0
                else
                    print_error "SSL endpoint test failed after renewal"
                    send_notification "SSL renewal completed but endpoint test failed for $domain" "WARNING"
                    log_with_timestamp "SSL endpoint test failed after renewal for $domain"
                    exit 1
                fi
            else
                print_error "Failed to reload Nginx after certificate renewal"
                send_notification "SSL certificate renewed but Nginx reload failed for $domain" "ERROR"
                log_with_timestamp "Failed to reload Nginx after certificate renewal for $domain"
                exit 1
            fi
        else
            print_error "Certificate renewal failed"
            send_notification "SSL certificate renewal failed for $domain" "ERROR"
            log_with_timestamp "Certificate renewal failed for $domain"
            exit 1
        fi
    else
        print_status "Certificate does not need renewal"
        log_with_timestamp "Certificate does not need renewal for $domain"
        exit 0
    fi
}

# Show usage if no arguments provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <domain> [force]"
    echo "Example: $0 api.tecnoaging.com"
    echo "Example: $0 api.tecnoaging.com force"
    echo ""
    echo "This script will:"
    echo "1. Check if the SSL certificate needs renewal"
    echo "2. Renew the certificate if needed (or if forced)"
    echo "3. Reload Nginx configuration"
    echo "4. Restart the TecnoAging API"
    echo "5. Test the SSL endpoint"
    echo "6. Log all actions to $LOG_FILE"
    exit 1
fi

# Run main function
main "$@"
