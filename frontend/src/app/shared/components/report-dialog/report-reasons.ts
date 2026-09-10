import type { ReportReasonEnum } from '@core/api/api.models';

export interface ReportReasonOption {
  value: ReportReasonEnum;
  label: string;
}

export const REPORT_REASONS: readonly ReportReasonOption[] = [
  { value: 'spam', label: 'Spam o publicidad' },
  { value: 'harassment', label: 'Acoso o mensajes ofensivos' },
  { value: 'inappropriate_content', label: 'Contenido inapropiado' },
  { value: 'fake_profile', label: 'Perfil falso o suplantación' },
  { value: 'other', label: 'Otro motivo' },
];
