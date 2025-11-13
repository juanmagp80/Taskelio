// lib/predefinedAutomations.ts

export interface PredefinedAutomation {
  name: string;
  description: string;
  trigger_type: string;
  is_public: boolean;
  // Puedes agregar más campos si tu tabla los requiere
}

export const predefinedAutomations: PredefinedAutomation[] = [
  // === AUTOMACIONES DE CLIENTES ===
  {
    name: "Onboarding completo de cliente",
    description: "Serie de emails de bienvenida, asignación de tareas iniciales y configuración de proyecto",
    trigger_type: "client_onboarding",
    is_public: true,
  },
  {
    name: "Seguimiento de comunicación",
    description: "Alerta si no hay contacto con un cliente en los últimos 7 días",
    trigger_type: "client_communication_check",
    is_public: true,
  },
  {
    name: "Cliente inactivo",
    description: "Notifica si un cliente no ha tenido actividad en 30 días",
    trigger_type: "client_inactive",
    is_public: true,
  },

  // === AUTOMACIONES DE PROYECTOS ===
  {
    name: "Inicio de proyecto",
    description: "Configura estructura de carpetas, tareas iniciales y notifica al cliente",
    trigger_type: "project_start",
    is_public: true,
  },
  {
    name: "Hito completado",
    description: "Notifica al cliente, actualiza facturación y programa siguiente fase",
    trigger_type: "project_milestone",
    is_public: true,
  },
  {
    name: "Entrega de proyecto",
    description: "Envía checklist de entrega, solicita feedback y cierra tareas pendientes",
    trigger_type: "project_delivery",
    is_public: true,
  },
  {
    name: "Proyecto con retraso",
    description: "Alerta si un proyecto excede la fecha límite planificada",
    trigger_type: "project_overdue",
    is_public: true,
  },
  {
    name: "Presupuesto excedido",
    description: "Notifica cuando un proyecto supera el 80% del presupuesto",
    trigger_type: "budget_exceeded",
    is_public: true,
  },

  // === AUTOMACIONES DE FACTURACIÓN ===
  {
    name: "Factura vencida",
    description: "Recordatorio automático cuando una factura lleva 7 días vencida",
    trigger_type: "invoice_overdue",
    is_public: true,
  },
  {
    name: "Pre-recordatorio de factura",
    description: "Aviso 3 días antes del vencimiento de una factura",
    trigger_type: "invoice_reminder",
    is_public: true,
  },
  {
    name: "Facturación automática",
    description: "⚠️ FUNCIONALIDAD AVANZADA: Genera y envía factura al completar un hito de proyecto. Requiere configuración adicional en el módulo de facturación.",
    trigger_type: "auto_invoice_generation",
    is_public: false, // Deshabilitada temporalmente hasta implementar generación real de facturas
  },

  // === AUTOMACIONES DE TIEMPO Y TAREAS ===
  {
    name: "Recordatorio de registro de tiempo",
    description: "Alerta si no se registran horas de trabajo en 2 días",
    trigger_type: "time_tracking_reminder",
    is_public: true,
  },
  {
    name: "Tarea asignada",
    description: "Notifica por email y crea recordatorio cuando se asigna una nueva tarea",
    trigger_type: "task_assigned",
    is_public: true,
  },
  {
    name: "Tarea vencida",
    description: "Alerta diaria para tareas que han pasado su fecha límite",
    trigger_type: "task_overdue",
    is_public: true,
  },

  // === AUTOMACIONES DE CALENDAR ===
  {
    name: "Recordatorio de reunión",
    description: "Envía recordatorio 1 hora antes de una reunión agendada",
    trigger_type: "meeting_reminder",
    is_public: true,
  },
  {
    name: "Seguimiento post-reunión",
    description: "Envía resumen y próximos pasos 2 horas después de una reunión",
    trigger_type: "meeting_followup",
    is_public: true,
  },

  // === AUTOMACIONES DE FEEDBACK Y CALIDAD ===
  {
    name: "Solicitud de feedback",
    description: "Pide valoración del cliente al finalizar un proyecto o hito",
    trigger_type: "feedback_request",
    is_public: true,
  },
  {
    name: "Encuesta de satisfacción",
    description: "Envía encuesta automática 1 semana después de entregar un proyecto",
    trigger_type: "satisfaction_survey",
    is_public: true,
  },

  // === AUTOMACIONES DE MARKETING Y VENTAS ===
  {
    name: "Seguimiento de propuesta",
    description: "Recordatorio si una propuesta no ha recibido respuesta en 5 días",
    trigger_type: "proposal_followup",
    is_public: true,
  },
  {
    name: "Cliente potencial inactivo",
    description: "Re-engagement automático para leads que no han respondido",
    trigger_type: "lead_nurturing",
    is_public: true,
  },
];
