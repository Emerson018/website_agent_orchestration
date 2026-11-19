import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  loadMetrics,
  loadConversationsSeries,
  loadResponseTime,
  loadActivity,
} from '@/lib/dashboard/queries';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rangeDays = parseInt(searchParams.get('range') || '30', 10);

    // Trocar o período do gráfico só precisa da série
    if (searchParams.get('only') === 'series') {
      return NextResponse.json({ series: await loadConversationsSeries(supabase, rangeDays) });
    }

    const [metrics, series, responseTime, activity] = await Promise.all([
      loadMetrics(supabase),
      loadConversationsSeries(supabase, rangeDays),
      loadResponseTime(supabase),
      loadActivity(supabase, 50),
    ]);

    return NextResponse.json({
      metrics,
      series,
      responseTime,
      activity,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao carregar dados do dashboard' }, { status: 500 });
  }
}
