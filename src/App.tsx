import { useState, useEffect, useMemo } from 'react';
import { Filter, LayoutGrid, List, RotateCcw, Shuffle, Sparkles, AlertCircle, Heart } from 'lucide-react';
import { MapCard } from './components/MapCard';
import type { MapData } from './components/MapCard';
import { MapModal } from './components/MapModal';

function App() {
  const [maps, setMaps] = useState<MapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedSize, setSelectedSize] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState('rating-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
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
        const res = await fetch('/maps_data.json');
        if (!res.ok) {
          throw new Error(`Failed to load database. Status: ${res.status}`);
        }
        const data = await res.json();
        setMaps(data);
        setError(null);
      } catch (err: any) {
        console.error('Database load error:', err);
        setError('No se pudo cargar la base de datos de mapas. Ejecuta el scraper para generarla.');
      } finally {
        setLoading(false);
      }
    };

    fetchMaps();
  }, []);

  // Save favorites to localStorage when they change
  useEffect(() => {
    localStorage.setItem('scmapdb_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDifficulty, selectedSize, selectedYear, selectedTags, showOnlyFavorites, sortBy]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(prev => (prev === message ? null : prev));
    }, 3000);
  };

  const handleToggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fId) => fId !== id) : [...prev, id]
    );
  };

  // Derive unique tags and counts from all maps to build tag filters
  const popularTags = useMemo(() => {
    const counts: Record<string, number> = {};
    maps.forEach((map) => {
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
  }, [maps]);

  // Derive unique years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    maps.forEach((map) => {
      if (map.year) yearsSet.add(map.year);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [maps]);

  // Toggle active tag in filter
  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Clear all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDifficulty('all');
    setSelectedSize('all');
    setSelectedYear('all');
    setSelectedTags([]);
    setShowOnlyFavorites(false);
  };

  // Pick a random map from the current filtered list
  const handlePickRandom = () => {
    if (filteredAndSortedMaps.length > 0) {
      const randomIdx = Math.floor(Math.random() * filteredAndSortedMaps.length);
      setSelectedMap(filteredAndSortedMaps[randomIdx]);
      showToast(`🎲 Mapa aleatorio: "${filteredAndSortedMaps[randomIdx].title}"`);
    } else if (maps.length > 0) {
      const randomIdx = Math.floor(Math.random() * maps.length);
      setSelectedMap(maps[randomIdx]);
      showToast(`🎲 Mapa aleatorio: "${maps[randomIdx].title}"`);
    } else {
      showToast('No hay mapas cargados en la base de datos.');
    }
  };

  // Perform client-side filter and sort
  const filteredAndSortedMaps = useMemo(() => {
    return maps
      .filter((map) => {
        // Search query check
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase().trim();
          const titleMatch = map.title.toLowerCase().includes(query);
          const authorMatch = map.author?.toLowerCase().includes(query);
          const descMatch = map.description?.toLowerCase().includes(query);
          const bspMatch = map.bsp_names?.some(b => b.toLowerCase().includes(query));
          const tagsMatch = map.tags.some(t => t.toLowerCase().includes(query));
          
          if (!titleMatch && !authorMatch && !descMatch && !bspMatch && !tagsMatch) {
            return false;
          }
        }

        // Favorites filter
        if (showOnlyFavorites && !favorites.includes(map.id)) {
          return false;
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
        switch (sortBy) {
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
  }, [maps, searchTerm, selectedDifficulty, selectedSize, selectedYear, selectedTags, showOnlyFavorites, favorites, sortBy]);

  // Derive paginated list and total pages
  const totalPages = Math.ceil(filteredAndSortedMaps.length / itemsPerPage);
  const paginatedMaps = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedMaps.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedMaps, currentPage, itemsPerPage]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    return (
      <div className="pagination-container">
        <button
          className="btn pagination-btn"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
        >
          Anterior
        </button>

        {startPage > 1 && (
          <>
            <button
              className={`pagination-page ${currentPage === 1 ? 'active' : ''}`}
              onClick={() => setCurrentPage(1)}
            >
              1
            </button>
            {startPage > 2 && <span className="pagination-dots">...</span>}
          </>
        )}

        {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((p) => (
          <button
            key={p}
            className={`pagination-page ${currentPage === p ? 'active' : ''}`}
            onClick={() => setCurrentPage(p)}
          >
            {p}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="pagination-dots">...</span>}
            <button
              className={`pagination-page ${currentPage === totalPages ? 'active' : ''}`}
              onClick={() => setCurrentPage(totalPages)}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          className="btn pagination-btn"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
        >
          Siguiente
        </button>

        <div className="items-per-page-container">
          <span>Mapas por página:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
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
        <div className="brand-title">
          <img 
            src="/icon_steam.png" 
            alt="Steam VGUI logo" 
            className="brand-icon" 
            style={{ height: '32px', width: 'auto', imageRendering: 'pixelated' }} 
          />
          <div className="brand-text">
            <h1>Sven Co-op Map Explorer</h1>
            <p>Database Portal / VGUI Alternative</p>
          </div>
        </div>

        <div className="action-row">
          <button className="btn btn-primary" onClick={handlePickRandom}>
            <Shuffle size={16} />
            <span>Mapa Aleatorio</span>
          </button>
          
          <button
            className={`btn ${showOnlyFavorites ? 'btn-primary' : ''}`}
            onClick={() => setShowOnlyFavorites(prev => !prev)}
          >
            <Heart size={16} fill={showOnlyFavorites ? 'currentColor' : 'none'} />
            <span>Mis Favoritos ({favorites.length})</span>
          </button>
        </div>
      </header>

      {/* Database Error Banner */}
      {error && (
        <div className="empty-state" style={{ borderColor: '#e74c3c', background: 'rgba(231,76,60,0.05)', marginBottom: '30px' }}>
          <AlertCircle size={40} style={{ color: '#e74c3c' }} />
          <h3>No se cargaron los mapas</h3>
          <p>{error}</p>
          <div style={{ fontSize: '0.85rem', fontFamily: 'JetBrains Mono', background: '#000', padding: '12px 18px', borderRadius: '6px', opacity: 0.8 }}>
            Correr en la carpeta del scraper: node scraper.js
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
          <p style={{ fontFamily: 'JetBrains Mono, monospace', marginTop: '10px' }}>Cargando base de datos de mapas...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div className="dashboard-layout">
          {/* Left Sidebar Filter Panel */}
          <aside className="filters-panel">
            <div id="header" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                <img src="/icon_steam.png" style={{ height: '16px', width: 'auto', imageRendering: 'pixelated' }} alt="Steam" />
                <span>Filters</span>
              </div>
            </div>
            <div>
              <span className="filter-section-title">Búsqueda</span>
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Título, autor, bsp, tag..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <Filter size={18} className="search-icon" />
              </div>
            </div>

            <div>
              <span className="filter-section-title">Dificultad</span>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="filter-select"
              >
                <option value="all">Todas</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="unrated">Sin clasificar (Unrated)</option>
              </select>
            </div>

            <div>
              <span className="filter-section-title">Tamaño</span>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="filter-select"
              >
                <option value="all">Todos</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="unrated">Sin clasificar (Unrated)</option>
              </select>
            </div>

            {availableYears.length > 0 && (
              <div>
                <span className="filter-section-title">Año de Lanzamiento</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Todos los años</option>
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
                <span className="filter-section-title">Tags Populares</span>
                <div className="tag-list-filter">
                  {popularTags.map((tag) => {
                    const isActive = selectedTags.includes(tag);
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
              <span>Resultados: </span>
              <strong className="stats-count">{filteredAndSortedMaps.length}</strong> / {maps.length}
            </div>

            <button className="btn" onClick={handleResetFilters} style={{ justifyContent: 'center' }}>
              <RotateCcw size={16} />
              <span>Limpiar filtros</span>
            </button>
          </aside>

          {/* Right Content Area */}
          <main className="content-area">
            {/* Toolbar Panel */}
            <div className="toolbar-panel">
              <div className="sort-container">
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Ordenar por:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select"
                  style={{ width: '180px', padding: '8px 12px' }}
                >
                  <option value="rating-desc">Rating (Mayor a Menor)</option>
                  <option value="rating-asc">Rating (Menor a Mayor)</option>
                  <option value="year-desc">Año (Más Nuevo)</option>
                  <option value="year-asc">Año (Más Viejo)</option>
                  <option value="name-asc">Nombre (A-Z)</option>
                  <option value="name-desc">Nombre (Z-A)</option>
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

            {/* Maps Grid */}
            {filteredAndSortedMaps.length > 0 ? (
              <>
                <div className={`maps-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
                  {paginatedMaps.map((map) => (
                    <MapCard
                      key={map.id}
                      map={map}
                      onSelect={setSelectedMap}
                      isFavorite={favorites.includes(map.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onShowToast={showToast}
                    />
                  ))}
                </div>
                {renderPagination()}
              </>
            ) : (
              <div className="empty-state">
                <Filter size={48} className="empty-state-icon" />
                <h3>No se encontraron mapas</h3>
                <p>Prueba ajustando los filtros de búsqueda o eliminando tags seleccionados.</p>
                <button className="btn btn-primary" onClick={handleResetFilters}>
                  Limpiar Filtros
                </button>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Map Detail Modal */}
      {selectedMap && (
        <MapModal
          map={selectedMap}
          onClose={() => setSelectedMap(null)}
          onShowToast={showToast}
        />
      )}
    </div>
  );
}

export default App;
