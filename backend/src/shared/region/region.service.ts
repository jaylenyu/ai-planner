import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { RegionDataset, RegionRecord } from './region.types';

@Injectable()
export class RegionService implements OnModuleInit {
  private canonicalMap = new Map<string, RegionRecord>();
  private aliasMap = new Map<string, RegionRecord>();
  private ready = false;

  onModuleInit(): void {
    if (this.ready) return;
    const filePath = join(__dirname, 'regions.json');
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
