import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { promises as fs } from 'fs';
import path from 'path';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

async function getConfig() {
  try {
    const configPath = path.join(process.cwd(), 'ai_config.json');
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return {
      app_name: 'Agendador PWA',
      primary_color: '#4F46E5',
      secondary_color: '#10B981',
    };
  }
}

export default async function AdminDashboard() {
  const config = await getConfig();
  const supabase = await createClient();

  // Verifica a sessão do usuário
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  return <DashboardClient user={user} config={config} />;
}
