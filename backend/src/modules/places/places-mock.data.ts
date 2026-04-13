import { PlaceResult } from './places.service';

export const MOCK_PLACES: Record<string, PlaceResult[]> = {
  food: [
    {
      name: '스파게티아 강남점',
      lat: 37.4979,
      lng: 127.0276,
      category: '음식점 > 양식',
      address: '서울 강남구 강남대로 396',
    },
    {
      name: '트라토리아 서울',
      lat: 37.4985,
      lng: 127.0268,
      category: '음식점 > 이탈리아',
      address: '서울 강남구 역삼동 832',
    },
    {
      name: '올리브가든 강남',
      lat: 37.4991,
      lng: 127.0281,
      category: '음식점 > 양식',
      address: '서울 강남구 테헤란로 152',
    },
  ],
  activity: [
    {
      name: 'CGV 강남',
      lat: 37.5012,
      lng: 127.0262,
      category: '문화시설 > 영화관',
      address: '서울 강남구 강남대로 438',
    },
    {
      name: '롯데시네마 강남',
      lat: 37.5007,
      lng: 127.0255,
      category: '문화시설 > 영화관',
      address: '서울 강남구 강남대로 지하400',
    },
    {
      name: '강남 볼링장',
      lat: 37.502,
      lng: 127.029,
      category: '스포츠시설 > 볼링장',
      address: '서울 강남구 봉은사로 114',
    },
  ],
  cafe: [
    {
      name: '블루보틀 강남',
      lat: 37.502,
      lng: 127.024,
      category: '음식점 > 카페',
      address: '서울 강남구 도산대로 20',
    },
    {
      name: '스타벅스 강남점',
      lat: 37.4974,
      lng: 127.0282,
      category: '음식점 > 카페',
      address: '서울 강남구 강남대로 390',
    },
    {
      name: '폴바셋 강남',
      lat: 37.4968,
      lng: 127.0271,
      category: '음식점 > 카페',
      address: '서울 강남구 강남대로 362',
    },
  ],
  rest: [
    {
      name: '선릉 공원',
      lat: 37.5089,
      lng: 127.0488,
      category: '관광명소 > 공원',
      address: '서울 강남구 선릉로100길 1',
    },
    {
      name: '도산 공원',
      lat: 37.5234,
      lng: 127.0332,
      category: '관광명소 > 공원',
      address: '서울 강남구 도산대로45길 20',
    },
  ],
  attraction: [
    {
      name: 'COEX 아쿠아리움',
      lat: 37.5127,
      lng: 127.0592,
      category: '관광명소 > 수족관',
      address: '서울 강남구 영동대로 513',
    },
    {
      name: '봉은사',
      lat: 37.5152,
      lng: 127.0586,
      category: '관광명소 > 사찰',
      address: '서울 강남구 봉은사로 531',
    },
  ],
};

export function getMockPlaces(type: string): PlaceResult[] {
  return MOCK_PLACES[type] ?? MOCK_PLACES['activity'];
}
