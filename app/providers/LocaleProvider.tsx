"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type LocaleCode = "th" | "en" | "my";

const DEFAULT_LOCALE: LocaleCode = "th";
const LOCALE_STORAGE_KEY = "app:locale";

const messages: Record<LocaleCode, Record<string, string>> = {
  th: {
    common_profile: "โปรไฟล์",
    common_language: "ภาษา",
    settings: "การตั้งค่า",
    home_leave_types: "ประเภทการลา",
    home_see_all: "ดูทั้งหมด",
    home_recent_requests: "คำขอล่าสุด",
    role_fulltime: "พนักงานประจำ",
    employee_type_monthly: "พนักงานรายเดือน",
    employee_type_daily: "พนักงานรายวัน",
    logout: "ออกจากระบบ",
    logout_success: "ออกจากระบบสำเร็จ",
    logout_error: "เกิดข้อผิดพลาดในการออกจากระบบ",
    logging_out: "กำลังออกจากระบบ...",
    version: "เวอร์ชัน",
    nav_home: "หน้าหลัก",
    nav_messages: "ข้อความ",
    nav_history: "ประวัติ",
    nav_profile: "โปรไฟล์",
    nav_leave: "ประวัติการลา",
    greeting: "สวัสดี",
    search_placeholder: "ค้นหาประวัติการลา...",
    profile_email: "อีเมล",
    profile_phone: "เบอร์โทร",
    profile_department: "ฝ่าย",
    profile_name: "ชื่อ-นามสกุล",
    last_name_required: "นามสกุล *",
    company: "บริษัท",
    profile_started: "วันที่เริ่มงาน",
    year: "ปี",
    month: "เดือน",
    day: "วัน",
    home_quick_actions: "ลาด่วน",
    home_information: "ประชาสัมพันธ์",
    home_categories: "ประเภทการลา",
    
    // Profile & Settings
    edit_profile: "แก้ไขโปรไฟล์",
    account: "บัญชี",
    notifications: "การแจ้งเตือน",
    push_notifications: "การแจ้งเตือนแบบพุช",
    push_enabled_success: "เปิดการแจ้งเตือนสำเร็จ",
    push_disabled_success: "ปิดการแจ้งเตือนแล้ว",
    push_not_ready: "ระบบแจ้งเตือนยังไม่พร้อม กรุณารีเฟรชหน้า",
    error_retry: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    general_settings: "การตั้งค่าทั่วไป",
    help_info: "ช่วยเหลือและข้อมูล",
    help_center: "ศูนย์ช่วยเหลือ",
    install_app: "ติดตั้งแอปพลิเคชัน",
    pwa_installed_or_unsupported: "ติดตั้งแล้ว หรือเบราว์เซอร์ไม่รองรับ",
    for_ios: "สำหรับ iOS",
    for_android: "สำหรับ Android",
    status_connected: "เชื่อมต่อแล้ว",
    status_disconnected: "ไม่ได้เชื่อมต่อ",
    status_enabled: "เปิดใช้งาน",
    status_disabled: "ปิดอยู่",
    status_loading: "กำลังโหลด...",
    browser_not_supported: "เบราว์เซอร์ไม่รองรับ",
    blocked_notifications: "ถูกบล็อก - กรุณาเปิดในการตั้งค่า",
    select_language: "เลือกภาษา",
    
    // iOS Instructions
    ios_install_title: "วิธีติดตั้งบน iPhone",
    step_1: "ขั้นตอนที่ 1",
    press_button: "กดปุ่ม",
    share: "แชร์",
    at_bottom_safari: "ที่อยู่ด้านล่างของ Safari",
    step_2: "ขั้นตอนที่ 2",
    scroll_and_press: "เลื่อนหา แล้วกด",
    add_to_home_screen: "เพิ่มในหน้าจอโฮม",
    step_3: "ขั้นตอนที่ 3",
    add: "เพิ่ม",
    at_top_right: "ที่มุมขวาบน",
    ios_note_safari: "หมายเหตุ: ต้องเปิดใน Safari เท่านั้น",
    understood: "เข้าใจแล้ว",
    
    // Leave History
    leave_history_title: "ประวัติการลา",
    leave_legend: "คำอธิบายสี",
    leave_today: "วันนี้",
    leave_items: "รายการ",
    leave_search_placeholder: "ค้นหาใบลา...",
    leave_not_found: "ไม่พบใบลาที่ตรงกับการค้นหา",
    leave_no_history: "ยังไม่มีประวัติการลาในเดือนนี้",
    
    // Days
    day_mon: "จ.",
    day_tue: "อ.",
    day_wed: "พ.",
    day_thu: "พฤ.",
    day_fri: "ศ.",
    day_sat: "ส.",
    day_sun: "อา.",
    
    // Errors
    cancel_reason_required: "กรุณาระบุเหตุผลการยกเลิก",
    cancel_failed: "ไม่สามารถยกเลิกใบลาได้",
    cancel_error: "เกิดข้อผิดพลาดในการยกเลิกใบลา",

    // Cancel Dialog
    cancel_leave_title: "ยืนยันการยกเลิกใบลา",
    cancel_leave_desc: "กรุณาระบุเหตุผลที่ต้องการยกเลิกใบลา",
    cancel_leave_placeholder: "ระบุเหตุผล...",
    cancel_leave_confirm: "ยืนยันยกเลิก",
    
    // Leave Form
    leave_info: "ข้อมูลผู้ขอลา",
    leave_details: "รายละเอียดการลา",
    leave_date_write: "วันที่เขียนใบลา",
    leave_start_date: "วันที่เริ่มลา",
    leave_end_date: "วันที่สิ้นสุด",
    leave_time: "เวลา",
    leave_total_days: "จำนวนวันลา",
    leave_reason: "เหตุผลการลา",
    leave_reason_placeholder: "ระบุเหตุผลการลา...",
    leave_attachments: "ไฟล์แนบ",
    leave_attachments_hint: "รองรับไฟล์ .pdf, .jpg, .jpeg, .png (สูงสุด 3 ไฟล์, ไฟล์ละไม่เกิน 15MB)",
    leave_upload_btn: "อัพโหลดไฟล์แนบ",
    leave_upload_processing: "กำลังประมวลผลไฟล์...",
    leave_upload_complete: "แนบไฟล์ครบแล้ว",
    leave_submit: "ส่งคำขอลา",
    leave_submitting: "กำลังส่ง...",
    leave_confirm_title: "ยืนยันส่งคำขอลา?",
    leave_confirm_desc: "ระบบจะส่งคำขอไปยังผู้อนุมัติทันทีเมื่อกดยืนยัน",
    leave_no_date_selected: "ยังไม่ได้เลือกช่วงวัน",
    leave_max_quota: "สิทธิ์ลา {days} วัน/ปี (ส่วนที่เกินจะถูกหักเงิน)",
    leave_days_unit: "วัน",
    leave_adjust_hint: "กดปุ่ม +/- เพื่อปรับทีละ 0.5 วัน",
    
    // Leave Detail Drawer
    preview_error: "ไม่สามารถแสดงตัวอย่างไฟล์นี้ได้",
    download_file: "ดาวน์โหลดไฟล์",
    image_unit: "รูป",
    leave_code: "รหัส",
    total_days_label: "รวม",
    contact_info: "ข้อมูลติดต่อระหว่างลา",
    reject_reason: "เหตุผลที่ไม่อนุมัติ",
    cancel_reason_label: "เหตุผล",
    cancelled_at: "ยกเลิกเมื่อ",
    approval_status: "สถานะการอนุมัติ",
    order_no: "ลำดับที่",
    not_specified: "ไม่ระบุ",
    submitted_at: "ยื่นเมื่อ",
    cancel_leave_btn: "ยกเลิกใบลา",
    
    // User Info
    department: "ฝ่าย",
    section: "แผนก",
    shift: "กะทำงาน",
    employee_id: "รหัสพนักงาน",
    position: "ตำแหน่ง",
    
    // Leave Related
    leave_sick: "ลาป่วย",
    sick: "ลาป่วย",
    leave_personal: "ลากิจ",
    leave_annual: "ลาพักร้อน",
    leave_vacation: "ลาพักร้อน",
    leave_maternity: "ลาคลอด",
    leave_ordination: "ลาอุปสมบท",
    leave_military: "ลาเกณฑ์ทหาร",
    leave_marriage: "ลาแต่งงาน",
    leave_funeral: "ลาฌาปนกิจ",
    leave_paternity: "ลาดูแลภรรยาคลอด",
    leave_sterilization: "ลาทำหมัน",
    leave_business: "ลาติดต่อราชการ",
    leave_unpaid: "ลาไม่รับค่าจ้าง",
    leave_work_outside: "ทำงานนอกสถานที่",
    leave_absent: "ขาดงาน",
    leave_other: "ลาอื่นๆ",
    leave_holiday: "วันหยุด",
    sick_leave_warning: "ลาป่วยเกิน 3 วัน กรุณาแนบใบรับรองแพทย์",
    days_per_year: "วัน/ปี",
    remaining: "คงเหลือ",
    used: "ใช้ไป",
    status_pending: "รออนุมัติ",
    status_approved: "อนุมัติแล้ว",
    status_rejected: "ไม่อนุมัติ",
    status_cancelled: "ยกเลิก",
    status_waiting_for: "รอการอนุมัติจาก",
    supervisor: "หัวหน้างาน",

    // Holiday
    holiday_title: "วันหยุดประจำปี",
    holiday_type_national: "วันหยุดราชการ",
    holiday_type_substitute: "วันหยุดชดเชย",
    holiday_type_special: "วันหยุดพิเศษ",
    holiday_count: "วันหยุด",
    holiday_substitute_count: "วันชดเชย",
    holiday_days: "วัน",
    holiday_weekend: "ตรงวันหยุด",
    holiday_no_data: "ไม่มีข้อมูลวันหยุดสำหรับปีนี้",

    // Edit Profile
    edit_profile_title: "แก้ไขโปรไฟล์",
    error_fetch_profile: "ไม่สามารถดึงข้อมูลได้",
    error_select_image: "กรุณาเลือกไฟล์รูปภาพ",
    error_image_size: "ไฟล์รูปภาพต้องมีขนาดไม่เกิน 15MB",
    error_process_image: "ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองใหม่อีกครั้ง",
    error_first_name_required: "กรุณากรอกชื่อ",
    error_last_name_required: "กรุณากรอกนามสกุล",
    error_current_password_required: "กรุณากรอกรหัสผ่านปัจจุบัน",
    error_new_password_required: "กรุณากรอกรหัสผ่านใหม่",
    error_password_length: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร",
    error_password_mismatch: "รหัสผ่านใหม่และยืนยันไม่ตรงกัน",
    error_upload_image: "อัพโหลดรูปภาพไม่สำเร็จ",
    error_save_profile: "เกิดข้อผิดพลาดในการบันทึก",
    success_save_profile: "บันทึกข้อมูลสำเร็จ",
    select_company: "เลือกบริษัท",
    select_employee_type: "เลือกประเภทพนักงาน",
    select_department: "เลือกฝ่าย",
    select_section: "เลือกแผนก",
    select_shift: "เลือกกะทำงาน",
    shift_day: "กะกลางวัน",
    shift_night: "กะกลางคืน",
    select_gender: "เลือกเพศ",
    gender_male: "ชาย",
    gender_female: "หญิง",
    tap_camera_to_change: "แตะที่ไอคอนกล้องเพื่อเปลี่ยนรูปโปรไฟล์",
    first_name_required: "ชื่อ *",
    placeholder_first_name: "กรอกชื่อ",
    placeholder_last_name: "กรอกนามสกุล",
    gender: "เพศ",
    placeholder_gender: "เลือกเพศ",
    email: "อีเมล",
    placeholder_company: "เลือกบริษัท",
    employee_type: "ประเภทพนักงาน",
    placeholder_employee_type: "เลือกประเภทพนักงาน",
    select_company_first: "กรุณาเลือกบริษัทก่อน",
    placeholder_department: "เลือกฝ่าย",
    placeholder_section: "เลือกแผนก",
    no_section: "ไม่มีแผนก",
    select_department_first: "กรุณาเลือกฝ่ายก่อน",
    placeholder_shift: "เลือกกะทำงาน",
    start_date: "วันที่เริ่มงาน",
    change_password: "เปลี่ยนรหัสผ่าน",
    hide: "ซ่อน",
    show: "แสดง",
    current_password: "รหัสผ่านปัจจุบัน",
    new_password_placeholder: "รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)",
    confirm_new_password: "ยืนยันรหัสผ่านใหม่",
    saving: "กำลังบันทึก...",
    edit_image: "ปรับแต่งรูปภาพ",
    drag_to_adjust: "ลากเพื่อปรับตำแหน่ง • ใช้ slider เพื่อซูม",
    rotate_left: "หมุนซ้าย",
    reset: "รีเซ็ต",
    rotate_right: "หมุนขวา",
    save_image: "บันทึกรูปภาพ",
    
    // Auth & Actions
    login: "เข้าสู่ระบบ",
    register: "สมัครสมาชิก",
    forgot_password: "ลืมรหัสผ่าน?",
    password: "รหัสผ่าน",
    remember_me: "จดจำฉัน",
    no_account: "ยังไม่มีบัญชี?",
    save: "บันทึก",
    cancel: "ยกเลิก",
    confirm: "ยืนยัน",
    close: "ปิด",
    success: "สำเร็จ",
    error: "เกิดข้อผิดพลาด",
  },
  en: {
    common_profile: "Profile",
    common_language: "Language",
    settings: "Settings",
    home_leave_types: "Leave Types",
    home_see_all: "See all",
    home_recent_requests: "Recent Requests",
    role_fulltime: "Full-time Employee",
    employee_type_monthly: "Monthly Employee",
    employee_type_daily: "Daily Employee",
    logout: "Sign out",
    logout_success: "Logged out successfully",
    logout_error: "Error logging out",
    logging_out: "Logging out...",
    version: "Version",
    nav_home: "Home",
    nav_messages: "Messages",
    nav_history: "History",
    nav_leave: "Leave History",
    nav_profile: "Profile",
    greeting: "Hello",
    search_placeholder: "Search leave history...",
    profile_email: "Email",
    profile_phone: "Phone",
    profile_department: "Department",
    profile_name: "Full Name",
    company: "Company",
    profile_started: "Start Date",
    year: "Year",
    month: "Month",
    day: "Day",
    home_quick_actions: "Quick Actions",
    home_information: "Information",
    home_categories: "Leave Categories",
    // Profile & Settings
    edit_profile: "Edit Profile",
    account: "Account",
    notifications: "Notifications",
    push_notifications: "Push Notifications",
    push_enabled_success: "Notifications enabled",
    push_disabled_success: "Notifications disabled",
    push_not_ready: "Notification system not ready, please refresh",
    error_retry: "An error occurred, please try again",
    general_settings: "General Settings",
    help_info: "Help & Info",
    help_center: "Help Center",
    install_app: "Install App",
    pwa_installed_or_unsupported: "Installed or browser not supported",
    for_ios: "For iOS",
    for_android: "For Android",
    status_connected: "Connected",
    status_disconnected: "Not Connected",
    status_enabled: "Enabled",
    status_disabled: "Disabled",
    status_loading: "Loading...",
    browser_not_supported: "Browser not supported",
    blocked_notifications: "Blocked - Check settings",
    select_language: "Select Language",

    // iOS Instructions
    ios_install_title: "Install on iPhone",
    step_1: "Step 1",
    press_button: "Press",
    share: "Share",
    at_bottom_safari: "at the bottom of Safari",
    step_2: "Step 2",
    scroll_and_press: "Scroll and press",
    add_to_home_screen: "Add to Home Screen",
    step_3: "Step 3",
    add: "Add",
    at_top_right: "at the top right",
    ios_note_safari: "Note: Must open in Safari",
    understood: "Understood",
    
    // Leave History
    leave_history_title: "Leave History",
    leave_legend: "Color Legend",
    leave_today: "Today",
    leave_items: "Items",
    leave_search_placeholder: "Search leaves...",
    leave_not_found: "No leaves found",
    leave_no_history: "No leave history this month",

    // Days
    day_mon: "Mon",
    day_tue: "Tue",
    day_wed: "Wed",
    day_thu: "Thu",
    day_fri: "Fri",
    day_sat: "Sat",
    day_sun: "Sun",
    
    // Errors
    cancel_reason_required: "Cancellation reason required",
    cancel_failed: "Failed to cancel leave",
    cancel_error: "Error cancelling leave",

    // Cancel Dialog
    cancel_leave_title: "Confirm Cancellation",
    cancel_leave_desc: "Please specify reason for cancellation",
    cancel_leave_placeholder: "Specify reason...",
    cancel_leave_confirm: "Confirm Cancel",

    // Leave Form
    leave_info: "Applicant Information",
    leave_details: "Leave Details",
    leave_date_write: "Date of Application",
    leave_start_date: "Start Date",
    leave_end_date: "End Date",
    leave_time: "Time",
    leave_total_days: "Total Days",
    leave_reason: "Reason",
    leave_reason_placeholder: "Specify reason...",
    leave_attachments: "Attachments",
    leave_attachments_hint: "Supports .pdf, .jpg, .jpeg, .png (Max 5 files, 15MB each)",
    leave_upload_btn: "Upload Attachments",
    leave_upload_processing: "Processing...",
    leave_upload_complete: "Max files reached",
    leave_submit: "Submit Request",
    leave_submitting: "Submitting...",
    leave_confirm_title: "Confirm Submission?",
    leave_confirm_desc: "Request will be sent to approver immediately.",
    leave_no_date_selected: "No date selected",
    leave_max_quota: "Max quota: {days} days/year (Paid)",
    leave_days_unit: "Days",
    leave_adjust_hint: "Press +/- to adjust by 0.5 days",

    // Leave Detail Drawer
    preview_error: "Cannot preview this file",
    download_file: "Download file",
    image_unit: "images",
    leave_code: "Code",
    total_days_label: "Total",
    contact_info: "Contact info during leave",
    reject_reason: "Rejection Reason",
    cancel_reason_label: "Reason",
    cancelled_at: "Cancelled at",
    approval_status: "Approval Status",
    order_no: "Order",
    not_specified: "Not specified",
    submitted_at: "Submitted at",
    cancel_leave_btn: "Cancel Leave",

    // User Info
    department: "Department",
    section: "Section",
    shift: "Shift",
    employee_id: "Employee ID",
    position: "Position",
    
    // Leave Related
    leave_sick: "Sick Leave",
    sick: "Sick Leave",
    leave_personal: "Personal Leave",
    leave_annual: "Annual Leave",
    leave_vacation: "Vacation Leave",
    leave_maternity: "Maternity Leave",
    leave_ordination: "Ordination Leave",
    leave_military: "Military Service Leave",
    leave_marriage: "Marriage Leave",
    leave_funeral: "Funeral Leave",
    leave_paternity: "Paternity Leave",
    leave_sterilization: "Sterilization Leave",
    leave_business: "Business Leave",
    leave_unpaid: "Unpaid Leave",
    leave_work_outside: "Work Outside",
    leave_absent: "Absent",
    leave_other: "Other",
    leave_holiday: "Holiday",
    sick_leave_warning: "Sick leave exceeding 3 days requires a medical certificate",
    days_per_year: "Days/Year",
    remaining: "Remaining",
    used: "Used",
    status_pending: "Pending",
    status_cancelled: "Cancelled",
    status_waiting_for: "Waiting for approval from",
    supervisor: "Supervisor",
    status_rejected: "Rejected",

    // Holiday
    holiday_title: "Annual Holidays",
    holiday_type_national: "National Holiday",
    holiday_type_substitute: "Substitute Holiday",
    holiday_type_special: "Special Holiday",
    holiday_count: "Holidays",
    holiday_substitute_count: "Substitute days",
    holiday_days: "days",
    holiday_weekend: "Falls on weekend",
    holiday_no_data: "No holiday data available for this year",
  

    // Edit Profile
    edit_profile_title: "Edit Profile",
    error_fetch_profile: "Failed to fetch profile",
    error_select_image: "Please select an image file",
    error_image_size: "Image size must not exceed 15MB",
    error_process_image: "Cannot process image, please try again",
    error_first_name_required: "First name is required",
    error_last_name_required: "Last name is required",
    error_current_password_required: "Current password is required",
    error_new_password_required: "New password is required",
    error_password_length: "New password must be at least 6 characters",
    error_password_mismatch: "New password and confirmation do not match",
    error_upload_image: "Failed to upload image",
    error_save_profile: "Error saving profile",
    success_save_profile: "Profile saved successfully",
    select_company: "Select Company",
    select_employee_type: "Select Employee Type",
    select_department: "Select Department",
    select_section: "Select Section",
    select_shift: "Select Shift",
    shift_day: "Day Shift",
    shift_night: "Night Shift",
    select_gender: "Select Gender",
    gender_male: "Male",
    gender_female: "Female",
    tap_camera_to_change: "Tap camera icon to change profile picture",
    first_name_required: "First Name *",
    last_name_required: "Last Name *",
    placeholder_first_name: "Enter first name",
    placeholder_last_name: "Enter last name",
    gender: "Gender",
    placeholder_gender: "Select Gender",
    email: "Email",
    placeholder_company: "Select Company",
    employee_type: "Employee Type",
    placeholder_employee_type: "Select Employee Type",
    select_company_first: "Please select company first",
    placeholder_department: "Select Department",
    placeholder_section: "Select Section",
    no_section: "No Section",
    select_department_first: "Please select department first",
    placeholder_shift: "Select Shift",
    start_date: "Start Date",
    change_password: "Change Password",
    hide: "Hide",
    show: "Show",
    current_password: "Current Password",
    new_password_placeholder: "New Password (min 6 chars)",
    confirm_new_password: "Confirm New Password",
    saving: "Saving...",
    edit_image: "Edit Image",
    drag_to_adjust: "Drag to adjust • Use slider to zoom",
    rotate_left: "Rotate Left",
    reset: "Reset",
    rotate_right: "Rotate Right",
    save_image: "Save Image",

    // Auth & Actions
    login: "Login",
    register: "Register",
    forgot_password: "Forgot Password?",
    password: "Password",
    remember_me: "Remember me",
    no_account: "Don't have an account?",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    close: "Close",
    success: "Success",
    error: "Error",
  },
  my: {
    common_profile: "ပရိုဖိုင်",
    common_language: "ဘာသာစကား",
    settings: "ဆက်တင်များ",
    home_leave_types: "အားလပ်တန်းများ",
    home_see_all: "အားလုံးကိုကြည့်ရန်",
    home_recent_requests: "လတ်တလောတောင်းဆိုချက်များ",
    role_fulltime: "အလုပ်အကိုင်အပြည့်",
    employee_type_monthly: "လစာစားဝန်ထမ်း",
    employee_type_daily: "နေ့စားဝန်ထမ်း",
    logout: "ထွက်ရန်",
    logout_success: "ထွက်ခွာခြင်း အောင်မြင်သည်",
    logout_error: "ထွက်ခွာရာတွင် အမှားအယွင်းရှိပါသည်",
    logging_out: "ထွက်ခွာနေသည်...",
    version: "ဗားရှင်း",
    nav_home: "မူလစာမျက်နှာ",
    nav_messages: "မက်ဆေ့ခ်ျများ",
    nav_history: "သမိုင်း",
    nav_profile: "ပရိုဖိုင်",
    nav_leave: "အားလပ်ရက်သမိုင်း",
    greeting: "မင်္ဂလာပါ",
    search_placeholder: "ခွင့်မှတ်တမ်းရှာရန်...",
    profile_email: "အီးမေးလ်",
    profile_phone: "ဖုန်း",
    profile_department: "ဌာန",
    profile_name: "အမည်",
    company: "ကုမ္ပဏီ",
    profile_started: "အလုပ်စတင်နေ့",
    year: "နှစ်",
    month: "လ",
    day: "ရက်",
    home_quick_actions: "လျင်မြန်သောလုပ်ဆောင်ချက်များ",
    home_information: "သတင်းနှင့်ကြော်ငြာများ",
    home_categories: "အားလပ်ရက်အမျိုးအစားများ",
    // Profile & Settings
    edit_profile: "ပရိုဖိုင်ပြင်ဆင်ရန်",
    account: "အကောင့်",
    notifications: "အသိပေးချက်များ",
    push_notifications: "Push အသိပေးချက်များ",
    push_enabled_success: "အသိပေးချက်များ ဖွင့်ထားသည်",
    push_disabled_success: "အသိပေးချက်များ ပိတ်ထားသည်",
    push_not_ready: "အသိပေးချက်စနစ် အဆင်သင့်မဖြစ်သေးပါ၊ ကျေးဇူးပြု၍ ပြန်လည်စတင်ပါ",
    error_retry: "အမှားအယွင်းဖြစ်ပွားပါသည်၊ ကျေးဇူးပြု၍ ထပ်မံကြိုးစားပါ",
    general_settings: "အထွေထွေဆက်တင်များ",
    help_info: "အကူအညီနှင့်အချက်အလက်",
    help_center: "အကူအညီစင်တာ",
    install_app: "အက်ပ်ထည့်သွင်းရန်",
    pwa_installed_or_unsupported: "ထည့်သွင်းပြီး သို့မဟုတ် ဘရောက်ဆာ မပံ့ပိုးပါ",
    for_ios: "iOS အတွက်",
    for_android: "Android အတွက်",
    status_connected: "ချိတ်ဆက်ပြီး",
    status_disconnected: "မချိတ်ဆက်ရသေးပါ",
    status_enabled: "ဖွင့်ထားသည်",
    status_disabled: "ပိတ်ထားသည်",
    status_loading: "ဖွင့်နေသည်...",
    browser_not_supported: "ဘရောက်ဆာ မပံ့ပိုးပါ",
    blocked_notifications: "ပိတ်ပင်ထားသည် - ဆက်တင်များတွင်စစ်ဆေးပါ",
    select_language: "ဘာသာစကားရွေးချယ်ပါ",

    // iOS Instructions
    ios_install_title: "iPhone တွင် ထည့်သွင်းနည်း",
    step_1: "အဆင့် ၁",
    press_button: "နှိပ်ပါ",
    share: "မျှဝေရန်",
    at_bottom_safari: "Safari ၏ အောက်ခြေတွင်",
    step_2: "အဆင့် ၂",
    scroll_and_press: "ရှာဖွေပြီး နှိပ်ပါ",
    add_to_home_screen: "ပင်မစာမျက်နှာသို့ ထည့်ရန်",
    step_3: "အဆင့် ၃",
    add: "ထည့်ရန်",
    at_top_right: "ညာဘက်အပေါ်ထောင့်တွင်",
    ios_note_safari: "မှတ်ချက်: Safari တွင်သာ ဖွင့်ရမည်",
    understood: "နားလည်ပါပြီ",
    
    // Leave History
    leave_history_title: "ခွင့်မှတ်တမ်း",
    leave_legend: "အရောင်အညွှန်း",
    leave_today: "ယနေ့",
    leave_items: "ခု",
    leave_search_placeholder: "ခွင့်မှတ်တမ်းရှာရန်...",
    leave_not_found: "ရှာဖွေမှုနှင့်ကိုက်ညီသော ခွင့်မှတ်တမ်းမရှိပါ",
    leave_no_history: "ယခုလအတွက် ခွင့်မှတ်တမ်းမရှိပါ",

    // Days
    day_mon: "တနင်္လာ",
    day_tue: "အင်္ဂါ",
    day_wed: "ဗုဒ္ဓဟူး",
    day_thu: "ကြာသပတေး",
    day_fri: "သောကြာ",
    day_sat: "စနေ",
    day_sun: "တနင်္ဂနွေ",
    
    // Errors
    cancel_reason_required: "ပယ်ဖျက်ရသည့်အကြောင်းရင်း လိုအပ်ပါသည်",
    cancel_failed: "ခွင့်ပယ်ဖျက်၍မရပါ",
    cancel_error: "ခွင့်ပယ်ဖျက်ရာတွင် အမှားအယွင်းရှိပါသည်",

    // Cancel Dialog
    cancel_leave_title: "ခွင့်ပယ်ဖျက်ရန် အတည်ပြုပါ",
    cancel_leave_desc: "ခွင့်ပယ်ဖျက်ရသည့် အကြောင်းရင်းကို ဖော်ပြပါ",
    cancel_leave_placeholder: "အကြောင်းရင်း...",
    cancel_leave_confirm: "ပယ်ဖျက်ရန် အတည်ပြုသည်",

    // Leave Form
    leave_info: "ခွင့်ယူသူအချက်အလက်",
    leave_details: "ခွင့်အသေးစိတ်",
    leave_date_write: "ခွင့်လျှောက်ထားသည့်နေ့",
    leave_start_date: "စတင်မည့်နေ့",
    leave_end_date: "ပြီးဆုံးမည့်နေ့",
    leave_time: "အချိန်",
    leave_total_days: "ခွင့်ရက်ပေါင်း",
    leave_reason: "အကြောင်းပြချက်",
    leave_reason_placeholder: "အကြောင်းပြချက်ထည့်ပါ...",
    leave_attachments: "ပူးတွဲဖိုင်များ",
    leave_attachments_hint: ".pdf, .jpg, .jpeg, .png ဖိုင်များ (အများဆုံး ၅ ဖိုင်၊ ၁၅ MB ထက်မပိုရ)",
    leave_upload_btn: "ပူးတွဲဖိုင်တင်ရန်",
    status_cancelled: "ပယ်ဖျက်ပြီး",

    // Edit Profile
    edit_profile_title: "ပရိုဖိုင်ပြင်ဆင်ရန်",
    error_fetch_profile: "အချက်အလက်ရယူ၍မရပါ",
    error_select_image: "ကျေးဇူးပြု၍ ဓာတ်ပုံဖိုင်ရွေးချယ်ပါ",
    error_image_size: "ဓာတ်ပုံဖိုင်ဆိုဒ်သည် 15MB ထက်မကျော်လွန်ရပါ",
    error_process_image: "ဓာတ်ပုံကို လုပ်ဆောင်၍မရပါ၊ ကျေးဇူးပြု၍ ထပ်မံကြိုးစားပါ",
    error_first_name_required: "အမည် လိုအပ်ပါသည်",
    error_last_name_required: "မျိုးရိုးအမည် လိုအပ်ပါသည်",
    error_current_password_required: "လက်ရှိစကားဝှက် လိုအပ်ပါသည်",
    error_new_password_required: "စကားဝှက်အသစ် လိုအပ်ပါသည်",
    error_password_length: "စကားဝှက်အသစ်သည် အနည်းဆုံး ၆ လုံးရှိရမည်",
    error_password_mismatch: "စကားဝှက်အသစ်နှင့် အတည်ပြုချက် မကိုက်ညီပါ",
    error_upload_image: "ဓာတ်ပုံတင်၍မရပါ",
    error_save_profile: "သိမ်းဆည်းရာတွင် အမှားအယွင်းရှိပါသည်",
    success_save_profile: "အချက်အလက်သိမ်းဆည်းပြီးပါပြီ",
    select_company: "ကုမ္ပဏီရွေးချယ်ပါ",
    select_employee_type: "ဝန်ထမ်းအမျိုးအစားရွေးချယ်ပါ",
    select_department: "ဌာနရွေးချယ်ပါ",
    select_section: "ဌာနစိတ်ရွေးချယ်ပါ",
    select_shift: "အလုပ်ချိန်ရွေးချယ်ပါ",
    shift_day: "နေ့ဆိုင်း",
    shift_night: "ညဆိုင်း",
    select_gender: "လိင်ရွေးချယ်ပါ",
    gender_male: "ကျား",
    gender_female: "မ",
    tap_camera_to_change: "ပရိုဖိုင်ပုံပြောင်းရန် ကင်မရာပုံကိုနှိပ်ပါ",
    first_name_required: "အမည် *",
    last_name_required: "မျိုးရိုးအမည် *",
    placeholder_first_name: "အမည်ထည့်ပါ",
    placeholder_last_name: "မျိုးရိုးအမည်ထည့်ပါ",
    gender: "လိင်",
    placeholder_gender: "လိင်ရွေးချယ်ပါ",
    email: "အီးမေးလ်",
    placeholder_company: "ကုမ္ပဏီရွေးချယ်ပါ",
    employee_type: "ဝန်ထမ်းအမျိုးအစား",
    placeholder_employee_type: "ဝန်ထမ်းအမျိုးအစားရွေးချယ်ပါ",
    select_company_first: "ကျေးဇူးပြု၍ ကုမ္ပဏီအရင်ရွေးချယ်ပါ",
    placeholder_department: "ဌာနရွေးချယ်ပါ",
    placeholder_section: "ဌာနစိတ်ရွေးချယ်ပါ",
    no_section: "ဌာနစိတ်မရှိပါ",
    select_department_first: "ကျေးဇူးပြု၍ ဌာနအရင်ရွေးချယ်ပါ",
    placeholder_shift: "အလုပ်ချိန်ရွေးချယ်ပါ",
    start_date: "အလုပ်စတင်နေ့",
    change_password: "စကားဝှက်ပြောင်းရန်",
    hide: "ဖျောက်ရန်",
    show: "ပြရန်",
    current_password: "လက်ရှိစကားဝှက်",
    new_password_placeholder: "စကားဝှက်အသစ် (အနည်းဆုံး ၆ လုံး)",
    confirm_new_password: "စကားဝှက်အသစ်ကို အတည်ပြုပါ",
    saving: "သိမ်းဆည်းနေသည်...",
    edit_image: "ပုံပြင်ဆင်ရန်",
    drag_to_adjust: "နေရာညှိရန် ဆွဲပါ • ဇူးမ်လုပ်ရန် slider သုံးပါ",
    rotate_left: "ဘယ်လှည့်",
    reset: "ပြန်စရန်",
    rotate_right: "ညာလှည့်",
    save_image: "ပုံသိမ်းဆည်းရန်",

    // Auth & Actionsင့်တင်ရန်",
    leave_submitting: "တင်ပြနေသည်...",
    leave_confirm_title: "အတည်ပြုပါသလား?",
    leave_confirm_desc: "အတည်ပြုပြီးပါက အတည်ပြုသူထံသို့ ချက်ချင်းပေးပို့ပါမည်။",
    leave_no_date_selected: "ရက်စွဲမရွေးရသေးပါ",
    leave_max_quota: "ခွင့်ခံစားခွင့်: {days} ရက်/နှစ် (လစာပြည့်)",
    leave_days_unit: "ရက်",
    leave_adjust_hint: "+/- နှိပ်၍ ၀.၅ ရက်စီ ချိန်ညှိပါ",

    // Leave Detail Drawer
    preview_error: "ဤဖိုင်ကို ကြည့်ရှု၍မရပါ",
    download_file: "ဖိုင်ဒေါင်းလုဒ်လုပ်ရန်",
    image_unit: "ပုံ",
    leave_code: "ကုဒ်",
    total_days_label: "စုစုပေါင်း",
    contact_info: "ခွင့်ယူစဉ် ဆက်သွယ်ရန်",
    reject_reason: "ပယ်ချရသည့်အကြောင်းရင်း",
    cancel_reason_label: "အကြောင်းရင်း",
    cancelled_at: "ပယ်ဖျက်သည့်အချိန်",
    approval_status: "အတည်ပြုမှု အခြေအနေ",
    order_no: "စဉ်",
    not_specified: "မဖော်ပြထားပါ",
    submitted_at: "တင်ပြသည့်အချိန်",
    cancel_leave_btn: "ခွင့်ပယ်ဖျက်ရန်",

    // User Info
    department: "ဌာနခွဲ",
    section: "ဌာနစိတ်",
    shift: "အလုပ်ချိန်",
    employee_id: "ဝန်ထမ်းနံပါတ်",
    position: "ရာထူး",
    
    // Leave Related
    leave_sick: "ဆေးခွင့်",
    sick: "ဆေးခွင့်",
    leave_personal: "ရှောင်တခင်ခွင့်",
    leave_annual: "လုပ်သက်ခွင့်",
    leave_vacation: "အပန်းဖြေခွင့်",
    leave_maternity: "မီးဖွားခွင့်",
    leave_ordination: "ရဟန်းခံခွင့်",
    leave_military: "စစ်မှုထမ်းခွင့်",
    leave_marriage: "မင်္ဂလာဆောင်ခွင့်",
    leave_funeral: "နာရေးခွင့်",
    leave_paternity: "ဖခင်ခွင့်",
    leave_sterilization: "သားဆက်ခြားခွင့်",
    leave_business: "အလုပ်ကိစ္စခွင့်",
    leave_unpaid: "လစာမဲ့ခွင့်",
    leave_work_outside: "ပြင်ပလုပ်ငန်းခွင်",
    leave_absent: "ပျက်ကွက်",
    leave_other: "အခြား",
    leave_holiday: "ရုံးပိတ်ရက်",
    sick_leave_warning: "၃ ရက်ထက်ကျော်လွန်သော ဆေးခွင့်အတွက် ဆေးစာရွက်စာတမ်း လိုအပ်ပါသည်",
    days_per_year: "ရက်/နှစ်",
    remaining: "ကျန်ရှိ",
    used: "သုံးစွဲပြီး",
    status_pending: "စောင့်ဆိုင်းဆဲ",
    status_approved: "အတည်ပြုပြီး",
    status_rejected: "ပယ်ချပြီး",
    status_waiting_for: "ထံမှ အတည်ပြုချက် စောင့်ဆိုင်းနေသည်",
    supervisor: "ကြီးကြပ်ရေးမှူး",

    // Holiday
    holiday_title: "နှစ်စဉ်ရုံးပိတ်ရက်များ",
    holiday_type_national: "အမျိုးသားပိတ်ရက်",
    holiday_type_substitute: "အစားထိုးပိတ်ရက်",
    holiday_type_special: "အထူးပိတ်ရက်",
    holiday_count: "ပိတ်ရက်",
    holiday_substitute_count: "အစားထိုးရက်",
    holiday_days: "ရက်",
    holiday_weekend: "စနေ/တနင်္ဂနွေနှင့် ရက်တိုက်",
    holiday_no_data: "ဤနှစ်အတွက် ပိတ်ရက်အချက်အလက် မရှိပါ",
    
    // Auth & Actions
    login: "ဝင်ရောက်ရန်",
    register: "စာရင်းသွင်းရန်",
    forgot_password: "စကားဝှက်မေ့နေပါသလား?",
    password: "စကားဝှက်",
    remember_me: "မှတ်မိပါ",
    no_account: "အကောင့်မရှိသေးဘူးလား?",
    save: "သိမ်းဆည်းရန်",
    cancel: "ပယ်ဖျက်ရန်",
    confirm: "အတည်ပြုရန်",
    close: "ပိတ်ရန်",
    success: "အောင်မြင်သည်",
    error: "အမှားအယွင်း",
  },
};

export const localeLabel: Record<LocaleCode, string> = {
  th: "ภาษาไทย",
  en: "English",
  my: "မြန်မာ",
};

interface LocaleContextValue {
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;
  t: (key: string, fallback?: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale?: LocaleCode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(initialLocale ?? DEFAULT_LOCALE);

  // Helper to read cookie value
  const readCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  };

  useEffect(() => {
    // If server provided initialLocale, avoid overriding on first paint
    if (initialLocale) return;
    // Priority: cookie -> localStorage -> navigator language -> default
    const fromCookie = readCookie("locale") as LocaleCode | null;
    if (fromCookie && (fromCookie === "th" || fromCookie === "en" || fromCookie === "my")) {
      setLocaleState(fromCookie);
      return;
    }
    const stored = (typeof window !== "undefined" && localStorage.getItem(LOCALE_STORAGE_KEY)) as LocaleCode | null;
    if (stored && (stored === "th" || stored === "en" || stored === "my")) {
      setLocaleState(stored);
      return;
    }
    if (typeof navigator !== "undefined") {
      const nav = navigator.language.toLowerCase();
      if (nav.startsWith("th")) setLocaleState("th");
      else if (nav.startsWith("en")) setLocaleState("en");
      else setLocaleState(DEFAULT_LOCALE);
    }
  }, [initialLocale]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      // Persist to cookie (1 year) for SSR hints and cross-tab consistency
      const oneYear = 60 * 60 * 24 * 365;
      document.cookie = `locale=${encodeURIComponent(locale)}; path=/; max-age=${oneYear}; samesite=lax`;
      // Reveal body once locale is applied (only on first load)
      try { 
        if (document.body.classList.contains('pre-locale')) {
          document.body.classList.remove('pre-locale'); 
        }
      } catch {}
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }
  }, [locale]);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCALE_STORAGE_KEY && e.newValue) {
        const val = e.newValue as LocaleCode;
        if (val === "th" || val === "en" || val === "my") {
          setLocaleState(val);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setLocale = useCallback((l: LocaleCode) => setLocaleState(l), []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      const table = messages[locale] || {};
      return table[key] ?? fallback ?? key;
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
