import PocketBase from 'pocketbase';
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';

import { UserInterface } from '../interfaces/user-interface';
import { GlobalService } from './global.service';

@Injectable({
  providedIn: 'root'
})
export class PocketDataService {
  private pb: PocketBase;

  constructor(public global:GlobalService) {
    this.pb = new PocketBase('https://db.camiwa.com:250');
  }

  async saveCategor(categoryData:any): Promise<any> {
    try {
      const record = await this.pb.collection('camiwaCategories').create(categoryData);
      console.log('Categoría guardada exitosamente:', record);

      return record; // Si necesitas devolver el registro creado
    } catch (error) {
      console.error('Error al guardar la categoría:', error);
      throw error; // Puedes lanzar el error para manejarlo en otro lugar
    }
  }
  async saveSpecialty(specialtyData:any): Promise<any> {
    try {
      const record = await this.pb.collection('camiwaSpecialties').create(specialtyData);
      console.log('Especialidad guardada exitosamente:', record);
        this.global.getSpecialties();
      return record; // Si necesitas devolver el registro creado
    } catch (error) {
      console.error('Error al guardar la especialidad:', error);
      throw error; // Puedes lanzar el error para manejarlo en otro lugar
    }
  }
  private async createRecord(collectionName: string, data: any): Promise<any> {
    try {
       const record = await this.pb.collection(collectionName).create(data);
       console.log(`${collectionName} guardado exitosamente:`, record);
       return record;
    } catch (error) {
       console.error(`Error al guardar en ${collectionName}:`, error);
       throw error;
    }
 }
  async saveService(serviceData: any): Promise<any> {
    return this.createRecord('camiwaServices', serviceData);
 }
  
}
