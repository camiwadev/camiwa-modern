import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { GlobalService } from '../../services/global.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import PocketBase from 'pocketbase';
import { AuthPocketbaseService } from '../../services/AuthPocketbase.service';
@Component({
  selector: 'app-patient-profile',
  standalone:true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './patient-profile.component.html',
  styleUrl: './patient-profile.component.css'
})
export class PatientProfileComponent {
  pb = new PocketBase('https://db.camiwa.com:250');
  isEditing = false;
  editForm: FormGroup;
  activeTab: 'perfil' | 'agenda' | 'resenas' | 'servicios' = 'perfil';

  editMode = false;
  saving = false;

  profileForm!: FormGroup;
  traveler: any | null = null;
constructor (
  public global:GlobalService,
  private fb: FormBuilder,
  public auth: AuthPocketbaseService
){this.editForm = this.fb.group({
  fullName: [''],
  lastname: [''],
  phone: [''],
  address: [''],
  images:['']
});
}

/* toggleEdit() {
  this.isEditing = !this.isEditing;
  if (this.isEditing && this.global.clientFicha) {
    this.editForm.patchValue({
      fullName: this.global.clientFicha.fullName || '',
      lastname: this.global.clientFicha.lastname || '',
      phone: this.global.clientFicha.phone || '',
      address: this.global.clientFicha.address || '',
      username: this.global.clientFicha.images || '',
    });
  }
} */


async onUpdate() {
if (!this.global.clientFicha?.id) return;

try {
  const data = this.editForm.value;
  const updated = await this.pb.collection('camiwaTravelers').update(this.global.clientFicha.id, data);

  // Actualiza el global
  this.global.clientFicha = updated;

  this.isEditing = false;
  alert('Perfil actualizado con éxito ✅');
} catch (err) {
  console.error(err);
  alert('Error al actualizar el perfil ❌');
}
}

private buildForm() {
  this.profileForm = this.fb.group({
    fullName: ['', [Validators.maxLength(60)]],
    lastname: ['', [Validators.maxLength(60)]],
    city: ['', [Validators.maxLength(80)]],
    country: ['', [Validators.maxLength(80)]],
    phone: ['', [Validators.maxLength(40)]],
    birthdate: [null],                         // YYYY-MM-DD
    weightKg: [null],                          // number
    heightCm: [null],                          // number
    bodyType: [''],                             // delgado|normal|atlético|robusto…
    isHypertensive: [false],
    isDiabetic: [false],
    otherConditions: [''],
    hasDrugAllergy: [false],
    drugAllergyDetail: [''],
  });
}

private patchFromTraveler() {
  if (!this.traveler) return;
  this.profileForm.patchValue({
    fullName: this.traveler.fullName || this.traveler.name || '',
    lastName: this.traveler.lastName || '',
    city: this.traveler.city || '',
    country: this.traveler.country || '',
    phone: this.traveler.phone || '',
    birthdate: this.traveler.birthdate || null,
    weightKg: this.traveler.weightKg ?? null,
    heightCm: this.traveler.heightCm ?? null,
    bodyType: this.traveler.bodyType || '',
    isHypertensive: !!this.traveler.isHypertensive,
    isDiabetic: !!this.traveler.isDiabetic,
    otherConditions: this.traveler.otherConditions || '',
    hasDrugAllergy: !!this.traveler.hasDrugAllergy,
    drugAllergyDetail: this.traveler.drugAllergyDetail || '',
  });
}

toggleEdit() {
  this.editMode = !this.editMode;
  if (this.editMode) this.patchFromTraveler();
}

// Edad calculada en vivo desde birthdate
get age(): number | null {
  const bd = this.profileForm?.get('birthdate')?.value;
  if (!bd) return null;
  const birth = new Date(bd);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 && age < 140 ? age : null;
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

  // Mapeo directo a tu schema en camiwaTravelers
  const payload = {
    fullName: v.fullName?.trim() || '',
    lastName: v.lastName?.trim() || '',
    city: v.city?.trim() || '',
    country: v.country?.trim() || '',
    phone: v.phone?.trim() || '',
    birthdate: v.birthdate || null,      // formato YYYY-MM-DD
    weightKg: v.weightKg != null ? Number(v.weightKg) : null,
    heightCm: v.heightCm != null ? Number(v.heightCm) : null,
    bodyType: v.bodyType || '',
    isHypertensive: !!v.isHypertensive,
    isDiabetic: !!v.isDiabetic,
    otherConditions: v.otherConditions?.trim() || '',
    hasDrugAllergy: !!v.hasDrugAllergy,
    drugAllergyDetail: v.hasDrugAllergy ? (v.drugAllergyDetail?.trim() || '') : '',
  };

  try {
    await this.auth.updateTravelerField(this.traveler.id, payload);
    // refresca en memoria
    this.traveler = { ...this.traveler, ...payload };
    localStorage.setItem('profile', JSON.stringify(this.traveler));
    this.toggleEdit();
  } catch (e) {
    console.error(e);
    alert('No se pudo actualizar el perfil.');
  } finally {
    this.saving = false;
  }
}

// (opcional) BMI si te sirve mostrarlo
get bmi(): number | null {
  const w = this.profileForm?.get('weightKg')?.value;
  const h = this.profileForm?.get('heightCm')?.value;
  if (!w || !h) return null;
  const m = Number(h) / 100;
  if (!m || m <= 0) return null;
  const bmi = Number(w) / (m * m);
  return Math.round(bmi * 10) / 10;
}

setTab(tab: typeof this.activeTab) {
  this.activeTab = tab;
}

}
