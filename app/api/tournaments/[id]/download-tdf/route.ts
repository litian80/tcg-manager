import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: tournamentId } = await params;

    // Auth: require admin role
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    // Download the TDF from storage using admin client (bypasses RLS edge cases)
    const admin = createAdminClient();
    const storagePath = `${tournamentId}/latest.tdf`;

    const { data, error } = await admin.storage
        .from('tdf-files')
        .download(storagePath);

    if (error || !data) {
        return NextResponse.json(
            { error: 'TDF file not found for this tournament' },
            { status: 404 }
        );
    }

    // Fetch tournament name for the filename
    const { data: tournament } = await admin
        .from('tournaments')
        .select('name, tom_uid')
        .eq('id', tournamentId)
        .single();

    const safeName = (tournament?.name || 'tournament')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 50);
    const filename = `${safeName}_${tournament?.tom_uid || tournamentId}.tdf`;

    const arrayBuffer = await data.arrayBuffer();

    return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    });
}
