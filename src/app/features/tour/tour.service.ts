// ============================================================
// OSM Angular GIS - Tour Service
// Tab indices match sidebar order:
// 0=Buscar 1=Capas 2=Dibujar 3=Análisis 4=Ruta 5=Topología 6=Importar 7=Datos
// ============================================================

import { Injectable, signal, computed } from '@angular/core';

export interface TourStep {
  id: string;
  title: string;
  content: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  icon?: string;
  tabIndex?: number;
}

@Injectable({ providedIn: 'root' })
export class TourService {
  readonly active = signal<boolean>(false);
  readonly currentIndex = signal<number>(0);
  readonly dismissed = signal<boolean>(false);

  private _switchTab?: (index: number) => void;

  registerTabSwitcher(fn: (index: number) => void): void {
    this._switchTab = fn;
  }

  readonly steps: TourStep[] = [
    // ── 0: Bienvenida ──────────────────────────────────────
    {
      id: 'welcome',
      title: '¡Bienvenido a OSM Angular GIS!',
      content:
        'Una plataforma GIS completa: explora mapas, traza rutas, dibuja geometrías, analiza datos y más. Te guiamos en 13 pasos.',
      icon: 'public',
    },
    // ── 1: Mapa ────────────────────────────────────────────
    {
      id: 'map',
      title: 'El mapa interactivo',
      content:
        'OpenStreetMap como base. Zoom con la rueda del ratón, arrastra para moverte. Los controles +/− están en la esquina superior izquierda.',
      icon: 'map',
    },
    // ── 2: Buscar (tab 0) ──────────────────────────────────
    {
      id: 'search',
      title: 'Buscar lugares',
      content:
        'Escribe cualquier ciudad o dirección. Nominatim/OSM encuentra el lugar y centra el mapa. Historial de búsquedas recientes incluido.',
      targetSelector: 'app-search-tab',
      icon: 'search',
      position: 'right',
      tabIndex: 0,
    },
    // ── 3: Capas (tab 1) ───────────────────────────────────
    {
      id: 'layers',
      title: 'Cambiar capas del mapa',
      content:
        'Elige entre 6 estilos: OSM Standard, Cycle Map, Transport, CartoDB Positron/Dark o imágenes ESRI. Activa también capas de datos.',
      targetSelector: 'app-layers-tab',
      icon: 'layers',
      position: 'right',
      tabIndex: 1,
    },
    // ── 4: Dibujar (tab 2) ─────────────────────────────────
    {
      id: 'draw',
      title: 'Herramientas de dibujo',
      content:
        'Dibuja marcadores, líneas, polígonos, rectángulos y círculos. Cada feature se guarda como GeoJSON con propiedades editables.',
      targetSelector: 'app-draw-tab',
      icon: 'edit',
      position: 'right',
      tabIndex: 2,
    },
    // ── 5: Análisis (tab 3) ────────────────────────────────
    {
      id: 'analysis',
      title: 'Análisis geoespacial',
      content:
        'Mide distancias y áreas en el mapa. Genera buffers configurables y calcula centroides con Turf.js. Todo en el navegador.',
      targetSelector: 'app-tools-tab',
      icon: 'construction',
      position: 'right',
      tabIndex: 3,
    },
    // ── 6: Rutas (tab 4) ───────────────────────────────────
    {
      id: 'routing',
      title: 'Planificador de rutas',
      content:
        'Calcula rutas a pie, bici o coche con OSRM. Añade puntos de paso haciendo clic en el mapa y obtén el perfil de elevación.',
      targetSelector: 'app-routing-tab',
      icon: 'route',
      position: 'right',
      tabIndex: 4,
    },
    // ── 7: Topología (tab 5) ───────────────────────────────
    {
      id: 'topology',
      title: 'Análisis topológico',
      content:
        'Intersección, unión, diferencia y recorte entre polígonos. Estadísticas de área y % de solapamiento al instante con Turf.js.',
      targetSelector: 'app-topology-tab',
      icon: 'join_inner',
      position: 'right',
      tabIndex: 5,
    },
    // ── 8: Importar (tab 6) ────────────────────────────────
    {
      id: 'import',
      title: 'Importar archivos',
      content:
        'Arrastra un archivo GPX de Garmin/Strava, KML de Google Earth, GeoJSON o CSV con columnas lat/lon. Auto-detecta el formato.',
      targetSelector: 'app-import-tab',
      icon: 'upload_file',
      position: 'right',
      tabIndex: 6,
    },
    // ── 9: Datos (tab 7) ───────────────────────────────────
    {
      id: 'data',
      title: 'Gestión de datos GeoJSON',
      content:
        'Exporta tus features como GeoJSON estándar, edita sus propiedades, elimina geometrías o copia el JSON al portapapeles.',
      targetSelector: 'app-data-tab',
      icon: 'dataset',
      position: 'right',
      tabIndex: 7,
    },
    // ── 10: GPS ────────────────────────────────────────────
    {
      id: 'locate',
      title: 'Tu ubicación GPS',
      content:
        'Pulsa el botón azul (esquina inferior derecha) para centrar el mapa en tu posición. Muestra un punto animado y círculo de precisión.',
      targetSelector: '.fab--locate',
      icon: 'my_location',
      position: 'left',
    },
    // ── 11: Modo oscuro ────────────────────────────────────
    {
      id: 'theme',
      title: 'Modo oscuro / claro',
      content:
        'Cambia entre modo claro y oscuro con el botón del sol/luna en la barra superior. La preferencia se guarda automáticamente.',
      targetSelector: '.gis-toolbar',
      icon: 'dark_mode',
      position: 'bottom',
    },
    // ── 12: Final ──────────────────────────────────────────
    {
      id: 'done',
      title: '¡Listo para explorar!',
      content:
        '¡Ya conoces todas las funciones! Traza una ruta, importa un GPX de tu última excursión o analiza zonas con las herramientas topológicas.',
      icon: 'celebration',
    },
  ];

  readonly currentStep = computed(() =>
    this.active() ? (this.steps[this.currentIndex()] ?? null) : null,
  );
  readonly isFirst = computed(() => this.currentIndex() === 0);
  readonly isLast = computed(
    () => this.currentIndex() === this.steps.length - 1,
  );
  readonly progress = computed(() =>
    Math.round(((this.currentIndex() + 1) / this.steps.length) * 100),
  );

  start(): void {
    this.currentIndex.set(0);
    this.active.set(true);
    this.dismissed.set(false);
  }

  next(): void {
    if (!this.isLast()) {
      this.currentIndex.update((i) => i + 1);
      this._activateTab();
    } else {
      this.end();
    }
  }

  prev(): void {
    if (!this.isFirst()) {
      this.currentIndex.update((i) => i - 1);
      this._activateTab();
    }
  }

  goTo(index: number): void {
    if (index >= 0 && index < this.steps.length) {
      this.currentIndex.set(index);
      this._activateTab();
    }
  }

  end(): void {
    this.active.set(false);
    this.dismissed.set(true);
    localStorage.setItem('gis-tour-done', '1');
  }

  shouldAutoStart(): boolean {
    return !localStorage.getItem('gis-tour-done');
  }

  private _activateTab(): void {
    const step = this.steps[this.currentIndex()];
    if (step?.tabIndex !== undefined && this._switchTab) {
      this._switchTab(step.tabIndex);
    }
  }
}
