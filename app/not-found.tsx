'use client';

import { Box, Button, Container, Typography } from '@mui/material';
import { Home, SunFog, Sun } from 'iconsax-react';
import Link from 'next/link';
import { keyframes } from '@mui/system';
import Image from 'next/image';

// Animation for Sun
const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Animation for Tree (swaying)
const sway = keyframes`
  0% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
  100% { transform: rotate(-5deg); }
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
        {/* Graphic Composition */}
        <Box sx={{ position: 'relative', width: 200, height: 200, mb: 2 }}>

            {/* Palm Tree */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    marginLeft: '-70px', // Half of size
                    color: 'primary.main',
                    transformOrigin: 'bottom center',
                    animation: `${sway} 3s ease-in-out infinite`,
                }}
            >
                <Image
                    src="/images/404.png"
                    alt="page not found"
                    width={200}
                    height={200}
                />
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
