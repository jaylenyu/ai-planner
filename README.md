# ai-planner

자연어 일정 요청을 받아 실제 장소 후보, 이동 동선, 시간표를 생성하는 풀스택 AI 일정 플래너입니다. 서비스 도메인은 `https://date-planner.us`, 테스트 도메인은 `https://test.date-planner.us`입니다.

## 프로젝트 개요

이 저장소는 두 애플리케이션과 배포 인프라 설정으로 구성됩니다.

- `backend/`: NestJS 11 API 서버
- `frontend/`: Next.js 16 App Router 웹 앱
- `infra/`: 테스트 환경 Compose/Nginx/서버 초기화 스크립트
- `.github/workflows/`: CI, canary/test/production 배포, 릴리즈 자동화

핵심 사용자 흐름은 다음과 같습니다.

1. 사용자가 프론트엔드에서 자연어 일정 요청을 입력합니다.
2. 프론트엔드가 인증 상태로 `POST /api/plan/generate`를 호출합니다.
3. 백엔드 AI 파이프라인이 입력을 구조화하고 장소 후보를 검색합니다.
4. 후보 장소를 선별하고 이동 동선을 정렬한 뒤 시간표를 생성합니다.
5. 생성 결과를 DB에 저장하고 프론트엔드가 지도/카드 UI로 렌더링합니다.

현재 앱은 일정 생성 외에도 카테고리, 플랜 편집/메모, 워크스페이스 초대, 알림, 구독 결제, 관리자 운영 화면을 포함합니다.

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, TanStack Query/Table, Zustand |
| Backend | NestJS 11, TypeScript, Passport, JWT, Schedule, Sentry |
| Database | PostgreSQL, Prisma 5 |
| Cache/Rate limit | Redis optional |
| AI | OpenRouter 기반 LLM 호출 |
| 지도/검색 | NAVER Maps JS SDK, NAVER Local Search API, Kakao 장소 검색 |
| 인증 | 이메일/비밀번호, Google OAuth, Kakao OAuth, Naver OAuth |
| 결제 | Toss Payments 구독 결제 |
| 분석/보안 | GA4, Cloudflare Turnstile, Sentry |
| Infra | Docker, Docker Compose, GHCR, Nginx, AWS EC2/CloudWatch |
| CI/CD | GitHub Actions |

## 저장소 구조

```text
ai-planner/
├── .github/workflows/
│   ├── auto-tag.yml
│   ├── canary.yml
│   ├── ci.yml
│   ├── deploy-test.yml
│   ├── deploy.yml
│   └── release.yml
├── backend/
│   ├── prisma/
│   ├── scripts/
│   └── src/
│       ├── modules/
│       ├── shared/
│       └── services/
├── docs/
├── frontend/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       └── stores/
├── infra/
├── .env.production.template
├── .env.test.template
└── README.md
```

### 주요 디렉터리

| 경로 | 설명 |
| --- | --- |
| `backend/src/modules/ai/` | 자연어 입력 해석, 장소 검색, 후보 선택, 경로 최적화, 일정 생성 |
| `backend/src/modules/auth/` | 로컬 로그인, refresh token, OAuth, 계정 설정, 계정 삭제 |
| `backend/src/modules/plan/` | 플랜 생성/조회/수정/삭제, 일정 항목, 플랜 메모 |
| `backend/src/modules/category/` | 사용자별 플랜 카테고리 |
| `backend/src/modules/workspace/` | 워크스페이스 생성, 초대, 참여, 삭제 |
| `backend/src/modules/payment/` | Toss 결제 준비/승인/웹훅, 구독 상태/해지/재구독 |
| `backend/src/modules/admin/` | 관리자 대시보드, 사용자/플랜/청구/운영 로그/비용/Sentry 조회 |
| `backend/src/shared/region/` | 지역 정규화와 별칭 학습 |
| `frontend/src/app/` | App Router 페이지, API route, 레이아웃 |
| `frontend/src/components/plan/` | 플랜 입력, 지도, 일정 목록, 히스토리, 메모 UI |
| `frontend/src/components/payment/` | Toss 결제 위젯 |
| `frontend/src/components/notification/` | 인앱 알림 UI |
| `frontend/src/lib/` | API client, 인증/세션, 타입, 서버 유틸 |
| `infra/` | 테스트 서버용 Compose, Nginx server block, 초기화 스크립트 |
| `docs/release-versioning.md` | 브랜치 운영/릴리즈/버저닝 정책 |

## 백엔드

### 모듈 구성

`backend/src/app.module.ts` 기준 주요 모듈은 다음과 같습니다.

- `AuthModule`: 이메일 로그인, 이메일 인증, OAuth, refresh/logout, 비밀번호 재설정, 계정 설정
- `PlacesModule`: Naver/Kakao 장소 검색 통합
- `AiModule`: 자연어 입력 해석, 후보 선택, 경로 최적화, 일정 생성
- `PlanModule`: 생성 결과 저장, 플랜 편집, 일정 항목, 메모
- `CategoryModule`: 사용자별 카테고리 관리
- `WorkspaceModule`: 공유 워크스페이스와 초대 링크
- `NotificationModule`: 인앱 알림
- `PaymentModule`: Toss 결제와 구독 상태 관리
- `ApiBudgetModule`: 일정 생성 API 사용량/비용 제한
- `AdminModule`: 운영 대시보드 API
- `UserModule`: 사용자 정리 스케줄러

`ApiBudgetMiddleware`는 `POST /api/plan/generate` 요청에 적용됩니다. `main.ts`에서 전역 prefix는 `/api`이고, `/health`만 prefix에서 제외됩니다.

### 주요 API

| 영역 | 엔드포인트 |
| --- | --- |
| Health/version | `GET /health`, `GET /api/version` |
| Auth | `POST /api/auth/email/request-code`, `POST /api/auth/email/verify-code`, `POST /api/auth/email/check`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/admin/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `POST /api/auth/logout-all`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `GET /api/auth/me`, `PATCH /api/auth/password`, `PATCH /api/auth/settings`, `DELETE /api/auth/me` |
| OAuth | `GET /api/auth/google`, `GET /api/auth/google/callback`, `GET /api/auth/kakao`, `GET /api/auth/kakao/callback`, `GET /api/auth/naver`, `GET /api/auth/naver/callback`, `POST /api/auth/oauth/:provider/link-token`, `DELETE /api/auth/oauth/:provider` |
| Plan | `GET /api/plan/list`, `GET /api/plan/:id`, `POST /api/plan/generate`, `PATCH /api/plan/:id`, `DELETE /api/plan/:id`, item CRUD, memo CRUD |
| Category | `GET /api/category/list`, `POST /api/category`, `PATCH /api/category/:id`, `DELETE /api/category/:id` |
| Workspace | `POST /api/workspace`, `GET /api/workspace/mine`, `POST /api/workspace/:id/invite`, `POST /api/workspace/join/:token`, `DELETE /api/workspace/:id` |
| Notification | `GET /api/notification/unread`, `PATCH /api/notification/read-all`, `PATCH /api/notification/:id/read` |
| Payment/subscription | `POST /api/payment/prepare`, `POST /api/payment/confirm`, `POST /api/payment/webhook`, `GET /api/subscription/status`, `DELETE /api/subscription/cancel`, `POST /api/subscription/resubscribe` |
| Budget | `GET /api/budget/usage`, `GET /api/budget/limits` |
| Admin | `GET /api/admin/summary`, users, billing, plans, workspace plans, CloudWatch logs, cost, Sentry, API usage |

### AI 일정 생성 파이프라인

구현은 `backend/src/modules/ai/steps/`에 있습니다.

```text
사용자 자연어 입력
  -> ParseInputStep
  -> ExtractIntentStep
  -> SearchPlacesStep
  -> SelectCandidatesStep
  -> OptimizeRouteStep
  -> GenerateScheduleStep
```

- `ParseInputStep`: 지역, 분위기, 제약 조건, 활동 의도를 구조화합니다.
- `ExtractIntentStep`: 지역/활동 정보를 내부 검색 가능한 intent로 정규화합니다.
- `SearchPlacesStep`: Naver/Kakao 등 외부 장소 검색 API를 호출해 후보를 수집합니다.
- `SelectCandidatesStep`: 거리, 활동 적합도, 체인 패널티 등을 고려해 후보를 압축합니다.
- `OptimizeRouteStep`: 이동 거리를 줄이는 순서로 동선을 정렬합니다.
- `GenerateScheduleStep`: 시간표, 요약, 지도 표시용 데이터를 생성합니다.

### 데이터 모델

`backend/prisma/schema.prisma`의 주요 모델은 다음과 같습니다.

- `User`: 로컬/OAuth 계정, 관리자 권한, 알림 설정, 소프트 삭제
- `RefreshToken`, `PasswordResetToken`: 세션 재발급과 비밀번호 재설정
- `Plan`, `PlanItem`, `PlanMemo`: 일정, 일정 항목, 협업 메모
- `Category`: 사용자별 일정 분류
- `Workspace`, `WorkspaceMember`, `WorkspaceInvite`: 공유 워크스페이스
- `Subscription`, `Payment`: Toss 구독 결제
- `Notification`: 인앱 알림
- `ApiUsage`: API 비용/호출량 추적

## 프론트엔드

### 라우팅

`frontend/src/app/`는 Next.js App Router를 사용합니다.

- `/`: 서비스 소개 및 시작 화면
- `/plan`: 일정 생성 화면
- `/plans/[id]`, `/library`, `/library/plans/[id]`: 저장된 일정 조회
- `/dashboard`, `/mypage`, `/settings`: 사용자 홈/계정 설정
- `/workspace`, `/workspace/join/[token]`: 워크스페이스와 초대 수락
- `/subscribe`, `/subscribe/success`, `/subscribe/fail`: 구독 결제 플로우
- `/admin`, `/admin/*`: 관리자 대시보드
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback`: 인증 플로우
- `/privacy`, `/terms`: 정책 페이지

### 클라이언트 구조

- `frontend/src/lib/api.ts`는 `NEXT_PUBLIC_API_URL`을 기준으로 API base URL을 정규화하고, access token 첨부와 `401` refresh 재시도를 처리합니다.
- `frontend/src/stores/authStore.ts`와 `frontend/src/hooks/useAuth.ts`가 클라이언트 인증 상태를 관리합니다.
- `frontend/src/components/providers/QueryProvider.tsx`가 TanStack Query client를 주입합니다.
- `frontend/src/app/api/admin/*`는 관리자 화면에서 사용하는 Next.js API route 프록시/세션 처리를 담당합니다.

## 환경 변수

로컬 개발에서는 보통 `backend/.env`와 `frontend/.env.local`을 사용합니다. 배포 기준 예시는 `.env.production.template`, 테스트 기준 예시는 `.env.test.template`에 있습니다.

### Backend

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `PORT` | API 서버 포트. 기본값 `4000` |
| `APP_URL` | 백엔드 공개 URL |
| `FRONTEND_URL` | 프론트엔드 공개 URL과 OAuth 리다이렉트 기준 |
| `CORS_ORIGIN` | 허용할 프론트엔드 origin. 쉼표로 여러 개 지정 가능 |
| `JWT_SECRET` | JWT 서명 키 |
| `JWT_EXPIRES_IN` | access token 만료 시간 |
| `REFRESH_TOKEN_EXPIRES_DAYS` | refresh token 보관 기간 |
| `LINK_TOKEN_SECRET` | OAuth 계정 연결 토큰 서명 키. 없으면 `JWT_SECRET` 사용 |
| `OPENROUTER_API_KEY` | LLM 호출용 API 키 |
| `DAILY_API_LIMIT`, `MONTHLY_API_BUDGET` | 일정 생성 API 예산 제한 |
| `NAVER_SEARCH_CLIENT_ID`, `NAVER_SEARCH_CLIENT_SECRET` | Naver 지역 검색 API |
| `KAKAO_REST_API_KEY` | Kakao 장소 검색 API |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS` | Redis 캐시/제한 설정 |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret |
| `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `SENTRY_ENVIRONMENT` | Sentry 수집/관리자 조회 설정 |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | 관리자 운영 조회용 AWS 인증 |
| `CLOUDWATCH_LOG_GROUP_BACKEND`, `CLOUDWATCH_LOG_GROUP_FRONTEND` | CloudWatch 로그 그룹 |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `SUPPORT_EMAIL` | 이메일 발송 설정 |
| `TOSS_SECRET_KEY`, `TOSS_WEBHOOK_SECRET`, `SUBSCRIPTION_MONTHLY_AMOUNT` | Toss 결제/구독 설정 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google OAuth |
| `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `KAKAO_CALLBACK_URL` | Kakao OAuth |
| `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `NAVER_CALLBACK_URL` | Naver OAuth |
| `SCHEDULER_ENABLED` | `false`면 정리 스케줄러 비활성화. 테스트 환경 중복 cron 방지용 |

### Frontend

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | 백엔드 API 루트. `/api`가 있어도 되고 없어도 됩니다 |
| `BACKEND_URL` | 서버 사이드 API route가 직접 호출할 백엔드 URL |
| `NEXT_PUBLIC_SITE_URL` | canonical/sitemap/robots 기준 사이트 URL |
| `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` | Naver Maps JS SDK 키 |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 Measurement ID |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile 사이트 키 |
| `NEXT_PUBLIC_SENTRY_DSN` | 프론트엔드 Sentry DSN |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | Toss Payments client key |
| `NEXT_PUBLIC_ADMIN_PUBLIC_LOGIN_ENABLED` | 관리자 공개 로그인 UI 노출 여부 |
| `ADMIN_PUBLIC_LOGIN_ENABLED`, `SEED_PUBLIC_ADMIN_EMAIL`, `SEED_PUBLIC_ADMIN_PASSWORD` | Next.js admin public-login API route 설정 |
| `JWT_SECRET`, `FRONTEND_URL`, `APP_URL` | 관리자 세션/서버 API route에서 사용 |

주의사항:

- `NAVER_SEARCH_*`와 `NAVER_CLIENT_*`는 서로 다른 용도의 키입니다.
- OAuth callback URL은 백엔드 도메인의 `/api/auth/{provider}/callback`이어야 합니다.
- `NEXT_PUBLIC_*` 값은 프론트엔드 이미지 빌드 시점에 반영됩니다.

## 로컬 개발

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
cd backend

# schema 변경 후 개발 마이그레이션 생성/적용
npx prisma migrate dev --name <migration_name>

# 배포 환경 마이그레이션 적용
npx prisma migrate deploy

# Prisma client 재생성
npx prisma generate

# seed 실행
npm run seed
```

## 품질 검증

### Backend

```bash
cd backend
npm run lint:check
npx tsc -p tsconfig.build.json --noEmit
npm run test
npm run test:e2e
npm run test:cov
```

참고: `npm run lint`는 `--fix`를 실행하므로 CI와 같은 검사만 필요하면 `npm run lint:check`를 사용합니다.

### Frontend

```bash
cd frontend
npm run lint:check
npx tsc --noEmit
npm run build
```

## Docker 및 배포

### 이미지

GHCR 이미지를 사용합니다.

- production: `ghcr.io/<owner>/ai-planner-backend:latest`, `ghcr.io/<owner>/ai-planner-frontend:latest`
- canary/test: `ghcr.io/<owner>/ai-planner-backend:canary`, `ghcr.io/<owner>/ai-planner-frontend:canary`
- 각 배포는 commit SHA 태그도 함께 생성합니다.

### 런타임

- production 도메인: `https://date-planner.us`
- test 도메인: `https://test.date-planner.us`
- production 앱 스택 기준 경로: `/srv/apps/ai-planner`
- test 앱 스택 기준 경로: `/srv/apps/ai-planner-test`
- reverse proxy: Nginx
- 컨테이너 구성: backend, frontend, postgres. 테스트 Compose 예시는 `infra/docker-compose.ai-planner.test.yml`에 있습니다.

## GitHub Actions

| 워크플로우 | 트리거 | 역할 |
| --- | --- | --- |
| `ci.yml` | PR | backend/frontend 변경 감지 후 typecheck, lint, Docker dry-run build |
| `canary.yml` | `canary` push | 변경된 서비스의 canary 이미지 build/push |
| `deploy-test.yml` | `Deploy Canary` 성공 | canary 이미지를 `test.date-planner.us` EC2 스택에 배포 |
| `deploy.yml` | `main` push | production 이미지 build/push 및 EC2 배포 |
| `auto-tag.yml` | `main` 대상 PR merge | `release:major/minor/patch` 라벨에 따라 SemVer 태그 생성 |
| `release.yml` | `v*` tag push | GitHub Release 생성 |

CI의 고정 job 이름은 `Backend CI`, `Frontend CI`입니다. 변경이 없는 영역은 성공 종료로 처리되므로 required checks와 연결하기 쉽습니다.

## 브랜치/릴리즈 흐름

```text
feature branch
  -> PR to canary
  -> CI 통과
  -> merge to canary
  -> canary 이미지 빌드
  -> test.date-planner.us 배포/검증
  -> PR from canary to main
  -> merge to main
  -> production deploy
  -> release label 기반 tag 생성
  -> GitHub Release 생성
```

- `canary`: 통합 개발 및 테스트 배포 기준 브랜치
- `main`: production release 브랜치
- `release:major`, `release:minor`, `release:patch` 라벨이 `main` merge PR에 붙으면 `auto-tag.yml`이 다음 SemVer 태그를 생성합니다.

## 트러블슈팅

| 증상 | 점검 포인트 |
| --- | --- |
| 장소 검색 결과가 부정확하거나 비어 있음 | `NAVER_SEARCH_CLIENT_ID/SECRET`, `KAKAO_REST_API_KEY`, 지역 정규화 로직 확인 |
| OAuth 로그인 후 프론트로 돌아오지 않음 | `FRONTEND_URL`, provider callback URL, OAuth 앱에 등록된 callback URL 일치 여부 확인 |
| 프론트에서 계속 401 후 로그인 화면으로 이동 | access/refresh token 저장 상태와 `/api/auth/refresh` 응답 확인 |
| 지도 대신 텍스트 fallback이 보임 | `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` 누락 여부 확인 |
| 결제 위젯이 로드되지 않음 | `NEXT_PUBLIC_TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`, 구독 금액 설정 확인 |
| 관리자 운영 로그/비용 화면이 비어 있음 | AWS credential, CloudWatch log group, Cost Explorer 권한 확인 |
| Sentry 관리자 화면이 비어 있음 | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` 확인 |
| 테스트 환경에서 스케줄러가 중복 실행됨 | `.env.test`의 `SCHEDULER_ENABLED=false` 확인 |
| 배포 후 env가 반영되지 않음 | 서버 `.env`, Compose `environment`, 프론트 빌드 시점 `NEXT_PUBLIC_*` 값 확인 |

## 관련 문서

- [release-versioning.md](./docs/release-versioning.md)

## 라이선스

별도 오픈소스 라이선스를 부여하지 않은 개인 프로젝트입니다.
