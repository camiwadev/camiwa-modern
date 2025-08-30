// src/app/services/pb.service.ts
import PocketBase, { RecordModel } from 'pocketbase';
import { Injectable } from '@angular/core';

export type Jsonish = any[] | Record<string, any> | string;

export interface CamiwaSpecialistUpdate {
  address?: string;
  advertisePlatform?: boolean;
  advertiseProfile?: boolean;
  advertiseServices?: Jsonish; // JSON array/object o string JSON
  availability?: string;
  certificates?: Jsonish;      // JSON array/object o string JSON
  city?: string;
  consultationAddress?: string;
  country?: string;
  days?: Jsonish;              // JSON array/object o string JSON
  email?: string;
  friday?: boolean;
  full_name?: string;
  gender?: string;
  graduationYear?: string;
  membership?: string;
  membershipPlan?: string;
  monday?: boolean;
  phone?: string;
  profession?: string;
  saturday?: boolean;
  schedule?: string;
  services?: Jsonish;          // JSON array/object o string JSON
  studyArea?: string;
  sunday?: boolean;
  thursday?: boolean;
  tuesday?: boolean;
  university?: string;
  wednesday?: boolean;
  documents?: Jsonish;         // JSON array/object o string JSON
  status?: string;
  images?: Jsonish;            // JSON array/object o string JSON
  specialties?: Jsonish;       // JSON array/object o string JSON
  userId?: string;
  biography?: string;
}

@Injectable({ providedIn: 'root' })
export class PbService {
  private pb = new PocketBase('https://db.camiwa.com:250');

  constructor() {
    // si ya manejas auth, restaura el token si lo guardas en localStorage
    // const auth = JSON.parse(localStorage.getItem('pb_auth') || 'null');
    // if (auth) this.pb.authStore.save(auth.token, auth.model);
  }

  /** Normaliza campos JSON: acepta objeto/array o string; retorna string JSON para enviar en form-data. */
  private toJSONString(value: any): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') {
      // si ya parece JSON, lo dejamos así
      try { JSON.parse(value); return value; } catch { /* no-op */ }
      // si es string simple, lo enviamos tal cual como string (campo plano)
      return value;
    }
    // objeto/array -> stringify
    return JSON.stringify(value);
  }

  /**
   * UPDATE camiwaSpecialists
   * - Si incluye archivos => envía multipart/form-data
   * - Si no incluye archivos => envía JSON normal
   *
   * @param id id del record
   * @param data campos a actualizar (parciales)
   * @param files archivos opcionales (images, certificates, documents)
   * @param expand opcional para expandir relaciones
   * @param fields opcional para limitar campos devueltos
   */
  async updateCamiwaSpecialist(
    id: string,
    data: CamiwaSpecialistUpdate,
    files?: {
      images?: File[];         // soporta múltiples
      certificates?: File[];   // soporta múltiples
      documents?: File[];      // soporta múltiples
    },
    options?: { expand?: string; fields?: string }
  ): Promise<RecordModel> {

    const hasFiles =
      !!(files?.images?.length) ||
      !!(files?.certificates?.length) ||
      !!(files?.documents?.length);

    const query: Record<string, string> = {};
    if (options?.expand) query['expand'] = options.expand;
    if (options?.fields) query['fields'] = options.fields;

    if (hasFiles) {
      // multipart/form-data
      const form = new FormData();

      // Campos planos + JSON stringificados cuando aplique
      Object.entries(data).forEach(([key, val]) => {
        if (val === undefined || val === null) return;

        // estos campos pueden ser JSON o string plano
        const maybeJsonKeys = new Set([
          'advertiseServices', 'certificates', 'days', 'services',
          'documents', 'images', 'specialties'
        ]);

        if (maybeJsonKeys.has(key)) {
          const json = this.toJSONString(val);
          if (json !== undefined) form.append(key, json);
        } else {
          // booleans/números/strings -> a string
          form.append(key, typeof val === 'boolean' ? String(val) : (val as any));
        }
      });

      // Agrega archivos (múltiples)
      (files?.images || []).forEach(f => form.append('images', f));
      (files?.certificates || []).forEach(f => form.append('certificates', f));
      (files?.documents || []).forEach(f => form.append('documents', f));

      return this.pb.collection('camiwaSpecialists').update(id, form, { query });
    }

    // application/json (PATCH limpio)
    // Para JSON fields: si te llegan como objeto/array, envía objeto/array; el SDK lo serializa.
    // Si te llegan como string JSON también ok.
    return this.pb.collection('camiwaSpecialists').update(id, data, { query });
  }
}
