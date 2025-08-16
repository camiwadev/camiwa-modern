import { Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';
import lottie, { AnimationItem, AnimationConfig } from 'lottie-web';

export type LottieOptions = {
  path: string;              // ruta al .json (en /assets/…)
  autoplay?: boolean;        // true por defecto
  loop?: boolean | number;   // true por defecto
  renderer?: 'svg' | 'canvas' | 'html'; // svg por defecto
  speed?: number;            // 1 por defecto
};

@Directive({
  selector: '[appLottie]',
  standalone: true,
})
export class LottieDirective implements OnInit, OnDestroy {
  @Input('appLottie') options!: LottieOptions;

  private anim?: AnimationItem;
  private io?: IntersectionObserver;

  constructor(private host: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    if (!this.options?.path) return;

    // Respeta "reduced motion"
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

    // Lazy play cuando entra al viewport (mejor performance)
    this.io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.load(prefersReduced);
          this.io?.disconnect();
        }
      });
    }, { threshold: 0.25 });
    this.io.observe(this.host.nativeElement);
  }

  private load(prefersReduced: boolean) {
    const cfg: AnimationConfig = {
      container: this.host.nativeElement,
      renderer: this.options.renderer ?? 'svg',
      loop: this.options.loop ?? true,
      autoplay: prefersReduced ? false : (this.options.autoplay ?? true),
      path: this.options.path,
    };

    this.anim = lottie.loadAnimation(cfg);
    if (this.options.speed && this.anim) {
      this.anim.setSpeed(this.options.speed);
    }

    // Si hay reduced motion, queda pausado en el primer frame.
    if (prefersReduced && this.anim) {
      this.anim.goToAndStop(0, true);
    }
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
    this.anim?.destroy();
  }
}
