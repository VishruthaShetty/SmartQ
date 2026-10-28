import React, { useState } from 'react';
import { HospitalSettings } from '../../types/queue';
import { saveSettings, resetToDemoData } from '../../services/storage';
import {
  Settings,
  X,
  Volume2,
  VolumeX,
  Database,
  RotateCcw,
  Sliders,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Info,
  Server,
  User,
  Shield,
  Stethoscope,
} from 'lucide-react';
import { playHospitalChime } from '../../utils/audio';

interface SettingsModalProps {
  settings: HospitalSettings;
  isOpen: boolean;
  onClose: () => void;
  activeRole: 'patient' | 'doctor' | 'operator' | 'guest';
  onSwitchRole: (role: 'patient' | 'doctor' | 'operator' | 'guest') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  activeRole,
  onSwitchRole,
}) => {
  const [avgMinutes, setAvgMinutes] = useState(settings.averageConsultationMinutes);
  const [crowdMedium, setCrowdMedium] = useState(settings.crowdThresholdMedium);
  const [crowdHigh, setCrowdHigh] = useState(settings.crowdThresholdHigh);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundAlertsEnabled);
  const [announcement, setAnnouncement] = useState(settings.announcementText);
  const [activeTab, setActiveTab] = useState<'parameters' | 'database' | 'profile'>('parameters');
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings({
      ...settings,
      averageConsultationMinutes: Number(avgMinutes),
      crowdThresholdMedium: Number(crowdMedium),
      crowdThresholdHigh: Number(crowdHigh),
      soundAlertsEnabled: soundEnabled,
      announcementText: announcement,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all queues, doctors, and patient records back to default demo state?')) {
      resetToDemoData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-teal-700" />
            <h2 className="text-base font-bold text-slate-900">Hospital System Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="px-6 pt-2 border-b border-slate-100 flex gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('parameters')}
            className={`pb-2.5 transition-colors border-b-2 ${
              activeTab === 'parameters'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Queue Parameters
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`pb-2.5 transition-colors border-b-2 ${
              activeTab === 'database'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Backend & Persistence
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 transition-colors border-b-2 ${
              activeTab === 'profile'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Role & Account
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {savedNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2 text-xs font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Settings updated successfully!</span>
            </div>
          )}

          {activeTab === 'parameters' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Average Consultation Duration (Minutes)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={3}
                    max={60}
                    value={avgMinutes}
                    onChange={(e) => setAvgMinutes(Number(e.target.value))}
                    className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  />
                  <span className="text-slate-500">
                    Used to calculate Estimated Waiting Time for patients in queue.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Medium Crowd Threshold
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={50}
                    value={crowdMedium}
                    onChange={(e) => setCrowdMedium(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Waiting count to trigger Medium</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    High Crowd Threshold
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={crowdHigh}
                    onChange={(e) => setCrowdHigh(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Waiting count to trigger High</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Waiting Hall Audio Chime
                </label>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-teal-700" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-slate-700 font-medium">
                      Play synthesized hospital announcement chime on turn call
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => playHospitalChime()}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-teal-800 text-[11px] font-semibold rounded border border-slate-200 transition-colors"
                    >
                      Test Chime
                    </button>
                    <button
                      type="button"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        soundEnabled ? 'bg-teal-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          soundEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Waiting Hall Display Announcement Text
                </label>
                <input
                  type="text"
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs"
              >
                Save Settings
              </button>
            </form>
          )}

          {activeTab === 'database' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-teal-700" />
                  <span className="font-bold text-slate-900">Active Storage Mode:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                    Local Storage Demo Mode
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  All state changes (registering patients, calling next, completing consultations, doctor availability, and triage reassignments) are persistently stored in browser <code className="font-mono bg-slate-200 px-1 rounded">localStorage</code> and synchronized in real time across all open tabs.
                </p>
                <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Multi-Device Notice:</strong> Data is currently stored locally in this browser. To sync across multiple physical hardware devices, connect a shared Cloud Firestore database using Firebase Auth.
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-2">How to Connect Cloud Firestore</h3>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-[11px]">
                  <li>Provide your Firebase credentials or trigger Firebase setup via AI Studio.</li>
                  <li>Enable Cloud Firestore and Firebase Authentication with Email/Anonymous providers.</li>
                  <li>Configure collection rules for <code className="font-mono">patients</code> and <code className="font-mono">doctors</code>.</li>
                  <li>The app will automatically bind real-time snapshots via <code className="font-mono">onSnapshot()</code>.</li>
                </ol>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetData}
                  className="w-full py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-semibold rounded-lg text-xs border border-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Queue Data to Hackathon Demo Defaults</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-1">Active Role Switcher</h3>
                <p className="text-slate-500 text-[11px] mb-3">
                  Instantly simulate different actor experiences in the hospital queue:
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onSwitchRole('patient')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      activeRole === 'patient'
                        ? 'bg-teal-50 border-teal-500 text-teal-900 font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <User className="w-4 h-4 mb-1 text-teal-700" />
                    <div>Patient</div>
                    <div className="text-[10px] text-slate-500 font-normal">Track token status</div>
                  </button>

                  <button
                    onClick={() => onSwitchRole('doctor')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      activeRole === 'doctor'
                        ? 'bg-teal-50 border-teal-500 text-teal-900 font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4 mb-1 text-indigo-700" />
                    <div>Doctor</div>
                    <div className="text-[10px] text-slate-500 font-normal">Manage room queue</div>
                  </button>

                  <button
                    onClick={() => onSwitchRole('operator')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      activeRole === 'operator'
                        ? 'bg-teal-50 border-teal-500 text-teal-900 font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Shield className="w-4 h-4 mb-1 text-emerald-700" />
                    <div>Operator</div>
                    <div className="text-[10px] text-slate-500 font-normal">Intake & triage</div>
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] space-y-1">
                <div className="font-semibold text-slate-800">SmartQueue Build Information</div>
                <div>Hackathon Edition v1.2.0 · MIT Licensed Prototype</div>
                <div>Frontend: React 19 + TypeScript + Tailwind CSS</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
