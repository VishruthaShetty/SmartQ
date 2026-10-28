import React, { useState, useMemo } from 'react';
import {
  Patient,
  Doctor,
  HospitalSettings,
  PriorityLevel,
  QueueStatus,
  ActivityLog,
  AppNotification,
  QueueEmptyAlert,
} from '../../types/queue';
import { SmsMessageRecord } from '../../types/sms';
import {
  registerPatient,
  reassignPatientDoctor,
  rejoinQueue,
  skipPatient,
  markNoShow,
  changePatientPriority,
  findLoadBalancingSuggestions,
  getStoredActivityLogs,
  getStoredQueueEmptyAlerts,
  clearQueueEmptyAlertForDoctor,
} from '../../services/storage';
import {
  getStoredSmsRecords,
  subscribeToSms,
  getLatestSmsForPatient,
  retryFailedSms,
} from '../../services/smsService';
import { exportQueueToCsv } from '../../utils/exportCsv';
import { DEPARTMENTS } from '../../data/initialData';
import { NotificationBell } from '../notifications/NotificationBell';
import { SendSmsModal } from './SendSmsModal';
import {
  UserPlus,
  Search,
  Filter,
  Download,
  ShieldAlert,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Check,
  X,
  Stethoscope,
  Clock,
  Activity,
  Layers,
  Users,
  Calendar,
  SlidersHorizontal,
  ChevronRight,
  TrendingDown,
  Building,
  Radio,
  FileSpreadsheet,
  Inbox,
  MessageSquare,
  Send,
  Smartphone,
} from 'lucide-react';

interface OperatorDashboardProps {
  patients: Patient[];
  doctors: Doctor[];
  settings: HospitalSettings;
  onSelectTokenForPatientView?: (token: string) => void;
  notifications?: AppNotification[];
}

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({
  patients,
  doctors,
  settings,
  onSelectTokenForPatientView,
  notifications = [],
}) => {
  // Sub-navigation view inside Operator Portal
  const [activeSection, setActiveSection] = useState<
    'live_queue' | 'registration' | 'doctors_workload' | 'load_balancing' | 'activity_feed' | 'sms_logs'
  >('live_queue');

  // SMS Modal State
  const [smsModalPatient, setSmsModalPatient] = useState<Patient | null>(null);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [smsRecords, setSmsRecords] = useState<SmsMessageRecord[]>(getStoredSmsRecords());

  // Subscribe to real-time SMS status transitions
  React.useEffect(() => {
    const unsubscribe = subscribeToSms(() => {
      setSmsRecords(getStoredSmsRecords());
    });
    return () => unsubscribe();
  }, []);

  // Registration Form State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [doctorId, setDoctorId] = useState<string>('');
  const [priority, setPriority] = useState<PriorityLevel>('Normal');
  const [emergencyReason, setEmergencyReason] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [appointmentType, setAppointmentType] = useState('General Consultation');

  // Confirmation Modal for Emergency Priority
  const [showEmergencyConfirmModal, setShowEmergencyConfirmModal] = useState(false);
  const [pendingRegistrationData, setPendingRegistrationData] = useState<any>(null);

  // Table Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('ALL');
  const [sortField, setSortField] = useState<'token' | 'name' | 'priority' | 'time'>('time');
  const [sortAsc, setSortAsc] = useState(false);

  // Reassignment Modal State
  const [reassignModalPatient, setReassignModalPatient] = useState<Patient | null>(null);
  const [newTargetDoctorId, setNewTargetDoctorId] = useState('');

  // Priority Change Modal State
  const [priorityModalPatient, setPriorityModalPatient] = useState<Patient | null>(null);
  const [newPriorityValue, setNewPriorityValue] = useState<PriorityLevel>('Urgent');
  const [priorityChangeReason, setPriorityChangeReason] = useState('Clinical triage reassessment');

  // Success Notification
  const [lastRegisteredToken, setLastRegisteredToken] = useState<string | null>(null);

  // Doctors in selected department for registration
  const filteredDoctorsForRegistration = useMemo(() => {
    return doctors.filter((d) => d.department === department);
  }, [doctors, department]);

  React.useEffect(() => {
    if (filteredDoctorsForRegistration.length > 0) {
      const avail = filteredDoctorsForRegistration.find((d) => d.availability === 'Available');
      setDoctorId(avail ? avail.id : filteredDoctorsForRegistration[0].id);
    } else {
      setDoctorId('');
    }
  }, [department, filteredDoctorsForRegistration]);

  // Load balancing recommendations
  const loadBalancingSuggestions = useMemo(() => {
    return findLoadBalancingSuggestions(patients, doctors, settings);
  }, [patients, doctors, settings]);

  // Activity logs from storage
  const activityLogs = useMemo(() => {
    return getStoredActivityLogs();
  }, [patients]); // re-evaluates when patients update

  // Queue Empty Alerts
  const queueEmptyAlerts = useMemo(() => {
    return getStoredQueueEmptyAlerts();
  }, [patients, doctors]);

  // Operational Top KPIs
  const waitingCount = patients.filter(
    (p) => p.status === 'Waiting' || p.status === 'Your Turn'
  ).length;
  const consultingCount = patients.filter((p) => p.status === 'Consulting').length;
  const availableDoctorsCount = doctors.filter((d) => d.availability === 'Available').length;
  const emergencyCount = patients.filter(
    (p) => p.priority === 'Emergency' && (p.status === 'Waiting' || p.status === 'Your Turn' || p.status === 'Consulting')
  ).length;

  // Filtered and Sorted Patient List
  const filteredPatients = useMemo(() => {
    const list = patients.filter((p) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.tokenNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.phone && p.phone.includes(searchQuery));

      const matchesDept = selectedDeptFilter === 'ALL' || p.department === selectedDeptFilter;
      const matchesDoctor = selectedDoctorFilter === 'ALL' || p.doctorId === selectedDoctorFilter;
      const matchesStatus = selectedStatusFilter === 'ALL' || p.status === selectedStatusFilter;
      const matchesPriority =
        selectedPriorityFilter === 'ALL' || p.priority === selectedPriorityFilter;

      return matchesSearch && matchesDept && matchesDoctor && matchesStatus && matchesPriority;
    });

    return list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'token') {
        comparison = a.tokenNumber.localeCompare(b.tokenNumber);
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'priority') {
        const pOrder: Record<PriorityLevel, number> = { Emergency: 3, Urgent: 2, Normal: 1 };
        comparison = (pOrder[b.priority] || 1) - (pOrder[a.priority] || 1);
      } else {
        comparison = new Date(b.registrationTime).getTime() - new Date(a.registrationTime).getTime();
      }
      return sortAsc ? -comparison : comparison;
    });
  }, [
    patients,
    searchQuery,
    selectedDeptFilter,
    selectedDoctorFilter,
    selectedStatusFilter,
    selectedPriorityFilter,
    sortField,
    sortAsc,
  ]);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 125) return;

    const data = {
      name: name.trim(),
      age: parsedAge,
      gender,
      phone: phone.trim() || undefined,
      department,
      doctorId: doctorId || (filteredDoctorsForRegistration[0]?.id ?? 'doc-1'),
      roomNumber: doctors.find((d) => d.id === doctorId)?.roomNumber || 'Room 101',
      priority,
      emergencyReason: priority === 'Emergency' ? emergencyReason.trim() : undefined,
      notes: clinicalNotes.trim() || undefined,
      appointmentType: appointmentType as any,
    };

    if (priority === 'Emergency') {
      setPendingRegistrationData(data);
      setShowEmergencyConfirmModal(true);
    } else {
      executeRegistration(data);
    }
  };

  const executeRegistration = (data: any) => {
    const newPat = registerPatient(data);
    setLastRegisteredToken(newPat.tokenNumber);
    setName('');
    setAge('');
    setPhone('');
    setClinicalNotes('');
    setEmergencyReason('');
    setPriority('Normal');
    setShowEmergencyConfirmModal(false);
    setPendingRegistrationData(null);
  };

  const handleApplySuggestion = (suggestion: typeof loadBalancingSuggestions[0]) => {
    reassignPatientDoctor(suggestion.patientId, suggestion.suggestedDoctorId);
  };

  const handleOpenManualReassign = (patient: Patient) => {
    setReassignModalPatient(patient);
    const candidate = doctors.find(
      (d) => d.department === patient.department && d.id !== patient.doctorId
    );
    setNewTargetDoctorId(candidate ? candidate.id : patient.doctorId);
  };

  const handleConfirmManualReassign = () => {
    if (!reassignModalPatient || !newTargetDoctorId) return;
    reassignPatientDoctor(reassignModalPatient.id, newTargetDoctorId);
    setReassignModalPatient(null);
  };

  const handleConfirmPriorityChange = () => {
    if (!priorityModalPatient) return;
    changePatientPriority(priorityModalPatient.id, newPriorityValue, priorityChangeReason);
    setPriorityModalPatient(null);
  };

  return (
    <div className="space-y-6">
      {/* Queue Empty Operational Alert Banner */}
      {queueEmptyAlerts.length > 0 && (
        <div
          role="alert"
          className="p-4.5 rounded-2xl bg-amber-50 border border-amber-300/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs animate-in fade-in"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 border border-amber-300">
              <Inbox className="w-5 h-5 text-amber-900" />
            </div>
            <div>
              <div className="font-bold text-amber-950 text-sm flex items-center gap-2">
                <span>Chamber Queue Empty Alert</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-mono text-[10px] font-bold border border-amber-300">
                  {queueEmptyAlerts.length} Chamber{queueEmptyAlerts.length > 1 ? 's' : ''} Empty
                </span>
              </div>
              <p className="text-amber-900/90 text-xs mt-0.5">
                The following physician{queueEmptyAlerts.length > 1 ? 's have' : ' has'} completed all scheduled consultations. Ready for new patient allocation:
              </p>
              <div className="mt-1.5 space-y-1">
                {queueEmptyAlerts.map((alert) => (
                  <div key={alert.doctorId} className="text-[11px] font-medium text-amber-950 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                    <span><strong>{alert.doctorName}</strong> ({alert.roomNumber} - {alert.department}): Queue empty since {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveSection('registration')}
              className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg transition-colors shadow-2xs"
            >
              Assign New Patient
            </button>
            <button
              onClick={() => {
                queueEmptyAlerts.forEach((a) => clearQueueEmptyAlertForDoctor(a.doctorId));
              }}
              className="px-3 py-2 bg-white hover:bg-amber-100/70 text-amber-950 border border-amber-300 font-semibold rounded-lg transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Top Operations Command Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1">
              <span>Hospital Operations Command</span>
              <span>·</span>
              <span>Central Triage Control</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Hospital Queue & Intake Control Centre
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-department patient intake, doctor workload management, triage escalation, and live telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Operator Notification Bell */}
            <NotificationBell
              notifications={notifications}
              role="operator"
              label="Operations Alerts"
            />

            <button
              onClick={() => exportQueueToCsv(patients, doctors)}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV Register</span>
            </button>
          </div>
        </div>

        {/* Top Operational KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-5 text-xs">
          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
            <div className="text-slate-500 font-medium flex items-center justify-between">
              <span>Currently Waiting</span>
              <Users className="w-4 h-4 text-teal-700" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1 tabular-nums">
              {waitingCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">In outpatient queues</div>
          </div>

          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
            <div className="text-slate-500 font-medium flex items-center justify-between">
              <span>In Consultation</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-800 mt-1 tabular-nums">
              {consultingCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Active doctor chambers</div>
          </div>

          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
            <div className="text-slate-500 font-medium flex items-center justify-between">
              <span>Available Doctors</span>
              <Stethoscope className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1 tabular-nums">
              {availableDoctorsCount} <span className="text-xs text-slate-400 font-normal">/ {doctors.length}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {doctors.filter((d) => d.availability === 'On Break').length} on scheduled break
            </div>
          </div>

          <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
            <div className="text-slate-500 font-medium flex items-center justify-between">
              <span>Emergency Triage Alert</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-rose-700 mt-1 tabular-nums">
              {emergencyCount}
            </div>
            <div className="text-[11px] text-rose-600 font-medium mt-0.5">
              {emergencyCount > 0 ? 'Urgent attention required' : 'No acute triage queue'}
            </div>
          </div>
        </div>
      </div>

      {/* Operator Sub-Navigation Segmented Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-1.5 flex flex-wrap gap-1 shadow-2xs text-xs font-semibold">
        <button
          onClick={() => setActiveSection('live_queue')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
            activeSection === 'live_queue'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Live Queue Register</span>
        </button>

        <button
          onClick={() => setActiveSection('registration')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
            activeSection === 'registration'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Patient Registration & Token Issuance</span>
        </button>

        <button
          onClick={() => setActiveSection('doctors_workload')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
            activeSection === 'doctors_workload'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Stethoscope className="w-3.5 h-3.5" />
          <span>Doctor Workload & Rooms</span>
        </button>

        <button
          onClick={() => setActiveSection('load_balancing')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
            activeSection === 'load_balancing'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Queue Load Balancing</span>
          {loadBalancingSuggestions.length > 0 && (
            <span className="px-1.5 py-0.2 rounded bg-amber-400 text-amber-950 text-[10px] font-bold">
              {loadBalancingSuggestions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSection('activity_feed')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
            activeSection === 'activity_feed'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Live Activity Feed</span>
        </button>

        <button
          onClick={() => setActiveSection('sms_logs')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
            activeSection === 'sms_logs'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>SMS Gateway Logs</span>
          {smsRecords.length > 0 && (
            <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 text-[10px] font-bold font-mono">
              {smsRecords.length}
            </span>
          )}
        </button>
      </div>

      {/* SECTION 1: LIVE QUEUE REGISTER (Search, Filter, Table, Action Menus) */}
      {activeSection === 'live_queue' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Hospital Master Queue Register ({filteredPatients.length} records)
              </h2>
              <p className="text-xs text-slate-500">
                Search, sort, reassign doctors, and adjust priority according to clinical triage policy
              </p>
            </div>

            {/* Live Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search token, name, phone..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Multi-Filters Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs"
            >
              <option value="ALL">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs"
            >
              <option value="ALL">All Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.department})
                </option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="Waiting">Waiting</option>
              <option value="Your Turn">Your Turn</option>
              <option value="Consulting">In Consultation</option>
              <option value="Completed">Completed</option>
              <option value="Skipped">Skipped / Delayed</option>
              <option value="No-show">No-Show</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs"
            >
              <option value="ALL">All Priorities</option>
              <option value="Emergency">Emergency Triage</option>
              <option value="Urgent">Urgent</option>
              <option value="Normal">Normal</option>
            </select>
          </div>

          {/* Master Table */}
          <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900"
                    onClick={() => {
                      setSortField('token');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    Token Number
                  </th>
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900"
                    onClick={() => {
                      setSortField('name');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    Patient
                  </th>
                  <th className="py-2.5 px-3">Doctor & Chamber</th>
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900"
                    onClick={() => {
                      setSortField('priority');
                      setSortAsc(!sortAsc);
                    }}
                  >
                    Priority
                  </th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Appt Slot</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No patients matched current filters.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((p) => {
                    const doc = doctors.find((d) => d.id === p.doctorId);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {p.tokenNumber}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-500">
                            Age {p.age} · {p.gender} · {p.department}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {p.phone || `+91 98765 ${p.tokenNumber.replace(/\D/g, '').padStart(5, '0').slice(-5)}`}
                            </span>
                            {(() => {
                              const lastSms = getLatestSmsForPatient(p.id);
                              if (!lastSms) return null;
                              return (
                                <span
                                  className={`inline-flex items-center gap-0.5 text-[9px] font-mono px-1 py-0.2 rounded font-bold uppercase ${
                                    lastSms.status === 'delivered'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : lastSms.status === 'failed'
                                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                      : 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                                  }`}
                                  title={`Last SMS: ${lastSms.status.toUpperCase()} at ${new Date(lastSms.sentAt).toLocaleTimeString()} (${lastSms.gatewayMessageId})`}
                                >
                                  <MessageSquare className="w-2.5 h-2.5" />
                                  <span>SMS: {lastSms.status}</span>
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800">{doc?.name || 'Unassigned'}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {p.roomNumber || doc?.roomNumber || 'Room 101'}
                          </div>
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
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              p.status === 'Consulting'
                                ? 'bg-teal-100 text-teal-800'
                                : p.status === 'Your Turn'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'Waiting'
                                ? 'bg-amber-100 text-amber-800'
                                : p.status === 'Completed'
                                ? 'bg-slate-100 text-slate-700'
                                : p.status === 'Cancelled'
                                ? 'bg-slate-200 text-slate-500'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">
                          {p.appointmentTime || '09:30 AM'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Urgent SMS Dispatch Action */}
                            {(p.status === 'Waiting' || p.status === 'Your Turn' || p.status === 'Skipped' || p.status === 'No-show') && (
                              <button
                                onClick={() => {
                                  setSmsModalPatient(p);
                                  setIsSmsModalOpen(true);
                                }}
                                title={`Send Urgent SMS Notification to ${p.name}`}
                                className={`px-2 py-1 text-[11px] font-medium rounded border flex items-center gap-1 transition-all ${
                                  p.priority === 'Emergency' || p.priority === 'Urgent'
                                    ? 'text-teal-900 bg-teal-50 hover:bg-teal-100 border-teal-300 font-semibold shadow-2xs'
                                    : 'text-slate-700 bg-white hover:bg-slate-100 border-slate-200'
                                }`}
                              >
                                <MessageSquare className="w-3 h-3 text-teal-700" />
                                <span>Send SMS</span>
                              </button>
                            )}

                            {p.status === 'Waiting' && (
                              <>
                                <button
                                  onClick={() => handleOpenManualReassign(p)}
                                  title="Reassign to another physician"
                                  className="px-2 py-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 flex items-center gap-1"
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                  <span>Reassign</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setPriorityModalPatient(p);
                                    setNewPriorityValue(
                                      p.priority === 'Normal' ? 'Urgent' : 'Emergency'
                                    );
                                  }}
                                  title="Change Clinical Priority"
                                  className="px-2 py-1 text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200"
                                >
                                  Triage
                                </button>
                                <button
                                  onClick={() => markNoShow(p.id)}
                                  title="Mark as No-Show"
                                  className="px-2 py-1 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200"
                                >
                                  No-Show
                                </button>
                              </>
                            )}

                            {(p.status === 'Skipped' || p.status === 'No-show') && (
                              <button
                                onClick={() => rejoinQueue(p.id)}
                                title="Rejoin active line"
                                className="px-2 py-1 text-[11px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded border border-teal-200 flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Rejoin</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: PATIENT REGISTRATION & TOKEN ISSUANCE */}
      {activeSection === 'registration' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Patient Intake & Token Generation</h2>
              <p className="text-xs text-slate-500">
                Register walk-in or booked outpatient; system allocates sequential token and doctor room
              </p>
            </div>
          </div>

          {lastRegisteredToken && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
              <div>
                <span className="font-semibold block">Patient Successfully Registered!</span>
                <span>Token generated: </span>
                <strong className="font-mono text-sm text-teal-900">{lastRegisteredToken}</strong>
              </div>
              <button
                onClick={() => {
                  if (onSelectTokenForPatientView) onSelectTokenForPatientView(lastRegisteredToken);
                }}
                className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg font-medium hover:bg-emerald-800 transition-colors"
              >
                View Patient Ticket
              </button>
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Patient Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Chandra"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white transition-all text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Age *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white transition-all text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 text-xs"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Consultation Type</label>
                <select
                  value={appointmentType}
                  onChange={(e) => setAppointmentType(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="General Consultation">General Consultation</option>
                  <option value="Follow-up Review">Follow-up Review</option>
                  <option value="Diagnostic Review">Diagnostic Review</option>
                  <option value="Prescription Refill">Prescription Refill</option>
                  <option value="Specialist Evaluation">Specialist Evaluation</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Medical Department *</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Physician *</label>
                <select
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  {filteredDoctorsForRegistration.map((doc) => {
                    const qCount = patients.filter(
                      (p) => p.doctorId === doc.id && p.status === 'Waiting'
                    ).length;
                    return (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} ({doc.roomNumber}) · {qCount} waiting
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Clinical Priority Selection */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Clinical Triage Urgency
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPriority('Normal')}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    priority === 'Normal'
                      ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('Urgent')}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    priority === 'Urgent'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Urgent
                </button>
                <button
                  type="button"
                  onClick={() => setPriority('Emergency')}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    priority === 'Emergency'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Emergency (Triage)
                </button>
              </div>
            </div>

            {priority === 'Emergency' && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-1">
                <label className="block font-semibold text-rose-900">
                  Documented Clinical Emergency Reason *
                </label>
                <input
                  type="text"
                  required
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  placeholder="e.g. Unstable angina, respiratory distress, trauma"
                  className="w-full p-2 bg-white border border-rose-300 rounded text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                />
                <p className="text-[10px] text-rose-700">
                  * Clinical triage authorization confirmation is required on form submission.
                </p>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Intake Notes & Symptoms
              </label>
              <textarea
                rows={2}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Chief complaints, known allergies, prior surgical history..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-600 focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg text-xs transition-colors shadow-2xs"
            >
              Generate Sequential Token & Register Patient
            </button>
          </form>
        </div>
      )}

      {/* SECTION 3: DOCTOR WORKLOAD & ROOMS (Visual Card Grid) */}
      {activeSection === 'doctors_workload' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Physician Workload & Consultation Rooms
            </h2>
            <p className="text-xs text-slate-500">
              Live capacity monitoring, consultation chambers, and room availability
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doc) => {
              const activePatient = patients.find(
                (p) => p.doctorId === doc.id && (p.status === 'Consulting' || p.status === 'Your Turn')
              );
              const waitingCount = patients.filter(
                (p) => p.doctorId === doc.id && p.status === 'Waiting'
              ).length;
              const completedCount = patients.filter(
                (p) => p.doctorId === doc.id && p.status === 'Completed'
              ).length;

              // Capacity workload percentage
              const workloadPct = Math.min(100, Math.round((waitingCount / 5) * 100));

              return (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <div className="text-xs font-mono font-bold text-teal-800 uppercase">
                          {doc.roomNumber}
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 mt-0.5">{doc.name}</h3>
                        <p className="text-[11px] text-slate-500">{doc.department}</p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          doc.availability === 'Available'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : doc.availability === 'On Break'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {doc.availability}
                      </span>
                    </div>

                    {/* Active Patient In Room */}
                    <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="text-[10px] uppercase font-semibold text-slate-400">
                        In Consultation Room:
                      </div>
                      {activePatient ? (
                        <div className="mt-1 flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-teal-800">
                              {activePatient.tokenNumber}
                            </span>
                            <span className="text-slate-800 font-medium ml-2">{activePatient.name}</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded font-bold">
                            {activePatient.status}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1 text-slate-400 italic">No patient in room</div>
                      )}
                    </div>

                    {/* Workload Progress Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Queue Capacity:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {waitingCount} waiting · {completedCount} done
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${workloadPct}%` }}
                          className={`h-full rounded-full transition-all ${
                            workloadPct > 80
                              ? 'bg-rose-500'
                              : workloadPct > 40
                              ? 'bg-amber-500'
                              : 'bg-teal-600'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    Shift Hours: {doc.shiftHours}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 4: LOAD BALANCING (Smart Rebalancing Proposal) */}
      {activeSection === 'load_balancing' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Doctor Queue Load Balancing Engine
              </h2>
              <p className="text-xs text-slate-500">
                Identifies departmental queue bottlenecks and suggests clinically appropriate reassignment
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
              {loadBalancingSuggestions.length} Proposals Available
            </span>
          </div>

          {loadBalancingSuggestions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              All physician queues are currently balanced across departments.
            </div>
          ) : (
            <div className="space-y-3">
              {loadBalancingSuggestions.map((sug) => (
                <div
                  key={sug.patientId}
                  className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="font-mono text-teal-800">{sug.patientToken}</span>
                      <span>·</span>
                      <span>{sug.patientName}</span>
                      <span className="text-slate-400 font-normal">({sug.department})</span>
                    </div>
                    <div className="text-slate-600 mt-1">
                      Currently assigned to{' '}
                      <strong className="text-slate-800">{sug.currentDoctorName}</strong> (
                      {sug.currentQueueLength} waiting) &rarr; Reassign to{' '}
                      <strong className="text-teal-800">{sug.suggestedDoctorName}</strong> (
                      {sug.suggestedDoctorQueueLength} waiting).
                    </div>
                    <div className="text-emerald-700 font-semibold mt-1">
                      Estimated patient wait time reduction: ~{sug.estimatedTimeSavedMinutes} minutes.
                    </div>
                  </div>

                  <button
                    onClick={() => handleApplySuggestion(sug)}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg shrink-0 flex items-center gap-1.5 shadow-2xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Reassignment</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: LIVE ACTIVITY FEED */}
      {activeSection === 'activity_feed' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Hospital Operations Activity Feed</h2>
              <p className="text-xs text-slate-500">Live sequential audit trail of intake, calls, and departures</p>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Live telemetry stream</span>
          </div>

          <div className="divide-y divide-slate-100">
            {activityLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-start gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{log.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5">{log.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 6: SMS GATEWAY DISPATCH LOGS */}
      {activeSection === 'sms_logs' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  SMS Telephony Gateway & Dispatch Audit Log
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-bold border border-teal-200">
                  Simulation Mode Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time delivery receipts, handset acknowledgments, and urgent alert dispatch history
              </p>
            </div>

            <button
              onClick={() => {
                const candidate =
                  patients.find((p) => p.status === 'Waiting' || p.status === 'Your Turn') ||
                  patients[0];
                if (candidate) {
                  setSmsModalPatient(candidate);
                  setIsSmsModalOpen(true);
                }
              }}
              className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg flex items-center gap-1.5 text-xs transition-colors shadow-2xs shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Compose Urgent SMS</span>
            </button>
          </div>

          {/* SMS Telemetry Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
              <div className="text-slate-500 font-medium">Total Messages Sent</div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
                {smsRecords.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Outpatient alerts logged</div>
            </div>

            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
              <div className="text-slate-500 font-medium">Delivery Success Rate</div>
              <div className="text-2xl font-bold font-mono text-emerald-800 mt-1 tabular-nums">
                {smsRecords.length === 0
                  ? '100%'
                  : `${Math.round(
                      (smsRecords.filter((r) => r.status === 'delivered').length /
                        smsRecords.length) *
                        100
                    )}%`}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                {smsRecords.filter((r) => r.status === 'delivered').length} confirmed deliveries
              </div>
            </div>

            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
              <div className="text-slate-500 font-medium">Avg Handset Latency</div>
              <div className="text-2xl font-bold font-mono text-teal-800 mt-1 tabular-nums">
                ~1.18s
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Tier-1 telephony route</div>
            </div>

            <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
              <div className="text-slate-500 font-medium">Gateway Protocol</div>
              <div className="text-xs font-bold font-mono text-slate-800 mt-2 truncate">
                SMPP 3.4 / REST
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Mock Carrier Simulation</div>
            </div>
          </div>

          {/* SMS Dispatch Table */}
          <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Sent Time</th>
                  <th className="py-2.5 px-3">Token & Patient</th>
                  <th className="py-2.5 px-3">Recipient Phone</th>
                  <th className="py-2.5 px-3">Alert Type</th>
                  <th className="py-2.5 px-3">Message Content</th>
                  <th className="py-2.5 px-3">Delivery Status</th>
                  <th className="py-2.5 px-3 text-right">Gateway Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {smsRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No SMS alerts dispatched yet. Click &ldquo;Send SMS&rdquo; on any patient in the Live Queue.
                    </td>
                  </tr>
                ) : (
                  smsRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(r.sentAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200 mr-1.5">
                          {r.tokenNumber}
                        </span>
                        <span className="font-semibold text-slate-900">{r.patientName}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 font-medium whitespace-nowrap">
                        {r.recipientPhone}
                      </td>
                      <td className="py-3 px-3 capitalize text-slate-600">
                        {r.templateType.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate text-slate-600" title={r.messageText}>
                        {r.messageText}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            r.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'failed'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800 animate-pulse'
                          }`}
                        >
                          {r.status === 'delivered' ? 'Delivered ✓' : r.status === 'failed' ? 'Failed ✕' : 'Transmitting...'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[10px] text-slate-400">
                        {r.status === 'failed' ? (
                          <button
                            onClick={() => retryFailedSms(r.id)}
                            className="px-2 py-0.5 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 font-semibold cursor-pointer"
                          >
                            Retry
                          </button>
                        ) : (
                          r.gatewayMessageId
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Emergency Confirmation Modal */}
      {showEmergencyConfirmModal && pendingRegistrationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-rose-200 max-w-lg w-full p-6 shadow-xl space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Clinical Emergency Triage</h3>
                <p className="text-slate-500">Authorized clinical triage staff confirmation required</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-950 space-y-2">
              <p>
                You are marking patient <strong>{pendingRegistrationData.name}</strong> as an{' '}
                <strong className="text-rose-700 uppercase">Emergency Priority</strong> case.
              </p>
              <div className="text-[11px] text-rose-800">
                <strong>Documented Reason:</strong> {pendingRegistrationData.emergencyReason || 'Acute symptoms'}
              </div>
              <p className="text-[11px] text-rose-800 italic">
                * Note: SmartQueue does not independently diagnose medical urgency. Emergency triage is strictly executed upon clinical staff authorization.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowEmergencyConfirmModal(false);
                  setPendingRegistrationData(null);
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeRegistration(pendingRegistrationData)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-2xs"
              >
                Confirm Clinical Emergency
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Reassignment Modal */}
      {reassignModalPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Reassign Token {reassignModalPatient.tokenNumber}
                </h3>
                <p className="text-slate-500">Patient: {reassignModalPatient.name}</p>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Select Destination Doctor
              </label>
              <select
                value={newTargetDoctorId}
                onChange={(e) => setNewTargetDoctorId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                {doctors.map((d) => {
                  const qCount = patients.filter(
                    (p) => p.doctorId === d.id && p.status === 'Waiting'
                  ).length;
                  return (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.department} - {d.roomNumber}) · {qCount} waiting
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setReassignModalPatient(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmManualReassign}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg shadow-2xs"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Priority Change Modal */}
      {priorityModalPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900">
              Update Clinical Priority ({priorityModalPatient.tokenNumber})
            </h3>
            <p className="text-slate-500">Patient: {priorityModalPatient.name}</p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">New Priority Level</label>
              <select
                value={newPriorityValue}
                onChange={(e) => setNewPriorityValue(e.target.value as PriorityLevel)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
                <option value="Emergency">Emergency (Clinical Triage)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason / Clinical Note</label>
              <input
                type="text"
                value={priorityChangeReason}
                onChange={(e) => setPriorityChangeReason(e.target.value)}
                placeholder="Document clinical reassessment rationale"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setPriorityModalPatient(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPriorityChange}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg shadow-2xs"
              >
                Update Priority
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Urgent SMS Notification Modal */}
      <SendSmsModal
        patient={smsModalPatient}
        doctor={doctors.find((d) => d.id === smsModalPatient?.doctorId) || null}
        isOpen={isSmsModalOpen}
        onClose={() => {
          setIsSmsModalOpen(false);
          setSmsModalPatient(null);
        }}
      />
    </div>
  );
};
