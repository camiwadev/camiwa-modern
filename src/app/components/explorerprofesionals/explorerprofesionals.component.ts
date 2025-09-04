import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule, NgFor, AsyncPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Observable, combineLatest, debounceTime, map, startWith } from 'rxjs';
import { GlobalService } from '../../services/global.service';

@Component({
  selector: 'app-explorerprofesionals',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AsyncPipe, NgFor, FormsModule],
  templateUrl: './explorerprofesionals.component.html',
  styleUrls: ['./explorerprofesionals.component.css']
})
export class ExplorerprofesionalsComponent {
  // toggles UI
  mostrarTodas = false;
  mostrarCategorias = false;
  mostrarEspecialidades = false;

  // filtros
  searchCtrl = new FormControl<string>('', { nonNullable: true });
  categoriaCtrl = new FormControl<string | null>(null);
  especialidadesCtrl = new FormControl<string | null>(null);

  // cat/esp listas filtradas por la búsqueda
  categoriasFiltradas$!: Observable<any[]>;
  especialidadesFiltradas$!: Observable<any[]>;

  // especialidades dependientes de categoría
  especialidadesDeCategoria$!: Observable<any[]>;

  // profesionales filtrados final
  profesionalesFiltrados$!: Observable<any[]>;

  constructor(
    public globalServices: GlobalService,
    private cdr: ChangeDetectorRef
  )
   {
    const norm = (v: any) =>
      (v ?? '')
        .toString()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();

    // ---- Listas de filtro (con búsqueda por texto) ----
    this.categoriasFiltradas$ = combineLatest([
      this.globalServices.categorias$,
      this.searchCtrl.valueChanges.pipe(startWith(''), debounceTime(150)),
    ]).pipe(
      map(([cats, q]) => {
        const qn = norm(q);
        return (cats ?? []).filter((c: any) => norm(c?.name).includes(qn));
      })
    );

    this.especialidadesFiltradas$ = combineLatest([
      this.globalServices.especialidades$,
      this.searchCtrl.valueChanges.pipe(startWith(''), debounceTime(150)),
    ]).pipe(
      map(([esp, q]) => {
        const qn = norm(q);
        return (esp ?? []).filter((e: any) => norm(e?.name).includes(qn));
      })
    );

    // ---- Especialidades dependientes de categoría seleccionada ----
    this.especialidadesDeCategoria$ = combineLatest([
      this.globalServices.especialidades$,
      this.categoriaCtrl.valueChanges.pipe(startWith(this.categoriaCtrl.value)),
    ]).pipe(
      map(([esp, catId]) => {
        if (!catId) return esp ?? [];
        // Soporta fatherId o category
        return (esp ?? []).filter((e: any) =>
          [e.fatherId, e.category].some((x: any) => String(x || '').trim() === String(catId).trim())
        );
      })
    );

    // ---- Profesionales filtrados por: texto + categoría + especialidad ----
    this.profesionalesFiltrados$ = combineLatest([
      this.globalServices.profesionales$,
      this.searchCtrl.valueChanges.pipe(startWith(''), debounceTime(200)),
      this.categoriaCtrl.valueChanges.pipe(startWith(this.categoriaCtrl.value)),
      this.especialidadesCtrl.valueChanges.pipe(startWith(this.especialidadesCtrl.value)),
    ]).pipe(
      map(([profes, q, catId, espId]) => {
        const qn = norm(q);

        const matchText = (p: any) => {
          const specialties = Array.isArray(p?.specialties)
            ? p.specialties.map((s: any) => (typeof s === 'string' ? s : s?.name)).join(' ')
            : '';
          const services = (() => {
            if (Array.isArray(p?.services)) return p.services.join(' ');
            if (typeof p?.services === 'object') return JSON.stringify(p.services);
            return p?.services || '';
          })();

          return [
            p?.full_name,
            p?.profession,
            p?.city,
            p?.studyArea,
            specialties,
            services
          ].some(v => norm(v).includes(qn));
        };

        const matchCategoria = (p: any) => {
          if (!catId) return true;
          // Muchos esquemas guardan specialties como objetos {id,name} ligados a la categoría.
          // Si traes categoryId en el profesional, úsalo aquí:
          if (p?.categoryId && String(p.categoryId) === String(catId)) return true;

          // Si no, inferimos por specialties: si alguna esp pertenece a la categoría seleccionada:
          const profSpecs: any[] = Array.isArray(p?.specialties) ? p.specialties : [];
          return profSpecs.some((s: any) =>
            [s?.fatherId, s?.category, s?.categoryId].some((x: any) => String(x || '') === String(catId))
          );
        };

        const matchEspecialidad = (p: any) => {
          if (!espId) return true;
          const profSpecs: any[] = Array.isArray(p?.specialties) ? p.specialties : [];
          return profSpecs.some((s: any) =>
            String((typeof s === 'string' ? s : s?.id) || '') === String(espId)
          );
        };

        return (profes ?? []).filter(p => matchText(p) && matchCategoria(p) && matchEspecialidad(p));
      })
    );
  }

  // --------- UI helpers ----------
  toggleCategorias() { this.mostrarCategorias = !this.mostrarCategorias; }
  toggleEspecialidades() { this.mostrarEspecialidades = !this.mostrarEspecialidades; }
  ngOnInit() {
    // Limpia especialidad cuando cambia la categoría (evita combinaciones imposibles)
    this.categoriaCtrl.valueChanges.subscribe(() => {
      this.especialidadesCtrl.setValue(null, { emitEvent: true });
    });
  }
  
  /** Limpia TODOS los filtros y vuelve al estado "ver todos" */
  resetFilters() {
    this.searchCtrl.setValue('', { emitEvent: true });
    this.categoriaCtrl.setValue(null, { emitEvent: true });
    this.especialidadesCtrl.setValue(null, { emitEvent: true });
    this.mostrarCategorias = false;
    this.mostrarEspecialidades = false;
  }
  onVerPerfil(p: any) {
    this.globalServices.viewDetail(p);
    this.cdr.markForCheck();
  }

  trackById = (_: number, item: any) => item?.id ?? item;

  // Imagen principal: avatar > images[0] > placeholder
  avatarUrl(p: any): string {
    const fileName =
      (Array.isArray(p?.avatar) && p.avatar[0]) ||
      (Array.isArray(p?.images) && p.images[0]) ||
      p?.avatar || p?.image || '';

    if (!fileName) return 'assets/img/avatar/avatar_21.png';
    try {
      return this.globalServices.pb.files.getUrl(p, fileName, { thumb: '0x0' });
    } catch {
      return 'assets/img/avatar/avatar_21.png';
    }
  }

  firstImage(categoria: any): string {
    const img = Array.isArray(categoria?.image) ? categoria.image[0] : categoria?.image;
    return img || 'assets/img/placeholder-cat.png';
  }
}
