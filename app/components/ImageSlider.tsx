'use client';
import React, { useEffect, useState } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';

interface SlideImage {
    id: number;
    src: string;
    alt: string;
    date?: string; // วันที่ของข่าว เช่น '2025-11-27' หรือ '27 พ.ย. 2568'
    linkUrl?: string | null;
}

// ฟังก์ชันแปลงวันที่เป็นรูปแบบไทย
const formatThaiDate = (dateStr: string): string => {
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    
    // ถ้าเป็นรูปแบบ YYYY-MM-DD
    if (dateStr.includes('-')) {
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = thaiMonths[date.getMonth()];
        const year = date.getFullYear() + 543;
        return `${day} ${month} ${year}`;
    }
    
    // ถ้าเป็นรูปแบบอื่นให้คืนค่าเดิม
    return dateStr;
};

const defaultImages: SlideImage[] = [

];

interface ImageSliderProps {
    images?: SlideImage[];
    aspectRatio?: string; // เช่น '16/9', '4/3', '21/9'
    onEmpty?: () => void; // callback เมื่อไม่มี banner
}

const ImageSlider: React.FC<ImageSliderProps> = ({ images, aspectRatio = '16/9', onEmpty }) => {
    const [sliderImages, setSliderImages] = useState<SlideImage[]>(images || []);
    const [loading, setLoading] = useState(!images || images.length === 0);

    useEffect(() => {
        // ถ้ามีการส่ง images เข้ามา ให้ใช้ images ที่ส่งมา
        if (images && images.length > 0) {
            setSliderImages(images);
            setLoading(false);
            return;
        }

        // ถ้าไม่มี images ให้ดึงจาก API
        const fetchBanners = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/banners');
                if (response.ok) {
                    const data = await response.json();
                    if (data.length > 0) {
                        const mappedImages = data.map((banner: any) => ({
                            id: banner.id,
                            src: banner.imageUrl,
                            alt: banner.title,
                            linkUrl: banner.linkUrl,
                            date: banner.createdAt || banner.updatedAt, // ใช้วันที่ upload
                        }));
                        setSliderImages(mappedImages);
                    } else {
                        // ถ้าไม่มีข้อมูลจาก API ให้ใช้ defaultImages
                        setSliderImages(defaultImages);
                    }
                }
            } catch (error) {
                console.error('Error fetching banners:', error);
                setSliderImages(defaultImages);
            } finally {
                setLoading(false);
            }
        };

        fetchBanners();
    }, [images]);

    if (loading) {
        return (
            <Skeleton 
                variant="rectangular" 
                width="100%" 
                sx={{ 
                    aspectRatio: aspectRatio, 
                    borderRadius: 1 
                }} 
            />
        );
    }

    if (sliderImages.length === 0) {
        onEmpty?.();
        return null;
    }

    // ถ้ามีแค่ 1 รูป ให้แสดงเต็มความกว้าง
    const isSingleImage = sliderImages.length === 1;

    return (
        <Box
            sx={{
                width: 'calc(100% + 40px)',
                ml: -2.5,
                overflow: 'hidden',
            }}
        >
            <Swiper
                modules={[Autoplay]}
                spaceBetween={12}
                slidesPerView={isSingleImage ? 1 : 1.5}
                autoplay={isSingleImage ? false : {
                    delay: 6000,
                    disableOnInteraction: false,
                }}
                loop={sliderImages.length > 2}
                style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 8 }}
            >
                {sliderImages.map((image) => (
                    <SwiperSlide key={image.id}>
                        <Box
                            onClick={() => image.linkUrl && window.open(image.linkUrl, '_blank')}
                            sx={{
                                width: '100%',
                                aspectRatio: aspectRatio,
                                position: 'relative',
                                cursor: image.linkUrl ? 'pointer' : 'default',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            }}
                        >
                            <Image
                                src={image.src}
                                alt={image.alt}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                priority={true}
                                style={{
                                    objectFit: 'cover',
                                }}
                            />
                            {/* Badge แสดงวันที่ upload */}
                            {image.date && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        opacity: 0.85,
                                        bottom: 10,
                                        left: 10,
                                        zIndex: 2,
                                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                                        color: 'text.secondary',
                                        px: 1,
                                        py: 0.5,
                                        borderRadius: 10,
                                        backdropFilter: 'blur(4px)',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontWeight: 400,
                                            fontSize: '0.7rem',
                                            letterSpacing: 0.3,
                                            color: '#fff',
                                        }}
                                    >
                                        {formatThaiDate(image.date)}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </SwiperSlide>
                ))}
            </Swiper>
        </Box>
    );
};

export default ImageSlider;
