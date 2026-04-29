import { useMemo, useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Bell,
  Gamepad2,
  Globe,
  Heart,
  LayoutDashboard,
  Mail,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Trash2,
  Users,
  UserRound,
} from 'lucide-react';
import {
  blogPosts,
  buildRecommendations,
  companyProfile,
  featuredGames,
  findGameById,
  genreOptions,
  metrics,
  navigationItems,
  socialLinks,
  type ViewKey,
} from './data';
import {
  addDraftGame,
  deleteDraftGame,
  login,
  removeNotification,
  setActiveGenre,
  setRole,
  setSearchQuery,
  updateDraftGame,
  type DraftGame,
  type RootState,
} from './store';

type GameView = ViewKey | 'game';

const viewTitles: Record<GameView, { eyebrow: string; title: string; description: string }> = {
  home: {
    eyebrow: 'Launchpad',
    title: 'A Steam-style marketplace for indie games',
    description:
      'Buyers discover curated titles, sellers manage listings, and the platform promotes featured releases with analytics and notifications.',
  },
  explore: {
    eyebrow: 'Catalog',
    title: 'Discover games with smart recommendations',
    description: 'Search, filter, and browse from a storefront that reacts to player preferences and seller highlights.',
  },
  sell: {
    eyebrow: 'Seller tools',
    title: 'Manage game listings with CRUD controls',
    description: 'Create drafts, update pricing, feature releases, and remove old listings from one dashboard.',
  },
  analytics: {
    eyebrow: 'Company insights',
    title: 'Track sales, feature performance, and engagement',
    description: 'See the metrics that help sellers and the platform team make better decisions.',
  },
  blog: {
    eyebrow: 'Content',
    title: 'Publish updates, guides, and indie dev stories',
    description: 'A blog section keeps the storefront active and improves SEO while supporting seller education.',
  },
  contact: {
    eyebrow: 'Support',
    title: 'Contact the team and find the office on Google Maps',
    description: 'Clear contact details and a location embed make the site feel trustworthy and complete.',
  },
  profile: {
    eyebrow: 'Personalization',
    title: 'User profiles, social links, and saved preferences',
    description: 'Profiles make the storefront feel personal and let users tailor their experience.',
  },
  game: {
    eyebrow: 'Game page',
    title: 'Browse the full game gallery',
    description: 'Each title opens into a dedicated page with a bigger cover, more screenshots, and purchase details.',
  },
};

const initialAuthForm: { name: string; email: string; password: string; role: 'buyer' | 'seller' } = {
  name: 'Amina Rahman',
  email: 'amina@gameforge.dev',
  password: 'indie-market',
  role: 'seller' as const,
};

function App() {
  const dispatch = useDispatch();
  const session = useSelector((state: RootState) => state.session);
  const market = useSelector((state: RootState) => state.market);
  const [activeView, setActiveView] = useState<GameView>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState(initialAuthForm);
  const [draftForm, setDraftForm] = useState({ title: '', genre: 'Action', price: '' });
  const [selectedGameId, setSelectedGameId] = useState(featuredGames[0]?.id ?? 'ember-path');
  const featuredScrollRef = useState<HTMLDivElement | null>(null);

  const recommendations = useMemo(
    () => buildRecommendations(session.user?.genres ?? ['Action', 'Puzzle'], market.searchQuery),
    [market.searchQuery, session.user?.genres],
  );

  const filteredGames = useMemo(() => {
    const query = market.searchQuery.trim().toLowerCase();

    return featuredGames.filter((game) => {
      const matchesGenre = market.activeGenre === 'All' || game.genre === market.activeGenre;
      const matchesQuery =
        query.length === 0 || `${game.title} ${game.studio} ${game.genre}`.toLowerCase().includes(query);

      return matchesGenre && matchesQuery;
    });
  }, [market.activeGenre, market.searchQuery]);

  const currentView = viewTitles[activeView];
  const selectedGame = findGameById(selectedGameId) ?? featuredGames[0];

  const featuredGamesList = featuredGames.filter((game) => game.featured);

  const openGamePage = (gameId: string) => {
    setSelectedGameId(gameId);
    setActiveView('game');
  };

  const handleAuthSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    dispatch(
      login({
        name: authForm.name,
        email: authForm.email,
        role: authForm.role,
        city: 'Lahore, Pakistan',
        bio: 'Marketplace member with a preference for polished indie games and responsive seller tools.',
        avatar: authForm.name
          .split(' ')
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        genres: ['Action', 'Narrative', 'Puzzle'],
      }),
    );

    dispatch(setRole(authForm.role));
    setActiveView(authForm.role === 'seller' ? 'sell' : 'explore');
  };

  const handleCreateDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draftForm.title.trim() || !draftForm.price.trim()) {
      return;
    }

    const draft: DraftGame = {
      id: crypto.randomUUID(),
      title: draftForm.title.trim(),
      genre: draftForm.genre,
      price: Number(draftForm.price),
      featured: false,
      status: 'Draft',
    };

    dispatch(addDraftGame(draft));
    setDraftForm({ title: '', genre: draftForm.genre, price: '' });
    setActiveView('sell');
  };

  const featuredCarouselScroll = (direction: 'left' | 'right') => {
    const carousel = featuredScrollRef[0];
    if (!carousel) {
      return;
    }

    carousel.scrollBy({ left: direction === 'left' ? -420 : 420, behavior: 'smooth' });
  };

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
            <span>Indie marketplace</span>
          </div>
        </div>

        <label className="search-field" htmlFor="game-search">
          <Search size={16} />
          <input
            id="game-search"
            type="search"
            placeholder="Search games, studios, genres"
            value={market.searchQuery}
            onChange={(event) => dispatch(setSearchQuery(event.target.value))}
          />
        </label>

        <div className="topbar-actions">
          <div className="role-switch">
            <button
              type="button"
              className={session.user?.role === 'buyer' ? 'pill active' : 'pill'}
              onClick={() => dispatch(setRole('buyer'))}
            >
              Buyer
            </button>
            <button
              type="button"
              className={session.user?.role === 'seller' ? 'pill active' : 'pill'}
              onClick={() => dispatch(setRole('seller'))}
            >
              Seller
            </button>
          </div>
          <button type="button" className="icon-button">
            <Bell size={18} />
          </button>
          <button type="button" className="cta ghost" onClick={() => setActiveView('profile')}>
            <UserRound size={16} />
            {session.user?.name ?? 'Guest'}
          </button>
        </div>
      </header>

      <div className={`layout ${mobileMenuOpen ? 'menu-open' : ''}`}>
        <aside className="sidebar panel">
          <div className="sidebar-hero">
            <p>Semester project ready</p>
            <h2>Marketplace dashboard</h2>
            <span>Navigation, auth, seller tools, and responsive layouts in one frontend.</span>
          </div>

          <nav className="sidebar-nav">
            {navigationItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={activeView === item.key ? 'nav-item active' : 'nav-item'}
                onClick={() => {
                  setActiveView(item.key);
                  setMobileMenuOpen(false);
                }}
              >
                <span>{item.label}</span>
                <small>{item.description}</small>
              </button>
            ))}
          </nav>

          <div className="sidebar-card">
            <div className="card-header compact">
              <Heart size={16} />
              <span>Wishlisted today</span>
            </div>
            <strong>18 titles</strong>
            <p>Players are saving more narrative and strategy games this week.</p>
          </div>
        </aside>

        <main className="content">
          <section className="hero panel">
            <div className="hero-copy">
              <span className="eyebrow">{currentView.eyebrow}</span>
              <h1>{currentView.title}</h1>
              <p>{currentView.description}</p>

              <div className="hero-actions">
                <button type="button" className="cta primary" onClick={() => setActiveView('explore')}>
                  <ShoppingCart size={16} />
                  Explore catalog
                </button>
                <button type="button" className="cta ghost" onClick={() => setActiveView('sell')}>
                  <Sparkles size={16} />
                  Feature a game
                </button>
              </div>

              <div className="metric-row">
                {metrics.map((metric) => (
                  <article key={metric.label} className="metric-tile">
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                  </article>
                ))}
              </div>
            </div>

            <div className="auth-panel panel-inner">
              <div className="auth-toggle">
                <button type="button" className={authMode === 'login' ? 'pill active' : 'pill'} onClick={() => setAuthMode('login')}>
                  Login
                </button>
                <button type="button" className={authMode === 'signup' ? 'pill active' : 'pill'} onClick={() => setAuthMode('signup')}>
                  Sign Up
                </button>
              </div>

              <form className="auth-form" onSubmit={handleAuthSubmit}>
                <label>
                  <span>Name</span>
                  <input
                    type="text"
                    value={authForm.name}
                    onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={authForm.email}
                    onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                  />
                </label>
                <label>
                  <span>Password</span>
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                  />
                </label>

                <label>
                  <span>Account type</span>
                  <select value={authForm.role} onChange={(event) => setAuthForm({ ...authForm, role: event.target.value as 'buyer' | 'seller' })}>
                    <option value="buyer">Buyer</option>
                    <option value="seller">Seller</option>
                  </select>
                </label>

                <button type="submit" className="cta primary block">
                  {authMode === 'login' ? 'Enter dashboard' : 'Create account'}
                </button>
              </form>
            </div>
          </section>

          {activeView === 'home' && (
            <>
              <section className="panel carousel-panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Featured games</span>
                    <h2>Carousel spotlight</h2>
                  </div>
                  <div className="carousel-actions">
                    <button type="button" className="icon-button" onClick={() => featuredCarouselScroll('left')}>
                      <span aria-hidden="true">‹</span>
                    </button>
                    <button type="button" className="icon-button" onClick={() => featuredCarouselScroll('right')}>
                      <span aria-hidden="true">›</span>
                    </button>
                  </div>
                </div>

                <div className="featured-carousel" ref={(node) => {
                  featuredScrollRef[1](node);
                }}>
                  {featuredGamesList.map((game) => (
                    <article key={game.id} className="featured-slide" onClick={() => openGamePage(game.id)} role="button" tabIndex={0}>
                      <img src={game.media.cover} alt={game.title} />
                      <div className="featured-slide-copy">
                        <span>{game.genre}</span>
                        <h3>{game.title}</h3>
                        <p>{game.studio}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="grid-section">
                <article className="panel feature-card">
                  <div className="card-header">
                    <LayoutDashboard size={18} />
                    <span>Dashboard overview</span>
                  </div>
                  <h3>Everything important is on one screen.</h3>
                  <p>Buyers see recommendations, sellers manage listings, and admins watch analytics without jumping around.</p>
                </article>
                <article className="panel feature-card">
                  <div className="card-header">
                    <ShieldCheck size={18} />
                    <span>Security</span>
                  </div>
                  <h3>High security and clean workflows.</h3>
                  <p>The UI is ready for secure login, role-based access, and future payment integrations.</p>
                </article>
                <article className="panel feature-card">
                  <div className="card-header">
                    <Globe size={18} />
                    <span>Multi-device</span>
                  </div>
                  <h3>Responsive from phone to desktop.</h3>
                  <p>The layout collapses neatly so the semester project looks polished on any screen size.</p>
                </article>
              </section>
            </>
          )}

          {activeView === 'explore' && (
            <section className="two-column">
              <article className="panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Search and filter</span>
                    <h2>Browse indie games</h2>
                  </div>
                  <div className="genre-pills">
                    {genreOptions.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        className={market.activeGenre === genre ? 'pill active' : 'pill'}
                        onClick={() => dispatch(setActiveGenre(genre))}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="card-grid">
                  {filteredGames.map((game) => (
                    <article key={game.id} className="game-card clickable" onClick={() => openGamePage(game.id)} role="button" tabIndex={0}>
                      <img src={game.media.cover} alt={game.title} className="game-card-image" />
                      <div className="game-card-top">
                        <span className="genre-tag">{game.genre}</span>
                        {game.featured && <span className="featured-tag">Featured</span>}
                      </div>
                      <h3>{game.title}</h3>
                      <p>{game.description}</p>
                      <div className="game-card-meta">
                        <span>{game.studio}</span>
                        <strong>${game.price.toFixed(2)}</strong>
                      </div>
                      <div className="game-card-footer">
                        <span>
                          <Star size={14} /> {game.rating}
                        </span>
                        <button type="button" className="cta ghost compact" onClick={(event) => {
                          event.stopPropagation();
                          openGamePage(game.id);
                        }}>
                          <ShoppingCart size={14} />
                          View game
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </article>

              <aside className="panel recommendation-panel">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">AI recommendations</span>
                    <h2>Suggested for you</h2>
                  </div>
                </div>

                {recommendations.map((game) => (
                  <article key={game.id} className="recommendation-item">
                    <div>
                      <h3>{game.title}</h3>
                      <p>
                        {game.genre} · {game.studio}
                      </p>
                    </div>
                    <strong>${game.price.toFixed(2)}</strong>
                  </article>
                ))}

                <div className="notification-stack">
                  {market.notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className={`notification ${notification.tone}`}
                      onClick={() => dispatch(removeNotification(notification.id))}
                    >
                      <strong>{notification.title}</strong>
                      <span>{notification.detail}</span>
                    </button>
                  ))}
                </div>
              </aside>
            </section>
          )}

          {activeView === 'sell' && (
            <section className="two-column">
              <article className="panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Create and update</span>
                    <h2>Seller listing manager</h2>
                  </div>
                </div>

                <form className="listing-form" onSubmit={handleCreateDraft}>
                  <label>
                    <span>Game title</span>
                    <input
                      type="text"
                      value={draftForm.title}
                      onChange={(event) => setDraftForm({ ...draftForm, title: event.target.value })}
                      placeholder="New indie release"
                    />
                  </label>
                  <label>
                    <span>Genre</span>
                    <select value={draftForm.genre} onChange={(event) => setDraftForm({ ...draftForm, genre: event.target.value })}>
                      {genreOptions.filter((genre) => genre !== 'All').map((genre) => (
                        <option key={genre} value={genre}>
                          {genre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Price</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draftForm.price}
                      onChange={(event) => setDraftForm({ ...draftForm, price: event.target.value })}
                      placeholder="12.99"
                    />
                  </label>

                  <button type="submit" className="cta primary block">
                    Add listing
                  </button>
                </form>

                <div className="crud-list">
                  {market.draftGames.map((game) => (
                    <article key={game.id} className="crud-card">
                      <div className="crud-main">
                        <input
                          className="inline-title"
                          value={game.title}
                          onChange={(event) => dispatch(updateDraftGame({ id: game.id, changes: { title: event.target.value } }))}
                        />
                        <div className="crud-meta">
                          <select
                            value={game.genre}
                            onChange={(event) => dispatch(updateDraftGame({ id: game.id, changes: { genre: event.target.value } }))}
                          >
                            {genreOptions.filter((genre) => genre !== 'All').map((genre) => (
                              <option key={genre} value={genre}>
                                {genre}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={game.price}
                            onChange={(event) => dispatch(updateDraftGame({ id: game.id, changes: { price: Number(event.target.value) } }))}
                          />
                          <button
                            type="button"
                            className={game.featured ? 'pill active' : 'pill'}
                            onClick={() => dispatch(updateDraftGame({ id: game.id, changes: { featured: !game.featured } }))}
                          >
                            {game.featured ? 'Featured' : 'Feature it'}
                          </button>
                        </div>
                      </div>

                      <div className="crud-actions">
                        <span className={`status ${game.status.toLowerCase()}`}>{game.status}</span>
                        <button type="button" className="icon-button danger" onClick={() => dispatch(deleteDraftGame(game.id))}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </article>

              <aside className="panel info-rail">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">Business logic</span>
                    <h2>Company workflow</h2>
                  </div>
                </div>

                <div className="workflow-list">
                  <article>
                    <strong>1. Publish</strong>
                    <p>Sell games, add metadata, and create featured placements.</p>
                  </article>
                  <article>
                    <strong>2. Collect</strong>
                    <p>Prepare future payment, invoice, and cash-flow screens.</p>
                  </article>
                  <article>
                    <strong>3. Optimize</strong>
                    <p>Use analytics to improve conversion and user retention.</p>
                  </article>
                </div>
              </aside>
            </section>
          )}

          {activeView === 'analytics' && (
            <section className="analytics-layout">
              <article className="panel stats-panel">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">Dashboard insights</span>
                    <h2>Platform performance</h2>
                  </div>
                </div>

                <div className="stats-grid">
                  <article>
                    <strong>$18.2k</strong>
                    <span>Monthly gross sales</span>
                  </article>
                  <article>
                    <strong>742</strong>
                    <span>Orders completed</span>
                  </article>
                  <article>
                    <strong>86%</strong>
                    <span>Featured CTR</span>
                  </article>
                  <article>
                    <strong>4.8/5</strong>
                    <span>Average seller rating</span>
                  </article>
                </div>
              </article>

              <article className="panel timeline-panel">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">Activity</span>
                    <h2>Recent events</h2>
                  </div>
                </div>

                <div className="timeline">
                  <div>
                    <strong>09:10</strong>
                    <p>Seller requested a featured slot for Signal Grid.</p>
                  </div>
                  <div>
                    <strong>11:20</strong>
                    <p>Buyer purchased Ember Path and left a 5-star review.</p>
                  </div>
                  <div>
                    <strong>14:35</strong>
                    <p>The recommendation engine boosted puzzle games for 312 users.</p>
                  </div>
                </div>
              </article>
            </section>
          )}

          {activeView === 'blog' && (
            <section className="grid-section blog-grid">
              {blogPosts.map((post) => (
                <article key={post.title} className="panel blog-card">
                  <span className="eyebrow">{post.tag}</span>
                  <h3>{post.title}</h3>
                  <p>{post.blurb}</p>
                  <button type="button" className="cta ghost compact">
                    Read article
                  </button>
                </article>
              ))}
            </section>
          )}

          {activeView === 'contact' && (
            <section className="two-column">
              <article className="panel contact-card">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">Get in touch</span>
                    <h2>Contact and support</h2>
                  </div>
                </div>

                <div className="contact-grid">
                  <div>
                    <div className="contact-row">
                      <Mail size={16} /> support@gameforge.dev
                    </div>
                    <div className="contact-row">
                      <Users size={16} /> +92 300 1234567
                    </div>
                    <div className="contact-row">
                      <MapPin size={16} /> {companyProfile.city}
                    </div>
                  </div>
                  <div>
                    <p className="support-copy">We help buyers with orders, sellers with listings, and partners with promotions.</p>
                    <button type="button" className="cta primary">
                      Start a support ticket
                    </button>
                  </div>
                </div>
              </article>

              <article className="panel map-card">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">Google location</span>
                    <h2>Find our office</h2>
                  </div>
                </div>
                <iframe
                  title="GameForge office map"
                  src="https://www.google.com/maps?q=Lahore%20Pakistan&output=embed"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </article>
            </section>
          )}

          {activeView === 'profile' && (
            <section className="two-column">
              <article className="panel profile-card">
                <div className="profile-avatar">{session.user?.avatar ?? companyProfile.avatar}</div>
                <div>
                  <span className="eyebrow">User profile</span>
                  <h2>{session.user?.name ?? companyProfile.name}</h2>
                  <p>{session.user?.bio ?? companyProfile.bio}</p>
                </div>
                <div className="profile-meta">
                  <span>{session.user?.city ?? companyProfile.city}</span>
                  <span>{session.user?.role ?? 'Guest'} account</span>
                </div>
                <div className="genre-pills profile-pills">
                  {(session.user?.genres ?? companyProfile.genres).map((genre) => (
                    <span key={genre} className="pill static">
                      {genre}
                    </span>
                  ))}
                </div>
              </article>

              <article className="panel social-card">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">Social media</span>
                    <h2>Stay connected</h2>
                  </div>
                </div>

                <div className="social-list">
                  {socialLinks.map((link) => (
                    <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="social-link">
                      <span>{link.label}</span>
                      <strong>{link.handle}</strong>
                    </a>
                  ))}
                </div>
              </article>
            </section>
          )}

          {activeView === 'game' && selectedGame && (
            <section className="game-page-layout">
              <article className="panel game-hero">
                <div className="game-hero-media">
                  <img src={selectedGame.media.cover} alt={selectedGame.title} />
                </div>
                <div className="game-hero-copy">
                  <span className="eyebrow">{selectedGame.genre}</span>
                  <h2>{selectedGame.title}</h2>
                  <p>{selectedGame.description}</p>
                  <div className="game-hero-meta">
                    <span>{selectedGame.studio}</span>
                    <span><Star size={14} /> {selectedGame.rating}</span>
                    <strong>${selectedGame.price.toFixed(2)}</strong>
                  </div>
                  <div className="hero-actions">
                    <button type="button" className="cta primary">
                      <ShoppingCart size={16} />
                      Buy now
                    </button>
                    <button type="button" className="cta ghost" onClick={() => setActiveView('explore')}>
                      Back to explore
                    </button>
                  </div>
                </div>
              </article>

              <article className="panel gallery-panel">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">More pics</span>
                    <h2>Screenshot gallery</h2>
                  </div>
                </div>
                <div className="gallery-grid">
                  {selectedGame.media.gallery.map((image, index) => (
                    <figure key={`${selectedGame.id}-gallery-${index}`} className="gallery-card">
                      <img src={image} alt={`${selectedGame.title} screenshot ${index + 1}`} />
                    </figure>
                  ))}
                </div>
              </article>

              <article className="panel game-details-panel">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">About the game</span>
                    <h2>What players get</h2>
                  </div>
                </div>
                <div className="game-detail-columns">
                  <div>
                    <p>Steam-like store page with title art, trailer-ready media slots, and more screenshot previews.</p>
                    <p>Useful for buyers who want to inspect the game before purchase and for sellers who need a strong product page.</p>
                  </div>
                  <div className="game-detail-aside">
                    <span className="pill static">Default data</span>
                    <span className="pill static">Image gallery</span>
                    <span className="pill static">Click-through page</span>
                  </div>
                </div>
              </article>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;