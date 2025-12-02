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

// Format date for datetime-local input
function formatDateTimeLocal(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    linkUrl: '',
    startDate: '',
    endDate: '',
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
        startDate: formatDateTimeLocal(banner.startDate),
        endDate: formatDateTimeLocal(banner.endDate),
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
        startDate: '',
        endDate: '',
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
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
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
      };
      reader.readAsDataURL(file);
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
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
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
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
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
      maxWidth="sm" 
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
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <Box sx={{ position: 'relative', flex: 1 }}>
              <TextField
                label="วันที่เริ่มแสดง"
                name="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={handleChange}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <Calendar size={18} style={{ marginRight: 8 }} color={theme.palette.text.secondary} />,
                }}
                sx={{
                  '& input[type="datetime-local"]': {
                    color: 'transparent',
                    '&::-webkit-datetime-edit': {
                      color: 'transparent',
                    },
                    '&::-webkit-datetime-edit-fields-wrapper': {
                      color: 'transparent',
                    },
                  },
                  '& input[type="datetime-local"]::-webkit-calendar-picker-indicator': {
                    opacity: 1,
                    cursor: 'pointer',
                  },
                }}
              />
              {/* แสดงวันที่แบบ dd/mm/YYYY (พ.ศ.) HH:mm */}
              <Typography 
                variant="body2" 
                sx={{ 
                  position: 'absolute',
                  left: 44,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: formData.startDate ? 'text.primary' : 'text.disabled',
                  fontWeight: 400,
                  fontSize: '0.875rem',
                  pointerEvents: 'none',
                  bgcolor: 'background.paper',
                  paddingRight: 1,
                }}
              >
                {formData.startDate ? (() => {
                  const date = new Date(formData.startDate);
                  const day = String(date.getDate()).padStart(2, '0');
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const year = date.getFullYear() + 543;
                  const hours = String(date.getHours()).padStart(2, '0');
                  const minutes = String(date.getMinutes()).padStart(2, '0');
                  return `${day}/${month}/${year} ${hours}:${minutes}`;
                })() : 'วว/ดด/ปปปป --:--'}
              </Typography>
            </Box>
            <Box sx={{ position: 'relative', flex: 1 }}>
              <TextField
                label="วันที่สิ้นสุด"
                name="endDate"
                type="datetime-local"
                value={formData.endDate}
                onChange={handleChange}
                error={!!errors.endDate}
                helperText={errors.endDate}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <Calendar size={18} style={{ marginRight: 8 }} color={theme.palette.text.secondary} />,
                }}
                sx={{
                  '& input[type="datetime-local"]': {
                    color: 'transparent',
                    '&::-webkit-datetime-edit': {
                      color: 'transparent',
                    },
                    '&::-webkit-datetime-edit-fields-wrapper': {
                      color: 'transparent',
                    },
                  },
                  '& input[type="datetime-local"]::-webkit-calendar-picker-indicator': {
                    opacity: 1,
                    cursor: 'pointer',
                  },
                }}
              />
              {/* แสดงวันที่แบบ dd/mm/YYYY (พ.ศ.) HH:mm */}
              <Typography 
                variant="body2" 
                sx={{ 
                  position: 'absolute',
                  left: 44,
                  top: errors.endDate ? 'calc(50% - 10px)' : '50%',
                  transform: 'translateY(-50%)',
                  color: formData.endDate ? 'text.primary' : 'text.disabled',
                  fontWeight: 400,
                  fontSize: '0.875rem',
                  pointerEvents: 'none',
                  bgcolor: 'background.paper',
                  paddingRight: 1,
                }}
              >
                {formData.endDate ? (() => {
                  const date = new Date(formData.endDate);
                  const day = String(date.getDate()).padStart(2, '0');
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const year = date.getFullYear() + 543;
                  const hours = String(date.getHours()).padStart(2, '0');
                  const minutes = String(date.getMinutes()).padStart(2, '0');
                  return `${day}/${month}/${year} ${hours}:${minutes}`;
                })() : 'วว/ดด/ปปปป --:--'}
              </Typography>
            </Box>
          </Box>

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
