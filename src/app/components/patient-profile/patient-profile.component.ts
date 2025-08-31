import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import PocketBase from 'pocketbase';
import { GlobalService } from '../../services/global.service';
import { AuthPocketbaseService } from '../../services/AuthPocketbase.service';
import { AMERICAS, CountryAmericas } from '../../constants/americas.constants'
@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './patient-profile.component.html',
  styleUrls: ['./patient-profile.component.css']
})
export class PatientProfileComponent implements OnInit {

  // UI state
  editMode = false;
  saving = false;
  activeTab: 'perfil' | 'agenda' | 'resenas' | 'servicios' = 'perfil';

  // Data
  profileForm!: FormGroup;
  traveler: any | null = null;

  // Países/ciudades
  americasCountries: CountryAmericas[] = AMERICAS;
  citiesOptions: string[] = [];

  // (opcional) acceso rápido: mapa code -> CountryAmericas
  private countryMap: Record<string, CountryAmericas> =
    Object.fromEntries(AMERICAS.map(c => [c.code, c]));
    avatarUrl: string = 'assets/img/avatar/avatar_29.png'; // default fallback
  constructor(
    public global: GlobalService,
    private fb: FormBuilder,
    public auth: AuthPocketbaseService
  ) {}



ngOnInit(): void {
  this.buildForm();

  // 1) Carga algo inicial (global o LS)
  const fromGlobal = this.global.clientFicha ?? null;
  const fromLS = !fromGlobal ? this.safeParse(localStorage.getItem('profile')) : null;
  this.traveler = fromGlobal || fromLS || null;

  // 2) Intenta garantizar el record real con id (colección camiwaTravelers)
  this.ensureTravelerRecord()  // 👈 importante
    .then(() => {
      if (this.traveler) {
        this.patchFromTraveler();
        this.loadCitiesForSelectedCountry();
        this.updateAvatarUrl();
      }
    })
    .catch(err => console.error('[ensureTravelerRecord] error', err));

  // suscripción (una sola vez)
  this.profileForm.get('country')!.valueChanges.subscribe((code: string) => {
    this.loadCitiesForSelectedCountry();
    this.autofillDialForPhone(code);
  });
}

/** Devuelve URL pública o fallback */
private updateAvatarUrl() {
  const pb = this.auth.pb; // 👈
  if (this.traveler?.avatar) {
    this.avatarUrl = pb.getFileUrl(this.traveler, this.traveler.avatar);
  } else {
    this.avatarUrl = 'assets/img/avatar/avatar_29.png';
  }
}

/** Simula click al input file */
triggerAvatarInput() {
  const input = document.getElementById('avatarInput') as HTMLInputElement;
  input?.click();
}

/** Subida de avatar */
async onAvatarChange(ev: Event) {
  const input = ev.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  // Asegura que tenemos el record e ID
  await this.ensureTravelerRecord();

  if (!this.traveler?.id) {
    alert('No se encontró el perfil del paciente (sin id).');
    input.value = '';
    return;
  }

  const file = input.files[0];
  const pb = this.auth.pb; 

  try {
    const formData = new FormData();
    formData.append('avatar', file); // campo file en tu colección

    const updated = await pb.collection('camiwaTravelers').update(this.traveler.id, formData);

    // refresca memoria
    this.traveler = updated;
    this.global.clientFicha = updated;
    localStorage.setItem('profile', JSON.stringify(updated));

    this.updateAvatarUrl();
    alert('Foto actualizada con éxito ✅');
  } catch (err: any) {
    console.error(err);
    // mensaje útil si el problema es permisos
    if (err?.status === 401 || err?.status === 403) {
      alert('No autorizado para actualizar el avatar. Revisa las reglas de acceso o la sesión.');
    } else {
      alert('Error al actualizar la foto ❌');
    }
  } finally {
    input.value = '';
  }
}

private async ensureTravelerRecord(): Promise<void> {
  // Si ya hay id, estamos OK
  if (this.traveler?.id) return;

  const pb = this.auth.pb; // 👈 usa SIEMPRE el PB del servicio auth

  // 1) intenta desde global (a veces llega sin id); si hay "id", listo
  if (this.global.clientFicha?.id) {
    this.traveler = this.global.clientFicha;
    return;
  }

  // 2) intenta recuperar perfil normalizado del servicio
  const profile = this.auth.getCurrentProfile?.() || {};
  if (profile?.id) {
    // A veces el perfil YA es el record real (con id de camiwaTravelers)
    this.traveler = profile;
    this.global.clientFicha = profile;
    localStorage.setItem('profile', JSON.stringify(profile));
    return;
  }

  // 3) como fallback, busca en camiwaTravelers por relación con el usuario auth
  const user = this.auth.getCurrentUser?.();
  if (user?.id) {
    try {
      // Ajusta el filtro al campo real que use tu colección (ej. user, owner, authUser, etc.)
      const rec = await pb.collection('camiwaTravelers')
        .getFirstListItem(`user="${user.id}"`);
      this.traveler = rec;
      this.global.clientFicha = rec;
      localStorage.setItem('profile', JSON.stringify(rec));
      return;
    } catch (e) {
      console.warn('No se pudo resolver camiwaTravelers por user.id', e);
    }
  }

}


  /** Autocompletar prefijo de teléfono según país (opcional) */
  private autofillDialForPhone(code: string) {
    const dial = this.countryMap[code]?.dial;
    if (!dial) return;
    const phoneCtrl = this.profileForm.get('phone')!;
    const val = (phoneCtrl.value as string || '').trim();

    // Si está vacío o ya era otro prefijo simple, setea el nuevo
    if (!val || /^\+[\d-]+$/.test(val)) {
      phoneCtrl.setValue(dial);
      phoneCtrl.markAsDirty();
    }
  }
  private safeParse(json: string | null) {
    try { return json ? JSON.parse(json) : null; } catch { return null; }
  }
  /** Validador de ciudad que exige que pertenezca al país seleccionado */
  private cityBelongsToCountry(): ValidatorFn {
    return (group: AbstractControl) => {
      const country = group.get('country')?.value as string;
      const city = (group.get('city')?.value as string || '').trim();
      if (!country || !city) return null; // required lo manejan los validators del control
      const list = this.countryMap[country]?.cities ?? [];
      return list.includes(city) ? null : { cityNotInCountry: true };
    };
  }
  /** Cargar ciudades del país seleccionado al array para el select */
  private loadCitiesForSelectedCountry() {
    const code = this.profileForm.get('country')?.value as string;
    this.citiesOptions = this.countryMap[code]?.cities ?? [];
    // Si la ciudad actual no está en la nueva lista, resetéala
    const currentCity = this.profileForm.get('city')?.value;
    if (!this.citiesOptions.includes(currentCity)) {
      this.profileForm.get('city')?.reset('');
    }
  }
   private buildForm() {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.maxLength(60)]],
      lastname: ['', [Validators.maxLength(60)]],

      // Teléfono: permite +, dígitos, espacios y guiones, mínimo 6 caracteres "reales"
      phone: ['', [Validators.pattern(/^[\d\s()+-]{6,}$/)]],

      // País / Ciudad: requeridos
      country: ['', [Validators.required]],
      city: ['', [Validators.required]],

      birthdate: [null],
      weightKg: [null],
      heightCm: [null],
      bodyType: [''],
      isHypertensive: [false],
      isDiabetic: [false],
      otherConditions: [''],
      hasDrugAllergy: [false],
      drugAllergyDetail: [''],
    }, {
      // validador a nivel form para que "city ∈ country.cities"
      validators: [this.cityBelongsToCountry()]
    });
  }

  /** Normaliza Date/ISO -> 'YYYY-MM-DD' para <input type="date"> */
  private toDateInput(d?: string | Date | null): string | null {
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    // forzamos a UTC para evitar desfases de TZ
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  private patchFromTraveler() {
    const t = this.traveler;
    if (!t) return;

    this.profileForm.patchValue({
      fullName: t.fullName ?? t.name ?? '',
      lastname: t.lastname ?? '',
      city: t.city ?? '',
      country: t.country ?? '',
      phone: t.phone ?? '',
      birthdate: this.toDateInput(t.birthdate),
      weightKg: t.weightKg ?? null,
      heightCm: t.heightCm ?? null,
      bodyType: t.bodyType ?? '',
      isHypertensive: !!t.isHypertensive,
      isDiabetic: !!t.isDiabetic,
      otherConditions: t.otherConditions ?? '',
      hasDrugAllergy: !!t.hasDrugAllergy,
      drugAllergyDetail: t.drugAllergyDetail ?? '',
    });
  }

  toggleEdit() {
    this.editMode = !this.editMode;
    if (this.editMode && (this.traveler || this.global.clientFicha)) {
      // refresca traveler desde global por si cambió
      this.traveler = this.global.clientFicha ?? this.traveler;
      this.patchFromTraveler();
    }
  }

  // Edad (simple) a partir del valor actual del form
  get age(): number | null {
    const bd = this.profileForm?.get('birthdate')?.value;
    if (!bd) return null;
    const birth = new Date(bd);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 && age < 140 ? age : null;
  }

  get bmi(): number | null {
    const w = Number(this.profileForm?.get('weightKg')?.value);
    const h = Number(this.profileForm?.get('heightCm')?.value) / 100;
    if (!w || !h) return null;
    const bmi = w / (h * h);
    return Math.round(bmi * 10) / 10;
  }

  async onSaveProfile() {
    if (!this.traveler?.id) {
      alert('No se encontró el perfil del paciente.');
      return;
    }
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const v = this.profileForm.value;

    // Mapea 1:1 a tu colección camiwaTravelers
    const payload = {
      fullName: (v.fullName ?? '').trim(),
      lastname: (v.lastname ?? '').trim(),
      city: (v.city ?? '').trim(),
      country: (v.country ?? '').trim(),
      phone: (v.phone ?? '').trim(),
      // guarda en ISO si tu backend lo espera en ISO; si lo guardas como string YYYY-MM-DD, déjalo así:
      birthdate: v.birthdate ?? null,
      weightKg: v.weightKg != null ? Number(v.weightKg) : null,
      heightCm: v.heightCm != null ? Number(v.heightCm) : null,
      bodyType: v.bodyType ?? '',
      isHypertensive: !!v.isHypertensive,
      isDiabetic: !!v.isDiabetic,
      otherConditions: (v.otherConditions ?? '').trim(),
      hasDrugAllergy: !!v.hasDrugAllergy,
      drugAllergyDetail: v.hasDrugAllergy ? (v.drugAllergyDetail ?? '').trim() : '',
    };

    try {
      // Usa tu servicio centralizado
      await this.auth.updateTravelerField(this.traveler.id, payload);

      // Refresca memoria
      this.traveler = { ...this.traveler, ...payload };
      this.global.clientFicha = this.traveler;
      localStorage.setItem('profile', JSON.stringify(this.traveler));

      this.toggleEdit();
      alert('Perfil actualizado con éxito ✅');
    } catch (e) {
      console.error(e);
      alert('No se pudo actualizar el perfil ❌');
    } finally {
      this.saving = false;
    }
  }

  setTab(tab: typeof this.activeTab) {
    this.activeTab = tab;
  }
  
}
