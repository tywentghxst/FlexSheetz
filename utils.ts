
import { format, addDays, startOfDay, differenceInCalendarWeeks } from 'date-fns';
import { ANCHOR_DATE } from './constants.tsx';

export const getWeekNumber = (date: Date): number => {
  const diff = differenceInCalendarWeeks(date, ANCHOR_DATE, { weekStartsOn: 5 }); // Sheetz weeks start Friday
  return diff + 1;
};

export const getWeekRange = (weekNum: number) => {
  const start = addDays(ANCHOR_DATE, (weekNum - 1) * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return days;
};

export const formatTo12h = (time24: string): string => {
  if (!time24) return '';
  try {
    const [hours, minutes] = time24.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return format(date, 'h:mm a');
  } catch (e) {
    return time24;
  }
};

export const calculateEndTime = (startTime: string): string => {
  if (!startTime) return '';
  const [hours, minutes] = startTime.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes + 630; // 10.5 hours = 630 mins
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
};

export const applyDriveTime = (endTime: string): string => {
  if (!endTime) return '';
  const [hours, minutes] = endTime.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes - 60; // -1 hour
  if (totalMinutes < 0) totalMinutes += 1440;
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Fixed startOfDay import error by ensuring consistent usage
export const formatDateId = (date: Date): string => format(startOfDay(date), 'yyyy-MM-dd');

export const generateId = () => Math.random().toString(36).substr(2, 9);
