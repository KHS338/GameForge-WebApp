import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from './models/User.js';
import { Game } from './models/Game.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gameforge';

const buyerSeed = {
  email: 'buyer1@gameforge.com',
  username: 'buyer_one',
  password: '12345678',
  role: 'buyer' as const,
  walletBalance: 250,
  bio: 'I play story-rich indies and tactical co-op games.',
  avatar: 'BO',
};

const sellerSeed = {
  email: 'seller1@gameforge.com',
  username: 'seed_seller',
  password: '12345678',
  role: 'seller' as const,
  walletBalance: 120,
  bio: 'Studio account for curated indie drops.',
  avatar: 'SS',
};

const gameSeeds = [
  {
    title: 'Neon Drift: Outrun Protocol',
    genre: 'Racing',
    studio: 'Starline Circuit',
    description: 'Arcade racing through rain-soaked cybercity highways with lane combat, synthwave events, and short campaign chapters that unlock elite hypercars.',
    price: 24.99,
    discountPercent: 10,
    rating: 4.6,
    tags: ['Racing', 'Cyberpunk', 'Arcade', 'Singleplayer'],
    media: {
      cover: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  },
  {
    title: 'Ashfall Wardens',
    genre: 'Action',
    studio: 'Iron Lantern',
    description: 'Third-person action RPG set in a volcanic frontier where elemental loadouts, dodge timing, and faction choices shape each mission arc.',
    price: 34.99,
    discountPercent: 15,
    rating: 4.4,
    tags: ['Action RPG', 'Fantasy', 'Boss Fights', 'Loot'],
    media: {
      cover: 'https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  },
  {
    title: 'Tinwork Colony',
    genre: 'Simulation',
    studio: 'Mossbyte Labs',
    description: 'Build and automate a clockwork settlement on a hostile moon, balancing oxygen, morale, and machine maintenance over long survival runs.',
    price: 19.99,
    discountPercent: 0,
    rating: 4.5,
    tags: ['Simulation', 'Colony', 'Management', 'Strategy'],
    media: {
      cover: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  },
  {
    title: 'Echoes of Marrowdeep',
    genre: 'RPG',
    studio: 'Hollow Quill',
    description: 'Party-based narrative RPG with branching political quests, tactical turn combat, and companion trust systems in a subterranean kingdom.',
    price: 39.99,
    discountPercent: 20,
    rating: 4.8,
    tags: ['RPG', 'Story Rich', 'Turn-Based', 'Choices'],
    media: {
      cover: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  },
  {
    title: 'Bytebreak Arena',
    genre: 'Action',
    studio: 'Vertex Loop',
    description: 'Fast arena brawler with hero abilities, local co-op challenges, and daily score ladders designed for short but intense sessions.',
    price: 14.99,
    discountPercent: 5,
    rating: 4.2,
    tags: ['Action', 'Arena', 'Co-op', 'Indie'],
    media: {
      cover: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  },
  {
    title: 'Fable of the Glass Sea',
    genre: 'Adventure',
    studio: 'Dawn Cartography',
    description: 'Explore floating ruins with a compass-driven mystery system, environmental puzzles, and cinematic voice logs from vanished sailors.',
    price: 27.99,
    discountPercent: 10,
    rating: 4.7,
    tags: ['Adventure', 'Exploration', 'Puzzle', 'Atmospheric'],
    media: {
      cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  },
  {
    title: 'Midnight Freight',
    genre: 'Strategy',
    studio: 'Signal Forge',
    description: 'Real-time logistics strategy where you route trains across dangerous frontiers, defend depots, and negotiate contracts under pressure.',
    price: 21.99,
    discountPercent: 0,
    rating: 4.3,
    tags: ['Strategy', 'Management', 'Logistics', 'Real-Time'],
    media: {
      cover: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1465447142348-e9952c393450?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  },
  {
    title: 'Moonlit Heist Protocol',
    genre: 'Action',
    studio: 'Copper Fox Games',
    description: 'Stealth-action campaign about precision thefts in neon arcologies, featuring gadget crafting and replayable challenge modifiers.',
    price: 29.99,
    discountPercent: 25,
    rating: 4.5,
    tags: ['Stealth', 'Action', 'Heist', 'Replayable'],
    media: {
      cover: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1526401485004-2fda9f7f3f0e?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  },
  {
    title: 'Ruins of Alderkeep',
    genre: 'RPG',
    studio: 'Northwatch Interactive',
    description: 'Isometric action RPG with deep skill trees, cursed artifacts, and handcrafted dungeons that reward exploration and risk-taking.',
    price: 31.99,
    discountPercent: 10,
    rating: 4.6,
    tags: ['RPG', 'Dungeon Crawl', 'Loot', 'Fantasy'],
    media: {
      cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1516117172878-fd2c41f4a759?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  },
  {
    title: 'Circuit Chef Showdown',
    genre: 'Simulation',
    studio: 'Pixel Pantry',
    description: 'Multistation cooking simulator where you automate prep lines, design menus, and survive chaotic dinner rushes with optional co-op.',
    price: 16.99,
    discountPercent: 0,
    rating: 4.1,
    tags: ['Simulation', 'Cooking', 'Co-op', 'Casual'],
    media: {
      cover: 'https://images.unsplash.com/photo-1556911220-bda9f7f7597e?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1556911220-bda9f7f7597e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  },
  {
    title: 'Skyline Tactics',
    genre: 'Strategy',
    studio: 'Grid Anthem',
    description: 'Turn-based tactical warfare on vertical city maps with destructible cover, squad synergies, and roguelite campaign progression.',
    price: 28.99,
    discountPercent: 15,
    rating: 4.7,
    tags: ['Strategy', 'Tactics', 'Turn-Based', 'Roguelite'],
    media: {
      cover: 'https://images.unsplash.com/photo-1465446751832-9f11e8f3a63b?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1465446751832-9f11e8f3a63b?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  },
  {
    title: 'Quiet Harbor Stories',
    genre: 'Adventure',
    studio: 'Willow Ink',
    description: 'Narrative adventure following a small-town mystery told through letters, conversations, and exploration of a storm-battered coast.',
    price: 18.99,
    discountPercent: 0,
    rating: 4.4,
    tags: ['Adventure', 'Narrative', 'Indie', 'Mystery'],
    media: {
      cover: 'https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  },
  {
    title: 'Hollow Signal',
    genre: 'Horror',
    studio: 'Nocturne Foundry',
    description: 'Psychological survival horror set in a decommissioned relay station with diegetic clues, limited resources, and adaptive enemy behavior.',
    price: 22.99,
    discountPercent: 20,
    rating: 4.3,
    tags: ['Horror', 'Survival', 'Atmospheric', 'Singleplayer'],
    media: {
      cover: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  },
  {
    title: 'Verdant Forge',
    genre: 'Simulation',
    studio: 'Sprout Engine',
    description: 'Terraform and craft a living biome factory where each machine influences weather, growth cycles, and ecosystem stability.',
    price: 25.99,
    discountPercent: 5,
    rating: 4.5,
    tags: ['Simulation', 'Crafting', 'Automation', 'Sandbox'],
    media: {
      cover: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  },
  {
    title: 'Crimson Rally 198X',
    genre: 'Racing',
    studio: 'Backfire Club',
    description: 'Retro rally racer inspired by 80s road events with split weather routes, crunchy handling, and high-score ghost battles.',
    price: 17.99,
    discountPercent: 30,
    rating: 4.2,
    tags: ['Racing', 'Retro', 'Arcade', 'Time Trial'],
    media: {
      cover: 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  },
  {
    title: 'Oracle of Saltwind',
    genre: 'RPG',
    studio: 'Sable Meridian',
    description: 'Choice-driven fantasy RPG where prophecy fragments alter combat outcomes, alliances, and endings across a three-act campaign.',
    price: 36.99,
    discountPercent: 10,
    rating: 4.9,
    tags: ['RPG', 'Fantasy', 'Choices Matter', 'Story Rich'],
    media: {
      cover: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
      gallery: [
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  },
];

async function upsertUser(seed: typeof buyerSeed | typeof sellerSeed) {
  const existing = await User.findOne({ email: seed.email });
  if (existing) {
    let changed = false;

    if (existing.username !== seed.username) {
      existing.username = seed.username;
      changed = true;
    }

    if (existing.role !== seed.role) {
      existing.role = seed.role;
      changed = true;
    }

    existing.walletBalance = seed.walletBalance;
    existing.bio = seed.bio;
    existing.avatar = seed.avatar;
    changed = true;

    if (changed) {
      await existing.save();
    }

    return existing;
  }

  const created = await User.create(seed);
  return created;
}

async function seedGames(sellerId: string) {
  const existingGames = await Game.find({ sellerId }).select('_id title');
  if (existingGames.length > 0) {
    await Game.deleteMany({ sellerId });
  }

  const createdGames = await Promise.all(
    gameSeeds.slice(0, 15).map((game) =>
      Game.create({
        ...game,
        sellerId,
        published: true,
        featured: false,
        downloads: Math.floor(Math.random() * 1200) + 20,
        revenue: Math.floor(Math.random() * 25000) + 1000,
      })
    )
  );

  return createdGames;
}

async function run() {
  console.log('Seeding GameForge database...');
  await mongoose.connect(MONGODB_URI);

  try {
    const buyer = await upsertUser(buyerSeed);
    const seller = await upsertUser(sellerSeed);

    const games = await seedGames(seller._id.toString());

    seller.listings = games.map((game) => game._id);
    await seller.save();

    if (!buyer.notifications || buyer.notifications.length === 0) {
      buyer.notifications = [
        {
          title: 'Welcome to GameForge',
          detail: 'Your buyer account is ready. Explore discover to get personalized recommendations.',
          tone: 'success',
          category: 'system',
          read: false,
          createdAt: new Date(),
        },
      ] as any;
      await buyer.save();
    }

    console.log('Seed complete.');
    console.log(`Buyer: ${buyer.email} / password: 12345678`);
    console.log(`Seller: ${seller.email} / password: 12345678`);
    console.log(`Games inserted: ${games.length}`);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
