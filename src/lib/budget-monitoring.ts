// Sistema de monitoreo de presupuestos
// Este archivo implementa la detección automática de presupuestos excedidos

import { createServerSupabaseClient } from '@/src/lib/supabase-server';
import { executeAutomationAction } from '@/src/lib/automation-actions';

interface BudgetMonitoringData {
  project_id: string;
  project_name: string;
  client_id: string;
  client_name: string;
  client_email: string;
  user_id: string;
  budget_total: number;
  budget_spent: number;
  budget_percentage: number;
  budget_remaining: number;
}

export async function checkBudgetExceeded(): Promise<void> {
  try {
    
    const supabase = await createServerSupabaseClient();
    
    // 1. Obtener todos los proyectos activos con presupuesto
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        budget,
        client_id,
        user_id,
        clients (
          id,
          name,
          email
        ),
        tasks (
          estimated_hours,
          actual_hours,
          hourly_rate
        )
      `)
      .not('budget', 'is', null)
      .gt('budget', 0)
      .eq('status', 'active');
    
    if (projectsError) {
      console.error('❌ Error obteniendo proyectos:', projectsError);
      return;
    }
    
    
    // 2. Calcular gasto actual de cada proyecto
    const budgetAlerts: BudgetMonitoringData[] = [];
    
    for (const project of projects || []) {
      // Calcular gasto total basado en horas trabajadas
      let totalSpent = 0;
      
      if (project.tasks && project.tasks.length > 0) {
        totalSpent = project.tasks.reduce((sum, task) => {
          const hoursWorked = task.actual_hours || 0;
          const rate = task.hourly_rate || 50; // Rate por defecto
          return sum + (hoursWorked * rate);
        }, 0);
      }
      
      const budgetPercentage = (totalSpent / project.budget) * 100;
      
      // 3. Verificar si excede el 80%
      if (budgetPercentage >= 80) {
        
        const client = Array.isArray(project.clients) ? project.clients[0] : project.clients;
        
        budgetAlerts.push({
          project_id: project.id,
          project_name: project.name,
          client_id: project.client_id,
          client_name: client?.name || 'Cliente',
          client_email: client?.email || '',
          user_id: project.user_id,
          budget_total: project.budget,
          budget_spent: totalSpent,
          budget_percentage: Math.round(budgetPercentage),
          budget_remaining: Math.max(0, project.budget - totalSpent)
        });
      }
    }
    
    // 4. Ejecutar automatización para cada alerta
    if (budgetAlerts.length > 0) {
      
      // Obtener la automatización de presupuesto excedido
      const { data: automation, error: autoError } = await supabase
        .from('automations')
        .select('*')
        .ilike('name', '%presupuesto%')
        .eq('is_active', true)
        .single();
      
      if (autoError || !automation) {
        console.error('❌ No se encontró automatización de presupuesto activa');
        return;
      }
      
      for (const alert of budgetAlerts) {
        // Verificar si ya se envió alerta para este proyecto recientemente
        const { data: recentAlert } = await supabase
          .from('automation_executions')
          .select('id')
          .eq('automation_id', automation.id)
          .eq('metadata->project_id', alert.project_id)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24 horas
          .single();
        
        if (recentAlert) {
          continue;
        }
        
        // Obtener información del usuario responsable
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', alert.user_id)
          .single();
        
        const userInfo = {
          id: alert.user_id,
          email: userProfile?.email || '',
          user_metadata: {
            full_name: userProfile?.full_name || userProfile?.email?.split('@')[0] || 'Usuario'
          },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString()
        } as any;
        
        // Preparar payload para la automatización
        const payload = {
          client: {
            id: alert.client_id,
            name: alert.client_name,
            email: alert.client_email
          },
          automation: automation,
          user: userInfo,
          supabase: supabase,
          executionId: `budget-${alert.project_id}-${Date.now()}`,
          // Variables específicas del presupuesto
          project_name: alert.project_name,
          budget_total: alert.budget_total.toLocaleString('es-ES'),
          budget_spent: alert.budget_spent.toLocaleString('es-ES'),
          budget_percentage: alert.budget_percentage,
          budget_remaining: alert.budget_remaining.toLocaleString('es-ES')
        };
        
        try {
          // Ejecutar la automatización
          const result = await executeAutomationAction(
            JSON.parse(automation.actions)[0], 
            payload
          );
          
          if (result.success) {
            
            // Registrar la ejecución
            await supabase
              .from('automation_executions')
              .insert({
                automation_id: automation.id,
                user_id: alert.user_id,
                client_id: alert.client_id,
                execution_id: payload.executionId,
                status: 'success',
                metadata: {
                  project_id: alert.project_id,
                  project_name: alert.project_name,
                  budget_percentage: alert.budget_percentage,
                  budget_spent: alert.budget_spent,
                  trigger_type: 'budget_exceeded'
                },
                executed_at: new Date().toISOString()
              });
            
            // Actualizar contador de ejecuciones
            await supabase
              .from('automations')
              .update({ 
                execution_count: (automation.execution_count || 0) + 1,
                last_executed: new Date().toISOString()
              })
              .eq('id', automation.id);
              
          } else {
            console.error(`❌ Error enviando alerta para ${alert.project_name}:`, result.message);
          }
          
        } catch (execError) {
          console.error(`❌ Error ejecutando automatización para ${alert.project_name}:`, execError);
        }
      }
      
    } else {
    }
    
  } catch (error) {
    console.error('❌ Error en monitoreo de presupuestos:', error);
  }
}

// Función para ser llamada manualmente o por cron job
export async function runBudgetMonitoring(): Promise<{ success: boolean; message: string; alertsSent: number }> {
  try {
    await checkBudgetExceeded();
    return {
      success: true,
      message: 'Monitoreo de presupuestos completado',
      alertsSent: 0 // Se podría mejorar para devolver el número real
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido',
      alertsSent: 0
    };
  }
}
