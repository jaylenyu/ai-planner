#!/bin/bash

# ============================================
# AI Travel Planner - Monitoring Script
# ============================================

set -e

PROJECT_NAME="ai-planner"
ALERT_EMAIL="admin@date-planner.us"

# Thresholds
MEMORY_THRESHOLD=85  # %
DISK_THRESHOLD=80    # %
CPU_THRESHOLD=90     # %

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

alert() {
    echo -e "${RED}[ALERT] $1${NC}" >&2
    echo "[$(date)] ALERT: $1" >> /var/log/${PROJECT_NAME}-alerts.log
    # Send email (requires mailutils or similar)
    # echo "$1" | mail -s "${PROJECT_NAME} Alert" $ALERT_EMAIL
}

# Check memory usage
check_memory() {
    MEM_USED=$(free | awk '/^Mem:/ {printf "%.0f", $3/$2 * 100}')
    MEM_AVAILABLE=$(free -h | awk '/^Mem:/ {print $7}')
    
    if [ "$MEM_USED" -gt "$MEMORY_THRESHOLD" ]; then
        alert "Memory usage is ${MEM_USED}% (threshold: ${MEMORY_THRESHOLD}%). Available: ${MEM_AVAILABLE}"
        return 1
    else
        log "Memory: ${MEM_USED}% used, ${MEM_AVAILABLE} available"
    fi
}

# Check disk usage
check_disk() {
    DISK_USED=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$DISK_USED" -gt "$DISK_THRESHOLD" ]; then
        alert "Disk usage is ${DISK_USED}% (threshold: ${DISK_THRESHOLD}%)"
        return 1
    else
        log "Disk: ${DISK_USED}% used"
    fi
}

# Check CPU usage
check_cpu() {
    CPU_USED=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print int(100 - $1)}')
    
    if [ "$CPU_USED" -gt "$CPU_THRESHOLD" ]; then
        alert "CPU usage is ${CPU_USED}% (threshold: ${CPU_THRESHOLD}%)"
        return 1
    else
        log "CPU: ${CPU_USED}% used"
    fi
}

# Check Docker containers
check_containers() {
    RUNNING=$(docker ps --format '{{.Names}}' | wc -l)
    TOTAL=$(docker ps -a --format '{{.Names}}' | wc -l)
    
    if [ "$RUNNING" -eq 0 ]; then
        alert "No Docker containers running!"
        return 1
    else
        log "Docker: $RUNNING/$TOTAL containers running"
    fi
    
    # Check container health
    UNHEALTHY=$(docker ps --filter "health=unhealthy" --format '{{.Names}}' | wc -l)
    if [ "$UNHEALTHY" -gt 0 ]; then
        UNHEALTHY_CONTAINERS=$(docker ps --filter "health=unhealthy" --format '{{.Names}}')
        alert "Unhealthy containers: $UNHEALTHY_CONTAINERS"
    fi
}

# Check services
check_services() {
    # Check nginx
    if ! systemctl is-active --quiet nginx 2>/dev/null && ! docker ps | grep -q nginx; then
        alert "Nginx is not running!"
    else
        log "Nginx: running"
    fi
    
    # Check Docker
    if ! systemctl is-active --quiet docker; then
        alert "Docker is not running!"
    else
        log "Docker: running"
    fi
}

# Check API budget
check_api_budget() {
    # Call health endpoint to get API budget status
    HEALTH_RESPONSE=$(curl -s http://localhost:4000/health 2>/dev/null || echo '{}')
    
    # Extract budget info (requires jq)
    if command -v jq &> /dev/null; then
        BUDGET_USED=$(echo "$HEALTH_RESPONSE" | jq -r '.apiBudget.used // "N/A"')
        BUDGET_REMAINING=$(echo "$HEALTH_RESPONSE" | jq -r '.apiBudget.remaining // "N/A"')
        
        if [ "$BUDGET_USED" != "N/A" ]; then
            log "API Budget: \$$BUDGET_USED used, \$$BUDGET_REMAINING remaining"
        fi
    fi
}

# Check network connectivity
check_network() {
    # Check if external DNS resolves
    if ! nslookup google.com &> /dev/null; then
        alert "Cannot resolve external DNS!"
        return 1
    fi
    
    # Check database connectivity
    if ! curl -s http://localhost:4000/health | grep -q "database"; then
        alert "Database health check failed!"
        return 1
    else
        log "Database: connected"
    fi
}

# Check logs for errors
check_logs() {
    ERROR_COUNT=$(docker logs --tail 100 --since "10 minutes" 2>&1 | grep -i "error\|exception\|fatal" | wc -l)
    
    if [ "$ERROR_COUNT" -gt 10 ]; then
        alert "Found $ERROR_COUNT error messages in logs (last 10 minutes)"
    fi
}

# Main monitoring function
main() {
    log "=== Starting monitoring check ==="
    
    CHECKS_PASSED=0
    CHECKS_FAILED=0
    
    check_memory || ((CHECKS_FAILED++))
    check_disk || ((CHECKS_FAILED++))
    check_cpu || ((CHECKS_FAILED++))
    check_containers || ((CHECKS_FAILED++))
    check_services || ((CHECKS_FAILED++))
    check_api_budget || ((CHECKS_FAILED++))
    check_network || ((CHECKS_FAILED++))
    check_logs || ((CHECKS_FAILED++))
    
    log "=== Monitoring check completed: $CHECKS_PASSED passed, $CHECKS_FAILED failed ==="
    
    if [ "$CHECKS_FAILED" -gt 0 ]; then
        exit 1
    fi
    
    exit 0
}

# Run main function
main "$@"
