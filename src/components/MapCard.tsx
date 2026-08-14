import React from 'react';
import { Star, Heart, Copy, Info } from 'lucide-react';
import { translations } from '../translations';
import type { Language } from '../translations';

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
  known_issues?: string;
  screenshots?: string[];
  videos?: Array<{ id: string; url: string; embedUrl: string; thumbnail?: string }>;
  votes?: number;
  difficulty?: string;
  size?: string;
  year?: number | null;
  original_year?: number | null;
}

interface MapCardProps {
  map: MapData;
  onSelect: (map: MapData) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onShowToast: (message: string) => void;
  onSelectAuthor?: (author: string) => void;
  lang: Language;
  viewMode?: 'grid' | 'list';
}

const cleanHtmlToPlainText = (html?: string): string => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

export const MapCard: React.FC<MapCardProps> = ({
  map,
  onSelect,
  isFavorite,
  onToggleFavorite,
  onShowToast,
  onSelectAuthor,
  lang,
  viewMode = 'grid',
}) => {
  const t = translations[lang];

  const handleCopyBsp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (map.bsp_names && map.bsp_names.length > 0) {
      const bsp = map.bsp_names[0];
      navigator.clipboard.writeText(`map ${bsp}`);
      onShowToast(t.copiedConsole.replace('{cmd}', `map ${bsp}`));
    } else {
      const bspFallback = map.id.replace(/-/g, '_');
      navigator.clipboard.writeText(`map ${bspFallback}`);
      onShowToast(t.copiedConsole.replace('{cmd}', `map ${bspFallback}`));
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(map.id);
  };

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

  const sanitizeMapId = (id: string): string => {
    return id ? id.replace(/[:*?"<>|\\]/g, '-') : '';
  };

  const safeId = sanitizeMapId(map.id);
  const baseUrl = import.meta.env.BASE_URL || '/';
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const mapHref = `${cleanBaseUrl}map/${safeId}/`;

  const handleCardClick = (e: React.MouseEvent) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      onSelect(map);
    }
  };

  const imgSource = getThumbnailSrc();
  const descriptionSnippet = cleanHtmlToPlainText(map.description);
  const isListView = viewMode === 'list';

  return (
    <a
      href={mapHref}
      className={`map-card ${isListView ? 'map-card-list' : ''}`}
      onClick={handleCardClick}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div className="map-card-thumbnail-wrapper">
        {imgSource ? (
          <img
            src={imgSource}
            alt={map.title}
            className="map-card-thumbnail"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <Info size={24} />
          </div>
        )}
      </div>

      <div className="map-card-content">
        <div className="map-card-header">
          <h3 className="map-card-title">{map.title}</h3>
          {!isListView && (
            <div className="map-card-rating">
              <Star size={15} fill="currentColor" color="var(--accent-gold)" />
              <span>{map.rating > 0 ? map.rating.toFixed(1) : '5.0'}</span>
            </div>
          )}
        </div>

        <div className="map-card-mapper">
          <span>Mapper: </span>
          <span
            className="map-card-mapper-name"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelectAuthor?.(authorName);
            }}
            style={{ cursor: 'pointer' }}
          >
            {authorName}
          </span>
        </div>

        {isListView && descriptionSnippet && (
          <p className="map-card-description-snippet" title={descriptionSnippet}>
            {descriptionSnippet}
          </p>
        )}

        <div className="map-card-tags">
          {map.difficulty && map.difficulty !== 'unrated' && (
            <span className="map-tag-pill map-badge-difficulty">
              {map.difficulty}
            </span>
          )}
          {map.size && map.size !== 'unrated' && (
            <span className="map-tag-pill map-badge-size">
              {map.size}
            </span>
          )}
          {map.tags
            .filter((t) => !t.startsWith('difficulty:') && !t.startsWith('size:') && !t.match(/^\d{4}$/))
            .slice(0, isListView ? 6 : 5)
            .map((tag) => (
              <span key={tag} className="map-tag-pill">
                {tag}
              </span>
            ))}
        </div>
      </div>

      {isListView ? (
        <div className="map-card-list-side">
          <div className="map-card-rating">
            <Star size={16} fill="currentColor" color="var(--accent-gold)" />
            <span>{map.rating > 0 ? map.rating.toFixed(1) : '5.0'}</span>
          </div>

          <div className="map-card-actions">
            <button
              className={`btn-card-favorite ${isFavorite ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                handleFavoriteClick(e);
              }}
              title={t.favBtnTitle}
            >
              <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} />
              <span>{t.favoriteBtn}</span>
            </button>

            <button
              className="btn-card-copy-bsp"
              onClick={(e) => {
                e.preventDefault();
                handleCopyBsp(e);
              }}
              title={t.copyBspTitle}
            >
              <Copy size={14} />
              <span>{t.copyBspBtn}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="map-card-actions">
          <button
            className={`btn-card-favorite ${isFavorite ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleFavoriteClick(e);
            }}
            title={t.favBtnTitle}
          >
            <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} />
            <span>{t.favoriteBtn}</span>
          </button>

          <button
            className="btn-card-copy-bsp"
            onClick={(e) => {
              e.preventDefault();
              handleCopyBsp(e);
            }}
            title={t.copyBspTitle}
          >
            <Copy size={14} />
            <span>{t.copyBspBtn}</span>
          </button>
        </div>
      )}
    </a>
  );
};
