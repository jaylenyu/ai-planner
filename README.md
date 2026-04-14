# DatePlanner — AI 일정 플래너

자연어 한 마디로 지역·활동 취향을 전달하면 AI가 즉시 일정, 실제 장소 후보, 이동 동선까지 제시하는 데이트·여행 플래너입니다.

**실서비스:** https://date-planner.us

---

## 주요 기능

- **대화형 입력** – "홍대에서 친구들이랑 하루 일정 짜줘"처럼 자연어만 입력해도 위치·활동·시간대를 파싱합니다.
- **AI 파이프라인** – OpenRouter(GPT-4o-mini)로 의도를 분석 → 활동 순서 구성 → 요약 문구를 생성합니다.
- **실제 장소 검색** – NAVER Local Search API로 활동별 현장 후보를 가져오고, 3km 이내 최적 장소를 선별합니다.
- **경로 최적화** – 선택된 장소를 최소 이동거리 순으로 정렬하고, 체류 시간 기반의 타임라인을 생성합니다.
- **지도 미리보기** – NAVER Maps JS SDK로 동선·폴리라인·마커 UI를 보여주며, 키가 없을 땐 텍스트 카드로 대체합니다.
- **OAuth 로그인** – Google, Kakao, Naver 소셜 로그인 및 이메일/비밀번호 인증을 지원합니다.
- **배포 자동화** – main 브랜치 푸시마다 GitHub Actions가 lint + Docker 이미지 빌드를 병렬로 수행 후 EC2에 배포합니다.

---

## 아키텍처 & 폴더 구조

```
ai-planner/
├── frontend/          # Next.js 16 (App Router) 웹 앱
├── backend/           # NestJS 11 API 서버
└── .github/workflows/ # CI/CD 파이프라인
```

| 경로 | 설명 |
| --- | --- |
| `frontend/` | Next.js 16(App Router) 기반 웹 앱. auth 훅, 지도 컴포넌트, 플랜 생성 UI 포함. |
| `backend/` | NestJS 11 API. AI 파이프라인, 인증/토큰, 이메일, 예산/분석 모듈과 Prisma 기반 DB 접속을 담당. |
| `.github/workflows/deploy.yml` | main 푸시 시 lint+빌드(병렬) → Docker 이미지 GHCR 푸시 → EC2 SSH 배포. |

### AI 파이프라인 (`backend/src/modules/ai/steps/`)

```
사용자 입력
    ↓
ParseInputStep       – GPT-4o-mini로 위치·활동·시간대 JSON 추출
    ↓
ExtractIntentStep    – 위치를 좌표로 변환, 활동을 NAVER 검색 쿼리로 매핑
    ↓
SearchPlacesStep     – NAVER Local Search API로 활동별 장소 후보 수집
    ↓
SelectCandidatesStep – 3km 이내 최근접 장소 선별
    ↓
OptimizeRouteStep    – 최소 이동거리 순으로 동선 정렬
    ↓
GenerateScheduleStep – 타임라인·요약·지도 polyline 생성
```

---

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend | NestJS 11, Prisma 5, Passport (JWT + OAuth) |
| Database | PostgreSQL 16 (Docker, EC2 내부) |
| AI | OpenRouter → GPT-4o-mini (JSON response mode) |
| 지도/검색 | NAVER Maps JS SDK v3, NAVER Local Search API |
| OAuth | Google, Kakao, Naver |
| 인프라 | Docker, GHCR, AWS EC2, Docker Compose, Nginx |
| CI/CD | GitHub Actions |

---

## 시작하기

### 필수 도구

- Node.js 22.x
- npm 10+
- Docker / Docker Compose (선택)

### 환경 변수 구성

**Backend (`backend/.env`)**

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `OPENROUTER_API_KEY` | OpenRouter API 키 (GPT-4o-mini 사용) |
| `JWT_SECRET` | JWT 서명 키 |
| `JWT_EXPIRES_IN` | 토큰 만료 시간 (예: `15m`) |
| `NAVER_SEARCH_CLIENT_ID` | NAVER Local Search API 전용 키 (developers.naver.com) |
| `NAVER_SEARCH_CLIENT_SECRET` | NAVER Local Search API 시크릿 |
| `NAVER_CLIENT_ID` | NAVER OAuth 로그인 키 |
| `NAVER_CLIENT_SECRET` | NAVER OAuth 시크릿 |
| `NAVER_CALLBACK_URL` | `{APP_URL}/api/auth/naver/callback` |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 시크릿 |
| `GOOGLE_CALLBACK_URL` | `{APP_URL}/api/auth/google/callback` |
| `KAKAO_CLIENT_ID` | Kakao REST API 키 |
| `KAKAO_CLIENT_SECRET` | Kakao 클라이언트 시크릿 |
| `KAKAO_CALLBACK_URL` | `{APP_URL}/api/auth/kakao/callback` |
| `FRONTEND_URL` | 프론트엔드 URL (OAuth 콜백 리다이렉트용) |
| `APP_URL` | 백엔드 공개 URL |
| `CORS_ORIGIN` | CORS 허용 도메인 |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS` | SMTP 이메일 발송 설정 |

> **주의:** NAVER 장소 검색(`NAVER_SEARCH_*`)과 NAVER OAuth 로그인(`NAVER_CLIENT_*`)은 **다른 앱 키**입니다.
> - 검색: [developers.naver.com](https://developers.naver.com) → "지역" API 활성화 필요
> - OAuth: [developers.naver.com](https://developers.naver.com) → "네이버 로그인" API 활성화 필요

**Frontend (`frontend/.env.local`)**

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | 백엔드 API 루트 (예: `http://localhost:4000/api`) |
| `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` | NAVER Maps JS SDK용 클라이언트 ID (cloud.naver.com) |
| `NEXT_PUBLIC_POSTHOG_KEY` | (선택) PostHog 분석 키 |
| `NEXT_PUBLIC_POSTHOG_HOST` | (선택) PostHog 호스트 |

### 설치 및 실행

```bash
# 의존성 설치
cd backend && npm install && npx prisma generate && cd ..
cd frontend && npm install && cd ..

# 개발 서버 실행
cd backend && npm run start:dev   # http://localhost:4000
cd frontend && npm run dev        # http://localhost:3000
```

### DB 마이그레이션

```bash
# 개발 환경 (마이그레이션 생성 + 적용)
cd backend && npx prisma migrate dev --name <name>

# 프로덕션 (마이그레이션 적용만)
npx prisma migrate deploy
```

---

## 배포 파이프라인

`main` 브랜치에 푸시하면 자동으로 실행됩니다. 수동 실행: `gh workflow run deploy.yml --field force_deploy=true`

```
push to main
    ↓
changes job          – frontend/**, backend/** 변경 여부 감지
    ↓ (병렬)
build-backend        – lint + typecheck + Docker 빌드 → GHCR 푸시
build-frontend       – lint + typecheck + Docker 빌드(env 주입) → GHCR 푸시
    ↓
deploy               – EC2 SSH → 이미지 pull → 컨테이너 재시작 → 헬스체크
```

변경된 서비스만 빌드하므로 frontend만 수정 시 backend 빌드는 스킵됩니다.

---

## 개발 가이드

```bash
# Lint
cd backend && npm run lint
cd frontend && npm run lint

# 타입 체크
cd backend && npx tsc -p tsconfig.build.json --noEmit
cd frontend && npx tsc --noEmit

# 테스트 (backend)
npm run test        # 단위 테스트
npm run test:e2e    # e2e 테스트
npm run test:cov    # 커버리지
```

---

## 트러블슈팅

| 증상 | 원인 및 해결 |
| --- | --- |
| 일정 생성 시 "해당 지역에서 장소를 찾지 못했습니다" | `NAVER_SEARCH_CLIENT_ID/SECRET` 미설정 또는 "지역" API 미활성화. developers.naver.com에서 확인 |
| 지도 미리보기 대신 텍스트 카드만 보임 | 프론트 빌드에 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` 미주입. GitHub Secrets 확인 후 재배포 |
| AI 응답 JSON 파싱 오류 | OpenRouter API 키 오류 또는 월간 예산 초과. API 키 및 `api-budget` 모듈 상태 확인 |
| OAuth 로그인 후 리다이렉트 실패 | `FRONTEND_URL`, `{PROVIDER}_CALLBACK_URL` 설정 확인. docker-compose `environment` 섹션에 변수 추가 여부도 확인 |
| 컨테이너에 새 env 변수가 반영 안 됨 | `~/ai-planner/.env` 수정 후 `docker-compose.ai-planner.prod.yml`의 `environment:` 섹션에도 변수 추가 필요 |

---

## 라이선스

개인 프로젝트로 사용 중이며 별도 라이선스는 부여되지 않았습니다.
