"use server";

import { revalidatePath } from 'next/cache';
import type { AppointmentInput } from '@/lib/domain/appointment';
import { activeSource } from '@/lib/data/source';
import { validateAppointment } from '@/lib/tasks/appointment';
import { validateSchedule } from '@/lib/tasks/schedule';

export async function saveAppointmentAction(id: string | null, input: AppointmentInput) {
  const error = validateAppointment(input);
  if (error) return { ok: false as const, error };
  try {
    await activeSource().saveAppointment(id, input);
    revalidatePath('/projects');
    return { ok: true as const };
  } catch (error) { return { ok: false as const, error: (error as Error).message }; }
}

export async function deleteAppointmentAction(id: string) {
  try {
    await activeSource().deleteAppointment(id);
    revalidatePath('/projects');
    return { ok: true as const };
  } catch (error) { return { ok: false as const, error: (error as Error).message }; }
}

export async function scheduleTaskAction(id: string, date?: string, time?: string) {
  const error = validateSchedule(date, time);
  if (error) return { ok: false as const, error };
  try {
    const source = activeSource();
    const task = (await source.tasks()).find((task) => task.id === id);
    if (!task) return { ok: false as const, error: 'Task not found.' };
    await source.updateTask(id, { ...task, scheduledDate: date, scheduledTime: time });
    revalidatePath('/projects');
    revalidatePath('/');
    return { ok: true as const };
  } catch (error) { return { ok: false as const, error: (error as Error).message }; }
}
