
import { ShiftType, DayStatus, Store } from './types';

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
  { id: '1', number: '645', address: '123 Sheetz Way, Altoona, PA' },
  { id: '2', number: '736', address: '456 Fuel St, Pittsburgh, PA' },
  { id: '3', number: '809', address: '789 Snack Ave, Harrisburg, PA' },
  { id: '4', number: '716', address: '101 Coffee Rd, York, PA' },
  { id: '5', number: '866', address: '202 MTO Blvd, State College, PA' },
  { id: '6', number: '863', address: '303 Soda Ln, Erie, PA' },
  { id: '7', number: '804', address: '404 Burger Dr, Scranton, PA' },
  { id: '8', number: '836', address: '505 Fry Cir, Reading, PA' },
  { id: '9', number: '798', address: '606 Hotdog Ct, Lancaster, PA' },
];

export const DAYS_OF_WEEK = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];

export const SHIFT_DEFAULTS = {
  [ShiftType.FIRST]: { start: '06:00', end: '16:30' },
  [ShiftType.SECOND]: { start: '14:00', end: '00:30' },
  [ShiftType.THIRD]: { start: '20:30', end: '07:00' },
};

export const ANCHOR_DATE = new Date('2026-01-09T00:00:00'); // Friday, Week 1
