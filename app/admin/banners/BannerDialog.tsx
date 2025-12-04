'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControlLabel,
  Switch,
  CircularProgress,
  Typography,
  IconButton,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/th';
import buddhistEra from 'dayjs/plugin/buddhistEra';

dayjs.extend(buddhistEra);

import { Image, ExportSquare, CloseCircle, Calendar, Link21 } from 'iconsax-react';

interface Banner {
  id: number;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  startDate?: string;
  endDate?: string;
  displayOrder: number;
  isActive: boolean;
}

interface BannerDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  banner?: Banner;
}

// Resize image function
const resizeImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function BannerDialog({
  open,
  onClose,
  onSave,
  banner,
}: BannerDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    imageUrl: string;
    linkUrl: string;
    startDate: Dayjs | null;
    endDate: Dayjs | null;
    displayOrder: number;
    isActive: boolean;
  }>({
    title: '',
    description: '',
    imageUrl: '',
    linkUrl: '',
    startDate: null,
    endDate: null,
    displayOrder: 0,
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewImage, setPreviewImage] = useState<string>('');

  useEffect(() => {
    if (banner) {
      setFormData({
        title: banner.title || '',
        description: banner.description || '',
        imageUrl: banner.imageUrl || '',
        linkUrl: banner.linkUrl || '',
        startDate: banner.startDate ? dayjs(banner.startDate) : null,
        endDate: banner.endDate ? dayjs(banner.endDate) : null,
        displayOrder: banner.displayOrder ?? 0,
        isActive: banner.isActive ?? true,
      });
      setPreviewImage(banner.imageUrl || '');
    } else {
      setFormData({
        title: '',
        description: '',
        imageUrl: '',
        linkUrl: '',
        startDate: null,
        endDate: null,
        displayOrder: 0,
        isActive: true,
      });
      setPreviewImage('');
    }
    setErrors({});
  }, [banner, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value,
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, imageUrl: 'กรุณาเลือกไฟล์รูปภาพ' }));
      return;
    }

    // Validate file size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, imageUrl: 'ขนาดไฟล์ต้องไม่เกิน 15MB' }));
      return;
    }

    setUploadingImage(true);
    setErrors((prev) => ({ ...prev, imageUrl: '' }));

    try {
      // Resize and convert to base64
      const base64 = await resizeImage(file, 1200, 0.8);
        
      // Upload to server
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, type: 'banner' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'อัพโหลดรูปภาพไม่สำเร็จ');
      }

      const data = await res.json();
      setFormData((prev) => ({ ...prev, imageUrl: data.path }));
      setPreviewImage(data.path);
      setUploadingImage(false);

    } catch (error: any) {
      setErrors((prev) => ({ ...prev, imageUrl: error.message }));
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
    setPreviewImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = 'กรุณากรอกชื่อ Banner';
    }
    if (!formData.imageUrl) {
      newErrors.imageUrl = 'กรุณาอัพโหลดรูปภาพ';
    }
    if (formData.startDate && formData.endDate) {
      if (formData.startDate.isAfter(formData.endDate)) {
        newErrors.endDate = 'วันที่สิ้นสุดต้องมากกว่าวันที่เริ่มต้น';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const url = banner
        ? `/api/admin/banners/${banner.id}`
        : '/api/admin/banners';
      const method = banner ? 'PUT' : 'POST';

      const submitData = {
        ...formData,
        startDate: formData.startDate ? formData.startDate.toISOString() : null,
        endDate: formData.endDate ? formData.endDate.toISOString() : null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'เกิดข้อผิดพลาด');
      }

      onSave();
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 1,
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        pb: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Image size={24} variant="Bold" color={theme.palette.primary.main} />
        {banner ? 'แก้ไข Banner' : 'เพิ่ม Banner ใหม่'}
      </DialogTitle>
      <DialogContent sx={{ p: 2, mt: 2 }}>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {errors.submit && (
            <Box sx={{ color: 'error.main', mb: 1 }}>{errors.submit}</Box>
          )}

          {/* Image Upload */}
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              รูปภาพ Banner <span style={{ color: 'red' }}>*</span>
            </Typography>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              id="banner-image-upload"
            />
            
            {previewImage ? (
              <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <Box
                  component="img"
                  src={previewImage}
                  alt="Preview"
                  sx={{
                    maxWidth: '100%',
                    maxHeight: 200,
                    objectFit: 'contain',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
                <IconButton
                  size="small"
                  onClick={handleRemoveImage}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: 'error.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'error.dark' },
                  }}
                >
                  <CloseCircle size={16} variant="Outline" color="white" />
                </IconButton>
              </Box>
            ) : (
              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  width: '100%',
                  height: 150,
                  border: '2px dashed',
                  borderColor: errors.imageUrl ? 'error.main' : 'divider',
                  borderRadius: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                  },
                }}
              >
                {uploadingImage ? (
                  <CircularProgress size={32} />
                ) : (
                  <>
                    <ExportSquare size={32} color={theme.palette.text.secondary} />
                    <Typography variant="body2" color="text.secondary">
                      คลิกเพื่ออัพโหลดรูปภาพ
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      รองรับ JPG, PNG, GIF (ขนาดไม่เกิน 15MB)
                    </Typography>
                  </>
                )}
              </Box>
            )}
            
            {errors.imageUrl && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                {errors.imageUrl}
              </Typography>
            )}
          </Box>

          <TextField
            label="ชื่อ Banner"
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={!!errors.title}
            helperText={errors.title}
            size="small"
            fullWidth
            required
          />

          <TextField
            label="รายละเอียด"
            name="description"
            value={formData.description}
            onChange={handleChange}
            size="small"
            fullWidth
            multiline
            rows={2}
            placeholder="คำอธิบายเพิ่มเติม (ไม่บังคับ)"
          />

          <TextField
            label="ลิงก์ URL"
            name="linkUrl"
            value={formData.linkUrl}
            onChange={handleChange}
            size="small"
            fullWidth
            placeholder="https://example.com"
            InputProps={{
              startAdornment: <Link21 size={18} style={{ marginRight: 8 }} color={theme.palette.text.secondary} />,
            }}
          />

          {/* Date Range */}
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="th">
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              <DateTimePicker
                label="วันที่เริ่มแสดง"
                value={formData.startDate}
                onChange={(newValue) => {
                  setFormData((prev) => ({ ...prev, startDate: newValue }));
                  if (errors.startDate) {
                    setErrors((prev) => ({ ...prev, startDate: '' }));
                  }
                }}
                format="DD/MM/YYYY HH:mm"
                ampm={false}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    InputProps: {
                      startAdornment: <Calendar size={18} style={{ marginRight: 8 }} color={theme.palette.text.secondary} />,
                    },
                    inputProps: {
                      value: formData.startDate ? formData.startDate.format('DD/MM/') + (formData.startDate.year() + 543) + formData.startDate.format(' HH:mm') : '',
                    },
                  },
                }}
              />
              <DateTimePicker
                label="วันที่สิ้นสุด"
                value={formData.endDate}
                onChange={(newValue) => {
                  setFormData((prev) => ({ ...prev, endDate: newValue }));
                  if (errors.endDate) {
                    setErrors((prev) => ({ ...prev, endDate: '' }));
                  }
                }}
                format="DD/MM/YYYY HH:mm"
                ampm={false}
                minDateTime={formData.startDate || undefined}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    error: !!errors.endDate,
                    helperText: errors.endDate,
                    InputProps: {
                      startAdornment: <Calendar size={18} style={{ marginRight: 8 }} color={theme.palette.text.secondary} />,
                    },
                    inputProps: {
                      value: formData.endDate ? formData.endDate.format('DD/MM/') + (formData.endDate.year() + 543) + formData.endDate.format(' HH:mm') : '',
                    },
                  },
                }}
              />
            </Box>
          </LocalizationProvider>

          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            * หากไม่ระบุวันที่ Banner จะแสดงตลอดเวลา
          </Typography>

          <TextField
            label="ลำดับการแสดง"
            name="displayOrder"
            type="number"
            value={formData.displayOrder}
            onChange={handleChange}
            size="small"
            fullWidth
            helperText="ตัวเลขน้อย = แสดงก่อน"
            inputProps={{ min: 0 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={handleChange}
                name="isActive"
                color="success"
              />
            }
            label={
              <Typography variant="body2">
                เปิดใช้งาน {formData.isActive ? '(แสดงอยู่)' : '(ไม่แสดง)'}
              </Typography>
            }
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ 
        p: 2, 
        borderTop: '1px solid', 
        borderColor: 'divider',
        flexDirection: { xs: 'column-reverse', sm: 'row' },
        gap: { xs: 1, sm: 0 },
        '& > button': {
          width: { xs: '100%', sm: 'auto' },
        }
      }}>
        <Button onClick={onClose} disabled={loading}>
          ยกเลิก
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || uploadingImage}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {loading ? 'กำลังบันทึก...' : banner ? 'บันทึก' : 'เพิ่ม Banner'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
