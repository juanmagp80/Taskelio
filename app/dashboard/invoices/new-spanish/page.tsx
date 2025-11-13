import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import CreateSpanishInvoice from './CreateSpanishInvoice-SIMPLE';

export default async function CreateSpanishInvoicePage() {

    const supabase = createServerComponentClient({ cookies });

    const { data: { session } } = await supabase.auth.getSession();


    if (!session?.user?.email) {
        redirect('/login');
    }

    return <CreateSpanishInvoice userEmail={session.user.email} />;
}
