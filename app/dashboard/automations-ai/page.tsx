import { createServerSupabaseClient } from '@/src/lib/supabase-server';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AutomationsAIClient from './AutomationsAIClient';

export const metadata: Metadata = {
  title: 'Automatizaciones IA | Taskelio',
  description: 'Automatiza tu trabajo freelance con inteligencia artificial integrada',
};

export default async function AutomationsAIPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || !session.user?.email) {
    redirect('/login');
  }

  return <AutomationsAIClient userEmail={session.user.email} />;
}
