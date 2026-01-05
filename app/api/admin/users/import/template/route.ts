import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

// GET - Download demo template Excel
export async function GET() {
    try {
        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('ข้อมูลพนักงาน');

        // Set column widths
        worksheet.columns = [
            { width: 10 }, // ลำดับ
            { width: 35 }, // ชื่อ
            { width: 30 }, // ตำแหน่ง
            { width: 15 }, // วันที่เข้างาน
        ];

        // Create demo data
        const demoData = [
            ['ชื่อ', 'ตำแหน่ง', 'วันที่เข้างาน'],
            ['ฝ่ายผลิต1', '', ''],
            ['200039 นายฐิติณัฏฐ์ ศรีรัตน์', 'STAFF วางแผนการผลิต', '15/10/2533'],
            ['200096 นางกันนิกา คุ้มจั่นอัด', 'Asst.Supervisor', '01/07/2540'],
            ['200105 นายยุดหนา จันปัด', 'Senior engineer', '16/06/2542'],
            ['200141 น.ส.ชมาพร บุญครอง', 'Staff ฝ่ายผลิต1', '16/04/2547'],
            ['201069 นายธนามกร เศรษฐีสมบัติ', 'Senior engineer', '01/12/2563'],
            ['แผนกอาบ', '', ''],
            ['200050 นายสนอง ศรีเคน', 'ช่างอาบ', '27/07/2535'],
            ['200051 นายประทวน บุญชู', 'Supervisor', '21/08/2535'],
            ['200080 น.ส.คนึงนิตย์ ฉลูทอง', 'พนักงานคัดเหล็ก/Blank/กระป๋อง/ฝา', '08/09/2538'],
            ['200089 นายมานพ พรหมทะ', 'ช่างอาบ', '23/04/2539'],
            ['200098 นายธเนตร บุตรชะม้อย', 'Supervisor', '11/05/2541'],
            [],
            ['คำอธิบาย:'],
            ['- ชื่อฝ่าย: ขึ้นต้นด้วย "ฝ่าย" (เช่น ฝ่ายผลิต1)'],
            ['- ชื่อแผนก: ขึ้นต้นด้วย "แผนก" (เช่น แผนกอาบ)'],
            ['- พนักงาน: รหัสพนักงาน เว้้นวรรค ตามด้วย ชื่อ-นามสกุล'],
            ['- วันที่เข้างาน: รูปแบบ วัน/เดือน/ปี (พ.ศ.)'],
            [''],
            ['หมายเหตุ:'],
            ['- ระบบจะดึง ฝ่าย และ แผนก ล่าสุดที่อยู่ด้านบนมาใส่ให้พนักงานอัตโนมัติ'],
            ['- รหัสผ่านเริ่มต้นคือ 123456'],
        ];

        // Add rows to worksheet
        demoData.forEach(row => {
            worksheet.addRow(row);
        });

        // Style header rows
        worksheet.getRow(2).font = { bold: true };
        worksheet.getRow(10).font = { bold: true };

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

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
