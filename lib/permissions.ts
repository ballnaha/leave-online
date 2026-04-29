import { UserRole } from '@/types/user-role';

/**
 * สิทธิ์การใช้งานของระบบ (Permission Names)
 */
export const PERMISSIONS = {
  // สิทธิ์ในการจัดการข้อมูล (Admin Tools)
  CAN_ACCESS_ADMIN: 'CAN_ACCESS_ADMIN',
  CAN_MANAGE_USERS: 'CAN_MANAGE_USERS',
  CAN_MANAGE_CONFIG: 'CAN_MANAGE_CONFIG',
  CAN_MANAGE_ORGANIZATION: 'CAN_MANAGE_ORGANIZATION',
  
  // สิทธิ์ในการจัดการใบลา (Leave Management)
  CAN_VIEW_ALL_LEAVES: 'CAN_VIEW_ALL_LEAVES',
  CAN_APPROVE_LEAVES: 'CAN_APPROVE_LEAVES',
  CAN_APPROVE_ANY_LEVEL: 'CAN_APPROVE_ANY_LEVEL', // อนุมัติแทนผู้อื่นได้
  CAN_RECEIVE_ESCALATION: 'CAN_RECEIVE_ESCALATION', // รับการส่งต่อใบลา (Escalation)
  
  // สิทธิ์ในการดูรายงาน (Reporting)
  CAN_VIEW_REPORTS: 'CAN_VIEW_REPORTS',
  CAN_EXPORT_DATA: 'CAN_EXPORT_DATA',
};

/**
 * การแมปสิทธิ์ให้แต่ละ Role (Role-based Access Control)
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    PERMISSIONS.CAN_ACCESS_ADMIN,
    PERMISSIONS.CAN_MANAGE_USERS,
    PERMISSIONS.CAN_MANAGE_CONFIG,
    PERMISSIONS.CAN_MANAGE_ORGANIZATION,
    PERMISSIONS.CAN_VIEW_ALL_LEAVES,
    PERMISSIONS.CAN_APPROVE_LEAVES,
    PERMISSIONS.CAN_APPROVE_ANY_LEVEL,
    PERMISSIONS.CAN_VIEW_REPORTS,
    PERMISSIONS.CAN_EXPORT_DATA,
  ],
  hr_manager: [
    PERMISSIONS.CAN_ACCESS_ADMIN,
    PERMISSIONS.CAN_MANAGE_USERS,
    PERMISSIONS.CAN_MANAGE_ORGANIZATION,
    PERMISSIONS.CAN_VIEW_ALL_LEAVES,
    PERMISSIONS.CAN_APPROVE_LEAVES,
    PERMISSIONS.CAN_APPROVE_ANY_LEVEL,
    PERMISSIONS.CAN_RECEIVE_ESCALATION,
    PERMISSIONS.CAN_VIEW_REPORTS,
    PERMISSIONS.CAN_EXPORT_DATA,
  ],
  hr: [
    PERMISSIONS.CAN_ACCESS_ADMIN,
    PERMISSIONS.CAN_MANAGE_USERS,
    PERMISSIONS.CAN_MANAGE_ORGANIZATION,
    PERMISSIONS.CAN_VIEW_ALL_LEAVES,
    PERMISSIONS.CAN_APPROVE_LEAVES,
    PERMISSIONS.CAN_APPROVE_ANY_LEVEL,
    PERMISSIONS.CAN_VIEW_REPORTS,
    PERMISSIONS.CAN_EXPORT_DATA,
  ],
  dept_manager: [
    PERMISSIONS.CAN_APPROVE_LEAVES,
    PERMISSIONS.CAN_VIEW_REPORTS,
  ],
  section_head: [
    PERMISSIONS.CAN_APPROVE_LEAVES,
  ],
  shift_supervisor: [
    PERMISSIONS.CAN_APPROVE_LEAVES,
  ],
  employee: [],
};

/**
 * ฟังก์ชันหลักในการเช็คสิทธิ์
 * @param role - Role ของผู้ใช้งาน
 * @param permission - Permission ที่ต้องการเช็ค (จากตัวแปร PERMISSIONS)
 * @param userId - (Optionally) สำหรับเช็คสิทธิ์เฉพาะบุคคลในอนาคต
 */
export function hasPermission(role: string | undefined, permission: string, userId?: number): boolean {
  if (!role) return false;
  
  // ดึงรายการ Permissions ของ Role นั้นๆ
  const permissions = ROLE_PERMISSIONS[role] || [];
  
  // ระบบสำรอง: หากต้องการให้ HR บางคนมีสิทธิ์เหมือน HR Manager เป็นกรณีพิเศษ
  // สามารถเพิ่ม Logic ตรงนี้ได้ เช่น เช็คจากรายชื่อ ID หรือฟิลด์พิเศษใน DB
  // if (role === 'hr' && permission === PERMISSIONS.CAN_RECEIVE_ESCALATION) {
  //    if ([1, 5, 10].includes(userId)) return true; // ปลดล็อกให้พนักงาน ID 1, 5, 10 ทำแทนได้
  // }

  return permissions.includes(permission);
}

/**
 * เช็คสิทธิ์การเข้าถึงหน้า Admin Panel
 */
export function canAccessAdmin(role: string | undefined): boolean {
  return hasPermission(role, PERMISSIONS.CAN_ACCESS_ADMIN);
}
