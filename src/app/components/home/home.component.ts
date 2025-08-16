import { Component, OnInit, ChangeDetectorRef, OnDestroy, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { GlobalService } from '../../services/global.service';
import { CommonModule } from '@angular/common';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { CategoriasSliderComponent } from '../categorias-slider/categorias-slider.component';
import { Pipe, PipeTransform } from '@angular/core';
import lottie, { AnimationItem, AnimationConfig } from 'lottie-web';
import player from 'lottie-web';
import { provideLottieOptions } from 'ngx-lottie';
import { LottieComponent } from 'ngx-lottie';
export function playerFactory() {
  return player;
}

@Pipe({ name: 'firstCategoryImage', standalone: true })
export class FirstCategoryImagePipe implements PipeTransform {
  transform(raw: any, fallback = 'assets/img/default-category.jpg'): string {
    try {
      if (!raw) return fallback;
      if (Array.isArray(raw)) return raw[0] || fallback;
      if (typeof raw === 'string') {
        const t = raw.trim();
        if (t.startsWith('[')) {
          const arr = JSON.parse(t);
          return (Array.isArray(arr) && arr[0]) ? arr[0] : fallback;
        }
        return t || fallback;
      }
      return fallback;
    } catch {
      return fallback;
    }
  }
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LottieComponent],
  templateUrl: './home.component.html', 
  styleUrl: './home.component.css',
  template: `
    <ng-lottie [options]="{ path: 'assets/animations/search.json' }"
               style="width:120px;height:120px">
    </ng-lottie>
  `,
})
export class HomeComponent implements OnInit, OnDestroy {
  loading = true;
  private destroy$ = new Subject<void>();
  private subscriptions = new Subscription();

  // Configuración de la animación
  
  searchAnimation = { path: 'assets/animations/search.json' };
calendarAnimation = { path: 'assets/animations/calendar.json' };
ChatAnimation = { path: 'assets/animations/Chat.json' };

  constructor(
    public globalService: GlobalService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.globalService.initCategoriasRealtime();
      await this.globalService.initEspecialidadesRealtime();
      await this.globalService.initProfesionalesRealtime();

      this.globalService.categorias$
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.cdr.detectChanges());

      this.globalService.especialidades$
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.cdr.detectChanges());

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
