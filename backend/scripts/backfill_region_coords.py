#!/usr/bin/env python3
"""
Naver Local Search API로 regions.json의 sido/sigungu 레코드와
인기 dong에 좌표(lat/lng)를 backfill.

재실행 가능 — backend/data/region_coords_cache.json에 중간 저장.
캐시 히트 시 API 호출 없이 건너뜀.

사용법:
  cd backend && python3 scripts/backfill_region_coords.py

환경변수 (backend/.env에서 자동 로드):
  NAVER_SEARCH_CLIENT_ID
  NAVER_SEARCH_CLIENT_SECRET
"""

import json
import os
import sys
import time
import random
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parents[1]
REGIONS_JSON = ROOT / 'src' / 'shared' / 'region' / 'regions.json'
CACHE_FILE = ROOT / 'data' / 'region_coords_cache.json'
ENV_FILE = ROOT / '.env'


def load_env(path: Path) -> None:
    """dotenv 없이 .env 파일 로드 (이미 설정된 변수는 덮어쓰지 않음)"""
    if not path.exists():
        return
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, val = line.partition('=')
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


load_env(ENV_FILE)

CLIENT_ID = os.environ.get('NAVER_SEARCH_CLIENT_ID', '')
CLIENT_SECRET = os.environ.get('NAVER_SEARCH_CLIENT_SECRET', '')

# backfill 우선 대상 dong (검색 빈도 높은 동/동네)
PRIORITY_DONGS = {
    '성수동1가', '성수동2가',  # 성수동
    '연남동',                    # 홍대 권역
    '이태원동', '한남동',        # 이태원/한남
    '명동',                      # 명동
    '잠실동',                    # 잠실
    '화양동',                    # 건대
    '서교동',                    # 홍대
    '역삼동',                    # 강남
    '청담동', '신사동', '압구정동',  # 압청신
    '망원동',                    # 망원
    '익선동', '삼청동',          # 종로 권역
    '우동',                      # 해운대
    '조양동',                    # 속초
    '연동',                      # 제주
}


def naver_geocode(query: str) -> Optional[dict]:
    """Naver Local Search API 호출. 최대 3회 재시도."""
    if not CLIENT_ID or not CLIENT_SECRET:
        print('ERROR: NAVER_SEARCH_CLIENT_ID / NAVER_SEARCH_CLIENT_SECRET 환경변수가 없습니다.',
              file=sys.stderr)
        sys.exit(1)

    encoded = urllib.parse.quote(query)
    url = (
        f'https://openapi.naver.com/v1/search/local.json'
        f'?query={encoded}&display=1&sort=comment'
    )

    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={
                'X-Naver-Client-Id': CLIENT_ID,
                'X-Naver-Client-Secret': CLIENT_SECRET,
            })
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read())
                item = (data.get('items') or [None])[0]
                if not item:
                    return None
                lat = int(item['mapy']) / 10_000_000
                lng = int(item['mapx']) / 10_000_000
                return {'lat': round(lat, 6), 'lng': round(lng, 6)}
        except urllib.error.HTTPError as e:
            if e.code == 401:
                print('ERROR: 401 Unauthorized — API 키를 확인하세요.', file=sys.stderr)
                sys.exit(1)
            if e.code == 429:
                wait = 1.5 * (attempt + 1) * (0.5 + random.random())
                print(f'  429 rate limit — {wait:.1f}s 대기')
                time.sleep(wait)
                continue
            print(f'  HTTP {e.code} (query: {query})')
            return None
        except Exception as exc:
            print(f'  오류: {query} — {exc}')
            if attempt < 2:
                time.sleep(0.5)

    return None


def build_queries(region: dict) -> list:
    """지역 레코드에서 지오코딩 쿼리 후보를 반환 (우선순위 순)"""
    name = region['shortName']
    sigungu = region.get('sigungu') or ''
    t = region['type']

    if t == 'sido':
        return [f'{name}청', name]
    if t == 'sigungu':
        if sigungu.endswith('구'):
            return [f'{name}구청', name]
        if sigungu.endswith('시'):
            return [f'{name}시청', name]
        if sigungu.endswith('군'):
            return [f'{name}군청', name]
        return [f'{name}청', name]
    # dong
    dong = region.get('dong') or ''
    return [dong, name] if dong != name else [name]


def should_backfill(region: dict) -> bool:
    if region.get('lat') and region.get('lng'):
        return False  # 이미 좌표 있음
    t = region['type']
    if t in ('sido', 'sigungu', 'landmark'):
        return True
    if t == 'dong':
        dong = region.get('dong') or ''
        return dong in PRIORITY_DONGS
    return False


def main() -> None:
    if not REGIONS_JSON.exists():
        print(f'ERROR: {REGIONS_JSON} 없음 — npm run regions:build 먼저 실행', file=sys.stderr)
        sys.exit(1)

    print(f'Loading {REGIONS_JSON}...')
    data = json.loads(REGIONS_JSON.read_text(encoding='utf-8'))
    regions = data['regions']

    # 캐시 로드
    cache: dict = {}
    if CACHE_FILE.exists():
        cache = json.loads(CACHE_FILE.read_text(encoding='utf-8'))
        print(f'캐시 로드: {len(cache)}개')

    targets = [r for r in regions if should_backfill(r)]
    print(f'대상: {len(targets)}개 (시도/시군구 전체 + 인기 dong {len(PRIORITY_DONGS)}개)')

    updated = 0
    failed = 0

    for i, region in enumerate(targets, 1):
        code = region['code']

        # 캐시 히트
        if code in cache:
            cached = cache[code]
            if cached:
                region['lat'] = cached['lat']
                region['lng'] = cached['lng']
                updated += 1
            continue

        queries = build_queries(region)
        coords = None
        for q in queries:
            coords = naver_geocode(q)
            if coords:
                break
            time.sleep(0.05)

        if coords:
            region['lat'] = coords['lat']
            region['lng'] = coords['lng']
            cache[code] = coords
            updated += 1
            print(f'  [{i:>4}/{len(targets)}] ✓ {region["shortName"]:<12} '
                  f'({coords["lat"]:.4f},{coords["lng"]:.4f})')
        else:
            cache[code] = None  # miss 캐시 (재시도 방지)
            failed += 1
            print(f'  [{i:>4}/{len(targets)}] ✗ {region["shortName"]}')

        # 100건마다 중간 저장
        if i % 100 == 0:
            _save(cache, data, REGIONS_JSON)
            print(f'  --- 중간 저장 ({i}/{len(targets)}) ---')

        time.sleep(0.12)  # ~8 req/s (Naver 무료 쿼터 여유)

    _save(cache, data, REGIONS_JSON)
    print(f'\n완료: 성공 {updated}개, 실패 {failed}개')
    print(f'캐시: {CACHE_FILE}')
    print(f'결과: {REGIONS_JSON}')


def _save(cache: dict, data: dict, output: Path) -> None:
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    CACHE_FILE.write_text(
        json.dumps(cache, ensure_ascii=False, indent=2), encoding='utf-8'
    )
    output.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8'
    )


if __name__ == '__main__':
    main()
