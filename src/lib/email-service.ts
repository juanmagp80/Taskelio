// Servicio de envío de emails usando API route
interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    from?: string;
    userId?: string;
}

interface EmailResult {
    success: boolean;
    message: string;
    data?: any;
    error?: string;
}

class EmailService {
    async sendEmail(options: EmailOptions): Promise<EmailResult> {
        try {
            to: options.to,
                subject: options.subject,
                    from: options.from,
                        userId: options.userId,
                            htmlLength: options.html.length
        });

        // Configurar el remitente y replyTo correctamente
        const defaultFrom = `Taskelio <noreply@${process.env.NEXT_PUBLIC_RESEND_DOMAIN || 'taskelio.app'}>`;
        let fromEmail = options.from || defaultFrom;

        // Extraer el email personal para replyTo
        let replyToEmail = undefined;
        if (options.from) {
            // Si tiene formato "Nombre <email@domain.com>", extraer el email
            const emailMatch = options.from.match(/<(.+)>/);
            if (emailMatch) {
                replyToEmail = emailMatch[1];
            } else {
                // Si es solo el email
                replyToEmail = options.from;
            }

            // Si el email personal es gmail, usarlo solo como replyTo
            if (replyToEmail.includes('@gmail.com')) {
                replyToEmail = replyToEmail; // Mantener para replyTo
                // Usar el from por defecto del dominio verificado
                // pero extraer el nombre si existe
                const nameMatch = options.from.match(/^([^<]+)</);
                const userName = nameMatch ? nameMatch[1].trim() : 'Taskelio';
                fromEmail = `${userName} <noreply@taskelio.app>`;
            }
        }

        // En el navegador, usar URL relativa; en servidor, construir URL absoluta
        const baseUrl = typeof window !== 'undefined'
            ? '' // Navegador: URL relativa
            : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'); // Servidor: URL absoluta

        const response = await fetch(`${baseUrl}/api/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: options.to,
                subject: options.subject,
                html: options.html,
                from: fromEmail,
                reply_to: replyToEmail,
                userId: options.userId
            }),
        });

        status: response.status,
            statusText: response.statusText,
                ok: response.ok
    });

    const result = await response.json();

    if(!response.ok) {
        console.error('❌ EmailService: Error en API send-email:', result);
        return {
            success: false,
            message: result.message || 'Error al enviar email',
            error: result.error
        };
    }

            return result;

        } catch (error) {
    console.error('Error crítico en EmailService:', error);
    return {
        success: false,
        message: 'Error crítico al enviar email',
        error: error instanceof Error ? error.message : String(error)
    };
}
    }

convertTextToHtml(text: string): string {
    return text
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^(.*)$/, '<p>$1</p>')
        .replace(/<p><\/p>/g, '');
}

// Método para verificar si está configurado (siempre true para client-side)
isConfigured(): boolean {
    return true;
}

// Método para obtener el estado del servicio
getStatus(): { configured: boolean; provider: string } {
    return {
        configured: true,
        provider: 'api-route'
    };
}
}

// Exportar una instancia singleton
const emailService = new EmailService();
export default emailService;

