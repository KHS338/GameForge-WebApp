const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Token management
export function setToken(token: string) {
  localStorage.setItem('authToken', token);
}

export function getToken() {
  return localStorage.getItem('authToken');
}

export function clearToken() {
  localStorage.removeItem('authToken');
}

function getAuthHeader() {
  const token = getToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export interface ApiNotification {
  _id: string;
  title: string;
  detail: string;
  tone: 'success' | 'info' | 'warning';
  category: 'purchase' | 'feature' | 'system';
  read: boolean;
  createdAt: string;
}

export interface ApiUser {
  _id: string;
  email: string;
  username: string;
  role: 'buyer' | 'seller' | 'admin';
  walletBalance: number;
  notificationsEnabled?: boolean;
  notifications?: ApiNotification[];
  avatar?: string;
  bio?: string;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    website?: string;
  };
  purchases: string[];
  listings: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGamePayload {
  title: string;
  genre: string;
  studio: string;
  description: string;
  price: number;
  featured?: boolean;
  discountPercent?: number;
  rating?: number;
  media?: {
    cover?: string;
    gallery?: string[];
  };
  tags?: string[];
}

export interface ApiGame {
  _id: string;
  title: string;
  genre: string;
  studio: string;
  description: string;
  price: number;
  featured: boolean;
  featureExpiresAt?: string | null;
  lastFeaturedAt?: string | null;
  systemFeatured?: boolean;
  systemFeaturedUntil?: string | null;
  published: boolean;
  discountPercent: number;
  rating: number;
  sellerId: { _id: string; username: string } | string;
  media: {
    cover: string;
    gallery: string[];
  };
  downloads: number;
  revenue: number;
  reviews?: {
    _id: string;
    userId: string;
    username: string;
    rating: number;
    comment: string;
    likes: string[];
    dislikes: string[];
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface ApiRecommendedGame extends ApiGame {
  score?: number;
}

export interface ApiTransaction {
  _id: string;
  sellerId: string | { _id: string; username: string; email?: string };
  type: 'sale' | 'feature_fee';
  gameId: { _id: string; title: string; genre?: string };
  buyerId?: { _id: string; username: string; email: string };
  amount: number;
  platformCut: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiForumAuthor {
  _id: string;
  username: string;
  role: 'buyer' | 'seller' | 'admin';
}

export interface ApiForumTopic {
  _id: string;
  gameId: string;
  authorId: ApiForumAuthor;
  title: string;
  bodyMarkdown: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  pinned: boolean;
  locked: boolean;
  reportsCount: number;
  editedAt?: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  viewerVote: -1 | 0 | 1;
  canModerate: boolean;
}

export interface ApiForumComment {
  _id: string;
  gameId: string;
  topicId: string;
  authorId: ApiForumAuthor;
  parentCommentId?: string | null;
  depth: number;
  bodyMarkdown: string;
  upvotes: number;
  downvotes: number;
  replyCount: number;
  reportsCount: number;
  editedAt?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  viewerVote: -1 | 0 | 1;
  canModerate: boolean;
}

export interface ApiPaginatedForumTopics {
  items: ApiForumTopic[];
  total: number;
  page: number;
  limit: number;
  sort: 'latest' | 'top' | 'activity' | string;
}

export interface ApiBlogAuthor {
  _id: string;
  username: string;
}

export interface ApiBlogPost {
  _id: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  published: boolean;
  publishedAt?: string | null;
  createdBy: ApiBlogAuthor | string;
  updatedBy?: ApiBlogAuthor | string | null;
  createdAt: string;
  updatedAt: string;
}

// Analytics Interfaces
export interface UserRegistrationAnalyticsData {
  year: number;
  month: number;
  totalRegistrations: number;
  buyerRegistrations: number;
  sellerRegistrations: number;
}

export interface RevenueAnalyticsData {
  year: number;
  month: number;
  totalRevenue: number;
  platformRevenue: number;
  sellerRevenue: number;
  gameCount: number;
  saleCount: number;
}

export interface GameAnalyticsEntry {
  gameId: string | { _id: string; title: string };
  sales: number;
  revenue: number;
}

export interface SellerAnalyticsData {
  _id: string;
  sellerId: string;
  year: number;
  month: number;
  totalSales: number;
  totalRevenue: number;
  averageRating: number;
  gamesAnalytics: GameAnalyticsEntry[];
}

export interface GamePopularityAnalyticsData {
  _id: string;
  gameId: string | { _id: string; title: string; rating: number; sellerId: string };
  year: number;
  month: number;
  averageRating: number;
  reviewCount: number;
  totalDownloads: number;
  totalSales: number;
}

export interface AnalyticsResponse<T> {
  data: T[];
  months: Array<{ year: number; month: number }>;
}

export interface DashboardSummary {
  currentMonth: string;
  totalUsers: number;
  totalGames: number;
  totalSales: number;
  monthlyStats: {
    newRegistrations: number;
    monthlyRevenue: number;
    monthlySales: number;
  };
}

// Games API
export const gamesApi = {
  async getAll(params?: { genre?: string; featured?: boolean; search?: string }) {
    const query = new URLSearchParams();
    if (params?.genre) query.set('genre', params.genre);
    if (params?.featured) query.set('featured', 'true');
    if (params?.search) query.set('search', params.search);

    const response = await fetch(`${API_BASE_URL}/games${query.toString() ? '?' + query.toString() : ''}`);
    if (!response.ok) throw new Error('Failed to fetch games');
    return response.json() as Promise<ApiGame[]>;
  },

  async getFeatured() {
    const response = await fetch(`${API_BASE_URL}/games/featured`);
    if (!response.ok) throw new Error('Failed to fetch featured games');
    return response.json() as Promise<ApiGame[]>;
  },

  async getById(id: string) {
    const response = await fetch(`${API_BASE_URL}/games/${id}`);
    if (!response.ok) throw new Error('Failed to fetch game');
    return response.json() as Promise<ApiGame>;
  },

  async create(gameData: CreateGamePayload) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/games`, {
      method: 'POST',
      headers,
      body: JSON.stringify(gameData),
    });
    if (!response.ok) throw new Error('Failed to create game');
    return response.json() as Promise<ApiGame>;
  },

  async purchase(id: string) {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/games/${id}/purchase`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) throw new Error('Failed to purchase game');
    return response.json() as Promise<{
      message: string;
      game: ApiGame;
      wallet: {
        buyerBalance: number;
        sellerBalance: number;
        platformCut: number;
      };
    }>;
  },

  async featureGame(id: string) {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/games/${id}/feature`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) throw new Error('Failed to feature game');
    return response.json() as Promise<{
      message: string;
      game: ApiGame;
      walletBalance: number;
      featureFee: number;
    }>;
  },

  async update(id: string, updates: Partial<ApiGame>) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/games/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update game');
    return response.json() as Promise<ApiGame>;
  },

  async addReview(id: string, rating: number, comment: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/games/${id}/reviews`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ rating, comment }),
    });
    if (!response.ok) throw new Error('Failed to add review');
    return response.json() as Promise<ApiGame>;
  },

  async likeReview(gameId: string, reviewId: string) {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/games/${gameId}/reviews/${reviewId}/like`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) throw new Error('Failed to toggle like');
    return response.json() as Promise<ApiGame>;
  },

  async dislikeReview(gameId: string, reviewId: string) {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/games/${gameId}/reviews/${reviewId}/dislike`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) throw new Error('Failed to toggle dislike');
    return response.json() as Promise<ApiGame>;
  },

  async delete(id: string) {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/games/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete game');
    return response.json();
  },

  async getTags() {
    const response = await fetch(`${API_BASE_URL}/games/tags/all`);
    if (!response.ok) throw new Error('Failed to fetch tags');
    const data = await response.json() as { tags: string[] };
    return data.tags;
  },
};

export const recommendationsApi = {
  async getHomeFeatured() {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/recommendations/home-featured`, { headers });
    if (!response.ok) throw new Error('Failed to fetch home featured games');
    return response.json() as Promise<ApiRecommendedGame[]>;
  },

  async getPopular() {
    const response = await fetch(`${API_BASE_URL}/recommendations/popular`);
    if (!response.ok) throw new Error('Failed to fetch popular recommendations');
    return response.json() as Promise<ApiRecommendedGame[]>;
  },

  async getForYou() {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/recommendations/me`, { headers });
    if (!response.ok) throw new Error('Failed to fetch personalized recommendations');
    return response.json() as Promise<ApiRecommendedGame[]>;
  },

  async getSimilar(gameId: string) {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/recommendations/game/${gameId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch similar games');
    return response.json() as Promise<ApiRecommendedGame[]>;
  },
};

export const blogsApi = {
  async getAll(params?: { includeAll?: boolean }) {
    const query = new URLSearchParams();
    if (params?.includeAll) {
      query.set('includeAll', 'true');
    }

    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/blogs${query.toString() ? `?${query.toString()}` : ''}`, {
      headers,
    });
    if (!response.ok) throw new Error('Failed to fetch blog posts');
    return response.json() as Promise<ApiBlogPost[]>;
  },

  async getById(id: string) {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/blogs/${id}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch blog post');
    return response.json() as Promise<ApiBlogPost>;
  },

  async create(payload: { title: string; summary?: string; content: string; tags?: string[]; published?: boolean }) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/blogs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to create blog post');
    return response.json() as Promise<ApiBlogPost>;
  },

  async update(id: string, payload: Partial<{ title: string; summary: string; content: string; tags: string[]; published: boolean }>) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/blogs/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to update blog post');
    return response.json() as Promise<ApiBlogPost>;
  },

  async delete(id: string) {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/blogs/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete blog post');
    return response.json() as Promise<{ message: string }>;
  },
};

// Auth API
export const authApi = {
  async register(email: string, username: string, password: string, role: 'buyer' | 'seller') {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password, role }),
    });
    if (!response.ok) throw new Error('Failed to register');
    const data = await response.json() as { token: string; user: ApiUser };
    if (data.token) setToken(data.token);
    return data;
  },

  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error('Failed to login');
    const data = await response.json() as { token: string; user: ApiUser };
    if (data.token) setToken(data.token);
    return data;
  },

  async getCurrentUser() {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers,
    });
    if (!response.ok) throw new Error('Failed to fetch current user');
    return response.json() as Promise<ApiUser>;
  },

  async adminLogin(username: string, password: string): Promise<{ message: string; token: string; user: ApiUser }> {
    const response = await fetch(`${API_BASE_URL}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'Admin login failed');
    }
    const data = await response.json();
    setToken(data.token);
    return data;
  },

  async getProfile(id: string) {
    const response = await fetch(`${API_BASE_URL}/auth/${id}`);
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json() as Promise<ApiUser>;
  },

  async updateProfile(id: string, updates: Partial<ApiUser>) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/auth/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json() as Promise<ApiUser>;
  },

  async updateNotificationSettings(enabled: boolean) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/auth/me/notifications`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ enabled }),
    });
    if (!response.ok) throw new Error('Failed to update notification settings');
    return response.json() as Promise<ApiUser>;
  },

  async markNotificationRead(notificationId: string) {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/auth/me/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers,
    });
    if (!response.ok) throw new Error('Failed to mark notification read');
    return response.json() as Promise<ApiUser>;
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to change password');
    }
    return response.json();
  },

  logout() {
    clearToken();
  },
};

// Transactions API
export const transactionsApi = {
  async getSellerTransactions(params?: { startDate?: string; endDate?: string; gameId?: string }) {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.gameId) query.set('gameId', params.gameId);

    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/transactions/seller${query.toString() ? '?' + query.toString() : ''}`, {
      headers,
    });
    
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json() as Promise<ApiTransaction[]>;
  },
};

// Admin API
export const adminApi = {
  async getAllTransactions(params?: { startDate?: string; endDate?: string; gameName?: string; category?: string; userId?: string }) {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.gameName) query.set('gameName', params.gameName);
    if (params?.category) query.set('category', params.category);
    if (params?.userId) query.set('userId', params.userId);

    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/admin/transactions${query.toString() ? '?' + query.toString() : ''}`, {
      headers,
    });
    if (!response.ok) throw new Error('Failed to fetch all transactions');
    return response.json() as Promise<ApiTransaction[]>;
  },

  async getAllUsers() {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/admin/users`, { headers });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json() as Promise<ApiUser[]>;
  },

  async topUpUser(userId: string, amount: number) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/topup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'Failed to top up user wallet');
    }
    return response.json() as Promise<{ message: string; user: ApiUser }>;
  },

  async adminLogin(username: string, password: string): Promise<{ message: string; token: string; user: ApiUser }> {
    const response = await fetch(`${API_BASE_URL}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'Admin login failed');
    }
    const data = await response.json();
    setToken(data.token);
    return data;
  },
};

export const forumsApi = {
  async getAllTopics(params?: { sort?: 'latest' | 'top' | 'activity'; page?: number; limit?: number; q?: string; gameId?: string }) {
    const query = new URLSearchParams();
    if (params?.sort) query.set('sort', params.sort);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.q) query.set('q', params.q);
    if (params?.gameId) query.set('gameId', params.gameId);

    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/forums${query.toString() ? `?${query.toString()}` : ''}`, {
      headers,
    });
    if (!response.ok) throw new Error('Failed to fetch forum topics');
    return response.json() as Promise<ApiPaginatedForumTopics>;
  },

  async getGameTopics(gameId: string, params?: { sort?: 'latest' | 'top' | 'activity'; page?: number; limit?: number; q?: string }) {
    const query = new URLSearchParams();
    if (params?.sort) query.set('sort', params.sort);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.q) query.set('q', params.q);

    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/forums/${gameId}${query.toString() ? `?${query.toString()}` : ''}`, {
      headers,
    });
    if (!response.ok) throw new Error('Failed to fetch forum topics');
    return response.json() as Promise<ApiPaginatedForumTopics>;
  },

  async getTopics(gameId: string, params?: { sort?: 'latest' | 'top' | 'activity'; page?: number; limit?: number; q?: string }) {
    return forumsApi.getGameTopics(gameId, params);
  },

  async createTopic(gameId: string, payload: { title: string; bodyMarkdown: string }) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/forums/games/${gameId}/topics`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to create topic');
    return response.json() as Promise<ApiForumTopic>;
  },

  async getTopic(topicId: string) {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/forums/topics/${topicId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch topic');
    return response.json() as Promise<ApiForumTopic>;
  },

  async updateTopic(topicId: string, payload: { title: string; bodyMarkdown: string }) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/forums/topics/${topicId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to update topic');
    return response.json() as Promise<ApiForumTopic>;
  },

  async deleteTopic(topicId: string) {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/forums/topics/${topicId}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete topic');
    return response.json() as Promise<{ message: string }>;
  },

  async pinTopic(topicId: string, pinned: boolean) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/forums/topics/${topicId}/pin`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ pinned }),
    });
    if (!response.ok) throw new Error('Failed to update topic pin state');
    return response.json() as Promise<ApiForumTopic>;
  },

  async lockTopic(topicId: string, locked: boolean) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/forums/topics/${topicId}/lock`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ locked }),
    });
    if (!response.ok) throw new Error('Failed to update topic lock state');
    return response.json() as Promise<ApiForumTopic>;
  },

  async voteTopic(topicId: string, value: -1 | 0 | 1) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/forums/topics/${topicId}/vote`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ value }),
    });
    if (!response.ok) throw new Error('Failed to vote on topic');
    return response.json() as Promise<ApiForumTopic>;
  },

  async reportTopic(topicId: string, payload: { reason: string; details?: string }) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/forums/topics/${topicId}/report`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to report topic');
    return response.json() as Promise<{ message: string }>;
  },

  async getComments(topicId: string, params?: { sort?: 'oldest' | 'latest' | 'top' }) {
    const query = new URLSearchParams();
    if (params?.sort) query.set('sort', params.sort);

    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/forums/topics/${topicId}/comments${query.toString() ? `?${query.toString()}` : ''}`, {
      headers,
    });
    if (!response.ok) throw new Error('Failed to fetch comments');
    return response.json() as Promise<ApiForumComment[]>;
  },

  async createComment(topicId: string, payload: { bodyMarkdown: string }) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/forums/topics/${topicId}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to create comment');
    return response.json() as Promise<ApiForumComment>;
  },

  async createReply(commentId: string, payload: { bodyMarkdown: string }) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/forums/comments/${commentId}/replies`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to create reply');
    return response.json() as Promise<ApiForumComment>;
  },

  async updateComment(commentId: string, payload: { bodyMarkdown: string }) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/forums/comments/${commentId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to update comment');
    return response.json() as Promise<ApiForumComment>;
  },

  async deleteComment(commentId: string) {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/forums/comments/${commentId}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete comment');
    return response.json() as Promise<{ message: string }>;
  },

  async voteComment(commentId: string, value: -1 | 0 | 1) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/forums/comments/${commentId}/vote`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ value }),
    });
    if (!response.ok) throw new Error('Failed to vote on comment');
    return response.json() as Promise<ApiForumComment>;
  },

  async reportComment(commentId: string, payload: { reason: string; details?: string }) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/forums/comments/${commentId}/report`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to report comment');
    return response.json() as Promise<{ message: string }>;
  },
};

// Analytics API
export const analyticsApi = {
  async getAdminRegistrations() {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/analytics/admin/registrations`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) throw new Error('Failed to fetch registration analytics');
    return response.json() as Promise<AnalyticsResponse<UserRegistrationAnalyticsData>>;
  },

  async getAdminRevenue() {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/analytics/admin/revenue`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) throw new Error('Failed to fetch revenue analytics');
    return response.json() as Promise<AnalyticsResponse<RevenueAnalyticsData>>;
  },

  async getAdminSummary() {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/analytics/admin/summary`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) throw new Error('Failed to fetch dashboard summary');
    return response.json() as Promise<DashboardSummary>;
  },

  async getSellerAnalytics() {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/analytics/seller/analytics`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) throw new Error('Failed to fetch seller analytics');
    return response.json() as Promise<AnalyticsResponse<SellerAnalyticsData>>;
  },

  async getGamePopularity() {
    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(`${API_BASE_URL}/analytics/games/popularity`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) throw new Error('Failed to fetch game popularity analytics');
    return response.json() as Promise<AnalyticsResponse<GamePopularityAnalyticsData>>;
  },

  async getTopSellingGames(year?: number, month?: number, limit?: number) {
    const query = new URLSearchParams();
    if (year) query.set('year', year.toString());
    if (month) query.set('month', month.toString());
    if (limit) query.set('limit', limit.toString());

    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(
      `${API_BASE_URL}/analytics/games/top-selling${query.toString() ? '?' + query.toString() : ''}`,
      {
        method: 'GET',
        headers,
      }
    );
    if (!response.ok) throw new Error('Failed to fetch top selling games');
    return response.json() as Promise<GamePopularityAnalyticsData[]>;
  },

  async getTopRatedGames(year?: number, month?: number, limit?: number) {
    const query = new URLSearchParams();
    if (year) query.set('year', year.toString());
    if (month) query.set('month', month.toString());
    if (limit) query.set('limit', limit.toString());

    const headers: Record<string, string> = {};
    const authHeader = getAuthHeader();
    if (authHeader.Authorization) headers.Authorization = authHeader.Authorization;

    const response = await fetch(
      `${API_BASE_URL}/analytics/games/top-rated${query.toString() ? '?' + query.toString() : ''}`,
      {
        method: 'GET',
        headers,
      }
    );
    if (!response.ok) throw new Error('Failed to fetch top rated games');
    return response.json() as Promise<GamePopularityAnalyticsData[]>;
  },
};
