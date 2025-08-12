import { Injectable, OnDestroy } from '@angular/core';
import PocketBase from 'pocketbase';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Service {
  name: string;
  images?: string[]; // JSON array
  status?: string;
}

export interface Profesional {
  id: string;
  name: string;
  images?: string[]; 
}

@Injectable({
  providedIn: 'root',
})
export class RealtimeProfesionalesService implements OnDestroy {
  private pb: PocketBase;
  private profesionalesSubject = new BehaviorSubject<Profesional[]>([]);

  // Observable for components to subscribe to
  public profesionales$: Observable<Profesional[]> =
    this.profesionalesSubject.asObservable();

  constructor() {
    this.pb = new PocketBase('https://db.camiwa.com:250');
    this.subscribeToProfesionales();
  }

  private async subscribeToProfesionales() {
    try {
      // (Optional) Authentication
      await this.pb
        .collection('users')
        .authWithPassword('admin@email.com', 'admin1234');

      // Subscribe to changes in any record of the 'professionals' collection
      this.pb.collection('camiwaSpecialists').subscribe('*', (e : any) => {
        this.handleRealtimeEvent(e);
      });

      // Initialize the list of professionals
      this.updateProfesionalesList();
    } catch (error) {
      console.error('Error during subscription:', error);
    }
  }

  private handleRealtimeEvent(event: any) {
    console.log(`Event Action: ${event.action}`);
    console.log(`Event Record:`, event.record);

    // Update the list of professionals
    this.updateProfesionalesList();
  }

  private async updateProfesionalesList() {
    try {
      // Get the updated list of professionals
      const records = await this.pb.collection('camiwaSpecialists').getFullList<Profesional>(200, {
        sort: '-created', // Sort by creation date
      });

      // Ensures each record conforms to Categoria structure
      const profesionales = records.map((record: any) => ({
        ...record,
        images: Array.isArray(record.images) ? record.images : [],
      })) as Profesional[];

      this.profesionalesSubject.next(profesionales);
    } catch (error) {
      console.error('Error updating profesionales list:', error);
    }
  }

  ngOnDestroy() {
    // Unsubscribe when the service is destroyed
    this.pb.collection('camiwaSpecialists').unsubscribe('*');  
  }
}
