import { ChangeDetectorRef, Component,  } from '@angular/core';
import { CommonModule, NgFor, AsyncPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
interface Categoria {
  id: string;
  name: string;
  image?: string; // en tu DB viene como string JSON con array
}

interface Especialidad {
  id: string;
  name: string;
  fatherId?: string; // <- relación a Categoria.id
  category?: string; // <- por si a veces guardaste el id o el nombre aquí
}

@Component({
  selector: 'app-explorerprofesionals',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AsyncPipe,
    NgFor,
    FormsModule
    
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
  mostrarCategorias = false;
  categoriaCtrl = new FormControl<string | null>(null);
  mostrarEspecialidades= false;
  especialidadesCtrl = new FormControl<string | null>(null);

  constructor(public globalServices: GlobalService,
    private cdr: ChangeDetectorRef
  ) {
    const norm = (v: string | null | undefined) =>
      (v ?? '')
        .toString()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();

    this.categoriasFiltradas$ = combineLatest([
      this.globalServices.categorias$,
      this.searchCtrl.valueChanges.pipe(startWith(''), debounceTime(150)),
    ]).pipe(
      map(([cats, q]) => {
        const qn = norm(q);
        return (cats ?? []).filter(c => norm(c?.name).includes(qn));
      })
    );

    this.especialidadesFiltradas$ = combineLatest([
      this.globalServices.especialidades$,
      this.searchCtrl.valueChanges.pipe(startWith(''), debounceTime(150)),
    ]).pipe(
      map(([esp, q]) => {
        const qn = norm(q);
        return (esp ?? []).filter(e => norm(e?.name).includes(qn));
      })
    );
  }
  toggleCategorias() {
    this.mostrarCategorias = !this.mostrarCategorias;
  }
  toggleEspecialidades(){
    this.mostrarEspecialidades = !this.mostrarEspecialidades;
  }
  onVerPerfil(p: any) {
    this.globalServices.viewDetail(p);
    this.cdr.markForCheck();  // o detectChanges() en casos puntuales
  }
}
