export interface AppointmentInput {
  projectId: string;
  title: string;
  clientName: string;
  clientEmail?: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  notes?: string;
}

export interface Appointment extends AppointmentInput {
  id: string;
  createdAt: string;
}
