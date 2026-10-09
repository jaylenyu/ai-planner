# ai-planner

자연어 일정 요청을 받아 실제 장소 후보, 이동 동선, 시간표를 생성하는 풀스택 AI 일정 플래너입니다.

- 서비스: `https://date-planner.us`
- 테스트: `https://test.date-planner.us`

## 목차

- [주요 기능](#주요-기능)
- [아키텍처](#아키텍처)
- [기술 스택](#기술-스택)
- [저장소 구조](#저장소-구조)
- [백엔드](#백엔드)
- [프론트엔드](#프론트엔드)
- [로컬 개발](#로컬-개발)
- [환경 변수](#환경-변수)
- [배포](#배포)
- [트러블슈팅](#트러블슈팅)

## 주요 기능

- 자연어 입력 기반 일정 생성 (미리보기 → 저장)
- Naver/Kakao 장소 검색 통합과 동선 최적화
- 플랜 편집, 일정 항목/메모, 카테고리, 공유
- 워크스페이스(커플 플랜) 초대와 공유 플랜
- 인앱 알림, Toss 구독 결제
- 관리자 콘솔: 사용자/플랜/청구, 운영 로그·비용·Sentry·GA4·API 사용량

## 아키텍처

```text
브라우저
  │ HTTPS
  ▼
Nginx (TLS 종료, 도메인/경로 라우팅)
  ├─ /api/admin/*  ─▶ frontend (Next.js route handler)
  ├─ /api/*        ─▶ backend  (NestJS) ─▶ PostgreSQL
  │                                      ─▶ OpenRouter(LLM), Naver/Kakao 검색
  └─ /*            ─▶ frontend (Next.js)
```

일정 생성 흐름:

1. 프론트엔드가 `POST /api/plan/preview`로 자연어 요청을 보냅니다.
2. 백엔드 AI 파이프라인이 입력 해석 → 장소 검색 → 후보 선택 → 동선 정렬 → 시간표 생성을 수행하고, 결과를 draft로 반환합니다. draft는 서버 메모리에 20분간 보관됩니다.
3. 사용자가 저장하면 `POST /api/plan/save`가 draft를 개인 또는 워크스페이스 플랜으로 DB에 저장합니다.

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, TanStack Query/Table, Zustand |
| Backend | NestJS 11, TypeScript, Passport, JWT, `@nestjs/schedule` |
| Database | PostgreSQL 16, Prisma 5 |
| Cache | Redis (선택, `ioredis`) |
| AI | OpenRouter (OpenAI SDK 호환 호출) |
| 지도/검색 | NAVER Maps JS SDK, NAVER Local Search API, Kakao Local API |
| 인증 | 이메일/비밀번호(이메일 인증), Google·Kakao·Naver OAuth |
| 결제 | Toss Payments 구독 |
| 분석/모니터링 | GA4, Sentry, AWS CloudWatch/Cost Explorer |
| 보안 | Cloudflare Turnstile |
| Infra | Docker Compose, GHCR, Nginx, AWS EC2 |
| CI/CD | GitHub Actions |

## 저장소 구조

```text
ai-planner/
├── .github/workflows/        # CI, 배포, 릴리스 자동화
├── backend/
│   ├── data/                 # 법정동/지하철역 원본 CSV
│   ├── prisma/               # schema, migrations, seed
│   ├── scripts/              # regions.json 생성 등 데이터 스크립트
│   ├── src/
│   │   ├── modules/          # 도메인 모듈
│   │   ├── shared/           # region, redis, captcha, utils
│   │   ├── services/         # API 예산 서비스
│   │   └── middleware/       # API 예산 미들웨어
│   └── test/                 # e2e
├── frontend/
│   └── src/
│       ├── app/              # App Router 페이지, admin API route
│       ├── components/       # custom(공통), ui, plan, payment, notification 등
│       ├── hooks/
│       ├── lib/              # API client, 세션, 타입, 서버 유틸
│       ├── stores/           # Zustand (authStore)
│       └── proxy.ts          # 보호 경로 인증 리다이렉트
├── infra/                    # prod/test Compose, Nginx 설정, 테스트 서버 초기화
├── scripts/                  # 서버 유틸 (CloudWatch agent 설치)
├── docs/                     # 릴리스/버저닝 정책
├── .env.production.template
└── .env.test.template
```

## 백엔드

### 모듈

`backend/src/app.module.ts` 기준입니다.

| 모듈 | 역할 |
| --- | --- |
| `AuthModule` | 이메일 가입/인증, 로그인, refresh/logout, OAuth, 비밀번호 설정·재설정, 닉네임·계정 설정, 탈퇴 |
| `PlacesModule` | Naver/Kakao 장소 검색, 지오코딩 |
| `AiModule` | 일정 생성 파이프라인 |
| `PlanModule` | draft 미리보기/저장, 플랜 CRUD, 일정 항목, 메모, 공유 |
| `CategoryModule` | 사용자별 카테고리 |
| `WorkspaceModule` | 워크스페이스, 초대 링크, 참여 |
| `NotificationModule` | 인앱 알림 |
| `PaymentModule` | Toss 결제 준비/승인/웹훅, 구독 상태/해지/재구독 |
| `ApiBudgetModule` | 일정 생성 API 일/월 사용량 제한 |
| `AdminModule` | 관리자 API (사용자/플랜/청구/운영 지표) |
| `UserModule` | 탈퇴 30일 경과 사용자 hard delete 스케줄러 |

- 전역 prefix는 `/api`이고 `/health`만 제외됩니다.
- `ApiBudgetMiddleware`는 `POST /api/plan/generate`, `POST /api/plan/preview`에 적용됩니다.

### AI 일정 생성 파이프라인

`backend/src/modules/ai/steps/`

```text
ParseInputStep → ExtractIntentStep → SearchPlacesStep
  → SelectCandidatesStep → OptimizeRouteStep → GenerateScheduleStep
```

| 단계 | 역할 |
| --- | --- |
| `ParseInputStep` | LLM으로 지역, 활동, 시간대, 선호를 구조화. 지역은 `regions.json` 기반 결정적 스캔을 우선 사용 |
| `ExtractIntentStep` | 지역명 정규화, 좌표 해석, 활동별 검색 intent 생성 |
| `SearchPlacesStep` | Naver/Kakao 검색 결과 병합, 이름 기준 중복 제거 |
| `SelectCandidatesStep` | 거리, 활동 적합도, 체인 패널티 등으로 후보 압축 |
| `OptimizeRouteStep` | 이동 거리를 줄이는 순서로 동선 정렬 |
| `GenerateScheduleStep` | 시간표, 요약, 지도 표시용 데이터 생성 |

### 지역 데이터

- `backend/src/shared/region/regions.json`: 국토부 법정동 코드(`backend/data/legal_dong.csv`)로 생성한 지역 사전입니다. 앱 시작 시 메모리에 로드합니다.
- 재생성: `npm run regions:build` (`scripts/generate_regions.py`)
- 사전에 없는 지역 토큰은 Redis에 기록하고, 5회 이상 나오면 alias로 승격합니다. Redis가 없으면 이 학습 기능은 꺼집니다.

### 주요 API

| 영역 | 엔드포인트 |
| --- | --- |
| Health | `GET /health`, `GET /api/version` |
| Auth | `POST /api/auth/email/{request-code,verify-code,check}`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/admin/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `POST /api/auth/logout-all`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `POST /api/auth/password/{setup-request,setup-verify}`, `PATCH /api/auth/{password,email,nickname,settings}`, `GET·DELETE /api/auth/me` |
| OAuth | `GET /api/auth/{google,kakao,naver}`, `GET /api/auth/{provider}/callback`, `POST /api/auth/oauth/complete`, `POST /api/auth/oauth/:provider/link-token`, `DELETE /api/auth/oauth/:provider` |
| Plan | `POST /api/plan/preview`, `POST /api/plan/save`, `POST /api/plan/generate`, `GET /api/plan/list`, `GET·PATCH·DELETE /api/plan/:id`, `POST /api/plan/:id/share`, `/api/plan/:id/items[/:itemId]`, `/api/plan/:id/memos[/:memoId]` |
| Category | `GET /api/category/list`, `POST /api/category`, `PATCH·DELETE /api/category/:id` |
| Workspace | `POST /api/workspace`, `GET /api/workspace/mine`, `POST /api/workspace/:id/invite`, `POST /api/workspace/join/:token`, `DELETE /api/workspace/:id` |
| Notification | `GET /api/notification/unread`, `PATCH /api/notification/read-all`, `PATCH /api/notification/:id/read` |
| Payment | `POST /api/payment/{prepare,confirm,webhook}`, `GET /api/subscription/status`, `DELETE /api/subscription/cancel`, `POST /api/subscription/resubscribe` |
| Budget | `GET /api/budget/usage`, `GET /api/budget/limits` |
| Admin | `GET /api/admin/summary`, `/api/admin/users[/:id]`(role/suspend), `/api/admin/plans`, `/api/admin/billing`, `/api/admin/ops/{logs,cost,sentry,ga4,api-usage}` |

### 데이터 모델

`backend/prisma/schema.prisma`

- `User`: 로컬/OAuth 계정, 역할(`Role`), 알림 설정, 소프트 삭제
- `RefreshToken`, `PasswordResetToken`: 세션 재발급, 비밀번호 재설정
- `Plan`, `PlanItem`, `PlanMemo`: 일정, 일정 항목, 메모
- `Category`: 사용자별 분류
- `Workspace`, `WorkspaceMember`, `WorkspaceInvite`: 공유 워크스페이스
- `Subscription`, `Payment`: Toss 구독 결제
- `Notification`: 인앱 알림
- `ApiUsage`: API 호출량/비용 추적

## 프론트엔드

### 라우팅

| 경로 | 설명 |
| --- | --- |
| `/` | 서비스 소개 |
| `/plan` | 일정 생성 |
| `/plans/[id]`, `/library`, `/library/plans/[id]` | 저장된 일정 |
| `/workspace`, `/workspace/plans/[id]`, `/workspace/settings`, `/workspace/join/[token]` | 워크스페이스, 공유 플랜, 초대 수락 |
| `/dashboard`, `/mypage`, `/settings` | 사용자 홈, 계정 설정 |
| `/subscribe`, `/subscribe/{success,fail}` | 구독 결제 |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/auth/oauth/complete` | 인증 |
| `/admin`, `/admin/{users,plans,billing,board,ops/*}`, `/admin/login` | 관리자 콘솔 |
| `/privacy`, `/terms` | 정책 |

- 존재하지 않는 경로는 `app/not-found.tsx`에서 `/`로 리다이렉트합니다.
- `src/proxy.ts`가 보호 경로(`/plan`, `/library`, `/workspace`, `/admin` 등)의 인증 여부를 확인해 로그인 화면으로 보냅니다.

### 클라이언트 구조

- `lib/api.ts`: `NEXT_PUBLIC_API_URL` 기준 API client. access token 첨부와 `401` 시 refresh 재시도를 처리합니다.
- `stores/authStore.ts`, `hooks/useAuth.ts`: 클라이언트 인증 상태
- `components/providers/QueryProvider.tsx`: TanStack Query client
- `app/api/admin/*`: 관리자 세션 쿠키와 백엔드 프록시를 처리하는 Next.js route handler
- 서버 사이드 요청은 Nginx를 거치지 않고 `BACKEND_URL`로 백엔드를 직접 호출합니다.

## 로컬 개발

### 요구사항

- Node.js 22.x, npm 10+
- PostgreSQL (로컬 또는 Docker)
- Python 3 (`regions.json` 재생성 시에만)

### 설치와 실행

```bash
# backend
cd backend
npm ci
npx prisma generate
npx prisma migrate dev
npm run start:dev        # http://localhost:4000

# frontend
cd frontend
npm ci
npm run dev              # http://localhost:3000
```

로컬 env 파일은 `backend/.env`와 `frontend/.env.local`을 사용합니다. 항목은 [환경 변수](#환경-변수)를 참고하세요.

### Prisma

```bash
cd backend
npx prisma migrate dev --name <migration_name>   # 마이그레이션 생성/적용
npx prisma migrate deploy                        # 배포 환경 적용 (컨테이너 기동 시 자동 실행)
npx prisma generate                              # client 재생성
npm run seed                                     # 관리자 계정 seed
```

### 품질 검증

```bash
# backend
cd backend
npm run lint:check
npx tsc -p tsconfig.build.json --noEmit
npm run test
npm run test:e2e

# frontend
cd frontend
npm run lint:check
npx tsc --noEmit
npm run build
```

`npm run lint`는 `--fix`를 실행합니다. CI와 같은 검사만 하려면 `lint:check`를 사용하세요.

## 환경 변수

배포 기준 예시는 `.env.production.template`, 테스트 기준 예시는 `.env.test.template`에 있습니다.

### Backend

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `PORT` | API 포트. 기본 `4000` |
| `FRONTEND_URL` | 프론트엔드 URL. OAuth 리다이렉트 기준 |
| `CORS_ORIGIN` | 허용 origin. 쉼표로 여러 개 지정 |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | JWT 서명 키, access token 만료 |
| `LINK_TOKEN_SECRET` | OAuth 계정 연결 토큰 키. 없으면 `JWT_SECRET` 사용 |
| `OPENROUTER_API_KEY` | LLM 호출 키 |
| `DAILY_API_LIMIT`, `MONTHLY_API_BUDGET` | 일정 생성 API 예산 |
| `NAVER_SEARCH_CLIENT_ID`, `NAVER_SEARCH_CLIENT_SECRET` | Naver 지역 검색 |
| `KAKAO_REST_API_KEY` | Kakao 장소 검색 |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS` | Redis. `REDIS_HOST`가 없으면 Redis 기능 전체 비활성화 |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `SUPPORT_EMAIL` | 메일 발송 |
| `TOSS_SECRET_KEY`, `TOSS_WEBHOOK_SECRET`, `SUBSCRIPTION_MONTHLY_AMOUNT` | Toss 결제/구독 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google OAuth |
| `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `KAKAO_CALLBACK_URL` | Kakao OAuth |
| `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `NAVER_CALLBACK_URL` | Naver OAuth |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Sentry 수집, 관리자 조회 |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | 관리자 운영 조회(CloudWatch, Cost Explorer) |
| `CLOUDWATCH_LOG_GROUP_BACKEND`, `CLOUDWATCH_LOG_GROUP_FRONTEND` | CloudWatch 로그 그룹 |
| `GA4_PROPERTY_ID`, `GOOGLE_APPLICATION_CREDENTIALS` | 관리자 GA4 조회. 서비스 계정 JSON 경로 (`GA4_CLIENT_EMAIL`/`GA4_PRIVATE_KEY`로 대체 가능) |
| `SCHEDULER_ENABLED` | `false`면 스케줄러 비활성화. 테스트 환경 중복 실행 방지 |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | `npm run seed` 관리자 계정 |

### Frontend

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | 백엔드 API 루트. 끝의 `/api` 유무 무관 |
| `BACKEND_URL` | 서버 사이드에서 직접 호출할 백엔드 URL |
| `NEXT_PUBLIC_SITE_URL` | canonical/sitemap/robots 기준 URL |
| `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` | Naver Maps JS SDK |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 Measurement ID |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile 사이트 키 |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | Toss client key |
| `NEXT_PUBLIC_ADMIN_PUBLIC_LOGIN_ENABLED` | 관리자 공개 로그인 UI 노출 |
| `ADMIN_PUBLIC_LOGIN_ENABLED`, `SEED_PUBLIC_ADMIN_EMAIL`, `SEED_PUBLIC_ADMIN_PASSWORD` | 관리자 공개 로그인 route 설정 |
| `JWT_SECRET`, `FRONTEND_URL`, `APP_URL` | 관리자 세션/서버 route |

주의:

- `NAVER_SEARCH_*`(검색 API)와 `NAVER_CLIENT_*`(OAuth)는 서로 다른 키입니다.
- OAuth callback URL은 `{백엔드 도메인}/api/auth/{provider}/callback`입니다.
- `NEXT_PUBLIC_*`는 프론트엔드 이미지 빌드 시점에 고정됩니다. 값을 바꾸면 이미지를 다시 빌드해야 합니다.
- 배포 서버에서는 `.env`에 추가하는 것만으로는 부족합니다. Compose 파일의 `environment`에도 등록해야 컨테이너에 전달됩니다.

## 배포

### 브랜치 흐름

```text
develop ──PR──▶ canary ──PR──▶ main
                  │               │
                  ▼               ▼
        test.date-planner.us   date-planner.us
                              + SemVer 태그 / GitHub Release
```

1. `develop`에서 작업한 뒤 `canary`로 PR을 엽니다. PR마다 CI가 실행됩니다.
2. `canary`에 머지하면 `:canary` 이미지를 빌드해 test 스택에 배포합니다.
3. 머지와 동시에 `canary → main` PR이 자동으로 생성됩니다.
4. test 환경에서 검증한 뒤 `main`에 머지하면 `:latest` 이미지를 빌드해 운영에 배포합니다.
5. 머지된 PR의 `release:*` 라벨로 SemVer 태그와 GitHub Release를 만듭니다. 라벨이 없으면 patch입니다.

자세한 정책은 [docs/release-versioning.md](./docs/release-versioning.md)를 참고하세요.

### GitHub Actions

| 워크플로 | 트리거 | 역할 |
| --- | --- | --- |
| `ci.yml` | PR | 변경 영역별 typecheck, lint, Docker dry-run build. job 이름 `Backend CI`/`Frontend CI`는 main 필수 체크 |
| `canary.yml` | `canary` push | `:canary` 이미지 build/push, test 스택 배포, 관리자 seed |
| `deploy-test.yml` | `Deploy Canary` 완료 | test 스택 배포 |
| `release-pr.yml` | `canary` push | 열린 `canary → main` PR이 없으면 생성 (`RELEASE_PR_TOKEN` 필요) |
| `deploy.yml` | `main` push | `:latest` 이미지 build/push, 운영 배포 |
| `auto-tag.yml` | `main` PR 머지 | 라벨 기반 SemVer 태그와 GitHub Release 생성 |
| `auto-assign.yml` | PR 생성 | assignee가 없으면 기본 지정 |
| `release.yml` | `v*` 태그 push | GitHub Release 생성 (수동 태그용) |

- CI는 단위 테스트(`jest`)를 실행하지 않습니다. 테스트는 로컬에서 직접 실행해야 합니다.
- 이미지 태그: 운영 `:latest`, `:<sha>` / 테스트 `:canary`, `:canary-<sha>` (`ghcr.io/<owner>/ai-planner-{backend,frontend}`)

### 런타임

단일 EC2 인스턴스에서 Docker로 운영합니다.

| 구성 | 경로/컨테이너 |
| --- | --- |
| 운영 스택 | `/srv/apps/ai-planner` (`ai-planner-backend`, `ai-planner-frontend`) |
| 테스트 스택 | `/srv/apps/ai-planner-test` (`ai-planner-backend-test`, `ai-planner-frontend-test`) |
| DB | `ai-planner-postgres` 하나를 공유하고 DB만 분리 (`aiplanner`, `aiplanner_test`) |
| Reverse proxy | `infra-nginx`. 설정 원본은 `infra/nginx-test-server-block.conf`, 서버 경로는 `/srv/infra/nginx/conf.d/` |
| TLS | Let's Encrypt (certbot) |

- Compose 원본: `infra/docker-compose.ai-planner.prod.yml`, `infra/docker-compose.ai-planner.test.yml`. 배포할 때 서버에 `compose.yml`로 동기화됩니다.
- 현재 Compose에는 Redis 서비스와 `REDIS_*` 환경변수가 없습니다. 운영과 테스트 모두 Redis 의존 기능(검색 캐시, 로그인 실패 잠금, 캡차 재사용 방지, alias 학습)이 꺼진 상태입니다.

## 트러블슈팅

| 증상 | 점검 포인트 |
| --- | --- |
| 장소 검색 결과가 비거나 부정확함 | `NAVER_SEARCH_*`, `KAKAO_REST_API_KEY`, `regions.json` 지역 매칭 |
| OAuth 후 프론트로 돌아오지 않음 | `FRONTEND_URL`, `*_CALLBACK_URL`, provider 콘솔에 등록한 callback URL |
| 401 후 계속 로그인 화면으로 이동 | 토큰 저장 상태, `/api/auth/refresh` 응답 |
| 지도 대신 텍스트가 보임 | `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` |
| 결제 위젯이 뜨지 않음 | `NEXT_PUBLIC_TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`, `SUBSCRIPTION_MONTHLY_AMOUNT` |
| 관리자 운영 로그/비용이 비어 있음 | AWS 자격 증명, CloudWatch 로그 그룹, Cost Explorer 권한 |
| 관리자 Sentry/GA4가 비어 있음 | `SENTRY_AUTH_TOKEN`/`ORG`/`PROJECT`, `GA4_PROPERTY_ID`와 서비스 계정 파일 |
| 스케줄러가 중복 실행됨 | 테스트 `.env`의 `SCHEDULER_ENABLED=false` |
| 배포 후 env가 반영되지 않음 | 서버 `.env`, Compose `environment`, 빌드 시점 `NEXT_PUBLIC_*` |
| `canary → main` PR이 자동 생성되지 않음 | `RELEASE_PR_TOKEN` 시크릿 |

## 라이선스

별도 오픈소스 라이선스를 부여하지 않은 개인 프로젝트입니다.
