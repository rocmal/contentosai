// Palette from design_handoff_mobile_app (Tailwind blue/slate/emerald equivalents).
export const colors = {
  primary: '#2563eb',
  primaryPressed: '#1d4ed8',
  primaryTint: '#dbeafe',
  primarySoft: '#eff6ff',
  navy: '#172554',
  success: '#059669',
  successTint: '#ecfdf5',
  danger: '#dc2626',
  dangerTint: '#fef2f2',
  text: '#0f172a',
  textMuted: '#475569',
  textFaint: '#94a3b8',
  surface: '#f1f5f9',
  border: '#e2e8f0',
  background: '#ffffff',
} as const;

export const radius = { card: 20, control: 14, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
