'use client';
import { createTheme } from '@mui/material/styles';

// ใช้ CSS variable แทนการ import font โดยตรง
// เพื่อให้ MUI ใช้ font เดียวกันกับที่กำหนดใน layout.tsx
const fontFamily = 'var(--font-comfortaa), var(--font-sarabun), Arial, Helvetica, sans-serif';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#6C63FF', // Soft Purple/Blue from the design
            light: '#A09AE8',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#FF8A80', // Soft Red/Pink
            light: '#FFBCB5',
            contrastText: '#ffffff',
        },
        background: {
            default: '#EAF2F8', // Light blueish background
            paper: '#ffffff',
        },
        text: {
            primary: '#2D3748',
            secondary: '#718096',
        },
        success: {
            main: '#4CAF50',
            light: '#E8F5E9',
        },
        warning: {
            main: '#FF9800',
            light: '#FFF3E0',
        },
        error: {
            main: '#F44336',
            light: '#FFEBEE',
        },
    },
    typography: {
        fontFamily: fontFamily,
        h1: {
            fontWeight: 700,
            fontSize: '2rem',
        },
        h2: {
            fontWeight: 700,
            fontSize: '1.5rem',
        },
        h3: {
            fontWeight: 600,
            fontSize: '1.25rem',
        },
        h4: {
            fontWeight: 600,
            fontSize: '1rem',
        },
        subtitle1: {
            fontSize: '0.875rem',
            color: '#718096',
        },
        body1: {
            fontSize: '1rem',
        },
        button: {
            textTransform: 'none',
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 24, // Highly rounded corners as per design
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 50,
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
                rounded: {
                    borderRadius: 24,
                },
                elevation1: {
                    boxShadow: '0 10px 30px rgba(0,0,0,0.02)', // Soft shadow
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 30,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
                },
            },
        },
    },
});

export default theme;
