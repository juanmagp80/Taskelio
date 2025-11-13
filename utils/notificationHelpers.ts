// utils/notificationHelpers.ts

import { createSupabaseClient } from '@/src/lib/supabase-client';

/**
 * Crear una notificación interna para un usuario
 */
export async function createInternalNotification(
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'warning' | 'error' | 'success' = 'info',
  route?: string,
  actionData?: Record<string, any>
) {
  try {
    const supabase = createSupabaseClient();
    if (!supabase) {
      console.error('❌ No se pudo crear cliente de Supabase');
      return;
    }

    const { data, error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        route,
        action_data: actionData,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creando notificación:', error);
      return;
    }

    return data;
  } catch (error) {
    console.error('❌ Error en createInternalNotification:', error);
  }
}

/**
 * Notificar sobre nuevo mensaje de cliente
 */
export async function notifyNewClientMessage(
  freelancerId: string,
  clientName: string,
  messagePreview: string,
  clientId: string,
  messageId: string
) {
  await createInternalNotification(
    freelancerId,
    '💬 Nuevo mensaje de cliente',
    `${clientName}: ${messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview}`,
    'info',
    '/dashboard/client-communications',
    {
      clientId,
      messageId,
      clientName,
      type: 'new_client_message'
    }
  );
}

/**
 * Notificar sobre proyecto con retraso
 */
export async function notifyProjectDelay(
  userId: string,
  projectName: string,
  clientName: string,
  daysLate: number,
  projectId: string
) {
  await createInternalNotification(
    userId,
    '⚠️ Proyecto con retraso',
    `${projectName} (${clientName}) lleva ${daysLate} días de retraso`,
    'warning',
    '/dashboard/projects',
    {
      projectId,
      projectName,
      clientName,
      daysLate,
      type: 'project_delay'
    }
  );
}

/**
 * Notificar sobre factura vencida
 */
export async function notifyOverdueInvoice(
  userId: string,
  invoiceNumber: string,
  clientName: string,
  daysOverdue: number,
  amount: number,
  invoiceId: string
) {
  await createInternalNotification(
    userId,
    '💸 Factura vencida',
    `Factura ${invoiceNumber} (${clientName}) - ${daysOverdue} días vencida - €${amount}`,
    'error',
    '/dashboard/invoices',
    {
      invoiceId,
      invoiceNumber,
      clientName,
      daysOverdue,
      amount,
      type: 'overdue_invoice'
    }
  );
}

/**
 * Notificar sobre cliente inactivo
 */
export async function notifyInactiveClient(
  userId: string,
  clientName: string,
  daysSinceLastActivity: number,
  clientId: string
) {
  await createInternalNotification(
    userId,
    '😴 Cliente inactivo',
    `${clientName} no ha tenido actividad en ${daysSinceLastActivity} días`,
    'warning',
    '/dashboard/clients',
    {
      clientId,
      clientName,
      daysSinceLastActivity,
      type: 'inactive_client'
    }
  );
}

/**
 * Notificar sobre nuevo proyecto creado
 */
export async function notifyNewProject(
  userId: string,
  projectName: string,
  clientName: string,
  projectId: string
) {
  await createInternalNotification(
    userId,
    '🚀 Nuevo proyecto',
    `Se ha creado el proyecto "${projectName}" para ${clientName}`,
    'success',
    '/dashboard/projects',
    {
      projectId,
      projectName,
      clientName,
      type: 'new_project'
    }
  );
}

/**
 * Notificar sobre tarea completada
 */
export async function notifyTaskCompleted(
  userId: string,
  taskTitle: string,
  projectName: string,
  taskId: string
) {
  await createInternalNotification(
    userId,
    '✅ Tarea completada',
    `"${taskTitle}" en ${projectName} ha sido completada`,
    'success',
    '/dashboard/tasks',
    {
      taskId,
      taskTitle,
      projectName,
      type: 'task_completed'
    }
  );
}

/**
 * Notificar sobre tarea vencida
 */
export async function notifyOverdueTask(
  userId: string,
  taskTitle: string,
  projectName: string,
  daysOverdue: number,
  taskId: string
) {
  await createInternalNotification(
    userId,
    '⏰ Tarea vencida',
    `"${taskTitle}" en ${projectName} lleva ${daysOverdue} días vencida`,
    'error',
    '/dashboard/tasks',
    {
      taskId,
      taskTitle,
      projectName,
      daysOverdue,
      type: 'overdue_task'
    }
  );
}

/**
 * Notificar sobre meta de ingresos alcanzada
 */
export async function notifyRevenueGoalReached(
  userId: string,
  monthlyGoal: number,
  currentRevenue: number,
  month: string
) {
  await createInternalNotification(
    userId,
    '🎯 Meta de ingresos alcanzada',
    `¡Has alcanzado €${currentRevenue} de tu meta mensual de €${monthlyGoal} en ${month}!`,
    'success',
    '/dashboard/reports',
    {
      monthlyGoal,
      currentRevenue,
      month,
      type: 'revenue_goal_reached'
    }
  );
}

/**
 * Notificar sobre backup de datos completado
 */
export async function notifyBackupCompleted(
  userId: string,
  backupDate: string,
  recordsBackedUp: number
) {
  await createInternalNotification(
    userId,
    '💾 Backup completado',
    `Backup automático completado: ${recordsBackedUp} registros respaldados`,
    'info',
    '/dashboard/settings',
    {
      backupDate,
      recordsBackedUp,
      type: 'backup_completed'
    }
  );
}
