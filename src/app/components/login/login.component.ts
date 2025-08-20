import { CommonModule } from '@angular/common';
import { Component, Renderer2 } from '@angular/core';
import { GlobalService } from '../../services/global.service';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import PocketBase from 'pocketbase';
import { PocketAuthService } from '../../services/pocket-auth.service';
import { ScriptService } from '../../services/script.services';
@Component({
  selector: 'app-login',
  standalone:true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  ngFormLogin!: FormGroup;
  submitted = false;
  loading = false;
  isError = false;
  serverMsg = 'Error en datos de acceso';
  constructor (
    public global: GlobalService,
    private renderer: Renderer2,
    public pocketAuthService: PocketAuthService,
    public script: ScriptService,
    public fb: FormBuilder
  ){}
  ngOnInit(): void {
    this.ngFormLogin = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [false]
    }, { updateOn: 'submit' });
  }

  get f(): { [key: string]: AbstractControl } {
    return this.ngFormLogin.controls;
  }

  private showTempError(msg?: string) {
    if (msg) this.serverMsg = msg;
    this.isError = true;
    setTimeout(() => (this.isError = false), 4000);
  }

  onLogin(): void {
    this.submitted = true;
    if (this.ngFormLogin.invalid || this.loading) return;

    this.loading = true;

    const { email, password } = this.ngFormLogin.value;

    this.pocketAuthService.loginUser(email, password).subscribe({
      next: (resp) => {
        // Persistimos usuario base
        this.pocketAuthService.setUser(resp.record);
        const { username, email, id, type } = resp.record;
        this.global.currentUser = { username, email, id, type };

        localStorage.setItem('type', type);
        localStorage.setItem('isLoggedin', 'true');

        // Preparar layout app interna
        this.renderer.setAttribute(document.body, 'class', 'fixed sidebar-mini sidebar-collapse');

        switch (type) {
          case 'admin':
            this.global.routerActive = 'dashboard/admin';
            break;

          case 'paciente':
            this.fetchTravelerData(id);
            break;

          case 'profesional':
            this.fetchSpecialistData(id);
            break;

          default:
            this.global.routerActive = 'home';
            break;
        }

        // refrescar ficha global
        this.global.ClientFicha();
      },
      error: (err) => {
        console.error('Login error', err);
        this.showTempError('Email o contraseña inválidos');
        this.loading = false;
      }
    });
  }

  /** Carga datos de especialista y enruta a dashboard */
  private fetchSpecialistData(userId: string): void {
    const pb = new PocketBase('https://db.camiwa.com:250');
    pb.collection('camiwaSpecialists')
      .getList(1, 1, { filter: `userId="${userId}"` })
      .then((res: any) => {
        const record = res.items?.[0];
        if (record) {
          localStorage.setItem('status', record.status);
          this.global.previewRequest = record;
          this.global.previewCard = record;

          // Mapeo de días laborables
          const daysMap = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
          this.global.workingDays = (record.days || [])
            .map((isOn: boolean, i: number) => (isOn ? daysMap[i] : null))
            .filter(Boolean) as string[];

          localStorage.setItem('currentUser', JSON.stringify(record));
          this.global.routerActive = 'dashboard/profile';
        } else {
          console.warn('Especialista sin perfil creado, redirigiendo a dashboard.');
          this.global.routerActive = 'dashboard/profile';
        }
      })
      .catch((e) => {
        console.error('Error especialistas', e);
        this.global.routerActive = 'home';
      })
      .finally(() => (this.loading = false));
  }

  /** Carga datos de viajero y enruta a mapwrapper / user-home */
  private fetchTravelerData(userId: string): void {
    const pb = new PocketBase('https://db.camiwa.com:250');
    this.loading = true;
  
    pb.collection('camiwaTravelers')
      .getList(1, 1, { filter: `userId="${userId}"` })
      .then((res: any) => {
        const record = res.items?.[0] ?? null;
  
        if (record) {
          localStorage.setItem('status', record.status ?? '');
          this.global.previewRequest = record;
          this.global.previewCard = record;
  
          // ✅ nombre de ruta correcto y usando el setter
          this.global.setRouterActive('patient-profile');
        } else {
          this.global.setRouterActive('home');
        }
      })
      .catch((e) => {
        console.error('Error travelers', e);
        this.global.setRouterActive('home');
      })
      .finally(() => (this.loading = false));
  }
  

}
