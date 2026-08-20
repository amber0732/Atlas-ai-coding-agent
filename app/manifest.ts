import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Anti-Gravity AI Agent',
    short_name: 'AntiGravity',
    description: 'Autonomous Coding Assistant Mobile Controller',
    start_url: '/',
    display: 'standalone', // Opens full-screen without browser URL bars
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
