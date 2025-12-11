import { NextResponse } from 'next/server';
import { APP_VERSION, BUILD_NUMBER } from '@/lib/version';

export async function GET() {
    return NextResponse.json({
        version: APP_VERSION,
        buildNumber: BUILD_NUMBER,
        timestamp: Date.now(),
    });
}
