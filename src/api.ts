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

export interface ApiUser {
  _id: string;
  email: string;
  username: string;
  role: 'buyer' | 'seller' | 'admin';
  walletBalance: number;
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

export interface ApiTransaction {
  _id: string;
  sellerId: string;
  type: 'sale' | 'feature_fee';
  gameId: { _id: string; title: string };
  buyerId?: { _id: string; username: string; email: string };
  amount: number;
  platformCut: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
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
