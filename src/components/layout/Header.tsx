import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  Tv,
  Settings,
  Bell,
  ChevronDown,
  User,
  Stethoscope,
  Shield,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  ExternalLink,
} from 'lucide-react';
import { AppNotification } from '../../types/queue';
import { markNotificationRead, markAllNotificationsRead } from '../../services/storage';
import { NotificationBell } from '../notifications/NotificationBell';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  activeRole: 'patient' | 'doctor' | 'operator' | 'guest';
  onSwitchRole: (role: 'patient' | 'doctor' | 'operator' | 'guest') => void;
  onOpenSettings: () => void;
  onOpenKiosk: () => void;
  notifications: AppNotification[];
  selectedPatientToken?: string;
  activeDoctorId?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  activeRole,
  onSwitchRole,
  onOpenSettings,
  onOpenKiosk,
  notifications,
  selectedPatientToken,
  activeDoctorId,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const breadcrumbs: Record<string, { portal: string; view: string }> = {
    overview: { portal: 'SmartQueue Center', view: 'Hospital Overview' },
    patient: { portal: 'Patient Portal', view: 'My Queue Ticket & Tracking' },
    doctor: { portal: 'Physician Console', view: 'Consultation & Triage' },
    operator: { portal: 'Operations Command', view: 'Hospital Queue Control' },
    analytics: { portal: 'Business Intelligence', view: 'Queue Performance' },
  };

  const currentCrumb = breadcrumbs[currentTab] || { portal: 'SmartQueue', view: 'Dashboard' };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-15 gap-4">
        {/* Left: Brand & Breadcrumbs */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Logo */}
          <button
            onClick={() => onSelectTab('overview')}
            className="flex items-center gap-2.5 text-left focus:outline-none group shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-xs group-hover:bg-teal-800 transition-colors">
              <Activity className="w-4.5 h-4.5" />
            </div>
            <div className="hidden sm:block">
              <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-teal-800 transition-colors">
                SmartQueue
              </span>
              <span className="text-[10px] block font-medium text-slate-500 uppercase tracking-wider -mt-0.5">
                Hospital System
              </span>
            </div>
          </button>

          {/* Hairline Divider */}
          <div className="hidden md:block h-5 w-px bg-slate-200 shrink-0" />

          {/* Breadcrumb Trail */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 truncate">
            <span className="text-slate-600 font-medium">{currentCrumb.portal}</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold truncate">{currentCrumb.view}</span>
          </div>
        </div>

        {/* Center / Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100/70 p-1 rounded-lg border border-slate-200/60">
          <button
            onClick={() => onSelectTab('overview')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentTab === 'overview'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => {
              onSwitchRole('patient');
              onSelectTab('patient');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentTab === 'patient'
                ? 'bg-white text-teal-800 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Patient Ticket
          </button>
          <button
            onClick={() => {
              onSwitchRole('doctor');
              onSelectTab('doctor');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentTab === 'doctor'
                ? 'bg-white text-teal-800 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Doctor Console
          </button>
          <button
            onClick={() => {
              onSwitchRole('operator');
              onSelectTab('operator');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentTab === 'operator'
                ? 'bg-white text-teal-800 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hospital Operator
          </button>
          <button
            onClick={() => onSelectTab('analytics')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              currentTab === 'analytics'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Analytics
          </button>
        </nav>

        {/* Right Utility Bar */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Waiting Room TV Screen Link */}
          <button
            onClick={onOpenKiosk}
            title="Launch Public Waiting Room TV Kiosk"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <Tv className="w-3.5 h-3.5 text-slate-500" />
            <span>TV Display</span>
          </button>

          {/* Hospital Queue & Role-Aware Notifications Dropdown */}
          <NotificationBell
            notifications={notifications}
            role={activeRole === 'guest' ? 'all' : activeRole}
            patientToken={selectedPatientToken}
            doctorId={activeDoctorId}
            compact
          />

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            title="Hospital System Configuration"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200/80 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Profile & Role Switcher Menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800 transition-colors"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                  activeRole === 'patient'
                    ? 'bg-teal-600'
                    : activeRole === 'doctor'
                    ? 'bg-blue-600'
                    : 'bg-emerald-600'
                }`}
              >
                {activeRole === 'patient' ? 'P' : activeRole === 'doctor' ? 'Dr' : 'Op'}
              </div>
              <span className="capitalize hidden sm:inline font-semibold text-slate-800">
                {activeRole}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 text-xs animate-in fade-in zoom-in-95">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <div className="font-semibold text-slate-900">Active Hospital Persona</div>
                  <div className="text-[11px] text-slate-500">
                    Switch roles to evaluate distinct workflows
                  </div>
                </div>

                <div className="p-1.5 space-y-1">
                  <button
                    onClick={() => {
                      onSwitchRole('patient');
                      onSelectTab('patient');
                      setShowProfileMenu(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeRole === 'patient'
                        ? 'bg-teal-50 text-teal-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <User className="w-4 h-4 text-teal-600 shrink-0" />
                    <div>
                      <div className="font-medium">Patient Dashboard</div>
                      <div className="text-[10px] text-slate-500">
                        Ticket, wait estimation & turn chimes
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onSwitchRole('doctor');
                      onSelectTab('doctor');
                      setShowProfileMenu(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeRole === 'doctor'
                        ? 'bg-blue-50 text-blue-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-medium">Doctor Console</div>
                      <div className="text-[10px] text-slate-500">
                        Chamber stopwatch, call next & triage
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onSwitchRole('operator');
                      onSelectTab('operator');
                      setShowProfileMenu(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeRole === 'operator'
                        ? 'bg-emerald-50 text-emerald-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-medium">Hospital Operator</div>
                      <div className="text-[10px] text-slate-500">
                        Registration, load balance & CSV
                      </div>
                    </div>
                  </button>
                </div>

                <div className="pt-1.5 mt-1.5 border-t border-slate-100 px-3">
                  <div className="text-[10px] text-slate-400 font-mono">
                    Session: Local Demo Mode (Persistent)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
