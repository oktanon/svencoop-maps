import { useState, useEffect, useMemo } from 'react';
import { Filter, LayoutGrid, List, RotateCcw, Shuffle, Sparkles, AlertCircle, Heart, Gamepad2, Dices } from 'lucide-react';
import { MapCard } from './components/MapCard';
import type { MapData } from './components/MapCard';
import { MapPageView } from './components/MapPageView';
import { FeaturedGallery } from './components/FeaturedGallery';
import { translations } from './translations';
import type { Language } from './translations';

interface FilterState {
  searchTerm: string;
  selectedDifficulty: string;
  selectedSize: string;
  selectedYear: string;
  selectedTags: string[];
  sortBy: string;
  selectedAuthor: string | null;
  currentPage: number;
}

const initialFilters: FilterState = {
  searchTerm: '',
  selectedDifficulty: 'all',
  selectedSize: 'all',
  selectedYear: 'all',
  selectedTags: [],
  sortBy: 'date-desc',
  selectedAuthor: null,
  currentPage: 1,
};

function App() {
  const [maps, setMaps] = useState<MapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Language state
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'es';
    const saved = localStorage.getItem('scmapdb_lang');
    if (saved === 'es' || saved === 'en') return saved as Language;
    const browserLang = navigator.language || (navigator as any).userLanguage || 'en';
    return browserLang.toLowerCase().startsWith('es') ? 'es' : 'en';
  });

  // Save language preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('scmapdb_lang', lang);
    }
  }, [lang]);

  const t = translations[lang];

  // Independent Filter & Search states for Main Catalog vs Favorites
  const [mainFilters, setMainFilters] = useState<FilterState>(initialFilters);
  const [favFilters, setFavFilters] = useState<FilterState>(initialFilters);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isGalleryVisible, setIsGalleryVisible] = useState(true);

  // Helper to access and update the currently active view's filter state
  const activeFilters = showOnlyFavorites ? favFilters : mainFilters;
  const setActiveFilters = showOnlyFavorites ? setFavFilters : setMainFilters;

  const updateActiveFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K] | ((prev: FilterState[K]) => FilterState[K])
  ) => {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: typeof value === 'function' ? (value as (prevVal: FilterState[K]) => FilterState[K])(prev[key]) : value,
      ...(key !== 'currentPage' ? { currentPage: 1 } : {}),
    }));
  };

  // Auto-hide gallery when main filters or sorting are modified
  useEffect(() => {
    if (
      mainFilters.searchTerm.trim() !== '' ||
      mainFilters.selectedDifficulty !== 'all' ||
      mainFilters.selectedSize !== 'all' ||
      mainFilters.selectedYear !== 'all' ||
      mainFilters.selectedTags.length > 0 ||
      mainFilters.sortBy !== 'date-desc' ||
      mainFilters.selectedAuthor !== null
    ) {
      setIsGalleryVisible(false);
    }
  }, [mainFilters]);

  // Read URL search parameters on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const searchParam = params.get('search');
      if (searchParam) {
        setMainFilters((prev) => ({ ...prev, selectedAuthor: searchParam }));
      }
    }
  }, []);

  // Items per page
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('scmapdb_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // Modal & Toast states
  const [selectedMap, setSelectedMap] = useState<MapData | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load maps database on mount
  useEffect(() => {
    const fetchMaps = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${import.meta.env.BASE_URL}maps_data.json`);
        if (!res.ok) {
          throw new Error(`Failed to load database. Status: ${res.status}`);
        }
        const data = await res.json();
        setMaps(data);
        setError(null);
      } catch (err: any) {
        console.error('Database load error:', err);
        setError(t.dbLoadError);
      } finally {
        setLoading(false);
      }
    };

    fetchMaps();
  }, [t.dbLoadError]);

  // Helper to sanitize map IDs for URLs and filesystems
  const sanitizeMapId = (id: string): string => {
    return id ? id.replace(/[:*?"<>|\\]/g, '-') : '';
  };

  // Helper to extract map ID from current URL path (/map/{id}/)
  const getMapIdFromUrl = (): string | null => {
    const pathname = window.location.pathname;
    const match = pathname.match(/\/map\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  };

  // Synchronize URL and map selection
  const handleSelectMap = (map: MapData | null) => {
    setSelectedMap(map);
    const baseUrl = import.meta.env.BASE_URL || '/';
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

    if (map) {
      const safeId = sanitizeMapId(map.id);
      const newPath = `${cleanBaseUrl}map/${safeId}/`;
      if (window.location.pathname !== newPath) {
        window.history.pushState({ mapId: map.id }, '', newPath);
      }
    } else {
      if (window.location.pathname.includes('/map/')) {
        window.history.pushState(null, '', cleanBaseUrl);
      }
    }
  };

  // Sync state with URL when maps data finishes loading
  useEffect(() => {
    if (maps.length === 0) return;
    const mapId = getMapIdFromUrl();
    if (mapId) {
      const targetMap = maps.find((m) => m.id === mapId || sanitizeMapId(m.id) === mapId);
      if (targetMap) {
        setSelectedMap(targetMap);
      }
    }
  }, [maps]);

  // Handle browser Back/Forward (popstate) buttons
  useEffect(() => {
    const handlePopState = () => {
      const mapId = getMapIdFromUrl();
      if (mapId) {
        const targetMap = maps.find((m) => m.id === mapId || sanitizeMapId(m.id) === mapId);
        if (targetMap) {
          setSelectedMap(targetMap);
          return;
        }
      }
      setSelectedMap(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [maps]);

  // Save favorites to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('scmapdb_favorites', JSON.stringify(favorites));
    }
  }, [favorites]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 3000);
  };

  const handleToggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fId) => fId !== id) : [...prev, id]
    );
  };

  const relevantMapsForFilters = useMemo(() => {
    if (showOnlyFavorites) {
      return maps.filter((m) => favorites.includes(m.id));
    }
    return maps;
  }, [maps, showOnlyFavorites, favorites]);

  // Derive unique tags and counts for active context
  const popularTags = useMemo(() => {
    const counts: Record<string, number> = {};
    relevantMapsForFilters.forEach((map) => {
      map.tags.forEach((tag) => {
        // Skip technical or system tags
        if (
          tag.startsWith('difficulty:') ||
          tag.startsWith('size:') ||
          tag.match(/^\d{4}$/) ||
          tag.startsWith('_')
        ) {
          return;
        }
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });

    // Sort by count descending
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30) // Show top 30 tags
      .map(([tag]) => tag);
  }, [relevantMapsForFilters]);

  // Derive unique years for active context
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    relevantMapsForFilters.forEach((map) => {
      if (map.year) yearsSet.add(map.year);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [relevantMapsForFilters]);

  // Toggle active tag in filter
  const handleTagToggle = (tag: string) => {
    updateActiveFilter('selectedTags', (prevTags) =>
      prevTags.includes(tag) ? prevTags.filter((t) => t !== tag) : [...prevTags, tag]
    );
  };

  // Clear active filters
  const handleResetFilters = () => {
    setActiveFilters(initialFilters);
  };

  const handleSelectAuthor = (authorName: string) => {
    updateActiveFilter('selectedAuthor', authorName);
    handleSelectMap(null);
    showToast(t.filteringAuthor.replace('{author}', authorName));
  };

  // Pick a random map from the current filtered list
  const handlePickRandom = () => {
    if (filteredAndSortedMaps.length > 0) {
      const randomIdx = Math.floor(Math.random() * filteredAndSortedMaps.length);
      handleSelectMap(filteredAndSortedMaps[randomIdx]);
      showToast(t.randomPickToast.replace('{title}', filteredAndSortedMaps[randomIdx].title));
    } else if (showOnlyFavorites && favorites.length > 0) {
      const favMaps = maps.filter((m) => favorites.includes(m.id));
      if (favMaps.length > 0) {
        const randomIdx = Math.floor(Math.random() * favMaps.length);
        handleSelectMap(favMaps[randomIdx]);
        showToast(t.randomPickToast.replace('{title}', favMaps[randomIdx].title));
      }
    } else if (maps.length > 0) {
      const randomIdx = Math.floor(Math.random() * maps.length);
      handleSelectMap(maps[randomIdx]);
      showToast(t.randomPickToast.replace('{title}', maps[randomIdx].title));
    } else {
      showToast(t.noMapsLoaded);
    }
  };

  // Perform client-side filter and sort
  const filteredAndSortedMaps = useMemo(() => {
    const sourceMaps = showOnlyFavorites ? maps.filter((m) => favorites.includes(m.id)) : maps;
    const { searchTerm, selectedDifficulty, selectedSize, selectedYear, selectedTags, selectedAuthor, sortBy } = activeFilters;

    return sourceMaps
      .filter((map) => {
        // Search query check
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase().trim();
          const titleMatch = map.title.toLowerCase().includes(query);
          const authorMatch = map.author?.toLowerCase().includes(query);
          const descMatch = map.description?.toLowerCase().includes(query);
          const bspMatch = map.bsp_names?.some((b) => b.toLowerCase().includes(query));
          const tagsMatch = map.tags.some((t) => t.toLowerCase().includes(query));

          if (!titleMatch && !authorMatch && !descMatch && !bspMatch && !tagsMatch) {
            return false;
          }
        }

        // Author filter
        if (selectedAuthor) {
          if (!map.author?.toLowerCase().includes(selectedAuthor.toLowerCase())) {
            return false;
          }
        }

        // Difficulty filter
        if (selectedDifficulty !== 'all') {
          if (selectedDifficulty === 'unrated') {
            if (map.difficulty && map.difficulty !== 'unrated') return false;
          } else if (map.difficulty !== selectedDifficulty) {
            return false;
          }
        }

        // Size filter
        if (selectedSize !== 'all') {
          if (selectedSize === 'unrated') {
            if (map.size && map.size !== 'unrated') return false;
          } else if (map.size !== selectedSize) {
            return false;
          }
        }

        // Year filter
        if (selectedYear !== 'all') {
          if (map.year?.toString() !== selectedYear) return false;
        }

        // Tags multi-select filter (must match ALL selected tags)
        if (selectedTags.length > 0) {
          const hasAllTags = selectedTags.every((t) => map.tags.includes(t));
          if (!hasAllTags) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const getMapReleaseTimestamp = (map: MapData): number => {
          const dateStr = map.release_date || map.original_release_date;
          if (dateStr) {
            const cleaned = dateStr.replace(/^[A-Za-z0-9._\s-]+-\s*/, '').trim();
            const parsed = Date.parse(cleaned);
            if (!isNaN(parsed)) {
              return parsed;
            }
            const yearMatch = dateStr.match(/\b(19\d\d|20\d\d)\b/);
            if (yearMatch) {
              return new Date(parseInt(yearMatch[1], 10), 0, 1).getTime();
            }
          }
          if (map.year) {
            return new Date(map.year, 0, 1).getTime();
          }
          return 0;
        };

        switch (sortBy) {
          case 'date-desc':
            return getMapReleaseTimestamp(b) - getMapReleaseTimestamp(a);
          case 'date-asc':
            return getMapReleaseTimestamp(a) - getMapReleaseTimestamp(b);
          case 'name-asc':
            return a.title.localeCompare(b.title);
          case 'name-desc':
            return b.title.localeCompare(a.title);
          case 'rating-desc':
            return (b.rating || 0) - (a.rating || 0);
          case 'rating-asc':
            return (a.rating || 0) - (b.rating || 0);
          case 'year-desc':
            return (b.year || 0) - (a.year || 0);
          case 'year-asc':
            return (a.year || 0) - (b.year || 0);
          default:
            return 0;
        }
      });
  }, [maps, showOnlyFavorites, favorites, activeFilters]);

  // Derive paginated list and total pages
  const totalPages = Math.ceil(filteredAndSortedMaps.length / itemsPerPage);
  const paginatedMaps = useMemo(() => {
    const startIndex = (activeFilters.currentPage - 1) * itemsPerPage;
    return filteredAndSortedMaps.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedMaps, activeFilters.currentPage, itemsPerPage]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const maxPagesToShow = 5;
    let startPage = Math.max(1, activeFilters.currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    return (
      <div className="pagination-container">
        <button
          className="btn pagination-btn"
          disabled={activeFilters.currentPage === 1}
          onClick={() => updateActiveFilter('currentPage', Math.max(1, activeFilters.currentPage - 1))}
        >
          {t.paginationPrev}
        </button>

        {startPage > 1 && (
          <>
            <button
              className={`pagination-page ${activeFilters.currentPage === 1 ? 'active' : ''}`}
              onClick={() => updateActiveFilter('currentPage', 1)}
            >
              1
            </button>
            {startPage > 2 && <span className="pagination-dots">...</span>}
          </>
        )}

        {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((p) => (
          <button
            key={p}
            className={`pagination-page ${activeFilters.currentPage === p ? 'active' : ''}`}
            onClick={() => updateActiveFilter('currentPage', p)}
          >
            {p}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="pagination-dots">...</span>}
            <button
              className={`pagination-page ${activeFilters.currentPage === totalPages ? 'active' : ''}`}
              onClick={() => updateActiveFilter('currentPage', totalPages)}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          className="btn pagination-btn"
          disabled={activeFilters.currentPage === totalPages}
          onClick={() => updateActiveFilter('currentPage', Math.min(totalPages, activeFilters.currentPage + 1))}
        >
          {t.paginationNext}
        </button>

        <div className="items-per-page-container">
          <span>{t.mapsPerPage}</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              updateActiveFilter('currentPage', 1);
            }}
            className="filter-select"
            style={{ width: '80px', padding: '6px 10px' }}
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
            <option value={96}>96</option>
          </select>
        </div>
      </div>
    );
  };

  const handleGoToFavorites = () => {
    handleSelectMap(null);
    setShowOnlyFavorites(true);
  };

  if (selectedMap) {
    return (
      <div className="app-container">
        {toastMessage && (
          <div className="toast-alert">
            <Sparkles size={16} style={{ color: 'var(--accent)' }} />
            <span>{toastMessage}</span>
          </div>
        )}
        <MapPageView
          map={selectedMap}
          onBack={() => handleSelectMap(null)}
          onGoHome={() => {
            handleSelectMap(null);
            setMainFilters(initialFilters);
            setShowOnlyFavorites(false);
            setIsGalleryVisible(true);
          }}
          onShowToast={showToast}
          onSelectAuthor={handleSelectAuthor}
          isFavorite={favorites.includes(selectedMap.id)}
          onToggleFavorite={handleToggleFavorite}
          lang={lang}
          onToggleLang={() => setLang((prev) => (prev === 'es' ? 'en' : 'es'))}
          onPickRandom={handlePickRandom}
          favoritesCount={favorites.length}
          showOnlyFavorites={showOnlyFavorites}
          onGoToFavorites={handleGoToFavorites}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Toast popup */}
      {toastMessage && (
        <div className="toast-alert">
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header section */}
      <header className="app-header">
        <a
          href={import.meta.env.BASE_URL || '/'}
          onClick={(e) => {
            e.preventDefault();
            handleSelectMap(null);
            setShowOnlyFavorites(false);
          }}
          className="brand-title"
          style={{ textDecoration: 'none' }}
        >
          <Gamepad2 size={28} color="var(--accent-gold)" />
          <div className="brand-text">
            <h1 style={{ color: 'var(--accent-gold)' }}>SVEN CO-OP MAPS</h1>
          </div>
        </a>

        <div className="action-row">
          <button className="btn" onClick={handlePickRandom} title={t.randomMap}>
            <Dices size={18} />
          </button>

          <button
            className={`btn ${showOnlyFavorites ? 'btn-gold-solid' : ''}`}
            onClick={handleGoToFavorites}
            title={t.myFavorites.replace('{count}', favorites.length.toString())}
          >
            <Heart size={18} fill={showOnlyFavorites ? 'currentColor' : 'none'} />
          </button>

          <button
            className="btn btn-gold-solid"
            onClick={() => setLang((prev) => (prev === 'es' ? 'en' : 'es'))}
            title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          >
            EN / ES
          </button>
        </div>
      </header>

      {/* Database Error Banner */}
      {error && (
        <div className="empty-state" style={{ borderColor: '#e74c3c', background: 'rgba(231,76,60,0.05)', marginBottom: '30px' }}>
          <AlertCircle size={40} style={{ color: '#e74c3c' }} />
          <h3>{t.dbNotLoadedHeader}</h3>
          <p>{error}</p>
          <div style={{ fontSize: '0.85rem', fontFamily: 'JetBrains Mono', background: '#000', padding: '12px 18px', borderRadius: '6px', opacity: 0.8 }}>
            {t.scraperTip}
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-state" style={{ padding: '80px 20px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ fontFamily: 'JetBrains Mono, monospace', marginTop: '10px' }}>{t.loadingDb}</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div className="dashboard-layout">
          {/* Left Sidebar Filter Panel */}
          <aside className="filters-panel">
            <div id="header" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                <span>{t.filtersHeader}</span>
              </div>
            </div>
            <div>
              <span className="filter-section-title">{t.searchLabel}</span>
              <div className="search-box">
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={activeFilters.searchTerm}
                  onChange={(e) => updateActiveFilter('searchTerm', e.target.value)}
                  className="search-input"
                />
                <Filter size={18} className="search-icon" />
              </div>
            </div>

            <div>
              <span className="filter-section-title">{t.difficultyLabel}</span>
              <select
                value={activeFilters.selectedDifficulty}
                onChange={(e) => updateActiveFilter('selectedDifficulty', e.target.value)}
                className="filter-select"
              >
                <option value="all">{t.allOptions}</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="unrated">{t.unratedOption}</option>
              </select>
            </div>

            <div>
              <span className="filter-section-title">{t.sizeLabel}</span>
              <select
                value={activeFilters.selectedSize}
                onChange={(e) => updateActiveFilter('selectedSize', e.target.value)}
                className="filter-select"
              >
                <option value="all">{t.allOptionsSize}</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="unrated">{t.unratedOption}</option>
              </select>
            </div>

            {availableYears.length > 0 && (
              <div>
                <span className="filter-section-title">{t.yearLabel}</span>
                <select
                  value={activeFilters.selectedYear}
                  onChange={(e) => updateActiveFilter('selectedYear', e.target.value)}
                  className="filter-select"
                >
                  <option value="all">{t.allYears}</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y.toString()}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {popularTags.length > 0 && (
              <div>
                <span className="filter-section-title">{t.popularTagsLabel}</span>
                <div className="tag-list-filter">
                  {popularTags.map((tag) => {
                    const isActive = activeFilters.selectedTags.includes(tag);
                    return (
                      <span
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className={`tag-filter-pill ${isActive ? 'active' : ''}`}
                      >
                        {tag}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="stats-box">
              <span>{t.resultsCount} </span>
              <strong className="stats-count">{filteredAndSortedMaps.length}</strong> / {showOnlyFavorites ? favorites.length : maps.length}
            </div>

            <button className="btn-clear-filters" onClick={handleResetFilters}>
              <span>{t.clearFilters}</span>
            </button>
          </aside>

          {/* Right Content Area */}
          <main className="content-area">
            {showOnlyFavorites ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px 20px',
                  marginBottom: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Heart size={24} fill="#e74c3c" color="#e74c3c" />
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                    {lang === 'es' ? 'Mis Mapas Favoritos' : 'My Favorite Maps'} ({favorites.length})
                  </h2>
                </div>
                <button className="btn btn-gold" onClick={() => setShowOnlyFavorites(false)}>
                  ← {lang === 'es' ? 'Ver Todos los Mapas' : 'View All Maps'}
                </button>
              </div>
            ) : (
              isGalleryVisible && (
                <FeaturedGallery
                  maps={maps}
                  onSelectMap={handleSelectMap}
                  lang={lang}
                  onHideGallery={() => setIsGalleryVisible(false)}
                />
              )
            )}

            {/* Toolbar Panel */}
            <div className="toolbar-panel">
              <div className="sort-container">
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t.sortByLabel}</span>
                <select
                  value={activeFilters.sortBy}
                  onChange={(e) => updateActiveFilter('sortBy', e.target.value)}
                  className="filter-select"
                  style={{ width: '180px', padding: '8px 12px' }}
                >
                  <option value="date-desc">{t.sortDateDesc}</option>
                  <option value="date-asc">{t.sortDateAsc}</option>
                  <option value="rating-desc">{t.sortRatingDesc}</option>
                  <option value="rating-asc">{t.sortRatingAsc}</option>
                  <option value="year-desc">{t.sortYearDesc}</option>
                  <option value="year-asc">{t.sortYearAsc}</option>
                  <option value="name-asc">{t.sortNameAsc}</option>
                  <option value="name-desc">{t.sortNameDesc}</option>
                </select>
              </div>

              <div className="view-toggle">
                <button
                  className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List View"
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            {activeFilters.selectedAuthor && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 179, 0, 0.08)',
                border: '1px solid var(--accent)',
                color: 'var(--text-primary)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                marginBottom: '15px',
                fontFamily: 'var(--font-mono)'
              }}>
                <span>{t.mapperFilterLabel.replace('{author}', activeFilters.selectedAuthor)}</span>
                <button
                  onClick={() => updateActiveFilter('selectedAuthor', null)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    padding: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    lineHeight: '1'
                  }}
                  title={t.clearMapperFilter}
                >
                  &times;
                </button>
              </div>
            )}

            {/* Maps Grid */}
            {filteredAndSortedMaps.length > 0 ? (
              <>
                <div className={`maps-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
                  {paginatedMaps.map((map) => (
                    <MapCard
                      key={map.id}
                      map={map}
                      onSelect={handleSelectMap}
                      isFavorite={favorites.includes(map.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onShowToast={showToast}
                      onSelectAuthor={handleSelectAuthor}
                      lang={lang}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
                {renderPagination()}
              </>
            ) : (
              <div className="empty-state">
                <Filter size={48} className="empty-state-icon" />
                <h3>{t.noMapsFound}</h3>
                <p>{t.adjustFiltersTip}</p>
                <button className="btn btn-primary" onClick={handleResetFilters}>
                  {t.clearFiltersBtn}
                </button>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
