export type QueueStatus =
  | 'Waiting'
  | 'Your Turn'
  | 'Consulting'
  | 'Completed'
  | 'No-show'
  | 'Skipped'
  | 'Cancelled';

export type PriorityLevel = 'Normal' | 'Urgent' | 'Emergency';

export type DoctorAvailability = 'Available' | 'On Break' | 'Emergency Duty';

export type AppointmentType =
  | 'General Consultation'
  | 'Follow-up Review'
  | 'Prescription Refill'
  | 'Diagnostic Review'
  | 'Specialist Evaluation';

export interface PatientVitals {
  bp?: string;
  pulse?: number;
  temp?: string;
  spo2?: number;
  weight?: string;
}

export interface Doctor {
  id: string;
  name: string;
  department: string;
  roomNumber: string;
  specialization: string;
  shiftHours: string;
  availability: DoctorAvailability;
  avatarUrl?: string;
}

export interface Patient {
  id: string;
  tokenNumber: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone?: string;
  department: string;
  doctorId: string;
  roomNumber: string;
  priority: PriorityLevel;
  emergencyReason?: string;
  status: QueueStatus;
  appointmentType?: AppointmentType;
  appointmentTime?: string;
  registrationTime: string; // ISO string
  calledTime?: string;
  consultationStartTime?: string;
  consultationEndTime?: string;
  consultationDurationMinutes?: number;
  notes?: string;
  skipReason?: string;
  vitals?: PatientVitals;
}

export type CrowdLevel = 'Low' | 'Medium' | 'High';

export interface HospitalSettings {
  averageConsultationMinutes: number;
  crowdThresholdMedium: number;
  crowdThresholdHigh: number;
  soundAlertsEnabled: boolean;
  browserNotificationsEnabled?: boolean;
  hospitalName: string;
  announcementText: string;
}

export interface LoadBalanceSuggestion {
  patientId: string;
  patientToken: string;
  patientName: string;
  department: string;
  currentDoctorId: string;
  currentDoctorName: string;
  currentQueueLength: number;
  suggestedDoctorId: string;
  suggestedDoctorName: string;
  suggestedDoctorQueueLength: number;
  estimatedTimeSavedMinutes: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type:
    | 'registration'
    | 'called'
    | 'consultation_start'
    | 'completed'
    | 'skipped'
    | 'rejoined'
    | 'reassigned'
    | 'priority_change'
    | 'cancelled';
  title: string;
  description: string;
  tokenNumber?: string;
  patientName?: string;
  doctorId?: string;
  doctorName?: string;
}

export type NotificationTargetRole = 'all' | 'patient' | 'doctor' | 'operator';

export type NotificationType =
  | 'turn_alert'
  | 'next_in_line'
  | 'queue_empty'
  | 'wait_time_change'
  | 'emergency'
  | 'system'
  | 'reassigned';

export interface AppNotification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: NotificationType;
  targetRole: NotificationTargetRole;
  targetPatientToken?: string;
  targetDoctorId?: string;
  tokenNumber?: string;
  doctorName?: string;
  roomNumber?: string;
  estimatedMinutes?: number;
  status?: QueueStatus;
  read: boolean;
  eventKey?: string;
}

export interface QueueEmptyAlert {
  doctorId: string;
  doctorName: string;
  roomNumber: string;
  department: string;
  timestamp: string;
}
