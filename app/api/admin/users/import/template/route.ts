import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// GET - Download demo template Excel
export async function GET() {
    try {
        // Create demo data
        const demoData = [
            ['ฝ่ายผลิต1'],
            ['ชื่อ', 'ตำแหน่ง', 'วันที่เข้างาน'],
            ['200039 นายฐิติณัฏฐ์ ศรีรัตน์', 'STAFF วางแผนการผลิต', '15/10/2533'],
            ['200096 นางกันนิกา คุ้มจั่นอัด', 'Asst.Supervisor', '01/07/2540'],
            ['200105 นายยุดหนา จันปัด', 'Senior engineer', '16/06/2542'],
            ['200141 น.ส.ชมาพร บุญครอง', 'Staff ฝ่ายผลิต1', '16/04/2547'],
            ['201069 นายธนามกร เศรษฐีสมบัติ', 'Senior engineer', '01/12/2563'],
            [],
            ['ฝ่ายบัญชี'],
            ['ชื่อ', 'ตำแหน่ง', 'วันที่เข้างาน'],
            ['300001 นางสาวสมหญิง ใจดี', 'หัวหน้าฝ่ายบัญชี', '01/03/2545'],
            ['300002 นายสมชาย รักงาน', 'พนักงานบัญชี', '15/08/2555'],
            [],
            ['คำอธิบาย:'],
            ['- คอลัมน์ "ชื่อ": รหัสพนักงาน ตามด้วยคำนำหน้า+ชื่อ นามสกุล'],
            ['- คอลัมน์ "ตำแหน่ง": ตำแหน่งงาน'],
            ['- คอลัมน์ "วันที่เข้างาน": วัน/เดือน/ปี (พ.ศ.) เช่น 15/10/2533'],
            [''],
            ['หมายเหตุ:'],
            ['- ปี พ.ศ. จะถูกแปลงเป็น ค.ศ. อัตโนมัติ (ลบ 543)'],
            ['- รหัสพนักงานที่ซ้ำจะอัพเดทข้อมูลแทนการสร้างใหม่'],
            ['- รหัสผ่านเริ่มต้นคือ 123456'],
        ];

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(demoData);

        // Set column widths
        worksheet['!cols'] = [
            { wch: 35 }, // ชื่อ
            { wch: 25 }, // ตำแหน่ง
            { wch: 15 }, // วันที่เข้างาน
        ];

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'ข้อมูลพนักงาน');

        // Generate buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Return as downloadable file
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': 'attachment; filename="import_users_template.xlsx"',
            },
        });
    } catch (error: any) {
        console.error('Template generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate template' },
            { status: 500 }
        );
    }
}
