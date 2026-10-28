import { Patient, Doctor } from '../types/queue';

export function exportQueueToCsv(patients: Patient[], doctors: Doctor[]) {
  const doctorMap = new Map(doctors.map((d) => [d.id, d]));

  const headers = [
    'Token Number',
    'Patient Name',
    'Age',
    'Gender',
    'Department',
    'Assigned Doctor',
    'Consultation Room',
    'Priority',
    'Status',
    'Registration Time',
    'Consultation Duration (mins)',
    'Clinical Notes',
  ];

  const rows = patients.map((p) => {
    const doc = doctorMap.get(p.doctorId);
    return [
      `"${p.tokenNumber}"`,
      `"${p.name}"`,
      p.age,
      `"${p.gender}"`,
      `"${p.department}"`,
      `"${doc ? doc.name : 'Unassigned'}"`,
      `"${p.roomNumber || (doc ? doc.roomNumber : 'N/A')}"`,
      `"${p.priority}"`,
      `"${p.status}"`,
      `"${new Date(p.registrationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}"`,
      p.consultationDurationMinutes ?? 'N/A',
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `smartqueue_report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
