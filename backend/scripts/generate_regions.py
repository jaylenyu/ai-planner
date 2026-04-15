import csv
import json
import sys
from pathlib import Path
from typing import List, Optional, Dict, Set

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


SUBWAY_CSV = ROOT / 'data' / 'subway_stations.csv'


def load_subway_landmarks(csv_path: Path) -> List[dict]:
    """
    전국 도시철도역 CSV → type='landmark' 레코드 리스트.

    공공데이터포털 "전국 도시철도역 현황" CSV 예상 컬럼:
      역명, 노선명, 위도, 경도  (또는 영문 컬럼명 혼용)

    컬럼이 다를 경우 이 함수 내 컬럼명만 수정.
    """
    if not csv_path.exists():
        return []

    landmarks = []
    seen_names: set = set()

    try:
        with csv_path.open('r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames or []

            # 컬럼 자동 감지
            name_col = next((h for h in headers if '역명' in h or 'station' in h.lower()), None)
            lat_col  = next((h for h in headers if '위도' in h or 'lat' in h.lower()), None)
            lng_col  = next((h for h in headers if '경도' in h or 'lng' in h.lower() or 'lon' in h.lower()), None)

            if not name_col:
                print(f'WARNING: subway CSV 컬럼 미인식 (headers: {headers[:5]}) — landmark 건너뜀')
                return []

            for row in reader:
                name = (row.get(name_col) or '').strip()
                if not name or name in seen_names:
                    continue
                seen_names.add(name)

                lat = lng = None
                try:
                    if lat_col and lng_col:
                        lat = float(row[lat_col])
                        lng = float(row[lng_col])
                except (ValueError, KeyError):
                    pass

                station_name = name if name.endswith('역') else f'{name}역'
                short_name = name.rstrip('역')
                aliases = list({station_name, short_name, name})

                record: dict = {
                    'code': f'LM-{name}',
                    'name': station_name,
                    'shortName': short_name,
                    'type': 'landmark',
                    'aliases': sorted(aliases),
                }
                if lat and lng:
                    record['lat'] = round(lat, 6)
                    record['lng'] = round(lng, 6)
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

    # 지하철역 landmark 병합 (subway_stations.csv가 있을 때만)
    landmarks = load_subway_landmarks(SUBWAY_CSV)
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
