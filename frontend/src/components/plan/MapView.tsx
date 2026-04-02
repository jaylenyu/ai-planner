'use client';

import { useEffect, useRef } from 'react';
import { PlanItem, TYPE_ICONS } from '../../lib/types';

interface MapViewProps {
  items: PlanItem[];
  polyline: [number, number][];
}

declare global {
  interface Window {
    naver: {
      maps: {
        Map: new (el: HTMLElement | string, opts: object) => NaverMap;
        LatLng: new (lat: number, lng: number) => NaverLatLng;
        Marker: new (opts: object) => NaverMarker;
        Polyline: new (opts: object) => void;
        InfoWindow: new (opts: object) => NaverInfoWindow;
        Size: new (w: number, h: number) => object;
        Point: new (x: number, y: number) => object;
        MarkerImage: new (url: string, size: object, opts?: object) => object;
        Event: {
          addListener: (target: object, event: string, handler: () => void) => void;
        };
      };
    };
    navermap_authFailure: () => void;
  }
}

interface NaverMap {
  setCenter(latlng: NaverLatLng): void;
  fitBounds(bounds: object): void;
}
interface NaverLatLng {
  lat(): number;
  lng(): number;
}
interface NaverMarker {
  getPosition(): NaverLatLng;
}
interface NaverInfoWindow {
  open(map: NaverMap, marker: NaverMarker): void;
  close(): void;
  getMap(): NaverMap | null;
}

const TYPE_COLORS: Record<string, string> = {
  food: '#ef4444',
  cafe: '#f59e0b',
  activity: '#6366f1',
  attraction: '#8b5cf6',
  rest: '#22c55e',
};

export function MapView({ items, polyline }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<NaverMap | null>(null);

  useEffect(() => {
    // 인증 실패 핸들러 (문서 권장)
    window.navermap_authFailure = () => {
      console.error('Naver Maps 인증 실패: ncpKeyId와 웹 서비스 URL을 확인하세요.');
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || items.length === 0) return;

    const initMap = () => {
      if (!window.naver?.maps || !mapRef.current) return;

      const center = new window.naver.maps.LatLng(items[0].lat, items[0].lng);
      // 문서 기준: 컨테이너 element와 옵션 객체 전달
      const map = new window.naver.maps.Map(mapRef.current, {
        center,
        zoom: 15,
      });
      mapInstanceRef.current = map;

      // InfoWindow (공유 인스턴스 — 하나만 열림)
      const infoWindow = new window.naver.maps.InfoWindow({ anchorSkew: true });

      // 마커 생성
      items.forEach((item) => {
        const markerContent = `
          <div style="
            background: ${TYPE_COLORS[item.type] ?? '#6366f1'};
            color: white;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 13px;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
          ">${item.order}</div>
        `;

        const infoContent = `
          <div style="padding:10px 14px;min-width:160px;font-family:sans-serif;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1e1e2e;">${item.name}</p>
            <p style="margin:0 0 2px;font-size:12px;color:#6366f1;">${item.time}</p>
            <p style="margin:0;font-size:11px;color:#888;">${item.address}</p>
          </div>
        `;

        const marker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(item.lat, item.lng),
          map,
          icon: { content: markerContent, anchor: new window.naver.maps.Point(16, 16) },
          title: item.name,
        });

        window.naver.maps.Event.addListener(marker, 'click', () => {
          if (infoWindow.getMap()) {
            infoWindow.close();
          } else {
            (infoWindow as unknown as { setContent: (c: string) => void }).setContent(infoContent);
            infoWindow.open(map, marker);
          }
        });
      });

      // 폴리라인
      if (polyline.length > 1) {
        new window.naver.maps.Polyline({
          path: polyline.map(([lat, lng]) => new window.naver.maps.LatLng(lat, lng)),
          map,
          strokeColor: '#6366f1',
          strokeWeight: 3,
          strokeOpacity: 0.8,
          strokeStyle: 'solid',
        });
      }
    };

    if (window.naver?.maps) {
      initMap();
    } else {
      // Naver Maps SDK가 아직 로드 안된 경우 대기
      const interval = setInterval(() => {
        if (window.naver?.maps) {
          clearInterval(interval);
          initMap();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [items, polyline]);

  const hasNaverKey = !!process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

  if (!hasNaverKey) {
    return (
      <div className="flex flex-col gap-3 rounded-xl bg-zinc-50 p-4 h-full min-h-[300px]">
        <p className="text-sm font-medium text-zinc-500">지도 미리보기 (NAVER_MAP_CLIENT_ID 필요)</p>
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.order} className="flex items-center gap-2 text-sm">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                {item.order}
              </span>
              <span>{TYPE_ICONS[item.type]}</span>
              <span className="font-medium">{item.name}</span>
              <span className="text-zinc-400">({item.lat.toFixed(4)}, {item.lng.toFixed(4)})</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-zinc-200"
      id="naver-map"
    />
  );
}
