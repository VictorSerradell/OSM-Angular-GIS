# 🗺️ OSM Angular GIS

Una aplicación GIS completa, moderna y lista para producción construida con Angular 19, Angular Material 19, Leaflet y OpenStreetMap.

![Angular](https://img.shields.io/badge/Angular-19-red?logo=angular)
![Material](https://img.shields.io/badge/Angular_Material-19-blue?logo=angular)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9+-green?logo=leaflet)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Características

- 🗺️ **Mapa fullscreen** con OpenStreetMap, OSM Cycle, OSM Transport y CartoDB
- 🔍 **Búsqueda de direcciones** con autocompletado via Nominatim API
- 🎨 **Herramientas de dibujo** completas con leaflet-draw
- 📐 **Análisis geoespacial** con Turf.js (buffer, centroid, área, distancia)
- 📂 **Import/Export GeoJSON** completo
- 🌙 **Modo oscuro/claro** con toggle y detección automática del sistema
- 📱 **Diseño responsive** mobile-first
- 📍 **Geolocalización** del usuario
- 🎯 **Coordenadas y escala** en tiempo real
- ⚡ **Angular Signals** y nuevo control flow (@if, @for, @switch)

## 🚀 Instalación rápida

### Prerrequisitos
- Node.js 18+ y npm 9+
- Angular CLI 19

```bash
npm install -g @angular/cli@19
```

### 1. Crear el proyecto

```bash
ng new OSM-Angular-GIS --standalone --routing --style=scss
cd OSM-Angular-GIS
```

### 2. Instalar dependencias

```bash
# Angular Material
ng add @angular/material@19

# Leaflet y tipos
npm install leaflet@1.9.4
npm install --save-dev @types/leaflet

# Leaflet Draw
npm install leaflet-draw@1.0.4
npm install --save-dev @types/leaflet-draw

# Turf.js
npm install @turf/turf

# Lodash (utilidades)
npm install lodash
npm install --save-dev @types/lodash
```

### 3. Copiar archivos del proyecto

Copia todos los archivos de este repositorio respetando la estructura de carpetas.

### 4. Ejecutar en desarrollo

```bash
ng serve --open
```

Abre [http://localhost:4200](http://localhost:4200)

### 5. Build para producción

```bash
ng build --configuration production
```

Los archivos compilados estarán en `dist/osm-angular-gis/`.

### 6. Preview de producción

```bash
npx serve dist/osm-angular-gis/browser
```

## 📁 Estructura del proyecto

```
src/
├── app/
│   ├── core/
│   │   ├── services/
│   │   │   ├── map.service.ts
│   │   │   ├── draw.service.ts
│   │   │   ├── layer.service.ts
│   │   │   ├── geocoding.service.ts
│   │   │   ├── measurement.service.ts
│   │   │   └── theme.service.ts
│   │   └── models/
│   │       ├── layer.model.ts
│   │       ├── feature.model.ts
│   │       └── search.model.ts
│   ├── shared/
│   │   └── components/
│   │       └── confirm-dialog/
│   ├── features/
│   │   ├── map/
│   │   │   ├── map.component.ts
│   │   │   ├── map.component.html
│   │   │   └── map.component.scss
│   │   ├── toolbar/
│   │   ├── sidebar/
│   │   │   ├── search-tab/
│   │   │   ├── layers-tab/
│   │   │   ├── draw-tab/
│   │   │   ├── tools-tab/
│   │   │   └── data-tab/
│   │   └── map-controls/
│   ├── app.component.ts
│   ├── app.component.html
│   ├── app.component.scss
│   └── app.config.ts
├── styles/
│   ├── _theme.scss
│   ├── _variables.scss
│   └── _map.scss
└── styles.scss
```

## 🛠️ Tecnologías utilizadas

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Angular | 19 | Framework principal |
| Angular Material | 19 | UI components |
| Leaflet | 1.9.4 | Motor de mapas |
| Leaflet Draw | 1.0.4 | Herramientas de dibujo |
| Turf.js | 7.x | Análisis geoespacial |
| OpenStreetMap | - | Tiles de mapa |
| Nominatim API | - | Geocodificación |
| Overpass API | - | Consultas OSM avanzadas |

## 📡 APIs externas

- **Nominatim**: `https://nominatim.openstreetmap.org`
- **Overpass**: `https://overpass-api.de/api/interpreter`
- **OSM Tiles**: `https://{s}.tile.openstreetmap.org`
- **Stamen/Stadia**: Capas adicionales

## 🌐 Subir a GitHub

```bash
# Inicializar repositorio
git init
git add .
git commit -m "feat: initial OSM Angular GIS project"

# Conectar con GitHub (reemplaza con tu URL)
git remote add origin https://github.com/TU_USUARIO/OSM-Angular-GIS.git
git branch -M main
git push -u origin main
```

## 📄 Licencia

MIT © 2024