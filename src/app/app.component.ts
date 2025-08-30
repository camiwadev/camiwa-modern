import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HomeComponent } from "./components/home/home.component";
import { GlobalService } from './services/global.service';
import { HeaderComponent } from './components/ui/header/header.component';
import { FooterComponent } from './components/ui/footer/footer.component';
import { CategoriasSliderComponent } from './components/categorias-slider/categorias-slider.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { AboutComponent } from './components/about/about.component';
import { ContactComponent } from './components/contact/contact.component';
import { ExplorerprofesionalsComponent } from "./components/explorerprofesionals/explorerprofesionals.component";
import { BlogComponent } from './components/blog/blog.component';
import { BlogdetailComponent } from './components/blogdetail/blogdetail.component';
import { ProfesionalDetailComponent } from './components/profesional-detail/profesional-detail.component';
import { TermsComponent } from './components/terms/terms.component';
import { PrivacyComponent } from './components/privacy/privacy.component';
import { ScriptService } from './services/script.services';
import { PatientProfileComponent } from './components/patient-profile/patient-profile.component';
import { ChatbotComponent } from './components/chatbot/chatbot.component';
import { FaqsComponent } from './components/faqs/faqs.component';
import { BookingCalendarComponent } from './components/booking-calendar/booking-calendar.component';
import { ProfileComponent } from './components/dashboardProfesional/profile/profile.component';
import { AuthPocketbaseService } from './services/AuthPocketbase.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,
    CommonModule, HomeComponent,
    HeaderComponent,
    FooterComponent,
    LoginComponent,
    RegisterComponent,
    AboutComponent,
    ContactComponent,
    ExplorerprofesionalsComponent
    /*     CategoriasSliderComponent,
     */ , ExplorerprofesionalsComponent,
    BlogComponent,
    BlogdetailComponent,
    ProfesionalDetailComponent,
    TermsComponent,
    PrivacyComponent,
    PatientProfileComponent,
    ChatbotComponent,
    FaqsComponent,
    BookingCalendarComponent,
    ProfileComponent    
    ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'camiwanew';
  mostrarChatbot = false;
  
  constructor( public globalService: GlobalService,
    public auth: AuthPocketbaseService,
    public script: ScriptService
  ) {
    this.script.load(
      'jquery', 
      'jquery-3.6.0',
      'isotope', 
      'jquery-slick', 
      'main',
      
    ) 
      .then(() => {
        console.log('Todos los scripts se cargaron correctamente');
      })
      .catch(error => console.log(error));
  }
  async ngOnInit(): Promise<void> {
    await this.auth.restoreSession();
    try {
      await Promise.all([
        this.globalService.initCategoriasRealtime(),
        this.globalService.initEspecialidadesRealtime(),
        this.globalService.initProfesionalesRealtime()
      ]);
    } catch (error) {
      console.error('Error initializing application data:', error);
    }
  }
  toggleChatbot() {
    this.mostrarChatbot = !this.mostrarChatbot;
  }

}
