import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import PocketBase from 'pocketbase';
import { RealtimeCategoriasService } from './realtime-categorias.service';
import { Especialidad, RealtimeEspecialidadesService } from './realtime-especialidades.service';
import { Profesional, RealtimeProfesionalesService } from './realtime-profesionales.service';

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
  days: string[];
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
  status: 'pending' | 'active' | 'approved'| 'new';
  images: string[];
  especialidades: Especialidad[];
  avatar: string[];
  userId: string;
}
@Injectable({
  providedIn: 'root'
})

export class GlobalService {
  routerActive:string= "home";
  pb = new PocketBase('https://db.camiwa.com:250');
  profesionales=[];
  // Observables de datos
  public clientesSubject = new BehaviorSubject<any[]>([]);
  clientes$ = this.clientesSubject.asObservable();
  public categoriasSubject = new BehaviorSubject<any[]>([]);
  categorias$ = this.categoriasSubject.asObservable();
  public especialidadesSubject = new BehaviorSubject<any[]>([]);
  especialidades$ = this.especialidadesSubject.asObservable();
  public profesionalesSubject = new BehaviorSubject<any[]>([]);
  profesionales$ = this.profesionalesSubject.asObservable();

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
    selected: {
      8: true,
      4: true,
      9: true,
      48: true,
    },
    ticketNumbers: {},
  };
  categorySelected: any = false;
  specialtiesFilteredSelected = false;
  specialtiesFiltered: any[] = [];

  constructor(
    public realtimeCategoriasService: RealtimeCategoriasService,
    public realtimeEspecialidadesService: RealtimeEspecialidadesService,
    public realtimeProfesionalesService: RealtimeProfesionalesService
  ) { }
  
setRouterActive(routerActive:string){
  this.routerActive=routerActive;
}

public async initCategoriasRealtime() {
  try {
    console.log('Loading categorias...');
    const result = await this.pb.collection('camiwaCategories').getFullList();

    const categoriasProcesadas = result.map((cat: any) => {
      let imagesArray: string[] = [];

      if (Array.isArray(cat.image)) {
        imagesArray = cat.image;
      } else {
        try {
          imagesArray = JSON.parse(cat.image); // si viene como string JSON
        } catch {
          imagesArray = [cat.image]; // si es una sola URL
        }
      }

      return {
        ...cat,
        image: imagesArray
      };
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
    console.log('Loading especialidades...');
    const result = await this.pb.collection('camiwaSpecialties').getFullList<Especialidad>(200, {
      sort: '-created', // Sort by creation date
    });
    console.log('Especialidades loaded:', result);
    this.especialidadesSubject.next(result);
    this.subscribeRealtime('camiwaSpecialties', this.especialidadesSubject);
  } catch (error) {
    console.error('Error loading especialidades:', error);
    throw error;
  }
}

public async initProfesionalesRealtime() {
  try {
    console.log('Loading profesionales...');
    const result = await this.pb.collection('camiwaSpecialists').getFullList<Profesional>(200, {
      sort: '-created', // Sort by creation date
    });
    console.log('Profesionales loaded:', result);
    this.profesionalesSubject.next(result);
    this.subscribeRealtime('camiwaSpecialists', this.profesionalesSubject);
  } catch (error) {
    console.error('Error loading profesionales:', error);
    throw error;
  }
  this.subscribeRealtime('camiwaSpecialists', this.profesionalesSubject);
}
getSpecialties(){}
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


}
