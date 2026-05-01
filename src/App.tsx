import { useEffect, useMemo, useState, useRef, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Bell,
  Gamepad2,
  LogOut,
  Menu,
  PlusCircle,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Trash2,
  ArrowLeft,
  DollarSign,
  BellOff,
} from 'lucide-react';
import { authApi, clearToken, gamesApi, transactionsApi, adminApi, getToken, type ApiGame, type ApiUser, type CreateGamePayload, type ApiTransaction } from './api';
import { genreOptions } from './data';
import { login, logout, type RootState, type UserProfile } from './store';

type AuthMode = 'login' | 'signup' | 'admin-login';
type ViewKey = 'home' | 'games' | 'sell' | 'profile' | 'cart' | 'payment' | 'detail' | 'library' | 'sales' | 'admin';

type Role = 'buyer' | 'seller' | 'admin';

const emptyAuthForm: { name: string; email: string; password: string; role: Role } = {
  name: '',
  email: '',
  password: '',
  role: 'buyer',
};

const emptyGameForm = {
  title: '',
  genre: 'Action',
  studio: '',
  description: '',
  price: '',
  tags: [] as string[],
  coverImage: '',
  galleryImages: [] as string[],
  discountPercent: '0',
};

const discountOptions = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

const buyerViews: ViewKey[] = ['home', 'games', 'library', 'cart', 'profile'];
const sellerViews: ViewKey[] = ['home', 'sell', 'sales', 'profile'];
const adminViews: ViewKey[] = ['home', 'admin', 'profile'];

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return 'GF';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

function buildPlaceholderCover(label: string) {
  const safeLabel = label.trim() || 'Game';
  const shortLabel = safeLabel.length > 18 ? `${safeLabel.slice(0, 18)}...` : safeLabel;
  const mark = initials(safeLabel);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10213e" />
          <stop offset="55%" stop-color="#18345c" />
          <stop offset="100%" stop-color="#22c7a8" />
        </linearGradient>
      </defs>
      <rect width="900" height="1200" rx="72" fill="url(#bg)" />
      <circle cx="724" cy="184" r="150" fill="rgba(255,255,255,0.12)" />
      <circle cx="170" cy="1020" r="190" fill="rgba(255,179,71,0.16)" />
      <text x="72" y="858" fill="#ffffff" font-family="Space Grotesk, sans-serif" font-size="88" font-weight="700">${shortLabel}</text>
      <text x="72" y="960" fill="rgba(255,255,255,0.82)" font-family="Sora, sans-serif" font-size="54" font-weight="600">${mark}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function mapUser(user: ApiUser): UserProfile {
  return {
    id: user._id,
    name: user.username,
    email: user.email,
    role: user.role === 'admin' ? 'admin' : user.role === 'seller' ? 'seller' : 'buyer',
    walletBalance: user.walletBalance ?? 0,
    notificationsEnabled: user.notificationsEnabled ?? true,
    notifications: (user.notifications ?? []).map((notification) => ({
      id: notification._id,
      title: notification.title,
      detail: notification.detail,
      tone: notification.tone,
      category: notification.category,
      read: notification.read,
      createdAt: notification.createdAt,
    })),
    city: '',
    bio: user.bio ?? '',
    avatar: user.avatar ?? initials(user.username),
    genres: ['Action', 'Adventure', 'Puzzle'],
    purchases: user.purchases ?? [],
    listings: user.listings ?? [],
  };
}

function getDiscountPercent(game: ApiGame) {
  return Number(game.discountPercent ?? 0);
}

function getDiscountedPrice(game: ApiGame) {
  const percent = getDiscountPercent(game);
  return Number((game.price * (1 - percent / 100)).toFixed(2));
}

function isGameCurrentlyFeatured(game: ApiGame) {
  if (!game.featureExpiresAt) return false;
  return new Date() < new Date(game.featureExpiresAt);
}

function getFeatureExpiryDate(game: ApiGame) {
  if (!game.featureExpiresAt) return null;
  const date = new Date(game.featureExpiresAt);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function App() {
  const dispatch = useDispatch();
  const session = useSelector((state: RootState) => state.session);
  const [booting, setBooting] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [activeView, setActiveView] = useState<ViewKey>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [games, setGames] = useState<ApiGame[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [gameMessage, setGameMessage] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ name: '', bio: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [gameForm, setGameForm] = useState(emptyGameForm);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [gameEditForm, setGameEditForm] = useState({
    title: '',
    genre: 'Action',
    studio: '',
    description: '',
    price: '',
    tags: [] as string[],
    coverImage: '',
    galleryImages: [] as string[],
    discountPercent: '0',
    published: true,
  });
  const [tagInput, setTagInput] = useState('');
  const [galleryInput, setGalleryInput] = useState('');
  const [createTagInput, setCreateTagInput] = useState('');
  const [createGalleryInput, setCreateGalleryInput] = useState('');

  // Transaction State
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionFilters, setTransactionFilters] = useState({
    startDate: '',
    endDate: '',
    gameId: '',
  });

  // Admin State
  const [adminTransactions, setAdminTransactions] = useState<ApiTransaction[]>([]);
  const [adminTransactionsLoading, setAdminTransactionsLoading] = useState(false);
  const [adminTransactionFilters, setAdminTransactionFilters] = useState({
    startDate: '',
    endDate: '',
    gameName: '',
    category: '',
    userId: '',
  });
  const [allUsers, setAllUsers] = useState<ApiUser[]>([]);
  const [allUsersLoading, setAllUsersLoading] = useState(false);
  const [topUpUserId, setTopUpUserId] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpMessage, setTopUpMessage] = useState<string | null>(null);

  // Review State
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  const isAdminUser = (session.user?.role as string | undefined) === 'admin';
  const platformWallet = useMemo(() => {
    return adminTransactions.reduce((sum, tx) => {
      if (tx.type === 'sale') return sum + (tx.platformCut || 0);
      if (tx.type === 'feature_fee') return sum + (tx.totalPrice || Math.abs(tx.amount || 0));
      return sum;
    }, 0);
  }, [adminTransactions]);

  const featuredGames = useMemo(() => games.filter((game) => game.featured), [games]);

  const featuredRef = useRef<HTMLDivElement | null>(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  useEffect(() => {
    if (featuredGames.length === 0) return;
    const id = setInterval(() => {
      setFeaturedIndex((i) => (i + 1) % featuredGames.length);
    }, 5000);
    return () => clearInterval(id);
  }, [featuredGames.length]);

  useEffect(() => {
    const el = featuredRef.current;
    if (!el || featuredGames.length === 0) return;
    const child = el.children[featuredIndex] as HTMLElement | undefined;
    if (child) {
      try {
        child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      } catch {
        el.scrollTo({ left: Math.max(0, child.offsetLeft - 8), behavior: 'smooth' });
      }
    }
  }, [featuredIndex, featuredGames.length]);

  const role = session.user?.role ?? 'buyer';
  const notificationsEnabled = session.user?.notificationsEnabled ?? true;
  const sidebarNotifications = session.user?.notifications ?? [];
  const unreadNotificationCount = sidebarNotifications.filter((notification) => !notification.read).length;
  const navItems = role === 'admin' ? adminViews : (role === 'seller' ? sellerViews : buyerViews);
  const cartGames = useMemo(() => games.filter((game) => cartIds.includes(game._id)), [cartIds, games]);
  const cartTotal = useMemo(() => cartGames.reduce((sum, game) => sum + getDiscountedPrice(game), 0), [cartGames]);
  const selectedGame = useMemo(() => games.find((game) => game._id === selectedGameId) ?? null, [games, selectedGameId]);
  const filteredGames = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return games.filter((game) => {
      // Check genre filter
      if (selectedGenre !== 'All' && game.genre !== selectedGenre) {
        return false;
      }

      // Check search query
      if (query && !`${game.title} ${game.genre} ${game.studio}`.toLowerCase().includes(query)) {
        return false;
      }

      return true;
    });
  }, [games, searchQuery, selectedGenre]);
  const ownGames = useMemo(() => {
    if (!session.user) {
      return [] as ApiGame[];
    }

    const userId = session.user.id;

    return games.filter((game) => typeof game.sellerId !== 'string' && game.sellerId._id === userId);
  }, [games, session.user]);

  const selectedGameGallery = useMemo(() => {
    if (!selectedGame) {
      return [] as string[];
    }

    const gallery = selectedGame.media?.gallery?.filter((image) => image.trim()) ?? [];
    if (gallery.length > 0) {
      return gallery;
    }

    const cover = selectedGame.media?.cover?.trim() ? selectedGame.media.cover : buildPlaceholderCover(selectedGame.title);
    return [cover, buildPlaceholderCover(`${selectedGame.title} 2`), buildPlaceholderCover(`${selectedGame.title} 3`)];
  }, [selectedGame]);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    // reset main image when changing games
    setSelectedImageIndex(0);
  }, [selectedGame]);

  useEffect(() => {
    if (!selectedGameGallery || selectedGameGallery.length <= 1) return;
    const id = setInterval(() => {
      setSelectedImageIndex((i) => (i + 1) % selectedGameGallery.length);
    }, 3000);
    return () => clearInterval(id);
  }, [selectedGameGallery]);

  // Achievement system
  const purchasedGames = useMemo(() => {
    if (typeof session.user?.purchases === 'string') return [];
    return (session.user?.purchases ?? []).filter(Boolean) as any[];
  }, [session.user?.purchases]);

  const totalSpent = useMemo(() => {
    return purchasedGames.reduce((sum, game) => {
      const gamePrice = typeof game === 'object' && game?.price ? game.price : 0;
      return sum + gamePrice;
    }, 0);
  }, [purchasedGames]);

  interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
  }

  const achievements: Achievement[] = useMemo(() => [
    {
      id: 'first-game',
      title: 'First Game',
      description: 'Purchase your first game',
      icon: '🎮',
      unlocked: purchasedGames.length >= 1,
    },
    {
      id: 'collector',
      title: 'Collector',
      description: 'Own 5+ games',
      icon: '📚',
      unlocked: purchasedGames.length >= 5,
    },
    {
      id: 'gaming-enthusiast',
      title: 'Gaming Enthusiast',
      description: 'Own 10+ games',
      icon: '⭐',
      unlocked: purchasedGames.length >= 10,
    },
    {
      id: 'spender-100',
      title: 'Big Spender',
      description: 'Spend $100',
      icon: '💰',
      unlocked: totalSpent >= 100,
    },
    {
      id: 'spender-500',
      title: 'Gold Buyer',
      description: 'Spend $500',
      icon: '👑',
      unlocked: totalSpent >= 500,
    },
    {
      id: 'spender-1000',
      title: 'Whale',
      description: 'Spend $1000',
      icon: '🐋',
      unlocked: totalSpent >= 1000,
    },
  ], [purchasedGames.length, totalSpent]);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      const token = getToken();
      if (!token) {
        if (mounted) {
          setBooting(false);
        }
        return;
      }

      try {
        const currentUser = await authApi.getCurrentUser();
        if (!mounted) {
          return;
        }
        dispatch(login(mapUser(currentUser)));
      } catch {
        clearToken();
        dispatch(logout());
      } finally {
        if (mounted) {
          setBooting(false);
        }
      }
    }

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!session.isAuthenticated) {
      return;
    }

    const token = getToken();
    if (!token) {
      return;
    }

    let mounted = true;
    const stream = new EventSource(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/me/notifications/stream?token=${encodeURIComponent(token)}`);

    const refreshCurrentUser = async () => {
      try {
        const currentUser = await authApi.getCurrentUser();
        if (mounted) {
          dispatch(login(mapUser(currentUser)));
        }
      } catch (error) {
        console.error('Could not refresh current user:', error);
      }
    };

    stream.addEventListener('notification', () => {
      void refreshCurrentUser();
    });

    stream.onerror = () => {
      // Browser will retry automatically; keep the UI on the last known state.
    };

    return () => {
      mounted = false;
      stream.close();
    };
  }, [dispatch, session.isAuthenticated]);

  useEffect(() => {
    if (!session.isAuthenticated) {
      return;
    }

    let mounted = true;

    async function loadGames() {
      setGamesLoading(true);
      setGamesError(null);

      try {
        const nextGames = await gamesApi.getAll();
        if (!mounted) {
          return;
        }

        setGames(nextGames);
      } catch {
        if (mounted) {
          setGamesError('Could not load games from the backend.');
        }
      } finally {
        if (mounted) {
          setGamesLoading(false);
        }
      }
    }

    async function loadTags() {
      try {
        const tags = await gamesApi.getTags();
        if (mounted) {
          setAvailableTags(tags);
        }
      } catch (error) {
        console.error('Could not load tags:', error);
      }
    }

    void loadGames();
    void loadTags();

    return () => {
      mounted = false;
    };
  }, [session.isAuthenticated]);

  useEffect(() => {
    if (activeView !== 'sales' || role !== 'seller') {
      return;
    }

    let mounted = true;

    async function loadTransactions() {
      setTransactionsLoading(true);
      try {
        const data = await transactionsApi.getSellerTransactions({
          startDate: transactionFilters.startDate || undefined,
          endDate: transactionFilters.endDate || undefined,
          gameId: transactionFilters.gameId || undefined,
        });
        if (mounted) {
          setTransactions(data);
        }
      } catch (error) {
        console.error('Could not load transactions:', error);
      } finally {
        if (mounted) {
          setTransactionsLoading(false);
        }
      }
    }

    void loadTransactions();

    return () => {
      mounted = false;
    };
  }, [activeView, role, transactionFilters]);

  useEffect(() => {
    if (role !== 'admin' || (activeView !== 'admin' && activeView !== 'home')) {
      return;
    }

    let mounted = true;

    async function loadAdminData() {
      setAdminTransactionsLoading(true);
      setAllUsersLoading(true);
      try {
        const [txData, usersData] = await Promise.all([
          adminApi.getAllTransactions({
            startDate: adminTransactionFilters.startDate || undefined,
            endDate: adminTransactionFilters.endDate || undefined,
            gameName: adminTransactionFilters.gameName || undefined,
            category: adminTransactionFilters.category || undefined,
            userId: adminTransactionFilters.userId || undefined,
          }),
          adminApi.getAllUsers()
        ]);
        
        if (mounted) {
          setAdminTransactions(txData);
          setAllUsers(usersData);
        }
      } catch (error) {
        console.error('Could not load admin data:', error);
      } finally {
        if (mounted) {
          setAdminTransactionsLoading(false);
          setAllUsersLoading(false);
        }
      }
    }

    void loadAdminData();

    return () => {
      mounted = false;
    };
  }, [activeView, role, adminTransactionFilters]);

  useEffect(() => {
    if (role === 'buyer' && activeView === 'sell') {
      setActiveView('games');
    }

    if (role === 'seller' && (activeView === 'games' || activeView === 'cart' || activeView === 'payment')) {
      setActiveView('sell');
    }
  }, [activeView, role]);

  useEffect(() => {
    if (!selectedGameId && games.length > 0) {
      setSelectedGameId(games[0]._id);
    }
  }, [games, selectedGameId]);

  useEffect(() => {
    if (activeView === 'detail' && !selectedGame && games.length > 0) {
      setSelectedGameId(games[0]._id);
    }
  }, [activeView, games, selectedGame]);

  useEffect(() => {
    if (selectedGame) {
      setGameEditForm({
        title: selectedGame.title,
        genre: selectedGame.genre,
        studio: selectedGame.studio,
        description: selectedGame.description,
        price: String(selectedGame.price),
        tags: selectedGame.tags ?? [],
        coverImage: selectedGame.media?.cover ?? '',
        galleryImages: selectedGame.media?.gallery ?? [],
        discountPercent: String(selectedGame.discountPercent ?? 0),
        published: selectedGame.published ?? true,
      });
      setTagInput('');
      setGalleryInput('');
    }
  }, [selectedGame]);

  useEffect(() => {
    if (gameMessage && gameMessage.includes('saved')) {
      const timer = setTimeout(() => {
        setGameMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [gameMessage]);

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthBusy(true);

    try {
      if (authMode === 'signup') {
        if (!authForm.name.trim() || !authForm.email.trim() || !authForm.password) {
          throw new Error('All fields are required');
        }

        const result = await authApi.register(authForm.email.trim(), authForm.name.trim(), authForm.password, authForm.role);
        dispatch(login(mapUser(result.user)));
      } else if (authMode === 'admin-login') {
        if (!authForm.name.trim()) {
          throw new Error('Admin username is required');
        }
        const result = await adminApi.adminLogin(authForm.name.trim(), authForm.password);
        dispatch(login(mapUser(result.user)));
      } else {
        const result = await authApi.login(authForm.email.trim(), authForm.password);
        dispatch(login(mapUser(result.user)));
      }

      setActiveView('home');
      setAuthForm(emptyAuthForm);
    } catch (error) {
      clearToken();
      dispatch(logout());
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    dispatch(logout());
    setGames([]);
    setCartIds([]);
    setActiveView('home');
    setSearchQuery('');
    setCheckoutMessage(null);
    setGameMessage(null);
    setAuthForm(emptyAuthForm);
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    try {
      const updatedUser = await authApi.updateNotificationSettings(enabled);
      dispatch(login(mapUser(updatedUser)));
    } catch (error) {
      console.error('Could not update notification settings:', error);
    }
  };

  const handleNotificationRead = async (notificationId: string) => {
    try {
      const updatedUser = await authApi.markNotificationRead(notificationId);
      dispatch(login(mapUser(updatedUser)));
    } catch (error) {
      console.error('Could not mark notification read:', error);
    }
  };

  const openGameDetail = (gameId: string) => {
    setSelectedGameId(gameId);
    setActiveView('detail');
  };

  const goBackFromDetail = () => {
    setActiveView(role === 'buyer' ? 'games' : 'sell');
  };

  const toggleCart = (gameId: string) => {
    setCartIds((current) => (current.includes(gameId) ? current.filter((id) => id !== gameId) : [...current, gameId]));
  };

  const handleTopUp = async (e: FormEvent) => {
    e.preventDefault();
    setTopUpMessage(null);
    if (!topUpUserId || !topUpAmount) {
      setTopUpMessage('Please select a user and enter an amount.');
      return;
    }
    
    try {
      const response = await adminApi.topUpUser(topUpUserId, Number(topUpAmount));
      setTopUpMessage(response.message);
      setTopUpAmount('');
      
      // Update local allUsers state
      setAllUsers(current => current.map(u => u._id === response.user._id ? response.user : u));
    } catch (error) {
      setTopUpMessage(error instanceof Error ? error.message : 'Failed to top up user');
    }
  };

  const handleCreateGame = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGameMessage(null);

    if (role !== 'seller') {
      setGameMessage('Only sellers can create listings.');
      return;
    }

    const title = gameForm.title.trim();
    const studio = gameForm.studio.trim();
    const description = gameForm.description.trim();
    const price = Number(gameForm.price);
    const tags = gameForm.tags.filter(Boolean);
    const gallery = gameForm.galleryImages.filter((img) => img.trim());
    const cover = gameForm.coverImage.trim();
    const discountPercent = Number(gameForm.discountPercent);

    if (!title || !studio || !description || Number.isNaN(price)) {
      setGameMessage('Fill in all fields first.');
      return;
    }

    try {
      const payload: CreateGamePayload = {
        title,
        genre: gameForm.genre,
        studio,
        description,
        price,
        tags,
        discountPercent: Number.isNaN(discountPercent) ? 0 : discountPercent,
        media: {
          cover: cover || buildPlaceholderCover(title),
          gallery,
        },
      };

      await gamesApi.create(payload);
      const nextGames = await gamesApi.getAll();
      setGames(nextGames);
      setGameForm(emptyGameForm);
      setCreateTagInput('');
      setCreateGalleryInput('');
      setGameMessage('Game saved to MongoDB.');
      setActiveView('sell');
    } catch (error) {
      setGameMessage(error instanceof Error ? error.message : 'Could not create the game.');
    }
  };

  const handleFeatureGame = async (gameId: string) => {
    setGameMessage(null);

    if (role !== 'seller') {
      setGameMessage('Only sellers can feature games.');
      return;
    }

    try {
      const result = await gamesApi.featureGame(gameId);
      const [nextUser, nextGames] = await Promise.all([authApi.getCurrentUser(), gamesApi.getAll()]);
      dispatch(login(mapUser(nextUser)));
      setGames(nextGames);
      setGameMessage(result.message);
      setActiveView('sell');
    } catch (error) {
      setGameMessage(error instanceof Error ? error.message : 'Could not feature the game.');
    }
  };

  const handleUpdateGame = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedGame || role !== 'seller') {
      return;
    }

    try {
      const updatedGame = await gamesApi.update(selectedGame._id, {
        title: gameEditForm.title.trim(),
        genre: gameEditForm.genre,
        studio: gameEditForm.studio.trim(),
        description: gameEditForm.description.trim(),
        price: Number(gameEditForm.price),
        published: gameEditForm.published,
        discountPercent: Number(gameEditForm.discountPercent),
        tags: gameEditForm.tags.filter(Boolean),
        media: {
          cover: gameEditForm.coverImage.trim() || buildPlaceholderCover(gameEditForm.title.trim() || selectedGame.title),
          gallery: gameEditForm.galleryImages.filter((img) => img.trim()),
        },
      });

      setGames((current) => current.map((game) => (game._id === updatedGame._id ? updatedGame : game)));
      setSelectedGameId(updatedGame._id);
      setGameMessage('Your changes were saved successfully!');
      setTagInput('');
      setGalleryInput('');
      setActiveView('sell');
    } catch (error) {
      setGameMessage(error instanceof Error ? error.message : 'Could not update the game.');
    }
  };

  const handleDeleteGame = async () => {
    if (!selectedGame || role !== 'seller') {
      return;
    }

    try {
      await gamesApi.delete(selectedGame._id);
      setGames((current) => current.filter((game) => game._id !== selectedGame._id));
      setSelectedGameId(null);
      setActiveView('sell');
      setGameMessage('Game removed from listing.');
    } catch (error) {
      setGameMessage(error instanceof Error ? error.message : 'Could not delete the game.');
    }
  };

  const handleUpdateProfile = async () => {
    setProfileMessage(null);

    if (!session.user?.id) {
      setProfileMessage('User not found.');
      return;
    }

    try {
      const updated = await authApi.updateProfile(session.user.id, {
        username: editProfileForm.name,
        bio: editProfileForm.bio,
      });
      dispatch(login(mapUser(updated)));
      setIsEditingProfile(false);
      setProfileMessage('✓ Profile updated successfully.');
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Could not update profile.');
    }
  };

  const handleChangePassword = async () => {
    setProfileMessage(null);

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setProfileMessage('Please fill in all password fields.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setProfileMessage('New passwords do not match.');
      return;
    }

    try {
      await authApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setIsChangingPassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setProfileMessage('✓ Password changed successfully.');
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Could not change password.');
    }
  };

  const handleAddReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedGame || reviewForm.rating < 1 || reviewForm.rating > 5 || !reviewForm.comment.trim()) return;
    try {
      const updatedGame = await gamesApi.addReview(selectedGame._id, reviewForm.rating, reviewForm.comment);
      setGames(games.map(g => g._id === updatedGame._id ? updatedGame : g));
      setReviewForm({ rating: 5, comment: '' });
      setReviewMessage('Review added successfully!');
      setTimeout(() => setReviewMessage(null), 3000);
    } catch (error) {
      setReviewMessage(error instanceof Error ? error.message : 'Could not add review.');
    }
  };

  const handleLikeReview = async (reviewId: string) => {
    if (!selectedGame) return;
    try {
      const updatedGame = await gamesApi.likeReview(selectedGame._id, reviewId);
      setGames(games.map(g => g._id === updatedGame._id ? updatedGame : g));
    } catch (error) {
      console.error(error);
    }
  };

  const handleDislikeReview = async (reviewId: string) => {
    if (!selectedGame) return;
    try {
      const updatedGame = await gamesApi.dislikeReview(selectedGame._id, reviewId);
      setGames(games.map(g => g._id === updatedGame._id ? updatedGame : g));
    } catch (error) {
      console.error(error);
    }
  };

  const handleCheckout = async () => {
    setCheckoutMessage(null);

    if (role !== 'buyer') {
      setCheckoutMessage('Only buyers can pay from a wallet.');
      return;
    }

    if (!cartGames.length) {
      setCheckoutMessage('Your cart is empty.');
      return;
    }

    const walletBalance = session.user?.walletBalance ?? 0;
    if (cartTotal > walletBalance) {
      setCheckoutMessage('Not enough wallet balance.');
      return;
    }

    try {
      for (const game of cartGames) {
        await gamesApi.purchase(game._id);
      }

      const [nextUser, nextGames] = await Promise.all([authApi.getCurrentUser(), gamesApi.getAll()]);
      dispatch(login(mapUser(nextUser)));
      setGames(nextGames);
      setCartIds([]);
      setActiveView('library');
      setCheckoutMessage('🎉 Payment complete! Your games are now in your library.');
    } catch (error) {
      setCheckoutMessage(error instanceof Error ? error.message : 'Payment failed.');
    }
  };

  if (booting) {
    return (
      <div className="auth-screen">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <div className="auth-shell">
          <section className="panel auth-copy">
            <div className="brand-mark">
              <div className="brand-icon">
                <Gamepad2 size={20} />
              </div>
              <div>
                <p>GameForge</p>
                <span>Indie marketplace</span>
              </div>
            </div>
            <h1>Checking your session...</h1>
            <p>Loading your saved login and wallet from MongoDB.</p>
          </section>
          <section className="panel auth-panel">
            <div className="panel-inner auth-panel-loading">
              <span className="eyebrow">Please wait</span>
              <p className="auth-message">Connecting to your account.</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!session.isAuthenticated) {
    return (
      <div className="auth-screen">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <div className="ambient ambient-three" />

        <div className="auth-shell">
          <section className="panel auth-copy">
            <div className="brand-mark">
              <div className="brand-icon">
                <Gamepad2 size={20} />
              </div>
              <div>
                <p>GameForge</p>
                <span>Indie marketplace</span>
              </div>
            </div>
            <span className="eyebrow">Login first</span>
            <h1>Sign in or register to continue</h1>
            <p>The marketplace stays hidden until your backend session is valid. Buyers get a cart and wallet checkout. Sellers get listing tools only.</p>
            <div className="auth-points">
              <article className="auth-point">
                <strong>Real auth</strong>
                <span>Login and register use the Express backend.</span>
              </article>
              <article className="auth-point">
                <strong>Wallets</strong>
                <span>Every account starts with a wallet balance you can spend or receive.</span>
              </article>
              <article className="auth-point">
                <strong>Role split</strong>
                <span>Buyers buy. Sellers create listings. The wrong routes are hidden.</span>
              </article>
            </div>
          </section>

          <section className="panel auth-panel">
            <div className="auth-toggle">
              <button type="button" className={authMode === 'login' ? 'pill active' : 'pill'} onClick={() => setAuthMode('login')}>
                Login
              </button>
              <button type="button" className={authMode === 'signup' ? 'pill active' : 'pill'} onClick={() => setAuthMode('signup')}>
                Register
              </button>
              <button type="button" className={authMode === 'admin-login' ? 'pill active' : 'pill'} onClick={() => setAuthMode('admin-login')}>
                Admin
              </button>
            </div>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {(authMode === 'signup' || authMode === 'admin-login') && (
                <label>
                  <span>Username</span>
                  <input
                    type="text"
                    placeholder={authMode === 'admin-login' ? 'Admin username' : 'Your display name'}
                    value={authForm.name}
                    onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                  />
                </label>
              )}

              {authMode !== 'admin-login' && (
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={authForm.email}
                    onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                  />
                </label>
              )}

              <label>
                <span>Password</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={authForm.password}
                  onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                />
              </label>

              {authMode === 'signup' && (
                <label>
                  <span>Account type</span>
                  <select value={authForm.role} onChange={(event) => setAuthForm({ ...authForm, role: event.target.value as Role })}>
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                  </select>
                </label>
              )}

              {authError && <p className="auth-message error">{authError}</p>}

              <button type="submit" className="cta primary block" disabled={authBusy}>
                {authBusy ? 'Working...' : authMode === 'login' ? 'Enter dashboard' : 'Create account'}
              </button>
            </form>
          </section>
        </div>
      </div>
    );
  }

  const sellerName = session.user?.name ?? 'Guest';
  const walletBalance = session.user?.walletBalance ?? 0;

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <header className="topbar panel">
        <button className="icon-button mobile-only" type="button" onClick={() => setMobileMenuOpen((value) => !value)}>
          <Menu size={18} />
        </button>

        <div className="brand-mark">
          <div className="brand-icon">
            <Gamepad2 size={20} />
          </div>
          <div>
            <p>GameForge</p>
            <span>{role === 'buyer' ? 'Buyer dashboard' : 'Seller dashboard'}</span>
          </div>
        </div>

        {role === 'buyer' && activeView === 'games' && (
          <label className="search-field" htmlFor="game-search">
            <Search size={16} />
            <input
              id="game-search"
              type="search"
              placeholder="Search backend listings"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
        )}

        <div className="topbar-actions">
          <button
            type="button"
            className={`icon-button ${!notificationsEnabled ? 'notifications-disabled' : ''}`}
            title={notificationsEnabled ? 'Notifications on — click to toggle' : 'Notifications off — click to toggle'}
            onClick={() => void handleNotificationToggle(!notificationsEnabled)}
          >
            {notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
            {notificationsEnabled && unreadNotificationCount > 0 && (
              <span className="topbar-badge">{unreadNotificationCount}</span>
            )}
          </button>
          <div className="role-chip">
            <ShieldCheck size={14} />
            <span>{role}</span>
          </div>
          <div className="role-chip wallet-chip">
            <span>{isAdminUser ? 'Platform wallet' : 'Wallet'}</span>
            <strong>${(isAdminUser ? platformWallet : walletBalance).toFixed(2)}</strong>
          </div>
          {role === 'buyer' && (
            <button type="button" className="cta ghost" onClick={() => setActiveView('cart')}>
              <ShoppingCart size={16} />
              Cart {cartIds.length ? `(${cartIds.length})` : ''}
            </button>
          )}
          <button type="button" className="cta ghost" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <div className={`layout ${mobileMenuOpen ? 'menu-open' : ''}`}>
        <aside className="sidebar panel">
          <div className="sidebar-hero">
            <p>Logged in</p>
            <h2>{sellerName}</h2>
            <span>{session.user?.email}</span>
          </div>

          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item}
                type="button"
                className={activeView === item ? 'nav-item active' : 'nav-item'}
                onClick={() => {
                  setActiveView(item);
                  setMobileMenuOpen(false);
                }}
              >
                <span>{item}</span>
                <small>
                  {item === 'home' ? 'Main dashboard' : 
                   item === 'games' ? 'Browse and buy' : 
                   item === 'sell' ? 'Create listings' : 
                   item === 'admin' ? 'Platform logs' : 
                   item === 'profile' ? 'Account settings' : 
                   item === 'sales' ? 'Revenue stats' : 
                   item === 'library' ? 'Your collection' : 
                   'View details'}
                </small>
              </button>
            ))}
          </nav>

          <div className="sidebar-card">
            <div className="card-header compact">
              <Sparkles size={16} />
              <span>Account status</span>
            </div>
            <strong>{role === 'admin' ? 'Admin access' : role === 'seller' ? 'Seller access' : 'Buyer access'}</strong>
            <p>
              {role === 'admin' 
                ? 'You have full platform oversight.' 
                : role === 'seller' 
                  ? 'You can create and manage listings.' 
                  : 'You can browse games and buy.'}
            </p>
          </div>

            <div className="sidebar-card notification-panel">
              <div className="card-header compact notification-panel-header">
                <div className="notification-panel-title">
                  <Bell size={16} />
                  <span>Notifications</span>
                  {unreadNotificationCount > 0 && <strong className="notification-badge">{unreadNotificationCount}</strong>}
                </div>
                <label className="inline-toggle notification-toggle">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(event) => void handleNotificationToggle(event.target.checked)}
                  />
                  <span className="toggle-label">{notificationsEnabled ? 'On' : 'Off'}</span>
                </label>
              </div>

              {sidebarNotifications.length === 0 ? (
                <p className="muted-copy">No notifications yet.</p>
              ) : (
                <div className="notification-stack">
                  {sidebarNotifications.slice(0, 5).map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className={`notification ${notification.tone} ${notification.read ? 'read' : 'unread'}`}
                      onClick={() => void handleNotificationRead(notification.id)}
                    >
                      <div className="notification-copy">
                        <strong>{notification.title}</strong>
                        <span>{notification.detail}</span>
                      </div>
                      <small>{new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
        </aside>

        <main className="content">
          {activeView === 'home' && (
            <section className="hero panel">
              <div className="hero-copy">
                <span className="eyebrow">{role === 'admin' ? 'Administrative Dashboard' : 'Dashboard'}</span>
                <h1>Welcome back, {sellerName}</h1>
                <p>
                  {role === 'admin' 
                    ? 'Oversee platform performance and manage user wallets.' 
                    : role === 'buyer' 
                      ? 'Use your wallet to buy games from the storefront.' 
                      : 'Create listings and watch your wallet grow from sales.'}
                </p>
                <div className="hero-actions">
                  {role === 'admin' ? (
                    <button type="button" className="cta primary" onClick={() => setActiveView('admin')}>
                      <ShieldCheck size={16} />
                      Manage Transactions
                    </button>
                  ) : role === 'buyer' ? (
                    <button type="button" className="cta primary" onClick={() => setActiveView('games')}>
                      <ShoppingCart size={16} />
                      Browse games
                    </button>
                  ) : (
                    <button type="button" className="cta primary" onClick={() => setActiveView('sell')}>
                      <Sparkles size={16} />
                      Add listing
                    </button>
                  )}
                </div>
              </div>

              <div className="panel-inner auth-summary">
                <div>
                  <span className="eyebrow">Session</span>
                  <strong>{role.charAt(0).toUpperCase() + role.slice(1)}</strong>
                  <p>{session.user?.email}</p>
                </div>
                {isAdminUser ? (
                  <div>
                    <span className="eyebrow">Platform Wallet</span>
                    <strong>${platformWallet.toFixed(2)}</strong>
                    <p>Includes game sales and feature fees</p>
                  </div>
                ) : (
                  <div>
                    <span className="eyebrow">Wallet</span>
                    <strong>${walletBalance.toFixed(2)}</strong>
                    <p>{role === 'buyer' ? 'Use this balance for checkout.' : 'This is your seller balance.'}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeView === 'home' && role === 'buyer' && (
            <section className="panel featured-strip">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Featured games</span>
                  <h2>Carousel spotlight</h2>
                </div>
              </div>

              {gamesLoading && <p className="auth-message">Loading featured games...</p>}
              {!gamesLoading && featuredGames.length === 0 && (
                <div className="empty-state">
                  <p>No featured games yet.</p>
                </div>
              )}

              <div className="featured-carousel" ref={featuredRef}>
                {featuredGames.map((game, idx) => {
                  const cover = game.media?.cover?.trim() ? game.media.cover : buildPlaceholderCover(game.title);

                  return (
                    <article key={game._id} className={`featured-slide ${idx === featuredIndex ? 'active' : ''}`} role="button" tabIndex={0} onClick={() => openGameDetail(game._id)}>
                      <img src={cover} alt={game.title} />
                      <div className="featured-slide-copy">
                        <span>{game.genre}</span>
                        <h3>{game.title}</h3>
                        <p>{game.studio}</p>
                        <div className="tag-row compact">
                          {(game.tags?.length ? game.tags : [game.genre]).slice(0, 3).map((tag) => (
                            <span key={`${game._id}-${tag}`} className="pill static">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="price-stack">
                          <strong>${getDiscountedPrice(game).toFixed(2)}</strong>
                          <span>${game.price.toFixed(2)} · {getDiscountPercent(game)}% off</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {activeView === 'detail' && selectedGame && (
            <section className="detail-layout">
              <article className="panel game-detail-hero">
                <div className="game-detail-media">
                  <button type="button" className="icon-button overlay-back" onClick={goBackFromDetail}>
                    <ArrowLeft size={14} />
                    Back
                  </button>
                  <img src={selectedGameGallery[selectedImageIndex]} alt={selectedGame.title} />
                </div>

                <div className="game-detail-copy">
                  <h2>{selectedGame.title}</h2>
                  <div className="game-header-meta">
                    <span className="studio">{selectedGame.studio}</span>
                    <span className="rating"><Star size={16} /> {selectedGame.rating.toFixed(1)}</span>
                    <div className="price-display">
                      {getDiscountPercent(selectedGame) > 0 ? (
                        <>
                          <span className="original-price">${selectedGame.price.toFixed(2)}</span>
                          <strong className="discounted-price">${getDiscountedPrice(selectedGame).toFixed(2)}</strong>
                          <span className="discount-badge">{getDiscountPercent(selectedGame)}% off</span>
                        </>
                      ) : (
                        <strong className="full-price">${selectedGame.price.toFixed(2)}</strong>
                      )}
                    </div>
                  </div>
                  <p>{selectedGame.description}</p>

                  <div className="tag-row">
                    {(selectedGame.tags?.length ? selectedGame.tags : [selectedGame.genre]).map((tag) => (
                      <span key={`${selectedGame._id}-${tag}`} className="pill static">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="hero-actions">
                    {role === 'buyer' && (
                      <>
                        {purchasedGames.some((game) => game._id === selectedGame._id) ? (
                          <div style={{ padding: '12px 16px', borderRadius: '14px', background: 'rgba(34, 199, 168, 0.12)', border: '1px solid rgba(34, 199, 168, 0.3)', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--accent-strong)', fontWeight: '600' }}>✓ Already Bought</span>
                            <p style={{ margin: '4px 0 0 0', color: 'var(--accent)', fontSize: '0.9rem' }}>Access from your library</p>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="cta primary"
                            onClick={() => {
                              if (!cartIds.includes(selectedGame._id)) {
                                toggleCart(selectedGame._id);
                              }
                              setActiveView('cart');
                            }}
                          >
                            <ShoppingCart size={16} />
                            Buy with wallet
                          </button>
                        )}
                        <button type="button" className="cta ghost" onClick={() => setActiveView('games')}>
                          Back to browse
                        </button>
                      </>
                    )}
                    {role === 'seller' && !isGameCurrentlyFeatured(selectedGame) && (
                      <button type="button" className="cta ghost" onClick={() => handleFeatureGame(selectedGame._id)}>
                        <Sparkles size={16} />
                        Feature for $15
                      </button>
                    )}
                    {role === 'seller' && isGameCurrentlyFeatured(selectedGame) && (
                      <div style={{ padding: '12px 16px', borderRadius: '14px', background: 'rgba(109, 247, 221, 0.15)', border: '1px solid rgba(109, 247, 221, 0.3)', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--accent-strong)', fontWeight: '600' }}>⭐ Featured until</span>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--accent)', fontSize: '0.9rem' }}>{getFeatureExpiryDate(selectedGame)}</p>
                      </div>
                    )}

                  </div>
                </div>
              </article>

              <article className="panel gallery-panel">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">Pictures</span>
                    <h2>Game gallery</h2>
                  </div>
                </div>
                <div className="gallery-grid">
                  {selectedGameGallery.map((image, index) => (
                    <figure
                      key={`${selectedGame._id}-gallery-${index}`}
                      className={`gallery-card thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                      onClick={() => setSelectedImageIndex(index)}
                      role="button"
                      tabIndex={0}
                    >
                      <img src={image} alt={`${selectedGame.title} screenshot ${index + 1}`} />
                    </figure>
                  ))}
                </div>
              </article>

              <article className="panel game-details-panel">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">About the game</span>
                  </div>
                </div>
                <div className="game-detail-columns">
                  <p>{selectedGame.description}</p>
                </div>
              </article>

              <article className="panel game-reviews-panel" style={{ marginTop: '2rem' }}>
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">Player feedback</span>
                    <h2>Reviews</h2>
                  </div>
                </div>

                <div className="reviews-list">
                  {(!selectedGame.reviews || selectedGame.reviews.length === 0) ? (
                    <p style={{ color: 'var(--text-muted)' }}>No reviews yet.</p>
                  ) : (
                    selectedGame.reviews.map((review) => (
                      <div key={review._id} style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong>{review.username}</strong>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent)' }}>
                            <Star size={14} /> {review.rating}/5
                          </span>
                        </div>
                        <p style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>{review.comment}</p>
                        
                        {session.user && (
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                            <button
                              type="button"
                              className="cta ghost"
                              style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                              onClick={() => handleLikeReview(review._id)}
                            >
                              👍 {review.likes.length}
                            </button>
                            <button
                              type="button"
                              className="cta ghost"
                              style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                              onClick={() => handleDislikeReview(review._id)}
                            >
                              👎 {review.dislikes.length}
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {role === 'buyer' && purchasedGames.some((game) => game._id === selectedGame._id) && !selectedGame.reviews?.some(r => r.userId === session.user?.id) && (
                  <form className="listing-form" onSubmit={handleAddReview} style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Write a review</h3>
                    <label>
                      <span>Rating (1-5)</span>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={reviewForm.rating}
                        onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                        required
                        style={{ maxWidth: '100px' }}
                      />
                    </label>
                    <label>
                      <span>Comment</span>
                      <textarea
                        rows={3}
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        required
                      />
                    </label>
                    {reviewMessage && <p style={{ color: 'var(--accent)', fontSize: '0.85rem', marginBottom: '1rem' }}>{reviewMessage}</p>}
                    <button type="submit" className="cta primary">Submit Review</button>
                  </form>
                )}
              </article>

              {role === 'seller' && ownGames.some((game) => game._id === selectedGame._id) && (
                <article className="panel game-edit-panel">
                  <div className="section-heading compact">
                    <div>
                      <span className="eyebrow">Seller edit</span>
                      <h2>Edit listing details</h2>
                    </div>
                  </div>

                  <form className="listing-form" onSubmit={handleUpdateGame}>
                    <label>
                      <span>Game title</span>
                      <input type="text" value={gameEditForm.title} onChange={(event) => setGameEditForm({ ...gameEditForm, title: event.target.value })} />
                    </label>
                    <label>
                      <span>Genre</span>
                      <select value={gameEditForm.genre} onChange={(event) => setGameEditForm({ ...gameEditForm, genre: event.target.value })}>
                        {genreOptions.filter((genre) => genre !== 'All').map((genre) => (
                          <option key={genre} value={genre}>
                            {genre}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Studio</span>
                      <input type="text" value={gameEditForm.studio} onChange={(event) => setGameEditForm({ ...gameEditForm, studio: event.target.value })} />
                    </label>
                    <label>
                      <span>Description</span>
                      <textarea rows={4} value={gameEditForm.description} onChange={(event) => setGameEditForm({ ...gameEditForm, description: event.target.value })} />
                    </label>
                    <label>
                      <span>Price</span>
                      <input type="number" min="0" step="0.01" value={gameEditForm.price} onChange={(event) => setGameEditForm({ ...gameEditForm, price: event.target.value })} />
                    </label>
                    <label>
                      <span>Discount percent</span>
                      <select value={gameEditForm.discountPercent} onChange={(event) => setGameEditForm({ ...gameEditForm, discountPercent: event.target.value })}>
                        {discountOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}%
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Tags</span>
                      <div className="tag-input-group">
                        <select
                          value=""
                          onChange={(event) => {
                            const tag = event.target.value.trim();
                            if (tag && !gameEditForm.tags.includes(tag)) {
                              setGameEditForm({ ...gameEditForm, tags: [...gameEditForm.tags, tag] });
                            }
                          }}
                        >
                          <option value="">Select a tag...</option>
                          {availableTags
                            .filter((tag) => !gameEditForm.tags.includes(tag))
                            .map((tag) => (
                              <option key={tag} value={tag}>
                                {tag}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          className="cta ghost"
                          onClick={() => {
                            const tag = tagInput.trim();
                            if (tag && !gameEditForm.tags.includes(tag)) {
                              setGameEditForm({ ...gameEditForm, tags: [...gameEditForm.tags, tag] });
                              setTagInput('');
                            }
                          }}
                        >
                          Custom tag
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Or type a custom tag"
                        value={tagInput}
                        onChange={(event) => setTagInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            const tag = tagInput.trim();
                            if (tag && !gameEditForm.tags.includes(tag)) {
                              setGameEditForm({ ...gameEditForm, tags: [...gameEditForm.tags, tag] });
                              setTagInput('');
                            }
                          }
                        }}
                        style={{ width: '100%', marginTop: '8px' }}
                      />
                      <div className="tag-row">
                        {gameEditForm.tags.map((tag) => (
                          <span
                            key={tag}
                            className="pill removable"
                            onClick={() => setGameEditForm({ ...gameEditForm, tags: gameEditForm.tags.filter((t) => t !== tag) })}
                          >
                            {tag} ×
                          </span>
                        ))}
                      </div>
                    </label>
                    <label>
                      <span>Cover image URL</span>
                      <input type="text" value={gameEditForm.coverImage} onChange={(event) => setGameEditForm({ ...gameEditForm, coverImage: event.target.value })} />
                    </label>
                    <label>
                      <span>Gallery image URLs</span>
                      <div className="tag-input-group">
                        <input
                          type="text"
                          placeholder="https://..."
                          value={galleryInput}
                          onChange={(event) => setGalleryInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              const image = galleryInput.trim();
                              if (image && !gameEditForm.galleryImages.includes(image)) {
                                setGameEditForm({ ...gameEditForm, galleryImages: [...gameEditForm.galleryImages, image] });
                                setGalleryInput('');
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="cta ghost"
                          onClick={() => {
                            const image = galleryInput.trim();
                            if (image && !gameEditForm.galleryImages.includes(image)) {
                              setGameEditForm({ ...gameEditForm, galleryImages: [...gameEditForm.galleryImages, image] });
                              setGalleryInput('');
                            }
                          }}
                        >
                          Add image
                        </button>
                      </div>
                      <div className="gallery-list">
                        {gameEditForm.galleryImages.map((image, index) => (
                          <div key={index} className="gallery-item">
                            <span className="image-url">{image}</span>
                            <button
                              type="button"
                              className="cta ghost small"
                              onClick={() => setGameEditForm({ ...gameEditForm, galleryImages: gameEditForm.galleryImages.filter((_, i) => i !== index) })}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </label>

                    <label className="inline-toggle">
                      <input type="checkbox" checked={gameEditForm.published} onChange={(event) => setGameEditForm({ ...gameEditForm, published: event.target.checked })} />
                      <span className="switch" aria-hidden />
                      <span className="toggle-label">Visible in marketplace</span>
                    </label>

                    <div className="hero-actions">
                      <button type="submit" className="cta primary">
                        Save changes
                      </button>
                      <button type="button" className="cta ghost" onClick={handleDeleteGame}>
                        Remove listing
                      </button>
                    </div>
                  </form>
                </article>
              )}
            </section>
          )}

          {activeView === 'games' && role === 'buyer' && (
            <section className="two-column">
              <article className="panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Storefront</span>
                    <h2>Browse games</h2>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <select value={selectedGenre} onChange={(event) => setSelectedGenre(event.target.value)} style={{ flex: 1, minWidth: '150px' }}>
                    {genreOptions.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                </div>

                {gamesLoading && <p className="auth-message">Loading games...</p>}
                {gamesError && <p className="auth-message error">{gamesError}</p>}

                {!gamesLoading && !gamesError && filteredGames.length === 0 && (
                  <div className="empty-state">
                    <p>No games found.</p>
                  </div>
                )}

                <div className="card-grid">
                  {filteredGames.map((game) => {
                    const cover = game.media?.cover?.trim() ? game.media.cover : buildPlaceholderCover(game.title);
                    const inCart = cartIds.includes(game._id);
                    const discountedPrice = getDiscountedPrice(game);

                    return (
                      <article key={game._id} className="game-card clickable" role="button" tabIndex={0} onClick={() => openGameDetail(game._id)}>
                        <img src={cover} alt={game.title} className="game-card-image" />
                        <div className="game-card-top">
                          <span className="genre-tag">{game.genre}</span>
                          {game.featured && <span className="featured-tag">Featured</span>}
                        </div>
                        <h3>{game.title}</h3>
                        <p>{game.description}</p>
                        <div className="tag-row compact">
                          {(game.tags?.length ? game.tags : [game.genre]).slice(0, 3).map((tag) => (
                            <span key={`${game._id}-${tag}`} className="pill static">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="game-card-meta">
                          <span>{game.studio}</span>
                          <strong>${discountedPrice.toFixed(2)}</strong>
                        </div>
                        <div className="price-stack compact">
                          <span>${game.price.toFixed(2)} · {getDiscountPercent(game)}% off</span>
                        </div>
                        <div className="game-card-footer">
                          <span>
                            <Star size={14} /> {game.rating.toFixed(1)}
                          </span>
                          <button type="button" className={inCart ? 'cta ghost compact active' : 'cta ghost compact'} onClick={(event) => {
                            event.stopPropagation();
                            toggleCart(game._id);
                          }}>
                            <ShoppingCart size={14} />
                            {inCart ? 'In cart' : 'Add to cart'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </article>

              <aside className="panel recommendation-panel">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">Quick checkout</span>
                    <h2>Ready to pay?</h2>
                  </div>
                </div>
                <p className="auth-message">Cart items use your wallet. Seller gets 80 percent, GameForge keeps 20 percent.</p>
                <button type="button" className="cta primary block" onClick={() => setActiveView('cart')}>
                  <ShoppingCart size={16} />
                  Open cart
                </button>
                <div className="empty-state compact">
                  <p>Wallet balance: ${walletBalance.toFixed(2)}</p>
                </div>
              </aside>
            </section>
          )}

          {activeView === 'cart' && role === 'buyer' && (
            <section className="two-column payment-layout">
              <article className="panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Cart</span>
                    <h2>Payment page</h2>
                  </div>
                </div>

                {cartGames.length === 0 ? (
                  <div className="empty-state">
                    <p>Your cart is empty.</p>
                  </div>
                ) : (
                  <div className="cart-list">
                    {cartGames.map((game) => {
                      const discountedPrice = getDiscountedPrice(game);

                      return (
                        <article key={game._id} className="cart-row">
                          <div>
                            <strong>{game.title}</strong>
                            <p>{game.genre} · {game.studio}</p>
                          </div>
                          <div className="cart-row-actions">
                            <strong>${discountedPrice.toFixed(2)}</strong>
                            <span className="price-stack compact">
                              <span>${game.price.toFixed(2)} · {getDiscountPercent(game)}% off</span>
                            </span>
                            <button type="button" className="icon-button danger" onClick={() => toggleCart(game._id)} title="Remove from cart">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </article>

              <aside className="panel payment-panel">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">Wallet checkout</span>
                    <h2>Pay from balance</h2>
                  </div>
                </div>

                <div className="wallet-box">
                  <span>{isAdminUser ? 'Platform wallet' : 'Wallet balance'}</span>
                  <strong>${(isAdminUser ? platformWallet : walletBalance).toFixed(2)}</strong>
                </div>
                <div className="wallet-box">
                  <span>Order total</span>
                  <strong>${cartTotal.toFixed(2)}</strong>
                </div>
                <div className="wallet-box">
                  <span>GameForge fee</span>
                  <strong>${(cartTotal * 0.2).toFixed(2)}</strong>
                </div>

                {checkoutMessage && <p className={checkoutMessage.includes('complete') ? 'auth-message success' : 'auth-message error'}>{checkoutMessage}</p>}

                <button type="button" className="cta primary block" disabled={!cartGames.length || cartTotal > walletBalance} onClick={handleCheckout}>
                  Pay with wallet
                </button>

                <button type="button" className="cta ghost block" onClick={() => setActiveView('games')}>
                  Back to games
                </button>
              </aside>
            </section>
          )}

          {activeView === 'sell' && role === 'seller' && (
            <section className="two-column">
              <article className="panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Seller tools</span>
                    <h2>Create a listing</h2>
                  </div>
                </div>

                <form className="listing-form" onSubmit={handleCreateGame}>
                  <label>
                    <span>Game title</span>
                    <input type="text" placeholder="New indie release" value={gameForm.title} onChange={(event) => setGameForm({ ...gameForm, title: event.target.value })} />
                  </label>
                  <label>
                    <span>Genre</span>
                    <select value={gameForm.genre} onChange={(event) => setGameForm({ ...gameForm, genre: event.target.value })}>
                      {genreOptions.filter((genre) => genre !== 'All').map((genre) => (
                        <option key={genre} value={genre}>
                          {genre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Studio</span>
                    <input type="text" placeholder="Studio name" value={gameForm.studio} onChange={(event) => setGameForm({ ...gameForm, studio: event.target.value })} />
                  </label>
                  <label>
                    <span>Description</span>
                    <textarea rows={5} placeholder="Short game description" value={gameForm.description} onChange={(event) => setGameForm({ ...gameForm, description: event.target.value })} />
                  </label>
                  <label>
                    <span>Price</span>
                    <input type="number" min="0" step="0.01" placeholder="12.99" value={gameForm.price} onChange={(event) => setGameForm({ ...gameForm, price: event.target.value })} />
                  </label>
                  <label>
                    <span>Discount percent</span>
                    <select value={gameForm.discountPercent} onChange={(event) => setGameForm({ ...gameForm, discountPercent: event.target.value })}>
                      {discountOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}%
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Tags</span>
                    <div className="tag-input-group">
                      <select
                        value=""
                        onChange={(event) => {
                          const tag = event.target.value.trim();
                          if (tag && !gameForm.tags.includes(tag)) {
                            setGameForm({ ...gameForm, tags: [...gameForm.tags, tag] });
                          }
                        }}
                      >
                        <option value="">Select a tag...</option>
                        {availableTags
                          .filter((tag) => !gameForm.tags.includes(tag))
                          .map((tag) => (
                            <option key={tag} value={tag}>
                              {tag}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        className="cta ghost"
                        onClick={() => {
                          // Suggest: add custom tag if not in list
                          const tag = createTagInput.trim();
                          if (tag && !gameForm.tags.includes(tag)) {
                            setGameForm({ ...gameForm, tags: [...gameForm.tags, tag] });
                            setCreateTagInput('');
                          }
                        }}
                      >
                        Custom tag
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Or type a custom tag"
                      value={createTagInput}
                      onChange={(event) => setCreateTagInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          const tag = createTagInput.trim();
                          if (tag && !gameForm.tags.includes(tag)) {
                            setGameForm({ ...gameForm, tags: [...gameForm.tags, tag] });
                            setCreateTagInput('');
                          }
                        }
                      }}
                      style={{ width: '100%', marginTop: '8px' }}
                    />
                    <div className="tag-row">
                      {gameForm.tags.map((tag) => (
                        <span
                          key={tag}
                          className="pill removable"
                          onClick={() => setGameForm({ ...gameForm, tags: gameForm.tags.filter((t) => t !== tag) })}
                        >
                          {tag} ×
                        </span>
                      ))}
                    </div>
                  </label>
                  <label>
                    <span>Cover image URL</span>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={gameForm.coverImage}
                      onChange={(event) => setGameForm({ ...gameForm, coverImage: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Gallery image URLs</span>
                    <div className="tag-input-group">
                      <input
                        type="text"
                        placeholder="https://..."
                        value={createGalleryInput}
                        onChange={(event) => setCreateGalleryInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            const image = createGalleryInput.trim();
                            if (image && !gameForm.galleryImages.includes(image)) {
                              setGameForm({ ...gameForm, galleryImages: [...gameForm.galleryImages, image] });
                              setCreateGalleryInput('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="cta ghost"
                        onClick={() => {
                          const image = createGalleryInput.trim();
                          if (image && !gameForm.galleryImages.includes(image)) {
                            setGameForm({ ...gameForm, galleryImages: [...gameForm.galleryImages, image] });
                            setCreateGalleryInput('');
                          }
                        }}
                      >
                        Add image
                      </button>
                    </div>
                    <div className="gallery-list">
                      {gameForm.galleryImages.map((image, index) => (
                        <div key={index} className="gallery-item">
                          <span className="image-url">{image}</span>
                          <button
                            type="button"
                            className="cta ghost small"
                            onClick={() => setGameForm({ ...gameForm, galleryImages: gameForm.galleryImages.filter((_, i) => i !== index) })}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </label>

                  {gameMessage && <p className={gameMessage.includes('saved') ? 'auth-message success' : 'auth-message error'}>{gameMessage}</p>}

                  <button type="submit" className="cta primary block">
                    <PlusCircle size={16} />
                    Save listing
                  </button>
                </form>
              </article>

              <aside className="panel info-rail">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">Your listings</span>
                    <h2>Games from your seller account</h2>
                  </div>
                </div>

                {ownGames.length ? (
                  <div className="crud-list">
                    {ownGames.map((game) => (
                      <article key={game._id} className="crud-card clickable" role="button" tabIndex={0} onClick={() => openGameDetail(game._id)}>
                        <div className="crud-main">
                          <strong>{game.title}</strong>
                          <div className="crud-meta">
                            <span>{game.genre}</span>
                            <span>${game.price.toFixed(2)}</span>
                            <span className={isGameCurrentlyFeatured(game) ? 'pill active static' : 'pill static'}>
                              {isGameCurrentlyFeatured(game) ? `Featured (${getFeatureExpiryDate(game)})` : 'Standard'}
                            </span>
                          </div>
                        </div>
                        <div className="crud-actions">
                          <span className={`status ${isGameCurrentlyFeatured(game) ? 'live' : 'draft'}`}>{isGameCurrentlyFeatured(game) ? 'Featured' : 'Draft'}</span>
                          {!isGameCurrentlyFeatured(game) && (
                            <button type="button" className="cta ghost compact" onClick={(event) => {
                              event.stopPropagation();
                              handleFeatureGame(game._id);
                            }}>
                              <Sparkles size={14} />
                              Feature for $15
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No seller listings yet.</p>
                  </div>
                )}
              </aside>
            </section>
          )}

          {activeView === 'library' && role === 'buyer' && (
            <section className="detail-layout">
              <article className="panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Your Collection</span>
                    <h2>Game Library</h2>
                  </div>
                </div>

                {purchasedGames.length === 0 ? (
                  <div className="empty-state">
                    <p>You haven't purchased any games yet. Head to the storefront to find something amazing!</p>
                  </div>
                ) : (
                  <div className="game-grid">
                    {purchasedGames.map((game) => {
                      const cover = game.media?.cover?.trim() ? game.media.cover : buildPlaceholderCover(game.title);
                      return (
                        <article
                          key={game._id}
                          className="game-card clickable"
                          role="button"
                          tabIndex={0}
                          onClick={() => openGameDetail(game._id)}
                        >
                          <img className="game-card-image" src={cover} alt={game.title} />
                          <h3>{game.title}</h3>
                          <p>{game.studio}</p>
                          <div className="tag-row compact">
                            {(game.tags?.length ? game.tags : [game.genre]).slice(0, 2).map((tag: string) => (
                              <span key={`${game._id}-${tag}`} className="pill static">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div style={{ marginTop: '8px' }}>
                            <strong style={{ color: 'var(--accent-strong)' }}>${getDiscountedPrice(game).toFixed(2)}</strong>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </article>

              <article className="panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Stats</span>
                    <h2>Achievements & Stats</h2>
                  </div>
                </div>

                <div className="stats-panel" style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ padding: '16px', background: 'rgba(34, 199, 168, 0.1)', borderRadius: '12px', border: '1px solid rgba(34, 199, 168, 0.2)' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Games Owned</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '1.8rem', color: 'var(--accent-strong)', fontWeight: '700' }}>{purchasedGames.length}</p>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(255, 179, 71, 0.1)', borderRadius: '12px', border: '1px solid rgba(255, 179, 71, 0.2)' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Total Spent</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '1.8rem', color: 'var(--accent-alt)', fontWeight: '700' }}>${totalSpent.toFixed(2)}</p>
                  </div>
                </div>

                <div className="achievements-grid">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                    >
                      <div className="achievement-icon">{achievement.icon}</div>
                      <h4>{achievement.title}</h4>
                      <p>{achievement.description}</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          )}

          {activeView === 'profile' && (
            <section className="two-column">
              <article className="panel profile-card">
                <div className="profile-avatar">{session.user?.avatar ?? initials(sellerName)}</div>
                <div>
                  <span className="eyebrow">Account</span>
                  <h2>{session.user?.name ?? sellerName}</h2>
                  <p>{session.user?.bio || 'Logged in through the backend authentication flow.'}</p>
                </div>
                <div className="profile-meta">
                  <span>{session.user?.email}</span>
                  <span>{role} account</span>
                </div>
                <div className="wallet-box">
                  <span>Wallet balance</span>
                  <strong>${walletBalance.toFixed(2)}</strong>
                </div>
                <div className="hero-actions" style={{ marginTop: '14px', gap: '8px' }}>
                  <button
                    type="button"
                    className="cta primary small"
                    onClick={() => {
                      setEditProfileForm({ name: session.user?.name ?? '', bio: session.user?.bio ?? '' });
                      setIsEditingProfile(true);
                    }}
                  >
                    Edit details
                  </button>
                  <button
                    type="button"
                    className="cta ghost small"
                    onClick={() => setIsChangingPassword(true)}
                  >
                    Change password
                  </button>
                </div>
              </article>

              {profileMessage && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p className={`auth-message ${profileMessage.includes('✓') ? 'success' : 'error'}`}>
                    {profileMessage}
                  </p>
                </div>
              )}

              {isEditingProfile && (
                <article className="panel" style={{ gridColumn: '1 / -1' }}>
                  <div className="section-heading compact">
                    <div>
                      <span className="eyebrow">Profile</span>
                      <h2>Edit details</h2>
                    </div>
                  </div>
                  <form className="listing-form" onSubmit={(e) => { e.preventDefault(); handleUpdateProfile(); }}>
                    <label>
                      <span>Name</span>
                      <input
                        type="text"
                        value={editProfileForm.name}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Bio</span>
                      <textarea
                        rows={3}
                        value={editProfileForm.bio}
                        onChange={(e) => setEditProfileForm({ ...editProfileForm, bio: e.target.value })}
                      />
                    </label>
                    <div className="hero-actions">
                      <button type="submit" className="cta primary">
                        Save changes
                      </button>
                      <button
                        type="button"
                        className="cta ghost"
                        onClick={() => setIsEditingProfile(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </article>
              )}

              {isChangingPassword && (
                <article className="panel" style={{ gridColumn: '1 / -1' }}>
                  <div className="section-heading compact">
                    <div>
                      <span className="eyebrow">Security</span>
                      <h2>Change password</h2>
                    </div>
                  </div>
                  <form className="listing-form" onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
                    <label>
                      <span>Current password</span>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>New password</span>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>Confirm new password</span>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      />
                    </label>
                    <div className="hero-actions">
                      <button type="submit" className="cta primary">
                        Update password
                      </button>
                      <button
                        type="button"
                        className="cta ghost"
                        onClick={() => setIsChangingPassword(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </article>
              )}

            </section>
          )}

          {activeView === 'sales' && role === 'seller' && (
            <section className="detail-layout">
              <article className="panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Financials</span>
                    <h2>Sales & Transaction History</h2>
                  </div>
                </div>

                <div className="filters-row" style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                  <label style={{ flex: 1, minWidth: '200px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Filter by Game</span>
                    <select
                      value={transactionFilters.gameId}
                      onChange={(e) => setTransactionFilters({ ...transactionFilters, gameId: e.target.value })}
                      style={{ width: '100%' }}
                    >
                      <option value="">All Games</option>
                      {ownGames.map(game => (
                        <option key={game._id} value={game._id}>{game.title}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ flex: 1, minWidth: '150px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Start Date</span>
                    <input
                      type="date"
                      value={transactionFilters.startDate}
                      onChange={(e) => setTransactionFilters({ ...transactionFilters, startDate: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </label>
                  <label style={{ flex: 1, minWidth: '150px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>End Date</span>
                    <input
                      type="date"
                      value={transactionFilters.endDate}
                      onChange={(e) => setTransactionFilters({ ...transactionFilters, endDate: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </label>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      type="button"
                      className="cta ghost"
                      onClick={() => setTransactionFilters({ startDate: '', endDate: '', gameId: '' })}
                      style={{ height: '42px' }}
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>

                {transactionsLoading ? (
                  <p className="auth-message">Loading transactions...</p>
                ) : transactions.length === 0 ? (
                  <div className="empty-state">
                    <p>No transactions found for the selected criteria.</p>
                  </div>
                ) : (
                  <div className="table-responsive" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted)' }}>
                          <th style={{ padding: '12px 8px' }}>Date</th>
                          <th style={{ padding: '12px 8px' }}>Type</th>
                          <th style={{ padding: '12px 8px' }}>Game</th>
                          <th style={{ padding: '12px 8px' }}>User</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right' }}>Total Price</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right' }}>Platform Cut</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right' }}>Net Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map(tx => (
                          <tr key={tx._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '12px 8px', whiteSpace: 'nowrap' }}>
                              {new Date(tx.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '12px 8px' }}>
                              <span className={`pill static ${tx.type === 'sale' ? 'active' : ''}`} style={{ fontSize: '0.75rem' }}>
                                {tx.type === 'sale' ? 'Sale' : 'Feature Fee'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 8px' }}>{tx.gameId?.title || 'Unknown'}</td>
                            <td style={{ padding: '12px 8px', color: 'var(--muted)' }}>
                              {tx.type === 'sale' ? (tx.buyerId?.username || 'Deleted User') : 'N/A'}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                              ${tx.totalPrice?.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--danger)' }}>
                              {tx.platformCut > 0 ? `-$${tx.platformCut.toFixed(2)}` : '-'}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', color: tx.amount > 0 ? 'var(--accent-alt)' : 'var(--danger)' }}>
                              {tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>

              <aside className="panel info-rail">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">Summary</span>
                    <h2>Transaction Stats</h2>
                  </div>
                </div>

                <div className="stats-panel" style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ padding: '16px', background: 'rgba(34, 199, 168, 0.1)', borderRadius: '12px', border: '1px solid rgba(34, 199, 168, 0.2)' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Total Sales Revenue (Net)</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '1.8rem', color: 'var(--accent-strong)', fontWeight: '700' }}>
                      ${transactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                    </p>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(255, 60, 60, 0.1)', borderRadius: '12px', border: '1px solid rgba(255, 60, 60, 0.2)' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Total Feature Fees</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '1.8rem', color: 'var(--danger)', fontWeight: '700' }}>
                      ${Math.abs(transactions.filter(t => t.type === 'feature_fee').reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
                    </p>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(255, 179, 71, 0.1)', borderRadius: '12px', border: '1px solid rgba(255, 179, 71, 0.2)' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Total Platform Fees</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '1.8rem', color: 'var(--accent-alt)', fontWeight: '700' }}>
                      ${transactions.reduce((sum, t) => sum + (t.platformCut || 0), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </aside>
            </section>
          )}
          {activeView === 'admin' && role === 'admin' && (
            <section className="panel" style={{ display: 'grid', gap: '24px' }}>
              {/* Header */}
              <div className="section-heading">
                <div>
                  <span className="eyebrow">GameForge Admin</span>
                  <h2>Platform Transaction History</h2>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{adminTransactions.length} transactions found</span>
                  <button type="button" className="cta ghost small" onClick={() => setAdminTransactionFilters({ startDate: '', endDate: '', gameName: '', category: '', userId: '' })}>
                    Reset Filters
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="filters-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>Search by Game</span>
                  <input
                    type="text"
                    placeholder="Game title..."
                    value={adminTransactionFilters.gameName}
                    onChange={(e) => setAdminTransactionFilters({ ...adminTransactionFilters, gameName: e.target.value })}
                  />
                </label>
                <label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>Category</span>
                  <select
                    value={adminTransactionFilters.category}
                    onChange={(e) => setAdminTransactionFilters({ ...adminTransactionFilters, category: e.target.value })}
                  >
                    <option value="">All Categories</option>
                    {genreOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </label>
                <label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>User ID</span>
                  <input
                    type="text"
                    placeholder="User MongoDB ID..."
                    value={adminTransactionFilters.userId}
                    onChange={(e) => setAdminTransactionFilters({ ...adminTransactionFilters, userId: e.target.value })}
                  />
                </label>
                <label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>Start Date</span>
                  <input
                    type="date"
                    value={adminTransactionFilters.startDate}
                    onChange={(e) => setAdminTransactionFilters({ ...adminTransactionFilters, startDate: e.target.value })}
                  />
                </label>
                <label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>End Date</span>
                  <input
                    type="date"
                    value={adminTransactionFilters.endDate}
                    onChange={(e) => setAdminTransactionFilters({ ...adminTransactionFilters, endDate: e.target.value })}
                  />
                </label>
              </div>

              {/* Transactions Table */}
              <div className="panel-inner" style={{ padding: 0 }}>
                {adminTransactionsLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <p className="auth-message">Syncing platform logs...</p>
                  </div>
                ) : adminTransactions.length === 0 ? (
                  <div className="empty-state">
                    <p>No platform transactions found for these filters.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted)' }}>
                          <th style={{ padding: '16px' }}>Timestamp</th>
                          <th style={{ padding: '16px' }}>Type</th>
                          <th style={{ padding: '16px' }}>Game / Details</th>
                          <th style={{ padding: '16px' }}>Buyer</th>
                          <th style={{ padding: '16px' }}>Seller</th>
                          <th style={{ padding: '16px', textAlign: 'right' }}>Total</th>
                          <th style={{ padding: '16px', textAlign: 'right' }}>Net To User</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminTransactions.map((tx) => (
                          <tr key={tx._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                            <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                              {new Date(tx.createdAt).toLocaleString()}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span className={`pill static ${tx.type === 'sale' ? 'active' : ''}`} style={{ fontSize: '0.75rem' }}>
                                {tx.type.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <div>
                                <strong style={{ display: 'block' }}>{tx.gameId?.title || 'N/A'}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{tx.gameId?.genre || 'N/A'}</span>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              {tx.buyerId ? (
                                <div>
                                  <span style={{ display: 'block' }}>{tx.buyerId.username}</span>
                                  <code style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{tx.buyerId._id}</code>
                                </div>
                              ) : <span style={{ color: 'var(--muted)' }}>N/A</span>}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              {tx.sellerId ? (
                                <div>
                                  <span style={{ display: 'block' }}>{tx.sellerId.username}</span>
                                  <code style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{tx.sellerId._id}</code>
                                </div>
                              ) : <span style={{ color: 'var(--muted)' }}>N/A</span>}
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              <strong>${tx.totalPrice?.toFixed(2) || '0.00'}</strong>
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'right', color: (tx.amount ?? 0) > 0 ? 'var(--accent-alt)' : 'var(--danger)', fontWeight: '600' }}>
                              {(tx.amount ?? 0) > 0 ? '+' : ''}${(tx.amount ?? 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Wallet Top-up Tools */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
                <article className="panel" style={{ margin: 0, padding: '24px' }}>
                  <div className="section-heading compact">
                    <div>
                      <span className="eyebrow">Finance</span>
                      <h2>Wallet Top-up Control</h2>
                    </div>
                  </div>
                  <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '20px' }}>Inject balance into any buyer or seller wallet directly. This bypasses Stripe and updates the MongoDB balance immediately.</p>
                  
                  <form onSubmit={handleTopUp} style={{ display: 'grid', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <label>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>Target User</span>
                        <select 
                          value={topUpUserId} 
                          onChange={(e) => setTopUpUserId(e.target.value)}
                          disabled={allUsersLoading}
                        >
                          <option value="">Select a user...</option>
                          {allUsers.map((u) => (
                            <option key={u._id} value={u._id}>{u.username} ({u.role}) - ${(u.walletBalance ?? 0).toFixed(2)}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '6px', display: 'block' }}>Amount ($)</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={topUpAmount}
                          onChange={(e) => setTopUpAmount(e.target.value)}
                        />
                      </label>
                    </div>
                    {topUpMessage && (
                      <p className={`auth-message ${topUpMessage.includes('Success') ? 'success' : 'error'}`} style={{ margin: 0 }}>
                        {topUpMessage}
                      </p>
                    )}
                    <button type="submit" className="cta primary block" disabled={!topUpUserId || !topUpAmount}>
                      <DollarSign size={16} />
                      Confirm Wallet Injection
                    </button>
                  </form>
                </article>

                <article className="panel" style={{ margin: 0, padding: '24px' }}>
                  <div className="section-heading compact">
                    <div>
                      <span className="eyebrow">Insights</span>
                      <h2>Revenue Share</h2>
                    </div>
                  </div>
                  <div className="stats-panel" style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                        <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Platform Wallet</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: '700' }}>
                          ${platformWallet.toFixed(2)}
                      </p>
                    </div>
                    <div style={{ padding: '16px', background: 'rgba(34, 199, 168, 0.1)', borderRadius: '12px' }}>
                      <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Seller Payouts (80%)</span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '1.5rem', color: 'var(--accent-strong)', fontWeight: '700' }}>
                        ${adminTransactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
