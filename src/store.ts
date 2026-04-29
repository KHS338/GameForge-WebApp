import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type UserRole = 'buyer' | 'seller';

export interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
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
    isAuthenticated: true,
    user: {
      name: 'Amina Rahman',
      email: 'amina@gameforge.dev',
      role: 'seller',
      city: 'Lahore, Pakistan',
      bio: 'Indie publisher and marketplace curator who features standout studios.',
      avatar: 'AR',
      genres: ['Action', 'Narrative', 'Puzzle'],
    },
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
    notifications: [
      {
        id: 'featured-1',
        title: 'Your game feature request was approved',
        detail: 'Signal Grid will appear on the featured row for 72 hours.',
        tone: 'success',
      },
      {
        id: 'sale-1',
        title: 'Weekly payout ready',
        detail: 'Your seller balance is ready for transfer this Friday.',
        tone: 'info',
      },
      {
        id: 'review-1',
        title: 'New review needs a response',
        detail: 'A buyer left feedback on Ember Path and asked for a controller tip.',
        tone: 'warning',
      },
    ] as NotificationItem[],
    draftGames: [
      {
        id: 'draft-ember-2',
        title: 'Ember Path: Deluxe Prototype',
        genre: 'Action',
        price: 14.99,
        featured: true,
        status: 'Live',
      },
      {
        id: 'draft-sky-1',
        title: 'Skyline Notes',
        genre: 'Narrative',
        price: 8.5,
        featured: false,
        status: 'Draft',
      },
    ] as DraftGame[],
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