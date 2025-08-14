// src/app/services/specialist-register.service.ts
import { Injectable, inject } from '@angular/core';
import PocketBase, { ClientResponseError } from 'pocketbase';
import { environment } from '../environments/environment';

export type DaysBooleans = {
  monday: boolean; tuesday: boolean; wednesday: boolean; thursday: boolean;
  friday: boolean; saturday: boolean; sunday: boolean;
};

export interface CreateAuthUserInput {
  email: string;
  username: string;
  password: string;          // genera o toma la del formulario
  type?: 'professional' | 'patient';
}

export interface SpecialistPayload {
  userId: string;
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  consultationAddress?: string;
  city?: string;
  country: string;
  gender: 'Male' | 'Female' | 'Other';

  profession: string;
  studyArea: string;
  university: string;
  graduationYear: string;

  category: number | string;     // id de categoría
  specialties: (number | string)[];

  // media
  idDocumentUrl?: string;
  avatarUrl?: string;
  certificatesUrls?: string[];

  // laboral
  days: boolean[];               // [LU..DO]
  schedule?: string;

  // extras opcionales
  images?: string[];
  documents?: string[];
  certificates?: string[];

  // flags iniciales
  status?: 'new' | 'pending_review' | 'approved' | 'rejected';
  membership?: string;
  membershipPlan?: string;
  advertiseServices?: any[];
  advertiseProfile?: boolean;
  advertisePlatform?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SpecialistRegisterService {
  private pb = new PocketBase(environment.apiUrl);

  /** Crea usuario auth en colección users */
  async createAuthUser(input: CreateAuthUserInput) {
    try {
      const user = await this.pb.collection('users').create({
        email: input.email,
        username: input.username,
        password: input.password,
        passwordConfirm: input.password,
        type: input.type ?? 'professional', // si tienes un field “type” en users
      });
      return user; // { id, email, ... }
    } catch (e) {
      const err = e as ClientResponseError;
      throw new Error(err?.message || 'No se pudo crear el usuario.');
    }
  }

  /** Crea el record del especialista */
  async createSpecialistRecord(payload: SpecialistPayload) {
    // Mapea los 7 días a objeto individual + “days” array
    const [lu, ma, mi, ju, vi, sa, do_] = payload.days;

    const record = {
      userId: payload.userId,
      full_name: payload.full_name,
      email: payload.email,
      phone: payload.phone || '',
      address: payload.address || '',
      consultationAddress: payload.consultationAddress || '',
      city: payload.city || '',
      country: payload.country,
      gender: payload.gender,

      profession: payload.profession,
      studyArea: payload.studyArea,
      university: payload.university,
      graduationYear: payload.graduationYear,

      category: payload.category,
      specialties: payload.specialties ?? [],

      // media
      documents: payload.documents ?? [],
      certificates: payload.certificates ?? payload.certificatesUrls ?? [],
      images: payload.images ?? (payload.avatarUrl ? [payload.avatarUrl] : []),

      // laboral
      days: payload.days,
      monday: lu, tuesday: ma, wednesday: mi, thursday: ju,
      friday: vi, saturday: sa, sunday: do_,
      schedule: payload.schedule || '',

      // flags
      status: payload.status ?? 'pending_review',
      membership: payload.membership ?? 'Unlimited Plan',
      membershipPlan: payload.membershipPlan ?? '',
      advertiseServices: payload.advertiseServices ?? [],
      advertiseProfile: payload.advertiseProfile ?? true,
      advertisePlatform: payload.advertisePlatform ?? false
    };

    try {
      const res = await this.pb.collection('camiwaSpecialists').create(record);
      return res;
    } catch (e) {
      const err = e as ClientResponseError;
      throw new Error(err?.message || 'No se pudo crear el especialista.');
    }
  }
}
