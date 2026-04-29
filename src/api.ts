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
  discountPercent: number;
  rating: number;
  sellerId: { _id: string; username: string } | string;
  media: {
    cover: string;
    gallery: string[];
  };
  downloads: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
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

  logout() {
    clearToken();
  },
};
