#!/usr/bin/env bash
# EC2에서 1회 실행하는 test 서버 초기 설정 스크립트
# 실행: ssh ec2-user@43.203.63.139 'bash -s' < infra/setup-test-server.sh
set -euo pipefail

STACK_DIR=/srv/apps/ai-planner-test
PROD_ENV=/srv/apps/ai-planner/.env
TEST_ENV=$STACK_DIR/.env

echo "=== [1] 디렉터리 생성 ==="
sudo mkdir -p "$STACK_DIR"
sudo chown "$(whoami)":"$(whoami)" "$STACK_DIR"

echo "=== [2] .env 복사 및 test 용 값 패치 ==="
cp "$PROD_ENV" "$TEST_ENV"

if [ -z "${TEST_DATABASE_URL:-}" ]; then
  echo "ERROR: TEST_DATABASE_URL 환경변수를 설정한 뒤 다시 실행하세요." >&2
  exit 1
fi

sed -i "s|DATABASE_URL=.*|DATABASE_URL=${TEST_DATABASE_URL}|" "$TEST_ENV"
sed -i 's|APP_URL=.*|APP_URL=https://test.date-planner.us|' "$TEST_ENV"
sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=https://test.date-planner.us|' "$TEST_ENV"
sed -i 's|CORS_ORIGIN=.*|CORS_ORIGIN=https://test.date-planner.us|' "$TEST_ENV"
sed -i 's|GOOGLE_CALLBACK_URL=.*|GOOGLE_CALLBACK_URL=https://test.date-planner.us/api/auth/google/callback|' "$TEST_ENV"
sed -i 's|KAKAO_CALLBACK_URL=.*|KAKAO_CALLBACK_URL=https://test.date-planner.us/api/auth/kakao/callback|' "$TEST_ENV"
sed -i 's|NAVER_CALLBACK_URL=.*|NAVER_CALLBACK_URL=https://test.date-planner.us/api/auth/naver/callback|' "$TEST_ENV"
sed -i 's|CLOUDWATCH_LOG_GROUP_BACKEND=.*|CLOUDWATCH_LOG_GROUP_BACKEND=/ai-planner-test/backend|' "$TEST_ENV"
sed -i 's|CLOUDWATCH_LOG_GROUP_FRONTEND=.*|CLOUDWATCH_LOG_GROUP_FRONTEND=/ai-planner-test/frontend|' "$TEST_ENV"

# SENTRY_ENVIRONMENT, SCHEDULER_ENABLED 추가 (없으면 append)
grep -q "^SENTRY_ENVIRONMENT=" "$TEST_ENV" \
  && sed -i 's|^SENTRY_ENVIRONMENT=.*|SENTRY_ENVIRONMENT=test|' "$TEST_ENV" \
  || echo "SENTRY_ENVIRONMENT=test" >> "$TEST_ENV"

grep -q "^SCHEDULER_ENABLED=" "$TEST_ENV" \
  && sed -i 's|^SCHEDULER_ENABLED=.*|SCHEDULER_ENABLED=false|' "$TEST_ENV" \
  || echo "SCHEDULER_ENABLED=false" >> "$TEST_ENV"

echo ".env 패치 완료: $TEST_ENV"

echo "=== [3] aiplanner_test DB 생성 ==="
TEST_DB_AUTHORITY=${TEST_DATABASE_URL#*://}
TEST_DB_CREDENTIALS=${TEST_DB_AUTHORITY%%@*}
TEST_DB_HOST_PATH=${TEST_DB_AUTHORITY#*@}
TEST_DB_USER=${TEST_DB_CREDENTIALS%%:*}
TEST_DB_NAME_WITH_QUERY=${TEST_DB_HOST_PATH#*/}
TEST_DB_NAME=${TEST_DB_NAME_WITH_QUERY%%\?*}

docker exec ai-planner-postgres psql -U "$TEST_DB_USER" -d postgres \
  -c "SELECT 1 FROM pg_database WHERE datname='${TEST_DB_NAME}'" \
  | grep -q 1 \
  && echo "$TEST_DB_NAME DB 이미 존재 — 건너뜀" \
  || docker exec ai-planner-postgres psql -U "$TEST_DB_USER" -d postgres \
       -c "CREATE DATABASE \"$TEST_DB_NAME\" OWNER \"$TEST_DB_USER\";"

echo "=== [4] compose.yml 심볼릭 링크 ==="
COMPOSE_SRC=~/infra/docker-compose.ai-planner.test.yml
if [ -f "$COMPOSE_SRC" ]; then
  ln -sf "$COMPOSE_SRC" "$STACK_DIR/compose.yml"
  echo "compose.yml 링크 생성: $STACK_DIR/compose.yml → $COMPOSE_SRC"
else
  echo "WARNING: $COMPOSE_SRC 가 없습니다. infra/ 디렉터리에 파일을 먼저 배포하세요."
fi

echo ""
echo "=== 초기 설정 완료 ==="
echo "다음 단계:"
echo "  1. ~/infra/docker-compose.ai-planner.test.yml 배포 (git 저장소 infra/ 참고)"
echo "  2. ~/infra/nginx/conf.d/ 에 test server 블록 추가 후 nginx reload"
echo "  3. DNS 콘솔에서 test.date-planner.us A 레코드 → 43.203.63.139 추가"
echo "  4. Google OAuth 콘솔에 test.date-planner.us redirect URI 추가"
echo "  5. canary 브랜치에 push → GitHub Actions deploy-test.yml 트리거"
