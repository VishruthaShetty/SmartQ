import React, { useState, useEffect, useMemo } from 'react';
import { Doctor, Patient, HospitalSettings, PriorityLevel, QueueStatus, AppNotification } from '../../types/queue';
import {
  callNextPatient,
  startConsultation,
  completeConsultation,
  skipPatient,
  markNoShow,
  rejoinQueue,
  updateDoctorAvailability,
  getDoctorActiveQueue,
} from '../../services/storage';
import { NotificationBell } from '../notifications/NotificationBell';
import {
  Stethoscope,
  Clock,
  Play,
  CheckCircle,
  SkipForward,
  RotateCcw,
  AlertCircle,
  User,
  Coffee,
  ShieldAlert,
  ChevronDown,
  FileText,
  Filter,
  Eye,
  CheckCircle2,
  X,
  Activity,
  AlertTriangle,
  UserCheck,
  Building,
} from 'lucide-react';
import { playHospitalChime } from '../../utils/audio';

interface DoctorDashboardProps {
  doctors: Doctor[];
  patients: Patient[];
  settings: HospitalSettings;
  activeDoctorId: string;
  onSelectDoctor: (doctorId: string) => void;
  notifications?: AppNotification[];
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  doctors,
  patients,
  settings,
  activeDoctorId,
  onSelectDoctor,
  notifications = [],
}) => {
  const [consultationNotes, setConsultationNotes] = useState('');
  const [skipModalPatient, setSkipModalPatient] = useState<Patient | null>(null);
  const [skipReasonInput, setSkipReasonInput] = useState(
    'Patient absent when called multiple times'
  );
  const [inspectPatient, setInspectPatient] = useState<Patient | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Table Filters
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const currentDoctor = useMemo(() => {
    return doctors.find((d) => d.id === activeDoctorId) || doctors[0];
  }, [doctors, activeDoctorId]);

  // All patients assigned to this doctor
  const doctorAllPatients = useMemo(() => {
    if (!currentDoctor) return [];
    return patients.filter((p) => p.doctorId === currentDoctor.id);
  }, [patients, currentDoctor]);

  // Active sorted queue for this doctor
  const doctorActiveQueue = useMemo(() => {
    if (!currentDoctor) return [];
    return getDoctorActiveQueue(currentDoctor.id, patients);
  }, [currentDoctor, patients]);

  // Patient in room consulting
  const activeConsultingPatient = useMemo(() => {
    return doctorActiveQueue.find((p) => p.status === 'Consulting') || null;
  }, [doctorActiveQueue]);

  // Patient called to room
  const currentlyCalledPatient = useMemo(() => {
    return doctorActiveQueue.find((p) => p.status === 'Your Turn') || null;
  }, [doctorActiveQueue]);

  const waitingPatients = useMemo(() => {
    return doctorActiveQueue.filter((p) => p.status === 'Waiting');
  }, [doctorActiveQueue]);

  const completedToday = useMemo(() => {
    return doctorAllPatients.filter((p) => p.status === 'Completed');
  }, [doctorAllPatients]);

  const emergencyCount = useMemo(() => {
    return doctorAllPatients.filter(
      (p) =>
        p.priority === 'Emergency' &&
        (p.status === 'Waiting' || p.status === 'Your Turn' || p.status === 'Consulting')
    ).length;
  }, [doctorAllPatients]);

  // Filtered queue for table
  const filteredQueue = useMemo(() => {
    return doctorActiveQueue.filter((p) => {
      const matchPriority = priorityFilter === 'ALL' || p.priority === priorityFilter;
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchPriority && matchStatus;
    });
  }, [doctorActiveQueue, priorityFilter, statusFilter]);

  // Live stopwatch timer for consulting patient
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (activeConsultingPatient && activeConsultingPatient.consultationStartTime) {
      const startMs = new Date(activeConsultingPatient.consultationStartTime).getTime();
      const updateTimer = () => {
        const diff = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        setTimerSeconds(diff);
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setTimerSeconds(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeConsultingPatient]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCallNext = () => {
    if (!currentDoctor) return;
    callNextPatient(currentDoctor.id);
  };

  const handleStartConsultation = (patientId: string) => {
    startConsultation(patientId);
  };

  const handleCompleteConsultation = (patientId: string) => {
    // Prevent completing a consultation that hasn't started
    if (!activeConsultingPatient || activeConsultingPatient.id !== patientId) {
      alert('Cannot complete a visit that is not currently in consultation.');
      return;
    }
    completeConsultation(patientId, consultationNotes);
    setConsultationNotes('');
  };

  const handleSkipConfirm = () => {
    if (!skipModalPatient) return;
    skipPatient(skipModalPatient.id, skipReasonInput);
    setSkipModalPatient(null);
  };

  if (!currentDoctor) {
    return <div className="p-8 text-center text-slate-500">No doctor account selected.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Compact Clinical Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {currentDoctor.name}
                </h1>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  {currentDoctor.roomNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentDoctor.department} · {currentDoctor.specialization} · Shift:{' '}
                <span className="font-medium text-slate-700">{currentDoctor.shiftHours}</span>
              </p>
            </div>
          </div>

          {/* Right Controls: Doctor Switcher + Availability Toggles */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                value={currentDoctor.id}
                onChange={(e) => onSelectDoctor(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-600"
              >
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} ({doc.roomNumber} - {doc.department})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Availability Mode Buttons */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
              <button
                onClick={() => updateDoctorAvailability(currentDoctor.id, 'Available')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  currentDoctor.availability === 'Available'
                    ? 'bg-white text-emerald-800 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Available
              </button>
              <button
                onClick={() => updateDoctorAvailability(currentDoctor.id, 'On Break')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  currentDoctor.availability === 'On Break'
                    ? 'bg-white text-amber-800 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Coffee className="w-3 h-3" />
                <span>On Break</span>
              </button>
              <button
                onClick={() => updateDoctorAvailability(currentDoctor.id, 'Emergency Duty')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  currentDoctor.availability === 'Emergency Duty'
                    ? 'bg-white text-rose-800 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldAlert className="w-3 h-3" />
                <span>Emergency Duty</span>
              </button>
            </div>

            {/* Doctor Clinical Alerts Notification Bell */}
            <NotificationBell
              notifications={notifications}
              role="doctor"
              doctorId={currentDoctor.id}
              label="Doctor Alerts"
            />
          </div>
        </div>

        {/* 4 Daily Overview Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70">
            <div className="text-slate-500 font-medium">Waiting Patients</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums flex items-baseline gap-2">
              <span>{waitingPatients.length}</span>
              {waitingPatients.length === 0 && !activeConsultingPatient && (
                <span className="text-[10px] font-bold font-sans px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                  Queue Empty
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {waitingPatients.length === 0 && !activeConsultingPatient
                ? 'All consultations concluded'
                : currentlyCalledPatient
                ? '1 currently called'
                : 'Ready for next call'}
            </div>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70">
            <div className="text-slate-500 font-medium">Completed Today</div>
            <div className="text-2xl font-bold font-mono text-emerald-800 mt-1 tabular-nums">
              {completedToday.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Visits concluded</div>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70">
            <div className="text-slate-500 font-medium">Avg Consultation Duration</div>
            <div className="text-2xl font-bold font-mono text-teal-800 mt-1 tabular-nums">
              ~{settings.averageConsultationMinutes}m
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Clinic standard pacing</div>
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70">
            <div className="text-slate-500 font-medium">Emergency Triage Alert</div>
            <div className="text-2xl font-bold font-mono text-rose-700 mt-1 tabular-nums">
              {emergencyCount}
            </div>
            <div className="text-[11px] text-rose-600 font-medium mt-0.5">
              {emergencyCount > 0 ? 'Requires priority attention' : 'No emergency pending'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Clinical Chamber & Queue Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Consultation Chamber */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Chamber Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Consultation Chamber ({currentDoctor.roomNumber})
                </h2>
                <p className="text-xs text-slate-500">Live clinical interaction and session controls</p>
              </div>

              {/* Stopwatch Timer */}
              {activeConsultingPatient && (
                <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-xs font-mono font-bold text-teal-300 tabular-nums">
                    {formatTimer(timerSeconds)}
                  </span>
                </div>
              )}
            </div>

            {/* Chamber State 1: Patient In Room */}
            {activeConsultingPatient ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-extrabold font-mono text-teal-900">
                        {activeConsultingPatient.tokenNumber}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-bold bg-teal-200 text-teal-900 rounded">
                        In Session
                      </span>
                      {activeConsultingPatient.priority === 'Emergency' && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-rose-600 text-white rounded">
                          Emergency
                        </span>
                      )}
                    </div>
                    <div className="text-base font-bold text-slate-900 mt-1">
                      {activeConsultingPatient.name}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Age: {activeConsultingPatient.age} · Gender: {activeConsultingPatient.gender} · BP:{' '}
                      <span className="font-mono">{activeConsultingPatient.vitals?.bp || '120/80'}</span> · Pulse:{' '}
                      <span className="font-mono">{activeConsultingPatient.vitals?.pulse || 72} bpm</span>
                    </div>
                    {activeConsultingPatient.notes && (
                      <div className="text-xs text-slate-600 mt-1.5 bg-white/70 p-2 rounded border border-teal-100">
                        <strong>Chief Complaint:</strong> {activeConsultingPatient.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleCompleteConsultation(activeConsultingPatient.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Complete Consultation</span>
                    </button>
                    <button
                      onClick={() => setSkipModalPatient(activeConsultingPatient)}
                      className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 border border-slate-200 transition-colors"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      <span>Mark Absent / Skip</span>
                    </button>
                  </div>
                </div>

                {/* Clinical Notes Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-teal-700" />
                    <span>Clinical Diagnosis, Orders & Prescription Summary</span>
                  </label>
                  <textarea
                    rows={2}
                    value={consultationNotes}
                    onChange={(e) => setConsultationNotes(e.target.value)}
                    placeholder="Document clinical diagnosis, prescriptions, follow-up advice..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-600 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>
            ) : currentlyCalledPatient ? (
              /* Chamber State 2: Patient Called, Awaiting Entry */
              <div className="p-5 rounded-xl bg-amber-50 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold font-mono text-amber-950">
                      {currentlyCalledPatient.tokenNumber}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-bold bg-amber-200 text-amber-900 rounded">
                      Door Chime Activated
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {currentlyCalledPatient.name} (Age: {currentlyCalledPatient.age})
                  </div>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Patient has been notified via display board and chime. Click &ldquo;Start
                    Consultation&rdquo; once patient enters the room.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleStartConsultation(currentlyCalledPatient.id)}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start Consultation</span>
                  </button>
                  <button
                    onClick={() => setSkipModalPatient(currentlyCalledPatient)}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200"
                  >
                    Skip
                  </button>
                </div>
              </div>
            ) : (
              /* Chamber State 3: Ready for Next Patient or Queue Empty */
              <div className="p-8 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-300">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${
                  waitingPatients.length === 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-400'
                }`}>
                  <User className="w-6 h-6" />
                </div>
                {waitingPatients.length === 0 ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-2 border border-amber-200">
                    <span>Queue Status: Queue Empty</span>
                  </div>
                ) : null}
                <h3 className="text-sm font-bold text-slate-800">
                  {waitingPatients.length > 0 ? 'Consultation Chamber Ready' : 'Chamber Free · Queue Empty'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  {waitingPatients.length > 0
                    ? `${waitingPatients.length} patient${
                        waitingPatients.length > 1 ? 's' : ''
                      } waiting in line for ${currentDoctor.name}.`
                    : `All active consultations for ${currentDoctor.name} are completed. Operator dashboard has been notified that this chamber queue is empty.`}
                </p>
                <button
                  onClick={handleCallNext}
                  disabled={waitingPatients.length === 0}
                  className={`px-5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 mx-auto transition-all shadow-2xs ${
                    waitingPatients.length > 0
                      ? 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  <span>Call Next Patient</span>
                </button>
              </div>
            )}
          </div>

          {/* Patient Queue Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Doctor Patient Queue ({filteredQueue.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Strictly ordered by triage priority & registration arrival time
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Normal">Normal</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Waiting">Waiting</option>
                  <option value="Your Turn">Your Turn</option>
                  <option value="Consulting">In Consultation</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Pos</th>
                    <th className="py-2.5 px-3 font-semibold">Token</th>
                    <th className="py-2.5 px-3 font-semibold">Patient Name</th>
                    <th className="py-2.5 px-3 font-semibold">Appt Time</th>
                    <th className="py-2.5 px-3 font-semibold">Priority</th>
                    <th className="py-2.5 px-3 font-semibold">Vitals</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No patients in active queue matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-600">
                          {p.status === 'Consulting' ? (
                            <span className="text-teal-700 font-bold">Room</span>
                          ) : (
                            `#${idx + 1}`
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {p.tokenNumber}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-500">
                            Age {p.age} · {p.gender}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">
                          {p.appointmentTime || '09:30 AM'}
                        </td>
                        <td className="py-3 px-3">
                          {p.priority === 'Emergency' ? (
                            <span className="px-2 py-0.5 font-bold rounded bg-rose-100 text-rose-800 text-[10px]">
                              Emergency
                            </span>
                          ) : p.priority === 'Urgent' ? (
                            <span className="px-2 py-0.5 font-bold rounded bg-amber-100 text-amber-800 text-[10px]">
                              Urgent
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {p.vitals?.bp ? `${p.vitals.bp} · ${p.vitals.pulse}bpm` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setInspectPatient(p)}
                              title="View Patient Chart"
                              className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {p.status === 'Waiting' && (
                              <button
                                onClick={() => handleCallNext()}
                                className="px-2 py-1 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded border border-teal-200"
                              >
                                Call
                              </button>
                            )}
                            <button
                              onClick={() => setSkipModalPatient(p)}
                              className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200"
                            >
                              Skip
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Clinic History & Patient Chart Quick View */}
        <div className="space-y-6">
          {/* Missed / Skipped Recovery List */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-1">Missed Turn Management</h2>
            <p className="text-xs text-slate-500 mb-3">
              Patients marked absent can be rejoined when they return
            </p>

            <div className="space-y-2">
              {doctorAllPatients
                .filter((p) => p.status === 'Skipped' || p.status === 'No-show')
                .slice(0, 6)
                .map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/60 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-800">{p.tokenNumber}</span>
                        <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                          {p.status}
                        </span>
                      </div>
                      <div className="text-slate-600 text-[11px] truncate max-w-[130px]">{p.name}</div>
                    </div>

                    <button
                      onClick={() => rejoinQueue(p.id)}
                      className="px-2 py-1 text-[11px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded border border-teal-200 flex items-center gap-1 shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Rejoin</span>
                    </button>
                  </div>
                ))}
              {doctorAllPatients.filter((p) => p.status === 'Skipped' || p.status === 'No-show')
                .length === 0 && (
                <div className="py-4 text-center text-xs text-slate-400">
                  No skipped patients in log.
                </div>
              )}
            </div>
          </div>

          {/* Today's Completed Visits for this Doctor */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-1">Recent Completed Visits</h2>
            <p className="text-xs text-slate-500 mb-3">Today's concluded consultations</p>

            <div className="space-y-2 text-xs">
              {completedToday.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/40 flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-800">{p.tokenNumber}</span>
                    <span className="text-slate-600 text-[11px] ml-2">{p.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {p.consultationDurationMinutes ? `${p.consultationDurationMinutes}m` : '10m'}
                  </span>
                </div>
              ))}
              {completedToday.length === 0 && (
                <div className="py-4 text-center text-xs text-slate-400">No completed visits yet today.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Patient Detail Clinical Drawer/Modal */}
      {inspectPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider">
                  Outpatient Medical Record
                </span>
                <h3 className="text-lg font-bold text-slate-900">{inspectPatient.name}</h3>
              </div>
              <button
                onClick={() => setInspectPatient(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 text-[11px] block">Token Number</span>
                <span className="text-base font-bold font-mono text-teal-800">
                  {inspectPatient.tokenNumber}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 text-[11px] block">Priority Triage</span>
                <span className="font-bold text-slate-800">{inspectPatient.priority}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 text-[11px] block">Recorded Blood Pressure</span>
                <span className="font-mono font-medium text-slate-800">
                  {inspectPatient.vitals?.bp || '120/80'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
                <span className="text-slate-400 text-[11px] block">Heart Rate / SpO2</span>
                <span className="font-mono font-medium text-slate-800">
                  {inspectPatient.vitals?.pulse || 72} bpm · {inspectPatient.vitals?.spo2 || 99}%
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-xs">
              <span className="text-slate-400 text-[11px] block font-semibold mb-1">
                Clinical Chief Complaints / Notes:
              </span>
              <p className="text-slate-700 leading-relaxed">
                {inspectPatient.notes || 'No preliminary notes documented.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => setInspectPatient(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg"
              >
                Close Chart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip Patient Modal */}
      {skipModalPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <SkipForward className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Skip Token {skipModalPatient.tokenNumber}
                </h3>
                <p className="text-slate-500">Patient: {skipModalPatient.name}</p>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason for Skip</label>
              <select
                value={skipReasonInput}
                onChange={(e) => setSkipReasonInput(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="Patient absent when called multiple times">
                  Patient absent when called multiple times
                </option>
                <option value="Patient requested temporary delay (lab / X-ray in progress)">
                  Patient requested temporary delay (lab / X-ray in progress)
                </option>
                <option value="Stepped away from waiting room">Stepped away from waiting room</option>
                <option value="Triage priority reassignment">Triage priority reassignment</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSkipModalPatient(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSkipConfirm}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-2xs"
              >
                Confirm Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
