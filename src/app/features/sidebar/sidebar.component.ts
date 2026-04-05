// ============================================================
// OSM Angular GIS - Sidebar Component (container)
// ============================================================

import {
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';

// Sub-tab components
import { SearchTabComponent } from './search-tab/search-tab.component';
import { LayersTabComponent } from './layers-tab/layers-tab.component';
import { DrawTabComponent } from './draw-tab/draw-tab.component';
import { ToolsTabComponent } from './tools-tab/tools-tab.component';
import { DataTabComponent } from './data-tab/data-tab.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    MatBadgeModule,
    SearchTabComponent,
    LayersTabComponent,
    DrawTabComponent,
    ToolsTabComponent,
    DataTabComponent,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  // ── Inputs ─────────────────────────────────────────────
  readonly selectedTabIndex = input<number>(0);
  readonly featureCount = input<number>(0);

  // ── Outputs ────────────────────────────────────────────
  readonly tabChange = output<number>();
}
