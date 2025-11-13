import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/src/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin();
    
    
    // Fecha de hace 20 días (trial expirado)
    const expiredTrialStartDate = new Date();
    expiredTrialStartDate.setDate(expiredTrialStartDate.getDate() - 20);
    
    // Fecha de hace 6 días (trial terminó hace 6 días)
    const expiredTrialEndDate = new Date();
    expiredTrialEndDate.setDate(expiredTrialEndDate.getDate() - 6);
    
    // Actualizar usuario con trial expirado
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'cancelled',
        subscription_plan: 'free',
        trial_started_at: expiredTrialStartDate.toISOString(),
        trial_ends_at: expiredTrialEndDate.toISOString(),
        created_at: expiredTrialStartDate.toISOString(), // Usar created_at como referencia del trial
        stripe_subscription_id: null,
        stripe_customer_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('email', 'amazonjgp80@gmail.com')
      .select();

    if (updateError) {
      console.error('❌ Error actualizando perfil:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Calcular días transcurridos desde el final del trial
    const daysAfterTrialEnd = Math.floor((new Date().getTime() - expiredTrialEndDate.getTime()) / (1000 * 60 * 60 * 24));
    const trialDuration = Math.floor((expiredTrialEndDate.getTime() - expiredTrialStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const isExpired = daysAfterTrialEnd > 0;
    
      email: 'amazonjgp80@gmail.com',
      trialStartDate: expiredTrialStartDate.toISOString(),
      trialEndDate: expiredTrialEndDate.toISOString(),
      trialDuration,
      daysAfterTrialEnd,
      isExpired,
      subscriptionStatus: 'cancelled',
      subscriptionPlan: 'free'
    });
    
    return NextResponse.json({
      success: true,
      message: 'Trial configurado como expirado',
      userEmail: 'amazonjgp80@gmail.com',
      trialStartDate: expiredTrialStartDate.toISOString(),
      trialEndDate: expiredTrialEndDate.toISOString(),
      trialDuration,
      daysAfterTrialEnd,
      isExpired,
      subscriptionStatus: 'cancelled',
      subscriptionPlan: 'free',
      updatedProfile: updateData[0]
    });
    
  } catch (error: any) {
    console.error('❌ Error en setup-expired-trial:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
