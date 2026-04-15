import csv
import json
import math
import re
import sys
from pathlib import Path
from typing import List, Optional, Dict

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = ROOT / 'data' / 'legal_dong.csv'
TARGET_JSON = ROOT / 'src' / 'shared' / 'region' / 'regions.json'

CUSTOM_ALIAS_BY_FULL = {
    '서울특별시 마포구 서교동': ['홍대', '홍대입구', '홍대거리', '홍익대'],
    '서울특별시 강남구 역삼동': ['강남', '강남역'],
    '서울특별시 송파구 잠실동': ['잠실', '롯데월드', '석촌호수'],
    '서울특별시 성동구 성수동1가': ['성수', '성수동', '성수카페거리'],
    '서울특별시 성동구 성수동2가': ['성수'],
    '서울특별시 광진구 화양동': ['건대', '건대입구'],
    '서울특별시 용산구 이태원동': ['이태원'],
    '서울특별시 용산구 한남동': ['한남', '한남동', '한남동 카페거리'],
    '서울특별시 중구 명동': ['명동'],
    '부산광역시 해운대구 우동': ['해운대'],
    '강원특별자치도 속초시 조양동': ['속초'],
    '제주특별자치도 제주시 연동': ['제주', '제주시내'],
}

SUFFIXES = [
    '특별자치시',
    '특별시',
    '광역시',
    '자치구',
    '자치시',
    '시',
    '군',
    '구',
    '읍',
    '면',
    '동',
]

STOP_WORDS = {'', None}


def canonicalize(token: Optional[str]) -> Optional[str]:
    if not token:
        return None
    value = token.strip()
    if not value:
        return None
    for suffix in SUFFIXES:
        if value.endswith(suffix) and len(value) > len(suffix):
            value = value[: -len(suffix)]
            break
    return value.strip() or None


def build_aliases(
    sido: Optional[str],
    sigungu: Optional[str],
    dong: Optional[str],
    full_name: str,
) -> List[str]:
    aliases: set[str] = set()
    for part in (sido, sigungu, dong):
        if part:
            aliases.add(part)
            canon = canonicalize(part)
            if canon:
                aliases.add(canon)
    if sigungu and dong:
        aliases.add(f'{sigungu} {dong}')
        canon_sigungu = canonicalize(sigungu)
        canon_dong = canonicalize(dong)
        if canon_sigungu and canon_dong:
            aliases.add(f'{canon_sigungu} {canon_dong}')
            aliases.add(canon_sigungu + canon_dong)
    if full_name in CUSTOM_ALIAS_BY_FULL:
        aliases.update(CUSTOM_ALIAS_BY_FULL[full_name])
    return [alias for alias in aliases if alias not in STOP_WORDS]


def row_to_region(row: Dict[str, str]) -> Optional[Dict]:
    status = row.get('폐지여부') or row.get('폐지여부\ufeff') or row.get('폐지여부'.encode('utf-8').decode('utf-8', 'ignore'))
    if status != '존재':
        return None
    full_name = (row.get('법정동명') or '').strip()
    if not full_name:
        return None
    parts = full_name.split()
    if len(parts) < 1:
        return None
    sido = parts[0]
    sigungu = parts[1] if len(parts) >= 2 else None
    dong = parts[2] if len(parts) >= 3 else None
    code = (row.get('법정동코드') or '').strip()
    if not code:
        return None
    short_source = sigungu or sido
    short_name = canonicalize(short_source) or short_source
    if not short_name:
        return None
    region_type = 'dong' if dong else 'sigungu' if sigungu else 'sido'
    aliases = build_aliases(sido, sigungu, dong, full_name)
    if short_name not in aliases:
        aliases.append(short_name)
    return {
        'code': code,
        'name': full_name,
        'shortName': short_name,
        'type': region_type,
        'sido': sido,
        'sigungu': sigungu,
        'dong': dong,
        'aliases': sorted(set(aliases)),
    }


# ─── 지하철역 landmark 로딩 ───────────────────────────────────────────────────

ALL_SUBWAY_CSV = ROOT / 'data' / 'all_subway_stations.csv'


def korea_tm_to_wgs84(x: float, y: float) -> tuple[float, float]:
    """
    EPSG:2097 (Korea Central Belt, Bessel 1841) TM 좌표 → WGS84 위경도 변환.

    파라미터:
      lat_0=38°N, lon_0=127°E, false_easting=200000, false_northing=500000
      Bessel 1841: a=6377397.155m, f=1/299.1528128

    정확도: 약 50~200m (pyproj 없이 1차 근사).
    """
    a = 6377397.155            # Bessel semi-major axis (m)
    f = 1.0 / 299.1528128
    e2 = 2 * f - f * f        # eccentricity squared
    lat0 = math.radians(38.0)  # central latitude
    lon0 = math.radians(127.0) # central meridian
    x0 = 200000.0              # false easting
    y0 = 500000.0              # false northing

    # Northing 역산: 위도 1도 ≈ 자오선 호장
    # M(lat0) 계산 (자오선 호장 at origin)
    def meridional_arc(lat: float) -> float:
        e2_ = e2
        n = f / (2 - f)
        A0 = 1 - e2_ / 4 - 3 * e2_ ** 2 / 64
        A2 = 3 / 8 * (e2_ + e2_ ** 2 / 4)
        A4 = 15 / 256 * e2_ ** 2
        return a * (A0 * lat - A2 * math.sin(2 * lat) + A4 * math.sin(4 * lat))

    M0 = meridional_arc(lat0)
    M = M0 + (y - y0)          # northing to meridional arc

    # 역산 (Bowring 반복법 1회)
    mu = M / (a * (1 - e2 / 4 - 3 * e2 ** 2 / 64))
    e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))
    phi1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * math.sin(2 * mu) \
              + (21 * e1 ** 2 / 16) * math.sin(4 * mu) \
              - (151 * e1 ** 3 / 96) * math.sin(6 * mu)

    N1 = a / math.sqrt(1 - e2 * math.sin(phi1) ** 2)
    T1 = math.tan(phi1) ** 2
    C1 = e2 / (1 - e2) * math.cos(phi1) ** 2
    R1 = a * (1 - e2) / (1 - e2 * math.sin(phi1) ** 2) ** 1.5
    D = (x - x0) / N1

    lat_rad = phi1 - (N1 * math.tan(phi1) / R1) * (
        D ** 2 / 2
        - (5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * e2 / (1 - e2)) * D ** 4 / 24
    )
    lon_rad = lon0 + (
        D
        - (1 + 2 * T1 + C1) * D ** 3 / 6
    ) / math.cos(phi1)

    return round(math.degrees(lat_rad), 6), round(math.degrees(lon_rad), 6)


def parse_sigungu_from_address(address: str) -> Optional[str]:
    """
    기본주소에서 시군구 수준 단위를 추출해 canonicalize.
    예: "서울특별시 성동구 행당동" → "성동"
        "서울 마포구 동교동 165" → "마포"
        "서울특별시 강남구 선릉로 580" → "강남"
    """
    if not address:
        return None
    parts = address.strip().split()
    # 첫 번째 토큰 = 시도, 두 번째 토큰 = 시군구
    if len(parts) < 2:
        return None
    sigungu = parts[1]
    if sigungu.endswith(('구', '시', '군')):
        return canonicalize(sigungu)
    return None


def load_subway_landmarks(csv_path: Path) -> List[dict]:
    """
    all_subway_stations.csv → type='landmark' 레코드 리스트.

    사용 컬럼:
      지하철역명  — 역 이름 (일부 괄호 포함 가능, e.g. "신촌(경의중앙선)")
      기본주소    — 행정 주소 (시군구 파싱용)
      지하철역X좌표 — EPSG:2097 easting (m)
      지하철역Y좌표 — EPSG:2097 northing (m)

    처리:
      - 역명에서 괄호 부분 제거 → base_name (shortName / alias)
      - base_name 기준으로 중복 제거 (여러 호선 동일역)
      - X/Y를 WGS84 lat/lng으로 변환
      - 기본주소에서 시군구 파싱 → parentRegion (검색 힌트용)
    """
    if not csv_path.exists():
        print(f'WARNING: {csv_path.name} 없음 — landmark 건너뜀')
        return []

    landmarks = []
    seen_base: set[str] = set()

    try:
        with csv_path.open('r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)

            # BOM 또는 공백 포함 헤더 정규화
            raw_headers = reader.fieldnames or []
            header_map = {h.strip().lstrip('\ufeff'): h for h in raw_headers}

            def get_col(name: str) -> Optional[str]:
                return header_map.get(name)

            name_col = get_col('지하철역명')
            addr_col = get_col('기본주소')
            x_col    = get_col('지하철역X좌표')
            y_col    = get_col('지하철역Y좌표')

            if not name_col:
                print(f'WARNING: 지하철역명 컬럼 미인식 — landmark 건너뜀')
                return []

            for row in reader:
                raw_name = (row.get(name_col) or '').strip().lstrip('\ufeff')
                if not raw_name:
                    continue

                # 괄호 제거 → base_name (e.g. "신촌(경의중앙선)" → "신촌")
                base_name = re.sub(r'\(.*?\)', '', raw_name).strip()
                if not base_name or base_name in seen_base:
                    continue
                seen_base.add(base_name)

                # WGS84 변환
                lat = lng = None
                try:
                    if x_col and y_col:
                        x_val = float((row.get(x_col) or '').strip().lstrip('\ufeff'))
                        y_val = float((row.get(y_col) or '').strip().lstrip('\ufeff'))
                        if x_val and y_val:
                            lat, lng = korea_tm_to_wgs84(x_val, y_val)
                except (ValueError, KeyError):
                    pass

                # 기본주소 → parentRegion (시군구)
                address = (row.get(addr_col) or '').strip().lstrip('\ufeff') if addr_col else ''
                parent_region = parse_sigungu_from_address(address)

                # aliases: base_name, base_name+'역', 원본(괄호 포함), 원본+'역'
                aliases: set[str] = {base_name, base_name + '역'}
                if raw_name != base_name:
                    aliases.add(raw_name)
                    aliases.add(raw_name + '역')

                record: dict = {
                    'code': f'LM-{base_name}',
                    'name': base_name + '역',
                    'shortName': base_name,
                    'type': 'landmark',
                    'aliases': sorted(aliases),
                }
                if lat and lng:
                    record['lat'] = lat
                    record['lng'] = lng
                if parent_region:
                    record['parentRegion'] = parent_region
                if address:
                    record['address'] = address

                landmarks.append(record)

    except Exception as exc:
        print(f'WARNING: subway CSV 로드 실패 ({exc}) — landmark 건너뜀')
        return []

    print(f'Loaded {len(landmarks)} subway landmarks ← {csv_path.name}')
    return landmarks


def generate(csv_path: Path, output_path: Path) -> None:
    regions: list[dict] = []
    with csv_path.open('r', encoding='cp949') as f:
        reader = csv.DictReader(f)
        for row in reader:
            region = row_to_region(row)
            if region:
                regions.append(region)
    regions.sort(key=lambda r: r['code'])

    landmarks = load_subway_landmarks(ALL_SUBWAY_CSV)
    if landmarks:
        regions.extend(landmarks)
        print(f'Total after landmark merge: {len(regions)} records')

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps({'regions': regions}, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )
    print(f'Generated {len(regions)} regions → {output_path}')


if __name__ == '__main__':
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV
    if not csv_path.exists():
        raise SystemExit(f'CSV not found: {csv_path}')
    generate(csv_path, TARGET_JSON)
