import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  loadMetrics,
  loadConversationsSeries,
  loadPipelineDonut,
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

    const [metrics, series, pipeline, responseTime, activity] = await Promise.all([
      loadMetrics(supabase),
      loadConversationsSeries(supabase, rangeDays),
      loadPipelineDonut(supabase),
      loadResponseTime(supabase),
      loadActivity(supabase, 50),
    ]);

    return NextResponse.json({
      metrics,
      series,
      pipeline,
      responseTime,
      activity,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao carregar dados do dashboard' }, { status: 500 });
  }
}
