// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { APP_INITIALIZER } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { AuthPocketbaseService } from './app/services/AuthPocketbase.service';

// Registra el web component de FullCalendar (side-effect import)
import '@fullcalendar/web-component';

// Fábrica opcional (si prefieres separarla del providers[])
export function initAuth(auth: AuthPocketbaseService) {
  // Debe devolver una función que retorne Promise<void>
  return () => auth.bootstrap();
}

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    provideHttpClient(),

    // mezcla cualquier provider que ya tengas en appConfig
    ...(appConfig.providers ?? []),

    // APP_INITIALIZER para rehidratar sesión/usuario/perfil ANTES de pintar la app
    {
      provide: APP_INITIALIZER,
      useFactory: initAuth, // o: (auth: AuthPocketbaseService) => () => auth.bootstrap()
      deps: [AuthPocketbaseService],
      multi: true,
    },
  ],
}).catch(err => console.error(err));
