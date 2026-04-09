#!/bin/bash

# nginx 설정 파일 검증 스크립트

echo "nginx 설정 파일 검증을 시작합니다..."

# nginx 설정 파일 문법 검사
if sudo docker-compose exec nginx nginx -t; then
    echo "✅ nginx 설정 파일 문법이 올바릅니다."
else
    echo "❌ nginx 설정 파일에 문법 오류가 있습니다."
    exit 1
fi

# SSL 인증서 파일 존재 확인
echo ""
echo "SSL 인증서 파일 확인:"

SSL_CERT_PATH="/etc/letsencrypt/live/date-planner.us"

if [ -f "$SSL_CERT_PATH/fullchain.pem" ]; then
    echo "✅ SSL 인증서 파일 존재: $SSL_CERT_PATH/fullchain.pem"
    
    # 인증서 만료일 확인
    echo "인증서 만료일:"
    sudo openssl x509 -in "$SSL_CERT_PATH/fullchain.pem" -noout -dates
else
    echo "⚠️  SSL 인증서 파일이 없습니다: $SSL_CERT_PATH/fullchain.pem"
    echo "   init-ssl.sh 스크립트를 실행하여 인증서를 발급하세요."
fi

if [ -f "$SSL_CERT_PATH/privkey.pem" ]; then
    echo "✅ SSL 개인키 파일 존재: $SSL_CERT_PATH/privkey.pem"
else
    echo "⚠️  SSL 개인키 파일이 없습니다: $SSL_CERT_PATH/privkey.pem"
fi

# 포트 사용 확인
echo ""
echo "포트 사용 확인:"

if ss -tulpn | grep :80 > /dev/null; then
    echo "✅ 80 포트가 사용 중입니다 (HTTP)"
else
    echo "⚠️  80 포트가 사용 중이지 않습니다"
fi

if ss -tulpn | grep :443 > /dev/null; then
    echo "✅ 443 포트가 사용 중입니다 (HTTPS)"
else
    echo "⚠️  443 포트가 사용 중이지 않습니다"
fi

# 서비스 상태 확인
echo ""
echo "Docker 서비스 상태:"

if sudo docker-compose ps | grep -q "Up"; then
    echo "✅ Docker 서비스가 실행 중입니다"
    sudo docker-compose ps
else
    echo "⚠️  Docker 서비스가 실행 중이지 않습니다"
fi

echo ""
echo "검증 완료. 문제가 발견되면 위의 지시사항을 따르세요."