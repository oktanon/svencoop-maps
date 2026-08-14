import React, { useState, useMemo, useEffect } from 'react';
import {
  Gamepad2,
  Dices,
  Heart,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Copy,
  Info,
  User,
  Star,
  Calendar,
  Layers,
  Maximize2,
  Tag,
  Terminal,
} from 'lucide-react';
import type { MapData } from './MapCard';
import { translations } from '../translations';
import type { Language } from '../translations';

interface MapPageViewProps {
  map: MapData;
  onBack: () => void;
  onGoHome?: () => void;
  onShowToast: (message: string) => void;
  onSelectAuthor?: (author: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  lang: Language;
  onToggleLang?: () => void;

  onPickRandom?: () => void;
  favoritesCount?: number;
  showOnlyFavorites?: boolean;
  onGoToFavorites?: () => void;
}

export const MapPageView: React.FC<MapPageViewProps> = ({
  map,
  onBack,
  onGoHome,
  onShowToast,
  onSelectAuthor,
  isFavorite,
  onToggleFavorite,
  lang,
  onToggleLang,
  onPickRandom,
  favoritesCount = 0,
  showOnlyFavorites = false,
  onGoToFavorites,
}) => {
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const t = translations[lang];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleCopyBsp = (bsp: string) => {
    navigator.clipboard.writeText(`map ${bsp}`);
    onShowToast(t.copiedConsole.replace('{cmd}', `map ${bsp}`));
  };

  const cleanUrl = (url: string) => {
    if (!url) return '';
    return url
      .replace(/^http:\/\//i, 'https://')
      .replace(/scmapdb\.wdfiles\.com/g, 'scmapdb.wikidot.com')
      .replace(/scmapdb\.com/g, 'scmapdb.wikidot.com');
  };

  const cleanDownloadUrl = (url: string) => {
    if (!url) return '';
    let cleaned = url;
    if (
      cleaned.includes('scmapdb.com/local--files/') ||
      cleaned.includes('scmapdb.wikidot.com/local--files/') ||
      cleaned.includes('scmapdb.wdfiles.com/local--files/')
    ) {
      cleaned = cleaned
        .replace(/^http:\/\//i, 'https://')
        .replace(/scmapdb\.com/g, 'scmapdb.wdfiles.com')
        .replace(/scmapdb\.wikidot\.com/g, 'scmapdb.wdfiles.com');

      cleaned = cleaned.replace(/\/local--files\/([^/]+)\//, (_, p1) => {
        return `/local--files/${p1.replace(/:/g, '%3A')}/`;
      });
    }
    return cleaned;
  };

  const extractedVideos = useMemo(() => {
    const list: Array<{ id: string; url: string; embedUrl: string; thumbnail: string }> = [];
    const videoIds = new Set<string>();

    const addVideo = (id: string, customUrl?: string, customEmbed?: string, customThumb?: string) => {
      if (id && id.length === 11 && !videoIds.has(id)) {
        videoIds.add(id);
        list.push({
          id,
          url: customUrl || `https://www.youtube.com/watch?v=${id}`,
          embedUrl: customEmbed || `https://www.youtube.com/embed/${id}`,
          thumbnail: customThumb || `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        });
      }
    };

    if (map.videos && map.videos.length > 0) {
      map.videos.forEach((v) => {
        addVideo(v.id, v.url, v.embedUrl, v.thumbnail);
      });
    }

    const htmlToSearch = `${map.description || ''} ${map.additional_info || ''}`;
    const ytPatterns = [
      /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/gi,
      /(?:youtube(?:-nocookie)?\.com\/watch\?(?:[^"'\s<>]*&)?v=)([a-zA-Z0-9_-]{11})/gi,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/gi,
    ];
    ytPatterns.forEach((regex) => {
      let match;
      while ((match = regex.exec(htmlToSearch)) !== null) {
        addVideo(match[1]);
      }
    });

    return list;
  }, [map]);

  const hasScreenshots = map.screenshots && map.screenshots.length > 0;
  const rawScreenshots = (hasScreenshots ? map.screenshots! : [map.thumbnail].filter(Boolean)).map(cleanUrl);

  // Put all screenshots first, and all videos at the end
  const mediaItems = useMemo(() => {
    const items: Array<
      | { type: 'image'; url: string }
      | { type: 'video'; id: string; url: string; embedUrl: string; thumbnail: string }
    > = rawScreenshots.map((url) => ({ type: 'image' as const, url }));

    extractedVideos.forEach((v) => {
      items.push({ type: 'video' as const, ...v });
    });

    return items;
  }, [rawScreenshots, extractedVideos]);

  const handleNextMedia = () => {
    if (mediaItems.length > 0) {
      setActiveImgIdx((prev) => (prev + 1) % mediaItems.length);
    }
  };

  const handlePrevMedia = () => {
    if (mediaItems.length > 0) {
      setActiveImgIdx((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
    }
  };

  const baseUrl = import.meta.env.BASE_URL || '/';
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  const handleBackClick = (e: React.MouseEvent) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      onBack();
    }
  };

  const handleHomeClick = (e: React.MouseEvent) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      if (onGoHome) {
        onGoHome();
      } else {
        onBack();
      }
    }
  };

  const authorName = map.author || t.unknownMapper;

  return (
    <div className="map-page-wrapper">
      {/* Top Header Bar */}
      <header className="app-header">
        <a href={cleanBaseUrl} onClick={handleHomeClick} className="brand-title" style={{ textDecoration: 'none' }}>
          <Gamepad2 size={28} color="var(--accent-gold)" />
          <div className="brand-text">
            <h1 style={{ color: 'var(--accent-gold)' }}>SVEN CO-OP MAPS</h1>
          </div>
        </a>

        <div className="action-row">
          {onPickRandom && (
            <button className="btn" onClick={onPickRandom} title={t.randomMap}>
              <Dices size={18} />
            </button>
          )}

          {onGoToFavorites && (
            <button
              className={`btn ${showOnlyFavorites ? 'btn-gold-solid' : ''}`}
              onClick={onGoToFavorites}
              title={t.myFavorites.replace('{count}', favoritesCount.toString())}
            >
              <Heart size={18} fill={showOnlyFavorites ? 'currentColor' : 'none'} />
            </button>
          )}

          {onToggleLang && (
            <button className="btn btn-gold-solid" onClick={onToggleLang}>
              EN / ES
            </button>
          )}
        </div>
      </header>

      {/* Full Width Breadcrumb Bar */}
      <nav className="detail-breadcrumb-bar">
        <a href={cleanBaseUrl} onClick={handleBackClick} className="detail-breadcrumb-back">
          <ArrowLeft size={14} />
          <span>{lang === 'es' ? 'Volver a la lista de mapas' : 'Back to map list'}</span>
        </a>
        <span className="detail-breadcrumb-divider">|</span>
        <a href={cleanBaseUrl} onClick={handleHomeClick} className="detail-breadcrumb-link">
          {lang === 'es' ? 'Inicio' : 'Home'}
        </a>
        <span className="detail-breadcrumb-divider">/</span>
        <a href={cleanBaseUrl} onClick={handleBackClick} className="detail-breadcrumb-link">
          {lang === 'es' ? 'Mapas' : 'Maps'}
        </a>
        <span className="detail-breadcrumb-divider">/</span>
        <span className="detail-breadcrumb-current">{map.title}</span>
      </nav>

      {/* Main 2-Column Detail Layout */}
      <div className="map-detail-page-layout">
        {/* LEFT MAIN COLUMN: Media Viewer & Description */}
        <main className="detail-main-column">

          {/* Media Player Card */}
          <div className="detail-media-card">
            <div className="detail-media-viewer">
              {mediaItems.length > 0 ? (
                mediaItems[activeImgIdx]?.type === 'video' ? (
                  <iframe
                    src={`${mediaItems[activeImgIdx].embedUrl}?autoplay=1&rel=0`}
                    title={`${map.title} video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                ) : (
                  <img
                    src={mediaItems[activeImgIdx]?.url}
                    alt={`${map.title} screenshot ${activeImgIdx + 1}`}
                    className="detail-media-active-img"
                  />
                )
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  <span>{t.fallbackCardTitle}</span>
                </div>
              )}

              {mediaItems.length > 1 && (
                <>
                  <button className="gallery-nav-btn prev" onClick={handlePrevMedia}>
                    <ChevronLeft size={24} />
                  </button>
                  <button className="gallery-nav-btn next" onClick={handleNextMedia}>
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails Row */}
            {mediaItems.length > 1 && (
              <div className="detail-thumbnails-strip">
                {mediaItems.map((item, idx) => (
                  <button
                    key={idx}
                    className={`detail-thumb-btn ${idx === activeImgIdx ? 'active' : ''} ${item.type === 'video' ? 'is-video-thumb' : ''}`}
                    onClick={() => setActiveImgIdx(idx)}
                    title={item.type === 'video' ? `Video ${item.id}` : `Screenshot ${idx + 1}`}
                  >
                    <img
                      src={item.type === 'video' ? item.thumbnail : item.url}
                      alt={`Thumbnail ${idx + 1}`}
                    />
                    {item.type === 'video' && (
                      <div className="thumb-video-badge">
                        <span>▶</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="detail-description-card">
            <h2 className="detail-description-header">
              <Info size={20} />
              <span>{t.descriptionLabel || 'Descripción'}</span>
            </h2>
            {map.description ? (
              <div
                className="detail-description-body"
                dangerouslySetInnerHTML={{ __html: map.description }}
              />
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>{t.noDescription}</p>
            )}

            {map.additional_info && (
              <>
                <h2 className="detail-description-header" style={{ marginTop: '24px' }}>
                  <Info size={20} />
                  <span>{lang === 'es' ? 'Información Adicional' : 'Additional Information'}</span>
                </h2>
                <div
                  className="detail-description-body"
                  dangerouslySetInnerHTML={{ __html: map.additional_info }}
                />
              </>
            )}
          </div>
        </main>

        {/* RIGHT COLUMN: Metadata & Actions Sidebar */}
        <aside className="detail-meta-card">
          <div className="detail-meta-header">
            <h1 className="detail-meta-title">{map.title}</h1>
            <button
              className={`btn-detail-favorite ${isFavorite ? 'active' : ''}`}
              onClick={() => onToggleFavorite(map.id)}
              title={t.favBtnTitle}
            >
              <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Specs List */}
          <div className="detail-specs-list">
            <div className="detail-spec-row">
              <User className="detail-spec-icon" />
              <span>Mapper:</span>
              <span className="detail-spec-gold">
                {onSelectAuthor && map.author ? (
                  <span
                    onClick={() => onSelectAuthor(map.author!)}
                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {map.author}
                  </span>
                ) : (
                  authorName
                )}
              </span>
            </div>

            <div className="detail-spec-row">
              <Star className="detail-spec-icon" />
              <span>Rating:</span>
              <span className="detail-spec-gold">
                {map.rating ? `${map.rating.toFixed(1)}/5` : '5/5'}
              </span>
            </div>

            {(map.original_release_date || map.original_year) && (
              <div className="detail-spec-row">
                <Calendar className="detail-spec-icon" />
                <span>Original Mod Release:</span>
                <span>{map.original_release_date || `${map.original_year}`}</span>
              </div>
            )}

            {(map.release_date || map.year) && (
              <div className="detail-spec-row">
                <Calendar className="detail-spec-icon" />
                <span>Date of Release:</span>
                <span>{map.release_date || `${map.year}`}</span>
              </div>
            )}

            {map.difficulty && map.difficulty !== 'unrated' && (
              <div className="detail-spec-row">
                <Layers className="detail-spec-icon" />
                <span>Dificultad:</span>
                <span>{map.difficulty}</span>
              </div>
            )}

            {map.size && map.size !== 'unrated' && (
              <div className="detail-spec-row">
                <Maximize2 className="detail-spec-icon" />
                <span>Tamaño:</span>
                <span>{map.size}</span>
              </div>
            )}
          </div>

          {/* Descargar Section */}
          <div className="detail-section-title">
            <Download size={18} />
            <span>Descargar</span>
          </div>

          {map.download_links && map.download_links.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {map.download_links.map((link, idx) => (
                <a
                  key={idx}
                  href={cleanDownloadUrl(link.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--text-gold)',
                    fontSize: '14px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  🔗 {link.name || 'SCMapDBMirror'}
                </a>
              ))}
            </div>
          ) : (
            <a
              href={cleanUrl(map.url)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--text-gold)',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              🔗 SCMapDBMirror
            </a>
          )}

          {/* Comandos de Consola Section */}
          {map.bsp_names && map.bsp_names.length > 0 && (
            <>
              <div className="detail-section-title">
                <Terminal size={18} />
                <span>Comandos de Consola</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {map.bsp_names.map((bsp, idx) => (
                  <div key={idx} className="detail-console-command-box">
                    <code>map {bsp}</code>
                    <button
                      className="btn-copy-command"
                      onClick={() => handleCopyBsp(bsp)}
                      title={t.copyBspTitle}
                    >
                      <Copy size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Tags Section */}
          {map.tags && map.tags.length > 0 && (
            <>
              <div className="detail-section-title">
                <Tag size={18} />
                <span>Tags</span>
              </div>

              <div className="detail-tags-cloud">
                {map.tags.map((tag) => (
                  <span key={tag} className="detail-tag-chip">
                    #{tag}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Bottom Action Solid Gold Button */}
          <a
            href={cleanUrl(map.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-view-original-solid"
          >
            <ExternalLink size={16} />
            <span>Ver Web Original</span>
          </a>
        </aside>
      </div>
    </div>
  );
};
