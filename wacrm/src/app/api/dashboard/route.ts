import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  loadMetrics,
  loadConversationsSeries,
  loadPipelineDonut,
  loadResponseTime,
  loadActivity,
} from '@/lib/dashboard/queries';

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

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
