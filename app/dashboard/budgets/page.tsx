import { createServerSupabaseClient } from '@/src/lib/supabase-server';
import { redirect } from 'next/navigation';
import { BudgetsPageClient } from './BudgetsPageClient';

export default async function BudgetsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  if (!session.user) {
    redirect('/login');
  }

  const userEmail = session.user.email;

  if (typeof userEmail !== 'string') {
    console.error('Invalid email format:', userEmail);
    redirect('/login');
  }

  return <BudgetsPageClient userEmail={userEmail} />;
}
