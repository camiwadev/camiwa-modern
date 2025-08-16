import { Component,  } from '@angular/core';
import { CommonModule, NgFor, AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, combineLatest, debounceTime, map, startWith } from 'rxjs';
import { Pipe, PipeTransform } from '@angular/core';
import { GlobalService } from '../../services/global.service';

/* --------- Pipe standalone --------- */
@Pipe({ name: 'sortByName', standalone: true })
export class SortByNamePipe implements PipeTransform {
  transform(array: any[], field: string): any[] {
    if (!Array.isArray(array)) return array;
    return [...array].sort((a, b) =>
      (a?.[field] ?? '').toString()
        .localeCompare((b?.[field] ?? '').toString(), 'es', { sensitivity: 'base' })
    );
  }
}

/* --------- Componente --------- */
@Component({
  selector: 'app-explorerprofesionals',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AsyncPipe,
    NgFor,
    
  ],
  templateUrl: './explorerprofesionals.component.html',
  styleUrls: ['./explorerprofesionals.component.css']
})
export class ExplorerprofesionalsComponent {
  mostrarTodas = false;
  mostrarTodasCategorias = false;

  // 1 caja de búsqueda compartida
  searchCtrl = new FormControl<string>('', { nonNullable: true });

  categoriasFiltradas$!: Observable<any[]>;
  especialidadesFiltradas$!: Observable<any[]>;

  constructor(public global: GlobalService) {
    // Normaliza texto (quita acentos y pasa a minúsculas)
    const norm = (v: string | null | undefined) =>
      (v ?? '')
        .toString()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();

    this.categoriasFiltradas$ = combineLatest([
      this.global.categorias$,
      this.searchCtrl.valueChanges.pipe(startWith(''), debounceTime(150)),
    ]).pipe(
      map(([cats, q]) => {
        const qn = norm(q);
        return (cats ?? []).filter(c => norm(c?.name).includes(qn));
      })
    );

    this.especialidadesFiltradas$ = combineLatest([
      this.global.especialidades$,
      this.searchCtrl.valueChanges.pipe(startWith(''), debounceTime(150)),
    ]).pipe(
      map(([esp, q]) => {
        const qn = norm(q);
        return (esp ?? []).filter(e => norm(e?.name).includes(qn));
      })
    );
  }
}
