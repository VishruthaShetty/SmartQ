import { SmsMessageRecord, SmsDeliveryStatus, SmsTemplateType } from '../types/sms';
import { Patient } from '../types/queue';
import { addActivityLog } from './storage';

const SMS_STORAGE_KEY = 'smartqueue_mock_sms_records_v1';

// Seed mock SMS records to give operators instant historical context
const INITIAL_SMS_RECORDS: SmsMessageRecord[] = [
  {
    id: 'sms-init-01',
    patientId: 'pat-1',
    tokenNumber: 'CARD-101',
    patientName: 'Sarah Jenkins',
    recipientPhone: '+91 98765 11001',
    messageText: 'URGENT: Token CARD-101 (Sarah Jenkins), you are next in line for Dr. Evelyn Reed in Room 101. Please report to the waiting area immediately.',
    templateType: 'urgent_turn',
    status: 'delivered',
    sentAt: new Date(Date.now() - 36 * 60 * 1000).toISOString(),
    deliveredAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    gatewayMessageId: 'MOCK-GW-99412',
    carrierNetwork: 'Hospital Telecom SMS Gateway (Tier-1 Priority)',
    latencyMs: 1140,
  },
  {
    id: 'sms-init-02',
    patientId: 'pat-4',
    tokenNumber: 'CARD-103',
    patientName: 'Dev Patel',
    recipientPhone: '+91 98765 44004',
    messageText: 'TRIAGE PRIORITY: Your appointment for Token CARD-103 has been expedited to Emergency status. Attending Dr. Evelyn Reed Room 101.',
    templateType: 'triage_priority',
    status: 'delivered',
    sentAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    deliveredAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    gatewayMessageId: 'MOCK-GW-99488',
    carrierNetwork: 'Hospital Telecom SMS Gateway (Tier-1 Priority)',
    latencyMs: 980,
  },
];

type SmsListener = () => void;
const smsListeners: Set<SmsListener> = new Set();

export function subscribeToSms(listener: SmsListener) {
  smsListeners.add(listener);
  return () => {
    smsListeners.delete(listener);
  };
}

function emitSmsChange() {
  smsListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Error invoking SMS listener', e);
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('smartqueue_sms_updated'));
  }
}

export function getStoredSmsRecords(): SmsMessageRecord[] {
  if (typeof window === 'undefined') return INITIAL_SMS_RECORDS;
  try {
    const raw = localStorage.getItem(SMS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SMS_STORAGE_KEY, JSON.stringify(INITIAL_SMS_RECORDS));
      return INITIAL_SMS_RECORDS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading SMS records', e);
    return INITIAL_SMS_RECORDS;
  }
}

export function saveSmsRecords(records: SmsMessageRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SMS_STORAGE_KEY, JSON.stringify(records.slice(0, 100)));
    emitSmsChange();
  } catch (e) {
    console.error('Failed saving SMS records', e);
  }
}

export function getSmsRecordsForPatient(patientId: string): SmsMessageRecord[] {
  const all = getStoredSmsRecords();
  return all.filter((r) => r.patientId === patientId);
}

export function getLatestSmsForPatient(patientId: string): SmsMessageRecord | null {
  const records = getSmsRecordsForPatient(patientId);
  if (records.length === 0) return null;
  return records.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0];
}

interface SendMockSmsParams {
  patient: Patient;
  phone: string;
  messageText: string;
  templateType: SmsTemplateType;
  simulateFailure?: boolean;
}

/**
 * Dispatches a simulated mock SMS alert through a realistic gateway lifecycle:
 * 1. Immediate: 'queued'
 * 2. +400ms: 'sending' (cellular route propagation)
 * 3. +1200ms: 'delivered' (or 'failed' if simulation toggled)
 */
export function sendMockSms(params: SendMockSmsParams): Promise<SmsMessageRecord> {
  const { patient, phone, messageText, templateType, simulateFailure = false } = params;

  const smsId = `sms-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const gatewayId = `MOCK-GW-${Math.floor(10000 + Math.random() * 90000)}`;
  const carrier = 'Simulated Hospital SMS Gateway (National Healthcare Route)';

  const newRecord: SmsMessageRecord = {
    id: smsId,
    patientId: patient.id,
    tokenNumber: patient.tokenNumber,
    patientName: patient.name,
    recipientPhone: phone,
    messageText,
    templateType,
    status: 'queued',
    sentAt: new Date().toISOString(),
    gatewayMessageId: gatewayId,
    carrierNetwork: carrier,
  };

  // Persist initial queued record
  const current = getStoredSmsRecords();
  saveSmsRecords([newRecord, ...current]);

  addActivityLog({
    type: 'priority_change',
    title: 'SMS Alert Queued',
    description: `Mock SMS alert queued for dispatch to ${phone} (Token: ${patient.tokenNumber})`,
    tokenNumber: patient.tokenNumber,
    patientName: patient.name,
  });

  return new Promise((resolve) => {
    // Stage 1: In Flight / Sending
    setTimeout(() => {
      updateSmsStatus(smsId, 'sending');

      // Stage 2: Handset Delivery confirmation
      setTimeout(() => {
        const finalStatus: SmsDeliveryStatus = simulateFailure ? 'failed' : 'delivered';
        const deliveredAt = finalStatus === 'delivered' ? new Date().toISOString() : undefined;
        const latencyMs = simulateFailure ? 1450 : 1240;
        const failureReason = simulateFailure ? 'Carrier rejected: Handset unreachable / Subscriber roaming' : undefined;

        const updated = updateSmsStatus(smsId, finalStatus, {
          deliveredAt,
          latencyMs,
          failureReason,
        });

        addActivityLog({
          type: 'priority_change',
          title: finalStatus === 'delivered' ? 'SMS Delivered' : 'SMS Delivery Failed',
          description: finalStatus === 'delivered'
            ? `SMS successfully delivered to ${phone} (${gatewayId})`
            : `SMS failed: ${failureReason}`,
          tokenNumber: patient.tokenNumber,
          patientName: patient.name,
        });

        resolve(updated || newRecord);
      }, 1000);
    }, 400);
  });
}

function updateSmsStatus(
  id: string,
  status: SmsDeliveryStatus,
  extra: Partial<SmsMessageRecord> = {}
): SmsMessageRecord | null {
  const current = getStoredSmsRecords();
  const idx = current.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  const updated: SmsMessageRecord = {
    ...current[idx],
    status,
    ...extra,
  };

  current[idx] = updated;
  saveSmsRecords([...current]);
  return updated;
}

export function retryFailedSms(recordId: string): Promise<SmsMessageRecord> {
  const current = getStoredSmsRecords();
  const target = current.find((r) => r.id === recordId);
  if (!target) return Promise.reject(new Error('Record not found'));

  const newGatewayId = `MOCK-GW-${Math.floor(10000 + Math.random() * 90000)}`;
  updateSmsStatus(recordId, 'sending', {
    gatewayMessageId: newGatewayId,
    failureReason: undefined,
  });

  return new Promise((resolve) => {
    setTimeout(() => {
      const updated = updateSmsStatus(recordId, 'delivered', {
        deliveredAt: new Date().toISOString(),
        latencyMs: 1320,
        failureReason: undefined,
      });
      resolve(updated || target);
    }, 1100);
  });
}
