import { Injectable, OnModuleInit } from '@nestjs/common';
import { existsSync } from 'fs';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { RegionDataset, RegionRecord } from './region.types';

// 위치 조사/어미 — 한글 청크 끝에서 제거해 지역명 원형을 복원
const TRAILING_PARTICLE_RE =
  /(?:에서|에|으로|로|부터|까지|은|는|이|가|도|만|씩|마저|조차|이라도|라도|이나|나|뿐|밖에|께서|께|와|과|랑|하고|쯤|정도|근처|주변|부근|일대|쪽|요)+$/;

function stripParticles(s: string): string {
  let prev = '';
  while (prev !== s && s.length) {
    prev = s;
    s = s.replace(TRAILING_PARTICLE_RE, '').trim();
  }
  return s;
}

// type 우선순위: landmark(4) > dong(3) > sigungu(2) > sido(1)
const TYPE_PRIORITY: Record<string, number> = {
  landmark: 4,
  dong: 3,
  sigungu: 2,
  sido: 1,
};

export interface ScanMatch {
  token: string;
  region: RegionRecord;
}

@Injectable()
export class RegionService implements OnModuleInit {
  private canonicalMap = new Map<string, RegionRecord>();
  private aliasMap = new Map<string, RegionRecord>();
  private ready = false;

  onModuleInit(): void {
    if (this.ready) return;
    const filePath = this.resolveRegionsFilePath();
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as RegionDataset;

    data.regions.forEach((region) => {
      this.canonicalMap.set(region.shortName, region);
      this.aliasMap.set(region.shortName, region);
      this.aliasMap.set(region.name, region);
      region.aliases.forEach((alias) => {
        this.aliasMap.set(alias, region);
      });
    });

    this.ready = true;
  }

  private resolveRegionsFilePath(): string {
    const candidates = [
      join(__dirname, 'regions.json'),
      resolve(process.cwd(), 'src/shared/region/regions.json'),
      resolve(process.cwd(), 'dist/src/shared/region/regions.json'),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    throw new Error(
      `regions.json 파일을 찾을 수 없습니다. 시도한 경로: ${candidates.join(', ')}`,
    );
  }

  getRegion(input: string): RegionRecord | null {
    if (!input) return null;
    const region = this.aliasMap.get(input.trim());
    return region ?? null;
  }

  normalize(input: string): string | null {
    const region = this.getRegion(input);
    return region?.shortName ?? null;
  }

  isValid(input: string): boolean {
    return this.normalize(input) !== null;
  }

  /**
   * 런타임에 동적으로 alias를 추가 (alias 자동 학습 시 사용).
   * 기존 canonical 항목이 있으면 그 항목에 alias를 연결, 없으면 무시.
   */
  addDynamicAlias(token: string, canonical: string): void {
    const region = this.canonicalMap.get(canonical);
    if (!region) return;
    if (!this.aliasMap.has(token)) {
      this.aliasMap.set(token, region);
    }
  }

  /**
   * 텍스트에서 aliasMap에 매칭되는 모든 지역 토큰을 스캔해 반환.
   *
   * 처리 순서:
   * 1. 한글 연속 청크([가-힣]+) 추출
   * 2. 각 청크에서 조사 제거 후 aliasMap 직접 lookup
   * 3. 매칭 없으면 청크 내 부분 문자열(최장 우선)로 재시도
   *
   * 결과에서 동일 region code 중복은 제거(첫 번째 매칭만 유지).
   */
  scanAll(text: string): ScanMatch[] {
    if (!text) return [];

    const results: ScanMatch[] = [];
    const seenCode = new Set<string>();
    const chunks = text.match(/[가-힣]+/g) ?? [];

    for (const chunk of chunks) {
      const stripped = stripParticles(chunk);

      // 조사 제거 버전을 먼저 시도, 원본도 시도
      const candidates = stripped === chunk ? [chunk] : [stripped, chunk];

      let matched = false;
      for (const candidate of candidates) {
        if (candidate.length < 2) continue;
        const region = this.aliasMap.get(candidate);
        if (region && !seenCode.has(region.code)) {
          seenCode.add(region.code);
          results.push({ token: candidate, region });
          matched = true;
          break;
        }
      }

      // 전체 청크 매칭 실패 시 부분 문자열 탐색 (최장 우선).
      // "홍대입구에서먹자" 같이 조사가 중간에 끼인 경우 대비.
      if (!matched) {
        outer: for (let len = Math.min(chunk.length - 1, 8); len >= 2; len--) {
          for (let start = 0; start + len <= chunk.length; start++) {
            const sub = chunk.slice(start, start + len);
            const region = this.aliasMap.get(sub);
            if (region && !seenCode.has(region.code)) {
              seenCode.add(region.code);
              results.push({ token: sub, region });
              break outer;
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * 텍스트에서 가장 구체적인 지역명을 반환.
   *
   * 우선순위: landmark > dong > sigungu > sido
   * 같은 타입이면 토큰 길이가 긴 쪽 우선 (더 구체적인 alias).
   *
   * dong 타입 → matched token 반환 (성동 대신 성수동 보존).
   * sigungu/sido 타입 → shortName 반환 (canonical name).
   */
  resolveBest(text: string): string | null {
    const matches = this.scanAll(text);
    if (matches.length === 0) return null;

    matches.sort((a, b) => {
      const pa = TYPE_PRIORITY[a.region.type] ?? 0;
      const pb = TYPE_PRIORITY[b.region.type] ?? 0;
      if (pa !== pb) return pb - pa;
      return b.token.length - a.token.length;
    });

    const { token, region } = matches[0];
    // dong: shortName은 sigungu 이름이므로 matched token 반환 (성동 대신 성수동 보존)
    // landmark/sigungu/sido: shortName이 canonical name
    if (region.type === 'dong') {
      return token;
    }
    return region.shortName;
  }

  /** @deprecated use scanAll + resolveBest */
  extractCandidates(text: string): string[] {
    if (!text) return [];
    const matches = text.match(/[가-힣]{2,10}/g) ?? [];
    const results: string[] = [];
    const seen = new Set<string>();

    for (const token of matches) {
      const region = this.getRegion(token);
      if (region && !seen.has(region.shortName)) {
        seen.add(region.shortName);
        results.push(region.shortName);
      }
    }

    return results;
  }
}
