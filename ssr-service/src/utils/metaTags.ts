// ssr-service/src/utils/metaTags.ts

interface MetaTags {
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogType: string;
  ogUrl: string;
  twitterCard: string;
}

export function getMetaTags(route: string): MetaTags {
  const baseUrl = process.env.BASE_URL || 'http://localhost';

  const metaMap: Record<string, MetaTags> = {
    home: {
      title: 'FT Transcendence - Multiplayer Pong Game',
      description: 'Play classic Pong with modern features. Real-time multiplayer, tournaments, AI opponents, and blockchain-powered leaderboards.',
      keywords: 'pong, multiplayer game, online game, tournament, blockchain, web game',
      ogTitle: 'FT Transcendence - Multiplayer Pong',
      ogDescription: 'Classic Pong reimagined with multiplayer, tournaments, and blockchain',
      ogType: 'website',
      ogUrl: `${baseUrl}/`,
      twitterCard: 'summary_large_image'
    },
    game: {
      title: 'Play Pong - FT Transcendence',
      description: 'Experience real-time Pong gameplay with 60 FPS server-side physics. Challenge friends or AI opponents.',
      keywords: 'play pong, online pong, multiplayer pong, real-time game',
      ogTitle: 'Play Pong Online - FT Transcendence',
      ogDescription: 'Real-time multiplayer Pong with 60 FPS gameplay',
      ogType: 'game',
      ogUrl: `${baseUrl}/game`,
      twitterCard: 'summary_large_image'
    },
    profile: {
      title: 'Player Profile - FT Transcendence',
      description: 'View player statistics, match history, and achievements in FT Transcendence.',
      keywords: 'player profile, game stats, match history, achievements',
      ogTitle: 'Player Profile - FT Transcendence',
      ogDescription: 'Player statistics and achievements',
      ogType: 'profile',
      ogUrl: `${baseUrl}/profile`,
      twitterCard: 'summary'
    },
    leaderboard: {
      title: 'Leaderboard - FT Transcendence',
      description: 'Top players ranked by wins, win rate, and tournament victories. Powered by blockchain.',
      keywords: 'leaderboard, rankings, top players, blockchain rankings',
      ogTitle: 'Global Leaderboard - FT Transcendence',
      ogDescription: 'Top players and blockchain-verified rankings',
      ogType: 'website',
      ogUrl: `${baseUrl}/leaderboard`,
      twitterCard: 'summary'
    }
  };

  return metaMap[route] || metaMap.home;
}

export function generateMetaHTML(meta: MetaTags): string {
  return `
    <!-- Primary Meta Tags -->
    <title>${meta.title}</title>
    <meta name="title" content="${meta.title}">
    <meta name="description" content="${meta.description}">
    <meta name="keywords" content="${meta.keywords}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="${meta.ogType}">
    <meta property="og:url" content="${meta.ogUrl}">
    <meta property="og:title" content="${meta.ogTitle}">
    <meta property="og:description" content="${meta.ogDescription}">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="${meta.twitterCard}">
    <meta property="twitter:url" content="${meta.ogUrl}">
    <meta property="twitter:title" content="${meta.ogTitle}">
    <meta property="twitter:description" content="${meta.ogDescription}">
  `;
}
