// ============================================================
// OSM Angular GIS - Theme Service
// ============================================================

import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal<boolean>(false);
  readonly mode = signal<ThemeMode>('light');

  private readonly STORAGE_KEY = 'gis-theme';

  initialize(): void {
    // Check localStorage first, then system preference
    const stored = localStorage.getItem(this.STORAGE_KEY) as ThemeMode | null;
    if (stored) {
      this.applyTheme(stored === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme(prefersDark);
    }

    // Listen for system changes
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => {
        if (!localStorage.getItem(this.STORAGE_KEY)) {
          this.applyTheme(e.matches);
        }
      });
  }

  toggle(): void {
    const newDark = !this.isDark();
    this.applyTheme(newDark);
    localStorage.setItem(this.STORAGE_KEY, newDark ? 'dark' : 'light');
  }

  private applyTheme(dark: boolean): void {
    this.isDark.set(dark);
    this.mode.set(dark ? 'dark' : 'light');
    const body = document.body;
    if (dark) {
      body.classList.add('dark-theme');
    } else {
      body.classList.remove('dark-theme');
    }
  }
}
