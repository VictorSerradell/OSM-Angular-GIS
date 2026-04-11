import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MapService } from 'src/app/core/services/map.service';
import { TopologyService, TopologyOp } from 'src/app/core/services/topology.service';


@Component({
  selector: 'app-topology-tab',
  standalone: true,
  // NO FormsModule, NO MatSelectModule — use native <select> instead
  imports: [CommonModule, MatButtonModule, MatIconModule,
    MatDividerModule, MatProgressSpinnerModule],
  templateUrl: './topology-tab.component.html',
  styleUrl:    './topology-tab.component.scss',
})
export class TopologyTabComponent implements OnInit {
  readonly topo   = inject(TopologyService);
  readonly mapSvc = inject(MapService);

  selectedA = signal<string>('');
  selectedB = signal<string>('');
  selectedOp = signal<TopologyOp>('intersect');

  readonly operations: { id: TopologyOp; label: string; icon: string; desc: string }[] = [
    { id: 'intersect',     label: 'Intersección',      icon: 'join_inner',  desc: 'Área común' },
    { id: 'union',         label: 'Unión',              icon: 'join_full',   desc: 'Área combinada' },
    { id: 'difference',    label: 'Diferencia (A − B)', icon: 'join_left',   desc: 'A sin B' },
    { id: 'symDifference', label: 'Dif. Simétrica',     icon: 'join_right',  desc: 'Sin el solapamiento' },
    { id: 'clip',          label: 'Recorte',            icon: 'content_cut', desc: 'Recorta A con B' },
  ];

  ngOnInit(): void { this.topo.setMap(this.mapSvc.map); }

  onSelectA(e: Event): void { this.selectedA.set((e.target as HTMLSelectElement).value); }
  onSelectB(e: Event): void { this.selectedB.set((e.target as HTMLSelectElement).value); }

  run(): void {
    if (!this.selectedA() || !this.selectedB() || this.selectedA() === this.selectedB()) return;
    this.topo.run(this.selectedOp(), this.selectedA(), this.selectedB());
  }

  save():  void { this.topo.saveResult(); }
  clear(): void { this.topo.clearResult(); }

  canRun(): boolean {
    return !!this.selectedA() && !!this.selectedB() && this.selectedA() !== this.selectedB() && !this.topo.loading();
  }
}