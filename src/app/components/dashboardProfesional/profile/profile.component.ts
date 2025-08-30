import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { GlobalService } from '../../../services/global.service';
import { BookingCalendarComponent } from '../../booking-calendar/booking-calendar.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { PbService, CamiwaSpecialistUpdate } from '../../../services/pb.service';

type TabKey = 'perfil' | 'servicios' | 'resenas' | 'agenda';
@Component({
  selector: 'app-profile',
  standalone:true,
  imports: [CommonModule, BookingCalendarComponent, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup; 
  newImages: File[] = [];
  newCertificates: File[] = [];
  newDocuments: File[] = [];
  editMode = false;
  saving = false;
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
  public global: GlobalService,
  public pb: PbService,
  private fb: FormBuilder
){
  this.profileForm = this.fb.group({
    full_name: [this.global.previewRequest.full_name, Validators.required],
    profession: [this.global.previewRequest.profession, Validators.required],
    biography: [this.global.previewRequest.type],
    username: ['edward', Validators.required],
    facebook: ['https://facebook.com/username'],
    twitter: ['https://twitter.com/username'],
    linkedin: ['https://linkedin.com/in/username'],
  });
}
ngOnInit(): void {
  const r = this.global.previewRequest; // record actual

  this.profileForm = this.fb.group({
    full_name: [r.full_name || '', Validators.required],
    profession: [r.profession || '', Validators.required],
    biography: [r.biography || r.type || ''], // <-- fallback
    username: [r.userId || r.full_name || '', Validators.required], // si manejas username
    // facebook/twitter/linkedin podrían vivir en otra colección; mantenlos si los usas en UI
    // facebook: [r.facebook || ''],
    // twitter: [r.twitter || ''],
    // linkedin: [r.linkedin || ''],
    phone: [r.phone || ''],
    email: [r.email || ''],
    city: [r.city || ''],
    address: [r.address || ''],
    days: [r.days || []],
    specialties: [r.specialties || []],
    services: [r.services || []],
  });
}

toggleEdit() {
  if (this.editMode) {
    // cancelar → restablece valores del record actual
    const r = this.global.previewRequest;
    this.profileForm.reset({
      full_name: r.full_name || '',
      profession: r.profession || '',
      biography: r.biography || r.type || '',
      username: r.full_name || r.full_name || '',
      // facebook: r.facebook || '',
      // twitter: r.twitter || '',
      // linkedin: r.linkedin || '',
      phone: r.phone || '',
      email: r.email || '',
      city: r.city || '',
      address: r.address || '',
      days: r.days || [],
      specialties: r.specialties || [],
      services: r.services || [],
    });
  }
  this.editMode = !this.editMode;
}

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

private getDirtyPayload(): CamiwaSpecialistUpdate {
  const payload: CamiwaSpecialistUpdate = {};
  Object.keys(this.profileForm.controls).forEach(key => {
    const ctrl = this.profileForm.get(key);
    if (ctrl && ctrl.dirty) {
      (payload as any)[key] = ctrl.value;
    }
  });
  return payload;
}

onFileSelectImages(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) this.newImages = Array.from(input.files);
}

onFileSelectCertificates(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) this.newCertificates = Array.from(input.files);
}

onFileSelectDocuments(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) this.newDocuments = Array.from(input.files);
}

async onSaveProfile() {
  if (this.profileForm.invalid) {
    this.profileForm.markAllAsTouched();
    Swal.fire('Atención', 'Completa los campos requeridos', 'warning');
    return;
  }

  const id = this.global.previewRequest.id as string;
  const data = this.getDirtyPayload(); // PATCH parcial

  const hasFiles = this.newImages.length || this.newCertificates.length || this.newDocuments.length;
  const files = hasFiles ? {
    images: this.newImages,
    certificates: this.newCertificates,
    documents: this.newDocuments
  } : undefined;

  try {
    this.saving = true;

    const updated = await this.pb.updateCamiwaSpecialist(id, data, files, {
      fields: 'id,full_name,profession,biography,phone,email,city,address,images,specialties,services,days,updated'
    });

    // Sincroniza estado local (usar notación de corchetes por TS4111)
    this.global.previewRequest = {
      ...this.global.previewRequest,
      ...updated
    };

    // Resetea form con valores actualizados (corchetes)
    this.profileForm.reset({
      full_name: updated['full_name'] || '',
      profession: updated['profession'] || '',
      biography: updated['biography'] || '',
      username: updated['username'] || this.global.previewRequest.full_name || '',
      phone: updated['phone'] || '',
      email: updated['email'] || '',
      city: updated['city'] || '',
      address: updated['address'] || '',
      days: updated['days'] || [],
      specialties: updated['specialties'] || [],
      services: updated['services'] || [],
    });

    // Limpia colas de archivos
    this.newImages = [];
    this.newCertificates = [];
    this.newDocuments = [];

    this.editMode = false;
    Swal.fire('Éxito', 'Perfil actualizado correctamente', 'success');
  } catch (err: any) {
    console.error(err);
    Swal.fire('Error', err?.message || 'No se pudo actualizar el perfil', 'error');
  } finally {
    this.saving = false;
  }
}
}