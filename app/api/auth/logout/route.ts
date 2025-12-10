import { NextResponse } from 'next/server';

export async function POST() {
    console.log('🔐 Logout API called');

    try {
        const response = NextResponse.json(
            { message: 'ออกจากระบบสำเร็จ' },
            { status: 200 }
        );

        // Clear all auth-related cookies
        const cookiesToClear = [
            'next-auth.session-token',
            'next-auth.csrf-token',
            'next-auth.callback-url',
            '__Secure-next-auth.session-token',
            '__Secure-next-auth.csrf-token',
            '__Secure-next-auth.callback-url',
            '__Host-next-auth.csrf-token',
        ];

        console.log('🔐 Clearing cookies:', cookiesToClear);

        cookiesToClear.forEach(cookieName => {
            response.cookies.set(cookieName, '', {
                expires: new Date(0),
                path: '/',
            });
        });

        console.log('🔐 Logout successful');
        return response;
    } catch (error) {
        console.error('🔐 Logout error:', error);
        return NextResponse.json(
            { error: 'Logout failed', details: String(error) },
            { status: 500 }
        );
    }
}
