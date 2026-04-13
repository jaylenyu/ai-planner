# Dayplan — AI 일정 플래너

자연어 한 마디로 지역·활동 취향을 전달하면 AI가 즉시 일정, 실제 장소 후보, 이동 동선까지 제시하는 데이트·여행 플래너입니다.

**실서비스:** https://date-planner.us

---

## 주요 기능

- **대화형 입력** – “과천에서 데이트 코스 추천”처럼 자연어만 입력해도 위치·선호 활동·시간대를 파싱합니다.
- **AI 파이프라인** – OpenRouter(GPT-4o-mini)를 사용해 의도를 분석 → 활동 순서를 구성 → 요약 문구를 생성합니다.
- **실제 장소 검색** – NAVER Local Search API로 활동별 현장 후보를 가져오고, 3km 이내 최적 장소를 선별합니다.
- **경로 최적화** – 선택된 장소를 최소 이동거리 순으로 정렬하고, 체류 시간 기반의 타임라인을 생성합니다.
- **지도 미리보기** – NAVER Maps JS SDK로 동선·폴리라인·마커 UI를 보여주며, 키가 없을 땐 텍스트 카드로 대체합니다.
- **배포 자동화** – main 브랜치 푸시마다 GitHub Actions가 Docker 이미지를 GHCR에 빌드·푸시하고 EC2에서 compose 재시작.

## 아키텍처 & 폴더 구조

| 경로 | 설명 |
| --- | --- |
| `frontend/` | Next.js 16(App Router) 기반 웹 앱. auth 훅, 지도 컴포넌트, 글로벌 스타일 및 미들웨어 포함. |
| `backend/` | NestJS 11 API. AI 파이프라인, 인증/토큰, 이메일, 예산/분석 모듈과 Prisma 기반 DB 접속을 담당. |
| `.github/workflows/deploy.yml` | main 푸시 또는 수동 실행 시 Lint/TypeCheck → Docker Build(GHCR) → EC2 SSH 배포를 수행. |

**AI 파이프라인 흐름 (backend/src/modules/ai):**

1. `ParseInputStep` – 사용자 자연어를 GPT-4o-mini에 전달해 위치·활동·시간대 JSON을 얻습니다.
2. `ExtractIntentStep` – 위치 좌표를 사전/네이버 API로 동적으로 해석하고 활동을 NAVER 검색 쿼리로 변환합니다.
3. `SearchPlacesStep` – 활동별로 NAVER Local Search API(또는 mock)를 호출해 후보를 수집합니다.
4. `SelectCandidatesStep` – 요청 좌표 기준 3km 이내 장소를 우선 선택하며 거리 순으로 한 곳씩 고릅니다.
5. `OptimizeRouteStep` – 선택된 장소 간 이동거리를 계산해 최적 순서를 도출합니다.
6. `GenerateScheduleStep` – 체류 시간 룰 기반으로 타임라인, 요약, 지도 polyline을 생성합니다.

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | Next.js 16(App Router), React 19, Tailwind 4(PostCSS) |
| Backend | NestJS 11, Prisma, Passport(Email/OAuth: Google·Kakao·Naver) |
| Database | PostgreSQL (로컬: Docker, 운영: AWS RDS Aurora) |
| AI | OpenRouter API → GPT-4o-mini (JSON response mode) |
| 지도/검색 | NAVER Maps JS v3, NAVER Local Search(Open API) |
| 인프라 | Docker, GHCR, AWS EC2 + Docker Compose + Nginx |
| 배포 | GitHub Actions(`deploy.yml`) 자동 빌드·재배포 |

## 시작하기

### 1. 필수 도구

- Node.js 22.x (프로젝트 전역에서 사용)
- npm 10+
- Docker / Docker Compose (선택: 컨테이너 실행)

### 2. 환경 변수 구성

운영용 `.env.production.template`를 참고해 필요한 값을 채워주세요. 최소한 로컬 개발 시 아래 키가 필요합니다.

**Backend (`backend/.env`)**

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 연결 문자열. 로컬 Docker DB 또는 클라우드 DB를 지정합니다. |
| `OPENROUTER_API_KEY` | OpenRouter API 키. GPT-4o-mini 호출에 필요합니다. |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | 인증 토큰 발급 설정. |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | NAVER Local Search/Open API 키. 없으면 mock 장소가 사용됩니다. |
| `KAKAO_CLIENT_ID` 등 OAuth 키 | 카카오/네이버/애플 OIDC 사용 시 필요. | 
| `APP_URL`, `CORS_ORIGIN`, `FRONTEND_URL` | 프런트 앱 URL 및 CORS 허용 도메인. |

**Frontend (`frontend/.env.local`)**

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | 백엔드 API 루트 (예: `http://localhost:4000/api` 또는 `https://date-planner.us/api`). 자동으로 `/api`가 붙으므로 중복되지 않게 설정하세요. |
| `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` | NAVER Maps JS SDK용 ncpKeyId. 없으면 지도 미리보기가 텍스트 카드로 대체됩니다. |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | 선택: PostHog 분석 연동. |

### 3. 의존성 설치

```bash
# 루트에서 실행
cd backend && npm install && npx prisma generate && cd -
cd frontend && npm install && cd -
```

### 4. 로컬 실행

```bash
# 백엔드 (http://localhost:4000)
cd backend
npm run start:dev

# 프런트엔드 (http://localhost:3000)
cd frontend
npm run dev
```

프런트는 `NEXT_PUBLIC_API_URL`을 기준으로 백엔드 `/api` 엔드포인트를 호출합니다. 인증 토큰은 로컬 스토리지 기반 커스텀 훅(`src/hooks/useAuth.ts`)이 관리합니다.

### 5. Docker Compose (선택)

운영 서버에서는 `infra/docker-compose.ai-planner.prod.yml`(EC2 상 위치)에 맞춰 백엔드·프런트 컨테이너를 기동합니다. 동일 구성을 로컬에서 재현하려면 compose 파일을 참고해 환경 변수와 볼륨을 맞춰 주세요.

## 개발 가이드

- **Lint & Type Check**
  - Backend: `cd backend && npm run lint`
  - Frontend: `cd frontend && npm run lint`
- **테스트**
  - Backend 단위 테스트: `npm run test`
  - Backend e2e 테스트: `npm run test:e2e`
  - (프런트는 현재 테스트 스위트 없음)
- **Prisma 마이그레이션**
  - 스키마 수정 후 `npx prisma migrate dev --name <name>`
  - 프로덕션 반영 시 `npx prisma migrate deploy`

## 배포 파이프라인

`main` 브랜치에 푸시하거나 Actions 탭에서 `Deploy to Production` 워크플로를 수동 실행하면 아래 순서로 진행됩니다.

1. **changes job** – 어느 디렉터리가 변경됐는지 확인 후 필요없는 빌드를 스킵합니다.
2. **lint-and-typecheck** – Node 22에서 백/프런트 각각 npm ci → 타입체크 → lint.
3. **build-backend / build-frontend** – Docker Buildx로 GHCR에 이미지 푸시. 프런트 빌드 시 NAVER/API/PostHog 키를 build-arg로 주입합니다.
4. **deploy** – appleboy/ssh-action으로 EC2 접속 → 최신 이미지 pull → 기존 컨테이너 중지/삭제 → `docker compose -f ~/infra/docker-compose.ai-planner.prod.yml` 재기동 → 헬스체크.

배포 후에는 https://date-planner.us 에서 회원가입/로그인 및 일정 생성이 정상인지 확인하고, 지도 미리보기와 동선이 입력 지역을 반영하는지 검증하세요.

## 트러블슈팅

- **항상 강남 코스만 추천된다면** – 백엔드에 `NAVER_CLIENT_ID/SECRET`가 설정되지 않아 mock 데이터가 사용된 것입니다. 환경 변수를 채우고 재배포하세요.
- **지도 미리보기 카드만 보이는 경우** – 프런트 빌드에 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`가 주입되지 않았습니다. GitHub Secrets와 서버 `.env`에 값을 넣은 뒤 다시 빌드합니다.
- **AI 응답 JSON 파싱 오류** – OpenRouter 오류이거나 토큰 만료일 수 있습니다. API 키, 월간 예산(`api-budget` 모듈) 상태를 확인하세요.

## 라이선스

사내/개인 프로젝트로 사용 중이며 별도 라이선스는 부여되지 않았습니다. 필요한 경우 루트 패키지의 LICENSE 정책을 확인하거나 유지보수자에게 문의하세요.
