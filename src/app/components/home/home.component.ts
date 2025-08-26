import { Component, OnInit, ChangeDetectorRef, OnDestroy, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { GlobalService } from '../../services/global.service';
import { CommonModule } from '@angular/common';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { CategoriasSliderComponent } from '../categorias-slider/categorias-slider.component';
import { Pipe, PipeTransform } from '@angular/core';
import lottie, { AnimationItem, AnimationConfig } from 'lottie-web';
import player from 'lottie-web';
import { interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
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
  imports: [CommonModule],
  templateUrl: './home.component.html', 
  styleUrl: './home.component.css',
  template: `
    <div class="cs-iconbox_icon">
      <div #searchAnim style="width:80px;height:80px"></div>
    </div>
    <div class="cs-iconbox_icon">
      <div #calendarAnim style="width:80px;height:80px"></div>
    </div>
    <div class="cs-iconbox_icon">
      <div #chatAnim style="width:80px;height:80px"></div>
    </div>
  `,
})
export class HomeComponent implements OnInit, OnDestroy {
  loading = true;
  private destroy$ = new Subject<void>();
  private subscriptions = new Subscription();
  categoriasRandom: any[] = [];
  @ViewChild('searchAnim', { static: true }) searchAnim!: ElementRef;
  @ViewChild('calendarAnim', { static: true }) calendarAnim!: ElementRef;
  @ViewChild('chatAnim', { static: true }) chatAnim!: ElementRef;
  private anims: AnimationItem[] = [];
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
    this.globalService.categorias$.subscribe(categorias => {
      if (categorias) {
        this.categoriasRandom = this.shuffle(categorias).slice(0, 6);
      }
    });
    this.anims.push(
      lottie.loadAnimation({
        container: this.searchAnim.nativeElement,
        path: 'assets/animations/search.json',
        renderer: 'svg',
        loop: true,
        autoplay: true,
      })
    );

    this.anims.push(
      lottie.loadAnimation({
        container: this.calendarAnim.nativeElement,
        path: 'assets/animations/calendar.json',
        renderer: 'svg',
        loop: true,
        autoplay: true,
      })
    );

    this.anims.push(
      lottie.loadAnimation({
        container: this.chatAnim.nativeElement,
        path: 'assets/animations/Chat.json',
        renderer: 'svg',
        loop: true,
        autoplay: true,
      })
    );
  
  } 
  private shuffle(array: any[]) {
    return [...array].sort(() => Math.random() - 0.5);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.anims.forEach(a => a.destroy());
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

  onVerPerfil(p: any) {
    this.globalService.viewDetail(p);
    this.cdr.markForCheck();  // o detectChanges() en casos puntuales
  }

  // TrackBy function for ngFor optimizations
  trackByFn(index: number, item: any): string {
    return item?.id || index.toString();
  }
}
