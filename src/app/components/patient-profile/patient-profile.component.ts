import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { GlobalService } from '../../services/global.service';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import PocketBase from 'pocketbase';
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
constructor (
  public global:GlobalService,
  private fb: FormBuilder
){this.editForm = this.fb.group({
  fullName: [''],
  lastname: [''],
  phone: [''],
  address: [''],
  images:['']
});
}

toggleEdit() {
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
}


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
}
