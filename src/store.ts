import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type UserRole = 'buyer' | 'seller';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  walletBalance: number;
  city: string;
  bio: string;
  avatar: string;
  genres: string[];
}

export interface DraftGame {
  id: string;
  title: string;
  genre: string;
  price: number;
  featured: boolean;
  status: 'Draft' | 'Live' | 'Paused';
}

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  tone: 'success' | 'info' | 'warning';
}

interface SessionState {
  isAuthenticated: boolean;
  user: UserProfile | null;
}

interface MarketState {
  searchQuery: string;
  activeGenre: string;
  notifications: NotificationItem[];
  draftGames: DraftGame[];
}

const sessionSlice = createSlice({
  name: 'session',
  initialState: {
    isAuthenticated: false,
    user: null,
  } as SessionState,
  reducers: {
    login(state, action: PayloadAction<UserProfile>) {
      state.isAuthenticated = true;
      state.user = action.payload;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
    },
    setRole(state, action: PayloadAction<UserRole>) {
      if (state.user) {
        state.user.role = action.payload;
      }
    },
    updateProfile(state, action: PayloadAction<Partial<UserProfile>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

const marketSlice = createSlice({
  name: 'market',
  initialState: {
    searchQuery: '',
    activeGenre: 'All',
    notifications: [] as NotificationItem[],
    draftGames: [] as DraftGame[],
  } as MarketState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setActiveGenre(state, action: PayloadAction<string>) {
      state.activeGenre = action.payload;
    },
    addDraftGame(state, action: PayloadAction<DraftGame>) {
      state.draftGames.unshift(action.payload);
    },
    updateDraftGame(state, action: PayloadAction<{ id: string; changes: Partial<DraftGame> }>) {
      const target = state.draftGames.find((game) => game.id === action.payload.id);
      if (target) {
        Object.assign(target, action.payload.changes);
      }
    },
    deleteDraftGame(state, action: PayloadAction<string>) {
      state.draftGames = state.draftGames.filter((game) => game.id !== action.payload);
    },
    removeNotification(state, action: PayloadAction<string>) {
      state.notifications = state.notifications.filter((notification) => notification.id !== action.payload);
    },
  },
});

export const { login, logout, setRole, updateProfile } = sessionSlice.actions;
export const { setSearchQuery, setActiveGenre, addDraftGame, updateDraftGame, deleteDraftGame, removeNotification } = marketSlice.actions;

export const store = configureStore({
  reducer: {
    session: sessionSlice.reducer,
    market: marketSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;