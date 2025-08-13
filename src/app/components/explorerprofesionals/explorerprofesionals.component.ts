import { Component } from '@angular/core';
import { GlobalService } from '../../services/global.service';

@Component({
  selector: 'app-explorerprofesionals',
  imports: [],
  templateUrl: './explorerprofesionals.component.html',
  styleUrl: './explorerprofesionals.component.css'
})
export class ExplorerprofesionalsComponent {
constructor (public global: GlobalService){}
}
