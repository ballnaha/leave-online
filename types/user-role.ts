export const USER_ROLES = [
  'employee',
  'shift_supervisor',
  'section_head',
  'dept_manager',
  'hr_manager',
  'admin',
  'hr',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const isUserRole = (value: string): value is UserRole =>
  USER_ROLES.includes(value as UserRole);
