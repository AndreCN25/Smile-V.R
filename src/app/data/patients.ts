export interface Treatment {
  date: string; procedure: string; doctor: string; cost: number; notes: string;
}

export interface Patient {
  id: number; name: string; dob: string; gender: "M" | "F";
  phone: string; email: string; address: string; city: string;
  bloodType: string; allergies: string; medicalConditions: string;
  emergencyContact: string; emergencyPhone: string;
  lastVisit: string; totalVisits: number; balance: number;
  notes: string; treatments: Treatment[]; active: boolean;
}

export const INITIAL_PATIENTS: Patient[] = [];
