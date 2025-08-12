import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { GlobalService } from '../../services/global.service';
import { CommonModule } from '@angular/common';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { CategoriasSliderComponent } from '../categorias-slider/categorias-slider.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  loading = true;
  private destroy$ = new Subject<void>();
  private subscriptions = new Subscription();

  constructor(
    public globalService: GlobalService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      // Initialize data loading in sequence instead of parallel
      await this.globalService.initCategoriasRealtime();
      await this.globalService.initEspecialidadesRealtime();
      await this.globalService.initProfesionalesRealtime();

      // Subscribe to data changes
      this.globalService.categorias$
        .pipe(takeUntil(this.destroy$))
        .subscribe(categorias => {
          console.log('Categorías actualizadas:', categorias);
          this.cdr.detectChanges();
        });

      this.globalService.especialidades$
        .pipe(takeUntil(this.destroy$))
        .subscribe(especialidades => {
          console.log('Especialidades actualizadas:', especialidades);
          this.cdr.detectChanges();
        });

      this.loading = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error initializing data:', error);
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  private initializeSliders(): void {
    // Reinitialize sliders after data is loaded
    setTimeout(() => {
      const sliders = document.querySelectorAll('.cs-slider');
      sliders.forEach(slider => {
        // Reinitialize slider here if needed
        // This is a placeholder - you'll need to use the actual slider initialization code
        console.log('Reinitializing slider:', slider);
      });
    }, 100); // Small delay to ensure DOM is updated
  }

 

  // TrackBy function for ngFor optimizations
  trackByFn(index: number, item: any): string {
    return item?.id || index.toString();
  }
}
