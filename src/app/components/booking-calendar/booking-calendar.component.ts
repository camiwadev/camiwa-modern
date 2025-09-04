import { Component, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarOptions, DateSelectArg, EventClickArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import resourcePlugin from '@fullcalendar/resource';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';

// Registra <full-calendar> una vez
import '@fullcalendar/web-component';

import { GlobalService } from '../../services/global.service';

@Component({
  selector: 'app-booking-calendar',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<full-calendar [options]="calendarOptions"></full-calendar>`,
  styleUrls: ['./booking-calendar.component.css']
})
export class BookingCalendarComponent implements OnInit, AfterViewInit {
  constructor(public global: GlobalService) {}

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, resourcePlugin, resourceTimeGridPlugin],
    initialView: 'timeGridWeek',
    slotMinTime: '07:00:00',
    slotMaxTime: '21:00:00',
    allDaySlot: false,
    selectable: true,
    selectMirror: true,
    editable: false,
    droppable: false,
    height: 'auto',
    locale: 'es',
    nowIndicator: true,
    eventOverlap: false,
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
    select: (arg) => this.onSelect(arg),
    eventClick: (arg) => this.onEventClick(arg),
    events: (info, success, failure) => this.loadEvents(info.start, info.end, success, failure),
  };

  ngOnInit() {
    // Protege por si aún no hay pb:
    this.global?.pb?.collection('bookings')?.subscribe?.('*', () => {
      const api: any = (document.querySelector('full-calendar') as any)?.getApi?.();
      api?.refetchEvents?.();
    });
  }

  ngAfterViewInit() {
    // Asegura render una vez montado
    queueMicrotask(() => {
      const api = (document.querySelector('full-calendar') as any)?.getApi?.();
      api?.updateSize?.();
      api?.render?.();
    });
  }

  private loadEvents(start: Date, end: Date, success: (e: EventInput[]) => void, failure: any) {
    this.global.pb.collection('bookings').getFullList(200, {
      filter: this.buildDateFilterForPB(start, end),
      expand: 'patientId,serviceId',
      sort: 'start'
    })
    .then(records => {
      success(records.map((r: any) => ({
        id: r.id,
        title: this.eventTitle(r),
        start: r.start,
        end: r.end,
        extendedProps: { record: r, status: r.status },
        color: this.statusColor(r.status),
      } as EventInput)));
    })
    .catch(failure);
  }

  private buildDateFilterForPB(start: Date, end: Date) {
    const s = start.toISOString();
    const e = end.toISOString();
    return `(start < "${e}" && end > "${s}") && status != "cancelled"`;
  }

  private eventTitle(r: any): string {
    const name = r?.expand?.patientId?.full_name || 'Reserva';
    const svc  = r?.expand?.serviceId?.name ? ` • ${r.expand.serviceId.name}` : '';
    return `${name}${svc}`;
  }

  private statusColor(status: string) {
    switch (status) {
      case 'confirmed': return '#22c55e';
      case 'pending':   return '#f59e0b';
      case 'cancelled': return '#ef4444';
      default:          return '#6a5cff';
    }
  }

  private onSelect(arg: DateSelectArg) {
    const professionalId = this.global.previewRequest?.id;
    if (!professionalId) return;

    if (!this.isInWorkingHours(arg.start, arg.end)) {
      alert('Fuera del horario disponible');
      return;
    }

    this.global.pb.collection('bookings').create({
      professionalId,
      patientId: this.global.currentUser?.id,
      start: arg.start.toISOString(),
      end: arg.end.toISOString(),
      timezone: 'America/Bogota',
      status: 'pending'
    })
    .then(() => (arg.view.calendar as any).refetchEvents())
    .catch(err => alert(err?.message || 'Error creando reserva'));
  }

  private onEventClick(arg: EventClickArg) {
    const r = (arg.event.extendedProps as any)?.record;
    console.log('Reserva:', r);
  }

  private isInWorkingHours(start: Date, end: Date) {
    const day = start.getDay();
    const map = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    return this.global.workingDays?.includes(map[day]);
  }
}
