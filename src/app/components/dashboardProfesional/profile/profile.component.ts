import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { GlobalService } from '../../../services/global.service';
import { BookingCalendarComponent } from '../../booking-calendar/booking-calendar.component';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { PbService, CamiwaSpecialistUpdate } from '../../../services/pb.service';

type TabKey = 'perfil' | 'servicios' | 'resenas' | 'agenda';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, BookingCalendarComponent, ReactiveFormsModule, FormsModule],
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
  services: any[] = [];
  loadingServices = false;
  showNewService = false;
  serviceForm!: FormGroup;
  serviceImages: File[] = [];
  creatingService = false;
  editingServiceId: string | null = null;
  serviceEditForm!: FormGroup;
  serviceEditNewImages: File[] = [];
  serviceEditKeep: string[] = [];   // nombres existentes a conservar
  serviceEditClearAll = false; 
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
    this.buildServiceForm();
    this.buildServiceEditForm();    
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

  private buildServiceForm(): void {
    this.serviceForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(120)]], // → se mapea a 'tittle'
      description: ['', [Validators.maxLength(2000)]],
      price:[''],
      images:['']
    });
  }
  private buildServiceEditForm(): void {
    this.serviceEditForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(120)]],
      description: ['', [Validators.maxLength(2000)]],
      clearAll: [false], // ← checkbox reactivo para limpiar todas las imágenes
    });
  }
  startEditService(s: any): void {
    this.editingServiceId = s.id;
    this.serviceEditForm.reset({
      title: s.tittle || s.title || '',
      description: s.description || ''
    });
    // filenames actuales
    this.serviceEditKeep = this.pb.normalizeFileNames(s.images);
    this.serviceEditNewImages = [];
    this.serviceEditClearAll = false;
  }

  cancelEditService(): void {
    this.editingServiceId = null;
    this.serviceEditForm.reset();
    this.serviceEditNewImages = [];
    this.serviceEditKeep = [];
    this.serviceEditClearAll = false;
  }
  onServiceEditImagesSelect(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (input.files?.length) {
      const files = Array.from(input.files);
      // valida tipo/tamaño si quieres
      this.serviceEditNewImages = files.filter(f => f.type.startsWith('image/'));
    }
  }

  toggleRemoveExistingImage(name: string): void {
    // quitar/volver a agregar una existente del array de "conservar"
    const i = this.serviceEditKeep.indexOf(name);
    if (i >= 0) this.serviceEditKeep.splice(i, 1);
    else this.serviceEditKeep.push(name);
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

  
  async saveEditService(s: any): Promise<void> {
    if (!this.editingServiceId) return;
    if (this.serviceEditForm.invalid) {
      this.serviceEditForm.markAllAsTouched();
      await Swal.fire('Atención', 'Completa el título', 'warning');
      return;
    }

    const { title, description } = this.serviceEditForm.value;
    const data = { tittle: title, description: description ?? '' };

    try {
      // Construcción de la lista final de imágenes:
      // - si serviceEditClearAll = true -> []
      // - si no: mezcla filenames a conservar + nuevos Files
      let imagesCombined: (File | string)[] | undefined;

      if (this.serviceEditClearAll) {
        imagesCombined = []; // limpia todas
      } else {
        imagesCombined = [...this.serviceEditKeep, ...this.serviceEditNewImages];
      }

      const updated = await this.pb.updateService(this.editingServiceId, data, imagesCombined);

      // Refresca la lista local sin reconsultar todo (opcional):
      const idx = this.services.findIndex(x => x.id === this.editingServiceId);
      if (idx >= 0) this.services[idx] = updated;

      this.cancelEditService();
      await Swal.fire('Éxito', 'Servicio actualizado', 'success');
    } catch (e: any) {
      console.error(e);
      await Swal.fire('Error', e?.message || 'No se pudo actualizar el servicio', 'error');
    }
  }

 
  setTab(tab: TabKey) {
    this.activeTab = tab;

    if (tab === 'agenda') {
      setTimeout(() => {
        const api = (document.querySelector('full-calendar') as any)?.getApi?.();
        api?.updateSize?.(); api?.render?.();
      }, 0);
    }

    if (tab === 'servicios' && !this.services.length) {
      this.loadServices();
    }
  }

  async loadServices(): Promise<void> {
    this.loadingServices = true;
    try {
      const owner = this.currentSpec?.userId || this.currentSpec?.id;
      if (!owner) throw new Error('No se encontró el userId del profesional.');
      const res = await this.pb.listServicesByUser(owner);
      this.services = res?.items ?? [];
    } catch (e: any) {
      console.error(e);
      await Swal.fire('Error', e?.message || 'No se pudieron cargar los servicios', 'error');
    } finally {
      this.loadingServices = false;
    }
  }
  toggleNewService(): void {
    this.showNewService = !this.showNewService;
    if (!this.showNewService) {
      this.serviceForm.reset();
      this.serviceImages = [];
    }
  }

  onServiceImagesSelect(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (input.files?.length) {
      this.serviceImages = Array.from(input.files);
    }
  }

  async createService(): Promise<void> {
    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      await Swal.fire('Atención', 'Completa el título del servicio', 'warning');
      return;
    }
    const owner = this.currentSpec?.userId || this.currentSpec?.id;
    if (!owner) {
      await Swal.fire('Error', 'No se encontró el userId del profesional', 'error');
      return;
    }

    const { title, description } = this.serviceForm.value;
    const payload = {
      userId: owner,
      tittle: title,        // ← schema camiwaServices usa 'tittle'
      description: description || ''
    };

    try {
      this.creatingService = true;
      const created = await this.pb.createService(payload, this.serviceImages);
      // refrescar lista y cerrar form
      await this.loadServices();
      this.toggleNewService();
      await Swal.fire('Éxito', 'Servicio creado correctamente', 'success');
    } catch (e: any) {
      console.error(e);
      await Swal.fire('Error', e?.message || 'No se pudo crear el servicio', 'error');
    } finally {
      this.creatingService = false;
    }
  }

  
  async deleteService(s: any): Promise<void> {
    const ask = await Swal.fire({
      title: '¿Eliminar servicio?',
      text: s.tittle || s.title || 'Este servicio se eliminará definitivamente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!ask.isConfirmed) return;

    try {
      await this.pb.deleteService(s.id);
      this.services = this.services.filter(x => x.id !== s.id);
      if (this.editingServiceId === s.id) this.cancelEditService();
      await Swal.fire('Eliminado', 'Servicio eliminado correctamente', 'success');
    } catch (e: any) {
      console.error(e);
      await Swal.fire('Error', e?.message || 'No se pudo eliminar', 'error');
    }
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
    const bust = (u: string) => {
      const v = encodeURIComponent(rec?.updated || Date.now());
      return `${u}${u.includes('?') ? '&' : '?'}v=${v}`;
    };
  
    if (rec?.avatar) {
      const u = this.pb.getFileUrl(rec, rec.avatar);
      return bust(u);
    }
  
    const arr = Array.isArray(rec?.images) ? rec.images : [];
    if (arr.length) {
      const u = this.pb.getFileUrl(rec, arr[0]);
      return bust(u);
    }
  
    return 'assets/img/avatar/avatar_29.png';
  }
  
  /** Abre el selector de archivos */
  triggerAvatarInput(): void {
    const input = document.getElementById('proAvatarInput') as HTMLInputElement | null;
    input?.click();
  }

  /** Cambiar avatar: sube una imagen y la coloca en images[0] */
  /* async onAvatarChange(ev: Event): Promise<void> {
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
    
  } */
  async onAvatarChange(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
  
    this.avatarPreviewUrl = URL.createObjectURL(file);
  
    try {
      if (!file.type.startsWith('image/')) throw new Error('Selecciona una imagen válida.');
      if (file.size > 5 * 1024 * 1024) throw new Error('Máximo 5 MB.');
  
      const rec: any = this.global.previewRequest || {};
      const id: string | undefined = rec?.id;
      if (!id) throw new Error('No se encontró el registro del profesional.');
  
      this.saving = true;
  
      const existing: string[] = Array.isArray(rec.images) ? rec.images : [];
  
      // NUEVO primero (File), luego EXISTENTES (string)
      const files = {
        avatar: file,                      // si el schema lo tiene, se setea
        images: [file, ...existing],       // reemplaza lista completa conservando anteriores
      };
  
      const updated: any = await this.pb.updateCamiwaSpecialist(
        id,
        {},
        files,
        { fields: 'id,avatar,images,updated,full_name,profession' }
      );
  
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
