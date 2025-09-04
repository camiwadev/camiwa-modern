// src/app/services/AuthPocketbase.service.ts
import PocketBase, { RecordModel } from 'pocketbase';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, tap } from 'rxjs';
import { GlobalService } from './global.service';
import { UserInterface } from '../interfaces/user-interface';

@Injectable({ providedIn: 'root' })
export class AuthPocketbaseService {
  // ---- PB client ----
  public pb: PocketBase;

  // ---- snapshots "legacy" (no las uses directamente en componentes) ----
  public currentUser: any = null;
  public profile: any = null;

  // ---- estado reactivo centralizado ----
  private userSubject = new BehaviorSubject<any | null>(null);
  user$ = this.userSubject.asObservable();

  private profileSubject = new BehaviorSubject<any | null>(null);
  profile$ = this.profileSubject.asObservable();

  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(public global: GlobalService) {
    this.pb = new PocketBase('https://db.camiwa.com:250');

    // Reacciona a cambios del authStore (login/logout/refresh)
    this.pb.authStore.onChange(async (token, model) => {
      if (token && model) {
        // Persistir token y record crudo
        localStorage.setItem('accessToken', token);
        localStorage.setItem('record', JSON.stringify(model));

        // Normalizar y persistir user
        const u = this.normalizeUserFromModel(model);
        if (u) {
          localStorage.setItem('user', JSON.stringify(u));
          localStorage.setItem('userId', u.id);
          localStorage.setItem('type', JSON.stringify(u.type));
          localStorage.setItem('isLoggedin', 'true');
          this.userSubject.next(u);
          this.isLoggedInSubject.next(true);
          this.currentUser = u;
        }

        // Prefetch perfil asociado
        await this.loadProfileFromBackend();

      } else {
        // Logout / invalidación
        localStorage.removeItem('accessToken');
        localStorage.removeItem('record');
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
        localStorage.removeItem('type');
        localStorage.removeItem('profile');
        localStorage.removeItem('isLoggedin');

        this.userSubject.next(null);
        this.profileSubject.next(null);
        this.isLoggedInSubject.next(false);

        this.currentUser = null;
        this.profile = null;

        // Limpia estado global visible en la UI
        this.global.clearAllAuthState?.();
      }
    });

    // Intento de restauración inmediata al construir
    this.restoreSession();
  }

  // ========= Helpers internos =========

  /** Normaliza un user desde el record de PocketBase */
  private normalizeUserFromModel(m: any | null) {
    if (!m) return null;
    const typeRaw = m.type;
    const type = Array.isArray(typeRaw) ? typeRaw[0] : typeRaw;
    return {
      id: m.id,
      email: m.email,
      username: m.username,
      full_name: m.name || m.username || '',
      name: m.name,
      type
    };
  }

  /** Sobrescribe perfil en subjects + localStorage + GlobalService */
  private setProfileEverywhere(profile: any | null) {
    this.profileSubject.next(profile);
    this.profile = profile;
    if (profile) {
      localStorage.setItem('profile', JSON.stringify(profile));
    } else {
      localStorage.removeItem('profile');
    }
    // Importante: que toda la app vea el perfil como "previewRequest" (tú ya lo usas)
    this.global.previewRequest = profile;
  }

  // ========= API pública (mantiene tus firmas) =========

  /** Getter sync para usar en componentes legacy */
  getCurrentUser(): any {
    const fromSubject = this.userSubject.value;
    if (fromSubject) return fromSubject;

    // fallback localStorage
    const ls = localStorage.getItem('user');
    if (ls) {
      try {
        const parsed = JSON.parse(ls);
        this.userSubject.next(parsed);
        this.isLoggedInSubject.next(true);
        this.currentUser = parsed;
        return parsed;
      } catch {}
    }

    // fallback desde authStore.model
    const m = this.pb.authStore.model as any;
    const norm = this.normalizeUserFromModel(m);
    if (norm) {
      this.userSubject.next(norm);
      this.isLoggedInSubject.next(true);
      this.currentUser = norm;
      return norm;
    }
    return null;
  }

  getCurrentProfile(): any {
    const p = this.profileSubject.value;
    if (p) return p;

    // fallback localStorage
    const ls = localStorage.getItem('profile');
    if (ls) {
      try {
        const parsed = JSON.parse(ls);
        this.setProfileEverywhere(parsed);
        return parsed;
      } catch {}
    }
    return null;
  }

  isAuthenticated(): boolean {
    // preferimos el store “vivo”; si no, devolvemos el snapshot Subject o flag localStorage
    return this.pb.authStore.isValid || this.isLoggedInSubject.value || localStorage.getItem('isLoggedin') === 'true';
  }

  /** Setter legacy que ya usabas */
  setUser(user: UserInterface): void {
    const user_string = JSON.stringify(user);
    const type = JSON.stringify(user.type);
    localStorage.setItem('currentUser', user_string);
    localStorage.setItem('type', type);
    // además, sincronizamos userSubject para consistencia
    try {
      const parsed = JSON.parse(user_string);
      this.userSubject.next(parsed);
      this.isLoggedInSubject.next(true);
      this.currentUser = parsed;
    } catch {}
  }

  /** Login (Observable) – mantiene tu firma pero asegura perfil/hidratación */
  loginUser(email: string, password: string): Observable<any> {
    return from(this.pb.collection('users').authWithPassword(email, password)).pipe(
      tap(async () => {
        // onChange ya persistió user; aquí aseguramos carga de perfil
        await this.loadProfileFromBackend();
      })
    );
  }

  /** Carga perfil según tipo actual y lo publica globalmente */
  async loadProfileFromBackend() {
    const u = this.getCurrentUser();
    if (!u?.id) {
      this.setProfileEverywhere(null);
      return;
    }

    const coll = u.type === 'profesional' ? 'camiwaSpecialists' : 'camiwaTravelers';
    try {
      const profile = await this.pb.collection(coll).getFirstListItem(`userId="${u.id}"`);
      this.setProfileEverywhere(profile);
    } catch (e) {
      // Puede que aún no exista perfil; setea null y no rompas el flujo
      this.setProfileEverywhere(null);
      // console.warn('No se pudo cargar el perfil:', e);
    }
  }

  /** Guardar specialist (mantengo tu firma) */
  async saveSpecialist(specialistData: any): Promise<any> {
    try {
      const record = await this.pb.collection('camiwaSpecialists').create(specialistData);
      // Al crear specialist por primera vez, propágalo
      await this.loadProfileFromBackend();
      return record;
    } catch (error) {
      console.error('Error al guardar el especialista:', error);
      throw error;
    }
  }

  /** Restaura sesión desde localStorage → authStore + estado */
  async restoreSession() {
    try {
      const token = localStorage.getItem('accessToken');
      const recordString = localStorage.getItem('record');

      if (token && recordString) {
        const record = JSON.parse(recordString);
        this.pb.authStore.save(token, record);

        // reconstruye user si falta
        let user = localStorage.getItem('user');
        if (!user) {
          const norm = this.normalizeUserFromModel(record);
          if (norm) {
            localStorage.setItem('user', JSON.stringify(norm));
            localStorage.setItem('userId', norm.id);
            localStorage.setItem('type', JSON.stringify(norm.type));
            localStorage.setItem('isLoggedin', 'true');
            this.userSubject.next(norm);
            this.currentUser = norm;
          }
        } else {
          const parsed = JSON.parse(user);
          this.userSubject.next(parsed);
          this.currentUser = parsed;
          localStorage.setItem('isLoggedin', 'true');
        }

        this.isLoggedInSubject.next(true);

        // rehidrata perfil
        const cachedProfile = localStorage.getItem('profile');
        if (cachedProfile) {
          try {
            this.setProfileEverywhere(JSON.parse(cachedProfile));
          } catch {
            await this.loadProfileFromBackend();
          }
        } else {
          await this.loadProfileFromBackend();
        }
      } else {
        this.isLoggedInSubject.next(false);
      }
    } catch (e) {
      console.warn('No se pudo restaurar la sesión:', e);
      this.isLoggedInSubject.next(false);
    }
  }

  /** Recomendado: llámalo en APP_INITIALIZER para refrescar token y estado */
  async bootstrap(): Promise<void> {
    if (!this.pb.authStore.isValid) {
      // ya restauramos arriba; si además dejaste snapshots, user$/profile$ ya están
      return;
    }
    try {
      // Refresca token/model y activa onChange si cambia algo
      await this.pb.collection('users').authRefresh();
      // Garantiza perfil (por si el refresh no lo disparó)
      await this.loadProfileFromBackend();
    } catch (e) {
      // Token inválido → logout limpio
      await this.logoutUser();
    }
  }

  /** Logout */
  async logoutUser(): Promise<void> {
    this.pb.authStore.clear();
    try { await this.pb.realtime.unsubscribe(); } catch {}
    localStorage.clear();

    this.userSubject.next(null);
    this.profileSubject.next(null);
    this.isLoggedInSubject.next(false);

    this.currentUser = null;
    this.profile = null;

    this.global.clearAllAuthState?.();
    this.global.setRouterActive?.('login');
  }

  /** Permisos/ruteo post-login (mantengo tu lógica) */
  async permision() {
    const isValid = await new Promise<boolean>(r => {
      const check = () => this.pb.authStore.isValid ? r(true) : setTimeout(check, 50);
      check();
    });
    if (!isValid) { this.global.setRouterActive('home'); return; }

    const user = this.getCurrentUser();
    if (user?.type === 'profesional') {
      this.global.setRouterActive('dashboardProfesional/profile');
    } else if (user?.type === 'paciente') {
      this.global.setRouterActive('patient-profile');
    } else {
      this.global.setRouterActive('home');
    }
  }

  /** Registro viajero + login (mantengo firma y persistencia) */
  registerTravelerAndLogin(
    email: string,
    password: string,
    fullName: string,
    lastname: string = '',
  ): Observable<any> {
    return from((async () => {
      try {
        // 1) Crear usuario
        const user = await this.pb.collection('users').create({
          email,
          password,
          passwordConfirm: password,
          username: fullName || email,
          name: fullName || '',
          emailVisibility: true,
          type: 'paciente',
        });

        // 2) Autologin
        await this.pb.collection('users').authWithPassword(email, password);

        // 3) Crear traveler
        const traveler = await this.pb.collection('camiwaTravelers').create({
          userId: user.id,
          full_name: fullName,
          name: fullName,
          username: (fullName || email).replace(/\s+/g, '_').toLowerCase(),
          email,
          lastname,
          status: 'active',
          images: [],
          documents: [],
        });

        // 4) Persistir sesión
        const token = this.pb.authStore.token;
        const record = this.pb.authStore.model;
        localStorage.setItem('accessToken', token);
        localStorage.setItem('record', JSON.stringify(record));
        localStorage.setItem('userId', user.id);

        const normUser = {
          id: user.id,
          email,
          username: user['username'],
          type: 'paciente',
          full_name: fullName,
          lastname
        };
        localStorage.setItem('user', JSON.stringify(normUser));
        localStorage.setItem('type', JSON.stringify('paciente'));
        localStorage.setItem('profile', JSON.stringify(traveler));
        localStorage.setItem('isLoggedin', 'true');

        // Propaga a subjects + global
        this.userSubject.next(normUser);
        this.isLoggedInSubject.next(true);
        this.currentUser = normUser;

        this.setProfileEverywhere(traveler);

        return { user, traveler, token };
      } catch (e: any) {
        const detail = e?.response?.message || e?.message || 'Failed to create record.';
        const fields = e?.response?.data ? JSON.stringify(e.response.data) : '';
        throw new Error(`${detail}${fields ? ' → ' + fields : ''}`);
      }
    })());
  }

  /** Registro pro + specialist (mantengo firma) */
  async createProfessionalAndSpecialist(
    email: string,
    password: string,
    buildSpecialist: (userId: string) => any,
    opts?: { name?: string; username?: string }
  ): Promise<{ user: any; specialist: any; token: string }> {
    let user: any | null = null;
    try {
      const username = (opts?.username && opts.username.trim()) || email.split('@')[0];
      const name     = (opts?.name && opts.name.trim()) || username;

      // 1) Crear user
      user = await this.pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        type: 'profesional',
        emailVisibility: true,
        name,
        username,
      });

      // 2) Autologin
      await this.pb.collection('users').authWithPassword(email, password);
      const token  = this.pb.authStore.token;
      const record = this.pb.authStore.model;

      // 3) Specialist payload
      const specialistPayload = buildSpecialist(user.id);

      if (typeof specialistPayload.graduationYear === 'string') {
        const n = Number(specialistPayload.graduationYear);
        specialistPayload.graduationYear = Number.isFinite(n) ? n : null;
      }
      if (specialistPayload.category && typeof specialistPayload.category === 'object') {
        specialistPayload.category = specialistPayload.category.id;
      }
      if (Array.isArray(specialistPayload.specialties)) {
        specialistPayload.specialties = specialistPayload.specialties.map((s: any) => typeof s === 'object' ? s.id : s);
      }

      // 4) Crear specialist
      const specialist = await this.pb.collection('camiwaSpecialists').create(specialistPayload);

      // Persistir sesión mínima (onChange también hace su parte)
      localStorage.setItem('accessToken', token);
      localStorage.setItem('record', JSON.stringify(record));

      // Publicar al resto de la app
      await this.loadProfileFromBackend();

      return { user, specialist, token };
    } catch (e: any) {
      if (user?.id) {
        try { await this.pb.collection('users').delete(user.id); } catch {}
      }
      const detail = e?.response?.message || e?.message || 'No se pudo registrar el profesional.';
      const fields = e?.response?.data ? JSON.stringify(e.response.data) : '';
      throw new Error(`${detail}${fields ? ' → ' + fields : ''}`);
    }
  }

  /** Update parcial de traveler (mantiene tu firma) */
  async updateTravelerField(travelerId: string, updateData: any): Promise<void> {
    await this.pb.collection('camiwaTravelers').update(travelerId, updateData);
    // si el usuario editó su propio perfil, refrescar cache local
    const curr = this.getCurrentProfile();
    if (curr?.id === travelerId) {
      const fresh = await this.pb.collection('camiwaTravelers').getOne(travelerId);
      this.setProfileEverywhere(fresh);
    }
  }
}
