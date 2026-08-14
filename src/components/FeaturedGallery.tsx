import React, { useState, useEffect, useMemo } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MapData } from './MapCard';
import { translations } from '../translations';
import type { Language } from '../translations';

interface FeaturedGalleryProps {
  maps: MapData[];
  onSelectMap: (map: MapData) => void;
  lang: Language;
  onHideGallery: () => void;
}

export const FeaturedGallery: React.FC<FeaturedGalleryProps> = ({
  maps,
  onSelectMap,
  lang,
}) => {
  const t = translations[lang];

  const featuredMaps = useMemo(() => {
    return maps
      .filter((map) => {
        const hasImg = map.thumbnail || (map.screenshots && map.screenshots.length > 0);
        const isFeatured = map.tags.includes('featured');
        return hasImg && isFeatured;
      })
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }, [maps]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (featuredMaps.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredMaps.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [featuredMaps.length, isPaused]);

  if (featuredMaps.length === 0) return null;

  const currentMap = featuredMaps[currentIndex];

  const cleanUrl = (url: string) => {
    if (!url) return '';
    return url
      .replace(/^http:\/\//i, 'https://')
      .replace(/scmapdb\.wdfiles\.com/g, 'scmapdb.wikidot.com')
      .replace(/scmapdb\.com/g, 'scmapdb.wikidot.com');
  };

  const getThumbnailSrc = (map: MapData) => {
    if (map.screenshots && map.screenshots.length > 0) {
      return cleanUrl(map.screenshots[0]);
    }
    return cleanUrl(map.thumbnail);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + featuredMaps.length) % featuredMaps.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % featuredMaps.length);
  };

  const imgSrc = getThumbnailSrc(currentMap);
  const authorName = currentMap.author || t.unknownMapper;

  return (
    <div
      className="featured-gallery-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <h2 className="featured-gallery-title-header">{t.featuredGalleryTitle || 'Featured Maps'}</h2>

      <div
        className="featured-gallery-card"
        onClick={() => onSelectMap(currentMap)}
      >
        <button className="gallery-nav-btn prev" onClick={handlePrev} title="Previous">
          <ChevronLeft size={24} />
        </button>

        {imgSrc && (
          <img
            src={imgSrc}
            alt={currentMap.title}
            className="featured-hero-image"
            loading="lazy"
          />
        )}

        <div className="featured-hero-overlay">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h3 className="featured-map-title">{currentMap.title}</h3>
            <div className="featured-rating-badge">
              <Star size={16} fill="currentColor" color="var(--accent-gold)" />
              <span>{currentMap.rating > 0 ? currentMap.rating.toFixed(1) : '5.0'}</span>
            </div>
          </div>
          <div className="featured-map-author">By {authorName}</div>
        </div>

        <button className="gallery-nav-btn next" onClick={handleNext} title="Next">
          <ChevronRight size={24} />
        </button>
      </div>

      {featuredMaps.length > 1 && (
        <div className="gallery-dots">
          {featuredMaps.map((_, idx) => (
            <div
              key={idx}
              className={`gallery-dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
