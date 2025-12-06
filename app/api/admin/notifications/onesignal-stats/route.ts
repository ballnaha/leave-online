import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdminRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || '';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return NextResponse.json({ 
        error: 'OneSignal not configured',
        configured: false 
      }, { status: 400 });
    }

    // Get players count using REST API Key (not User Auth Key)
    // Use the /players endpoint with limit=0 to get total count
    const response = await fetch(
      `https://onesignal.com/api/v1/players?app_id=${ONESIGNAL_APP_ID}&limit=1&offset=0`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('OneSignal API Error:', error);
      
      // If 401, it means the key doesn't have permission
      if (response.status === 401) {
        return NextResponse.json({ 
          configured: true,
          error: 'REST API Key ไม่มีสิทธิ์ดึงข้อมูล Players',
          note: 'ต้องเปิด "View players" ใน API Key settings บน OneSignal Dashboard',
          database: await getDbStats(),
        });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch from OneSignal',
        details: error,
        configured: true,
        database: await getDbStats(),
      }, { status: 500 });
    }

    const playersData = await response.json();

    // Get local DB stats for comparison
    const dbStats = await getDbStats();

    return NextResponse.json({
      configured: true,
      onesignal: {
        appId: ONESIGNAL_APP_ID,
        players: playersData.total_count || 0,
        messageable_players: playersData.total_count || 0, // Approximate
      },
      database: dbStats,
      comparison: {
        onesignalPlayers: playersData.total_count || 0,
        dbDevices: dbStats.total,
        difference: (playersData.total_count || 0) - dbStats.total,
        syncStatus: (playersData.total_count || 0) === dbStats.total ? 'synced' : 'out_of_sync',
      }
    });

  } catch (error) {
    console.error('Error fetching OneSignal stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch OneSignal stats',
        configured: true,
        database: await getDbStats(),
      },
      { status: 500 }
    );
  }
}

async function getDbStats() {
  const [total, active] = await Promise.all([
    prisma.userDevice.count(),
    prisma.userDevice.count({ where: { isActive: true } }),
  ]);
  return {
    total,
    active,
    inactive: total - active,
  };
}

// Sync devices with OneSignal - validates local devices against OneSignal
// and can also import new devices from OneSignal
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return NextResponse.json({ 
        error: 'OneSignal not configured' 
      }, { status: 400 });
    }

    // Parse request body for sync mode
    let syncMode = 'validate'; // default: validate local devices
    try {
      const body = await req.json();
      syncMode = body.mode || 'validate';
    } catch {
      // No body, use default mode
    }

    const results = {
      mode: syncMode,
      localValidated: 0,
      localInvalid: 0,
      deactivated: 0,
      imported: 0,
      updated: 0,
      errors: [] as string[],
    };

    if (syncMode === 'validate' || syncMode === 'full') {
      // Validate local devices against OneSignal
      const devices = await prisma.userDevice.findMany({
        where: { isActive: true },
        select: { id: true, playerId: true, userId: true }
      });

      const invalidDevices: string[] = [];
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
              if (playerData.invalid_identifier || !playerData.id) {
                invalidDevices.push(device.playerId);
                results.localInvalid++;
              } else {
                results.localValidated++;
              }
            } else if (response.status === 404) {
              invalidDevices.push(device.playerId);
              results.localInvalid++;
            }
          } catch (e) {
            results.errors.push(`Error checking device ${device.playerId}: ${e}`);
          }
        }));

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
        results.deactivated = invalidDevices.length;
      }
    }

    if (syncMode === 'import' || syncMode === 'full') {
      // Import players from OneSignal that aren't in our DB
      // Fetch players from OneSignal (up to 300 at a time)
      let offset = 0;
      const limit = 300;
      let hasMore = true;

      while (hasMore) {
        try {
          const response = await fetch(
            `https://onesignal.com/api/v1/players?app_id=${ONESIGNAL_APP_ID}&limit=${limit}&offset=${offset}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
              },
            }
          );

          if (!response.ok) {
            if (response.status === 401) {
              results.errors.push('REST API Key does not have permission to view players');
            }
            break;
          }

          const data = await response.json();
          const players = data.players || [];

          if (players.length === 0) {
            hasMore = false;
            break;
          }

          // Check which players are already in our DB
          const playerIds = players.map((p: { id: string }) => p.id);
          const existingDevices = await prisma.userDevice.findMany({
            where: { playerId: { in: playerIds } },
            select: { playerId: true, isActive: true }
          });
          const existingPlayerIds = new Set(existingDevices.map(d => d.playerId));

          // Process each player
          for (const player of players) {
            if (!existingPlayerIds.has(player.id)) {
              // New player - try to link to user by external_user_id
              const externalUserId = player.external_user_id;
              let userId: number | undefined = undefined;

              if (externalUserId) {
                const user = await prisma.user.findFirst({
                  where: { 
                    OR: [
                      { id: parseInt(externalUserId) || 0 },
                      { employeeId: externalUserId }
                    ]
                  },
                  select: { id: true }
                });
                userId = user?.id;
              }

              // Create new device record only if we can link to a user
              // (UserDevice requires userId in schema)
              if (userId) {
                try {
                  await prisma.userDevice.create({
                    data: {
                      playerId: player.id,
                      userId: userId,
                      deviceType: player.device_type === 1 ? 'ios' : player.device_type === 2 ? 'android' : 'web',
                      isActive: !player.invalid_identifier,
                    }
                  });
                  results.imported++;
                } catch {
                  // Might fail due to unique constraint, skip
                }
              }
            } else {
              // Existing player - check if status changed
              const existing = existingDevices.find(d => d.playerId === player.id);
              if (existing) {
                const shouldBeActive = !player.invalid_identifier;
                if (existing.isActive !== shouldBeActive) {
                  await prisma.userDevice.updateMany({
                    where: { playerId: player.id },
                    data: { isActive: shouldBeActive }
                  });
                  results.updated++;
                }
              }
            }
          }

          offset += players.length;
          if (players.length < limit) {
            hasMore = false;
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (e) {
          results.errors.push(`Error fetching players: ${e}`);
          hasMore = false;
        }
      }
    }

    const message = syncMode === 'validate' 
      ? `ตรวจสอบ ${results.localValidated + results.localInvalid} devices, พบ ${results.localInvalid} invalid, deactivated ${results.deactivated}`
      : syncMode === 'import'
      ? `นำเข้า ${results.imported} devices ใหม่, อัปเดต ${results.updated} devices`
      : `Sync เสร็จสิ้น: validated ${results.localValidated}, deactivated ${results.deactivated}, imported ${results.imported}, updated ${results.updated}`;

    return NextResponse.json({
      success: true,
      ...results,
      message,
    });

  } catch (error) {
    console.error('Error syncing with OneSignal:', error);
    return NextResponse.json(
      { error: 'Failed to sync with OneSignal' },
      { status: 500 }
    );
  }
}
