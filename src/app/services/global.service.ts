// src/app/services/global.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import PocketBase from 'pocketbase';
import { RealtimeCategoriasService } from './realtime-categorias.service';
import { Especialidad, RealtimeEspecialidadesService } from './realtime-especialidades.service';
import { Profesional, RealtimeProfesionalesService } from './realtime-profesionales.service';

const LS_USER = 'cw.user';
const LS_SPEC = 'cw.specialist';

interface especialidades {
  name: string;
  id: string;
  fatherId: string;
}
interface categoria {
  id: string;
}
interface profesional {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  address: string;
  advertisePlatform: boolean;
  advertiseProfile: boolean;
  advertiseServices: string[];
  availability: string;
  certificates: string[];
  city: string;
  consultationAddress: string;
  country: string;
  days: boolean[];
  email: string;
  friday: boolean;
  full_name: string;
  gender: string;
  graduationYear: string;
  membership: string;
  membershipPlan: string;
  monday: boolean;
  phone: string;
  profession: string;
  saturday: boolean;
  schedule: string;
  services: string;
  studyArea: string;
  sunday: boolean;
  thursday: boolean;
  tuesday: boolean;
  university: string;
  wednesday: boolean;
  documents: string[];
  status: 'pending' | 'active' | 'approved' | 'new';
  images: string[];
  especialidades: Especialidad[];
  avatar: string[];
  userId: string;
}

export interface PatientFicha {
  id: string;
  username?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  avatar?: string;
  fullName?: string;
  lastname?: string;
  images?: string;
  birthdate?: string;
  drugAllergyDetail?: string;
  weightKg?: string;
  heightCm?: string;
  bodyType?: string;
  isHypertensive?: string;
  isDiabetic?: string;
  otherConditions?: string;
  hasDrugAllergy?: string;
  city?: string;
  country?: string;
}

@Injectable({ providedIn: 'root' })
export class GlobalService {
  // ===== Estado UI / utilidades =====
  newImage = false;
  dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  daysMap  = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

  newUploaderImage = false;
  newUploaderAvatar = false;
  uploaderImages: string[] = [];
  certificates: string[] = [];
  avatar: string[] = [];

  public userId: string = '';
  routerActive: string = 'home';
  private _routerActive$ = new BehaviorSubject<string>('home');
  routerActive$ = this._routerActive$.asObservable();

  currentUser: any;
  pb = new PocketBase('https://db.camiwa.com:250');
  profesionales: any[] = [];

  // ===== Estado compartido (listas) =====
  public clientesSubject = new BehaviorSubject<any[]>([]);
  clientes$ = this.clientesSubject.asObservable();

  public categoriasSubject = new BehaviorSubject<any[]>([]);
  categorias$ = this.categoriasSubject.asObservable();

  public especialidadesSubject = new BehaviorSubject<any[]>([]);
  especialidades$ = this.especialidadesSubject.asObservable();

  public profesionalesSubject = new BehaviorSubject<any[]>([]);
  profesionales$ = this.profesionalesSubject.asObservable();

  workingDays: any[] = [];

  // ===== Auth & Perfil centralizados (¡nuevo!) =====
  private _user$ = new BehaviorSubject<any | null>(readLS(LS_USER));
  user$ = this._user$.asObservable();

  private _specialist$ = new BehaviorSubject<any | null>(readLS(LS_SPEC));
  specialist$ = this._specialist$.asObservable();

  // Tu “previewRequest” se alimenta del specialist
  previewRequest: {
    userId: string;
    id: string;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    saturday: boolean;
    friday: boolean;
    sunday: boolean;
    full_name: string;
    address: string;
    city: string;
    days: boolean[];
    country: string;
    email: string;
    phone: string;
    profession: string;
    studyArea: string;
    university: string;
    graduationYear: string;
    specialties: { id: string; name: string }[];
    certificates: string[];
    documents: string[];
    images: string[];
    advertisePlatform: boolean;
    advertiseProfile: boolean;
    advertiseServices: string[];
    availability: string;
    collectionId: string;
    collectionName: string;
    consultationAddress: string;
    created: string;
    gender: string;
    membership: string;
    membershipPlan: string;
    schedule: string;
    services: string;
    status: string;
    updated: string;
    avatar: string;
    password: string;
    type: string;
    usertype: string;
    biography: string;
  } = {
    userId: '',
    id: '',
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    saturday: false,
    friday: false,
    sunday: false,
    full_name: '',
    address: '',
    city: '',
    days: [],
    country: '',
    email: '',
    phone: '',
    profession: '',
    studyArea: '',
    university: '',
    graduationYear: '',
    specialties: [],
    certificates: [],
    documents: [],
    images: [],
    advertisePlatform: false,
    advertiseProfile: false,
    advertiseServices: [],
    availability: '',
    collectionId: '',
    collectionName: '',
    consultationAddress: '',
    created: '',
    gender: '',
    membership: '',
    membershipPlan: '',
    schedule: '',
    services: '',
    status: '',
    updated: '',
    avatar: '',
    password: '',
    type: '',
    usertype: '',
    biography: ''
  };

  previewCard: {
    ticketNumber: string;
    image: string;
    ticketsQuantity: number;
    ticketPrice: number;
    description: string;
    selected: { [key: number]: boolean };
    ticketNumbers: any;
  } = {
    ticketNumber: '',
    image: '',
    ticketsQuantity: 100,
    ticketPrice: 2,
    description: '',
    selected: { 8: true, 4: true, 9: true, 48: true },
    ticketNumbers: {},
  };

  categorySelected: any = false;
  specialtiesFilteredSelected = false;
  specialtiesFiltered: any[] = [];

  clientFicha: PatientFicha | null = null;

  constructor(
    public realtimeCategoriasService: RealtimeCategoriasService,
    public realtimeEspecialidadesService: RealtimeEspecialidadesService,
    public realtimeProfesionalesService: RealtimeProfesionalesService
  ) {
    // Sincroniza previewRequest si había specialist en LS
    const spec = this._specialist$.value;
    if (spec) this.previewRequest = { ...this.previewRequest, ...spec };
  }

  // ===== Navegación centralizada =====
  setRouterActive(route: string) {
    this.routerActive = route;       // compat con código existente
    this._routerActive$.next(route); // reactive para vistas
  }

  // ===== RT inicializaciones =====
  public async initCategoriasRealtime() {
    try {
      const result = await this.pb.collection('camiwaCategories').getFullList();
      const categoriasProcesadas = result.map((cat: any) => {
        let imagesArray: string[] = [];
        if (Array.isArray(cat.image)) imagesArray = cat.image;
        else {
          try { imagesArray = JSON.parse(cat.image); }
          catch { imagesArray = cat.image ? [cat.image] : []; }
        }
        return { ...cat, image: imagesArray };
      });
      this.categoriasSubject.next(categoriasProcesadas);
      this.subscribeRealtime('camiwaCategories', this.categoriasSubject);
    } catch (error) {
      console.error('Error loading categorias:', error);
      throw error;
    }
  }

  public async initEspecialidadesRealtime() {
    try {
      const result = await this.pb.collection('camiwaSpecialties').getFullList<Especialidad>(200, { sort: '-created' });
      this.especialidadesSubject.next(result);
      this.subscribeRealtime('camiwaSpecialties', this.especialidadesSubject);
    } catch (error) {
      console.error('Error loading especialidades:', error);
      throw error;
    }
  }

  public async initProfesionalesRealtime() {
    try {
      const result = await this.pb.collection('camiwaSpecialists').getFullList<Profesional>(200, { sort: '-created' });
      this.profesionalesSubject.next(result);
      this.subscribeRealtime('camiwaSpecialists', this.profesionalesSubject);
    } catch (error) {
      console.error('Error loading profesionales:', error);
      throw error;
    }
    this.subscribeRealtime('camiwaSpecialists', this.profesionalesSubject);
  }

  getSpecialties() { /* opcional: completa si necesitas */ }

  public subscribeRealtime(collection: string, subject: BehaviorSubject<any[]>) {
    this.pb.collection(collection).subscribe('*', (e: any) => {
      let current = subject.getValue();
      if (e.action === 'create') {
        current = [...current, e.record];
      } else if (e.action === 'update') {
        current = current.map((c: any) => (c.id === e.record.id ? e.record : c));
      } else if (e.action === 'delete') {
        current = current.filter((c: any) => c.id !== e.record.id);
      }
      subject.next(current);
    });
  }

  // ===== Cliente ficha (manteniendo tu API) =====
  ClientFicha(): void {
    const raw = localStorage.getItem('clientFicha');
    this.clientFicha = raw ? (JSON.parse(raw) as PatientFicha) : null;
  }

  // ===== Tipo de usuario (mantengo firma, devuelvo string crudo guardado) =====
  type(): string | null {
    const typeString = localStorage.getItem('type');
    return typeString ?? null;
  }

  // ===== Vista detalle profesional (mantengo tu lógica) =====
  viewDetail(profesional: any) {
    const daysMap = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const rawDays = Array.isArray(profesional?.days) ? profesional.days : [];
    this.workingDays = rawDays
      .map((isWorking: boolean, i: number) => (isWorking ? daysMap[i] : null))
      .filter((d: string | null): d is string => !!d);

    this.previewRequest = { ...profesional }; // clonar para evitar efectos colaterales
    this.setRouterActive('profesional-detail');
  }

  // ===== NUEVO: Estado de usuario y specialist centralizados =====

  /** Lee snapshot actual del usuario (o desde LS) */
  getUserSnapshot(): any | null {
    return this._user$.value ?? readLS(LS_USER);
  }

  /** Setter de usuario: emite y persiste */
  setUser(user: any | null) {
    this._user$.next(user);
    writeLS(LS_USER, user);
  }

  /** Lee snapshot del specialist (o desde LS) */
  getSpecialistSnapshot(): any | null {
    return this._specialist$.value ?? readLS(LS_SPEC);
  }

  /** Setter de specialist: emite, persiste y actualiza previewRequest */
  setSpecialist(specialist: any | null) {
    this._specialist$.next(specialist);
    writeLS(LS_SPEC, specialist);

    if (specialist) {
      this.previewRequest = { ...this.previewRequest, ...specialist };
    }
  }

  /** Limpia solo el specialist */
  clearSpecialist() {
    this._specialist$.next(null);
    localStorage.removeItem(LS_SPEC);
    // opcional: limpia previewRequest si quieres
    // this.previewRequest = { ...estadoInicialPreviewRequest };
  }

  /** Limpia TODO el estado auth (usado por AuthPocketbaseService.logoutUser) */
  clearAllAuthState() {
    this._user$.next(null);
    this._specialist$.next(null);
    localStorage.removeItem(LS_USER);
    localStorage.removeItem(LS_SPEC);
  }
}

// ===== Helpers locales =====
function readLS(key: string): any | null {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
function writeLS(key: string, val: any) {
  if (val === undefined) return;
  if (val === null) { localStorage.removeItem(key); return; }
  localStorage.setItem(key, JSON.stringify(val));
}
