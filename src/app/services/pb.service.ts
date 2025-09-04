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
  images?: Jsonish;       // <- solo para PATCH sin archivos
  specialties?: Jsonish;       // JSON array/object o string JSON
  userId?: string;
  biography?: string;
}

@Injectable({ providedIn: 'root' })
export class PbService {
  private pb = new PocketBase('https://db.camiwa.com:250');

  constructor() {
   
  }
  async rawUpdate(collection: string, id: string, formData: FormData, opts?: { fields?: string }) {
    return await this.pb.collection(collection).update(id, formData, {
      requestKey: null,
      ...(opts?.fields ? { fields: opts.fields } : {})
    });
  }
/* getFileUrl(record: any, filename: string): string {
  return this.pb.files.getUrl(record, filename);
} */
/* getFileUrl(rec: any, fileName: string): string {
  if (!rec || !fileName) return '';
  return this.pb.files.getUrl(rec, fileName, { 'thumb': '0x0' });
} */

  private toJSONString(value: any): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') {
      try { JSON.parse(value); return value; } catch { /* no-op */ }
      return value;
    }
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
    data: CamiwaSpecialistUpdate = {},
    files?: {
      avatar?: File;          // <- NUEVO: file único
      images?: (File | string)[];       // mezcla: nuevos File + nombres existentes string
      certificates?: (File | string)[];
      documents?: (File | string)[];
    },
    options?: { expand?: string; fields?: string }
  ): Promise<RecordModel> {

    const hasFiles =
      !!(files?.avatar) ||
      !!(files?.images?.length) ||
      !!(files?.certificates?.length) ||
      !!(files?.documents?.length);

    const query: Record<string, string> = {};
    if (options?.expand) query['expand'] = options.expand;
    if (options?.fields) query['fields'] = options.fields;

    if (hasFiles) {
      const form = new FormData();

      // Campos de texto/JSON (EXCLUYENDO los multi-file cuando hay archivos)
      const maybeJsonKeys = new Set([
        'advertiseServices', 'days', 'services', 'documents', 'images', 'specialties'
      ]);
      Object.entries(data).forEach(([key, val]) => {
        if (val === undefined || val === null) return;
        if (maybeJsonKeys.has(key)) {
          // NO enviar aquí images/documents/certificates como JSON cuando hay archivos
          if (key === 'images' || key === 'documents') return;
          const json = this.toJSONString(val);
          if (json !== undefined) form.append(key, json);
        } else {
          form.append(key, typeof val === 'boolean' ? String(val) : (val as any));
        }
      });

      // avatar (file único) — si tu schema no lo tiene PocketBase lo ignora sin romper
      if (files?.avatar) {
        form.append('avatar', files.avatar);
      }

      // Helper para multi-file: mezcla nuevos File + nombres existentes (string)
      const appendMulti = (key: 'images' | 'certificates' | 'documents', arr?: (File | string)[]) => {
        (arr || []).forEach(item => form.append(key, item as any));
      };

      appendMulti('images', files?.images);
      appendMulti('certificates', files?.certificates);
      appendMulti('documents', files?.documents);

      return this.pb.collection('camiwaSpecialists').update(id, form, { query });
    }

    // PATCH sin archivos
    return this.pb.collection('camiwaSpecialists').update(id, data, { query });
  }
 
 
 // ---------- Helpers ----------
 getFileUrl(rec: any, fileName: string): string {
  if (!rec || !fileName) return '';
  // cache-bust con updated/created si existe:
  const url = this.pb.files.getUrl(rec, fileName);
  const v = encodeURIComponent(rec?.updated || rec?.created || Date.now());
  return `${url}${url.includes('?') ? '&' : '?'}v=${v}`;
}

/** Convierte cualquier forma de "images" en string[] de filenames */
normalizeFileNames(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string') {
    // si es JSON de array → parsea; si es filename simple → devuélvelo
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      // si fuera un objeto tipo {0:'a.png',1:'b.png'}
      if (parsed && typeof parsed === 'object') return Object.values(parsed).filter(Boolean) as string[];
    } catch {
      // no es JSON → probablemente un filename simple
      return [val];
    }
  }
  return [];
}

// ---------- Services: LIST ----------
async listServicesByUser(userId: string, page = 1, perPage = 50) {
  const filter = `userId="${userId}"`;
  // trae images/created por defecto; si quieres limitar usa fields
  return await this.pb.collection('camiwaServices')
    .getList(page, perPage, { filter, sort: '-created' });
}

// ---------- Services: CREATE ----------
async createService(data: {
  userId: string;
  tittle: string;           // (schema usa 'tittle')
  description?: string;
  // si en un futuro agregas price/duration, los añades aquí
}, images?: File[]) {

  // Si hay imágenes -> multipart/form-data
  if (images && images.length) {
    const fd = new FormData();
    fd.append('userId', data.userId);
    fd.append('tittle', data.tittle);
    if (data.description) fd.append('description', data.description);

    // OJO: en PocketBase para multi-files se repite la misma clave:
    for (const f of images) fd.append('images', f);

    // importante: NO seteamos manualmente headers; el SDK los arma
    return await this.pb.collection('camiwaServices').create(fd);
  }

  // Si NO hay imágenes -> JSON
  return await this.pb.collection('camiwaServices').create(data);
}
async updateService(
  id: string,
  data: { tittle?: string; description?: string },
  imagesCombined?: (File | string)[]
) {
  // 1) Sin cambios en imágenes -> JSON normal
  if (imagesCombined === undefined) {
    return await this.pb.collection('camiwaServices').update(id, data);
  }

  // 2) Limpiar todas las imágenes -> JSON con [] en images
  if (Array.isArray(imagesCombined) && imagesCombined.length === 0) {
    return await this.pb.collection('camiwaServices').update(id, { ...data, images: [] });
  }

  // 3) Reemplazar lista completa -> multipart (File + filenames)
  const fd = new FormData();
  if (data.tittle !== undefined) fd.append('tittle', data.tittle);
  if (data.description !== undefined) fd.append('description', data.description);
  for (const item of imagesCombined) fd.append('images', item as any);
  return await this.pb.collection('camiwaServices').update(id, fd);
}

// --- NUEVO: eliminar servicio ---
async deleteService(id: string) {
  return await this.pb.collection('camiwaServices').delete(id);
}


}
