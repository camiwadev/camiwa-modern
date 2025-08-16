import { Component, HostListener } from '@angular/core';
import { GlobalService } from '../../../services/global.service';
import { CommonModule } from '@angular/common';
import { AuthPocketbaseService } from '../../../services/AuthPocketbase.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
 /*  openNotif = false;
  openProfile = false; */
constructor(
  public global: GlobalService,
  public auth: AuthPocketbaseService
){
  
}
isLogged() {
  return !!localStorage.getItem('isLoggedin'); // o this.auth.isLogin()
}

logout() {
  this.auth.logoutUser()
    .then(() => {
      this.global.setRouterActive('login');
    });
}
/* toggle(which: 'notif' | 'profile') {
  if (which === 'notif') {
    this.openNotif = !this.openNotif;
    if (this.openNotif) this.openProfile = false;
  } else {
    this.openProfile = !this.openProfile;
    if (this.openProfile) this.openNotif = false;
  }
}

closeAll() {
  this.openNotif = false;
  this.openProfile = false;
}

@HostListener('document:click')
onDocClick() {
  this.closeAll();
} */
}
