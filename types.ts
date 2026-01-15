
export enum ShiftType {
  FIRST = '1st Shift',
  SECOND = '2nd Shift',
  THIRD = '3rd Shift'
}

export enum DayStatus {
  WORK = 'ASSIGNED TO STORE #',
  OFF = 'OFF',
  TRAINING = 'TRAINING',
  PTO = 'PTO',
  UNPAID = 'UNPAID',
  CALL_OFF = 'CALL OFF',
  UNSCHEDULED = 'UNSCHEDULED',
  LEAVE_OF_ABSENCE = 'LEAVE OF ABSENCE',
  BEREAVEMENT = 'BEREAVEMENT'
}

export interface Store {
  id: string;
  number: string;
  address: string;
}

export interface RotationDay {
  status: DayStatus;
  startTime: string;
  endTime: string;
}

export interface Employee {
  id: string;
  name: string;
  shift: ShiftType;
  homeStoreId: string;
  allowedStores: string[]; 
  driveTimeStores: string[]; 
  rotation: {
    week1: Record<string, RotationDay>;
    week2: Record<string, RotationDay>;
  };
}

export interface ScheduleEntry {
  employeeId: string;
  date: string;
  storeId: string;
  status: DayStatus;
  startTime: string;
  endTime: string;
  isManualOverride: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  timestamp: number;
}

export interface ChangeLog {
  id: string;
  timestamp: number;
  userName: string;
  action: string;
  field: string;
  oldValue: string;
  newValue: string;
}

export interface GitHubConfig {
  repo: string; // owner/repo
  branch: string;
  token: string;
  path: string; // e.g., 'data.json'
}

export interface AppState {
  district: string;
  darkMode: boolean;
  driveTimeLabel: 'Drive Time' | 'DT';
  stores: Store[];
  employees: Employee[];
  schedule: Record<string, ScheduleEntry>;
  announcements: Announcement[];
  logs: ChangeLog[];
  github?: GitHubConfig;
}
