export interface LeaveApproval {
    id: number;
    level: number;
    status: string;
    comment: string | null;
    actionAt: string | null;
    approver: {
        id: number;
        firstName: string;
        lastName: string;
        position: string | null;
    } | null;
    actedBy?: {
        id: number;
        firstName: string;
        lastName: string;
        position: string | null;
        role?: string;
    } | null;
}

export interface LeaveAttachment {
    id: number;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
}

export interface LeaveType {
    id: number;
    code: string;
    name: string;
}

export interface LeaveRequest {
    id: number;
    leaveCode: string | null;
    leaveType: string; // code ของประเภทการลา (เก็บเป็น string ใน database)
    leaveTypeInfo?: LeaveType | null; // ข้อมูลประเภทการลาแบบละเอียด (join จาก API)
    startDate: string;
    endDate: string;
    startTime: string | null;
    endTime: string | null;
    totalDays: number;
    reason: string;
    status: string;
    contactPhone: string | null;
    contactAddress: string | null;
    rejectReason: string | null;
    cancelReason: string | null;
    cancelledAt: string | null;
    createdAt: string;
    approvals: LeaveApproval[];
    attachments: LeaveAttachment[];
}
