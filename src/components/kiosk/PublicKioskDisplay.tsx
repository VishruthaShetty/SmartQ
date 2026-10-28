import React, { useState, useEffect } from 'react';
import { Patient, Doctor, HospitalSettings } from '../../types/queue';
import { calculateCrowdLevel } from '../../services/storage';
import {
  Volume2,
  Tv,
  ArrowLeft,
  Clock,
  Activity,
  Maximize2,
  Minimize2,
  Bell,
  Stethoscope,
} from 'lucide-react';
import { playHospitalChime } from '../../utils/audio';

interface PublicKioskDisplayProps {
  patients: Patient[];
  doctors: Doctor[];
  settings: HospitalSettings;
  onClose: () => void;
}

export const PublicKioskDisplay: React.FC<PublicKioskDisplayProps> = ({
  patients,
  doctors,
  settings,
  onClose,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const crowd = calculateCrowdLevel(patients, settings);

  // Called patients (status = 'Your Turn' or 'Consulting')
  const activeRooms = doctors.map((doc) => {
    const currentConsulting = patients.find(
      (p) => p.doctorId === doc.id && p.status === 'Consulting'
    );
    const calledPatient = patients.find(
      (p) => p.doctorId === doc.id && p.status === 'Your Turn'
    );
    const waitingPatients = patients.filter(
      (p) => p.doctorId === doc.id && p.status === 'Waiting'
    );

    return {
      doctor: doc,
      activePatient: calledPatient || currentConsulting || null,
      isActiveCalled: !!calledPatient,
      nextWaiting: waitingPatients[0] || null,
      waitingCount: waitingPatients.length,
    };
  });

  const nextUpcomingQueue = patients
    .filter((p) => p.status === 'Waiting')
    .slice(0, 8);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col overflow-y-auto font-sans">
      {/* Top TV Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-white">SmartQueue</span>
              <span className="text-xs text-teal-400 font-medium ml-2">Waiting Room Display</span>
            </div>
          </div>
        </div>

        {/* Live Clock & Fullscreen */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => playHospitalChime()}
            title="Hospital Chime"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-900/60 hover:bg-teal-800 text-teal-300 text-xs border border-teal-700/50 transition-colors"
          >
            <Volume2 className="w-4 h-4" />
            <span className="hidden sm:inline">Play Chime</span>
          </button>

          <div className="text-right">
            <div className="text-xl font-mono font-bold tracking-wider text-white">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[11px] text-slate-400">
              {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Kiosk Grid */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Banner: Now Calling & Proceed Instructions */}
        <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-slate-900 border border-teal-700/40 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
                Hospital Public Announcer
              </div>
              <div className="text-lg font-bold text-white mt-0.5">
                {settings.announcementText}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-300 bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-800 shrink-0">
            <span>Crowd Level:</span>
            <span
              className={`px-2 py-0.5 rounded font-bold ${
                crowd.level === 'Low'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                  : crowd.level === 'Medium'
                  ? 'bg-amber-950 text-amber-400 border border-amber-700'
                  : 'bg-rose-950 text-rose-400 border border-rose-700'
              }`}
            >
              {crowd.level}
            </span>
            <span className="text-slate-400 font-mono tabular-nums">
              ({crowd.totalWaiting} in waiting queue)
            </span>
          </div>
        </div>

        {/* Big Consultation Rooms Grid */}
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
            Consultation Rooms & Active Calls
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeRooms.map(({ doctor, activePatient, isActiveCalled, nextWaiting, waitingCount }) => (
              <div
                key={doctor.id}
                className={`rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                  isActiveCalled
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-950/50 animate-pulse'
                    : activePatient
                    ? 'bg-slate-900/90 border-teal-600/60'
                    : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div>
                  {/* Room & Doctor Header */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
                    <div>
                      <div className="text-xs font-mono font-bold text-teal-400 uppercase">
                        {doctor.roomNumber}
                      </div>
                      <div className="text-sm font-bold text-white mt-0.5">{doctor.name}</div>
                      <div className="text-[11px] text-slate-400">{doctor.department}</div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        doctor.availability === 'Available'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {doctor.availability}
                    </span>
                  </div>

                  {/* Token Big Display */}
                  <div className="text-center py-4 bg-slate-950/60 rounded-xl border border-slate-800/60">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {isActiveCalled
                        ? 'Now Calling — Please Proceed'
                        : activePatient
                        ? 'Currently In Room'
                        : 'Next Patient Pending'}
                    </div>

                    {activePatient ? (
                      <div className="mt-2">
                        <div
                          className={`text-4xl font-black font-mono tracking-tight ${
                            isActiveCalled ? 'text-emerald-400' : 'text-teal-300'
                          }`}
                        >
                          {activePatient.tokenNumber}
                        </div>
                        <div className="text-xs font-semibold text-slate-200 mt-1 truncate px-2">
                          {activePatient.name}
                        </div>
                      </div>
                    ) : (
                      <div className="text-2xl font-mono text-slate-600 mt-2 italic font-bold">
                        READY
                      </div>
                    )}
                  </div>
                </div>

                {/* Next in Line for this room */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div>
                    Next: <strong className="font-mono text-slate-200">{nextWaiting ? nextWaiting.tokenNumber : 'None'}</strong>
                  </div>
                  <div className="font-mono tabular-nums text-teal-400">{waitingCount} waiting</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Next In Queue Strip */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Upcoming In Queue (Keep Digital Token Ready)
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Auto-advancing on callout
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {nextUpcomingQueue.length === 0 ? (
              <div className="col-span-full py-4 text-center text-xs text-slate-500">
                All waiting patients have been called.
              </div>
            ) : (
              nextUpcomingQueue.map((p, idx) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center"
                >
                  <div className="text-[10px] text-slate-500 font-mono">#{idx + 1} in line</div>
                  <div className="text-base font-black font-mono text-teal-400 mt-0.5">
                    {p.tokenNumber}
                  </div>
                  <div className="text-[11px] text-slate-300 truncate mt-0.5">{p.department}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="bg-slate-900/90 border-t border-slate-800 px-6 py-3 text-center text-[11px] text-slate-500">
        SmartQueue Hospital Queue Management Display · Academic Hackathon Project · Waiting times are estimates.
      </footer>
    </div>
  );
};
