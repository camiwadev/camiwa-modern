import { Component } from '@angular/core';
import { GlobalService } from '../../services/global.service';
import { CommonModule } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'sortByName' })
export class SortByNamePipe implements PipeTransform {
  transform(array: any[], field: string): any[] {
    if (!Array.isArray(array)) return array;
    return [...array].sort((a, b) =>
      a[field].localeCompare(b[field], 'es', { sensitivity: 'base' })
    );
  }
}
@Component({
  selector: 'app-explorerprofesionals',
  standalone:true,
  imports: [CommonModule, SortByNamePipe],
  templateUrl: './explorerprofesionals.component.html',
  styleUrls: ['./explorerprofesionals.component.css'] // <-- plural
  })
export class ExplorerprofesionalsComponent {
  mostrarTodas = false;
  mostrarTodasCategorias = false;
constructor (public global: GlobalService){}

}
