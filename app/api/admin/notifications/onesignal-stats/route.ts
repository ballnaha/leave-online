import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || '';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return NextResponse.json({ 
        error: 'OneSignal not configured',
        configured: false 
      }, { status: 400 });
    }

    // Get app info from OneSignal
    const response = await fetch(`https://onesignal.com/api/v1/apps/${ONESIGNAL_APP_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OneSignal API Error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch from OneSignal',
        details: error 
      }, { status: 500 });
    }

    const appData = await response.json();

    // Get local DB stats for comparison
    const [dbTotal, dbActive] = await Promise.all([
      prisma.userDevice.count(),
      prisma.userDevice.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      configured: true,
      onesignal: {
        appName: appData.name,
        players: appData.players || 0,
        messageable_players: appData.messageable_players || 0,
        // Additional stats if available
        gcm_key: appData.gcm_key ? 'configured' : 'not configured',
        safari_push_id: appData.safari_push_id || null,
        site_name: appData.chrome_web_origin || appData.safari_site_origin || null,
      },
      database: {
        total: dbTotal,
        active: dbActive,
        inactive: dbTotal - dbActive,
      },
      comparison: {
        onesignalPlayers: appData.players || 0,
        dbDevices: dbTotal,
        difference: (appData.players || 0) - dbTotal,
        syncStatus: (appData.players || 0) === dbTotal ? 'synced' : 'out_of_sync',
      }
    });

  } catch (error) {
    console.error('Error fetching OneSignal stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OneSignal stats' },
      { status: 500 }
    );
  }
}

// Sync devices with OneSignal
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return NextResponse.json({ 
        error: 'OneSignal not configured' 
      }, { status: 400 });
    }

    // Get all devices from our DB
    const devices = await prisma.userDevice.findMany({
      where: { isActive: true },
      select: { id: true, playerId: true, userId: true }
    });

    let validCount = 0;
    let invalidCount = 0;
    const invalidDevices: string[] = [];

    // Check each device with OneSignal (in batches to avoid rate limiting)
    const batchSize = 10;
    for (let i = 0; i < devices.length; i += batchSize) {
      const batch = devices.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (device) => {
        try {
          const response = await fetch(
            `https://onesignal.com/api/v1/players/${device.playerId}?app_id=${ONESIGNAL_APP_ID}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
              },
            }
          );

          if (response.ok) {
            const playerData = await response.json();
            // Check if player is still subscribed
            if (playerData.invalid_identifier || !playerData.id) {
              invalidDevices.push(device.playerId);
              invalidCount++;
            } else {
              validCount++;
            }
          } else if (response.status === 404) {
            // Player not found in OneSignal
            invalidDevices.push(device.playerId);
            invalidCount++;
          }
        } catch (e) {
          console.error(`Error checking device ${device.playerId}:`, e);
        }
      }));

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < devices.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Deactivate invalid devices
    if (invalidDevices.length > 0) {
      await prisma.userDevice.updateMany({
        where: { playerId: { in: invalidDevices } },
        data: { isActive: false }
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        checked: devices.length,
        valid: validCount,
        invalid: invalidCount,
        deactivated: invalidDevices.length,
      },
      message: `Synced ${devices.length} devices. ${invalidCount} invalid devices deactivated.`
    });

  } catch (error) {
    console.error('Error syncing with OneSignal:', error);
    return NextResponse.json(
      { error: 'Failed to sync with OneSignal' },
      { status: 500 }
    );
  }
}
