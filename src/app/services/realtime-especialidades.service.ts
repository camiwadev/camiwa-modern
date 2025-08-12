import { Injectable, OnDestroy } from '@angular/core';
import PocketBase from 'pocketbase';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Service {
  name: string;
  images?: string[]; // JSON array
  status?: string;
}

export interface Especialidad {
  id: string;
  name: string;
  images?: string[]; 
}

@Injectable({
  providedIn: 'root',
})
export class RealtimeEspecialidadesService implements OnDestroy {
  private pb: PocketBase;
  private especialidadesSubject = new BehaviorSubject<Especialidad[]>([]);

  // Observable for components to subscribe to
  public especialidades$: Observable<Especialidad[]> =
    this.especialidadesSubject.asObservable();

  constructor() {
    this.pb = new PocketBase('https://db.camiwa.com:250');
    this.subscribeToEspecialidades();
  }

  private async subscribeToEspecialidades() {
    try {
      // (Optional) Authentication
      await this.pb
        .collection('users')
        .authWithPassword('admin@email.com', 'admin1234');

      // Subscribe to changes in any record of the 'professionals' collection
      this.pb.collection('camiwaSpecialties').subscribe('*', (e : any) => {
        this.handleRealtimeEvent(e);
      });

      // Initialize the list of professionals
      this.updateEspecialidadesList();
    } catch (error) {
      console.error('Error during subscription:', error);
    }
  }

  private handleRealtimeEvent(event: any) {
    console.log(`Event Action: ${event.action}`);
    console.log(`Event Record:`, event.record);

    // Update the list of professionals
    this.updateEspecialidadesList();
  }

  private async updateEspecialidadesList() {
    try {
      // Get the updated list of professionals
      const records = await this.pb.collection('camiwaSpecialties').getFullList<Especialidad>(200, {
        sort: '-created', // Sort by creation date
      });

      // Ensures each record conforms to Categoria structure
      const especialidades = records.map((record: any) => ({
        ...record,
        images: Array.isArray(record.images) ? record.images : [],
      })) as Especialidad[];

      this.especialidadesSubject.next(especialidades);
    } catch (error) {
      console.error('Error updating especialidades list:', error);
    }
  }

  ngOnDestroy() {
    // Unsubscribe when the service is destroyed
    this.pb.collection('camiwaSpecialties').unsubscribe('*');  
  }
}
