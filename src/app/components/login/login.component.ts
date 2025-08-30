import { CommonModule } from '@angular/common';
import { Component, Renderer2 } from '@angular/core';
import { GlobalService } from '../../services/global.service';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import PocketBase from 'pocketbase';
import { ScriptService } from '../../services/script.services';
import { AuthPocketbaseService } from '../../services/AuthPocketbase.service';
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
  showPassword = false;

  constructor (
    public global: GlobalService,
    private renderer: Renderer2,
    public auth: AuthPocketbaseService,
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

    this.auth.loginUser(email, password).subscribe({
      next: (resp) => {
        // Persistimos usuario base
        this.auth.setUser(resp.record);
        const { username, email, id, type } = resp.record;
        this.global.currentUser = { username, email, id, type };

        localStorage.setItem('type', type);
        localStorage.setItem('isLoggedin', 'true');

        // Preparar layout app interna
        ['fixed', 'sidebar-mini', 'sidebar-collapse'].forEach(c =>
          this.renderer.addClass(document.body, c)
        );
        
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
              localStorage.setItem('status', record.status ?? '');
              this.global.previewRequest = record;
              this.global.previewCard = record;
            
              const daysMap = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
              this.global.workingDays = (record.days || [])
                .map((isOn: boolean, i: number) => (isOn ? daysMap[i] : null))
                .filter(Boolean) as string[];
            
              localStorage.setItem('currentUser', JSON.stringify(record));
            
              // ✅ usa Router en lugar de GlobalService
              this.global.setRouterActive('dashboardProfesional/profile');
            } else {
              console.warn('Especialista sin perfil creado, redirigiendo a home.');
              this.global.setRouterActive('/home');
            }
            
          })
          .catch((e) => {
            console.error('Error especialistas', e);
            this.global.setRouterActive('home');
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
          localStorage.setItem('clientFicha', JSON.stringify(record)); // ✅ persistir
  
          // ✅ Asignar a la propiedad que usa el template
          this.global.clientFicha = record;
  
          this.global.previewRequest = record;
          this.global.previewCard = record;
          this.global.setRouterActive('patient-profile');
        } else {
          this.global.setRouterActive('home');
        }
      })
      .catch((e) => {
        console.error('Error paciente', e);
        this.global.setRouterActive('home');
      })
      .finally(() => (this.loading = false));
      
  }
  
      

}
