import PocketBase from 'pocketbase';
import { Injectable, Inject, PLATFORM_ID, Renderer2, model } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GlobalService } from './global.service';
import { Observable, from, tap, map, of, BehaviorSubject } from 'rxjs';
import { UserInterface } from '../interfaces/user-interface';
import { RecordModel } from 'pocketbase';
@Injectable({ providedIn: 'root' })
export class AuthPocketbaseService {
public pb: PocketBase;
public currentUser: any; 
public profile: any = null;
private userSubject = new BehaviorSubject<any | null>(null);
user$ = this.userSubject.asObservable();

private profileSubject = new BehaviorSubject<any | null>(null);
profile$ = this.profileSubject.asObservable();

private isLoggedInSubject = new BehaviorSubject<boolean>(false);
isLoggedIn$ = this.isLoggedInSubject.asObservable();

constructor(public global: GlobalService) {
  this.pb = new PocketBase('https://db.camiwa.com:250');

  // Escucha cambios del authStore
  this.pb.authStore.onChange((token, model) => {
    if (token && model) {
      localStorage.setItem('accessToken', token);
      localStorage.setItem('record', JSON.stringify(model));
      // intenta normalizar user desde el model
      const u = this.normalizeUserFromModel(model);
      if (u) {
        localStorage.setItem('user', JSON.stringify(u));
        localStorage.setItem('userId', u.id);
        localStorage.setItem('type', JSON.stringify(u.type));
        this.userSubject.next(u);
      }
      this.isLoggedInSubject.next(true);
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('record');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      localStorage.removeItem('type');
      localStorage.removeItem('profile');
      this.userSubject.next(null);
      this.profileSubject.next(null);
      this.isLoggedInSubject.next(false);
    }
  });

  // intenta restaurar al construir
  this.restoreSession();
}

/** Normaliza un user desde el record de PB */
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

/** Getter sync (evita `localStorage` en componentes) */
getCurrentUser(): any {
  const u = this.userSubject.value;
  if (u) return u;

  // fallback desde localStorage
  const ls = localStorage.getItem('user');
  if (ls) {
    try {
      const parsed = JSON.parse(ls);
      this.userSubject.next(parsed);
      this.isLoggedInSubject.next(true);
      return parsed;
    } catch {}
  }

  // fallback desde authStore.model
  const m = this.pb.authStore.model as any;
  const norm = this.normalizeUserFromModel(m);
  if (norm) {
    this.userSubject.next(norm);
    this.isLoggedInSubject.next(true);
    return norm;
  }
  return null;
}

getCurrentProfile(): any {
  return this.profileSubject.value || JSON.parse(localStorage.getItem('profile') || 'null');
}

isAuthenticated(): boolean {
  return this.isLoggedInSubject.value;
}
setUser(user: UserInterface): void {
  let user_string = JSON.stringify(user);
  let type = JSON.stringify(user.type);
  localStorage.setItem("currentUser", user_string);
  localStorage.setItem("type", type);
}
loginUser(email: string, password: string): Observable<any> {
  return from(this.pb.collection('users').authWithPassword(email, password));
}
/** Login */
/* loginUser(email: string, password: string): Observable<any> {
  return from(this.pb.collection('users').authWithPassword(email, password)).pipe(
    map((authData) => {
      const pbUser = authData.record;
      const userTypeRaw = pbUser['type'];
      const userType = Array.isArray(userTypeRaw) ? userTypeRaw[0] : userTypeRaw;

      const user = {
        id: pbUser.id,
        email: pbUser.email,
        full_name: pbUser.name,
        username: pbUser.username,
        name: pbUser.name,
        type: userType
      };
      return { ...authData, user };
    }),
    tap(async (authData) => {
      const { user, token, record } = authData;

      // guarda en authStore (dispara onChange arriba)
      await this.pb.realtime.unsubscribe();
      this.pb.authStore.clear();
      this.pb.authStore.save(token, record);

      // guarda explícitamente (aunque onChange ya lo hace)
      localStorage.setItem('accessToken', token);
      localStorage.setItem('record', JSON.stringify(record));
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userId', user.id);
      localStorage.setItem('type', JSON.stringify(user.type));

      this.userSubject.next(user);
      this.isLoggedInSubject.next(true);

      // carga perfil
      await this.loadProfileFromBackend();
    })
  );
} */

/** Carga perfil según tipo actual */
async loadProfileFromBackend() {
  const u = this.getCurrentUser();
  if (!u?.id) return;

  const coll = u.type === 'profesional' ? 'camiwaSpecialists' : 'camiwaTravelers';
  try {
    const profile = await this.pb.collection(coll).getFirstListItem(`userId="${u.id}"`);
    this.profileSubject.next(profile);
    localStorage.setItem('profile', JSON.stringify(profile));
  } catch (e) {
    console.warn('No se pudo cargar el perfil:', e);
  }
}
/* createProfessionalAndSpecialist(
  email: string,
  password: string,
  username: string,
  specialistDataBuilder: (userId: string) => any
): Observable<any> {
  const userData = {
    email,
    password,
    passwordConfirm: password,
    type: 'professional',
    username,
    name: username
  };

  return from(
    this.pb.collection('users').create(userData).then(async (user) => {
      const specialistPayload = specialistDataBuilder(user.id);
      const specialist = await this.pb.collection('camiwaSpecialists').create(specialistPayload);
      return { user, specialist };
    })
  );
} */
async saveSpecialist(specialistData: any): Promise<any> {
  try {
    const record = await this.pb.collection('camiwaSpecialists').create(specialistData);
    console.log('Especialista guardado exitosamente:', record);
    return record;
  } catch (error) {
    console.error('Error al guardar el especialista:', error);
    throw error;
  }
}
/** Restore */
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
          this.userSubject.next(norm);
        }
      } else {
        this.userSubject.next(JSON.parse(user));
      }
      this.isLoggedInSubject.next(true);

      await this.loadProfileFromBackend();
    } else {
      this.isLoggedInSubject.next(false);
    }
  } catch (e) {
    console.warn('No se pudo restaurar la sesión:', e);
    this.isLoggedInSubject.next(false);
  }
}

/** Logout */
async logoutUser(): Promise<void> {
  await this.pb.realtime.unsubscribe();
  this.pb.authStore.clear();
  localStorage.clear();

  this.userSubject.next(null);
  this.profileSubject.next(null);
  this.isLoggedInSubject.next(false);

  this.global.setRouterActive('login');
}
async permision() {
  const isValid = await new Promise<boolean>(r=>{
    const check = () => this.pb.authStore.isValid ? r(true) : setTimeout(check, 50);
    check();
  });
  if (!isValid) { this.global.setRouterActive('home'); return; }

  const user = this.getCurrentUser();
  if (user?.type === 'profesional') {
    this.global.setRouterActive('dashboardProfesional/profile');
    // toast de bienvenida dirigido
    // this.showToast({ level:'success', message:'¡Bienvenido/a profesional!', targetId:'profile-header' });
  } else if (user?.type === 'paciente') {
    this.global.setRouterActive('patient-profile');
    // this.showToast({ level:'success', message:'¡Bienvenido/a paciente!', targetId:'patient-welcome' });
  } else {
    this.global.setRouterActive('home');
  }
}
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
        username: fullName || email,       // asegúrate que username sea único
        name: fullName || '',              // si tu schema de users tiene "name"
        emailVisibility: true,
        type: 'paciente',                    // si usas este campo en users
      });

      // 2) Autologin (necesario si las create rules exigen auth)
      await this.pb.collection('users').authWithPassword(email, password);

      // 3) Crear traveler (⚠️ usa los NOMBRES reales del schema)
      const traveler = await this.pb.collection('camiwaTravelers').create({
        userId: user.id,
        full_name: fullName,                // si existe en schema
        name: fullName,                      // nuevo campo para nombre
        username: fullName.replace(/\s+/g, '_').toLowerCase(), // opcional
        email,
        lastname,
        status: 'active',
        images: [],
        documents: [],
      });
      

      // 4) Guardar sesión y perfil
      const token = this.pb.authStore.token;
      const record = this.pb.authStore.model;
      localStorage.setItem('accessToken', token);
      localStorage.setItem('record', JSON.stringify(record));
      localStorage.setItem('userId', user.id);
      localStorage.setItem('user', JSON.stringify({
        id: user.id,
        email,
        username: user['username'],
        type: 'paciente',
        full_name: fullName,
        lastname:lastname
      }));
      localStorage.setItem('type', JSON.stringify('paciente'));
      localStorage.setItem('profile', JSON.stringify(traveler));
      localStorage.setItem('isLoggedin', 'true');

      this.currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      this.profile = traveler;

      return { user, traveler, token };
    } catch (e: any) {
      // Saca el mensaje real de PocketBase
      const detail = e?.response?.message || e?.message || 'Failed to create record.';
      const fields = e?.response?.data ? JSON.stringify(e.response.data) : '';
      throw new Error(`${detail}${fields ? ' → ' + fields : ''}`);
    }
  })());
}
async createProfessionalAndSpecialist(
  email: string,
  password: string,
  buildSpecialist: (userId: string) => any,
  opts?: { name?: string; username?: string }      // ⬅️ NUEVO
): Promise<{ user: any; specialist: any; token: string }> {
  let user: any | null = null;
  try {
    const username = (opts?.username && opts.username.trim()) || email.split('@')[0];
    const name     = (opts?.name && opts.name.trim()) || username;

    // 1) Crear user con name y username IGUALES al full name
    user = await this.pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      type: 'profesional',
      emailVisibility: true,
      name,                   // ⬅️ mismo full name
      username,               // ⬅️ mismo slug
    });

    // 2) Autologin
    await this.pb.collection('users').authWithPassword(email, password);
    const token  = this.pb.authStore.token;
    const record = this.pb.authStore.model;

    // 3) Specialist
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

    const specialist = await this.pb.collection('camiwaSpecialists').create(specialistPayload);

    localStorage.setItem('accessToken', token);
    localStorage.setItem('record', JSON.stringify(record));

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
async updateTravelerField(travelerId: string, updateData: any): Promise<void> {
  await this.pb.collection('camiwaTravelers').update(travelerId, updateData);
}
}