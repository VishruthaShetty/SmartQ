import {
  Patient,
  Doctor,
  HospitalSettings,
  CrowdLevel,
  LoadBalanceSuggestion,
  PriorityLevel,
  ActivityLog,
  AppNotification,
  QueueEmptyAlert,
  NotificationTargetRole,
} from '../types/queue';
import {
  INITIAL_PATIENTS,
  INITIAL_DOCTORS,
  INITIAL_SETTINGS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_NOTIFICATIONS,
} from '../data/initialData';
import { playHospitalChime, playEmergencyAlertSound } from '../utils/audio';

const STORAGE_KEYS = {
  PATIENTS: 'smartqueue_patients_v2',
  DOCTORS: 'smartqueue_doctors_v2',
  SETTINGS: 'smartqueue_settings_v2',
  ACTIVITY: 'smartqueue_activity_v2',
  NOTIFICATIONS: 'smartqueue_notifications_v3',
  QUEUE_EMPTY_ALERTS: 'smartqueue_empty_alerts_v2',
};

// Listeners for in-memory reactive state
type Listener = () => void;
const listeners: Set<Listener> = new Set();

// Toast notification subscribers
type ToastListener = (notification: AppNotification) => void;
const toastListeners: Set<ToastListener> = new Set();

export function subscribeToToasts(listener: ToastListener) {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}

function emitToast(notif: AppNotification) {
  toastListeners.forEach((cb) => {
    try {
      cb(notif);
    } catch (e) {
      console.error('Error notifying toast listener', e);
    }
  });

  // Browser desktop notification if supported and permitted
  if (typeof window !== 'undefined' && 'Notification' in window) {
    const settings = getStoredSettings();
    if (settings.browserNotificationsEnabled && Notification.permission === 'granted') {
      try {
        new Notification(notif.title, {
          body: notif.message,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.warn('Browser desktop notification failed', e);
      }
    }
  }
}

function emitChange() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error('Error notifying queue listener', e);
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('smartqueue_state_updated'));
  }
}

export function subscribeToQueue(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Storage operations
export function getStoredPatients(): Patient[] {
  if (typeof window === 'undefined') return INITIAL_PATIENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PATIENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(INITIAL_PATIENTS));
      return INITIAL_PATIENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading patients from storage', e);
    return INITIAL_PATIENTS;
  }
}

export function savePatients(patients: Patient[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
    emitChange();
  } catch (e) {
    console.error('Failed saving patients', e);
  }
}

export function getStoredDoctors(): Doctor[] {
  if (typeof window === 'undefined') return INITIAL_DOCTORS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DOCTORS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(INITIAL_DOCTORS));
      return INITIAL_DOCTORS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading doctors from storage', e);
    return INITIAL_DOCTORS;
  }
}

export function saveDoctors(doctors: Doctor[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(doctors));
    emitChange();
  } catch (e) {
    console.error('Failed saving doctors', e);
  }
}

export function getStoredSettings(): HospitalSettings {
  if (typeof window === 'undefined') return INITIAL_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      return INITIAL_SETTINGS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading settings', e);
    return INITIAL_SETTINGS;
  }
}

export function saveSettings(settings: HospitalSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    emitChange();
  } catch (e) {
    console.error('Failed saving settings', e);
  }
}

export function getStoredActivityLogs(): ActivityLog[] {
  if (typeof window === 'undefined') return INITIAL_ACTIVITY_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVITY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(INITIAL_ACTIVITY_LOGS));
      return INITIAL_ACTIVITY_LOGS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading activity logs', e);
    return INITIAL_ACTIVITY_LOGS;
  }
}

export function saveActivityLogs(logs: ActivityLog[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(logs.slice(0, 50)));
    emitChange();
  } catch (e) {
    console.error('Failed saving activity logs', e);
  }
}

export function addActivityLog(log: Omit<ActivityLog, 'id' | 'timestamp'>) {
  const current = getStoredActivityLogs();
  const newLog: ActivityLog = {
    ...log,
    id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
  };
  saveActivityLogs([newLog, ...current]);
}

// Queue Empty Alerts Store
export function getStoredQueueEmptyAlerts(): QueueEmptyAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUEUE_EMPTY_ALERTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveQueueEmptyAlerts(alerts: QueueEmptyAlert[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.QUEUE_EMPTY_ALERTS, JSON.stringify(alerts));
    emitChange();
  } catch (e) {
    console.error('Failed saving queue empty alerts', e);
  }
}

export function clearQueueEmptyAlertForDoctor(doctorId: string) {
  const current = getStoredQueueEmptyAlerts();
  const updated = current.filter((a) => a.doctorId !== doctorId);
  saveQueueEmptyAlerts(updated);
}

// Notifications Store
export function getStoredNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return INITIAL_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading notifications', e);
    return INITIAL_NOTIFICATIONS;
  }
}

export function saveNotifications(notifs: AppNotification[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs.slice(0, 50)));
    emitChange();
  } catch (e) {
    console.error('Failed saving notifications', e);
  }
}

export function addNotification(notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) {
  const current = getStoredNotifications();

  // Prevent duplicate notifications if eventKey exists and is already recorded
  if (notif.eventKey) {
    const exists = current.some((n) => n.eventKey === notif.eventKey);
    if (exists) {
      return null;
    }
  }

  const newNotif: AppNotification = {
    ...notif,
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    read: false,
  };

  saveNotifications([newNotif, ...current]);
  emitToast(newNotif);
  return newNotif;
}

export function markNotificationRead(id: string) {
  const current = getStoredNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveNotifications(updated);
}

export function markAllNotificationsRead(filterFn?: (n: AppNotification) => boolean) {
  const current = getStoredNotifications();
  const updated = current.map((n) => {
    if (!filterFn || filterFn(n)) {
      return { ...n, read: true };
    }
    return n;
  });
  saveNotifications(updated);
}

export function resetToDemoData() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(INITIAL_PATIENTS));
  localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(INITIAL_DOCTORS));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
  localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(INITIAL_ACTIVITY_LOGS));
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
  localStorage.setItem(STORAGE_KEYS.QUEUE_EMPTY_ALERTS, JSON.stringify([]));
  emitChange();
}

/**
 * Filter notifications for specific role context:
 * - Patient: sees only notifications with targetRole === 'all' OR matching targetPatientToken
 * - Doctor: sees targetRole === 'all' OR matching targetDoctorId
 * - Operator: sees targetRole === 'all' OR targetRole === 'operator'
 */
export function filterNotificationsForRole(
  notifications: AppNotification[],
  role: 'patient' | 'doctor' | 'operator' | 'all',
  targetPatientToken?: string,
  targetDoctorId?: string
): AppNotification[] {
  return notifications.filter((n) => {
    if (role === 'all') return true;

    if (role === 'patient') {
      if (n.targetRole === 'all') return true;
      if (n.targetRole === 'patient') {
        if (!targetPatientToken) return true;
        return n.targetPatientToken?.toUpperCase() === targetPatientToken.toUpperCase();
      }
      return false;
    }

    if (role === 'doctor') {
      if (n.targetRole === 'all') return true;
      if (n.targetRole === 'doctor') {
        if (!targetDoctorId) return true;
        return n.targetDoctorId === targetDoctorId;
      }
      return false;
    }

    if (role === 'operator') {
      return n.targetRole === 'all' || n.targetRole === 'operator';
    }

    return true;
  });
}

/**
 * Priority rank comparator:
 * 1. Emergency (highest)
 * 2. Urgent
 * 3. Normal
 * Within same priority: earlier registration time first
 */
export function comparePatientQueuePriority(a: Patient, b: Patient): number {
  const priorityWeight: Record<PriorityLevel, number> = {
    Emergency: 3,
    Urgent: 2,
    Normal: 1,
  };

  const weightA = priorityWeight[a.priority] || 1;
  const weightB = priorityWeight[b.priority] || 1;

  if (weightA !== weightB) {
    return weightB - weightA;
  }

  const timeA = new Date(a.registrationTime).getTime();
  const timeB = new Date(b.registrationTime).getTime();
  return timeA - timeB;
}

/**
 * Get active queue for a specific doctor, sorted by clinical priority & arrival
 */
export function getDoctorActiveQueue(doctorId: string, allPatients: Patient[]): Patient[] {
  return allPatients
    .filter(
      (p) =>
        p.doctorId === doctorId &&
        (p.status === 'Waiting' || p.status === 'Your Turn' || p.status === 'Consulting')
    )
    .sort((a, b) => {
      if (a.status === 'Consulting') return -1;
      if (b.status === 'Consulting') return 1;
      if (a.status === 'Your Turn') return -1;
      if (b.status === 'Your Turn') return 1;
      return comparePatientQueuePriority(a, b);
    });
}

/**
 * Calculate queue position and estimated waiting time for a patient
 */
export function calculatePatientQueuePosition(
  patient: Patient,
  allPatients: Patient[],
  settings: HospitalSettings
): { position: number; estimatedMinutes: number; aheadCount: number } {
  if (patient.status === 'Consulting' || patient.status === 'Your Turn') {
    return { position: 0, estimatedMinutes: 0, aheadCount: 0 };
  }

  if (patient.status !== 'Waiting') {
    return { position: -1, estimatedMinutes: 0, aheadCount: 0 };
  }

  const docQueue = allPatients.filter(
    (p) =>
      p.doctorId === patient.doctorId &&
      (p.status === 'Waiting' || p.status === 'Your Turn' || p.status === 'Consulting')
  );

  const currentlyConsulting = docQueue.find((p) => p.status === 'Consulting');
  const waitingPatients = docQueue
    .filter((p) => p.status === 'Waiting' || p.status === 'Your Turn')
    .sort(comparePatientQueuePriority);

  const idx = waitingPatients.findIndex((p) => p.id === patient.id);
  if (idx === -1) {
    return { position: -1, estimatedMinutes: 0, aheadCount: 0 };
  }

  const aheadCount = idx + (currentlyConsulting ? 1 : 0);
  const position = aheadCount + 1;
  const estimatedMinutes = Math.max(0, aheadCount * settings.averageConsultationMinutes);

  return { position, estimatedMinutes, aheadCount };
}

/**
 * Check and notify queue transitions (e.g. Next-in-line patient)
 */
export function checkAndNotifyQueueTransitions(
  allPatients: Patient[],
  allDoctors: Doctor[],
  settings: HospitalSettings
) {
  allDoctors.forEach((doc) => {
    // Active waiting patients for this doctor
    const waitingPatients = allPatients
      .filter((p) => p.doctorId === doc.id && p.status === 'Waiting')
      .sort(comparePatientQueuePriority);

    if (waitingPatients.length > 0) {
      // The first waiting patient is next in line
      const nextPatient = waitingPatients[0];
      const currentlyConsulting = allPatients.find(
        (p) => p.doctorId === doc.id && p.status === 'Consulting'
      );
      const estMinutes = currentlyConsulting ? settings.averageConsultationMinutes : 0;

      // Unique event key so this patient only receives the next-in-line notification once
      const eventKey = `next_in_line_${nextPatient.id}`;

      addNotification({
        title: 'You Are Next in Line',
        message: `Token ${nextPatient.tokenNumber} (${nextPatient.name}): You are next in line for ${doc.name} in ${doc.roomNumber}. Estimated wait: ~${estMinutes}m. Please prepare to enter.`,
        type: 'next_in_line',
        targetRole: 'patient',
        targetPatientToken: nextPatient.tokenNumber,
        tokenNumber: nextPatient.tokenNumber,
        doctorName: doc.name,
        roomNumber: doc.roomNumber,
        estimatedMinutes: estMinutes,
        status: 'Waiting',
        eventKey,
      });
    }
  });
}

/**
 * Calculate current hospital crowd level based on total waiting/called patients
 */
export function calculateCrowdLevel(allPatients: Patient[], settings: HospitalSettings): {
  level: CrowdLevel;
  totalWaiting: number;
} {
  const totalWaiting = allPatients.filter(
    (p) => p.status === 'Waiting' || p.status === 'Your Turn'
  ).length;

  if (totalWaiting < settings.crowdThresholdMedium) {
    return { level: 'Low', totalWaiting };
  }
  if (totalWaiting <= settings.crowdThresholdHigh) {
    return { level: 'Medium', totalWaiting };
  }
  return { level: 'High', totalWaiting };
}

/**
 * Smart Doctor Load Balancing:
 * Finds imbalance in same department, suggests reassigning a waiting patient
 * with operator approval.
 */
export function findLoadBalancingSuggestions(
  allPatients: Patient[],
  allDoctors: Doctor[],
  settings: HospitalSettings
): LoadBalanceSuggestion[] {
  const suggestions: LoadBalanceSuggestion[] = [];

  const deptMap = new Map<string, Doctor[]>();
  allDoctors.forEach((doc) => {
    if (!deptMap.has(doc.department)) {
      deptMap.set(doc.department, []);
    }
    deptMap.get(doc.department)!.push(doc);
  });

  deptMap.forEach((doctorsInDept, department) => {
    if (doctorsInDept.length < 2) return;

    const doctorQueueLengths = doctorsInDept.map((doc) => {
      const isAvailable = doc.availability === 'Available';
      const queue = allPatients.filter(
        (p) => p.doctorId === doc.id && (p.status === 'Waiting' || p.status === 'Your Turn')
      );
      return {
        doctor: doc,
        queueLength: queue.length,
        isAvailable,
        patients: queue.sort(comparePatientQueuePriority),
      };
    });

    const busyDoctors = doctorQueueLengths
      .filter((d) => d.isAvailable && d.queueLength >= 3)
      .sort((a, b) => b.queueLength - a.queueLength);

    const lightDoctors = doctorQueueLengths
      .filter((d) => d.isAvailable && d.queueLength <= 1)
      .sort((a, b) => a.queueLength - b.queueLength);

    if (busyDoctors.length > 0 && lightDoctors.length > 0) {
      const overloaded = busyDoctors[0];
      const underloaded = lightDoctors[0];

      if (overloaded.queueLength - underloaded.queueLength >= 2) {
        const candidates = overloaded.patients.filter(
          (p) => p.priority === 'Normal' && p.status === 'Waiting'
        );
        const candidate = candidates[candidates.length - 1];

        if (candidate) {
          const timeSaved = Math.max(
            settings.averageConsultationMinutes,
            (overloaded.queueLength - underloaded.queueLength - 1) *
              settings.averageConsultationMinutes
          );

          suggestions.push({
            patientId: candidate.id,
            patientToken: candidate.tokenNumber,
            patientName: candidate.name,
            department,
            currentDoctorId: overloaded.doctor.id,
            currentDoctorName: overloaded.doctor.name,
            currentQueueLength: overloaded.queueLength,
            suggestedDoctorId: underloaded.doctor.id,
            suggestedDoctorName: underloaded.doctor.name,
            suggestedDoctorQueueLength: underloaded.queueLength,
            estimatedTimeSavedMinutes: timeSaved,
          });
        }
      }
    }
  });

  return suggestions;
}

// Queue Action Handlers
export function registerPatient(
  newPatientData: Omit<Patient, 'id' | 'tokenNumber' | 'status' | 'registrationTime'>
): Patient {
  const patients = getStoredPatients();
  const doctors = getStoredDoctors();
  const settings = getStoredSettings();

  const deptPrefixMap: Record<string, string> = {
    'General Medicine': 'GEN',
    'Cardiology': 'CRD',
    'Pediatrics': 'PED',
    'Orthopedics': 'ORT',
    'ENT (Ear, Nose, Throat)': 'ENT',
  };

  const prefix = deptPrefixMap[newPatientData.department] || 'MED';
  const existingWithPrefix = patients.filter((p) => p.tokenNumber.startsWith(prefix));
  const nextNum = 100 + existingWithPrefix.length + 1;
  const tokenNumber = `${prefix}-${nextNum}`;

  const doc = doctors.find((d) => d.id === newPatientData.doctorId);
  const roomNumber = doc ? doc.roomNumber : 'Room 101';

  const newPatient: Patient = {
    ...newPatientData,
    id: `pat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    tokenNumber,
    roomNumber,
    status: 'Waiting',
    registrationTime: new Date().toISOString(),
    appointmentTime: newPatientData.appointmentTime || '10:30 AM',
    appointmentType: newPatientData.appointmentType || 'General Consultation',
    vitals: newPatientData.vitals || { bp: '120/80', pulse: 72, temp: '98.6°F', spo2: 99 },
  };

  const updatedPatients = [newPatient, ...patients];
  savePatients(updatedPatients);

  // Clear any existing Queue Empty alert for this doctor because a new patient joined!
  if (doc) {
    clearQueueEmptyAlertForDoctor(doc.id);
  }

  addActivityLog({
    type: 'registration',
    title: 'New Patient Intake',
    description: `Token ${tokenNumber} (${newPatient.name}) registered for ${doc ? doc.name : 'clinic'}.`,
    tokenNumber,
    patientName: newPatient.name,
    doctorId: doc?.id,
    doctorName: doc?.name,
  });

  if (newPatient.priority === 'Emergency') {
    if (settings.soundAlertsEnabled) {
      playEmergencyAlertSound();
    }
    addNotification({
      title: 'Emergency Priority Registered',
      message: `${newPatient.name} (${tokenNumber}) registered with emergency triage priority for ${doc?.name || 'clinic'}.`,
      type: 'emergency',
      targetRole: 'operator',
      tokenNumber,
      doctorName: doc?.name,
      roomNumber,
      status: 'Waiting',
      eventKey: `emergency_reg_${tokenNumber}`,
    });
  }

  // Check if this patient or another patient became next in line
  checkAndNotifyQueueTransitions(updatedPatients, doctors, settings);

  return newPatient;
}

export function callNextPatient(doctorId: string): Patient | null {
  const patients = getStoredPatients();
  const settings = getStoredSettings();
  const doctors = getStoredDoctors();
  const doc = doctors.find((d) => d.id === doctorId);

  const waitingPatients = patients
    .filter((p) => p.doctorId === doctorId && p.status === 'Waiting')
    .sort(comparePatientQueuePriority);

  if (waitingPatients.length === 0) return null;

  const nextPatient = waitingPatients[0];
  const now = new Date().toISOString();

  const updatedPatients = patients.map((p) => {
    if (p.doctorId === doctorId && p.status === 'Your Turn') {
      return {
        ...p,
        status: 'Consulting' as const,
        consultationStartTime: p.consultationStartTime || now,
      };
    }
    if (p.id === nextPatient.id) {
      return {
        ...p,
        status: 'Your Turn' as const,
        calledTime: now,
        roomNumber: doc ? doc.roomNumber : p.roomNumber,
      };
    }
    return p;
  });

  savePatients(updatedPatients);

  if (settings.soundAlertsEnabled) {
    playHospitalChime();
  }

  addActivityLog({
    type: 'called',
    title: 'Patient Called to Chamber',
    description: `${doc ? doc.name : 'Doctor'} called token ${nextPatient.tokenNumber} (${nextPatient.name}) into ${doc ? doc.roomNumber : 'room'}.`,
    tokenNumber: nextPatient.tokenNumber,
    patientName: nextPatient.name,
    doctorId,
    doctorName: doc?.name,
  });

  // Targeted Turn Alert for this specific patient
  addNotification({
    title: 'Your Turn! Please Enter Room',
    message: `Token ${nextPatient.tokenNumber}: You are now being called by ${doc?.name || 'your physician'} into ${doc?.roomNumber || nextPatient.roomNumber}. Please enter immediately.`,
    type: 'turn_alert',
    targetRole: 'patient',
    targetPatientToken: nextPatient.tokenNumber,
    tokenNumber: nextPatient.tokenNumber,
    doctorName: doc?.name,
    roomNumber: doc?.roomNumber,
    estimatedMinutes: 0,
    status: 'Your Turn',
    eventKey: `called_${nextPatient.id}_${now}`,
  });

  // Check if next waiting patient moved to position #1
  checkAndNotifyQueueTransitions(updatedPatients, doctors, settings);

  return nextPatient;
}

export function startConsultation(patientId: string) {
  const patients = getStoredPatients();
  const docList = getStoredDoctors();
  const now = new Date().toISOString();

  let targetPatient: Patient | null = null;
  const updated = patients.map((p) => {
    if (p.id === patientId) {
      targetPatient = p;
      return {
        ...p,
        status: 'Consulting' as const,
        consultationStartTime: now,
      };
    }
    return p;
  });

  savePatients(updated);

  if (targetPatient) {
    const doc = docList.find((d) => d.id === (targetPatient as Patient).doctorId);
    addActivityLog({
      type: 'consultation_start',
      title: 'Consultation In Session',
      description: `${doc ? doc.name : 'Doctor'} started consultation with ${(targetPatient as Patient).tokenNumber}.`,
      tokenNumber: (targetPatient as Patient).tokenNumber,
      patientName: (targetPatient as Patient).name,
      doctorId: doc?.id,
      doctorName: doc?.name,
    });
  }
}

export function completeConsultation(patientId: string, notes?: string) {
  const patients = getStoredPatients();
  const docList = getStoredDoctors();
  const settings = getStoredSettings();
  const now = new Date();
  const nowIso = now.toISOString();

  let targetPatient: Patient | null = null;
  const updated = patients.map((p) => {
    if (p.id === patientId) {
      if (p.status !== 'Consulting') {
        return p;
      }
      targetPatient = p;
      let duration = 10;
      if (p.consultationStartTime) {
        const start = new Date(p.consultationStartTime).getTime();
        const diffMinutes = Math.max(1, Math.round((now.getTime() - start) / (1000 * 60)));
        duration = diffMinutes;
      }
      return {
        ...p,
        status: 'Completed' as const,
        consultationEndTime: nowIso,
        consultationDurationMinutes: duration,
        notes: notes !== undefined ? notes : p.notes,
      };
    }
    return p;
  });

  savePatients(updated);

  if (targetPatient) {
    const doc = docList.find((d) => d.id === (targetPatient as Patient).doctorId);
    addActivityLog({
      type: 'completed',
      title: 'Consultation Completed',
      description: `${doc ? doc.name : 'Doctor'} finished visit for ${(targetPatient as Patient).tokenNumber} (${(targetPatient as Patient).name}).`,
      tokenNumber: (targetPatient as Patient).tokenNumber,
      patientName: (targetPatient as Patient).name,
      doctorId: doc?.id,
      doctorName: doc?.name,
    });

    // Notify patient of completion
    addNotification({
      title: 'Consultation Concluded',
      message: `Token ${(targetPatient as Patient).tokenNumber}: Your visit with ${doc?.name || 'your physician'} has concluded. Notes and summary recorded.`,
      type: 'system',
      targetRole: 'patient',
      targetPatientToken: (targetPatient as Patient).tokenNumber,
      tokenNumber: (targetPatient as Patient).tokenNumber,
      doctorName: doc?.name,
      roomNumber: doc?.roomNumber,
      status: 'Completed',
      eventKey: `completed_${(targetPatient as Patient).id}`,
    });

    // Check if waiting queue for this doctor is now empty
    if (doc) {
      const remainingWaitingForDoctor = updated.filter(
        (p) => p.doctorId === doc.id && (p.status === 'Waiting' || p.status === 'Your Turn')
      );

      if (remainingWaitingForDoctor.length === 0) {
        // Queue is now empty for this doctor!
        const existingAlerts = getStoredQueueEmptyAlerts();
        const alertExists = existingAlerts.some((a) => a.doctorId === doc.id);

        if (!alertExists) {
          const newAlert: QueueEmptyAlert = {
            doctorId: doc.id,
            doctorName: doc.name,
            roomNumber: doc.roomNumber,
            department: doc.department,
            timestamp: nowIso,
          };
          saveQueueEmptyAlerts([...existingAlerts, newAlert]);
        }

        // Notify operator (idempotent key so it does not re-trigger repeatedly)
        addNotification({
          title: 'Queue Empty: Doctor Ready',
          message: `The queue for ${doc.name} (${doc.roomNumber} - ${doc.department}) is now empty. All waiting patients have been completed.`,
          type: 'queue_empty',
          targetRole: 'operator',
          targetDoctorId: doc.id,
          doctorName: doc.name,
          roomNumber: doc.roomNumber,
          status: 'Completed',
          eventKey: `queue_empty_${doc.id}_${nowIso.slice(0, 16)}`,
        });

        // Also notify the doctor console
        addNotification({
          title: 'Queue Completed',
          message: `All waiting consultations have been completed. Consultation chamber is currently free.`,
          type: 'queue_empty',
          targetRole: 'doctor',
          targetDoctorId: doc.id,
          doctorName: doc.name,
          roomNumber: doc.roomNumber,
          eventKey: `queue_empty_doc_${doc.id}_${nowIso.slice(0, 16)}`,
        });
      }
    }
  }

  // Advance transitions for remaining queue
  checkAndNotifyQueueTransitions(updated, docList, settings);
}

export function skipPatient(patientId: string, reason?: string) {
  const patients = getStoredPatients();
  const docList = getStoredDoctors();
  const settings = getStoredSettings();
  let targetPatient: Patient | null = null;

  const updated = patients.map((p) => {
    if (p.id === patientId) {
      targetPatient = p;
      return {
        ...p,
        status: 'Skipped' as const,
        skipReason: reason || 'Patient was unavailable when called',
      };
    }
    return p;
  });

  savePatients(updated);

  if (targetPatient) {
    const doc = docList.find((d) => d.id === (targetPatient as Patient).doctorId);
    addActivityLog({
      type: 'skipped',
      title: 'Patient Skipped / Delayed',
      description: `Token ${(targetPatient as Patient).tokenNumber} marked skipped: ${reason || 'Absent at callout'}.`,
      tokenNumber: (targetPatient as Patient).tokenNumber,
      patientName: (targetPatient as Patient).name,
      doctorId: doc?.id,
      doctorName: doc?.name,
    });

    addNotification({
      title: 'Token Skipped',
      message: `Token ${(targetPatient as Patient).tokenNumber} was marked absent during callout for ${doc?.roomNumber}. Visit operator to rejoin queue.`,
      type: 'turn_alert',
      targetRole: 'patient',
      targetPatientToken: (targetPatient as Patient).tokenNumber,
      tokenNumber: (targetPatient as Patient).tokenNumber,
      doctorName: doc?.name,
      roomNumber: doc?.roomNumber,
      status: 'Skipped',
      eventKey: `skipped_${(targetPatient as Patient).id}_${Date.now()}`,
    });
  }

  checkAndNotifyQueueTransitions(updated, docList, settings);
}

export function markNoShow(patientId: string) {
  const patients = getStoredPatients();
  let targetPatient: Patient | null = null;

  const updated = patients.map((p) => {
    if (p.id === patientId) {
      targetPatient = p;
      return {
        ...p,
        status: 'No-show' as const,
        skipReason: 'Confirmed no-show after multiple callouts',
      };
    }
    return p;
  });

  savePatients(updated);

  if (targetPatient) {
    addActivityLog({
      type: 'skipped',
      title: 'Marked No-Show',
      description: `Token ${(targetPatient as Patient).tokenNumber} marked No-show by clinic staff.`,
      tokenNumber: (targetPatient as Patient).tokenNumber,
      patientName: (targetPatient as Patient).name,
    });
  }
}

export function cancelAppointment(patientId: string, reason?: string) {
  const patients = getStoredPatients();
  const doctors = getStoredDoctors();
  const settings = getStoredSettings();
  let targetPatient: Patient | null = null;

  const updated = patients.map((p) => {
    if (p.id === patientId) {
      targetPatient = p;
      return {
        ...p,
        status: 'Cancelled' as const,
        notes: reason ? `Cancelled by patient: ${reason}` : p.notes,
      };
    }
    return p;
  });

  savePatients(updated);

  if (targetPatient) {
    addActivityLog({
      type: 'cancelled',
      title: 'Appointment Cancelled',
      description: `Token ${(targetPatient as Patient).tokenNumber} cancelled by patient: ${reason || 'Change of schedule'}.`,
      tokenNumber: (targetPatient as Patient).tokenNumber,
      patientName: (targetPatient as Patient).name,
    });

    // Notify doctor
    addNotification({
      title: 'Appointment Cancelled',
      message: `Token ${(targetPatient as Patient).tokenNumber} (${(targetPatient as Patient).name}) was cancelled by the patient.`,
      type: 'system',
      targetRole: 'doctor',
      targetDoctorId: (targetPatient as Patient).doctorId,
      tokenNumber: (targetPatient as Patient).tokenNumber,
      eventKey: `cancelled_${(targetPatient as Patient).id}`,
    });
  }

  checkAndNotifyQueueTransitions(updated, doctors, settings);
}

export function rescheduleAppointment(patientId: string, newTime: string) {
  const patients = getStoredPatients();
  const doctors = getStoredDoctors();
  const settings = getStoredSettings();
  let targetPatient: Patient | null = null;

  const updated = patients.map((p) => {
    if (p.id === patientId) {
      targetPatient = p;
      return {
        ...p,
        appointmentTime: newTime,
        status: 'Waiting' as const,
        registrationTime: new Date().toISOString(),
      };
    }
    return p;
  });

  savePatients(updated);

  if (targetPatient) {
    addActivityLog({
      type: 'rejoined',
      title: 'Appointment Rescheduled',
      description: `Token ${(targetPatient as Patient).tokenNumber} rescheduled to ${newTime}.`,
      tokenNumber: (targetPatient as Patient).tokenNumber,
      patientName: (targetPatient as Patient).name,
    });

    addNotification({
      title: 'Appointment Rescheduled',
      message: `Token ${(targetPatient as Patient).tokenNumber}: Your appointment slot has been updated to ${newTime}.`,
      type: 'system',
      targetRole: 'patient',
      targetPatientToken: (targetPatient as Patient).tokenNumber,
      tokenNumber: (targetPatient as Patient).tokenNumber,
      eventKey: `rescheduled_${(targetPatient as Patient).id}_${newTime}`,
    });
  }

  checkAndNotifyQueueTransitions(updated, doctors, settings);
}

export function rejoinQueue(patientId: string) {
  const patients = getStoredPatients();
  const doctors = getStoredDoctors();
  const settings = getStoredSettings();
  const now = new Date().toISOString();
  let targetPatient: Patient | null = null;

  const updated = patients.map((p) => {
    if (p.id === patientId) {
      targetPatient = p;
      return {
        ...p,
        status: 'Waiting' as const,
        registrationTime: now,
        skipReason: undefined,
      };
    }
    return p;
  });

  savePatients(updated);

  if (targetPatient) {
    const doc = doctors.find((d) => d.id === (targetPatient as Patient).doctorId);
    if (doc) {
      clearQueueEmptyAlertForDoctor(doc.id);
    }

    addActivityLog({
      type: 'rejoined',
      title: 'Patient Rejoined Queue',
      description: `Token ${(targetPatient as Patient).tokenNumber} reinstated into active queue.`,
      tokenNumber: (targetPatient as Patient).tokenNumber,
      patientName: (targetPatient as Patient).name,
    });

    addNotification({
      title: 'Rejoined Waiting Line',
      message: `Token ${(targetPatient as Patient).tokenNumber}: Reinstated into active queue for ${doc?.name || 'physician'}.`,
      type: 'system',
      targetRole: 'patient',
      targetPatientToken: (targetPatient as Patient).tokenNumber,
      tokenNumber: (targetPatient as Patient).tokenNumber,
      doctorName: doc?.name,
      roomNumber: doc?.roomNumber,
      status: 'Waiting',
      eventKey: `rejoined_${(targetPatient as Patient).id}_${now}`,
    });
  }

  checkAndNotifyQueueTransitions(updated, doctors, settings);
}

export function reassignPatientDoctor(patientId: string, newDoctorId: string) {
  const patients = getStoredPatients();
  const doctors = getStoredDoctors();
  const settings = getStoredSettings();
  const newDoctor = doctors.find((d) => d.id === newDoctorId);
  let targetPatient: Patient | null = null;
  let oldDoctorId: string | undefined;

  const updated = patients.map((p) => {
    if (p.id === patientId) {
      targetPatient = p;
      oldDoctorId = p.doctorId;
      return {
        ...p,
        doctorId: newDoctorId,
        roomNumber: newDoctor ? newDoctor.roomNumber : p.roomNumber,
        department: newDoctor ? newDoctor.department : p.department,
      };
    }
    return p;
  });

  savePatients(updated);

  // Clear queue-empty alert for the new doctor
  clearQueueEmptyAlertForDoctor(newDoctorId);

  // Check if old doctor's queue is now empty
  if (oldDoctorId) {
    const remainingOld = updated.filter(
      (p) => p.doctorId === oldDoctorId && (p.status === 'Waiting' || p.status === 'Your Turn')
    );
    if (remainingOld.length === 0) {
      const oldDoc = doctors.find((d) => d.id === oldDoctorId);
      if (oldDoc) {
        const existingAlerts = getStoredQueueEmptyAlerts();
        if (!existingAlerts.some((a) => a.doctorId === oldDoc.id)) {
          saveQueueEmptyAlerts([
            ...existingAlerts,
            {
              doctorId: oldDoc.id,
              doctorName: oldDoc.name,
              roomNumber: oldDoc.roomNumber,
              department: oldDoc.department,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      }
    }
  }

  if (targetPatient && newDoctor) {
    addActivityLog({
      type: 'reassigned',
      title: 'Doctor Reassigned',
      description: `Token ${(targetPatient as Patient).tokenNumber} reassigned to ${newDoctor.name} (${newDoctor.roomNumber}).`,
      tokenNumber: (targetPatient as Patient).tokenNumber,
      patientName: (targetPatient as Patient).name,
      doctorId: newDoctor.id,
      doctorName: newDoctor.name,
    });

    // Notify patient
    addNotification({
      title: 'Queue Rebalanced: Physician Updated',
      message: `Token ${(targetPatient as Patient).tokenNumber}: Reassigned to ${newDoctor.name} in ${newDoctor.roomNumber} for faster consultation.`,
      type: 'reassigned',
      targetRole: 'patient',
      targetPatientToken: (targetPatient as Patient).tokenNumber,
      tokenNumber: (targetPatient as Patient).tokenNumber,
      doctorName: newDoctor.name,
      roomNumber: newDoctor.roomNumber,
      status: 'Waiting',
      eventKey: `reassigned_${(targetPatient as Patient).id}_${newDoctor.id}`,
    });
  }

  checkAndNotifyQueueTransitions(updated, doctors, settings);
}

export function changePatientPriority(patientId: string, newPriority: PriorityLevel, reason?: string) {
  const patients = getStoredPatients();
  const doctors = getStoredDoctors();
  const settings = getStoredSettings();
  let targetPatient: Patient | null = null;

  const updated = patients.map((p) => {
    if (p.id === patientId) {
      targetPatient = p;
      return {
        ...p,
        priority: newPriority,
        emergencyReason: newPriority === 'Emergency' ? reason || 'Clinical emergency escalation' : undefined,
      };
    }
    return p;
  });

  savePatients(updated);

  if (targetPatient) {
    addActivityLog({
      type: 'priority_change',
      title: 'Triage Priority Updated',
      description: `Priority for ${(targetPatient as Patient).tokenNumber} updated to ${newPriority}. Reason: ${reason || 'Clinical triage decision'}.`,
      tokenNumber: (targetPatient as Patient).tokenNumber,
      patientName: (targetPatient as Patient).name,
    });

    // If emergency priority, notify operator & doctor
    if (newPriority === 'Emergency') {
      const doc = doctors.find((d) => d.id === (targetPatient as Patient).doctorId);
      addNotification({
        title: 'Emergency Priority Escalation',
        message: `Token ${(targetPatient as Patient).tokenNumber} (${(targetPatient as Patient).name}) escalated to Emergency Priority for ${doc?.name || 'clinic'}.`,
        type: 'emergency',
        targetRole: 'operator',
        tokenNumber: (targetPatient as Patient).tokenNumber,
        doctorName: doc?.name,
        roomNumber: doc?.roomNumber,
        eventKey: `emergency_escalate_${(targetPatient as Patient).id}_${Date.now()}`,
      });
    }
  }

  checkAndNotifyQueueTransitions(updated, doctors, settings);
}

export function updateDoctorAvailability(doctorId: string, availability: Doctor['availability']) {
  const doctors = getStoredDoctors();
  const updated = doctors.map((d) => (d.id === doctorId ? { ...d, availability } : d));
  saveDoctors(updated);

  const doc = doctors.find((d) => d.id === doctorId);
  if (doc) {
    addActivityLog({
      type: 'reassigned',
      title: 'Doctor Availability Changed',
      description: `${doc.name} updated status to ${availability}.`,
      doctorId: doc.id,
      doctorName: doc.name,
    });
  }
}
