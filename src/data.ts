export type ViewKey = 'home' | 'explore' | 'sell' | 'analytics' | 'blog' | 'contact' | 'profile';

export interface GameMedia {
  cover: string;
  gallery: string[];
}

export interface GameListing {
  id: string;
  title: string;
  genre: string;
  studio: string;
  price: number;
  featured: boolean;
  rating: number;
  description: string;
  media: GameMedia;
}

function makeArtwork(label: string, colors: [string, string, string]) {
  const [firstColor, secondColor, thirdColor] = colors;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${label}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${firstColor}" />
          <stop offset="55%" stop-color="${secondColor}" />
          <stop offset="100%" stop-color="${thirdColor}" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" rx="40" fill="url(#bg)" />
      <circle cx="130" cy="110" r="78" fill="rgba(255,255,255,0.15)" />
      <circle cx="680" cy="130" r="120" fill="rgba(255,255,255,0.08)" />
      <rect x="80" y="360" width="640" height="120" rx="28" fill="rgba(0,0,0,0.22)" />
      <text x="80" y="455" fill="#ffffff" font-family="Space Grotesk, Arial, sans-serif" font-size="66" font-weight="700">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createGallery(label: string, colors: [string, string, string]) {
  return [
    makeArtwork(`${label} - Main`, colors),
    makeArtwork(`${label} - Scene`, [colors[1], colors[2], colors[0]]),
    makeArtwork(`${label} - Detail`, [colors[2], colors[0], colors[1]]),
  ];
}

export const navigationItems: Array<{ key: ViewKey; label: string; description: string }> = [
  { key: 'home', label: 'Home', description: 'Marketplace overview' },
  { key: 'explore', label: 'Explore', description: 'Discover indie games' },
  { key: 'sell', label: 'Sell Game', description: 'Publish and feature listings' },
  { key: 'analytics', label: 'Analytics', description: 'Track sales and growth' },
  { key: 'blog', label: 'Blog', description: 'Studio news and devlogs' },
  { key: 'contact', label: 'Contact', description: 'Location and support' },
  { key: 'profile', label: 'Profile', description: 'Personal settings' },
];

export const genreOptions = ['All', 'Action', 'Adventure', 'Puzzle', 'Roguelike', 'Narrative', 'Strategy', 'Simulation'];

// Original data - now using basic placeholders instead

export const blogPosts = [
  {
    title: 'Why indie storefronts need stronger discovery loops',
    tag: 'Marketplace Design',
    blurb: 'A practical look at recommendation systems, wishlists, and seller promotion slots.',
  },
  {
    title: 'Building a buyer journey that feels personal',
    tag: 'UX Notes',
    blurb: 'Personal dashboards, saved preferences, and contextual suggestions keep users engaged.',
  },
  {
    title: 'A clean launch checklist for solo game creators',
    tag: 'Seller Guide',
    blurb: 'Pricing, featuring, analytics, and payout workflows every seller should prepare.',
  },
];

export const socialLinks = [
  { label: 'Instagram', href: 'https://instagram.com', handle: '@gameforge' },
  { label: 'X', href: 'https://x.com', handle: '@gameforgehq' },
  { label: 'YouTube', href: 'https://youtube.com', handle: 'GameForge Studio' },
];

export const metrics = [
  { label: 'Live listings', value: '1,248' },
  { label: 'Monthly buyers', value: '32.4k' },
  { label: 'Seller payout rate', value: '94%' },
  { label: 'Featured conversions', value: '+28%' },
];

export const companyProfile = {
  name: 'Amina Rahman',
  role: 'Marketplace creator',
  city: 'Lahore, Pakistan',
  bio: 'Building a curated indie game marketplace with seller tools, buyer personalization, and promotion analytics.',
  avatar: 'AR',
  genres: ['Action', 'Narrative', 'Puzzle'],
};

// Placeholder featured games with basic data
export const featuredGames: GameListing[] = [
  {
    id: 'game-1',
    title: 'Game Title 1',
    genre: 'Action',
    studio: 'Studio Name',
    price: 9.99,
    featured: true,
    rating: 4.5,
    description: 'A placeholder game description.',
    media: {
      cover: makeArtwork('Game 1', ['#1b1530', '#22c7a8', '#ffb347']),
      gallery: createGallery('Game 1', ['#1b1530', '#22c7a8', '#ffb347']),
    },
  },
  {
    id: 'game-2',
    title: 'Game Title 2',
    genre: 'Adventure',
    studio: 'Studio Name',
    price: 14.99,
    featured: false,
    rating: 4.3,
    description: 'A placeholder game description.',
    media: {
      cover: makeArtwork('Game 2', ['#0f243d', '#6d9aff', '#98accb']),
      gallery: createGallery('Game 2', ['#0f243d', '#6d9aff', '#98accb']),
    },
  },
  {
    id: 'game-3',
    title: 'Game Title 3',
    genre: 'Puzzle',
    studio: 'Studio Name',
    price: 7.99,
    featured: true,
    rating: 4.7,
    description: 'A placeholder game description.',
    media: {
      cover: makeArtwork('Game 3', ['#07111f', '#ffb347', '#22c7a8']),
      gallery: createGallery('Game 3', ['#07111f', '#ffb347', '#22c7a8']),
    },
  },
];

export function buildRecommendations(preferredGenres: string[], searchQuery: string) {
  const query = searchQuery.trim().toLowerCase();
  return featuredGames
    .map((game) => {
      let score = 0;
      if (preferredGenres.includes(game.genre)) score += 3;
      if (game.title.toLowerCase().includes(query)) score += 2;
      if (game.description.toLowerCase().includes(query)) score += 1;
      return { ...game, score };
    })
    .filter((game) => game.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

export function findGameById(gameId: string) {
  return featuredGames.find((game) => game.id === gameId) ?? null;
}