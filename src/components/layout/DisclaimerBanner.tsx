import React, { useState } from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <aside aria-label="Medical prototype disclaimer" className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="leading-snug">
            <span className="font-semibold">Academic Prototype Notice:</span> SmartQueue is a college hackathon project demonstration. Waiting times are estimates based on configurable averages. Acute medical emergencies must follow standard in-person hospital clinical triage immediately.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-700 hover:text-amber-950 p-1 rounded hover:bg-amber-100 transition-colors shrink-0"
          title="Dismiss notice"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
