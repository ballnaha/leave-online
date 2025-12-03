'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/types/user-role';

export interface UserProfile {
    id: number;
    employeeId: string;
    email: string | null;
    firstName: string;
    lastName: string;
    avatar: string | null;
    company: string;
    companyName: string;
    employeeType: string;
    department: string;
    departmentName: string;
    section: string | null;
    sectionName: string | null;
    position: string | null;
    shift: string | null;
    startDate: string | null;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
    gender: string;
}

interface UserContextType {
    user: UserProfile | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
    user: null,
    loading: true,
    error: null,
    refetch: async () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUser = useCallback(async () => {
        if (status === 'loading') return;
        
        if (status === 'unauthenticated' || !session?.user) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            // Only show loading if we don't have user data yet (initial load)
            if (!user) {
                setLoading(true);
            }
            setError(null);
            const res = await fetch('/api/profile');
            
            // If user not found or inactive, force logout
            if (res.status === 401 || res.status === 404) {
                console.log('User not found or unauthorized, logging out...');
                await signOut({ redirect: false });
                router.push('/login?reason=account_disabled');
                return;
            }
            
            if (!res.ok) {
                throw new Error('Failed to fetch user profile');
            }
            
            const data = await res.json();
            
            // Check if user is inactive
            if (data.isActive === false) {
                console.log('User account is disabled, logging out...');
                await signOut({ redirect: false });
                router.push('/login?reason=account_disabled');
                return;
            }
            
            setUser(data);
        } catch (err) {
            console.error('Error fetching user:', err);
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    }, [session, status, router]);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    // Periodic check to verify user is still active (every 60 seconds)
    useEffect(() => {
        if (status !== 'authenticated' || !session?.user) return;
        
        const intervalId = setInterval(() => {
            fetchUser();
        }, 60000); // Check every 60 seconds
        
        return () => clearInterval(intervalId);
    }, [status, session, fetchUser]);

    return (
        <UserContext.Provider value={{ user, loading, error, refetch: fetchUser }}>
            {children}
        </UserContext.Provider>
    );
};
