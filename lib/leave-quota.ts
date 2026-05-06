export const VACATION_LEAVE_CODES = ['vacation', 'annual'];

export type LeaveTypeLike = {
  id?: number | string | null;
  code?: string | null;
  name?: string | null;
};

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();

export function isVacationLeaveCode(value: unknown) {
  return VACATION_LEAVE_CODES.includes(normalize(value));
}

export function getEquivalentLeaveCodes(value: unknown) {
  const normalized = normalize(value);
  return isVacationLeaveCode(normalized) ? VACATION_LEAVE_CODES : [normalized];
}

export function matchesLeaveQuota(leaveTypeValue: unknown, leaveType: LeaveTypeLike) {
  const normalizedValue = normalize(leaveTypeValue);
  const code = normalize(leaveType.code);

  if (isVacationLeaveCode(code) && isVacationLeaveCode(normalizedValue)) {
    return true;
  }

  return (
    normalizedValue === normalize(leaveType.id) ||
    normalizedValue === code ||
    normalizedValue === normalize(leaveType.name)
  );
}

