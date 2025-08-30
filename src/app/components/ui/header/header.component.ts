import { Component, HostListener, ElementRef,  ViewChild, Renderer2 } from '@angular/core';
import { GlobalService } from '../../../services/global.service';
import { CommonModule } from '@angular/common';
import { AuthPocketbaseService } from '../../../services/AuthPocketbase.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  userMenuOpen = false;
  theme: 'dark' | 'light' = 'dark';

  @ViewChild('userToggle', { static: false }) userToggle!: ElementRef;
  @ViewChild('userMenu',   { static: false }) userMenu!: ElementRef;

constructor(
  public global: GlobalService,
  public auth: AuthPocketbaseService,
  private renderer: Renderer2,
  private el: ElementRef,          
){
  
}

isLogged(): boolean {
  // chequea tanto el servicio como el localStorage
  const serviceAuth = this.auth.isAuthenticated?.() ?? false;
  const localAuth = localStorage.getItem('isLoggedin') === 'true';
  return serviceAuth && localAuth;
}


logout(ev?: Event) {
  ev?.preventDefault();
  this.auth.logoutUser();
  localStorage.removeItem('isLoggedin');  // 👈 limpia el flag
  this.userMenuOpen = false;
}


get userName(): string {
  const p = this.auth.getCurrentProfile();
  const u = this.auth.getCurrentUser();
  return p?.name || p?.fullName || u?.full_name || u?.name || u?.username || 'Usuario';
}

get userEmail(): string {
  const p = this.auth.getCurrentProfile();
  const u = this.auth.getCurrentUser();
  return p?.email || u?.email || '';
}


ngOnInit(): void {
  // 🔒 Restaura sesión si aplica (opcional si ya lo haces en AppComponent)
  this.auth.restoreSession?.();

  // 🌓 Aplica tema persistido (por defecto, dark)
  const saved = localStorage.getItem('theme');
  this.applyTheme(saved === 'light' ? 'light' : 'dark');
}

toggleUserMenu(ev: Event) {
  ev.preventDefault();
  ev.stopPropagation();
  this.userMenuOpen = !this.userMenuOpen;
  console.log('userMenuOpen:', this.userMenuOpen);
}

/** Cierra al clickear fuera */
@HostListener('document:click', ['$event'])
onDocClick(e: MouseEvent) {
  if (!this.el.nativeElement.contains(e.target)) {
    this.userMenuOpen = false;
  }
}

/** Cambiar tema desde el switch */
toggleTheme(ev: Event) {
  const checked = (ev.target as HTMLInputElement).checked;
  this.applyTheme(checked ? 'dark' : 'light');
}

/** Aplica y persiste el tema */
private applyTheme(theme: 'dark' | 'light') {
  this.theme = theme;

  // Limpia clases previas (ajusta si tu CSS usa 'cs-dark' u otro nombre)
  ['dark', 'light', 'cs-dark', 'cs-light'].forEach(c =>
    this.renderer.removeClass(document.body, c)
  );

  // Añade clase esperada por tu CSS. Si tu plantilla usa 'cs-dark', cambia aquí:
  this.renderer.addClass(document.body, theme === 'dark' ? 'cs-dark' : 'cs-light');
  localStorage.setItem('theme', theme);
}

/** Helpers para mostrar datos */
get displayName(): string {
  const u = this.auth.getCurrentUser();      // ya viene “normalizado”
  const p = this.auth.getCurrentProfile?.() || {};

  return (
    u?.full_name ||
    u?.name ||
    u?.username ||
    p?.fullName ||
    p?.name ||
    'Usuario'
  );
}



get walletLikeBalance(): string {
  // Muestra algo “placeholder” o tu propio dato real
  return '—';
}

get shortId(): string {
  const u = this.auth.getCurrentUser?.();
  const id = u?.id || '—';
  return id.length > 10 ? id.slice(0, 6) + '...' + id.slice(-3) : id;
}



private goToMyProfile() {
  // 1) toma el user
  const u = this.auth.getCurrentUser?.() || {};
  // 2) intenta también desde localStorage por si el servicio aún no pobló
  const lsType = localStorage.getItem('type') ?? ''; // podría venir con comillas
  // 3) normaliza: quita comillas y si es array toma el 1º
  const rawType = u?.type ?? lsType;
  const type = Array.isArray(rawType) ? rawType[0] : String(rawType).replace(/"/g, '');

  console.log('[Mi cuenta] type=', type, 'user=', u);

  if (type === 'profesional') {
    // tu “ruta virtual” para el perfil profesional es 'profile'
    this.global.setRouterActive('profile');
    return;
  }

  if (type === 'paciente') {
    this.global.setRouterActive('patient-profile');
    return;
  }

  if (type === 'admin') {
    this.global.setRouterActive('dashboard/admin');
    return;
  }

  // fallback
  this.global.setRouterActive('profile');
}
onAccountClick(ev?: Event) {
  ev?.preventDefault();
  const u = this.auth.getCurrentUser();
  const type = Array.isArray(u?.type) ? u.type?.[0] : u?.type;

  if (type === 'profesional') {
    this.global.setRouterActive('dashboardProfesional/profile');
  } else if (type === 'paciente') {
    this.global.setRouterActive('patient-profile');
  } else if (type === 'admin') {
    this.global.setRouterActive('dashboard/admin');
  } else {
    this.global.setRouterActive('profile');
  }
  this.userMenuOpen = false;
}

}
