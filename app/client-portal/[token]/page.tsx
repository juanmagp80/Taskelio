'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { showToast } from '@/utils/toast';
import { Input } from '@/components/ui/Input';
import { 
    MessageCircle, 
    Send, 
    Paperclip, 
    Clock, 
    CheckCircle,
    AlertCircle,
    User,
    Building2,
    ArrowLeft,
    RefreshCw
} from 'lucide-react';

interface ClientInfo {
    id: string;
    name: string;
    company?: string;
    is_valid: boolean;
}

interface Message {
    id: string;
    message: string;
    sender_type: 'client' | 'freelancer';
    attachments: string[];
    created_at: string;
    is_read: boolean;
}

export default function ClientPortalPage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    // Estados principales
    const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Estados para nuevo mensaje
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);

    useEffect(() => {
        if (token) {
            validateTokenAndLoadData();
        }
    }, [token]);

    // Efecto para polling automático de mensajes
    useEffect(() => {
        if (!clientInfo) return; // Solo después de validar el token

        const interval = setInterval(() => {
            loadMessages(false); // No mostrar indicador durante polling automático
        }, 10000); // Recargar cada 10 segundos

        return () => clearInterval(interval);
    }, [clientInfo]);

    // Nota: Para suscripción en tiempo real necesitaríamos una conexión WebSocket o Server-Sent Events
    // por ahora usamos polling automático que es más sencillo

    const validateTokenAndLoadData = async () => {
        try {
            setLoading(true);
            setError(null);


            // Validar token y obtener información del cliente
            const response = await fetch('/api/client-portal/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Response error:', errorText);
                
                // Intentar parsear como JSON
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.details || errorData.error || 'Error de servidor');
                } catch (parseError) {
                    // Si no es JSON válido, es probablemente HTML (página de error)
                    if (errorText.includes('<!DOCTYPE')) {
                        throw new Error('El servidor devolvió una página HTML en lugar de datos JSON. Esto suele indicar un problema de configuración o que la ruta API no existe.');
                    }
                    throw new Error(errorText || 'Error de conexión');
                }
            }

            const data = await response.json();

            if (!data.client.is_valid) {
                throw new Error('Este enlace ha expirado o no es válido');
            }

            setClientInfo(data.client);

            // Cargar mensajes
            await loadMessages(false); // Primera carga, no mostrar indicador extra
        } catch (error: any) {
            console.error('❌ Error validating token:', error);
            setError(error.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (showRefreshIndicator = true) => {
        try {
            if (showRefreshIndicator && !loading) {
                setRefreshing(true);
            }

            const response = await fetch('/api/client-portal/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            const data = await response.json();

            if (response.ok) {
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            if (showRefreshIndicator) {
                setRefreshing(false);
            }
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            setSending(true);

            const response = await fetch('/api/client-portal/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    token, 
                    message: newMessage,
                    attachments: [] // TODO: Implementar subida de archivos
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error enviando mensaje');
            }

            // Limpiar formulario
            setNewMessage('');
            setAttachments([]);

            // Recargar mensajes
            await loadMessages(false); // Después de enviar, recarga sin indicador extra

            // Scroll al final
            setTimeout(() => {
                const messagesContainer = document.getElementById('messages-container');
                if (messagesContainer) {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
            }, 100);

        } catch (error: any) {
            console.error('Error sending message:', error);
            showToast.error('Error enviando mensaje: ' + error.message);
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatMessageTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffHours < 24) {
            return date.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } else {
            return date.toLocaleDateString('es-ES', { 
                day: '2-digit', 
                month: '2-digit',
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Validando acceso...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg">
                    <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso Denegado</h2>
                        <p className="text-slate-600 mb-4">{error}</p>
                        
                        {/* Información adicional para debugging */}
                        <div className="bg-slate-50 rounded-lg p-4 mb-4 text-left">
                            <h3 className="font-medium text-slate-800 mb-2">Información de debugging:</h3>
                            <ul className="text-sm text-slate-600 space-y-1">
                                <li>• Token: {token?.substring(0, 8)}...</li>
                                <li>• URL actual: {window.location.href}</li>
                                <li>• Si el problema persiste, contacta al freelancer que te envió este enlace</li>
                            </ul>
                        </div>
                        
                        <div className="flex gap-3">
                            <Button
                                onClick={() => window.location.reload()}
                                variant="outline"
                                className="flex-1"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reintentar
                            </Button>
                            <Button
                                onClick={() => router.push('/')}
                                variant="outline"
                                className="flex-1"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Volver al Inicio
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100">
            {/* Header */}
            <div className="bg-white/95 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center">
                            <MessageCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-slate-900">
                                Portal de Comunicación
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                                <div className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    {clientInfo?.name}
                                </div>
                                {clientInfo?.company && (
                                    <div className="flex items-center gap-1">
                                        <Building2 className="w-4 h-4" />
                                        {clientInfo.company}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => loadMessages(true)}
                                variant="outline"
                                size="sm"
                                disabled={loading || refreshing}
                                className="text-slate-600 border-slate-300 hover:bg-slate-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            </Button>
                            <div className="text-right">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                <p className="text-xs text-slate-500 mt-1">Conectado</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Container */}
            <div className="max-w-4xl mx-auto p-4">
                <Card className="h-[calc(100vh-200px)] flex flex-col">
                    {/* Messages Area */}
                    <CardContent className="flex-1 p-0 overflow-hidden">
                        <div 
                            id="messages-container"
                            className="h-full overflow-y-auto p-4 space-y-4"
                        >
                            {messages.length === 0 ? (
                                <div className="text-center py-8">
                                    <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">
                                        ¡Hola {clientInfo?.name}! 👋
                                    </p>
                                    <p className="text-slate-400 text-sm mt-2">
                                        Puedes escribirme cualquier pregunta o comentario.
                                        <br />
                                        Te responderé lo antes posible.
                                    </p>
                                </div>
                            ) : (
                                messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex ${
                                            message.sender_type === 'client' ? 'justify-end' : 'justify-start'
                                        }`}
                                    >
                                        <div
                                            className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                                                message.sender_type === 'client'
                                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white'
                                                    : 'bg-white border border-slate-200 text-slate-900'
                                            }`}
                                        >
                                            <p className="text-sm whitespace-pre-wrap">
                                                {message.message}
                                            </p>
                                            
                                            {message.attachments && message.attachments.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    {message.attachments.map((attachment, index) => (
                                                        <div key={index} className="flex items-center gap-2 text-xs">
                                                            <Paperclip className="w-3 h-3" />
                                                            <span className="underline cursor-pointer">
                                                                {attachment}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            <div className={`flex items-center gap-1 mt-2 text-xs ${
                                                message.sender_type === 'client' 
                                                    ? 'text-white/70' 
                                                    : 'text-slate-500'
                                            }`}>
                                                <Clock className="w-3 h-3" />
                                                {formatMessageTime(message.created_at)}
                                                {message.sender_type === 'client' && (
                                                    <CheckCircle className="w-3 h-3 ml-1" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>

                    {/* Message Input */}
                    <div className="border-t border-slate-200 p-4">
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <div className="relative">
                                    <Input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Escribe tu mensaje..."
                                        className="pr-12 resize-none"
                                        disabled={sending}
                                    />
                                    {attachments.length > 0 && (
                                        <div className="absolute -top-8 left-0 bg-slate-100 text-xs px-2 py-1 rounded">
                                            {attachments.length} archivo(s)
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <Button
                                onClick={sendMessage}
                                disabled={!newMessage.trim() || sending}
                                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4"
                            >
                                {sending ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                        
                        <p className="text-xs text-slate-500 mt-2 text-center">
                            Tu mensaje se enviará directamente. Responderé lo antes posible. 🚀
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
