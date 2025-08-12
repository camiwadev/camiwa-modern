import { Component, computed, signal } from '@angular/core';
import { GlobalService } from '../../services/global.service';
import { CommonModule } from '@angular/common';
import {
  FormGroup, FormArray, FormControl, Validators,
  ReactiveFormsModule, FormBuilder
} from '@angular/forms';

type Rol = 'patient' | 'professional';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'] // <-- corregido
})
export class RegisterComponent {
  // --- Estado base registro ---
  rol = signal<Rol>('patient');
  form!: FormGroup; // <-- declara, no inicialices aquí
  isProfessional = computed(() => this.rol() === 'professional');
  isPatient = computed(() => this.rol() === 'patient');

  // --- Wizard profesional ---
  showProWizard = signal(false);
  proStep = signal<1 | 2 | 3>(1);
  progressPct = computed(() => ((this.proStep() - 1) / 2) * 100);

  // catálogos demo
  categories = [
    { item_id: 1, item_text: 'Medicina General' },
    { item_id: 2, item_text: 'Odontología' },
    { item_id: 3, item_text: 'Fisioterapia' },
  ];
  specialtiesByCategory: Record<number, Array<{ item_id: number; item_text: string }>> = {
    1: [{ item_id: 101, item_text: 'Urgencias' }, { item_id: 102, item_text: 'Medicina Familiar' }],
    2: [{ item_id: 201, item_text: 'Ortodoncia' }, { item_id: 202, item_text: 'Periodoncia' }],
    3: [{ item_id: 301, item_text: 'Deportiva' }, { item_id: 302, item_text: 'Neurológica' }],
  };
  specialtiesFiltered: Array<{ item_id: number; item_text: string }> = [];

  proWizard!: FormGroup; // <-- declara, no inicialices aquí

  constructor(
    public global: GlobalService,
    private fb: FormBuilder // <-- puede ser private; no afecta el template
  ) {
    // ===== Inicializa AQUÍ (ya tienes fb disponible) =====

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
        fullName: [''],
        phone: ['']
      })
    });

    // Validador inicial por rol
    this.setRole('patient');

    // Form del wizard profesional
    this.proWizard = this.fb.group({
      personal: this.fb.group({
        full_name: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        phone: [''],
        address: [''],
        consultationAddress: [''],
        city: [''],
        country: ['', Validators.required],
        gender: ['Male', Validators.required],
        idDocumentUrl: [''],
        avatarUrl: [''],
      }),

      professional: this.fb.group({
        profession: ['', [Validators.required, Validators.minLength(3)]],
        studyArea: ['', [Validators.required, Validators.minLength(3)]],
        university: ['', [Validators.required, Validators.minLength(3)]],
        graduationYear: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
        category: [null, Validators.required],
        specialties: [[] as number[]],
        certificatesUrls: [[] as string[]],
      }),

      laboral: this.fb.group({
        // 7 días no–nulos
        days: this.fb.array<FormControl<boolean>>(
          Array.from({ length: 7 }, () => this.fb.control(false, { nonNullable: true }))
        ),
      }),
    });

    // Reacciona al cambio de categoría para filtrar especialidades
    this.pwProf.get('category')!.valueChanges.subscribe((catId: number | null) => {
      this.onCategoryChange(catId);
    });
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

  // --- Lógica de registro base ---
  submit() {
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
  }
  
  setRole(r: Rol) {
    this.rol.set(r);
    this.form.get('role')?.setValue(r);
  
    const prof = this.form.get('professional') as FormGroup;
    const pat  = this.form.get('patient') as FormGroup;
  
    if (r === 'professional') {
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
  onCategoryChange(catId: number | null) {
    this.specialtiesFiltered = catId ? (this.specialtiesByCategory[catId] ?? []) : [];
    this.pwProf.get('specialties')?.setValue([]);
  }

 /*  goStep(n: 1 | 2 | 3) {
    if (n === 1) { this.proStep.set(1); return; }
    if (n === 2 && this.pwPersonal.valid) { this.proStep.set(2); return; }
    if (n === 3 && this.pwPersonal.valid && this.pwProf.valid) { this.proStep.set(3); return; }
    if (n === 2) this.pwPersonal.markAllAsTouched();
    if (n === 3) { this.pwPersonal.markAllAsTouched(); this.pwProf.markAllAsTouched(); }
  } */
    goStep(n: 1 | 2 | 3) {
      // navegación libre por cabecera (bullets)
      this.proStep.set(n);
    }

  nextStep() {
    const s = this.proStep();
    if (s === 1 && this.pwPersonal.valid) this.proStep.set(2);
    else if (s === 2 && this.pwProf.valid) this.proStep.set(3);
    else (s === 1 ? this.pwPersonal : this.pwProf).markAllAsTouched();
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

  finishOnboarding() {
    if (!this.anyDaySelected) {
      this.pwLaboral.markAllAsTouched();
      return;
    }
    // TODO: enviar proWizard.value al backend y poner status 'pending_review'
    // this.global.setRouterActive('/dashboard');
  }
}
