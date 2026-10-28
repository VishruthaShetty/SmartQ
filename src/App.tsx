/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Patient, Doctor, HospitalSettings, AppNotification } from './types/queue';
import {
  getStoredPatients,
  getStoredDoctors,
  getStoredSettings,
  getStoredNotifications,
  subscribeToQueue,
} from './services/storage';

// Layout & Navigation Components
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DisclaimerBanner } from './components/layout/DisclaimerBanner';

// Dashboard Views
import { OverviewDashboard } from './components/overview/OverviewDashboard';
import { PatientDashboard } from './components/patient/PatientDashboard';
import { DoctorDashboard } from './components/doctor/DoctorDashboard';
import { OperatorDashboard } from './components/operator/OperatorDashboard';
import { QueueAnalytics } from './components/analytics/QueueAnalytics';
import { PublicKioskDisplay } from './components/kiosk/PublicKioskDisplay';
import { SettingsModal } from './components/settings/SettingsModal';
import { NotificationToastContainer } from './components/notifications/NotificationToastContainer';

import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Shield,
  BarChart2,
} from 'lucide-react';

export default function App() {
  const [patients, setPatients] = useState<Patient[]>(getStoredPatients());
  const [doctors, setDoctors] = useState<Doctor[]>(getStoredDoctors());
  const [settings, setSettings] = useState<HospitalSettings>(getStoredSettings());
  const [notifications, setNotifications] = useState<AppNotification[]>(getStoredNotifications());

  // Navigation and active context
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [activeRole, setActiveRole] = useState<'patient' | 'doctor' | 'operator' | 'guest'>('operator');
  const [activeDoctorId, setActiveDoctorId] = useState<string>('doc-1');
  const [selectedPatientToken, setSelectedPatientToken] = useState<string>('GEN-103');

  // Modals & Screens
  const [isKioskOpen, setIsKioskOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Subscribe to storage changes (supports intra-app and cross-tab real-time updates)
  useEffect(() => {
    const handleSync = () => {
      setPatients(getStoredPatients());
      setDoctors(getStoredDoctors());
      setSettings(getStoredSettings());
      setNotifications(getStoredNotifications());
    };

    const unsubscribe = subscribeToQueue(handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('smartqueue_state_updated', handleSync);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('smartqueue_state_updated', handleSync);
    };
  }, []);

  const waitingCount = patients.filter(
    (p) => p.status === 'Waiting' || p.status === 'Your Turn'
  ).length;
  const consultingCount = patients.filter((p) => p.status === 'Consulting').length;

  const handleNavigateTo = (tab: string, role?: 'patient' | 'doctor' | 'operator') => {
    if (tab === 'kiosk') {
      setIsKioskOpen(true);
      return;
    }
    setCurrentTab(tab);
    if (role) {
      setActiveRole(role);
    }
  };

  const handleSelectDoctor = (doctorId: string) => {
    setActiveDoctorId(doctorId);
    setActiveRole('doctor');
    setCurrentTab('doctor');
  };

  const handleSelectPatientToken = (token: string) => {
    setSelectedPatientToken(token);
    setActiveRole('patient');
    setCurrentTab('patient');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-teal-600 selection:text-white">
      {/* Hackathon Prototype Medical Disclaimer */}
      <DisclaimerBanner />

      {/* Top Header Navigation with Breadcrumbs & Notification Popover */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeRole={activeRole}
        onSwitchRole={setActiveRole}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenKiosk={() => setIsKioskOpen(true)}
        notifications={notifications}
        selectedPatientToken={selectedPatientToken}
        activeDoctorId={activeDoctorId}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Desktop Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          activeRole={activeRole}
          onSwitchRole={setActiveRole}
          onOpenKiosk={() => setIsKioskOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          waitingCount={waitingCount}
          consultingCount={consultingCount}
        />

        {/* Dynamic Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-20 lg:pb-8">
          {currentTab === 'overview' && (
            <OverviewDashboard
              patients={patients}
              doctors={doctors}
              settings={settings}
              onNavigateTo={handleNavigateTo}
              onSelectDoctor={handleSelectDoctor}
              onSelectPatientToken={handleSelectPatientToken}
            />
          )}

          {currentTab === 'patient' && (
            <PatientDashboard
              patients={patients}
              doctors={doctors}
              settings={settings}
              selectedToken={selectedPatientToken}
              onSelectToken={setSelectedPatientToken}
              notifications={notifications}
            />
          )}

          {currentTab === 'doctor' && (
            <DoctorDashboard
              doctors={doctors}
              patients={patients}
              settings={settings}
              activeDoctorId={activeDoctorId}
              onSelectDoctor={setActiveDoctorId}
              notifications={notifications}
            />
          )}

          {currentTab === 'operator' && (
            <OperatorDashboard
              patients={patients}
              doctors={doctors}
              settings={settings}
              onSelectTokenForPatientView={handleSelectPatientToken}
              notifications={notifications}
            />
          )}

          {currentTab === 'analytics' && (
            <QueueAnalytics
              patients={patients}
              doctors={doctors}
              settings={settings}
            />
          )}
        </main>
      </div>

      {/* Real-time In-App Notification Toasts Container */}
      <NotificationToastContainer onNavigateToToken={handleSelectPatientToken} />

      {/* Mobile Sticky Bottom Navigation Bar (Visible on mobile/tablet) */}
      <nav aria-label="Mobile Navigation" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setCurrentTab('overview')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
            currentTab === 'overview' ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Overview</span>
        </button>
        <button
          onClick={() => {
            setActiveRole('patient');
            setCurrentTab('patient');
          }}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
            currentTab === 'patient' ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span>Patient</span>
        </button>
        <button
          onClick={() => {
            setActiveRole('doctor');
            setCurrentTab('doctor');
          }}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
            currentTab === 'doctor' ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Stethoscope className="w-4 h-4 mb-0.5" />
          <span>Doctor</span>
        </button>
        <button
          onClick={() => {
            setActiveRole('operator');
            setCurrentTab('operator');
          }}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
            currentTab === 'operator' ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4 mb-0.5" />
          <span>Operator</span>
        </button>
        <button
          onClick={() => setCurrentTab('analytics')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
            currentTab === 'analytics' ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart2 className="w-4 h-4 mb-0.5" />
          <span>Analytics</span>
        </button>
      </nav>

      {/* Fullscreen Waiting Room TV Kiosk Mode */}
      {isKioskOpen && (
        <PublicKioskDisplay
          patients={patients}
          doctors={doctors}
          settings={settings}
          onClose={() => setIsKioskOpen(false)}
        />
      )}

      {/* Settings & Configuration Modal */}
      <SettingsModal
        settings={settings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeRole={activeRole}
        onSwitchRole={setActiveRole}
      />
    </div>
  );
}
