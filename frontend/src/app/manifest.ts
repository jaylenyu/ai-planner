import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DatePlanner',
    short_name: 'DatePlanner',
    description: '자연어 한마디로 데이트 코스와 여행 일정을 만들어주는 AI 플래너',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#e07b39',
    icons: [
      {
        src: '/icon.png',
        sizes: 'any',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}
