import { Component } from '@angular/core';
import { GlobalService } from '../../services/global.service';

@Component({
  selector: 'app-terms',
  imports: [],
  templateUrl: './terms.component.html',
  styleUrl: './terms.component.css'
})
export class TermsComponent {
constructor(
  public global: GlobalService
){}
}
