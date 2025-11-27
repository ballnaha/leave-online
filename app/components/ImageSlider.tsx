'use client';
import React from 'react';
import { Box, Typography } from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

interface SlideImage {
    id: number;
    src: string;
    alt: string;
    date?: string; // วันที่ของข่าว เช่น '2025-11-27' หรือ '27 พ.ย. 2568'
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
    {
        id: 1,
        src: 'images/banner-1.png',
        alt: 'Office workspace',
        date: new Date().toISOString().split('T')[0], // วันที่ปัจจุบัน
    },
    // {
    //     id: 2,
    //     src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    //     alt: 'Team collaboration',
    // },
    // {
    //     id: 3,
    //     src: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
    //     alt: 'Working together',
    // },
];

interface ImageSliderProps {
    images?: SlideImage[];
    aspectRatio?: string; // เช่น '16/9', '4/3', '21/9'
}

const ImageSlider: React.FC<ImageSliderProps> = ({ images = defaultImages, aspectRatio = '16/9' }) => {
    return (
        <Box
            sx={{
                borderRadius: 1,
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                width: '100%',
                aspectRatio: aspectRatio,
                '& .swiper': {
                    borderRadius: 1,
                    width: '100%',
                    height: '100%',
                },
                '& .swiper-pagination': {
                    bottom: '8px !important',
                },
                '& .swiper-pagination-bullet': {
                    width: 8,
                    height: 8,
                    bgcolor: 'white',
                    opacity: 0.5,
                    transition: 'all 0.3s ease',
                },
                '& .swiper-pagination-bullet-active': {
                    opacity: 1,
                    width: 20,
                    borderRadius: 4,
                },
            }}
        >
            <Swiper
                modules={[Autoplay, Pagination]}
                spaceBetween={0}
                slidesPerView={1}
                autoplay={{
                    delay: 6000,
                    disableOnInteraction: false,
                }}
                pagination={{
                    clickable: true,
                }}
                loop={true}
                style={{ width: '100%', height: '100%' }}
            >
                {images.map((image) => (
                    <SwiperSlide key={image.id}>
                        <Box
                            sx={{
                                width: '100%',
                                height: '100%',
                                position: 'relative',
                                '&::after': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.3) 100%)',
                                    pointerEvents: 'none',
                                },
                            }}
                        >
                            <Box
                                component="img"
                                src={image.src}
                                alt={image.alt}
                                sx={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                            />
                            {/* Badge แสดงวันที่ */}
                            {image.date && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        zIndex: 2,
                                        bgcolor: 'rgba(0, 0, 0, 0.2)',
                                        color: 'white',
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: 1,
                                        backdropFilter: 'blur(1px)',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontWeight: 500,
                                            fontSize: '0.7rem',
                                            letterSpacing: 0.3,
                                        }}
                                    >
                                        📅 {formatThaiDate(image.date)}
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
