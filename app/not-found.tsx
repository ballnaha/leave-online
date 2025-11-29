'use client';

import { Box, Button, Container, Typography } from '@mui/material';
import { Home, Palmtree, Sun } from 'lucide-react';
import Link from 'next/link';
import { keyframes } from '@mui/system';

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
            {/* Sun */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 10,
                    right: 20,
                    color: '#FFB74D', // Orange/Sun color
                    animation: `${rotate} 10s linear infinite`,
                }}
            >
                <Sun size={50} />
            </Box>

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
                <Palmtree size={140} strokeWidth={1.5} />
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
                เราหาหน้าที่คุณต้องการไม่เจอ บางทีมันอาจจะไปเที่ยวทะเลอยู่ก็ได้
            </Typography>
        </Box>

        {/* Button */}
        <Button
          component={Link}
          href="/"
          variant="outlined"
          size="large"
          startIcon={<Home size={20} />}
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
