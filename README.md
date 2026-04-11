# 🗺️ OSM Angular GIS

Una plataforma GIS completa, open source y lista para producción construida con Angular 19, Angular Material, Leaflet y OpenStreetMap. Sin API keys, sin registro, sin coste.

**Demo en vivo → [osm-angular-gis.vercel.app](https://osm-angular-gis.vercel.app)**

![Angular](https://img.shields.io/badge/Angular-19-red?logo=angular)
![Material](https://img.shields.io/badge/Angular_Material-19-blue?logo=angular)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9+-green?logo=leaflet)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Funcionalidades

### 🔍 Búsqueda geográfica
Busca cualquier ciudad, dirección o coordenada del mundo usando **Nominatim / OpenStreetMap**. Resultados en tiempo real con debounce, historial de búsquedas recientes y accesos rápidos a ciudades frecuentes.

### 🗺️ 6 capas de mapa intercambiables
| Capa | Descripción |
|------|-------------|
| OSM Standard | Mapa base OpenStreetMap |
| OSM Cycle Map | Rutas ciclistas y carreteras |
| OSM Transport | Transporte público |
| CartoDB Positron | Estilo claro minimalista |
| CartoDB Dark | Estilo oscuro |
| ESRI World Imagery | Imágenes de satélite |

### ✏️ Herramientas de dibujo vectorial
Dibuja directamente sobre el mapa con **Leaflet Draw**:
- 📍 Marcadores (puntos de interés)
- 〰️ Líneas (rutas, caminos)
- ⬡ Polígonos (áreas cerradas)
- ⬜ Rectángulos (zonas cuadradas)
- ⭕ Círculos (áreas de influencia)
- • Puntos pequeños

Cada geometría se guarda como **GeoJSON** con nombre, tipo y timestamp. Las propiedades son editables desde el panel de datos.

### 📐 Análisis geoespacial (Turf.js)
Todo procesado en el navegador, sin servidor:
- **Medición de distancias** — clic a clic en el mapa, distancia acumulada en tiempo real
- **Cálculo de áreas** — define un polígono y obtén el área en m² / ha / km²
- **Buffers** — genera zonas de influencia configurables alrededor de cualquier geometría
- **Centroides** — calcula el centro geométrico de tus features

### 🛣️ Planificador de rutas (OSRM)
- Perfiles: **🚶 A pie / 🚴 Bici / 🚗 Coche**
- Añade puntos de paso haciendo clic en el mapa (arrastrables)
- Ruta calculada en rojo con ajuste automático del mapa
- **Perfil de elevación** dibujado con Canvas 2D puro (sin librerías externas)
- Resumen: distancia total, tiempo estimado, instrucciones paso a paso
- APIs públicas gratuitas — sin API key

### 🔷 Análisis topológico (Turf.js)
Opera entre polígonos dibujados:
| Operación | Descripción |
|-----------|-------------|
| Intersección | Área común entre A y B |
| Unión | Área combinada de A y B |
| Diferencia (A − B) | A sin la parte de B |
| Diferencia simétrica | Todo excepto el solapamiento |
| Recorte | Recorta A usando B como máscara |

Estadísticas automáticas: área de cada feature, área del resultado y **% de solapamiento**. El resultado se puede guardar como nueva feature.

### 📂 Importación de archivos
Arrastra y suelta o selecciona — auto-detección de formato:
- **GPX** — Tracks, rutas y waypoints de Garmin, Strava, Wikiloc. Incluye elevación.
- **KML** — Placemarks de Google Maps y Google Earth. Puntos, líneas y polígonos.
- **GeoJSON** — Estándar universal. Cualquier geometría con propiedades.
- **CSV** — Auto-detecta columnas `lat` / `lon` / `lng` y separador (`,` `;` `|` tab). Todas las columnas extra se convierten en propiedades del popup.

### 💾 Exportación GeoJSON
Exporta todas tus features como un único archivo `.geojson` estándar, compatible con QGIS, Mapbox, ArcGIS y cualquier SIG.

### 📍 Geolocalización GPS
Centra el mapa en tu posición con un punto animado y un círculo de precisión que muestra el radio de error del GPS.

### 🎨 UX y accesibilidad
- 🌙 Modo oscuro / claro persistente (localStorage)
- 📊 Barra de coordenadas en tiempo real
- 🧭 Tour guiado de 13 pasos con spotlight
- 📱 Diseño responsive (móvil, tablet, escritorio)
- ⚡ Angular Signals y control flow moderno (`@if`, `@for`)

---

## 🛠️ Stack tecnológico

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Angular | 19 | Framework principal |
| Angular Material | 19 | Componentes UI |
| Leaflet | 1.9.4 | Motor de mapas |
| Leaflet Draw | 1.0.4 | Herramientas de dibujo |
| Turf.js | 7.x | Análisis geoespacial |
| OpenStreetMap | — | Tiles de mapa |
| Nominatim API | — | Geocodificación |
| OSRM | — | Cálculo de rutas |
| Open-Elevation | — | Perfil de elevación |
| Canvas 2D API | — | Gráfico de elevación |
| Vercel | — | Hosting / CI-CD |

---

## 📡 APIs externas (todas gratuitas, sin API key)

| API | URL | Uso |
|-----|-----|-----|
| Nominatim | `nominatim.openstreetmap.org` | Búsqueda de lugares |
| OSM Tiles | `tile.openstreetmap.org` | Mapa base |
| OSRM | `router.project-osrm.org` | Cálculo de rutas |
| Open-Elevation | `api.open-elevation.com` | Datos de elevación |
| CartoDB | `basemaps.cartocdn.com` | Capas CartoDB |
| ESRI | `server.arcgisonline.com` | Imágenes de satélite |

---

## 🚀 Instalación

### Prerrequisitos
- Node.js 18+
- Angular CLI 19

```bash
npm install -g @angular/cli@19
```

### Clonar y ejecutar

```bash
git clone https://github.com/TU_USUARIO/OSM-Angular-GIS.git
cd OSM-Angular-GIS
npm install
ng serve --open
```

Abre [http://localhost:4200](http://localhost:4200)

### Build producción

```bash
ng build --configuration production
npx serve dist/osm-angular-gis/browser
```

---

## 📁 Estructura del proyecto

```
src/app/
├── core/
│   ├── models/
│   │   ├── feature.model.ts      — GisFeature, GeoJSON types
│   │   ├── layer.model.ts        — BASE_LAYERS config
│   │   └── search.model.ts       — NominatimResult (jsonv2)
│   └── services/
│       ├── map.service.ts        — Leaflet init, ResizeObserver
│       ├── layer.service.ts      — TileLayer + FeatureGroup overlays
│       ├── draw.service.ts       — Leaflet Draw, activateTool
│       ├── geocoding.service.ts  — Nominatim jsonv2, signals
│       ├── measurement.service.ts — Turf.js: buffer, centroid, distance
│       ├── routing.service.ts    — OSRM + Open-Elevation
│       ├── topology.service.ts   — Turf.js: intersect, union, difference
│       ├── import.service.ts     — GPX, KML, CSV, GeoJSON parser
│       └── theme.service.ts      — dark/light, localStorage
└── features/
    ├── map/                      — Componente principal orquestador
    ├── toolbar/                  — Barra superior
    ├── map-controls/             — FABs, barra de coordenadas
    ├── tour/                     — Tour guiado 13 pasos
    └── sidebar/
        ├── search-tab/           — Búsqueda Nominatim
        ├── layers-tab/           — Cambio de capas
        ├── draw-tab/             — Herramientas de dibujo
        ├── tools-tab/            — Análisis geoespacial
        ├── routing-tab/          — Planificador de rutas OSRM
        ├── topology-tab/         — Operaciones topológicas
        ├── import-tab/           — Import GPX/KML/CSV/GeoJSON
        └── data-tab/             — Gestión y export GeoJSON
```

---

## 🧠 Lecciones técnicas aprendidas

**1 — Dual-instance de Leaflet en producción**
Leaflet y Leaflet Draw deben ser la MISMA instancia de módulo. Con ESM en Angular 19, un import estático y un side-effect import se resuelven como instancias separadas → `L.Draw` es undefined. Solución: cargar ambos como scripts globales en `angular.json` y usar `declare const L: typeof LType` en los servicios.

**2 — mat-sidenav-container y Leaflet en Vercel**
Angular Material aplica sus estilos de forma asíncrona en producción. Si Leaflet inicializa antes de que el contenedor tenga altura, el mapa queda en 0px (negro). Solución: `ResizeObserver` que espera `clientHeight > 0` antes de inicializar.

**3 — FormsModule + MatSelect corrompe la caché de Vite**
Añadir `[(ngModel)]` genera un hash de pre-bundling del CDK que Vite almacena en `.angular/vite-root`. Si el bundle cambia, el hash queda inválido. Solución: `<select>` nativo + `(change)` event.

**4 — Canvas 2D > librerías de gráficos para casos simples**
El perfil de elevación se dibuja con 80 líneas de Canvas 2D puro: gradiente, línea, ejes con etiquetas. Cero dependencias, cero problemas de bundling.

---

## 📄 Licencia

MIT © 2024 — Libre para uso personal y comercial.