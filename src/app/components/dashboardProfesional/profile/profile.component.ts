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
  standalone: true,
  imports: [CommonModule, BookingCalendarComponent, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  newImages: File[] = [];
  newCertificates: File[] = [];
  newDocuments: File[] = [];
  avatarPreviewUrl: string | null = null;
  editMode = false;
  saving = false;
  activeTab: TabKey = 'perfil';
  showAgenda = false;

  constructor(
    public global: GlobalService,
    public pb: PbService,
    private fb: FormBuilder
  ) {}

  private get currentSpec(): any {
    return this.global.previewRequest || {};
  }

  ngOnInit(): void {
    this.buildForm();
    this.patchFromRecord(this.currentSpec);
  }

  private buildForm(): void {
    this.profileForm = this.fb.group({
      full_name: ['', Validators.required],
      profession: ['', Validators.required],
      biography: [''],
      username: ['', Validators.required],
      phone: [''],
      email: ['', [Validators.email]],
      city: [''],
      address: [''],
      days: [[]],
      specialties: [[]],
      services: [[]],
    });
  }
  
  /** Pasa los valores del record al formulario */
  private patchFromRecord(r: any): void {
    this.profileForm.patchValue(
      {
        full_name: r?.full_name || '',
        profession: r?.profession || '',
        biography: r?.biography || r?.type || '',
        username: r?.username || r?.userId || r?.full_name || '',
        phone: r?.phone || '',
        email: r?.email || '',
        city: r?.city || '',
        address: r?.address || '',
        days: r?.days || [],
        specialties: r?.specialties || [],
        services: r?.services || [],
      },
      { emitEvent: false }
    );
    this.profileForm.markAsPristine();
  }

  setTab(tab: TabKey, el?: HTMLElement): void {
    this.activeTab = tab;
    if (tab === 'agenda') {
      setTimeout(() => {
        const api: any = (document.querySelector('full-calendar') as any)?.getApi?.();
        api?.updateSize?.();
        api?.render?.();
      }, 0);
    }
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  toggleEdit(): void {
    if (!this.editMode) {
      // Entrando a edición → hidrata con el record actual
      this.patchFromRecord(this.currentSpec);
    } else {
      // Cancelando → restaura
      this.patchFromRecord(this.currentSpec);
    }
    this.editMode = !this.editMode;
  }

  onTabChange(tab: string): void {
    this.showAgenda = tab === 'agenda';
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
    Object.keys(this.profileForm.controls).forEach((key) => {
      const ctrl = this.profileForm.get(key);
      if (ctrl && ctrl.dirty) {
        (payload as any)[key] = ctrl.value;
      }
    });
    return payload;
  }

  onFileSelectImages(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) this.newImages = Array.from(input.files);
  }

  onFileSelectCertificates(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) this.newCertificates = Array.from(input.files);
  }

  onFileSelectDocuments(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) this.newDocuments = Array.from(input.files);
  }

  /** Devuelve la URL del avatar (primera imagen) o un fallback */
  getAvatarUrl(): string {
    const rec: any = this.global.previewRequest || {};
    const files: any[] = rec?.['images'] || [];
    const first = Array.isArray(files) && files.length ? files[0] : null;
  
    if (!first) return 'assets/img/avatar/avatar_29.png';
  
    // Helper de PB del servicio
    if (first && typeof this.pb.getFileUrl === 'function') {
      const url = this.pb.getFileUrl(rec, first);
      const v = encodeURIComponent(rec?.updated || Date.now()); // bust cache
      return `${url}${url.includes('?') ? '&' : '?'}v=${v}`;
    }
  
    if (/^https?:\/\//i.test(first)) {
      const v = encodeURIComponent(rec?.updated || Date.now());
      return `${first}${first.includes('?') ? '&' : '?'}v=${v}`;
    }
  
    return 'assets/img/avatar/avatar_29.png';
  }
  
  

  /** Abre el selector de archivos */
  triggerAvatarInput(): void {
    const input = document.getElementById('proAvatarInput') as HTMLInputElement | null;
    input?.click();
  }

  /** Cambiar avatar: sube una imagen y la coloca en images[0] */
  async onAvatarChange(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
  
    // Preview optimista inmediata
    this.avatarPreviewUrl = URL.createObjectURL(file);
  
    const maxMB = 5;
    if (!file.type.startsWith('image/')) {
      URL.revokeObjectURL(this.avatarPreviewUrl);
      this.avatarPreviewUrl = null;
      await Swal.fire('Archivo no válido', 'Selecciona una imagen.', 'warning');
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      URL.revokeObjectURL(this.avatarPreviewUrl);
      this.avatarPreviewUrl = null;
      await Swal.fire('Archivo muy grande', `Máximo ${maxMB} MB.`, 'warning');
      return;
    }
  
    const rec: any = this.global.previewRequest || {};
    const id: string | undefined = rec?.id;
    if (!id) {
      URL.revokeObjectURL(this.avatarPreviewUrl);
      this.avatarPreviewUrl = null;
      await Swal.fire('Error', 'No se encontró el registro del profesional', 'error');
      if (input) input.value = '';
      return;
    }
  
    try {
      this.saving = true;
    
      // 1) Existentes (para no perderlas)
      const existing: string[] = Array.isArray(rec['images']) ? rec['images'] : [];
    
      // 2) FormData: NUEVA PRIMERO (avatar) + EXISTENTES
      const fd = new FormData();
      fd.append('images', file);                       // nueva primero
      existing.forEach(name => fd.append('images', name)); // luego las existentes
    
      // 3) UPDATE raw en la colección CORRECTA (plural)
      const updated: any = await this.pb.rawUpdate(
        'camiwaSpecialists',               // ← AQUÍ EL PLURAL
        id,
        fd,
        { fields: 'id,images,full_name,profession,biography,phone,email,city,address,updated' }
      );
    
      // 4) Refresca estado global
      this.global.previewRequest = { ...this.global.previewRequest, ...updated };
    
      await Swal.fire('Éxito', 'Foto actualizada correctamente', 'success');
    } catch (err: any) {
      console.error(err);
      await Swal.fire('Error', err?.message || 'No se pudo actualizar la foto', 'error');
      if (this.avatarPreviewUrl) URL.revokeObjectURL(this.avatarPreviewUrl);
      this.avatarPreviewUrl = null;
    } finally {
      this.saving = false;
      if (input) input.value = '';
    }
    
  }
  
  

  async onSaveProfile(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      await Swal.fire('Atención', 'Completa los campos requeridos', 'warning');
      return;
    }

    const id = this.currentSpec?.id as string | undefined;
    if (!id) {
      await Swal.fire('Error', 'No se encontró el registro del profesional', 'error');
      return;
    }

    const data = this.getDirtyPayload(); // PATCH parcial
    const hasFiles =
      this.newImages.length || this.newCertificates.length || this.newDocuments.length;

    const files = hasFiles
      ? {
          images: this.newImages,
          certificates: this.newCertificates,
          documents: this.newDocuments
        }
      : undefined;

    try {
      this.saving = true;

      const updated: any = await this.pb.updateCamiwaSpecialist(id, data, files, {
        fields:
          'id,images,full_name,profession,biography,phone,email,city,address,days,specialties,services,updated'
      });

      // Sincroniza estado local
      this.global.previewRequest = { ...this.global.previewRequest, ...updated };

      // Resetea form con valores actualizados
      this.patchFromRecord(updated);

      // Limpia colas de archivos
      this.newImages = [];
      this.newCertificates = [];
      this.newDocuments = [];

      this.editMode = false;
      await Swal.fire('Éxito', 'Perfil actualizado correctamente', 'success');
    } catch (err: any) {
      console.error(err);
      await Swal.fire('Error', err?.message || 'No se pudo actualizar el perfil', 'error');
    } finally {
      this.saving = false;
    }
  }
}
