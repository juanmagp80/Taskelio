import { createSupabaseClient } from '@/src/lib/supabase-client';
import { predefinedAutomations } from './predefinedAutomations';

export async function ensurePredefinedAutomationsForUser(user_id: string) {
  const supabase = createSupabaseClient();
  
  if (!supabase) {
    console.warn('Supabase no configurado, no se pueden insertar automatizaciones predefinidas');
    return;
  }
  
  
  // Obtener los trigger_types de las automatizaciones predefinidas
  const predefinedTriggerTypes = predefinedAutomations.map(a => a.trigger_type);
  
  // Verifica cuáles automaciones predefinidas ya existen para el usuario
  const { data: existing, error } = await supabase
    .from('automations')
    .select('trigger_type, name, is_public')
    .eq('user_id', user_id)
    .in('trigger_type', predefinedTriggerTypes);

  if (error) {
    console.error('❌ Error checking existing automations:', error);
    return;
  }
  
  if (existing && existing.length > 0) {
  }

  // Determinar qué automatizaciones necesitan ser insertadas (TODAS las que falten)
  const existingTriggerTypes = existing?.map((a: any) => a.trigger_type) || [];
  const automationsToInsert = predefinedAutomations
    .filter(a => !existingTriggerTypes.includes(a.trigger_type))
    .map(a => ({
      ...a,
      user_id,
      is_active: true,
      is_public: true, // Marcar como públicas/predefinidas
      execution_count: 0,
      success_rate: 1, // Añadir de nuevo - se creará la columna automáticamente
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      trigger_conditions: JSON.stringify([]),
      actions: JSON.stringify([]),
    }));

  if (automationsToInsert.length > 0) {
  }

  // SIEMPRE insertar las automatizaciones que falten (sin importar si es usuario nuevo o existente)
  if (automationsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('automations')
      .insert(automationsToInsert);
    
    if (insertError) {
      console.error('❌ Error insertando automatizaciones predefinidas:', insertError);
      console.error('📝 Detalles del error:', JSON.stringify(insertError, null, 2));
    } else {
    }
  } else {
  }
  
}

// Función para forzar la actualización de TODAS las automatizaciones predefinidas
export async function forceUpdatePredefinedAutomations(user_id: string) {
  const supabase = createSupabaseClient();
  
  if (!supabase) {
    console.warn('Supabase no configurado');
    return;
  }
  
  
  // Eliminar todas las automatizaciones públicas/predefinidas del usuario
  const { error: deleteError } = await supabase
    .from('automations')
    .delete()
    .eq('user_id', user_id)
    .eq('is_public', true);
  
  if (deleteError) {
    console.error('Error eliminando automatizaciones predefinidas:', deleteError);
    return;
  }
  
  
  // Insertar TODAS las automatizaciones predefinidas
  const automationsToInsert = predefinedAutomations.map(a => ({
    ...a,
    user_id,
    is_active: true,
    is_public: true,
    execution_count: 0,
    success_rate: 1, // Añadir de nuevo
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    trigger_conditions: JSON.stringify([]),
    actions: JSON.stringify([]),
  }));
  
  const { error: insertError } = await supabase
    .from('automations')
    .insert(automationsToInsert);
  
  if (insertError) {
    console.error('Error insertando automatizaciones:', insertError);
  } else {
  }
}
