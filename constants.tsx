
import { ShiftType, DayStatus, Store } from './types.ts';

export const COLORS = {
  sheetzRed: '#DA291C',
  sheetzGold: '#FFC72C',
  darkCharcoal: '#1A1A1A',
  emerald: '#10B981',
  blue: '#3B82F6',
  purple: '#A855F7',
  orange: '#F97316',
  gray: '#4B5563',
};

export const INITIAL_STORES: Store[] = [
  { id: '1', number: '645', address: '55 Pine State st Lillington' },
  { id: '2', number: '736', address: '6410 Raeford rd (bunce)' },
  { id: '3', number: '809', address: '1025 Monroe St Carthage' },
  { id: '4', number: '716', address: '2201 NC 24-87 Cameron' },
  { id: '5', number: '866', address: '3008 Raeford rd' },
  { id: '6', number: '863', address: '2304 Jefferson Davis Hwy Sanford' },
  { id: '7', number: '804', address: '310 Chicken foot rd Hope Mills' },
  { id: '8', number: '836', address: '1695 US-1 Southern Pines' },
  { id: '9', number: '798', address: '2409 S Horner Blvd Sanford' },
];

export const DAYS_OF_WEEK = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];

export const SHIFT_DEFAULTS = {
  [ShiftType.FIRST]: { start: '06:00', end: '16:30' },
  [ShiftType.SECOND]: { start: '14:00', end: '00:30' },
  [ShiftType.THIRD]: { start: '20:30', end: '07:00' },
};

export const ANCHOR_DATE = new Date('2026-01-09T00:00:00'); // Friday, Week 1
