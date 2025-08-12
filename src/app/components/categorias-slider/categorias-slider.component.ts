// categorias-slider.component.ts
import { Component, ElementRef, ViewChild, inject, OnInit, OnDestroy, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { Subscription } from 'rxjs';
import { register } from 'swiper/element/bundle';
import { GlobalService } from '../../services/global.service';

type Categoria = { id?: string; name: string };

@Component({
  selector: 'app-categorias-slider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './categorias-slider.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CategoriasSliderComponent implements OnInit, AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  categorias: Categoria[] = [];
  sub?: Subscription;
  initialized = false;

  @ViewChild('swiperRef') swiperRef!: ElementRef<any>;
  @ViewChild('prevEl') prevEl!: ElementRef<HTMLElement>;
  @ViewChild('nextEl') nextEl!: ElementRef<HTMLElement>;
  @ViewChild('paginationEl') paginationEl!: ElementRef<HTMLElement>;

  constructor(private globalService: GlobalService) {}

  ngOnInit() {
    if (this.isBrowser) register(); // registra el web component en el navegador

    // Trae categorías y reintenta inicializar cuando lleguen
    this.sub = this.globalService.categorias$.subscribe((list) => {
      this.categorias = list ?? [];
      this.maybeInit();
    });
  }

  ngAfterViewInit() {
    this.maybeInit();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  trackById = (_: number, c: Categoria) => c.id ?? c.name;

  private maybeInit() {
    if (!this.isBrowser) return;
    if (this.initialized) return;
    if (!this.swiperRef?.nativeElement) return;
    if (!this.prevEl || !this.nextEl || !this.paginationEl) return;
    if (!this.categorias?.length) return; // espera a tener slides

    const swiperEl = this.swiperRef.nativeElement as any;

    // Asigna opciones, incluidos tus breakpoints 1/3/3/3
    Object.assign(swiperEl, {
      loop: true,
      speed: 600,
      centeredSlides: true,
      slidesPerView: 1,
      breakpoints: {
        576: { slidesPerView: 3 },
        768: { slidesPerView: 3 },
        992: { slidesPerView: 3 },
      },
      navigation: {
        prevEl: this.prevEl.nativeElement,
        nextEl: this.nextEl.nativeElement,
      },
      pagination: {
        el: this.paginationEl.nativeElement,
        clickable: true,
      },
      // autoplay: false  // equivalente a tu data-autoplay="0"
    });

    // Inicializa cuando ya hay contenido en el DOM
    swiperEl.initialize();
    this.initialized = true;
  }
}
