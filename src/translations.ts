export const translations = {
  es: {
    // Header & Brand
    title: "Sven Co-Op Maps",
    randomMap: "Mapa Aleatorio",
    myFavorites: "Mis Favoritos ({count})",
    
    // Toast & Alerts
    dbLoadError: "No se pudo cargar la base de datos de mapas. Ejecuta el scraper para generarla.",
    randomPickToast: "🎲 Mapa aleatorio: \"{title}\"",
    noMapsLoaded: "No hay mapas cargados en la base de datos.",
    filteringAuthor: "Filtrando mapas de: {author}",
    dbNotLoadedHeader: "No se cargaron los mapas",
    scraperTip: "Correr en la carpeta del scraper: node scraper.js",
    loadingDb: "Cargando base de datos de mapas...",
    copiedConsole: "Consola: \"{cmd}\" copiado al portapapeles",
    
    // Sidebar / Filters
    filtersHeader: "Filtros",
    searchPlaceholder: "Título, autor, bsp, tag...",
    searchLabel: "Búsqueda",
    difficultyLabel: "Dificultad",
    sizeLabel: "Tamaño",
    yearLabel: "Año de Lanzamiento",
    popularTagsLabel: "Tags Populares",
    resultsCount: "Resultados:",
    clearFilters: "Limpiar filtros",
    
    // Filter options
    allOptions: "Todas",
    allOptionsSize: "Todos",
    allYears: "Todos los años",
    unratedOption: "Sin clasificar (Unrated)",
    
    // Main Panel
    sortByLabel: "Ordenar por:",
    sortRatingDesc: "Rating (Mayor a Menor)",
    sortRatingAsc: "Rating (Menor a Mayor)",
    sortYearDesc: "Año (Más Nuevo)",
    sortYearAsc: "Año (Más Viejo)",
    sortNameAsc: "Nombre (A-Z)",
    sortNameDesc: "Nombre (Z-A)",
    mapperFilterLabel: "Mapper: {author}",
    clearMapperFilter: "Limpiar filtro de mapper",
    noMapsFound: "No se encontraron mapas",
    adjustFiltersTip: "Prueba ajustando los filtros de búsqueda o eliminando tags seleccionados.",
    clearFiltersBtn: "Limpiar Filtros",
    mapsPerPage: "Mapas por página:",
    paginationPrev: "Anterior",
    paginationNext: "Siguiente",
    
    // Map Card
    favoriteBtn: "Favorito",
    copyBspBtn: "Copy BSP",
    fallbackCardTitle: "Sven Co-op Mapa",
    copyBspTitle: "Copiar comando de consola para cargar el mapa",
    favBtnTitle: "Agregar a favoritos / Quitar de favoritos",

    // Map Modal
    modalHeader: "Detalles del Mapa",
    modalCloseLabel: "Cerrar modal",
    descriptionLabel: "Descripción",
    additionalInfoLabel: "Información Adicional",
    noDescription: "No hay descripción disponible para este mapa.",
    notScrapedYet: "Esta información aún no ha sido cargada del servidor original.",
    knownIssuesLabel: "Problemas Conocidos",
    consoleCommandsLabel: "Comandos de Consola",
    mapDetailsLabel: "Detalles del Mapa",
    originalModLabel: "Mod Original",
    releaseLabel: "Publicación",
    votesLabel: "Votos",
    downloadLabel: "Descargar",
    noDownloads: "No hay links de descarga directos disponibles.",
    viewOriginalBtn: "Ver Web Original",
    unknownMapper: "Desconocido",
  },
  en: {
    // Header & Brand
    title: "Sven Co-Op Maps",
    randomMap: "Random Map",
    myFavorites: "My Favorites ({count})",
    
    // Toast & Alerts
    dbLoadError: "Could not load map database. Run the scraper to generate it.",
    randomPickToast: "🎲 Random map: \"{title}\"",
    noMapsLoaded: "No maps loaded in the database.",
    filteringAuthor: "Filtering maps by: {author}",
    dbNotLoadedHeader: "Maps not loaded",
    scraperTip: "Run inside the scraper folder: node scraper.js",
    loadingDb: "Loading map database...",
    copiedConsole: "Console: \"{cmd}\" copied to clipboard",
    
    // Sidebar / Filters
    filtersHeader: "Filters",
    searchPlaceholder: "Title, author, bsp, tag...",
    searchLabel: "Search",
    difficultyLabel: "Difficulty",
    sizeLabel: "Size",
    yearLabel: "Release Year",
    popularTagsLabel: "Popular Tags",
    resultsCount: "Results:",
    clearFilters: "Clear filters",
    
    // Filter options
    allOptions: "All",
    allOptionsSize: "All",
    allYears: "All years",
    unratedOption: "Unrated",
    
    // Main Panel
    sortByLabel: "Sort by:",
    sortRatingDesc: "Rating (High to Low)",
    sortRatingAsc: "Rating (Low to High)",
    sortYearDesc: "Year (Newest)",
    sortYearAsc: "Year (Oldest)",
    sortNameAsc: "Name (A-Z)",
    sortNameDesc: "Name (Z-A)",
    mapperFilterLabel: "Mapper: {author}",
    clearMapperFilter: "Clear mapper filter",
    noMapsFound: "No maps found",
    adjustFiltersTip: "Try adjusting search filters or removing selected tags.",
    clearFiltersBtn: "Clear Filters",
    mapsPerPage: "Maps per page:",
    paginationPrev: "Previous",
    paginationNext: "Next",
    
    // Map Card
    favoriteBtn: "Favorite",
    copyBspBtn: "Copy BSP",
    fallbackCardTitle: "Sven Co-op Map",
    copyBspTitle: "Copy console command to load the map",
    favBtnTitle: "Add to favorites / Remove from favorites",

    // Map Modal
    modalHeader: "Map Details",
    modalCloseLabel: "Close modal",
    descriptionLabel: "Description",
    additionalInfoLabel: "Additional Info",
    noDescription: "No description available for this map.",
    notScrapedYet: "This information has not been loaded from the original server yet.",
    knownIssuesLabel: "Known Issues",
    consoleCommandsLabel: "Console Commands",
    mapDetailsLabel: "Map Details",
    originalModLabel: "Original Mod",
    releaseLabel: "Release Date",
    votesLabel: "Votes",
    downloadLabel: "Download",
    noDownloads: "No direct download links available.",
    viewOriginalBtn: "View Original Site",
    unknownMapper: "Unknown",
  }
};

export type Language = 'es' | 'en';
