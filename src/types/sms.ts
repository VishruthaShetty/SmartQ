export type SmsDeliveryStatus = 'queued' | 'sending' | 'delivered' | 'failed';

export type SmsTemplateType =
  | 'urgent_turn'
  | 'doctor_calling'
  | 'triage_priority'
  | 'custom';

export interface SmsMessageRecord {
  id: string;
  patientId: string;
  tokenNumber: string;
  patientName: string;
  recipientPhone: string;
  messageText: string;
  templateType: SmsTemplateType;
  status: SmsDeliveryStatus;
  sentAt: string;
  deliveredAt?: string;
  gatewayMessageId: string;
  carrierNetwork: string;
  latencyMs?: number;
  failureReason?: string;
}
