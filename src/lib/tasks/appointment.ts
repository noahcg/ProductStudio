import type { AppointmentInput } from '../domain/appointment';
import { validateSchedule } from './schedule';

export function validateAppointment(input: AppointmentInput): string | null {
  if (!input.projectId || !input.title?.trim() || !input.clientName?.trim()) return 'Enter a title, client, and project.';
  if (!input.date || !input.startTime || !input.endTime) return 'Choose a date, start time, and end time.';
  const error = validateSchedule(input.date, input.startTime) || validateSchedule(input.date, input.endTime);
  if (error) return error;
  if (input.endTime <= input.startTime) return 'End time must be after start time.';
  if (input.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.clientEmail)) return 'Enter a valid client email.';
  return null;
}
