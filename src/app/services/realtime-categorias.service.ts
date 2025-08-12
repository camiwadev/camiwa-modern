import { Injectable, OnDestroy } from '@angular/core';
import PocketBase from 'pocketbase';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Service {
  name: string;
  images?: string[]; // JSON array
  status?: string;
}

export interface Categoria {
  id: string;
  name: string;
  images?: string[]; 
}

@Injectable({
  providedIn: 'root',
})
export class RealtimeCategoriasService implements OnDestroy {
  private pb: PocketBase;
  private categoriasSubject = new BehaviorSubject<Categoria[]>([]);

  // Observable for components to subscribe to
  public categorias$: Observable<Categoria[]> =
    this.categoriasSubject.asObservable();

  constructor() {
    this.pb = new PocketBase('https://db.camiwa.com:250');
    this.subscribeToCategorias();
  }

  private async subscribeToCategorias() {
    try {
      // (Optional) Authentication
      await this.pb
        .collection('users')
        .authWithPassword('admin@email.com', 'admin1234');

      // Subscribe to changes in any record of the 'professionals' collection
      this.pb.collection('camiwaCategories').subscribe('*', (e : any) => {
        this.handleRealtimeEvent(e);
      });

      // Initialize the list of professionals
      this.updateCategoriasList();
    } catch (error) {
      console.error('Error during subscription:', error);
    }
  }

  private handleRealtimeEvent(event: any) {
    console.log(`Event Action: ${event.action}`);
    console.log(`Event Record:`, event.record);

    // Update the list of professionals
    this.updateCategoriasList();
  }

  private async updateCategoriasList() {
    try {
      // Get the updated list of professionals
      const records = await this.pb.collection('camiwaCategories').getFullList<Categoria>(200, {
        sort: '-created', // Sort by creation date
        requestKey: null, 
      });

      // Ensures each record conforms to Categoria structure
      const categorias = records.map((record: any) => ({
        ...record,
        images: Array.isArray(record.images) ? record.images : [],
      })) as Categoria[];

      this.categoriasSubject.next(categorias);
    } catch (error) {
      console.error('Error updating categorias list:', error);
    }
  }

  ngOnDestroy() {
    // Unsubscribe when the service is destroyed
    this.pb.collection('camiwaCategories').unsubscribe('*');
  }
}
