'use client';

import { Box, Button, Container, Typography } from '@mui/material';
import { Home, SunFog, Sun } from 'iconsax-react';
import Link from 'next/link';
import { keyframes } from '@mui/system';
import Image from 'next/image';

// Animation for car bouncing (like driving on road)
const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-3px); }
  50% { transform: translateY(0); }
  75% { transform: translateY(-2px); }
`;

// Animation for car moving horizontally
const drive = keyframes`
  0% { transform: translateX(-20px); }
  50% { transform: translateX(20px); }
  100% { transform: translateX(-20px); }
`;

// Animation for wheels spinning
const wheelSpin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Animation for road lines moving
const roadMove = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50px); }
`;

// Animation for dust/smoke from car
const dust = keyframes`
  0% { 
    opacity: 0.8; 
    transform: translateX(0) scale(1); 
  }
  100% { 
    opacity: 0; 
    transform: translateX(-30px) scale(1.5); 
  }
`;

// Animation for slight tilt while driving
const tilt = keyframes`
  0%, 100% { transform: rotate(-1deg); }
  50% { transform: rotate(1deg); }
`;

export default function NotFound() {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          gap: 3,
          overflow: 'hidden',
        }}
      >
        {/* Graphic Composition - Car Animation */}
        <Box sx={{ position: 'relative', width: 280, height: 200, mb: 2, overflow: 'visible' }}>
            
            {/* Road */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 300,
                    height: 8,
                    bgcolor: '#374151',
                    borderRadius: 1,
                    overflow: 'hidden',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: '50%',
                        left: 0,
                        transform: 'translateY(-50%)',
                        width: '200%',
                        height: 2,
                        background: 'repeating-linear-gradient(90deg, #FCD34D 0px, #FCD34D 20px, transparent 20px, transparent 40px)',
                        animation: `${roadMove} 0.5s linear infinite`,
                    }
                }}
            />

            {/* Car Container with drive animation */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 15,
                    left: '50%',
                    marginLeft: '-100px',
                    animation: `${drive} 4s ease-in-out infinite`,
                }}
            >
                {/* Car with bounce and tilt */}
                <Box
                    sx={{
                        animation: `${bounce} 0.3s ease-in-out infinite, ${tilt} 2s ease-in-out infinite`,
                    }}
                >
                    <Image
                        src="/images/404.png"
                        alt="page not found"
                        width={200}
                        height={150}
                        style={{ objectFit: 'contain' }}
                    />
                </Box>

                {/* Dust particles behind car */}
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 5,
                        left: -10,
                        display: 'flex',
                        gap: 0.5,
                    }}
                >
                    {[0, 1, 2].map((i) => (
                        <Box
                            key={i}
                            sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: '#9CA3AF',
                                animation: `${dust} 0.6s ease-out infinite`,
                                animationDelay: `${i * 0.15}s`,
                            }}
                        />
                    ))}
                </Box>
            </Box>

            {/* Speed lines */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 60,
                    left: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                }}
            >
                {[0, 1, 2].map((i) => (
                    <Box
                        key={i}
                        sx={{
                            width: 20 + i * 5,
                            height: 2,
                            bgcolor: '#D1D5DB',
                            borderRadius: 1,
                            animation: `${roadMove} ${0.3 + i * 0.1}s linear infinite`,
                            opacity: 0.6 - i * 0.15,
                        }}
                    />
                ))}
            </Box>
        </Box>

        {/* Text Content */}
        <Box>
            <Typography 
                variant="h1" 
                sx={{ 
                    fontWeight: 800, 
                    color: 'text.primary',
                    mb: 1
                }}
            >
                404
            </Typography>
            <Typography variant="h5" color="text.primary" fontWeight="bold" gutterBottom>
                PAGE NOT FOUND
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '350px', mx: 'auto' }}>
                ไม่พบหน้าที่คุณค้นหา ลองตรวจสอบลิงก์อีกครั้ง หรือลองกลับไปที่หน้าหลัก
            </Typography>
        </Box>

        {/* Button */}
        <Button
          component={Link}
          href="/"
          variant="outlined"
          size="large"
          startIcon={<Home size={20} color="#6C63FF" />}
          sx={{
            mt: 2,
            borderRadius: 4,
            px: 4,
            py: 1.5,
            borderWidth: 2,
            fontSize: '1rem',
            fontWeight: 600,
            '&:hover': {
                borderWidth: 2,
            }
          }}
        >
          กลับสู่หน้าหลัก
        </Button>
      </Box>
    </Container>
  );
}
