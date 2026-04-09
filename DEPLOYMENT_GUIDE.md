# Date-Planner.us 배포 가이드

이 문서는 Date-Planner.us 도메인으로 애플리케이션을 배포하기 위한 가이드입니다.

## 필수 구성 요소

1. **도메인**: `date-planner.us` (www 서브도메인 포함)
2. **서버**: 80, 443 포트가 열린 서버
3. **Docker & Docker Compose** 설치 필요

## 배포 단계

### 1. 서버 설정

```bash
# 필수 패키지 설치
sudo apt-get update
sudo apt-get install -y docker.io docker-compose git

# Docker 서비스 시작
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. 프로젝트 클론

```bash
git clone <repository-url>
cd ai-planner
```

### 3. 환경 변수 설정

`.env.production` 파일을 수정하여 실제 프로덕션 값을 설정하세요:

```bash
cp .env.production .env
nano .env  # 환경 변수 편집
```

필수 환경 변수:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `JWT_SECRET`: 강력한 비밀 키
- `OPENROUTER_API_KEY`: OpenRouter API 키
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`: Naver API 키
- `SSL_CERT_EMAIL`: SSL 인증서 발급 이메일

### 4. SSL 인증서 발급

```bash
# SSL 인증서 발급 스크립트 실행
chmod +x init-ssl.sh
sudo ./init-ssl.sh admin@date-planner.us
```

**중요**: SSL 인증서 발급 전에 도메인(`date-planner.us`)이 서버 IP를 가리키도록 DNS 설정이 완료되어야 합니다.

### 5. 애플리케이션 빌드 및 실행

```bash
# Docker Compose로 애플리케이션 시작
sudo docker-compose up -d --build

# 서비스 상태 확인
sudo docker-compose ps

# 로그 확인
sudo docker-compose logs -f
```

### 6. SSL 인증서 갱신 확인

Certbot 컨테이너가 자동으로 SSL 인증서를 갱신합니다. 수동으로 확인하려면:

```bash
# Certbot 로그 확인
sudo docker-compose logs certbot

# 수동 갱신 테스트
sudo docker-compose exec certbot certbot renew --dry-run
```

## 보안 설정

### 1. 방화벽 설정

```bash
# UFW 방화벽 설정
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. 보안 헤더 확인

nginx.conf에 설정된 보안 헤더:
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy

### 3. CSP 설정

애플리케이션 요구사항에 따라 `nginx.conf`의 CSP 헤더를 조정하세요:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.date-planner.us;" always;
```

## 모니터링 및 유지보수

### 1. 상태 확인

```bash
# 모든 컨테이너 상태 확인
sudo docker-compose ps

# nginx 상태 확인
curl -I https://date-planner.us/health

# 백엔드 API 확인
curl -I https://date-planner.us/api/health
```

### 2. 로그 관리

```bash
# 실시간 로그 확인
sudo docker-compose logs -f

# 특정 서비스 로그
sudo docker-compose logs nginx
sudo docker-compose logs backend
sudo docker-compose logs frontend
```

### 3. 백업

```bash
# SSL 인증서 백업
sudo tar -czf letsencrypt-backup.tar.gz /etc/letsencrypt

# 데이터베이스 백업
sudo docker-compose exec postgres pg_dump -U username date_planner > backup.sql
```

## 문제 해결

### SSL 인증서 발급 실패
- 도메인 DNS 설정 확인
- 80 포트가 열려 있는지 확인
- `.well-known/acme-challenge/` 경로 접근 가능한지 확인

### nginx 시작 실패
- nginx.conf 문법 확인: `sudo docker-compose exec nginx nginx -t`
- SSL 인증서 경로 확인
- 포트 충돌 확인

### 애플리케이션 오류
- 환경 변수 설정 확인
- 데이터베이스 연결 확인
- 로그 확인: `sudo docker-compose logs`

## 성능 튜닝

### nginx 튜닝
- `worker_connections`: 현재 1024로 설정
- `keepalive_timeout`: 현재 65초로 설정
- `gzip` 압축 활성화

### 데이터베이스 튜닝
PostgreSQL 컨테이너 추가 시 `docker-compose.yml`에 다음을 추가:

```yaml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: date_planner
    POSTGRES_USER: username
    POSTGRES_PASSWORD: password
  volumes:
    - postgres_data:/var/lib/postgresql/data
  networks:
    - app-net
```

## 업데이트 절차

1. 코드 풀: `git pull origin main`
2. 이미지 재빌드: `sudo docker-compose up -d --build`
3. 변경사항 적용: `sudo docker-compose restart`

## 참고 자료

- [Let's Encrypt 문서](https://letsencrypt.org/docs/)
- [nginx 공식 문서](https://nginx.org/en/docs/)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)