#!/bin/bash

# ============================================
# AI Travel Planner - Backup Script
# ============================================

set -e

PROJECT_NAME="ai-planner"
BACKUP_DIR="/opt/${PROJECT_NAME}/backups"
RETENTION_DAYS=7

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

# Create backup directory
mkdir -p $BACKUP_DIR

# ============================================
# Step 1: Database Backup (RDS)
# ============================================
backup_database() {
    log "Starting database backup..."
    
    # Get RDS endpoint from environment or use default
    DB_HOST="${DATABASE_URL%%:*}"
    DB_HOST="${DB_HOST#*@}"
    DB_NAME="ai_planner"
    
    # Create backup filename
    BACKUP_FILE="${BACKUP_DIR}/db_${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql.gz"
    
    # Check if DATABASE_URL is set
    if [ -z "$DATABASE_URL" ]; then
        log "DATABASE_URL not set, skipping database backup"
        return 0
    fi
    
    # Run pg_dump (if running locally or have direct access)
    if command -v pg_dump &> /dev/null; then
        # Try to connect to database and backup
        if PGPASSWORD="${DB_PASSWORD}" pg_dump -h "$DB_HOST" -U planner_admin -d "$DB_NAME" | gzip > "$BACKUP_FILE" 2>/dev/null; then
            log "Database backup created: $BACKUP_FILE"
            
            # Get file size
            SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
            log "Backup size: $SIZE"
        else
            error "Failed to backup database"
            return 1
        fi
    else
        log "pg_dump not available, skipping database backup"
    fi
}

# ============================================
# Step 2: Application Configuration Backup
# ============================================
backup_config() {
    log "Starting configuration backup..."
    
    CONFIG_BACKUP="${BACKUP_DIR}/config_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    # Backup important config files (exclude secrets)
    tar -czf "$CONFIG_BACKUP" \
        --exclude='*.env' \
        --exclude='*.pem' \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='dist' \
        /opt/${PROJECT_NAME}/*.{yml,yaml,json,conf} \
        /opt/${PROJECT_NAME}/nginx/ \
        /opt/${PROJECT_NAME}/scripts/ \
        2>/dev/null || true
    
    if [ -f "$CONFIG_BACKUP" ]; then
        log "Configuration backup created: $CONFIG_BACKUP"
    fi
}

# ============================================
# Step 3: Docker Volumes Backup (if any)
# ============================================
backup_volumes() {
    log "Checking for Docker volumes..."
    
    # List of important volumes
    VOLUMES=$(docker volume ls --format '{{.Name}}' | grep "${PROJECT_NAME}" || true)
    
    if [ -n "$VOLUMES" ]; then
        log "Found volumes: $VOLUMES"
        # For each volume, create a backup
        for VOLUME in $VOLUMES; do
            VOLUME_BACKUP="${BACKUP_DIR}/volume_${VOLUME}_$(date +%Y%m%d_%H%M%S).tar.gz"
            
            # Create temporary container to backup volume
            docker run --rm \
                -v ${VOLUME}:/volume \
                -v ${BACKUP_DIR}:/backup \
                alpine \
                tar czf "/backup/volume_backup_${VOLUME}.tar.gz" -C /volume . 2>/dev/null || true
            
            if [ -f "/backup/volume_backup_${VOLUME}.tar.gz" ]; then
                log "Volume backup created: volume_backup_${VOLUME}.tar.gz"
            fi
        done
    else
        log "No project volumes found"
    fi
}

# ============================================
# Step 4: Clean old backups
# ============================================
cleanup_old_backups() {
    log "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
    
    # Find and delete old backup files
    find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find $BACKUP_DIR -name "*.zip" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    log "Cleanup completed"
}

# ============================================
# Step 5: List current backups
# ============================================
list_backups() {
    log "Current backups:"
    
    echo ""
    echo "Database backups:"
    ls -lh $BACKUP_DIR/db_*.sql.gz 2>/dev/null || echo "  None"
    
    echo ""
    echo "Configuration backups:"
    ls -lh $BACKUP_DIR/config_*.tar.gz 2>/dev/null || echo "  None"
    
    echo ""
    echo "Volume backups:"
    ls -lh $BACKUP_DIR/volume_*.tar.gz 2>/dev/null || echo "  None"
    
    echo ""
    TOTAL_SIZE=$(du -sh $BACKUP_DIR 2>/dev/null | cut -f1 || echo "0")
    echo "Total backup size: $TOTAL_SIZE"
}

# ============================================
# Main function
# ============================================
main() {
    log "==========================================="
    log "AI Travel Planner - Backup Script"
    log "==========================================="
    
    # Create timestamp
    TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
    log "Backup started at: $TIMESTAMP"
    
    # Run backup tasks
    backup_database
    backup_config
    backup_volumes
    cleanup_old_backups
    
    # List current backups
    list_backups
    
    log "==========================================="
    log "Backup completed successfully!"
    log "==========================================="
}

# Parse arguments
case "$1" in
    list)
        list_backups
        ;;
    clean)
        cleanup_old_backups
        ;;
    *)
        main
        ;;
esac
