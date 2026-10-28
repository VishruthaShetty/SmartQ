import React, { useState, useMemo, useEffect } from 'react';
import { Patient, Doctor, HospitalSettings, AppNotification } from '../../types/queue';
import {
  calculatePatientQueuePosition,
  calculateCrowdLevel,
  cancelAppointment,
  rescheduleAppointment,
} from '../../services/storage';
import { NotificationBell } from '../notifications/NotificationBell';
import {
  Clock,
  User,
  Stethoscope,
  MapPin,
  Bell,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileText,
  Volume2,
  CalendarRange,
  ChevronRight,
  ShieldCheck,
  XCircle,
  Sparkles,
  Search,
  Activity,
  Heart,
} from 'lucide-react';
import { playHospitalChime } from '../../utils/audio';

interface PatientDashboardProps {
  patients: Patient[];
  doctors: Doctor[];
  settings: HospitalSettings;
  selectedToken?: string;
  onSelectToken: (token: string) => void;
  notifications?: AppNotification[];
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  patients,
  doctors,
  settings,
  selectedToken,
  onSelectToken,
  notifications = [],
}) => {
  const [searchInput, setSearchInput] = useState(selectedToken || 'GEN-103');
  const [lookupError, setLookupError] = useState('');
  const [audioPlayedForTurn, setAudioPlayedForTurn] = useState<string | null>(null);

  // Modals for reschedule / cancel
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState('11:30 AM');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Scheduling conflict / feeling better');

  // Sync prop changes
  useEffect(() => {
    if (selectedToken) {
      setSearchInput(selectedToken);
    }
  }, [selectedToken]);

  // Find active patient by token
  const patient = useMemo(() => {
    const query = (selectedToken || searchInput || '').trim().toUpperCase();
    return patients.find((p) => p.tokenNumber.toUpperCase() === query);
  }, [patients, selectedToken, searchInput]);

  const assignedDoctor = useMemo(() => {
    if (!patient) return null;
    return doctors.find((d) => d.id === patient.doctorId) || null;
  }, [patient, doctors]);

  const queueInfo = useMemo(() => {
    if (!patient) return { position: -1, estimatedMinutes: 0, aheadCount: 0 };
    return calculatePatientQueuePosition(patient, patients, settings);
  }, [patient, patients, settings]);

  const crowd = useMemo(() => {
    return calculateCrowdLevel(patients, settings);
  }, [patients, settings]);

  const isTurnApproaching =
    patient &&
    (patient.status === 'Your Turn' ||
      (patient.status === 'Waiting' && queueInfo.position > 0 && queueInfo.position <= 2));

  // Play chime when turn is called
  useEffect(() => {
    if (patient && patient.status === 'Your Turn' && audioPlayedForTurn !== patient.id) {
      if (settings.soundAlertsEnabled) {
        playHospitalChime();
      }
      setAudioPlayedForTurn(patient.id);
    }
  }, [patient, settings.soundAlertsEnabled, audioPlayedForTurn]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    const query = searchInput.trim().toUpperCase();
    if (!query) {
      setLookupError('Please enter a valid token number (e.g. GEN-103)');
      return;
    }
    const found = patients.find((p) => p.tokenNumber.toUpperCase() === query);
    if (!found) {
      setLookupError(`Token "${query}" not found in patient registry.`);
      return;
    }
    onSelectToken(found.tokenNumber);
  };

  const handleConfirmReschedule = () => {
    if (!patient) return;
    rescheduleAppointment(patient.id, rescheduleTimeSlot);
    setShowRescheduleModal(false);
  };

  const handleConfirmCancel = () => {
    if (!patient) return;
    cancelAppointment(patient.id, cancelReason);
    setShowCancelModal(false);
  };

  // Demo patient tokens for fast switching
  const quickTokens = patients
    .filter((p) => p.status === 'Waiting' || p.status === 'Your Turn' || p.status === 'Consulting')
    .slice(0, 5);

  // Timeline Step Status Mapping
  // Checked In -> Waiting -> Called -> In Consultation -> Completed
  const timelineSteps = [
    { id: 'registered', label: 'Checked In', desc: 'Reception intake verified' },
    { id: 'waiting', label: 'Waiting in Queue', desc: 'Assigned to clinical queue' },
    { id: 'called', label: 'Called to Room', desc: 'Door chime & notification' },
    { id: 'consulting', label: 'In Consultation', desc: 'Doctor session active' },
    { id: 'completed', label: 'Completed', desc: 'Visit concluded & notes logged' },
  ];

  const getStepStatus = (index: number) => {
    if (!patient) return 'pending';
    if (patient.status === 'Cancelled' || patient.status === 'Skipped') {
      return index === 0 ? 'completed' : 'cancelled';
    }

    const stateOrder = {
      Waiting: 1,
      'Your Turn': 2,
      Consulting: 3,
      Completed: 4,
      'No-show': 1,
      Skipped: 1,
      Cancelled: 0,
    };

    const currentRank = stateOrder[patient.status] ?? 1;

    if (index < currentRank) return 'completed';
    if (index === currentRank) return 'current';
    return 'pending';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Clinic Welcome & Patient Identification Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shrink-0">
              <Heart className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {settings.hospitalName}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Clinic
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Outpatient Queue & Appointment Companion · Room 안내 및 대기 현황
              </p>
            </div>
          </div>

          {/* Quick Token Search / Switcher & Patient Notification Bell */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Find Token..."
                  className="w-32 sm:w-40 pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold uppercase focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white transition-all"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Track
              </button>
            </form>

            <NotificationBell
              notifications={notifications}
              role="patient"
              patientToken={patient?.tokenNumber}
              label="Token Alerts"
            />
          </div>
        </div>

        {/* Quick Demo Token Selector */}
        <div className="pt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium text-[11px]">Demo Tokens:</span>
          {quickTokens.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSearchInput(p.tokenNumber);
                onSelectToken(p.tokenNumber);
                setLookupError('');
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors border ${
                patient?.tokenNumber === p.tokenNumber
                  ? 'bg-teal-700 text-white border-teal-700 font-semibold'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
              }`}
            >
              {p.tokenNumber} ({p.status})
            </button>
          ))}
          {lookupError && <span className="text-rose-600 text-xs ml-2">{lookupError}</span>}
        </div>
      </div>

      {/* Turn Alert Banner (If turn is approaching or active) */}
      {isTurnApproaching && patient && (
        <div
          role="alert"
          className={`p-4 rounded-xl border flex items-start sm:items-center justify-between gap-4 shadow-xs transition-all ${
            patient.status === 'Your Turn'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-teal-50 border-teal-200 text-teal-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                patient.status === 'Your Turn'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-teal-600 text-white'
              }`}
            >
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="font-bold text-sm sm:text-base">
                {patient.status === 'Your Turn'
                  ? 'Please proceed to your consultation room now!'
                  : `Your turn is approaching — #${queueInfo.position} in line`}
              </div>
              <p className="text-xs opacity-90 mt-0.5">
                {assignedDoctor?.name || 'Your doctor'} is ready in{' '}
                <strong className="underline">{patient.roomNumber}</strong>. Please have your token ready.
              </p>
            </div>
          </div>

          <button
            onClick={() => playHospitalChime()}
            title="Replay arrival chime"
            className="p-2 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-2xs shrink-0 transition-colors"
          >
            <Volume2 className="w-4 h-4 text-teal-700" />
          </button>
        </div>
      )}

      {/* Patient Live Queue Ticket (Central Focus) */}
      {patient ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {/* Ticket Header */}
          <div className="bg-slate-900 text-white p-6 sm:p-7 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-teal-300 font-semibold mb-1">
                  Official Outpatient Queue Ticket
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tight text-white">
                  {patient.tokenNumber}
                </div>
                <div className="text-xs text-slate-300 mt-2 flex items-center gap-2">
                  <span className="font-semibold text-white">{patient.name}</span>
                  <span>·</span>
                  <span>Age {patient.age}</span>
                  <span>·</span>
                  <span>{patient.department}</span>
                </div>
              </div>

              {/* Status Pill & Priority */}
              <div className="flex flex-col sm:items-end gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    patient.status === 'Your Turn'
                      ? 'bg-emerald-400 text-emerald-950 animate-pulse'
                      : patient.status === 'Consulting'
                      ? 'bg-teal-400 text-teal-950'
                      : patient.status === 'Waiting'
                      ? 'bg-amber-400 text-amber-950'
                      : patient.status === 'Completed'
                      ? 'bg-slate-700 text-slate-200'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {patient.status}
                </span>

                {patient.priority === 'Emergency' && (
                  <span className="text-[11px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                    Clinical Triage Priority
                  </span>
                )}
                {patient.priority === 'Urgent' && (
                  <span className="text-[11px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                    Urgent Case
                  </span>
                )}
              </div>
            </div>

            {/* Quick Stats Grid Inside Ticket */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800 text-slate-300 text-xs">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-medium">Position In Line</div>
                <div className="text-lg font-bold font-mono text-white mt-0.5 tabular-nums">
                  {patient.status === 'Waiting'
                    ? `#${queueInfo.position}`
                    : patient.status === 'Your Turn' || patient.status === 'Consulting'
                    ? 'In Room'
                    : 'Concluded'}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase font-medium">Patients Ahead</div>
                <div className="text-lg font-bold font-mono text-white mt-0.5 tabular-nums">
                  {patient.status === 'Waiting' ? queueInfo.aheadCount : 0}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase font-medium">Estimated Wait</div>
                <div className="text-lg font-bold font-mono text-teal-300 mt-0.5 tabular-nums">
                  {patient.status === 'Waiting' ? `~${queueInfo.estimatedMinutes} min` : '0 min'}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase font-medium">Assigned Room</div>
                <div className="text-lg font-bold font-mono text-white mt-0.5">
                  {patient.roomNumber}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline: Checked In -> Waiting -> Called -> In Consultation -> Completed */}
          <div className="p-6 bg-slate-50/70 border-b border-slate-200/80">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Queue Journey Progress</span>
              <span className="text-slate-400 text-[11px] font-normal normal-case">
                Live status updates automatically
              </span>
            </div>

            {/* Step Progress Bar */}
            <div className="relative flex items-center justify-between">
              <div className="absolute left-0 right-0 top-3.5 h-0.5 bg-slate-200 -z-0" />
              {timelineSteps.map((step, idx) => {
                const status = getStepStatus(idx);
                return (
                  <div key={step.id} className="relative z-10 flex flex-col items-center text-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        status === 'completed'
                          ? 'bg-teal-700 text-white'
                          : status === 'current'
                          ? 'bg-teal-600 text-white ring-4 ring-teal-100'
                          : status === 'cancelled'
                          ? 'bg-rose-500 text-white'
                          : 'bg-white border-2 border-slate-300 text-slate-400'
                      }`}
                    >
                      {status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-semibold mt-2 ${
                        status === 'current' ? 'text-teal-900 font-bold' : 'text-slate-600'
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="hidden sm:block text-[10px] text-slate-400 max-w-[90px] leading-tight mt-0.5">
                      {step.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Appointment Details & Doctor Info */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Doctor Card */}
            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold uppercase tracking-wider">Attending Physician</span>
                <span className="text-teal-700 font-medium">{patient.roomNumber}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-100/70 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0 border border-teal-200">
                  <Stethoscope className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {assignedDoctor ? assignedDoctor.name : 'Attending Physician'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {assignedDoctor?.specialization || patient.department}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Shift Hours: {assignedDoctor?.shiftHours || '08:30 – 14:30'}
                  </p>
                </div>
              </div>
            </div>

            {/* Appointment Slot & Vitals */}
            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold uppercase tracking-wider">Appointment Details</span>
                <span className="font-mono text-slate-700">{patient.appointmentTime || 'Today'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Consultation Type:</span>
                  <span className="font-semibold text-slate-800">
                    {patient.appointmentType || 'General Consultation'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Check-in Status:</span>
                  <span className="font-semibold text-emerald-700">Checked In (On Site)</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Blood Pressure:</span>
                  <span className="font-mono font-medium text-slate-700">
                    {patient.vitals?.bp || '120/80'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Pulse & SpO2:</span>
                  <span className="font-mono font-medium text-slate-700">
                    {patient.vitals?.pulse || 72} bpm · {patient.vitals?.spo2 || 99}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer: Reschedule or Cancel (Working Buttons) */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 text-[11px]">
              Waiting estimates update dynamically as consultations conclude.
            </div>

            {patient.status === 'Waiting' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRescheduleModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium transition-colors"
                >
                  Reschedule Slot
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-medium transition-colors"
                >
                  Cancel Token
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
          Token not found.
        </div>
      )}

      {/* Reschedule Working Modal */}
      {showRescheduleModal && patient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <CalendarRange className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reschedule Appointment</h3>
                <p className="text-xs text-slate-500">
                  Select a new consultation slot for token {patient.tokenNumber}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-slate-700">Available Today Slots</label>
              <div className="grid grid-cols-3 gap-2">
                {['11:00 AM', '11:30 AM', '12:00 PM', '02:00 PM', '02:30 PM', '03:00 PM'].map(
                  (slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setRescheduleTimeSlot(slot)}
                      className={`p-2 rounded-lg border font-mono font-semibold transition-all ${
                        rescheduleTimeSlot === slot
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {slot}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Keep Current Slot
              </button>
              <button
                onClick={handleConfirmReschedule}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg shadow-xs"
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Appointment Working Modal */}
      {showCancelModal && patient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-rose-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cancel Appointment Token</h3>
                <p className="text-xs text-slate-500">
                  Release your queue slot for token {patient.tokenNumber}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-slate-700">Reason for Cancellation</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="Scheduling conflict / Personal emergency">
                  Scheduling conflict / Personal emergency
                </option>
                <option value="Symptoms resolved / feeling better">
                  Symptoms resolved / feeling better
                </option>
                <option value="Seeking emergency hospital care elsewhere">
                  Seeking emergency hospital care elsewhere
                </option>
                <option value="Booking at another medical branch">
                  Booking at another medical branch
                </option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Keep Appointment
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
