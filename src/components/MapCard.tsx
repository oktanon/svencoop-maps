import React from 'react';
import { Star, Heart, Copy, Info } from 'lucide-react';

export interface MapData {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  rating: number;
  tags: string[];
  scraped: boolean;
  author?: string;
  original_release_date?: string;
  release_date?: string;
  bsp_names?: string[];
  description?: string;
  additional_info?: string;
  download_links?: Array<{ name: string; url: string; type: string; description?: string }>;
  download_notes?: string[];
  screenshots?: string[];
  votes?: number;
  difficulty?: string;
  size?: string;
  year?: number | null;
}

interface MapCardProps {
  map: MapData;
  onSelect: (map: MapData) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onShowToast: (message: string) => void;
}

export const MapCard: React.FC<MapCardProps> = ({
  map,
  onSelect,
  isFavorite,
  onToggleFavorite,
  onShowToast,
}) => {
  const getDifficultyClass = (diff?: string) => {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return 'badge-easy';
      case 'medium':
        return 'badge-medium';
      case 'hard':
        return 'badge-hard';
      default:
        return '';
    }
  };

  const handleCopyBsp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (map.bsp_names && map.bsp_names.length > 0) {
      // Pick the main BSP name (first in the list)
      const bsp = map.bsp_names[0];
      navigator.clipboard.writeText(`map ${bsp}`);
      onShowToast(`Consola: "map ${bsp}" copiado al portapapeles`);
    } else {
      // Fallback if not fully scraped, try clean map ID
      const bspFallback = map.id.replace(/-/g, '_');
      navigator.clipboard.writeText(`map ${bspFallback}`);
      onShowToast(`Consola: "map ${bspFallback}" copiado al portapapeles`);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(map.id);
  };

  // Check if map is featured (e.g. high rating or featured tag)
  const isFeatured = map.tags.includes('featured') || map.rating >= 4.2;

  // Format author name nicely
  const authorName = map.author || 'Unknown Author';

  const cleanUrl = (url: string) => {
    if (!url) return '';
    return url
      .replace(/^http:\/\//i, 'https://')
      .replace(/scmapdb\.wdfiles\.com/g, 'scmapdb.wikidot.com')
      .replace(/scmapdb\.com/g, 'scmapdb.wikidot.com');
  };

  const getThumbnailSrc = () => {
    if (map.screenshots && map.screenshots.length > 0) {
      return cleanUrl(map.screenshots[0]);
    }
    return cleanUrl(map.thumbnail);
  };

  const imgSource = getThumbnailSrc();

  return (
    <div className={`map-card ${isFeatured ? 'featured' : ''}`} onClick={() => onSelect(map)}>
      <div className="card-image-wrap">
        <div className="card-image-fallback">
          <Info size={36} />
          <span>Sven Co-op Map</span>
        </div>

        {imgSource ? (
          <img
            src={imgSource}
            alt={map.title}
            className="card-image"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : null}

        {map.rating > 0 && (
          <div className="card-rating-badge">
            <Star size={14} className="rating-star-icon" />
            <span>{map.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="card-body">
        <div className="card-details-main">
          <div className="card-meta-top">
            {map.difficulty && map.difficulty !== 'unrated' && (
              <span className={`badge-label ${getDifficultyClass(map.difficulty)}`}>
                {map.difficulty}
              </span>
            )}
            {map.size && map.size !== 'unrated' && (
              <span className="badge-label">{map.size}</span>
            )}
            {map.year && (
              <span className="badge-label badge-year">{map.year}</span>
            )}
          </div>

          <h3 className="card-title" onClick={() => onSelect(map)}>
            {map.title}
          </h3>

          <div className="card-author">
            <span>Mapper:</span> {authorName}
          </div>

          <div className="card-tags">
            {map.tags
              .filter(t => !t.startsWith('difficulty:') && !t.startsWith('size:') && !t.match(/^\d{4}$/))
              .slice(0, 3)
              .map((tag) => (
                <span key={tag} className="card-tag">
                  #{tag}
                </span>
              ))}
          </div>
        </div>
      </div>

      <div className="card-footer">
        <button
          className={`btn-card-action ${isFavorite ? 'favorite-active' : ''}`}
          onClick={handleFavoriteClick}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={16} fill={isFavorite ? '#ff3b30' : 'none'} />
          <span>{isFavorite ? 'Favorito' : 'Favorito'}</span>
        </button>

        <button
          className="btn-card-action btn-card-bsp"
          onClick={handleCopyBsp}
          title="Copiar comando de consola para cargar el mapa"
        >
          <Copy size={14} />
          <span>Copy BSP</span>
        </button>
      </div>
    </div>
  );
};
