import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import type { MapData } from './MapCard';
import { MapPageView } from './MapPageView';
import type { Language } from '../translations';

interface MapPageStandaloneProps {
  map: MapData;
}

export const MapPageStandalone: React.FC<MapPageStandaloneProps> = ({ map }) => {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'es';
    const saved = localStorage.getItem('scmapdb_lang');
    if (saved === 'es' || saved === 'en') return saved as Language;
    const browserLang = navigator.language || (navigator as any).userLanguage || 'en';
    return browserLang.toLowerCase().startsWith('es') ? 'es' : 'en';
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('scmapdb_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('scmapdb_lang', lang);
    }
  }, [lang]);

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

  const baseUrl = import.meta.env.BASE_URL || '/';
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      window.location.href = cleanBaseUrl;
    }
  };

  const handleSelectAuthor = (author: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `${cleanBaseUrl}?search=${encodeURIComponent(author)}`;
    }
  };

  const handleToggleLang = () => {
    setLang((prev) => (prev === 'es' ? 'en' : 'es'));
  };

  const isFavorite = favorites.includes(map.id);

  return (
    <div className="app-container">
      {toastMessage && (
        <div className="toast-alert">
          <Sparkles size={16} style={{ color: 'var(--accent)' }} />
          <span>{toastMessage}</span>
        </div>
      )}
      <MapPageView
        map={map}
        onBack={handleBack}
        onShowToast={showToast}
        onSelectAuthor={handleSelectAuthor}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
        lang={lang}
        onToggleLang={handleToggleLang}
      />
    </div>
  );
};
