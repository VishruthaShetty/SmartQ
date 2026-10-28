import React, { useState, useEffect, useMemo } from 'react';
import { Patient, Doctor } from '../../types/queue';
import { SmsMessageRecord, SmsTemplateType } from '../../types/sms';
import {
  sendMockSms,
  getSmsRecordsForPatient,
  retryFailedSms,
} from '../../services/smsService';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  X,
  Phone,
  ShieldAlert,
  Sparkles,
  Radio,
  Check,
  Smartphone,
  Info,
} from 'lucide-react';

interface SendSmsModalProps {
  patient: Patient | null;
  doctor?: Doctor | null;
  isOpen: boolean;
  onClose: () => void;
  onSent?: (record: SmsMessageRecord) => void;
}

export const SendSmsModal: React.FC<SendSmsModalProps> = ({
  patient,
  doctor,
  isOpen,
  onClose,
  onSent,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplateType>('urgent_turn');
  const [messageText, setMessageText] = useState('');
  const [simulateFailure, setSimulateFailure] = useState(false);

  // Active in-modal delivery simulation state
  const [isSending, setIsSending] = useState(false);
  const [latestSentRecord, setLatestSentRecord] = useState<SmsMessageRecord | null>(null);
  const [patientHistory, setPatientHistory] = useState<SmsMessageRecord[]>([]);

  // Initialize phone number and message template when modal opens
  useEffect(() => {
    if (!patient) return;

    // Use patient phone or format a demo standard phone
    const defaultPhone = patient.phone || `+91 98765 ${patient.tokenNumber.replace(/\D/g, '').padStart(5, '0').slice(-5)}`;
    setPhoneNumber(defaultPhone);
    setLatestSentRecord(null);
    setIsSending(false);

    // Refresh history
    setPatientHistory(getSmsRecordsForPatient(patient.id));
  }, [patient]);

  // Update default text template when template or patient changes
  useEffect(() => {
    if (!patient) return;
    const docName = doctor?.name || 'Attending Physician';
    const room = patient.roomNumber || doctor?.roomNumber || 'Room 101';

    if (selectedTemplate === 'urgent_turn') {
      setMessageText(
        `URGENT: Token ${patient.tokenNumber} (${patient.name}), you are next in line for ${docName} in ${room}. Please proceed to the consultation room area immediately.`
      );
    } else if (selectedTemplate === 'doctor_calling') {
      setMessageText(
        `ROOM CALL: Token ${patient.tokenNumber}, ${docName} is calling you right now into ${room}. Please enter without delay.`
      );
    } else if (selectedTemplate === 'triage_priority') {
      setMessageText(
        `TRIAGE UPDATE: Token ${patient.tokenNumber} has been prioritized for urgent review by clinical triage. ${docName} (${room}) is assigned.`
      );
    } else if (selectedTemplate === 'custom') {
      // Keep existing custom text or provide boilerplate
      if (!messageText) {
        setMessageText(
          `NOTICE: Hospital update for Token ${patient.tokenNumber} (${patient.name}). Please report to the central outpatient desk.`
        );
      }
    }
  }, [selectedTemplate, patient, doctor]);

  const charCount = messageText.length;
  const segmentCount = Math.ceil(charCount / 160) || 1;

  if (!isOpen || !patient) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim() || !messageText.trim() || isSending) return;

    setIsSending(true);

    try {
      const record = await sendMockSms({
        patient,
        phone: phoneNumber.trim(),
        messageText: messageText.trim(),
        templateType: selectedTemplate,
        simulateFailure,
      });

      setLatestSentRecord(record);
      setPatientHistory(getSmsRecordsForPatient(patient.id));
      if (onSent) onSent(record);
    } catch (err) {
      console.error('Error dispatching mock SMS', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = async (recordId: string) => {
    try {
      const updated = await retryFailedSms(recordId);
      setLatestSentRecord(updated);
      setPatientHistory(getSmsRecordsForPatient(patient.id));
    } catch (e) {
      console.error('Retry failed', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-5 sm:p-6 shadow-2xl my-6 space-y-4 text-xs">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Send Urgent Patient SMS Alert
                </h3>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-200">
                  {patient.tokenNumber}
                </span>
                {patient.priority === 'Emergency' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200">
                    Emergency Triage
                  </span>
                )}
                {patient.priority === 'Urgent' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                    Urgent
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Patient: <strong className="text-slate-800">{patient.name}</strong> · Attending:{' '}
                <strong className="text-slate-800">{doctor?.name || 'Physician'}</strong> ({patient.roomNumber})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSend} className="space-y-4">
          {/* Recipient Phone Input */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-700" />
                <span>Recipient Mobile Number *</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                E.164 international standard format
              </span>
            </label>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 98765 00000"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white transition-all"
            />
          </div>

          {/* Quick Preset Templates */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Select Urgent Alert Template:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedTemplate('urgent_turn')}
                className={`p-2.5 rounded-lg border text-left transition-all flex items-start gap-2 ${
                  selectedTemplate === 'urgent_turn'
                    ? 'bg-teal-50/80 border-teal-600 text-teal-950 font-semibold ring-1 ring-teal-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs">Urgent Turn Approaching</div>
                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    Next in line alert for waiting area
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('doctor_calling')}
                className={`p-2.5 rounded-lg border text-left transition-all flex items-start gap-2 ${
                  selectedTemplate === 'doctor_calling'
                    ? 'bg-teal-50/80 border-teal-600 text-teal-950 font-semibold ring-1 ring-teal-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs">Doctor Calling to Room</div>
                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    Direct entry chime and room alert
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('triage_priority')}
                className={`p-2.5 rounded-lg border text-left transition-all flex items-start gap-2 ${
                  selectedTemplate === 'triage_priority'
                    ? 'bg-teal-50/80 border-teal-600 text-teal-950 font-semibold ring-1 ring-teal-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs">Triage Priority Escalated</div>
                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    Emergency triage expedition
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('custom')}
                className={`p-2.5 rounded-lg border text-left transition-all flex items-start gap-2 ${
                  selectedTemplate === 'custom'
                    ? 'bg-teal-50/80 border-teal-600 text-teal-950 font-semibold ring-1 ring-teal-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs">Custom Message</div>
                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    Write bespoke dispatch text
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Message Text Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">SMS Message Payload *</label>
              <span
                className={`text-[10px] font-mono ${
                  charCount > 160 ? 'text-amber-700 font-bold' : 'text-slate-400'
                }`}
              >
                {charCount} / 160 chars · {segmentCount} SMS segment{segmentCount > 1 ? 's' : ''}
              </span>
            </div>
            <textarea
              rows={3}
              required
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                if (selectedTemplate !== 'custom') setSelectedTemplate('custom');
              }}
              placeholder="Enter message text to dispatch via cellular gateway..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white transition-all"
            />
          </div>

          {/* Test Option: Failure Simulation Toggle */}
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800 block text-[11px]">
                Simulate Carrier Network Failure (Demo Testing)
              </span>
              <span className="text-[10px] text-slate-500">
                Tests edge-case error delivery status and one-click operator retry workflow
              </span>
            </div>
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(e) => setSimulateFailure(e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
            />
          </div>

          {/* Send / Dispatch Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || !messageText.trim()}
              className={`px-4 py-2 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-all ${
                isSending
                  ? 'bg-teal-400 cursor-wait'
                  : 'bg-teal-700 hover:bg-teal-800 active:scale-98'
              }`}
            >
              <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-spin' : ''}`} />
              <span>{isSending ? 'Transmitting via Gateway...' : 'Send SMS Alert'}</span>
            </button>
          </div>
        </form>

        {/* Live Delivery Status Simulator Card (Appears after or during dispatch) */}
        {(isSending || latestSentRecord) && (
          <div
            className={`p-3.5 rounded-xl border text-xs transition-all animate-in fade-in ${
              isSending
                ? 'bg-blue-50/80 border-blue-200 text-blue-950'
                : latestSentRecord?.status === 'delivered'
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : latestSentRecord?.status === 'failed'
                ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                : 'bg-amber-50/80 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold flex items-center gap-2">
                {isSending ? (
                  <>
                    <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
                    <span>Gateway Routing in Progress...</span>
                  </>
                ) : latestSentRecord?.status === 'delivered' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>SMS Delivery Confirmed to Handset</span>
                  </>
                ) : latestSentRecord?.status === 'failed' ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Delivery Failure Detected</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Queued at Telephony Exchange</span>
                  </>
                )}
              </div>

              {/* Status Pill */}
              <span
                className={`font-mono font-bold text-[10px] uppercase px-2 py-0.5 rounded ${
                  isSending
                    ? 'bg-blue-200 text-blue-900'
                    : latestSentRecord?.status === 'delivered'
                    ? 'bg-emerald-200 text-emerald-900'
                    : latestSentRecord?.status === 'failed'
                    ? 'bg-rose-200 text-rose-900'
                    : 'bg-amber-200 text-amber-900'
                }`}
              >
                {isSending ? 'In Transit' : latestSentRecord?.status}
              </span>
            </div>

            {/* Delivery Details */}
            {latestSentRecord && (
              <div className="space-y-1 text-[11px] opacity-90 pt-1 border-t border-slate-200/60 font-mono">
                <div className="flex justify-between">
                  <span className="font-sans text-slate-600">Gateway Message ID:</span>
                  <span className="font-bold">{latestSentRecord.gatewayMessageId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-slate-600">Recipient Handset:</span>
                  <span>{latestSentRecord.recipientPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-slate-600">Round-Trip Latency:</span>
                  <span>{latestSentRecord.latencyMs ? `${latestSentRecord.latencyMs}ms` : '420ms'}</span>
                </div>
                {latestSentRecord.failureReason && (
                  <div className="text-rose-700 font-sans font-medium pt-1">
                    Error: {latestSentRecord.failureReason}
                  </div>
                )}
              </div>
            )}

            {latestSentRecord?.status === 'failed' && (
              <div className="mt-2.5 pt-2 border-t border-rose-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleRetry(latestSentRecord.id)}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold text-[11px] flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry Delivery Now</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recent SMS History for this Patient */}
        {patientHistory.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span>SMS Dispatch History for {patient.tokenNumber}</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {patientHistory.length} message{patientHistory.length > 1 ? 's' : ''} logged
              </span>
            </div>

            <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
              {patientHistory.map((rec) => (
                <div
                  key={rec.id}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-2 text-[11px]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500">
                        {new Date(rec.sentAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {rec.recipientPhone}
                      </span>
                      <span
                        className={`font-mono text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                          rec.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'failed'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </div>
                    <p className="text-slate-600 truncate mt-0.5">{rec.messageText}</p>
                  </div>

                  {rec.status === 'failed' && (
                    <button
                      type="button"
                      onClick={() => handleRetry(rec.id)}
                      className="px-2 py-0.5 text-[10px] text-rose-700 hover:bg-rose-100 rounded border border-rose-200 shrink-0 font-medium"
                    >
                      Retry
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prototype Transparency Note */}
        <div className="p-2 rounded-lg bg-slate-100/70 text-slate-500 text-[10px] flex items-center gap-1.5 border border-slate-200/60">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            Mock SMS Service: Message lifecycle and carrier acknowledgments are realistically simulated in-app.
          </span>
        </div>
      </div>
    </div>
  );
};
