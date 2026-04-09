# Dayplan — AI 일정 플래너

자연어 한마디로 완벽한 데이트 코스와 여행 일정을 만들어주는 AI 서비스.

**[https://date-planner.us](https://date-planner.us)**

## 주요 기능

- 자연어 입력 → AI가 최적 일정 자동 생성
- 데이트 코스 / 당일치기 여행 두 가지 모드
- 네이버 지도 기반 실제 장소 검색 및 경로 시각화
- 장소 간 이동 거리 및 동선 최적화

## 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | Next.js 16 (App Router, standalone) |
| Backend | NestJS 11 |
| Database | PostgreSQL (AWS RDS Aurora) |
| AI | OpenRouter → GPT-4o-mini |
| 지도 | Naver Maps JS API v3 + Local Search API |
| 인프라 | AWS EC2 + Docker Compose + Nginx |
| 배포 | GitHub Actions (main push → 자동 배포) |

## 로컬 실행

```bash
# 환경변수 설정
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# .env 파일에 API 키 입력

# 백엔드
cd backend && npm install && npm run start:dev

# 프론트엔드
cd frontend && npm install && npm run dev
```
