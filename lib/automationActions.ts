// lib/automationActions.ts

import { createSupabaseClient } from '@/src/lib/supabase-client';

// Simulación de envío de email (reemplaza por tu integración real)
async function sendEmail(to: string, subject: string, body: string, priority: 'low' | 'medium' | 'high' = 'medium') {
}

// Simulación de crear tarea (reemplaza por tu integración real)
async function createTask(title: string, description: string, assignee?: string, dueDate?: string) {
}

// Nueva función para crear notificaciones internas en Supabase
async function sendNotification(
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
    console.error('❌ Error en sendNotification:', error);
  }
}

// === AUTOMACIONES DE CLIENTES ===
export async function handleClientOnboarding(payload: any, user_id: string) {
  const { clientEmail, clientName } = payload;
  
  // Enviar email de bienvenida
  await sendEmail(
    clientEmail,
    `¡Bienvenido/a ${clientName} a {{user_company}}! 🎉`,
    `Hola ${clientName},\n\n¡Bienvenido/a a {{user_company}}! Es un placer tenerte como cliente.\n\nNuestro equipo te acompañará en cada paso para que tu experiencia sea excelente.\n\nPróximos pasos:\n- Revisa el documento de alcance del proyecto\n- Agenda una reunión de inicio con nosotros\n- Accede a las herramientas de colaboración que te hemos habilitado\n\nSi tienes cualquier duda, puedes contactarnos directamente al teléfono {{user_phone}}.\n\nGracias por confiar en {{user_company}}.\n\nUn saludo cordial,\nEl equipo de {{user_company}}`,
    'high'
  );
  
  // Crear tareas internas
  await createTask(
    `Onboarding - ${clientName}`,
    `Completar proceso de onboarding para ${clientName}: configurar proyecto, enviar accesos, programar kickoff`,
    user_id,
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 días
  );
  
  // Notificar al usuario
  await sendNotification(user_id, 'Nuevo cliente onboarding', `${clientName} ha comenzado el proceso de onboarding`);
}

export async function handleClientCommunicationCheck(payload: any, user_id: string) {
  const { clientEmail, clientName } = payload;
  
  await sendNotification(user_id, 'Comunicación pendiente', `Hace más de 7 días que no contactas con ${clientName}`);
  
  await sendEmail(
    clientEmail,
    `¡Hola ${clientName}! ¿Cómo va todo?`,
    `Hola ${clientName},\n\nEspero que todo esté marchando bien. Solo quería hacer un check-in rápido para ver cómo vas y si necesitas ayuda con algo.\n\n¿Te parece bien si programamos una llamada rápida esta semana?\n\n¡Saludos!`,
    'medium'
  );
}

export async function handleClientInactive(payload: any, user_id: string) {
  const { clientEmail, clientName, clientId } = payload;
  
  await sendNotification(
    user_id, 
    'Cliente inactivo', 
    `${clientName} no ha tenido actividad en 30 días. Considera hacer seguimiento.`,
    'warning',
    '/dashboard/clients',
    { clientId, clientName, clientEmail, reason: 'inactive_30_days' }
  );
  
  await createTask(
    `Reactivar cliente - ${clientName}`,
    `Cliente inactivo por 30+ días. Contactar para ver si necesita algún servicio o tiene feedback.`,
    user_id,
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  );
}

// === AUTOMACIONES DE PROYECTOS ===
export async function handleProjectStart(payload: any, user_id: string) {
  const { projectName, clientEmail, clientName } = payload;
  
  await sendEmail(
    clientEmail,
    `🚀 ¡Empezamos con ${projectName}!`,
    `Hola ${clientName},\n\n¡Oficialmente comenzamos con ${projectName}! 🎉\n\nTe he enviado:\n- Cronograma detallado\n- Acceso al portal del proyecto\n- Contactos del equipo\n\n¡Estamos emocionados de trabajar en este proyecto contigo!`,
    'high'
  );
  
  await createTask(
    `Setup inicial - ${projectName}`,
    `Configurar estructura del proyecto: carpetas, repositorios, herramientas de colaboración`,
    user_id,
    new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
  );
}

export async function handleProjectMilestone(payload: any, user_id: string) {
  const { projectName, milestoneName, clientEmail, clientName } = payload;
  
  await sendEmail(
    clientEmail,
    `✅ Hito completado: ${milestoneName}`,
    `¡Excelentes noticias ${clientName}!\n\nHemos completado exitosamente: ${milestoneName}\n\nEntregables incluidos:\n- [Lista de entregables]\n- Documentación actualizada\n- Pruebas y validaciones\n\nPróximo paso: [Siguiente fase del proyecto]\n\n¡Sigue así!`,
    'high'
  );
  
  await createTask(
    `Facturar hito - ${milestoneName}`,
    `Generar factura por la completación del hito ${milestoneName} del proyecto ${projectName}`,
    user_id,
    new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
  );
}

export async function handleProjectDelivery(payload: any, user_id: string) {
  const { projectName, clientEmail, clientName } = payload;
  
  await sendEmail(
    clientEmail,
    `🎊 ¡${projectName} completado!`,
    `¡Felicidades ${clientName}!\n\nOficialmente hemos completado ${projectName}. Ha sido un placer trabajar contigo en este proyecto.\n\nEntrega final incluye:\n- Todos los archivos fuente\n- Documentación completa\n- Manual de usuario\n- 30 días de soporte post-entrega\n\n¡Esperamos trabajar contigo de nuevo pronto!`,
    'high'
  );
  
  await createTask(
    `Post-delivery follow-up - ${projectName}`,
    `Seguimiento post-entrega: enviar encuesta de satisfacción, archiver proyecto, actualizar portfolio`,
    user_id,
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  );
}

export async function handleProjectOverdue(payload: any, user_id: string) {
  const { projectName, clientEmail, clientName, projectId, daysOverdue } = payload;
  
  await sendNotification(
    user_id, 
    '⚠️ Proyecto con retraso', 
    `${projectName} ha excedido su fecha límite planificada por ${daysOverdue || ''} días`,
    'error',
    '/dashboard/projects',
    { projectId, projectName, clientName, daysOverdue, reason: 'project_overdue' }
  );
  
  await sendEmail(
    clientEmail,
    `Actualización sobre ${projectName}`,
    `Hola ${clientName},\n\nQuería darte una actualización sobre ${projectName}. Hemos tenido algunos retrasos, pero estamos trabajando para ponernos al día.\n\nNueva estimación de entrega: [Nueva fecha]\nRazón del retraso: [Explicación]\nPasos que estamos tomando: [Acciones]\n\nTe mantendré informado del progreso.`,
    'high'
  );
}

export async function handleBudgetExceeded(payload: any, user_id: string) {
  const { projectName, budgetUsed, totalBudget } = payload;
  
  await sendNotification(user_id, '💰 Presupuesto excedido', `${projectName} ha usado ${budgetUsed}% del presupuesto (${totalBudget})`);
  
  await createTask(
    `Revisar presupuesto - ${projectName}`,
    `El proyecto ha excedido el 80% del presupuesto. Revisar costos, ajustar scope o renegociar con cliente.`,
    user_id,
    new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
  );
}

// === AUTOMACIONES DE FACTURACIÓN ===
export async function handleInvoiceOverdue(payload: any, user_id: string) {
  const { invoiceNumber, clientEmail, clientName, daysOverdue, invoiceId, amount } = payload;
  
  await sendEmail(
    clientEmail,
    `Recordatorio: Factura ${invoiceNumber} vencida`,
    `Hola ${clientName},\n\nEspero que estés bien. Te escribo para recordarte que la factura ${invoiceNumber} lleva ${daysOverdue} días vencida.\n\nMonto: ${amount || '[Cantidad]'}\nFecha de vencimiento: [Fecha]\n\nPor favor, si hay algún problema o necesitas una extensión, no dudes en contactarme.\n\n¡Gracias!`,
    'high'
  );
  
  await sendNotification(
    user_id, 
    'Factura vencida', 
    `Factura ${invoiceNumber} - ${clientName} lleva ${daysOverdue} días vencida`,
    'error',
    '/dashboard/invoices',
    { invoiceId, invoiceNumber, clientName, daysOverdue, amount, reason: 'invoice_overdue' }
  );
}

export async function handleInvoiceReminder(payload: any, user_id: string) {
  const { invoiceNumber, clientEmail, clientName, dueDate } = payload;
  
  await sendEmail(
    clientEmail,
    `Recordatorio amigable: Factura ${invoiceNumber}`,
    `Hola ${clientName},\n\nSolo un recordatorio amigable de que la factura ${invoiceNumber} vence el ${dueDate} (en 3 días).\n\nSi ya la has procesado, por favor ignora este mensaje.\n\n¡Gracias por tu puntualidad!`,
    'medium'
  );
}

export async function handleAutoInvoiceGeneration(payload: any, user_id: string) {
  const { projectName, milestoneName, clientEmail, amount } = payload;
  
  await sendNotification(user_id, 'Factura generada automáticamente', `Factura creada por completar ${milestoneName} en ${projectName}`);
  
  await createTask(
    `Revisar y enviar factura - ${milestoneName}`,
    `Revisar factura auto-generada por ${amount} y enviar al cliente`,
    user_id,
    new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
  );
}

// === AUTOMACIONES DE TIEMPO Y TAREAS ===
export async function handleTimeTrackingReminder(payload: any, user_id: string) {
  await sendNotification(user_id, '⏰ Recordatorio de tiempo', 'No has registrado horas en los últimos 2 días. ¡No olvides hacerlo!');
}

export async function handleTaskAssigned(payload: any, user_id: string) {
  const { taskTitle, assigneeEmail, assigneeName, dueDate } = payload;
  
  await sendEmail(
    assigneeEmail,
    `📋 Nueva tarea asignada: ${taskTitle}`,
    `Hola ${assigneeName},\n\nTe han asignado una nueva tarea:\n\n**${taskTitle}**\n\nFecha límite: ${dueDate}\n\n[Ver detalles en la plataforma]`,
    'medium'
  );
  
  await sendNotification(user_id, 'Tarea asignada', `${taskTitle} asignada a ${assigneeName}`);
}

export async function handleTaskOverdue(payload: any, user_id: string) {
  const { taskTitle, assigneeEmail, assigneeName, daysOverdue } = payload;
  
  await sendEmail(
    assigneeEmail,
    `⚠️ Tarea vencida: ${taskTitle}`,
    `Hola ${assigneeName},\n\nLa tarea "${taskTitle}" lleva ${daysOverdue} días vencida.\n\nPor favor, actualiza el estado o contacta si necesitas ayuda.\n\n¡Gracias!`,
    'high'
  );
  
  await sendNotification(user_id, 'Tarea vencida', `${taskTitle} lleva ${daysOverdue} días vencida (${assigneeName})`);
}

// === AUTOMACIONES DE CALENDARIO ===
export async function handleMeetingReminder(payload: any, user_id: string) {
  const { meetingTitle, attendeeEmails, meetingDate, meetingLink } = payload;
  
  const attendees = Array.isArray(attendeeEmails) ? attendeeEmails : [attendeeEmails];
  
  for (const email of attendees) {
    await sendEmail(
      email,
      `🗓️ Recordatorio: ${meetingTitle} en 1 hora`,
      `Recordatorio de reunión:\n\n**${meetingTitle}**\nFecha: ${meetingDate}\nEnlace: ${meetingLink || 'Por confirmar'}\n\n¡Te esperamos!`,
      'high'
    );
  }
}

export async function handleMeetingFollowup(payload: any, user_id: string) {
  const { meetingTitle, attendeeEmails, actionItems } = payload;
  
  const attendees = Array.isArray(attendeeEmails) ? attendeeEmails : [attendeeEmails];
  
  for (const email of attendees) {
    await sendEmail(
      email,
      `📝 Resumen: ${meetingTitle}`,
      `Gracias por participar en ${meetingTitle}.\n\nPróximos pasos acordados:\n${actionItems || '- Por definir'}\n\n¡Nos vemos en la próxima!`,
      'medium'
    );
  }
  
  await createTask(
    `Seguimiento - ${meetingTitle}`,
    `Hacer seguimiento de los action items acordados en la reunión`,
    user_id,
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  );
}

// === AUTOMACIONES DE FEEDBACK ===
export async function handleFeedbackRequest(payload: any, user_id: string) {
  const { clientEmail, clientName, projectName } = payload;
  
  await sendEmail(
    clientEmail,
    `🌟 Tu opinión nos importa - ${projectName}`,
    `Hola ${clientName},\n\n¡Hemos completado ${projectName}! Me encantaría conocer tu experiencia.\n\n¿Podrías dedicar 2 minutos a compartir tu feedback?\n\n[Enlace a encuesta]\n\nTu opinión nos ayuda a mejorar continuamente.\n\n¡Gracias!`,
    'medium'
  );
  
  await createTask(
    `Seguir feedback - ${clientName}`,
    `Hacer seguimiento del feedback solicitado para ${projectName}`,
    user_id,
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  );
}

export async function handleSatisfactionSurvey(payload: any, user_id: string) {
  const { clientEmail, clientName, projectName } = payload;
  
  await sendEmail(
    clientEmail,
    `📊 Encuesta rápida sobre ${projectName}`,
    `Hola ${clientName},\n\nHa pasado una semana desde que completamos ${projectName}. ¿Cómo ha sido tu experiencia hasta ahora?\n\n[Encuesta de satisfacción - 3 minutos]\n\nTus respuestas son confidenciales y nos ayudan muchísimo.\n\n¡Gracias por tu tiempo!`,
    'low'
  );
}

// === AUTOMACIONES DE VENTAS ===
export async function handleProposalFollowup(payload: any, user_id: string) {
  const { clientEmail, clientName, proposalName } = payload;
  
  await sendEmail(
    clientEmail,
    `Seguimiento: Propuesta ${proposalName}`,
    `Hola ${clientName},\n\nEspero que hayas tenido tiempo de revisar la propuesta para ${proposalName}.\n\n¿Hay alguna pregunta que pueda responder? ¿Te gustaría programar una llamada para discutir los detalles?\n\nEstoy aquí para ayudarte.\n\n¡Saludos!`,
    'medium'
  );
  
  await sendNotification(user_id, 'Seguimiento de propuesta', `${proposalName} - ${clientName} sin respuesta por 5 días`);
}

export async function handleLeadNurturing(payload: any, user_id: string) {
  const { leadEmail, leadName } = payload;
  
  await sendEmail(
    leadEmail,
    `¡Hola de nuevo ${leadName}! 👋`,
    `Hola ${leadName},\n\nVi que visitaste nuestra página hace un tiempo. ¿Sigues interesado/a en nuestros servicios?\n\nTe comparto algunos casos de éxito recientes que podrían interesarte:\n\n[Casos de estudio]\n\n¿Te gustaría una consulta gratuita de 15 minutos?\n\n¡Saludos!`,
    'low'
  );
  
  await createTask(
    `Nurturing lead - ${leadName}`,
    `Hacer seguimiento personalizado del lead ${leadName} que no ha respondido`,
    user_id,
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
  );
}

// Manejador central actualizado
export async function executeAutomationAction(trigger_type: string, payload: any, user_id: string) {
  
  try {
    switch (trigger_type) {
      // Clientes
      case 'client_onboarding':
        await handleClientOnboarding(payload, user_id);
        break;
      case 'client_communication_check':
        await handleClientCommunicationCheck(payload, user_id);
        break;
      case 'client_inactive':
        await handleClientInactive(payload, user_id);
        break;
      
      // Proyectos
      case 'project_start':
        await handleProjectStart(payload, user_id);
        break;
      case 'project_milestone':
        await handleProjectMilestone(payload, user_id);
        break;
      case 'project_delivery':
        await handleProjectDelivery(payload, user_id);
        break;
      case 'project_overdue':
        await handleProjectOverdue(payload, user_id);
        break;
      case 'budget_exceeded':
        await handleBudgetExceeded(payload, user_id);
        break;
      
      // Facturación
      case 'invoice_overdue':
        await handleInvoiceOverdue(payload, user_id);
        break;
      case 'invoice_reminder':
        await handleInvoiceReminder(payload, user_id);
        break;
      case 'auto_invoice_generation':
        await handleAutoInvoiceGeneration(payload, user_id);
        break;
      
      // Tiempo y tareas
      case 'time_tracking_reminder':
        await handleTimeTrackingReminder(payload, user_id);
        break;
      case 'task_assigned':
        await handleTaskAssigned(payload, user_id);
        break;
      case 'task_overdue':
        await handleTaskOverdue(payload, user_id);
        break;
      
      // Calendario
      case 'meeting_reminder':
        await handleMeetingReminder(payload, user_id);
        break;
      case 'meeting_followup':
        await handleMeetingFollowup(payload, user_id);
        break;
      
      // Feedback
      case 'feedback_request':
        await handleFeedbackRequest(payload, user_id);
        break;
      case 'satisfaction_survey':
        await handleSatisfactionSurvey(payload, user_id);
        break;
      
      // Ventas
      case 'proposal_followup':
        await handleProposalFollowup(payload, user_id);
        break;
      case 'lead_nurturing':
        await handleLeadNurturing(payload, user_id);
        break;
      
      default:
        break;
    }
    
    
  } catch (error) {
    console.error('❌ Error ejecutando automatización:', error);
  }
}
