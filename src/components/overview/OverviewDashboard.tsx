import React from 'react';
import { Patient, Doctor, HospitalSettings } from '../../types/queue';
import { calculateCrowdLevel } from '../../services/storage';
import {
  Users,
  UserCheck,
  Stethoscope,
  Clock,
  AlertCircle,
  Building2,
  ArrowRight,
  TrendingDown,
  Activity,
  Shield,
  Volume2,
  Layers,
  Heart,
  ChevronRight,
} from 'lucide-react';
import { playHospitalChime } from '../../utils/audio';

interface OverviewDashboardProps {
  patients: Patient[];
  doctors: Doctor[];
  settings: HospitalSettings;
  onNavigateTo: (tab: string, role?: 'patient' | 'doctor' | 'operator') => void;
  onSelectDoctor?: (doctorId: string) => void;
  onSelectPatientToken?: (token: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  patients,
  doctors,
  settings,
  onNavigateTo,
  onSelectDoctor,
  onSelectPatientToken,
}) => {
  const crowd = calculateCrowdLevel(patients, settings);
  const consultingPatients = patients.filter((p) => p.status === 'Consulting');
  const waitingPatients = patients.filter((p) => p.status === 'Waiting');
  const calledPatients = patients.filter((p) => p.status === 'Your Turn');
  const completedToday = patients.filter((p) => p.status === 'Completed');
  const emergencyPatients = patients.filter(
    (p) =>
      p.priority === 'Emergency' &&
      (p.status === 'Waiting' || p.status === 'Your Turn' || p.status === 'Consulting')
  );

  const departments = Array.from(new Set(doctors.map((d) => d.department)));

  const crowdBadgeStyles = {
    Low: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Medium: 'bg-amber-50 text-amber-800 border-amber-200',
    High: 'bg-rose-50 text-rose-800 border-rose-200',
  };

  return (
    <div className="space-y-6">
      {/* Hospital Banner & Crowd Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1">
              <span>{settings.hospitalName}</span>
              <span>·</span>
              <span>Central Outpatient Telemetry</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Hospital Operations Overview
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time patient flow, active consultation rooms, and clinical queue pacing across departments.
            </p>
          </div>

          {/* Crowd Level Indicator */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Hospital Crowd Level</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                    crowdBadgeStyles[crowd.level]
                  }`}
                >
                  {crowd.level} Crowd
                </span>
                <span className="text-xs text-slate-600 font-mono tabular-nums">
                  {crowd.totalWaiting} in waiting area
                </span>
              </div>
            </div>
            <button
              onClick={() => playHospitalChime()}
              title="Test hospital audio announcement chime"
              className="p-2 text-teal-800 hover:text-teal-900 hover:bg-white rounded-lg border border-slate-200 transition-colors shadow-2xs"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4-KPI Metric Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-5 text-xs">
          <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-medium">Patients In Queue</span>
              <Users className="w-4 h-4 text-teal-700" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
              {waitingPatients.length + calledPatients.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {calledPatients.length} being called into rooms
            </div>
          </div>

          <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-medium">In Active Session</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
              {consultingPatients.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Across {doctors.filter((d) => d.availability === 'Available').length} active physicians
            </div>
          </div>

          <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-medium">Completed Today</span>
              <UserCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
              {completedToday.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Avg. ~{settings.averageConsultationMinutes}m visit duration
            </div>
          </div>

          <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-medium">Emergency Triage</span>
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 tabular-nums">
              {emergencyPatients.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Priority clinical escalation</div>
          </div>
        </div>
      </div>

      {/* Role Navigation Cards (Patient, Doctor, Operator) */}
      <div>
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
          Hospital Dashboard Portals
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => onNavigateTo('patient', 'patient')}
            className="group bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-teal-500/80 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-800 transition-colors">
                Patient Dashboard
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Simple, calming, mobile-first patient companion. Token status lookup, live queue position, estimated wait, and turn chime.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-teal-700 font-semibold">
              <span>Track Token (e.g. GEN-103)</span>
              <span>Open &rarr;</span>
            </div>
          </div>

          <div
            onClick={() => onNavigateTo('doctor', 'doctor')}
            className="group bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-teal-500/80 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-800 transition-colors">
                Doctor Console
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Clinical workspace for attending physicians. Call next patient, live stopwatch timer, complete consultation, chart inspection.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-700 font-semibold">
              <span>Manage Consultation Chamber</span>
              <span>Open &rarr;</span>
            </div>
          </div>

          <div
            onClick={() => onNavigateTo('operator', 'operator')}
            className="group bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-teal-500/80 hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                Hospital Operator Portal
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Operations control centre. Intake registration, emergency clinical triage confirmation, doctor load balancing, and CSV report.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-semibold">
              <span>Control Operations</span>
              <span>Open &rarr;</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Active Consultation Rooms & Department Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Consultation Rooms (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Active Consultation Chambers</h2>
              <p className="text-xs text-slate-500">Live in-session and next called patients per room</p>
            </div>
            <button
              onClick={() => onNavigateTo('kiosk')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
            >
              <span>Waiting Room TV Mode</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {doctors.map((doc) => {
              const activePatient = patients.find(
                (p) => p.doctorId === doc.id && (p.status === 'Consulting' || p.status === 'Your Turn')
              );
              const waitingCount = patients.filter(
                (p) => p.doctorId === doc.id && p.status === 'Waiting'
              ).length;

              return (
                <div
                  key={doc.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200/70 hover:bg-slate-50/60 transition-colors gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] text-teal-800 font-bold uppercase">
                        {doc.roomNumber.replace('Room ', 'R-')}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{doc.name}</span>
                        <span className="text-xs text-slate-500">· {doc.department}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {doc.availability === 'Available' ? (
                          <span className="text-emerald-700 font-medium">Available</span>
                        ) : doc.availability === 'On Break' ? (
                          <span className="text-amber-700 font-medium">On Break</span>
                        ) : (
                          <span className="text-rose-700 font-medium">Emergency Duty</span>
                        )}
                        <span className="mx-1.5">·</span>
                        <span className="font-mono tabular-nums">{waitingCount} waiting</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Patient In Room */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {activePatient ? (
                      <div className="text-left sm:text-right">
                        <div className="flex items-center gap-2 sm:justify-end">
                          <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {activePatient.tokenNumber}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded ${
                              activePatient.status === 'Consulting'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {activePatient.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mt-1 truncate max-w-[160px]">
                          {activePatient.name}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No patient in room</span>
                    )}

                    <button
                      onClick={() => {
                        if (onSelectDoctor) onSelectDoctor(doc.id);
                        onNavigateTo('doctor', 'doctor');
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Flow Overview */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1">Department Inflow</h2>
            <p className="text-xs text-slate-500 mb-4">Patient distribution and active doctors</p>

            <div className="space-y-2.5">
              {departments.map((dept) => {
                const deptDoctors = doctors.filter((d) => d.department === dept);
                const deptWaiting = patients.filter(
                  (p) => p.department === dept && (p.status === 'Waiting' || p.status === 'Your Turn')
                ).length;
                const deptCompleted = patients.filter(
                  (p) => p.department === dept && p.status === 'Completed'
                ).length;

                return (
                  <div key={dept} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{dept}</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {deptDoctors.length} {deptDoctors.length === 1 ? 'doc' : 'docs'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 mt-2">
                      <span className="font-mono tabular-nums text-teal-800 font-semibold">
                        {deptWaiting} waiting
                      </span>
                      <span className="font-mono tabular-nums text-slate-400 text-[11px]">
                        {deptCompleted} completed
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Registration Banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs">
            <h3 className="text-base font-bold text-white">Need to Register a Patient?</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Generate sequential tokens, assign doctors, and configure clinical triage priority in the Operator Portal.
            </p>
            <button
              onClick={() => onNavigateTo('operator', 'operator')}
              className="mt-4 w-full py-2.5 px-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-2xs"
            >
              Open Patient Registration Form &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
