import React from 'react';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Shield,
  BarChart2,
  Tv,
  Settings,
  Activity,
  HeartPulse,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  activeRole: 'patient' | 'doctor' | 'operator' | 'guest';
  onSwitchRole: (role: 'patient' | 'doctor' | 'operator' | 'guest') => void;
  onOpenKiosk: () => void;
  onOpenSettings: () => void;
  waitingCount: number;
  consultingCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeRole,
  onSwitchRole,
  onOpenKiosk,
  onOpenSettings,
  waitingCount,
  consultingCount,
}) => {
  const navItems = [
    {
      id: 'overview',
      label: 'Hospital Overview',
      icon: LayoutDashboard,
      description: 'Live department view',
    },
    {
      id: 'patient',
      label: 'Patient Dashboard',
      icon: Users,
      role: 'patient' as const,
      badge: waitingCount > 0 ? `${waitingCount} waiting` : undefined,
    },
    {
      id: 'doctor',
      label: 'Doctor Console',
      icon: Stethoscope,
      role: 'doctor' as const,
      badge: consultingCount > 0 ? `${consultingCount} active` : undefined,
    },
    {
      id: 'operator',
      label: 'Operator Portal',
      icon: Shield,
      role: 'operator' as const,
      description: 'Registration & triage',
    },
    {
      id: 'analytics',
      label: 'Queue Analytics',
      icon: BarChart2,
      description: 'Workload & statistics',
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 h-[calc(100vh-4rem)] sticky top-16">
      <div className="p-4 flex-1 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          {/* Section: Main Navigation */}
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-3 mb-2">
              Clinical Navigation
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.role) onSwitchRole(item.role);
                      onSelectTab(item.id);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-teal-50 text-teal-900 border border-teal-200/80 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-teal-700' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isActive
                            ? 'bg-teal-200/80 text-teal-950'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Waiting Hall Display Board Launcher */}
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-3 mb-2">
              Public Screens
            </div>
            <button
              onClick={onOpenKiosk}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/80 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Tv className="w-4 h-4 text-slate-500 group-hover:text-teal-700" />
                <span>Waiting Room TV Mode</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                Kiosk
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Hospital Live Summary Widget */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-semibold text-slate-700">Live Queue Status</span>
              <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-slate-500">Waiting:</span>
              <span className="font-mono font-bold text-teal-800">{waitingCount}</span>
            </div>
            <div className="flex items-center justify-between mt-0.5 text-[11px]">
              <span className="text-slate-500">In Room:</span>
              <span className="font-mono font-bold text-emerald-800">{consultingCount}</span>
            </div>
          </div>

          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Settings & Sync</span>
            </div>
            <span className="text-[10px] text-teal-700 font-semibold">Demo Mode</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
