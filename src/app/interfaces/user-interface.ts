/* export interface UserInterface {
	userId: string;
	id: string;
	monday: boolean;
	tuesday: boolean;
	wednesday: boolean;
	thursday: boolean;
	saturday: boolean;
	friday: boolean;
	sunday: boolean;
	full_name: string;
	address: string;
	city: string;
	days: boolean[];
	country: string;
	email: string;
	phone: string;
	profession: string;
	studyArea: string;
	university: string;
	graduationYear: string;
	specialties: { id: string; name: string }[];
	certificates: string[];
	documents: string[];
	images: string[];
	advertisePlatform: boolean;
	advertiseProfile: boolean;
	advertiseServices: string[];
	availability: string;
	collectionId: string;
	collectionName: string;
	consultationAddress: string;
	created: string;
	gender: string;
	membership: string;
	membershipPlan: string;
	schedule: string;
	services: string;
	status: string;
	updated: string;
	avatar: string;
	password: string;
	type: string;
	usertype: string;
	username:string;
  } */
  // user-interface.ts
export interface UserInterface {
	id: string;
	email: string;
	username: string;
	type: string;           // 'client' | 'partner' | 'admin' | ...
  
	// Haz opcionales todo lo demás
	password?: string;
	full_name?: string;
	phone?: string;
	images?: any;
	address?: string;
	created?: string;
	updated?: string;
	avatar?: string;
	status?: string;
	gender?: string;
  
	// Si tu versión anterior incluía muchos flags/días/etc., márcalos opcionales:
	userId?: string;
	monday?: boolean;
	tuesday?: boolean;
	wednesday?: boolean;
	thursday?: boolean;
	friday?: boolean;
	saturday?: boolean;
	sunday?: boolean;
	// ... y así con los 26+ que te pedía TS
  }
  