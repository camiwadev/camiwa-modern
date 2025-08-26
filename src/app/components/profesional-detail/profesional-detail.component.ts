import { Component } from '@angular/core';
import { GlobalService } from '../../services/global.service';
import { BookingCalendarComponent } from '../booking-calendar/booking-calendar.component';
import { CommonModule } from '@angular/common';
type TabKey = 'perfil' | 'servicios' | 'resenas' | 'agenda';
@Component({
  selector: 'app-profesional-detail',
  imports: [CommonModule, BookingCalendarComponent],
  templateUrl: './profesional-detail.component.html',
  styleUrl: './profesional-detail.component.css'
})
export class ProfesionalDetailComponent {
  activeTab: TabKey = 'perfil';
  showAgenda = false;
  setTab(tab: TabKey, el?: HTMLElement) {
    this.activeTab = tab;

    // Si activas la agenda, fuerza recalcular tamaño del calendario
    if (tab === 'agenda') {
      setTimeout(() => {
        const api: any = (document.querySelector('full-calendar') as any)?.getApi?.();
        api?.updateSize?.();   // importante si estuvo oculto
        api?.render?.();       // por si el contenedor cambió
      }, 0);
    }

    // (Opcional) scroll suave al contenedor de contenido
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
constructor(
  public global: GlobalService
){}
onTabChange(tab: string) {
  this.showAgenda = (tab === 'agenda');

  if (this.showAgenda) {
    setTimeout(() => {
      const el = document.querySelector('full-calendar') as any;
      const api = el?.getApi?.();
      api?.updateSize();
      api?.render();
    }, 100);
  }
}
}
