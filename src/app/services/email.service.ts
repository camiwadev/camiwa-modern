import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class EmailService {
  private http = inject(HttpClient);
  private baseUrl = environment.emailApiBase; // <- desde environments

  async sendWelcome(opts: {
    toEmail: string;
    toName: string;
    userType: 'paciente' | 'profesional';
    params?: Record<string, any>;
  }) {
    // Lee los IDs desde environment (NO import.meta.env)
    const templateIdMap: Record<'paciente' | 'profesional', number> = {
      paciente: Number(environment.BREVO_WELCOME_PATIENT),
      profesional: Number(environment.BREVO_WELCOME_PROFESSIONAL),
    };

    const body = {
      toEmail: opts.toEmail,
      toName: opts.toName,
      templateId: templateIdMap[opts.userType],
      params: {
        firstName: opts.toName,
        dashboardUrl:
          opts.userType === 'paciente'
            ? 'https://camiwa.com'
            : 'https://camiwa.com',
        supportEmail: 'camiwadev@gmail.com',
        ...(opts.params || {})
      }
    };

    // ejemplo: http://localhost:5542/email/welcome
    return firstValueFrom(this.http.post(`${this.baseUrl}/email/welcome`, body));
  }
}
