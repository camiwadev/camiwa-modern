import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import PocketBase from 'pocketbase';
import { RealtimeCategoriasService } from './realtime-categorias.service';
import { Especialidad, RealtimeEspecialidadesService } from './realtime-especialidades.service';
import { Profesional, RealtimeProfesionalesService } from './realtime-profesionales.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalService {
  routerActive:string= "home";
  pb = new PocketBase('https://db.camiwa.com:250');

  // Observables de datos
  private clientesSubject = new BehaviorSubject<any[]>([]);
  clientes$ = this.clientesSubject.asObservable();
  private categoriasSubject = new BehaviorSubject<any[]>([]);
  categorias$ = this.categoriasSubject.asObservable();
  private especialidadesSubject = new BehaviorSubject<any[]>([]);
  especialidades$ = this.especialidadesSubject.asObservable();
  private profesionalesSubject = new BehaviorSubject<any[]>([]);
  profesionales$ = this.profesionalesSubject.asObservable();

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
    console.log('Categorias loaded:', result);
    this.categoriasSubject.next(result);
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
