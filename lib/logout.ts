'use client';
import { signOut } from 'next-auth/react';

export async function logout() {
    // Clear all localStorage
    if (typeof window !== 'undefined') {
        localStorage.clear();
    }

    // Clear all sessionStorage
    if (typeof window !== 'undefined') {
        sessionStorage.clear();
    }

    // Clear all cookies
    if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            document.cookie = name.trim() + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        }
    }

    // Sign out from NextAuth
    await signOut({
        callbackUrl: '/login',
        redirect: true
    });
}

export default logout;
