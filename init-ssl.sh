#!/bin/bash

# SSL 인증서 초기 발급 스크립트
# 사용법: ./init-ssl.sh [email]

set -e

EMAIL="$1"
DOMAIN="date-planner.us"

if [ -z "$EMAIL" ]; then
    echo "사용법: $0 [email]"
    echo "예: $0 admin@date-planner.us"
    exit 1
fi

echo "SSL 인증서 발급을 시작합니다..."
echo "도메인: $DOMAIN"
echo "이메일: $EMAIL"

# certbot을 사용하여 SSL 인증서 발급
docker run -it --rm \
    -v /etc/letsencrypt:/etc/letsencrypt \
    -v /var/www/certbot:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

echo ""
echo "SSL 인증서가 성공적으로 발급되었습니다!"
echo ""
echo "다음 명령어로 nginx를 재시작하세요:"
echo "docker-compose restart nginx"
echo ""
echo "SSL 인증서 경로:"
echo "  - 인증서: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "  - 개인키: /etc/letsencrypt/live/$DOMAIN/privkey.pem"