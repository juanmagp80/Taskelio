/**
 * CONFIGURACIÓN DEL PERÍODO DE PRUEBA
 * 
 * Este archivo controla el período de prueba gratuito de 14 días.
 * Para activar o desactivar, simplemente cambia el valor de TRIAL_ENABLED.
 */

export const TRIAL_CONFIG = {
    /**
     * ⚠️ ACTIVAR/DESACTIVAR PERÍODO DE PRUEBA ⚠️
     * 
     * true  = Todos los usuarios nuevos tienen 14 días de prueba
     * false = No hay período de prueba, los usuarios deben suscribirse inmediatamente
     */
    TRIAL_ENABLED: true,

    /**
     * Duración del período de prueba en días
     */
    TRIAL_DURATION_DAYS: 14,

    /**
     * Características incluidas en el período de prueba
     */
    TRIAL_FEATURES: {
        maxClients: 999,       // Clientes ilimitados durante trial
        maxProjects: 999,      // Proyectos ilimitados durante trial
        maxStorageGB: 10,      // 10 GB de almacenamiento
        maxEmailsPerMonth: 100 // 100 emails por mes
    },

    /**
     * Mensaje que se muestra cuando el trial expira
     */
    TRIAL_EXPIRED_MESSAGE: 'Tu período de prueba de 14 días ha finalizado. Suscríbete al Plan Pro para continuar usando todas las funciones.',

    /**
     * Mostrar banner de trial en el dashboard
     */
    SHOW_TRIAL_BANNER: true
};

/**
 * Función helper para verificar si el trial está habilitado
 */
export const isTrialEnabled = () => TRIAL_CONFIG.TRIAL_ENABLED;

/**
 * Función helper para obtener la duración del trial en milisegundos
 */
export const getTrialDuration = () => TRIAL_CONFIG.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Función helper para calcular la fecha de finalización del trial
 */
export const calculateTrialEndDate = (startDate: Date = new Date()): Date => {
    if (!TRIAL_CONFIG.TRIAL_ENABLED) {
        return startDate; // Si el trial está desactivado, retorna la fecha actual
    }
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + TRIAL_CONFIG.TRIAL_DURATION_DAYS);
    return endDate;
};
