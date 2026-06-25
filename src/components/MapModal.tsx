import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ExternalLink, Copy, HelpCircle } from 'lucide-react';
import type { MapData } from './MapCard';
import iconSteam from '../assets/icon_steam.png';
import borderPressed from '../assets/border-pressed.png';
import xIcon from '../assets/X.png';

interface MapModalProps {
  map: MapData;
  onClose: () => void;
  onShowToast: (message: string) => void;
  onSelectAuthor?: (author: string) => void;
}

export const MapModal: React.FC<MapModalProps> = ({ map, onClose, onShowToast, onSelectAuthor }) => {
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  // Close when overlay is clicked
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleNextImage = () => {
    if (map.screenshots && map.screenshots.length > 0) {
      setActiveImgIdx((prev) => (prev + 1) % map.screenshots!.length);
    }
  };

  const handlePrevImage = () => {
    if (map.screenshots && map.screenshots.length > 0) {
      setActiveImgIdx((prev) => (prev - 1 + map.screenshots!.length) % map.screenshots!.length);
    }
  };

  const handleCopyBsp = (bsp: string) => {
    navigator.clipboard.writeText(`map ${bsp}`);
    onShowToast(`Consola: "map ${bsp}" copiado al portapapeles`);
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

  // Get screenshots list
  const hasScreenshots = map.screenshots && map.screenshots.length > 0;
  const screenshots = (hasScreenshots ? map.screenshots! : [map.thumbnail].filter(Boolean))
    .map(cleanUrl);

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div id="header" style={{ 
          padding: '8px 12px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '3px solid transparent',
          borderImage: `url("${borderPressed}") 40 stretch`,
          backgroundColor: 'var(--bg-vgui-dark)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <img src={iconSteam} style={{ height: '16px', width: 'auto', imageRendering: 'pixelated' }} alt="Steam" />
            <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Map Details</span>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              padding: '2px 4px', 
              marginTop: '0px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
            aria-label="Cerrar modal"
          >
            <img src={xIcon} style={{ height: '10px', width: 'auto', imageRendering: 'pixelated' }} alt="Close" />
          </button>
        </div>

        {/* Carousel / Image slider */}
        {screenshots.length > 0 ? (
          <div className="carousel-container">
            <img
              src={screenshots[activeImgIdx]}
              alt={`${map.title} screenshot ${activeImgIdx + 1}`}
              className="carousel-image"
            />
            {screenshots.length > 1 && (
              <>
                <button className="carousel-btn carousel-btn-prev" onClick={handlePrevImage}>
                  <ChevronLeft size={24} />
                </button>
                <button className="carousel-btn carousel-btn-next" onClick={handleNextImage}>
                  <ChevronRight size={24} />
                </button>
                <div className="carousel-counter">
                  {activeImgIdx + 1} / {screenshots.length}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="carousel-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
            <HelpCircle size={48} style={{ opacity: 0.1 }} />
          </div>
        )}

        {/* Modal body grid */}
        <div className="modal-grid">
          {/* Main Info column */}
          <div className="modal-header-info">
            <div className="modal-title-row">
              <h2 className="modal-title">{map.title}</h2>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Mapper:{' '}
              {map.author ? (
                <strong
                  onClick={() => onSelectAuthor?.(map.author!)}
                  style={{
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                  className="mapper-link"
                >
                  {map.author}
                </strong>
              ) : (
                'Unknown'
              )}
            </p>

            <div className="modal-section">
              <h3 className="modal-section-title">Descripción</h3>
              {map.description ? (
                <p className="modal-description">{map.description}</p>
              ) : (
                <p className="modal-description" style={{ fontStyle: 'italic', opacity: 0.5 }}>
                  {map.scraped ? 'No hay descripción disponible para este mapa.' : 'Esta información aún no ha sido cargada del servidor original.'}
                </p>
              )}
            </div>

            {map.additional_info && map.additional_info !== 'N/A' && (
              <div className="modal-section">
                <h3 className="modal-section-title">Información Adicional</h3>
                <p className="modal-description" style={{ fontSize: '0.9rem' }}>{map.additional_info}</p>
              </div>
            )}

            {map.known_issues && map.known_issues !== 'N/A' && (
              <div className="modal-section" style={{
                marginTop: '15px',
                padding: '10px 12px',
                backgroundColor: 'rgba(231, 76, 60, 0.08)',
                borderLeft: '3px solid #e74c3c',
                borderRadius: 'var(--radius-sm)'
              }}>
                <h3 className="modal-section-title" style={{ color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 6px 0', fontSize: '0.9rem' }}>
                  <span>Problemas Conocidos / Known Issues</span>
                </h3>
                <p className="modal-description" style={{ fontSize: '0.85rem', margin: 0, whiteSpace: 'pre-line' }}>
                  {map.known_issues}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar metadata column */}
          <div className="modal-meta-sidebar">
            {/* BSP Copy Commands */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <span className="filter-section-title" style={{ marginBottom: '10px' }}>Comandos de Consola</span>
              <div className="bsp-list-pills" style={{ alignItems: 'stretch' }}>
                {map.bsp_names && map.bsp_names.length > 0 ? (
                  map.bsp_names.map((bsp) => (
                    <button
                      key={bsp}
                      className="btn-card-action btn-card-bsp"
                      onClick={() => handleCopyBsp(bsp)}
                      style={{ justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      <span>map {bsp}</span>
                      <Copy size={12} />
                    </button>
                  ))
                ) : (
                  <button
                    className="btn-card-action btn-card-bsp"
                    onClick={() => handleCopyBsp(map.id.replace(/-/g, '_'))}
                    style={{ justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    <span>map {map.id.replace(/-/g, '_')}</span>
                    <Copy size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* General Info Table */}
            <div>
              <span className="filter-section-title">Detalles del Mapa</span>
              <table className="metadata-table">
                <tbody>
                  <tr>
                    <td>Mod Original</td>
                    <td>{map.original_release_date || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Publicación</td>
                    <td>{map.release_date || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Votos</td>
                    <td>{map.votes || 0}</td>
                  </tr>
                  <tr>
                    <td>Dificultad</td>
                    <td style={{ textTransform: 'capitalize' }}>{map.difficulty || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Tamaño</td>
                    <td style={{ textTransform: 'capitalize' }}>{map.size || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mirrors / Downloads */}
            <div>
              <span className="filter-section-title">Descargar</span>
              {map.download_links && map.download_links.length > 0 ? (
                map.download_links.map((link, idx) => (
                  <a
                    key={idx}
                    href={cleanDownloadUrl(link.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mirror-item"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="mirror-info">
                      <span className="mirror-title">{link.name}</span>
                      {link.description && (
                        <span className="mirror-description" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px', marginBottom: '4px', fontStyle: 'italic' }}>
                          {link.description}
                        </span>
                      )}
                      <span className={`mirror-badge ${
                        link.type === 'Community Edit' ? 'mirror-badge-community' :
                        link.type === 'Original' ? 'mirror-badge-original' : 'mirror-badge-mirror'
                      }`}>
                        {link.type}
                      </span>
                    </div>
                    <Download size={16} style={{ color: 'var(--accent)' }} />
                  </a>
                ))
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
                  No hay links de descarga directos disponibles.
                </div>
              )}

              {map.download_notes && map.download_notes.length > 0 && (
                <div className="download-notes" style={{
                  marginTop: '12px',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(255, 179, 0, 0.08)',
                  borderLeft: '3px solid var(--accent)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {map.download_notes.map((note, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '0.82rem', lineHeight: '1.4', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.9rem', lineHeight: '1' }}>⚠️</span>
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Link back to original */}
            <a
              href={map.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
            >
              <span>Ver Web Original</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
