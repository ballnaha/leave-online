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

export const ROLE_WEIGHTS: Record<UserRole | string, number> = {
  'employee': 1,
  'shift_supervisor': 2,
  'section_head': 3,
  'dept_manager': 4,
  'hr': 5,
  'hr_manager': 6,
  'admin': 10,
};
