import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormArray, FormControl, Validators, FormBuilder } from '@angular/forms';
import { NgMultiSelectDropDownModule, IDropdownSettings } from 'ng-multiselect-dropdown';
import { GlobalService } from '../../services/global.service';
import { PocketAuthService } from '../../services/pocket-auth.service';
import { AuthPocketbaseService } from '../../services/AuthPocketbase.service';
import { firstValueFrom } from 'rxjs';
import { EmailService } from '../../services/email.service';
import Swal from 'sweetalert2';

type Rol = 'patient' | 'profesional';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgMultiSelectDropDownModule,],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'] // <-- corregido
})
export class RegisterComponent {
  toast = signal<{ level: 'success'|'info'|'warn'|'error'; message: string; targetId?: string }|null>(null);
toastVisible = signal(false);
private toastTimer: any = null;
  // --- Estado base registro ---
  rol = signal<Rol>('patient');
  form!: FormGroup; // <-- declara, no inicialices aquí
  isProfessional = computed(() => this.rol() === 'profesional');
  isPatient = computed(() => this.rol() === 'patient');

  // --- Wizard profesional ---
  showProWizard = signal(false);
  proStep = signal<1 | 2 | 3>(1);
  progressPct = computed(() => ((this.proStep() - 1) / 1) * 100);
  // catálogos demo
  categories = [
    { item_id: 1, item_text: 'Medicina General' },
    { item_id: 2, item_text: 'Odontología' },
    { item_id: 3, item_text: 'Fisioterapia' },
  ];
  
  specialtiesFiltered: Array<{ item_id: number; item_text: string }> = [];

  proWizard!: FormGroup; // <-- declara, no inicialices aquí
  // register.component.ts (dentro de la clase)
  dropdownSettingsCategory: IDropdownSettings = {
    singleSelection: true,
    idField: 'id',
    textField: 'name',
    allowSearchFilter: true,
    closeDropDownOnSelection: true
  };
  
  dropdownSettingsSpecialties: IDropdownSettings = {
    singleSelection: false,
    idField: 'id',
    textField: 'name',
    allowSearchFilter: true,
    itemsShowLimit: 3,
  };

categoriesOptions: Array<{ id: string; name: string }> = [];
especialidadOptionsFiltered: Array<{ id: string; name: string; fatherId: string }> = [];
loading = signal(false);
errorMsg = signal<string | null>(null);
  constructor(
    public global: GlobalService,
    private fb: FormBuilder,
    public pocketAuthService: PocketAuthService,
    public auth: AuthPocketbaseService,
    public emailService: EmailService
  ) {

    // Form de registro base
    this.form = this.fb.group({
      role: ['patient' as Rol, Validators.required],
      terms: [false, Validators.requiredTrue],

      // Comunes
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],

      // Pre-registro profesional (solo visible si rol=professional)
      professional: this.fb.group({
        fullName: [''],
        country: [''],
        phone: [''],
        specialtyHint: ['']
      }),

      // Registro paciente
      patient: this.fb.group({
        fullName: ['', [Validators.required, Validators.minLength(3)]],
      })
    });

    // Validador inicial por rol
    this.setRole('patient');

    // Form del wizard profesional
        
    // === REEMPLAZA la definición del proWizard por esta (solo el grupo professional cambia) ===
this.proWizard = this.fb.group({
  personal: this.fb.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    address: [''],
    consultationAddress: [''],
    city: [''],
    country: ['', Validators.required],
    gender: ['Male', Validators.required],
    idDocumentUrl: [''],   // opcional
    avatarUrl: [''],       // opcional
  }),

  professional: this.fb.group({
    profession: ['', [Validators.required, Validators.minLength(3)]],
    studyArea: ['', [Validators.required, Validators.minLength(3)]],
    university: ['', [Validators.required, Validators.minLength(3)]],
    graduationYear: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    // 🔻 ahora sin required (porque el UI está omitido)
    category: [null],            // <- sin Validators.required
    specialties: [[]],           // <- sin Validators.required
    certificatesUrls: [[] as string[]],
  }),

  // si también quieres omitir el paso laboral por ahora, puedes dejarlo así
  laboral: this.fb.group({
    days: this.fb.array<FormControl<boolean>>(
      Array.from({ length: 7 }, () => this.fb.control(false, { nonNullable: true }))
    ),
  }),
});


    // Reacciona al cambio de categoría para filtrar especialidades
   /*  this.pwProf.get('category')!.valueChanges.subscribe((catId: number | null) => {
      this.onCategoryChange(catId);
    }); */
  }

  // --- Getters cómodos ---
  get f() { return this.form.controls; }
  get pwPersonal() { return this.proWizard.get('personal') as FormGroup; }
  get pwProf() { return this.proWizard.get('professional') as FormGroup; }
  get pwLaboral() { return this.proWizard.get('laboral') as FormGroup; }
  get daysFA(): FormArray<FormControl<boolean>> {
    return this.pwLaboral.get('days') as FormArray<FormControl<boolean>>;
  }
  get anyDaySelected(): boolean {
    return (this.daysFA.value as boolean[]).some(Boolean);
  }
  ngOnInit() {
    // 1) disparar carga (si no lo haces antes)
    this.global.initCategoriasRealtime();
    this.global.initEspecialidadesRealtime();
  
    // 2) mapear categorías a {id,name}
    this.global.categorias$.subscribe(cats => {
      this.categoriesOptions = (cats ?? []).map((c: any) => ({ id: c.id, name: c.name }));
    });
  
    // 3) filtrar especialidades cuando cambie 'category'
    this.pwProf.get('category')!.valueChanges.subscribe((selected: any[]) => {
      const selectedId = Array.isArray(selected) && selected[0]?.id ? String(selected[0].id) : null;
      if (!selectedId) {
        this.especialidadOptionsFiltered = [];
        this.pwProf.get('specialties')?.setValue([]);
        return;
      }
      // leemos una sola vez el stream y filtramos
      const all = this.global.especialidadesSubject.getValue?.() ?? []; // si no existe getValue, usa una suscripción previa
      const source = all.length ? all : [];
      this.especialidadOptionsFiltered = source
        .filter((e: any) => String(e.fatherId) === selectedId)
        .map((e: any) => ({ id: e.id, name: e.name, fatherId: e.fatherId }));
      this.pwProf.get('specialties')?.setValue([]);
    });
  
    // Alternativa segura sin getValue(): suscríbete una vez y cachea:
    this.global.especialidades$.subscribe((especialidades: any[]) => {
      const sel = this.pwProf.get('category')!.value as any[];
      const selectedId = Array.isArray(sel) && sel[0]?.id ? String(sel[0].id) : null;
      if (selectedId) {
        this.especialidadOptionsFiltered = (especialidades ?? [])
          .filter((e: any) => String(e.fatherId) === selectedId)
          .map((e: any) => ({ id: e.id, name: e.name, fatherId: e.fatherId }));
      }
    });
  }
  
  // --- Lógica de registro base ---
  /* submit() {
    // valida solo lo básico que siempre es visible
    const basic = ['username','email','password'];
    basic.forEach(n => this.form.get(n)?.markAsTouched());
  
    const basicValid = basic.every(n => this.form.get(n)?.valid);
    if (!basicValid) return;
  
    const role = this.rol();
  
    if (role === 'professional') {
      // NO requieras "terms" ni paciente para abrir el wizard
      this.showProWizard.set(true);
      this.proStep.set(1);
      return;
    }
  
    // Paciente: ahora sí exige términos + bloque paciente
    this.form.get('terms')?.markAsTouched();
  
    const patient = this.form.get('patient') as FormGroup;
    if (!this.form.get('terms')?.valid || patient.invalid) {
      patient.markAllAsTouched();
      return;
    }
  
    // TODO: submit de paciente
  } */
  
    submit() {
      const basic = ['username','email','password'];
      basic.forEach(n => this.form.get(n)?.markAsTouched());
      const basicValid = basic.every(n => this.form.get(n)?.valid);
      if (!basicValid) return;
    
      const role = this.rol();
    
      if (role === 'profesional') {
        this.showProWizard.set(true);
        this.proStep.set(1);
        return;
      }
    
      // Paciente: requiere términos + bloque paciente válido
      const patientFG = this.form.get('patient') as FormGroup;
      this.form.get('terms')?.markAsTouched();
      patientFG.markAllAsTouched();
    
      if (!this.form.get('terms')?.valid) {
        this.showToast({ level: 'warn', message: 'Debes aceptar los términos.', targetId: 'terms' });
        return;
      }
      if (patientFG.invalid) {
        this.showToast({ level: 'warn', message: 'Revisa los datos de paciente.' });
        return;
      }
    
      this.submitPatient(); // registra y loguea
    }
    
    
   /*  private async submitPatient() {
      this.errorMsg.set(null);
      this.loading.set(true);
    
      try {
        const username = (this.form.get('username')?.value ?? '').toString().trim();
        const email    = (this.form.get('email')?.value ?? '').toString().trim();
        const password = (this.form.get('password')?.value ?? '').toString().trim();
        const pat = (this.form.get('patient') as FormGroup).value as {
          name: string; phone?: string; address?: string;
        };
    
        if (!username || username.length < 3) { this.errorMsg.set('Usuario requerido (mín. 3).'); return; }
        if (!email)                           { this.errorMsg.set('Correo requerido.');         return; }
        if (!password || password.length < 6) { this.errorMsg.set('Contraseña mínima 6.');     return; }
    
        await firstValueFrom(
          this.auth.registerTravelerAndLogin(
            email,
            password,
            (pat.name || username).trim(),
            (pat.phone ?? '').trim(),
            (pat.address ?? '').trim()
          )
        );
    
        // 1) Mostrar toast de éxito (visible en esta vista)
        Swal.fire({
          icon: 'success',
          title: 'Registro exitoso',
          text: 'Tu cuenta ha sido creada e iniciada sesión.',
          confirmButtonText: 'Continuar'
        }).then(() => this.auth.permision());
        
        this.showToast({ level: 'success', message: 'Cuenta creada e inicio de sesión exitoso.' });
        await this.emailService.sendWelcome({
          toEmail: email,
          toName: pat.name || username,
          userType: 'paciente',
          params: { plan: 'basic' }
        }).catch(err => console.warn('Welcome email failed:', err));
        
        // 2) Navegar por permisos (elige una de estas dos líneas):
    
        // Opción A: usa tu lógica centralizada
        setTimeout(() => this.auth.permision(), 400);
    
        // Opción B (directo a la ruta de paciente)
        // setTimeout(() => this.global.setRouterActive('patient-profile'), 400);
    
      } catch (e: any) {
        console.error('submitPatient error:', e);
        this.errorMsg.set(e?.message || 'Ocurrió un error al registrar el paciente.');
        this.showToast({ level: 'error', message: this.errorMsg() ?? 'Ocurrió un error.', targetId: 'email' });
      } finally {
        this.loading.set(false);
      }
    } */
    
      private async submitPatient() {
        this.errorMsg.set(null);
        this.loading.set(true);
      
        try {
          const username = (this.form.get('username')?.value ?? '').trim();
          const email    = (this.form.get('email')?.value ?? '').trim();
          const password = (this.form.get('password')?.value ?? '').trim();
      
          if (!username || username.length < 3) { 
            Swal.fire('Error', 'Usuario requerido (mín. 3 caracteres)', 'error');
            return;
          }
          if (!email) { 
            Swal.fire('Error', 'Correo requerido.', 'error');
            return;
          }
          if (!password || password.length < 6) { 
            Swal.fire('Error', 'Contraseña mínima 6 caracteres.', 'error');
            return;
          }
      
          await firstValueFrom(
            this.auth.registerTravelerAndLogin(
              email,
              password,
              username,
              '',
              ''
            )
          );
      
          // Email de bienvenida
          await this.emailService.sendWelcome({
            toEmail: email,
            toName: username,
            userType: 'paciente',
            params: { username }
          }).catch(err => console.warn('Welcome email failed:', err));
      
          Swal.fire('¡Registro exitoso!', 'Tu cuenta ha sido creada.', 'success');
          setTimeout(() => this.auth.permision(), 400);
      
        } catch (e: any) {
          console.error('submitPatient error:', e);
      
          // Si el error viene de email duplicado
          if (e?.message?.includes('validation_email_taken') || e?.message?.includes('already in use')) {
            Swal.fire('Correo en uso', 'El correo ingresado ya está registrado.', 'warning');
          } else {
            Swal.fire('Error', e?.message || 'Ocurrió un error al registrar el paciente.', 'error');
          }
      
        } finally {
          this.loading.set(false);
        }
      }
  setRole(r: Rol) {
    this.rol.set(r);
    this.form.get('role')?.setValue(r);
  
    const prof = this.form.get('professional') as FormGroup;
    const pat  = this.form.get('patient') as FormGroup;
  
    if (r === 'profesional') {
      // limpiar y desactivar validadores de paciente y términos
      pat.reset({ fullName: '', phone: '' }, { emitEvent: false });
      pat.get('fullName')?.clearValidators();
      pat.get('phone')?.clearValidators();
      pat.updateValueAndValidity({ emitEvent: false });
  
      this.form.get('terms')?.clearValidators();
      this.form.get('terms')?.setValue(false, { emitEvent: false });
      this.form.get('terms')?.updateValueAndValidity({ emitEvent: false });
  
      // cerrar wizard si estaba abierto y reiniciarlo
      this.showProWizard.set(false);
      this.proStep.set(1);
    } else {
      // paciente: nombre requerido, términos requeridos
      pat.get('fullName')?.setValidators([Validators.required, Validators.minLength(3)]);
      pat.get('phone')?.clearValidators();
      pat.updateValueAndValidity({ emitEvent: false });
  
      this.form.get('terms')?.setValidators([Validators.requiredTrue]);
      this.form.get('terms')?.updateValueAndValidity({ emitEvent: false });
  
      // ocultar wizard si estaba abierto y limpiar sus grupos si quieres
      this.showProWizard.set(false);
    }
  
    // quitar “touched/dirty” global para no ver errores fantasma
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
  
    
  // --- Wizard: navegación y validación ---
  onCategoryChange(catId: string | number | null) {
    if (!catId) {
      this.especialidadOptionsFiltered = [];
      this.pwProf.get('specialties')?.setValue([]);
      return;
    }
  
    const catIdStr = String(catId);
  
    // lee del stream global
    this.global.especialidades$.subscribe((especialidades: any[]) => {
      this.especialidadOptionsFiltered = (especialidades ?? [])
        .filter((e: any) => String(e.fatherId) === catIdStr)
        .map((e: any) => ({ id: e.id, name: e.name, fatherId: e.fatherId }));
  
      // limpia selección anterior si no corresponde
      this.pwProf.get('specialties')?.setValue([]);
    });
  }
  


    goStep(n: 1 | 2 | 3) {
      // navegación libre por cabecera (bullets)
      this.proStep.set(n);
    }

  /* nextStep() {
    const s = this.proStep();
    if (s === 1 && this.pwPersonal.valid) this.proStep.set(2);
    else if (s === 2 && this.pwProf.valid) this.proStep.set(3);
    else (s === 1 ? this.pwPersonal : this.pwProf).markAllAsTouched();
  } */
    nextStep() {
      const s = this.proStep();
      if (s === 1 && this.pwPersonal.valid) this.proStep.set(2);
      else if (s === 2 && this.pwProf.valid) {
        // puedes llamar finishOnboardingSimple() directamente aquí si gustas
        this.finishOnboardingSimple();
      } else (s === 1 ? this.pwPersonal : this.pwProf).markAllAsTouched();
    }

  prevStep() {
    const s = this.proStep();
    if (s > 1) this.proStep.set((s - 1) as 1 | 2 | 3);
  }

  // Uploads (conecta tus adapters y pasa la URL/ID)
  onIdUploaded(url: string) { this.pwPersonal.get('idDocumentUrl')?.setValue(url); }
  onAvatarUploaded(url: string) { this.pwPersonal.get('avatarUrl')?.setValue(url); }
  onCertUploaded(url: string) {
    const arr = (this.pwProf.get('certificatesUrls')?.value ?? []) as string[];
    this.pwProf.get('certificatesUrls')?.setValue([...arr, url]);
  }


  async finishOnboarding() {
    this.errorMsg.set(null);
  
    if (!this.pwPersonal.valid) { this.pwPersonal.markAllAsTouched(); this.proStep.set(1); return; }
    if (!this.pwProf.valid)     { this.pwProf.markAllAsTouched();   this.proStep.set(2); return; }
  
    const username = (this.form.get('username')?.value ?? '').toString().trim();
    const email    = (this.form.get('email')?.value ?? '').toString().trim();
    const password = (this.form.get('password')?.value ?? '').toString().trim();
  
    if (!username || username.length < 3) { this.form.get('username')?.markAsTouched(); this.proStep.set(1); Swal.fire('Usuario inválido','Mínimo 3','warning'); return; }
    if (!email)                           { this.form.get('email')?.markAsTouched();    this.proStep.set(1); Swal.fire('Correo requerido','','warning'); return; }
    if (!password || password.length < 6) { this.form.get('password')?.markAsTouched(); this.proStep.set(1); Swal.fire('Contraseña inválida','Mínimo 6','warning'); return; }
  
    const personal = this.pwPersonal.value as any;
    const prof     = this.pwProf.value as any;
  
    const specialistPayload = {
      userId: '',
      full_name: personal.full_name,
      email,
      phone: personal.phone || '',
      address: personal.address || '',
      consultationAddress: personal.consultationAddress || '',
      city: personal.city || '',
      country: personal.country,
      gender: personal.gender,
      profession: prof.profession,
      studyArea: prof.studyArea,
      university: prof.university,
      graduationYear: Number(prof.graduationYear) || null,
      // 🔻 omitidos temporalmente
      category: null,
      specialties: [],
      documents: [],
      certificates: [],
      images: [],
      status: 'pending_review',
      membership: 'Unlimited Plan',
      advertiseProfile: true,
      advertisePlatform: false,
    };
  
    this.loading.set(true);
    try {
      const res = await this.auth.createProfessionalAndSpecialist(
        email, password, username,
        (userId: string) => ({ ...specialistPayload, userId })
      );
  
      const user = res.user;
      const specialist = res.specialist;
  
      localStorage.setItem('isLoggedin', 'true');
      localStorage.setItem('userId', user.id);
      localStorage.setItem('type', JSON.stringify('profesional'));
      localStorage.setItem('user', JSON.stringify({
        id: user.id, email, username, type: 'profesional', full_name: personal.full_name
      }));
      localStorage.setItem('profile', JSON.stringify(specialist || {}));
  
      this.global.previewRequest = { ...(specialist || {}), type: 'profesional', usertype: 'profesional' };
  
      Swal.fire('¡Registro exitoso!', 'Tu cuenta de profesional ha sido creada.', 'success');
      this.global.setRouterActive('dashboardProfesional/profile');
    } catch (e: any) {
      console.error('finishOnboarding ERROR', e);
      const msg = e?.response?.message || e?.message || 'No se pudo registrar el profesional.';
      const fields = e?.response?.data ? JSON.stringify(e.response.data) : '';
      Swal.fire('Error', `${msg}${fields ? ' → ' + fields : ''}`, 'error');
    } finally {
      this.loading.set(false);
    }
  }
  
  

showToast(opts: { level?: 'success'|'info'|'warn'|'error'; message: string; targetId?: string; autoHideMs?: number }) {
  const { level = 'info', message, targetId, autoHideMs = 3000 } = opts;

  // Enfocar/scroll al target si lo hay
  if (targetId) {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('toast-target-highlight');
      setTimeout(() => el.classList.remove('toast-target-highlight'), 1800);
      (el as HTMLElement).focus?.();
    }
  }

  // Mostrar toast
  this.toast.set({ level, message, targetId });
  this.toastVisible.set(true);

  clearTimeout(this.toastTimer);
  this.toastTimer = setTimeout(() => this.toastVisible.set(false), autoHideMs);
}

hideToast() {
  this.toastVisible.set(false);
  clearTimeout(this.toastTimer);
}
// En tu componente:
registerHeroImage(): string {
  if (this.isProfessional()) {
    return 'assets/img/profesionales.png';
  }
  return 'assets/img/pacientes.png';
}
async finishOnboardingSimple() {
  console.log('[finishOnboardingSimple] start');

  if (!this.pwPersonal.valid) { 
    this.pwPersonal.markAllAsTouched(); 
    this.proStep.set(1); 
    Swal.fire('Faltan datos', 'Completa la información personal (Paso 1).', 'warning');
    console.warn('[finishOnboardingSimple] Paso 1 inválido', this.pwPersonal.value, this.pwPersonal.errors);
    return; 
  }
  if (!this.pwProf.valid) {     
    this.pwProf.markAllAsTouched();   
    this.proStep.set(2); 
    Swal.fire('Faltan datos', 'Completa la información profesional (Paso 2).', 'warning');
    console.warn('[finishOnboardingSimple] Paso 2 inválido', this.pwProf.value, this.pwProf.errors);
    return; 
  }

  const username = (this.form.get('username')?.value ?? '').toString().trim();
  const email    = (this.form.get('email')?.value ?? '').toString().trim();
  const password = (this.form.get('password')?.value ?? '').toString().trim();

  if (!username || username.length < 3) { 
    this.form.get('username')?.markAsTouched(); 
    Swal.fire('Usuario inválido', 'Mínimo 3 caracteres.', 'warning');
    return; 
  }
  if (!email) { 
    this.form.get('email')?.markAsTouched(); 
    Swal.fire('Correo requerido', 'Ingresa un correo válido.', 'warning');
    return; 
  }
  if (!password || password.length < 6) { 
    this.form.get('password')?.markAsTouched(); 
    Swal.fire('Contraseña inválida', 'Mínimo 6 caracteres.', 'warning');
    return; 
  }

  const personal = this.pwPersonal.value as any;
  const prof     = this.pwProf.value as any;

  const specialistPayload = {
    userId: '',
    full_name: personal.full_name,
    email,
    phone: personal.phone || '',
    address: personal.address || '',
    consultationAddress: personal.consultationAddress || '',
    city: personal.city,
    country: personal.country,
    gender: personal.gender,
    profession: prof.profession,
    studyArea: prof.studyArea,
    university: prof.university,
    graduationYear: Number(prof.graduationYear) || null,
    category: null,
    specialties: [],
    documents: [],
    certificates: [],
    images: [],
    status: 'pending_review',
    membership: 'Unlimited Plan',
    advertiseProfile: true,
    advertisePlatform: false,
  };

  this.loading.set(true);
  console.log('[finishOnboardingSimple] payload listo', { email, username, specialistPayload });

  try {
    const res = await this.auth.createProfessionalAndSpecialist(
      email, password, username,
      (userId: string) => ({ ...specialistPayload, userId })
    );

    console.log('[finishOnboardingSimple] backend OK', res);

    const user = (res as any)?.user;
    const specialist = (res as any)?.specialist;

    if (!user?.id) {
      throw new Error('Backend no retornó user.id');
    }

    localStorage.setItem('isLoggedin', 'true');
    localStorage.setItem('userId', user.id);
    localStorage.setItem('type', 'profesional'); // usa ES en todo lado o cambia a EN en todo lado
    localStorage.setItem('user', JSON.stringify({
      id: user.id, email, username, type: 'profesional', full_name: personal.full_name
    }));
    localStorage.setItem('profile', JSON.stringify(specialist || {}));

    this.global.previewRequest = { ...(specialist || {}), type: 'profesional', usertype: 'profesional' };

    Swal.fire('¡Registro exitoso!', 'Tu cuenta de profesional ha sido creada.', 'success');
    this.global.setRouterActive('profile'); // o 'dashboard'
  } catch (e: any) {
    console.error('[finishOnboardingSimple] ERROR', e);
    const msg = e?.response?.message || e?.message || 'No se pudo registrar el profesional.';
    const fields = e?.response?.data ? JSON.stringify(e.response.data) : '';
    Swal.fire('Error', `${msg}${fields ? ' → ' + fields : ''}`, 'error');
  } finally {
    this.loading.set(false);
  }
}




}
