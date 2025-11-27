import { NextResponse } from 'next/server';

export async function POST() {
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

    cookiesToClear.forEach(cookieName => {
        response.cookies.set(cookieName, '', {
            expires: new Date(0),
            path: '/',
        });
    });

    return response;
}
