import { createSupabaseClient } from '@/src/lib/supabase';

export async function getFirstClientForUser(user_id: string) {
  try {
    const supabase = createSupabaseClient();
    if (!supabase) {
      console.error('❌ Cliente Supabase no disponible');
      return null;
    }


    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user_id)
      .limit(1);
    
    if (error) {
      console.error('❌ Error buscando clientes:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    return data[0];
  } catch (error) {
    console.error('❌ Error en getFirstClientForUser:', error);
    return null;
  }
}

export async function getFirstProjectForUser(user_id: string) {
  try {
    const supabase = createSupabaseClient();
    if (!supabase) {
      console.error('❌ Cliente Supabase no disponible');
      return null;
    }


    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user_id)
      .limit(1);
    
    if (error) {
      console.error('❌ Error buscando proyectos:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    return data[0];
  } catch (error) {
    console.error('❌ Error en getFirstProjectForUser:', error);
    return null;
  }
}

export async function getFirstInvoiceForUser(user_id: string) {
  try {
    const supabase = createSupabaseClient();
    if (!supabase) {
      console.error('❌ Cliente Supabase no disponible');
      return null;
    }


    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user_id)
      .limit(1);
    
    if (error) {
      console.error('❌ Error buscando facturas:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    return data[0];
  } catch (error) {
    console.error('❌ Error en getFirstInvoiceForUser:', error);
    return null;
  }
}

// Función para verificar si el usuario tiene datos
export async function checkUserEntities(user_id: string) {
  const [client, project, invoice] = await Promise.all([
    getFirstClientForUser(user_id),
    getFirstProjectForUser(user_id),
    getFirstInvoiceForUser(user_id)
  ]);


  return {
    client,
    project,
    invoice,
    hasEntities: !!(client || project || invoice)
  };
}
