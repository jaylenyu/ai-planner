# ai-planner

자연어 일정 요청을 받아 실제 장소 후보, 이동 동선, 시간표를 생성하는 풀스택 AI 일정 플래너입니다. 현재 실서비스 도메인은 `https://date-planner.us`이고, 저장소 운영은 `canary` 통합 브랜치와 `main` release 브랜치로 분리되어 있습니다.

## 프로젝트 개요

이 저장소는 다음 두 애플리케이션으로 구성됩니다.

- `backend/`: NestJS 11 API 서버
- `frontend/`: Next.js 16 App Router 웹 앱

핵심 사용자 흐름은 다음과 같습니다.

1. 사용자가 프론트엔드에서 자연어 일정 요청을 입력합니다.
2. 프론트엔드가 JWT 인증 상태로 `POST /api/plan/generate`를 호출합니다.
3. 백엔드 AI 파이프라인이 입력을 구조화하고 실제 장소 후보를 검색합니다.
4. 후보 장소를 선별하고 이동 동선을 정렬한 뒤 시간표를 생성합니다.
5. 생성 결과를 DB에 저장하고 프론트엔드가 지도/카드 UI로 렌더링합니다.

## 현재 브랜치 전략

- `canary`: 통합 개발 브랜치. 기능 개발, CI/CD 개선, 운영 변경을 먼저 반영하는 브랜치입니다.
- `main`: production release 브랜치. 현재 orphan 기반 새 히스토리로 분리되어 있으며 정식 릴리즈만 올리는 용도입니다.

현재 운영 원칙은 다음과 같습니다.

- 일상적인 개발과 검증은 `canary` 기준으로 진행합니다.
- 안정화된 변경만 `canary -> main` PR로 승격합니다.
- test 도메인과 별도 canary 배포 환경은 후속 작업으로 남겨둔 상태입니다.

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | NestJS 11, TypeScript, Passport, JWT |
| Database | PostgreSQL 16, Prisma 5 |
| AI | OpenRouter 기반 LLM 호출 |
| 지도/검색 | NAVER Maps JS SDK, NAVER Local Search API, Kakao 장소 데이터 보강 |
| 인증 | 이메일/비밀번호, Google OAuth, Kakao OAuth, Naver OAuth |
| 분석/보안 | PostHog, Cloudflare Turnstile |
| Infra | Docker, Docker Compose, GHCR, Nginx, AWS EC2 |
| CI/CD | GitHub Actions |

## 저장소 구조

```text
ai-planner/
├── .github/workflows/
│   ├── ci.yml
│   ├── deploy.yml
│   └── release.yml
├── backend/
│   ├── prisma/
│   ├── scripts/
│   └── src/
├── docs/
├── frontend/
│   └── src/
└── README.md
```

### 주요 디렉터리

| 경로 | 설명 |
| --- | --- |
| `.github/workflows/ci.yml` | PR 기준 검증 워크플로우. `Backend CI`, `Frontend CI` 고정 job 이름 사용 |
| `.github/workflows/deploy.yml` | `main` 전용 production 배포 워크플로우 |
| `.github/workflows/release.yml` | `v*` 태그 푸시 시 GitHub Release 생성 |
| `backend/src/modules/ai/` | 일정 생성 파이프라인과 장소 선택 로직 |
| `backend/src/modules/auth/` | 로컬 로그인, refresh token, OAuth, 이메일 인증 |
| `backend/src/modules/plan/` | 플랜 생성/조회 API |
| `backend/src/modules/places/` | 외부 장소 검색 통합 |
| `frontend/src/app/` | App Router 기반 페이지와 레이아웃 |
| `frontend/src/components/plan/` | 플랜 입력, 지도, 히스토리, 일정 UI |
| `frontend/src/lib/` | API client, 토큰 저장소, 공통 타입 |
| `docs/release-versioning.md` | 브랜치 운영/릴리즈/버저닝 정책 |

## 백엔드 아키텍처

### NestJS 모듈 구성

`backend/src/app.module.ts` 기준으로 다음 모듈이 조립됩니다.

- `AuthModule`: 이메일 로그인, OAuth, refresh/logout, 비밀번호 재설정
- `PlacesModule`: 외부 장소 검색 및 후보 수집
- `AiModule`: 자연어 입력 해석, 후보 선택, 경로 최적화, 일정 생성
- `PlanModule`: 생성 결과 저장 및 사용자 플랜 조회
- `ApiBudgetModule`: API 사용량/비용 제한 확인
- `PrismaModule`: DB 연결과 Prisma client 제공

`ApiBudgetMiddleware`는 `POST /api/plan/generate` 요청에만 적용되어 일정 생성 비용 제어를 수행합니다.

### 주요 API 엔드포인트

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/health` | 앱/DB/API budget 상태 헬스체크 |
| `GET` | `/api/version` | 앱 버전 정보 확인 |
| `POST` | `/api/auth/email/request-code` | 이메일 인증 코드 요청 |
| `POST` | `/api/auth/email/verify-code` | 이메일 인증 코드 검증 |
| `POST` | `/api/auth/register` | 이메일 회원가입 |
| `POST` | `/api/auth/login` | 이메일 로그인 |
| `POST` | `/api/auth/refresh` | access token 재발급 |
| `POST` | `/api/auth/logout` | refresh token 무효화 |
| `POST` | `/api/auth/forgot-password` | 비밀번호 재설정 메일 발송 |
| `POST` | `/api/auth/reset-password` | 비밀번호 재설정 완료 |
| `GET` | `/api/auth/google` | Google OAuth 시작 |
| `GET` | `/api/auth/kakao` | Kakao OAuth 시작 |
| `GET` | `/api/auth/naver` | Naver OAuth 시작 |
| `GET` | `/api/plan/list` | 로그인 사용자 플랜 목록 조회 |
| `POST` | `/api/plan/generate` | 일정 생성 및 저장 |
| `GET` | `/api/budget/usage` | 사용자/요청 기준 사용량 확인 |
| `GET` | `/api/budget/limits` | 예산 제한값 확인 |

### AI 일정 생성 파이프라인

실행 경로는 `backend/src/modules/ai/steps/`에 구현되어 있습니다.

```text
사용자 자연어 입력
  -> ParseInputStep
  -> ExtractIntentStep
  -> SearchPlacesStep
  -> SelectCandidatesStep
  -> OptimizeRouteStep
  -> GenerateScheduleStep
```

각 단계 역할은 다음과 같습니다.

- `ParseInputStep`: 사용자의 자유 입력에서 지역, 분위기, 제약 조건, 활동 의도를 구조화합니다.
- `ExtractIntentStep`: 지역/활동 정보를 내부 검색 가능한 intent로 정규화합니다.
- `SearchPlacesStep`: 외부 장소 검색 API를 호출해 활동별 후보를 수집합니다.
- `SelectCandidatesStep`: 거리, 활동 적합도, 체인 패널티 등을 고려해 후보를 압축합니다.
- `OptimizeRouteStep`: 이동 거리를 줄이는 순서로 동선을 정렬합니다.
- `GenerateScheduleStep`: 시간표, 요약 텍스트, 지도 표시용 데이터를 만듭니다.

### 인증 구조

백엔드는 두 종류의 인증 흐름을 가집니다.

- 로컬 인증: 이메일/비밀번호 + refresh token 재발급
- 소셜 인증: Google, Kakao, Naver Passport 전략

OAuth callback은 백엔드에서 처리한 뒤 프론트엔드의 `/auth/callback`으로 access/refresh token을 전달하는 리다이렉트 방식입니다. 이 때문에 `FRONTEND_URL`, `{PROVIDER}_CALLBACK_URL` 설정이 실제 배포 도메인과 정확히 일치해야 합니다.

### 데이터 모델

`backend/prisma/schema.prisma`의 주요 모델은 다음과 같습니다.

- `User`: 로컬/OAuth 계정과 이메일 인증 상태
- `RefreshToken`: refresh token 저장 및 만료 관리
- `PasswordResetToken`: 비밀번호 재설정 토큰
- `Plan`: 사용자의 원본 요청과 생성 결과 메타데이터
- `PlanItem`: 일정 항목별 이름/좌표/유형/시간
- `ApiUsage`: API 비용/호출량 추적

## 프론트엔드 아키텍처

### 라우팅 구조

`frontend/src/app/`는 App Router를 사용합니다.

- `/`: 랜딩 페이지
- `/plan`: 일정 생성 및 결과 확인 화면
- `/login`, `/register`, `/forgot-password`, `/reset-password`: 인증 플로우
- `/auth/callback`: OAuth 토큰 수신 처리
- `/privacy`, `/terms`: 정책 페이지

### 주요 컴포넌트

| 경로 | 역할 |
| --- | --- |
| `frontend/src/components/plan/PlanInputForm.tsx` | 사용자 입력 수집 |
| `frontend/src/components/plan/ScheduleList.tsx` | 생성된 일정 리스트 렌더링 |
| `frontend/src/components/plan/MapView.tsx` | 지도/마커/동선 표시 |
| `frontend/src/components/plan/PlanHistory.tsx` | 저장된 플랜 히스토리 표시 |
| `frontend/src/components/auth/OAuthButtonList.tsx` | 소셜 로그인 진입점 |
| `frontend/src/components/PostHogProvider.tsx` | PostHog 클라이언트 주입 |

### API 클라이언트와 인증 처리

`frontend/src/lib/api.ts`는 다음 역할을 담당합니다.

- `NEXT_PUBLIC_API_URL`을 기반으로 `/api` prefix를 자동 정규화
- access token 자동 첨부
- `401` 응답 시 refresh token으로 재발급 시도
- refresh 실패 시 토큰 삭제 후 로그인 화면으로 이동

즉, 프론트엔드는 stateless API 호출만 하는 것이 아니라 refresh 재시도 로직까지 포함한 세션 유지 계층을 가지고 있습니다.

## 환경 변수

### Backend

로컬 개발은 일반적으로 `backend/.env`를 사용합니다.

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `APP_URL` | 백엔드 공개 URL |
| `FRONTEND_URL` | 프론트엔드 공개 URL |
| `CORS_ORIGIN` | 허용할 프론트엔드 origin |
| `JWT_SECRET` | JWT 서명 키 |
| `JWT_EXPIRES_IN` | access token 만료 시간 |
| `REFRESH_TOKEN_EXPIRES_DAYS` | refresh token 보관 기간 |
| `OPENROUTER_API_KEY` | LLM 호출용 API 키 |
| `POSTHOG_API_KEY` | 서버측 PostHog 키 |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS` / `EMAIL_FROM` | 이메일 발송 설정 |
| `NAVER_SEARCH_CLIENT_ID` / `NAVER_SEARCH_CLIENT_SECRET` | Naver 지역 검색 API |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | Google OAuth |
| `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` / `KAKAO_CALLBACK_URL` | Kakao OAuth |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` / `NAVER_CALLBACK_URL` | Naver OAuth |

주의사항:

- `NAVER_SEARCH_*`와 `NAVER_CLIENT_*`는 서로 다른 용도의 키입니다.
- OAuth callback URL은 백엔드 도메인 기준이어야 합니다.
- 배포 환경에서는 compose 파일의 `environment` 섹션에도 누락 없이 주입돼야 합니다.

### Frontend

로컬 개발은 `frontend/.env.local`을 사용합니다.

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | 백엔드 API 루트. `/api`는 있어도 되고 없어도 됩니다 |
| `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` | Naver Maps JS SDK 키 |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog browser key |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog endpoint |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile 사이트 키 |

배포용 기준값은 `.env.production.template`에 정리돼 있습니다.

## 로컬 개발 환경 세팅

### 요구사항

- Node.js 22.x
- npm 10+
- Docker / Docker Compose
- PostgreSQL 또는 Docker 기반 DB

### 설치

```bash
cd backend
npm ci
npx prisma generate

cd ../frontend
npm ci
```

### 개발 서버 실행

```bash
# terminal 1
cd backend
npm run start:dev

# terminal 2
cd frontend
npm run dev
```

기본 포트는 다음과 같습니다.

- backend: `http://localhost:4000`
- frontend: `http://localhost:3000`

### Prisma 작업

```bash
# schema 변경 후 개발 마이그레이션 생성/적용
cd backend
npx prisma migrate dev --name <migration_name>

# 프로덕션 배포 시 적용
npx prisma migrate deploy

# Prisma client 재생성
npx prisma generate
```

## 품질 검증 명령

### Backend

```bash
cd backend
npm run lint
npm run lint:check
npx tsc -p tsconfig.build.json --noEmit
npm run test
npm run test:e2e
npm run test:cov
```

### Frontend

```bash
cd frontend
npm run lint
npm run lint:check
npx tsc --noEmit
npm run build
```

## Docker 및 배포 구조

### 이미지

production 기준으로 다음 GHCR 이미지를 사용합니다.

- `ghcr.io/<owner>/ai-planner-backend`
- `ghcr.io/<owner>/ai-planner-frontend`

### 프로덕션 런타임

프로덕션은 EC2에서 Docker Compose와 Nginx로 운영합니다.

- 앱 스택 기준 경로: `/srv/apps/ai-planner`
- reverse proxy: 별도 infra 스택의 Nginx
- 앱 컨테이너: `ai-planner-backend`, `ai-planner-frontend`, `ai-planner-postgres`

`infra/nginx/conf.d/ai-planner.conf`는 `date-planner.us`를 프론트엔드와 `/api` 백엔드로 프록시합니다.

### Docker health check

현재 이미지 기준 health check는 다음 방향으로 튜닝되어 있습니다.

- backend: `/health`
- frontend: `/`
- 짧은 interval 기반 빠른 재기동 판정

## GitHub Actions

### CI

`ci.yml`은 PR 기준 검증 워크플로우입니다.

- trigger: `pull_request`
- path filter: `backend/**`, `frontend/**`, workflow 파일
- concurrency: 같은 PR의 이전 실행 취소
- 고정 job 이름:
  - `Backend CI`
  - `Frontend CI`

변경이 없는 쪽 job은 성공 종료로 처리되므로 branch protection의 required checks와 안정적으로 연결됩니다.

Backend CI는 다음을 수행합니다.

- `npm ci`
- `npx prisma generate`
- `npx tsc -p tsconfig.build.json --noEmit`
- `npm run lint:check`
- Docker dry-run build

Frontend CI는 다음을 수행합니다.

- `npm ci`
- `npx tsc --noEmit`
- `npm run lint:check`
- Docker dry-run build

### CD

`deploy.yml`은 `main` push 전용 production 배포 워크플로우입니다.

- trigger: `push` to `main`
- path filter: `backend/**`, `frontend/**`
- concurrency: 새 커밋이 오면 이전 배포 취소
- 변경된 서비스만 이미지 build/push
- 변경된 서비스만 EC2에서 `docker pull`과 `docker compose up -d --no-build`
- backend 변경 시에만 env 검증, JWT 생성, Kakao smoke test 수행
- frontend-only 배포 시 backend smoke는 생략

즉, 검증 역할은 PR CI가 담당하고 production deploy는 실제 배포만 담당하도록 분리되어 있습니다.

### Release

`release.yml`은 `v*` 태그 푸시 시 GitHub Release를 생성합니다. 다만 현재 `main`은 release branch로만 운용 중이며, 태그 발행은 실제 정식 릴리즈 시점에만 수행하는 정책입니다.

## 권장 개발 흐름

```text
feature branch
  -> PR to canary
  -> CI 통과
  -> merge to canary
  -> canary 안정화
  -> PR from canary to main
  -> merge to main
  -> production deploy
  -> optional version tag / GitHub Release
```

## 운영 메모

- `main`은 branch protection이 걸려 있어 direct push를 허용하지 않습니다.
- `canary`는 현재 통합 개발 기준 브랜치입니다.
- test 도메인과 canary 전용 서버는 아직 만들지 않았습니다.
- production 환경 검증은 `main` 승격 이후에 수행합니다.

## 트러블슈팅

| 증상 | 점검 포인트 |
| --- | --- |
| 장소 검색 결과가 부정확하거나 비어 있음 | `NAVER_SEARCH_CLIENT_ID/SECRET`, Kakao 관련 env, 지역 정규화 로직 확인 |
| OAuth 로그인 후 프론트로 돌아오지 않음 | `FRONTEND_URL`, `GOOGLE_CALLBACK_URL`, `KAKAO_CALLBACK_URL`, `NAVER_CALLBACK_URL` 일치 여부 확인 |
| 프론트에서 계속 401 후 로그인 화면으로 이동 | refresh token 저장 상태와 `/api/auth/refresh` 응답 확인 |
| 배포 후 env가 반영되지 않음 | 서버 `.env`와 compose `environment` 항목 동시 확인 |
| backend smoke만 실패함 | JWT 생성, `JWT_SECRET`, Kakao/Naver 외부 API 키, DB 사용자 존재 여부 확인 |
| 지도 대신 텍스트만 보임 | `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` 누락 여부 확인 |

## 관련 문서

- [release-versioning.md](./docs/release-versioning.md)

## 라이선스

별도 오픈소스 라이선스를 부여하지 않은 개인 프로젝트입니다.
