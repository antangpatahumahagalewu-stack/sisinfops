#!/bin/bash
# Redis Backup Script
# Backup Redis database to S3 with encryption
# Usage: ./redis-backup.sh [daily|weekly|monthly]

set -euo pipefail

# Configuration
BACKUP_TYPE="${1:-daily}"
BACKUP_ID="redis-backup-$(date +%Y%m%d-%H%M%S)-${BACKUP_TYPE}"
BACKUP_DIR="/tmp/redis-backups"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_ID}.rdb"
ENCRYPTED_FILE="${BACKUP_FILE}.enc"
LOG_FILE="/var/log/redis-backup.log"

# Load environment variables
if [ -f /etc/redis-backup.env ]; then
    source /etc/redis-backup.env
fi

# Required environment variables
: "${REDIS_PASSWORD:?REDIS_PASSWORD environment variable is required}"
: "${ENCRYPTION_KEY:?ENCRYPTION_KEY environment variable is required}"
: "${S3_BUCKET:?S3_BUCKET environment variable is required}"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Error handler
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Check Redis connection
check_redis() {
    if ! redis-cli -a "$REDIS_PASSWORD" ping | grep -q "PONG"; then
        error_exit "Redis is not responding"
    fi
    log "Redis connection verified"
}

# Perform backup
perform_backup() {
    log "Starting Redis backup: $BACKUP_ID"
    
    # Trigger background save
    log "Triggering BGSAVE..."
    if ! redis-cli -a "$REDIS_PASSWORD" BGSAVE; then
        error_exit "Failed to trigger BGSAVE"
    fi
    
    # Wait for backup completion (max 5 minutes)
    log "Waiting for BGSAVE completion..."
    local timeout=300
    local start_time=$(date +%s)
    
    while true; do
        local bgsave_status=$(redis-cli -a "$REDIS_PASSWORD" info persistence | grep "rdb_bgsave_in_progress" | cut -d: -f2)
        
        if [ "$bgsave_status" = "0" ]; then
            log "BGSAVE completed successfully"
            break
        fi
        
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -ge $timeout ]; then
            error_exit "BGSAVE timeout after 5 minutes"
        fi
        
        sleep 5
    done
    
    # Get Redis data directory
    local redis_dir=$(redis-cli -a "$REDIS_PASSWORD" config get dir | tail -n 1)
    local dump_file="${redis_dir}/dump.rdb"
    
    if [ ! -f "$dump_file" ]; then
        error_exit "Backup file not found: $dump_file"
    fi
    
    # Copy backup file
    log "Copying backup file..."
    cp "$dump_file" "$BACKUP_FILE"
    
    # Verify backup file
    local backup_size=$(stat -c%s "$BACKUP_FILE")
    if [ "$backup_size" -lt 1000 ]; then
        error_exit "Backup file seems too small: $backup_size bytes"
    fi
    
    log "Backup file created: $BACKUP_FILE ($backup_size bytes)"
}

# Encrypt backup
encrypt_backup() {
    log "Encrypting backup with AES-256-CBC..."
    
    if ! openssl enc -aes-256-cbc -salt -in "$BACKUP_FILE" -out "$ENCRYPTED_FILE" -pass pass:"$ENCRYPTION_KEY"; then
        error_exit "Failed to encrypt backup"
    fi
    
    local encrypted_size=$(stat -c%s "$ENCRYPTED_FILE")
    log "Backup encrypted: $ENCRYPTED_FILE ($encrypted_size bytes)"
}

# Upload to S3
upload_to_s3() {
    log "Uploading to S3 bucket: $S3_BUCKET"
    
    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        error_exit "AWS CLI is not installed"
    fi
    
    # Upload to S3
    local s3_path="s3://${S3_BUCKET}/redis-backups/${BACKUP_TYPE}/${BACKUP_ID}.enc"
    if ! aws s3 cp "$ENCRYPTED_FILE" "$s3_path"; then
        error_exit "Failed to upload to S3"
    fi
    
    log "Backup uploaded to S3: $s3_path"
}

# Rotate old backups
rotate_backups() {
    log "Rotating old backups (keeping last 30 days)..."
    
    # Calculate cutoff date (30 days ago)
    local cutoff_date=$(date -d "30 days ago" +%Y-%m-%d)
    
    # List and delete old backups
    aws s3 ls "s3://${S3_BUCKET}/redis-backups/${BACKUP_TYPE}/" | while read -r line; do
        local date=$(echo "$line" | awk '{print $1}')
        local file=$(echo "$line" | awk '{print $4}')
        
        if [[ "$date" < "$cutoff_date" ]]; then
            log "Deleting old backup: $file"
            aws s3 rm "s3://${S3_BUCKET}/redis-backups/${BACKUP_TYPE}/$file" || true
        fi
    done
}

# Cleanup temporary files
cleanup() {
    log "Cleaning up temporary files..."
    rm -f "$BACKUP_FILE" "$ENCRYPTED_FILE"
    
    # Remove empty backup directory
    rmdir "$BACKUP_DIR" 2>/dev/null || true
}

# Main execution
main() {
    log "=== Redis Backup Started ==="
    log "Backup Type: $BACKUP_TYPE"
    log "Backup ID: $BACKUP_ID"
    
    # Check prerequisites
    check_redis
    
    # Perform backup steps
    perform_backup
    encrypt_backup
    upload_to_s3
    rotate_backups
    
    # Cleanup
    cleanup
    
    log "=== Redis Backup Completed Successfully ==="
    log "Backup Summary:"
    log "  - ID: $BACKUP_ID"
    log "  - Type: $BACKUP_TYPE"
    log "  - S3 Location: s3://${S3_BUCKET}/redis-backups/${BACKUP_TYPE}/"
    log "  - Timestamp: $(date)"
}

# Run main function
main

# Exit with success
exit 0