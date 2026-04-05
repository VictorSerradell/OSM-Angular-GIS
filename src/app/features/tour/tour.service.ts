// ============================================================
// OSM Angular GIS - Tour Service
// ============================================================

import { Injectable, signal, computed, inject } from '@angular/core';

export interface TourStep {
  id: string;
  title: string;
  content: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  icon?: string;
  tabIndex?: number; // sidebar tab to activate before showing step
}

@Injectable({ providedIn: 'root' })
export class TourService {
  readonly active = signal<boolean>(false);
  readonly currentIndex = signal<number>(0);
  readonly dismissed = signal<boolean>(false);

  // Callback injected by MapComponent to switch sidebar tabs
  private _switchTab?: (index: number) => void;

  registerTabSwitcher(fn: (index: number) => void): void {
    this._switchTab = fn;
  }

  readonly steps: TourStep[] = [
    {
      id: 'welcome',
      title: '¡Bienvenido a OSM Angular GIS!',
      content:
        'Esta aplicación te permite explorar mapas, dibujar geometrías y realizar análisis geoespaciales. Te guiamos en 9 pasos rápidos.',
      icon: 'public',
    },
    {
      id: 'map',
      title: 'El mapa interactivo',
      content:
        'Usa OpenStreetMap como base. Zoom con la rueda del ratón, arrastra para moverte. Los controles +/− están en la esquina superior izquierda.',
      icon: 'map',
    },
    {
      id: 'search',
      title: 'Buscar lugares',
      content:
        'Escribe cualquier ciudad, dirección o lugar. Nominatim/OSM encuentra y centra el mapa automáticamente. También tienes accesos rápidos.',
      targetSelector: '.tab-content',
      icon: 'search',
      position: 'right',
      tabIndex: 0,
    },
    {
      id: 'layers',
      title: 'Cambiar capas del mapa',
      content:
        'Elige entre OSM Standard, Cycle Map, Transport, CartoDB Positron/Dark o imágenes ESRI. También activa/desactiva capas de datos.',
      targetSelector: '.tab-content',
      icon: 'layers',
      position: 'right',
      tabIndex: 1,
    },
    {
      id: 'draw',
      title: 'Herramientas de dibujo',
      content:
        'Dibuja marcadores, líneas, polígonos, rectángulos y círculos sobre el mapa. Activa una herramienta y haz clic en el mapa.',
      targetSelector: '.tab-content',
      icon: 'edit',
      position: 'right',
      tabIndex: 2,
    },
    {
      id: 'analysis',
      title: 'Análisis geoespacial',
      content:
        'Mide distancias y áreas haciendo clic en el mapa. Genera buffers configurables y calcula centroides con Turf.js.',
      targetSelector: '.tab-content',
      icon: 'construction',
      position: 'right',
      tabIndex: 3,
    },
    {
      id: 'data',
      title: 'Gestión de datos GeoJSON',
      content:
        'Importa y exporta GeoJSON, edita las propiedades de cada feature, elimina geometrías o copia el GeoJSON al portapapeles.',
      targetSelector: '.tab-content',
      icon: 'dataset',
      position: 'right',
      tabIndex: 4,
    },
    {
      id: 'locate',
      title: 'Tu ubicación GPS',
      content:
        'Pulsa el botón azul para centrar el mapa en tu posición GPS. Se muestra tu ubicación con un punto animado y un círculo de precisión.',
      targetSelector: '.fab--locate',
      icon: 'my_location',
      position: 'left',
    },
    {
      id: 'theme',
      title: 'Modo oscuro / claro',
      content:
        'Cambia entre modo claro y oscuro con el botón del sol/luna en la barra superior. La preferencia se guarda automáticamente.',
      icon: 'dark_mode',
    },
    {
      id: 'done',
      title: '¡Listo para explorar!',
      content:
        '¡Ya conoces todas las funciones! Dibuja features, exporta tu trabajo como GeoJSON y explora el mundo con OSM Angular GIS.',
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
