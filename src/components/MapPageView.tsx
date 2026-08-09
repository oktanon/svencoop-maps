import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Download, ExternalLink, Copy, HelpCircle, Star, Heart, ArrowLeft, Tag, Calendar, User, HardDrive, ShieldAlert, Play } from 'lucide-react';
import type { MapData } from './MapCard';
import iconSteam from '../assets/icon_steam.png';
import { translations } from '../translations';
import type { Language } from '../translations';

interface MapPageViewProps {
  map: MapData;
  onBack: () => void;
  onShowToast: (message: string) => void;
  onSelectAuthor?: (author: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  lang: Language;
  onToggleLang?: () => void;
}

export const MapPageView: React.FC<MapPageViewProps> = ({
  map,
  onBack,
  onShowToast,
  onSelectAuthor,
  isFavorite,
  onToggleFavorite,
  lang,
  onToggleLang,
}) => {
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const t = translations[lang];

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

  // Extract YouTube video links dynamically if present in description or additional_info or map.videos
  const extractedVideos = useMemo(() => {
    const list: Array<{ id: string; url: string; embedUrl: string; thumbnail: string }> = [];
    const videoIds = new Set<string>();

    if (map.videos && map.videos.length > 0) {
      map.videos.forEach(v => {
        if (!videoIds.has(v.id)) {
          videoIds.add(v.id);
          list.push({
            id: v.id,
            url: v.url || `https://www.youtube.com/watch?v=${v.id}`,
            embedUrl: v.embedUrl || `https://www.youtube.com/embed/${v.id}`,
            thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`
          });
        }
      });
    }

    const htmlToSearch = `${map.description || ''} ${map.additional_info || ''}`;
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/gi;
    let match;
    while ((match = ytRegex.exec(htmlToSearch)) !== null) {
      const videoId = match[1];
      if (videoId && !videoIds.has(videoId)) {
        videoIds.add(videoId);
        list.push({
          id: videoId,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        });
      }
    }
    return list;
  }, [map]);

  const hasScreenshots = map.screenshots && map.screenshots.length > 0;
  const rawScreenshots = (hasScreenshots ? map.screenshots! : [map.thumbnail].filter(Boolean)).map(cleanUrl);

  const mediaItems = useMemo(() => {
    const items: Array<
      | { type: 'image'; url: string }
      | { type: 'video'; id: string; url: string; embedUrl: string; thumbnail: string }
    > = rawScreenshots.map(url => ({ type: 'image' as const, url }));

    // Append videos at the END of the gallery as requested
    extractedVideos.forEach(v => {
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

  const getDifficultyBadgeClass = (diff?: string) => {
    switch (diff?.toLowerCase()) {
      case 'easy': return 'badge-easy';
      case 'medium': return 'badge-medium';
      case 'hard': return 'badge-hard';
      default: return '';
    }
  };

  const baseUrl = import.meta.env.BASE_URL || '/';
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  const handleHomeClick = (e: React.MouseEvent) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      onBack();
    }
  };

  return (
    <div className="map-page-wrapper">
      {/* Navigation Top Header Bar */}
      <header className="map-page-nav-header">
        <div className="map-page-header-container">
          <a href={cleanBaseUrl} className="btn btn-back" onClick={handleHomeClick} style={{ textDecoration: 'none' }} title={t.clearFilters}>
            <ArrowLeft size={18} />
            <span>{lang === 'es' ? '← Volver a la lista de mapas' : '← Back to map list'}</span>
          </a>

          <div className="map-page-brand">
            <img src={iconSteam} style={{ height: '24px', width: 'auto', imageRendering: 'pixelated' }} alt="Steam" />
            <span className="brand-name">{t.title}</span>
          </div>

          {onToggleLang && (
            <button
              className="btn"
              onClick={onToggleLang}
              title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
              style={{ minWidth: '45px', padding: '6px 12px' }}
            >
              <span style={{ fontWeight: 'bold' }}>{lang.toUpperCase()}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="map-page-content-container">
        {/* Breadcrumb Navigation */}
        <nav className="map-breadcrumb">
          <a href={cleanBaseUrl} onClick={handleHomeClick} className="breadcrumb-link">{lang === 'es' ? 'Inicio' : 'Home'}</a>
          <span className="breadcrumb-separator">/</span>
          <a href={cleanBaseUrl} onClick={handleHomeClick} className="breadcrumb-link">{lang === 'es' ? 'Mapas' : 'Maps'}</a>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{map.title}</span>
        </nav>

        {/* 2-Column Responsive Layout Grid */}
        <div className="map-page-grid">
          {/* LEFT MAIN COLUMN */}
          <main className="map-page-main">
            {/* Map Screenshots & Video Gallery Carousel */}
            <div className="map-gallery-card">
              <div className="gallery-main-view">
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
                      className="gallery-active-image"
                    />
                  )
                ) : (
                  <div className="gallery-placeholder">
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
                    <div className="gallery-counter">
                      {activeImgIdx + 1} / {mediaItems.length}
                    </div>
                  </>
                )}
              </div>

              {mediaItems.length > 1 && (
                <div className="gallery-thumbnails-strip">
                  {mediaItems.map((item, idx) => (
                    <button
                      key={idx}
                      className={`thumbnail-btn ${idx === activeImgIdx ? 'active' : ''} ${item.type === 'video' ? 'video-thumb' : ''}`}
                      onClick={() => setActiveImgIdx(idx)}
                      title={item.type === 'video' ? 'Video' : `Image ${idx + 1}`}
                    >
                      <img
                        src={item.type === 'video' ? item.thumbnail : item.url}
                        alt={`Thumbnail ${idx + 1}`}
                      />
                      {item.type === 'video' && (
                        <div className="video-play-overlay">
                          <Play size={14} fill="currentColor" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description Section */}
            <section className="map-section-card">
              <h2 className="section-title">
                <HelpCircle size={20} className="section-icon" />
                <span>{t.descriptionLabel}</span>
              </h2>
              {map.description ? (
                <div
                  className="map-description-content"
                  dangerouslySetInnerHTML={{ __html: map.description }}
                />
              ) : (
                <p className="no-content-text">{t.noDescription}</p>
              )}
            </section>

            {/* Additional Info Section */}
            {map.additional_info && (
              <section className="map-section-card">
                <h2 className="section-title">
                  <ExternalLink size={20} className="section-icon" />
                  <span>{t.additionalInfoLabel}</span>
                </h2>
                <div
                  className="map-description-content"
                  dangerouslySetInnerHTML={{ __html: map.additional_info }}
                />
              </section>
            )}

            {/* Known Issues Section */}
            {map.known_issues && (
              <section className="map-section-card warning">
                <h2 className="section-title">
                  <ShieldAlert size={20} className="section-icon warning" />
                  <span>{t.knownIssuesLabel}</span>
                </h2>
                <p className="map-description-content">{map.known_issues}</p>
              </section>
            )}
          </main>

          {/* RIGHT SIDEBAR COLUMN */}
          <aside className="map-page-sidebar">
            {/* Quick Map Overview Card */}
            <div className="sidebar-card main-info-card">
              <div className="card-header-row">
                <h1 className="map-title-heading">{map.title}</h1>
                <button
                  className={`btn-favorite-icon ${isFavorite ? 'active' : ''}`}
                  onClick={() => onToggleFavorite(map.id)}
                  title={t.favBtnTitle}
                >
                  <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              </div>

              <div className="specs-list">
                <div className="spec-item">
                  <User size={16} className="spec-icon" />
                  <span className="spec-label">{t.mapperFilterLabel.split(':')[0]}:</span>
                  <span className="spec-value">
                    {onSelectAuthor && map.author ? (
                      <button
                        className="author-btn-link"
                        onClick={() => onSelectAuthor(map.author!)}
                      >
                        {map.author}
                      </button>
                    ) : (
                      map.author || t.unknownMapper
                    )}
                  </span>
                </div>

                <div className="spec-item">
                  <Star size={16} className="spec-icon star" />
                  <span className="spec-label">Rating:</span>
                  <span className="spec-value rating-val">
                    ⭐ {map.rating || 0}/5 <small>({map.votes || 0} {t.votesLabel.toLowerCase()})</small>
                  </span>
                </div>

                {map.year && (
                  <div className="spec-item">
                    <Calendar size={16} className="spec-icon" />
                    <span className="spec-label">{t.yearLabel}:</span>
                    <span className="spec-value">{map.year}</span>
                  </div>
                )}

                {map.difficulty && map.difficulty !== 'unrated' && (
                  <div className="spec-item">
                    <HardDrive size={16} className="spec-icon" />
                    <span className="spec-label">{t.difficultyLabel}:</span>
                    <span className={`badge ${getDifficultyBadgeClass(map.difficulty)}`}>
                      {map.difficulty}
                    </span>
                  </div>
                )}

                {map.size && map.size !== 'unrated' && (
                  <div className="spec-item">
                    <HardDrive size={16} className="spec-icon" />
                    <span className="spec-label">{t.sizeLabel}:</span>
                    <span className="spec-value">{map.size}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Downloads Box */}
            <div className="sidebar-card download-card">
              <h3 className="sidebar-card-title">
                <Download size={18} />
                <span>{t.downloadLabel}</span>
              </h3>

              {map.download_links && map.download_links.length > 0 ? (
                <div className="download-links-list">
                  {map.download_links.map((link, idx) => (
                    <a
                      key={idx}
                      href={cleanDownloadUrl(link.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="download-link-btn"
                    >
                      <div className="download-btn-content">
                        <Download size={16} />
                        <span className="dl-name">{link.name}</span>
                        <span className="dl-badge">{link.type}</span>
                      </div>
                      {link.description && <span className="dl-desc">{link.description}</span>}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="no-content-text">{t.noDownloads}</p>
              )}
            </div>

            {/* BSP Console Commands Box */}
            {map.bsp_names && map.bsp_names.length > 0 && (
              <div className="sidebar-card bsp-card">
                <h3 className="sidebar-card-title">
                  <Copy size={18} />
                  <span>{t.consoleCommandsLabel}</span>
                </h3>
                <div className="bsp-commands-list">
                  {map.bsp_names.map((bsp, idx) => (
                    <div key={idx} className="bsp-command-item">
                      <code className="bsp-code">map {bsp}</code>
                      <button
                        className="btn-copy-bsp"
                        onClick={() => handleCopyBsp(bsp)}
                        title={t.copyBspTitle}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags Box */}
            {map.tags && map.tags.length > 0 && (
              <div className="sidebar-card tags-card">
                <h3 className="sidebar-card-title">
                  <Tag size={18} />
                  <span>Tags</span>
                </h3>
                <div className="tags-flex">
                  {map.tags.map((tag) => (
                    <span key={tag} className="tag-badge">#{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* External Original Web Link */}
            <div className="sidebar-card external-link-card">
              <a
                href={cleanUrl(map.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-external"
              >
                <ExternalLink size={16} />
                <span>{t.viewOriginalBtn}</span>
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
