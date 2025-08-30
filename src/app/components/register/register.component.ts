  import { Component, computed, signal } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { ReactiveFormsModule, FormsModule, FormGroup, FormArray, FormControl, Validators, FormBuilder } from '@angular/forms';
  import { NgMultiSelectDropDownModule, IDropdownSettings } from 'ng-multiselect-dropdown';
  import { GlobalService } from '../../services/global.service';
  import { AuthPocketbaseService } from '../../services/AuthPocketbase.service';
  import { firstValueFrom } from 'rxjs';
  import { EmailService } from '../../services/email.service';
  import Swal from 'sweetalert2';
  import { AbstractControl, ValidatorFn } from '@angular/forms';
  import { AMERICAS, CountryAmericas } from '../../constants/americas.constants';
  import { FilePickerModule } from 'ngx-awesome-uploader';
import { UploaderCaptions } from 'ngx-awesome-uploader';
import { BrowserModule } from '@angular/platform-browser';
import { DemoFilePickerAdapter } from '../../file-picker.adapter';
import { CertificatesAdapter } from '../../certificates.adapter';
import { AvatarAdapter } from '../../avatar.adapter';
import { HttpClient } from '@angular/common/http';
import { PocketbaseUploadAdapter } from '../../adapters/pb-upload.adapter';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
    type Rol = 'patient' | 'profesional';
    // register.component.ts (fuera de la clase)
interface RegisterFormDataModel {
  userId: string;
  images: string[];
  documents: string[];
  avatar: string[];
  certificates: string[];
  full_name: string;
  email: string;
  phone: string;
  address: string;
  consultationAddress: string;
  city: string;
  country: string;
  gender: string;
  profession: string;
  studyArea: string;
  university: string;
  graduationYear: string | number | null;
  especialidades: any[]; // según lo que entregue ng-multiselect
  category: any;         // idem
  services: string;
  availability: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  days: boolean[];
  membershipPlan: string;
  advertiseServices: string[];
  schedule: string;
  status: string;
  membership: string;
  advertiseProfile: boolean;
  advertisePlatform: boolean;
}

  @Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, NgMultiSelectDropDownModule, 
      FilePickerModule ],
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.css'] // <-- corregido
  })
  export class RegisterComponent {
    categoriesOptions$!: Observable<Array<{ id: string; name: string }>>;
especialidadOptionsFiltered$!: Observable<Array<{ id: string; name: string; fatherId: string }>>;
    adapter!: DemoFilePickerAdapter;
  adapterAvatar!: AvatarAdapter;
  
    toast = signal<{ level: 'success'|'info'|'warn'|'error'; message: string; targetId?: string }|null>(null);
  toastVisible = signal(false);
  americasCountries: CountryAmericas[] = AMERICAS;

  citiesOptions: string[] = [];
  
  totalSteps = 2;

  // define progressPct UNA sola vez, usando totalSteps
  progressPct = computed(() => ((this.proStep() - 1) / (this.totalSteps - 1)) * 100);
  // …
  private toastTimer: any = null;
    // --- Estado base registro ---
    rol = signal<Rol>('patient');
    form!: FormGroup; // <-- declara, no inicialices aquí
    isProfessional = computed(() => this.rol() === 'profesional');
    isPatient = computed(() => this.rol() === 'patient');

    // --- Wizard profesional ---
    showProWizard = signal(false);
    proStep = signal<1 | 2 | 3>(1);
    // catálogos demo
    categories = [
      { item_id: 1, item_text: 'Medicina General' },
      { item_id: 2, item_text: 'Odontología' },
      { item_id: 3, item_text: 'Fisioterapia' },
    ];

    captionsSpecialties = {
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      remove: 'Eliminar',
      upload: 'Subir',
    };
  
formDataModel: RegisterFormDataModel = {
  userId: '',
  images: [],
  documents: [],
  avatar: [],
  certificates: [],
  full_name: '',
  email: '',
  phone: '',
  address: '',
  consultationAddress: '',
  city: '',
  country: '',
  gender: '',
  profession: '',
  studyArea: '',
  university: '',
  graduationYear: '',
  especialidades: [],
  category: null,
  services: '',
  availability: '',
  monday: true,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
  days: Array(7).fill(true),
  membershipPlan: '',
  advertiseServices: [],
  schedule: '',
  status: '',
  membership: 'Unlimited Plan',
  advertiseProfile: true,
  advertisePlatform: false,
};

  /* adapter = new DemoFilePickerAdapter(this.http, this.global);
  adapterCertificates = new CertificatesAdapter(this.http, this.global);
  adapterAvatar = new AvatarAdapter(this.http, this.global); */
  adapterIdentity!: PocketbaseUploadAdapter;  
  adapterCertificates!: PocketbaseUploadAdapter; 
  dropdownSettings: IDropdownSettings = {
    singleSelection: false,
    idField: 'id',
    textField: 'name',
    selectAllText: 'Seleccionar todos',
    unSelectAllText: 'Deseleccionar todos',
    itemsShowLimit: 3,
    allowSearchFilter: true,
  };
    specialtiesFiltered: Array<{ item_id: number; item_text: string }> = [];
    public captions: UploaderCaptions = {
      dropzone: {
        title: '10 MB máx.',
        or: '.',
        browse: 'Subir documento',
      },
      cropper: {
        crop: 'Cortar',
        cancel: 'Cancelar',
      },
      previewCard: {
        remove: 'Borrar',
        uploadError: 'error',
      },
    };
    public captionsCertificates: UploaderCaptions = {
      dropzone: {
        title: '10 MB máx.',
        or: '.',
        browse: 'Subir certificado',
      },
      cropper: {
        crop: 'Cortar',
        cancel: 'Cancelar',
      },
      previewCard: {
        remove: 'Borrar',
        uploadError: 'error',
      },
    };
  
    public captionsAvatar: UploaderCaptions = {
      dropzone: {
        title: 'Foto de perfil.',
        or: '.',
        browse: 'Subir Fotografía',
      },
      cropper: {
        crop: 'Cortar',
        cancel: 'Cancelar',
      },
      previewCard: {
        remove: 'Borrar',
        uploadError: 'error',
      },
    };
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
      itemsShowLimit: 5
    };
    
    showPassword = false;
    showConfirm  = false;  
  categoriesOptions: Array<{ id: string; name: string }> = [];
  especialidadOptionsFiltered: Array<{ id: string; name: string; fatherId: string }> = [];
  loading = signal(false);
  errorMsg = signal<string | null>(null);
    constructor(
      public global: GlobalService,
      private fb: FormBuilder,
      public auth: AuthPocketbaseService,
      public emailService: EmailService,
      private http: HttpClient,                ) 
      {
        this.adapter            = new DemoFilePickerAdapter(this.http, this.global);
        this.adapterCertificates = new PocketbaseUploadAdapter(this.global, {
          purpose: 'certificate',
          onSaved: (url: string) => {
            const arr = (this.pwProf.get('certificatesUrls')?.value ?? []) as string[];
            this.pwProf.get('certificatesUrls')?.setValue([...arr, url]);
          }
        });
    
        this.adapterAvatar      = new AvatarAdapter(this.http, this.global);
    
      // Form de registro base
      this.form = this.fb.group({
        role: ['patient' as Rol, Validators.required],
        terms: [false, Validators.requiredTrue],
      
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        passwordConfirm: ['', [Validators.required, Validators.minLength(6)]],
      
        patient: this.fb.group({
          fullName: ['', [Validators.required, Validators.minLength(3)]],
          lastname: ['', [Validators.required, Validators.minLength(3)]],
        })
      }, { validators: this.passwordsMatchValidator() });
      

      // Validador inicial por rol
      this.setRole('patient');

      // Form del wizard profesional
          
      // === REEMPLAZA la definición del proWizard por esta (solo el grupo professional cambia) ===
  this.proWizard = this.fb.group({
    personal: this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      lastname:['', [Validators.required, Validators.minLength(2)]], // ← requerido
      phone: [''],
      address: [''],
      consultationAddress: [''],
      phoneCode:   ['', Validators.required],
      phoneLocal:  ['', [Validators.required, Validators.minLength(6)]],
      country: ['', Validators.required],
      city:    ['', Validators.required],
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

// ✅ Adapter para CERTIFICADOS -> guarda arreglo de URLs en pwProf.certificatesUrls
this.adapterCertificates = new PocketbaseUploadAdapter(this.global, {
  purpose: 'certificate',
  onSaved: (url) => {
    const arr = (this.pwProf.get('certificatesUrls')?.value ?? []) as string[];
    this.pwProf.get('certificatesUrls')?.setValue([...arr, url]);
  }
});

// ✅ Adapter para DOC. IDENTIDAD -> guarda string en pwPersonal.idDocumentUrl
this.adapterIdentity = new PocketbaseUploadAdapter(this.global, {
  purpose: 'identity',
  onSaved: (url) => this.pwPersonal.get('idDocumentUrl')?.setValue(url)
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
      this.categoriesOptions$ = this.global.categorias$.pipe(
        map(cats => (cats ?? []).map((c: any) => ({ id: String(c.id), name: c.name })))
      );
    
      // filtra especialidades reactivamente cuando cambie la categoría seleccionada (vía form/ngModel)
      this.especialidadOptionsFiltered$ = this.global.especialidades$.pipe(
        map((especialidades: any[]) => {
          const sel = this.formDataModel.category; // ngModel (singleSelection = true)
          const selectedId = sel?.id ? String(sel.id) : null;
          if (!selectedId) return [];
          return (especialidades ?? [])
            .filter((e: any) => String(e.fatherId) === selectedId)
            .map((e: any) => ({ id: String(e.id), name: e.name, fatherId: String(e.fatherId) }));
        })
      );
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
      const defaultCode = 'CO';
    const co = this.americasCountries.find((c: CountryAmericas) => c.code === defaultCode); // ✅ evita TS7006
    if (co) {
      this.pwPersonal.get('country')?.setValue(co.code, { emitEvent: false });
      this.pwPersonal.get('phoneCode')?.setValue(co.dial, { emitEvent: false });
      this.citiesOptions = co.cities;
    }

    this.pwPersonal.get('country')?.valueChanges.subscribe((iso2: string) => {
      this.onCountryChange(iso2);
    });
    
    }
    onCategoryChanged(): void {
      const id = this.formDataModel?.category?.id ?? null;
      this.onCategoryChange(id);
    }
    
    onCountryChange(iso2: string) {
      const found = this.americasCountries.find(c => c.code === iso2);
      this.citiesOptions = found?.cities ?? [];
      if (found) {
        this.pwPersonal.get('phoneCode')?.setValue(found.dial);
        if (!this.citiesOptions.includes(this.pwPersonal.get('city')?.value)) {
          this.pwPersonal.get('city')?.setValue('');
        }
      }
    }
    
    
    
    // Ensambla el teléfono completo para guardar
    private getFullPhone(): string {
      const code = (this.pwPersonal.get('phoneCode')?.value || '').toString().trim();
      const local = (this.pwPersonal.get('phoneLocal')?.value || '').toString().trim().replace(/\s+/g, '');
      return `${code}${local}`;
    }
    
    togglePassword(): void {
      this.showPassword = !this.showPassword;
    }
    passwordsMatchValidator(): ValidatorFn {
      return (group: AbstractControl) => {
        const pass = group.get('password')?.value;
        const rep  = group.get('passwordConfirm')?.value;
        if (!pass || !rep) return null;
        return pass === rep ? null : { passwordMismatch: true };
      };
    }
    
    submit() {
      const basic = ['email', 'password', 'passwordConfirm', 'terms'];
      basic.forEach(n => this.form.get(n)?.markAsTouched());
      const basicValid = basic.every(n => this.form.get(n)?.valid);
      if (!basicValid) return;
    
      const role = this.rol();
    
      // ⚡ Validación común de términos
      if (!this.form.get('terms')?.value) {
        this.showToast({ level: 'warn', message: 'Debes aceptar los términos.', targetId: 'terms' });
        return;
      }
    
      if (role === 'profesional') {
        // si todo está OK (incluido terms), recién mostramos el wizard
        this.showProWizard.set(true);
        this.proStep.set(1);
        return;
      }
    
      // Paciente
      const patientFG = this.form.get('patient') as FormGroup;
      patientFG.markAllAsTouched();
    
      if (patientFG.invalid) {
        this.showToast({ level: 'warn', message: 'Revisa los datos de paciente.' });
        return;
      }
    
      this.submitPatient();
    }
    
      private async submitPatient() {
        this.errorMsg.set(null);
        this.loading.set(true);
      
        try {
          const email      = (this.form.get('email')?.value ?? '').trim();
          const password   = (this.form.get('password')?.value ?? '').trim();
          const passwordConfirm = (this.form.get('passwordConfirm')?.value ?? '').trim();
          const fullName   = (this.form.get('patient.fullName')?.value ?? '').trim();
          const lastname   = (this.form.get('patient.lastname')?.value ?? '').trim();
          
          if (!email) { Swal.fire('Error', 'Correo requerido.', 'error'); return; }
          if (password.length < 6) { Swal.fire('Error', 'Contraseña mínima 6 caracteres.', 'error'); return; }
          if (password !== passwordConfirm) { Swal.fire('Error', 'Las contraseñas no coinciden.', 'error'); return; }
      
          // 👇 Generamos username automáticamente a partir de fullName
          const username = fullName.toLowerCase().replace(/\s+/g, '_');
      
          await firstValueFrom(
            this.auth.registerTravelerAndLogin(
              email,
              password,
              fullName,   // 3er arg: fullName
              lastname    // 4to arg opcional
            )
          );
      
        /*  await this.emailService.sendWelcome({
            toEmail: email,
            toName: fullName,
            userType: 'paciente',
            params: { username: fullName }
          }); */
      
          Swal.fire('¡Registro exitoso!', 'Tu cuenta ha sido creada.', 'success');
          setTimeout(() => this.auth.permision(), 400);
      
        } catch (e: any) {
          console.error('submitPatient error:', e);
          Swal.fire('Error', e?.message || 'Ocurrió un error al registrar el paciente.', 'error');
        } finally {
          this.loading.set(false);
        }
      }
      async finishOnboarding() {
        this.errorMsg.set(null);
      
        // Reglas del wizard
        if (!this.pwPersonal.valid) { this.pwPersonal.markAllAsTouched(); this.proStep.set(1); return; }
        if (!this.pwProf.valid)     { this.pwProf.markAllAsTouched();   this.proStep.set(2); return; }
      
        // Términos obligatorios
        if (!this.form.get('terms')?.value) {
          Swal.fire('Error', 'Debes aceptar los términos y condiciones.', 'error');
          return;
        }
      
        // Campos base
        const email    = (this.form.get('email')?.value ?? '').toString().trim();
        const password = (this.form.get('password')?.value ?? '').toString().trim();
        const passConf = (this.form.get('passwordConfirm')?.value ?? '').toString().trim();
      
        if (!email)                         { this.form.get('email')?.markAsTouched();    this.proStep.set(1); Swal.fire('Correo requerido','','warning'); return; }
        if (!password || password.length<6) { this.form.get('password')?.markAsTouched(); this.proStep.set(1); Swal.fire('Contraseña inválida','Mínimo 6','warning'); return; }
        if (password !== passConf)          { this.form.get('passwordConfirm')?.markAsTouched(); this.proStep.set(1); Swal.fire('Las contraseñas no coinciden','','warning'); return; }
      
        const personal = this.pwPersonal.value as any;
        const prof     = this.pwProf.value as any;
        
      
        // (Opcional) username interno si tu backend lo requiere
        const fullNameJoin =
  `${(personal.full_name || '').trim()} ${(personal.lastname || '').trim()}`
    .replace(/\s+/g, ' ')
    .trim();

// username tipo slug: sin acentos, minúsculas y con _
const usernameSlug = fullNameJoin
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // quita acentos
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')                       // todo lo no [a-z0-9] -> _
  .replace(/^_+|_+$/g, '');  
      
  const specialistPayload = {
    userId: '',
    full_name: fullNameJoin,                 // <-- MISMO full name
    email,
    phone: this.getFullPhone(),              // usa el ensamble de phoneCode+phoneLocal
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
    status: 'pending_review',
    membership: 'Unlimited Plan',
    advertiseProfile: true,
    advertisePlatform: false,
    documents: personal.idDocumentUrl ? [personal.idDocumentUrl] : [],   // 👈 doc identidad
    certificates: Array.isArray(prof.certificatesUrls) ? prof.certificatesUrls : [], // 👈 certificados
    images: [],
  };
      
        this.loading.set(true);
        try {
          const res = await this.auth.createProfessionalAndSpecialist(
            email,
            password,
            (userId: string) => ({ ...specialistPayload, userId }),
            { name: fullNameJoin, username: usernameSlug }      // ⬅️ NUEVO
          );
          
          // Guarda en localStorage el mismo full name
          const user = (res as any)?.user;
          const specialist = (res as any)?.specialist;
          
          localStorage.setItem('isLoggedin', 'true');
          localStorage.setItem('userId', user.id);
          localStorage.setItem('type', 'profesional');
          localStorage.setItem('user', JSON.stringify({
            id: user.id,
            email,
            type: 'profesional',
            full_name: fullNameJoin,           // ⬅️ MISMO nombre en cache local
            username: usernameSlug
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
      async finishOnboardingSimple() {
        if (!this.pwPersonal.valid) { 
          this.pwPersonal.markAllAsTouched();
          this.proStep.set(1);
          Swal.fire('Faltan datos', 'Completa la información personal (Paso 1).', 'warning');
          return; 
        }
        if (!this.pwProf.valid) {     
          this.pwProf.markAllAsTouched();
          this.proStep.set(2);
          Swal.fire('Faltan datos', 'Completa la información profesional (Paso 2).', 'warning');
          return; 
        }
      
        if (!this.form.get('terms')?.value) {
          Swal.fire('Error', 'Debes aceptar los términos y condiciones.', 'error');
          return;
        }
      
        const email    = (this.form.get('email')?.value ?? '').toString().trim();
        const password = (this.form.get('password')?.value ?? '').toString().trim();
        const passConf = (this.form.get('passwordConfirm')?.value ?? '').toString().trim();
      
        if (!email) { this.form.get('email')?.markAsTouched(); Swal.fire('Correo requerido', 'Ingresa un correo válido.', 'warning'); return; }
        if (!password || password.length < 6) { this.form.get('password')?.markAsTouched(); Swal.fire('Contraseña inválida', 'Mínimo 6 caracteres.', 'warning'); return; }
        if (password !== passConf) { this.form.get('passwordConfirm')?.markAsTouched(); Swal.fire('Las contraseñas no coinciden', '', 'warning'); return; }
      
        const personal = this.pwPersonal.value as any;
        const prof     = this.pwProf.value as any;
      
        const derivedUsername =
          (personal.full_name ? personal.full_name : email.split('@')[0])
            .toString()
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
      
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
          username: derivedUsername
        };
      
        this.loading.set(true);
        try {
          const res = await this.auth.createProfessionalAndSpecialist(
            email,
            password,
            (userId: string) => ({ ...specialistPayload, userId })
          );
      
          const user = (res as any)?.user;
          const specialist = (res as any)?.specialist;
      
          if (!user?.id) throw new Error('Backend no retornó user.id');
      
          localStorage.setItem('isLoggedin', 'true');
          localStorage.setItem('userId', user.id);
          localStorage.setItem('type', 'profesional');
          localStorage.setItem('user', JSON.stringify({
            id: user.id,
            email,
            type: 'profesional',
            full_name: personal.full_name
          }));
          localStorage.setItem('profile', JSON.stringify(specialist || {}));
      
          this.global.previewRequest = { ...(specialist || {}), type: 'profesional', usertype: 'profesional' };
      
          Swal.fire('¡Registro exitoso!', 'Tu cuenta de profesional ha sido creada.', 'success');
          this.global.setRouterActive('profile');
        } catch (e: any) {
          console.error('[finishOnboardingSimple] ERROR', e);
          const msg = e?.response?.message || e?.message || 'No se pudo registrar el profesional.';
          const fields = e?.response?.data ? JSON.stringify(e.response.data) : '';
          Swal.fire('Error', `${msg}${fields ? ' → ' + fields : ''}`, 'error');
        } finally {
          this.loading.set(false);
        }
      }
      
      setRole(r: Rol) {
        this.rol.set(r);
        this.form.get('role')?.setValue(r);
      
        const pat = this.form.get('patient') as FormGroup;
      
        if (r === 'profesional') {
          // Limpia validaciones de paciente, pero NO toques 'terms'
          pat.reset({ fullName: '', lastname: '' }, { emitEvent: false });
          pat.get('fullName')?.clearValidators();
          pat.get('lastname')?.clearValidators();
          pat.updateValueAndValidity({ emitEvent: false });
      
          this.showProWizard.set(false);
          this.proStep.set(1);
        } else {
          // paciente
          pat.get('fullName')?.setValidators([Validators.required, Validators.minLength(3)]);
          pat.get('lastname')?.setValidators([Validators.required, Validators.minLength(3)]);
          pat.updateValueAndValidity({ emitEvent: false });
      
          this.showProWizard.set(false);
        }
      
        // terms requerido para ambos
        this.form.get('terms')?.setValidators([Validators.requiredTrue]);
        this.form.get('terms')?.updateValueAndValidity({ emitEvent: false });
      
        this.form.markAsPristine();
        this.form.markAsUntouched();
      }
      
    
      
    // --- Wizard: navegación y validación ---
    onCategoryChange(catId: string | number | null) {
      this.global.categorySelected = !!this.formDataModel.category;
      if (!catId) {
        this.especialidadOptionsFiltered = [];
        this.pwProf.get('specialties')?.setValue([]);
        return;
        this.formDataModel.especialidades = [];
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
      const curr = this.proStep();
      if (n < curr) { this.proStep.set(n); return; } // siempre permitir ir atrás
      // Para adelantar: valida el paso actual
      if (curr === 1 && this.pwPersonal.valid) this.proStep.set(2);
      // Si hubiera paso 3, valida pwProf para pasar a 3
    }
    
    nextStep() {
      const s = this.proStep();
      if (s === 1) {
        if (this.pwPersonal.valid) this.proStep.set(2);
        else this.pwPersonal.markAllAsTouched();
      } else if (s === 2) {
        if (this.pwProf.valid) this.finishOnboardingSimple();
        else this.pwProf.markAllAsTouched();
      }
    }
    
    
    prevStep() {
      const s = this.proStep();
      if (s > 1) this.proStep.set((s - 1) as 1 | 2 | 3);
    }
    

    /* nextStep() {
      const s = this.proStep();
      if (s === 1 && this.pwPersonal.valid) this.proStep.set(2);
      else if (s === 2 && this.pwProf.valid) this.proStep.set(3);
      else (s === 1 ? this.pwPersonal : this.pwProf).markAllAsTouched();
    } */
      /* nextStep() {
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
    } */

    // Uploads (conecta tus adapters y pasa la URL/ID)
    onIdUploaded(url: string) { this.pwPersonal.get('idDocumentUrl')?.setValue(url); }
    onAvatarUploaded(url: string) { this.pwPersonal.get('avatarUrl')?.setValue(url); }
    onCertUploaded(url: string) {
      const arr = (this.pwProf.get('certificatesUrls')?.value ?? []) as string[];
      this.pwProf.get('certificatesUrls')?.setValue([...arr, url]);
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
  
  




  }
