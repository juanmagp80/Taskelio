'use client';

import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { createSupabaseClient } from '@/src/lib/supabase';
import {
    Building2,
    CheckCircle,
    Clock,
    Copy,
    Link as LinkIcon,
    MessageCircle,
    Plus,
    RefreshCw,
    Send,
    User,
    Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Client {
    id: string;
    name: string;
    company?: string;
    email?: string;
    phone?: string;
}

interface ClientToken {
    id: string;
    client_id: string;
    token: string;
    is_active: boolean;
    expires_at?: string;
    last_used_at?: string;
    created_at: string;
    clients: Client;
}

interface Message {
    id: string;
    client_id: string;
    message: string;
    sender_type: 'client' | 'freelancer';
    attachments: string[];
    is_read: boolean;
    created_at: string;
    clients: Client;
}

interface ClientCommunicationsProps {
    userEmail: string;
}

export default function ClientCommunications({ userEmail }: ClientCommunicationsProps) {
    const supabase = createSupabaseClient();
    const router = useRouter();

    // Estados principales
    const [clients, setClients] = useState<Client[]>([]);
    const [tokens, setTokens] = useState<ClientToken[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState<string | null>(null);

    // Estados para respuesta
    const [replyMessage, setReplyMessage] = useState('');
    const [sending, setSending] = useState(false);

    // Estados para generar token
    const [showTokenForm, setShowTokenForm] = useState(false);
    const [selectedClientForToken, setSelectedClientForToken] = useState('');
    const [generatingToken, setGeneratingToken] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailMessage, setEmailMessage] = useState('');

    const handleLogout = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        router.push('/login');
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            await Promise.allSettled([
                loadClients(),
                loadTokens(),
                loadMessages()
            ]);
        } catch (error) {
            console.error('Error loading communication data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadClients = async () => {
        if (!supabase) return;

        try {
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return;
            }

            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('user_id', user.id)
                .order('name');

            if (error) {
                console.error('❌ Error loading clients:', error);
                setClients([]);
                return;
            }

            setClients(data || []);
        } catch (error) {
            console.error('Error in loadClients:', error);
            setClients([]);
        }
    };

    const loadTokens = async () => {
        if (!supabase) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('client_tokens')
                .select(`
                    *,
                    clients(id, name, company, email, phone)
                `)
                .eq('clients.user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading tokens:', error);
                setTokens([]);
            } else {
                setTokens(data || []);
            }
        } catch (error) {
            console.error('Error in loadTokens:', error);
            setTokens([]);
        }
    };

    const loadMessages = async () => {
        if (!supabase) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('client_messages')
                .select(`
                    *,
                    clients(id, name, company, email, phone)
                `)
                .eq('clients.user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading messages:', error);
                setMessages([]);
            } else {
                setMessages(data || []);

                const unreadClientMessages = data?.filter((m: Message) =>
                    m.sender_type === 'client' && !m.is_read
                ) || [];

                if (unreadClientMessages.length > 0) {
                    markMessagesAsRead(unreadClientMessages.map((m: Message) => m.id));
                }
            }
        } catch (error) {
            console.error('Error in loadMessages:', error);
            setMessages([]);
        }
    };

    const markMessagesAsRead = async (messageIds: string[]) => {
        if (!supabase || messageIds.length === 0) return;

        try {
            await supabase
                .from('client_messages')
                .update({ is_read: true })
                .in('id', messageIds);
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    const generateToken = async () => {
        if (!selectedClientForToken || !supabase) {
            alert('Por favor selecciona un cliente');
            return;
        }

        try {
            setGeneratingToken(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('No hay usuario autenticado');
                return;
            }

            const { data, error } = await supabase
                .rpc('generate_client_token', { client_uuid: selectedClientForToken });

            if (error) {
                console.error('Error generating token:', error);
                alert('Error generando token: ' + error.message);
            } else {
                alert('Token generado exitosamente: ' + data);
                setShowTokenForm(false);
                setSelectedClientForToken('');
                await loadTokens();
            }
        } catch (error) {
            console.error('Error in generateToken:', error);
            alert('Error generando token');
        } finally {
            setGeneratingToken(false);
        }
    };

    const sendTokenByEmail = async () => {
        if (!selectedClientForToken || !supabase) {
            alert('Por favor selecciona un cliente');
            return;
        }

        try {
            setSendingEmail(true);

            const response = await fetch('/api/client-communications/send-token-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clientId: selectedClientForToken,
                    message: emailMessage || 'Te comparto el acceso a nuestro portal de comunicación seguro.',
                    freelancerName: userEmail?.split('@')[0] || 'Tu Freelancer'
                }),
            });

            const result = await response.json();

            if (response.ok) {
                alert(`✅ Email enviado a ${result.clientEmail}\n\nPortal URL: ${result.portalUrl}`);
                setShowTokenForm(false);
                setSelectedClientForToken('');
                setEmailMessage('');
                await loadTokens();
            } else {
                console.error('Error sending email:', result);
                alert('Error enviando email: ' + result.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error enviando email');
        } finally {
            setSendingEmail(false);
        }
    };

    const copyTokenUrl = (token: string) => {
        const url = `${window.location.origin}/client-portal/${token}`;
        navigator.clipboard.writeText(url);
        alert('URL copiada al portapapeles!');
    };

    const sendReply = async () => {
        if (!replyMessage.trim() || !selectedClient || !supabase) return;

        try {
            setSending(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('client_messages')
                .insert({
                    client_id: selectedClient,
                    message: replyMessage.trim(),
                    sender_type: 'freelancer'
                });

            if (error) {
                console.error('Error sending reply:', error);
                alert('Error enviando respuesta');
            } else {
                setReplyMessage('');
                await loadMessages();
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error enviando respuesta');
        } finally {
            setSending(false);
        }
    };

    const getClientMessages = (clientId: string) => {
        return messages.filter((m: Message) => m.client_id === clientId)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    };

    const getUnreadCount = (clientId: string) => {
        return messages.filter((m: Message) =>
            m.client_id === clientId &&
            m.sender_type === 'client' &&
            !m.is_read
        ).length;
    };

    const formatTime = (timestamp: string) => {
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 text-slate-900">
            <div className="flex">
                <Sidebar userEmail={userEmail} onLogout={handleLogout} />

                <main className="flex-1 ml-56 overflow-auto">
                    <div className="p-4">
                        {/* Header */}
                        <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/60 rounded-xl p-4 shadow-xl shadow-slate-900/5 mb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                                        <MessageCircle className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-black bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                                            Comunicaciones con Clientes
                                        </h1>
                                        <p className="text-slate-600 text-sm">Gestiona mensajes y tokens de acceso</p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => setShowTokenForm(true)}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Generar Token
                                    </Button>

                                    <Button
                                        onClick={loadData}
                                        variant="outline"
                                        disabled={loading}
                                    >
                                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                        Actualizar
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Lista de Clientes y Tokens */}
                            <div className="lg:col-span-1 space-y-4">
                                {/* Tokens Activos */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <LinkIcon className="w-5 h-5 text-blue-600" />
                                            Tokens de Acceso
                                        </CardTitle>
                                        <CardDescription>Enlaces únicos para clientes</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {tokens.length === 0 ? (
                                            <div className="text-center py-4">
                                                <p className="text-slate-500 text-sm">No hay tokens generados</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {tokens.map((token) => (
                                                    <div key={token.id} className="p-3 border rounded-lg">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <User className="w-4 h-4 text-slate-500" />
                                                                <span className="font-medium text-sm">
                                                                    {token.clients.name}
                                                                </span>
                                                            </div>
                                                            <div className={`w-2 h-2 rounded-full ${token.is_active ? 'bg-green-500' : 'bg-red-500'
                                                                }`}></div>
                                                        </div>

                                                        {token.clients.company && (
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Building2 className="w-3 h-3 text-slate-400" />
                                                                <span className="text-xs text-slate-600">
                                                                    {token.clients.company}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="flex gap-2">
                                                            <Button
                                                                onClick={() => copyTokenUrl(token.token)}
                                                                size="sm"
                                                                variant="outline"
                                                                className="flex-1 h-8 text-xs"
                                                            >
                                                                <Copy className="w-3 h-3 mr-1" />
                                                                Copiar URL
                                                            </Button>
                                                            <Button
                                                                onClick={() => setSelectedClient(token.client_id)}
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 text-xs"
                                                            >
                                                                <MessageCircle className="w-3 h-3" />
                                                            </Button>
                                                        </div>

                                                        {token.last_used_at && (
                                                            <p className="text-xs text-slate-500 mt-2">
                                                                Último uso: {formatTime(token.last_used_at)}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Lista de Clientes con Mensajes */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Users className="w-5 h-5 text-indigo-600" />
                                            Conversaciones
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {clients.filter(c => messages.some((m: Message) => m.client_id === c.id)).length === 0 ? (
                                            <div className="text-center py-4">
                                                <p className="text-slate-500 text-sm">No hay conversaciones</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {clients
                                                    .filter(client => messages.some((m: Message) => m.client_id === client.id))
                                                    .map((client) => {
                                                        const unreadCount = getUnreadCount(client.id);
                                                        const lastMessage = messages
                                                            .filter((m: Message) => m.client_id === client.id)
                                                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

                                                        return (
                                                            <div
                                                                key={client.id}
                                                                onClick={() => setSelectedClient(client.id)}
                                                                className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedClient === client.id
                                                                        ? 'bg-blue-50 border-blue-200 border'
                                                                        : 'hover:bg-slate-50 border border-transparent'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="font-medium text-sm">{client.name}</span>
                                                                    {unreadCount > 0 && (
                                                                        <div className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                                                            {unreadCount}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {client.company && (
                                                                    <p className="text-xs text-slate-500 mb-1">{client.company}</p>
                                                                )}

                                                                {lastMessage && (
                                                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                                                        {/* Indicador visual del tipo de mensaje */}
                                                                        <div className={`w-2 h-2 rounded-full ${lastMessage.sender_type === 'client' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                                                                        <span className={`font-medium ${lastMessage.sender_type === 'client' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                                                            {lastMessage.sender_type === 'client' ? 'Cliente' : 'Tú'}:
                                                                        </span>
                                                                        <span className="ml-1 flex-1">
                                                                            {lastMessage.message.length > 30
                                                                                ? lastMessage.message.substring(0, 30) + '...'
                                                                                : lastMessage.message
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Chat Area */}
                            <div className="lg:col-span-2">
                                {selectedClient ? (
                                    <Card className="h-[600px] flex flex-col">
                                        <CardHeader className="border-b">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                                                    <User className="w-4 h-4 text-white" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg">
                                                        {clients.find(c => c.id === selectedClient)?.name}
                                                    </CardTitle>
                                                    <CardDescription>
                                                        {clients.find(c => c.id === selectedClient)?.company}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>

                        <CardContent className="flex-1 p-0 overflow-hidden">
                            <div className="h-full overflow-y-auto p-4 space-y-4">
                                {getClientMessages(selectedClient).map((message) => {
                                    const isFreelancer = message.sender_type === 'freelancer';
                                    const isClient = message.sender_type === 'client';
                                    
                                    return (
                                        <div
                                            key={message.id}
                                            className={`flex w-full ${isFreelancer ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`flex items-start gap-3 max-w-xs lg:max-w-md ${isFreelancer ? 'flex-row-reverse' : 'flex-row'}`}>
                                                {/* Avatar */}
                                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
                                                    isFreelancer 
                                                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600' 
                                                        : 'bg-gradient-to-br from-emerald-500 to-green-600'
                                                }`}>
                                                    <User className="w-4 h-4 text-white" />
                                                </div>

                                                <div className="flex flex-col min-w-0">
                                                    {/* Nombre del remitente */}
                                                    <div className={`text-xs font-medium mb-1 ${
                                                        isFreelancer 
                                                            ? 'text-right text-blue-600' 
                                                            : 'text-left text-emerald-600'
                                                    }`}>
                                                        {isFreelancer ? 'Tú' : `${clients.find(c => c.id === selectedClient)?.name || 'Cliente'}`}
                                                    </div>

                                                    <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                                                        isFreelancer
                                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                                                            : 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 text-slate-900'
                                                    }`}>
                                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                                            {message.message}
                                                        </p>

                                                        <div className={`flex items-center gap-1 mt-2 text-xs ${
                                                            isFreelancer
                                                                ? 'text-white/70'
                                                                : 'text-emerald-600/70'
                                                        }`}>
                                                            <Clock className="w-3 h-3" />
                                                            {formatTime(message.created_at)}
                                                            {isFreelancer && (
                                                                <CheckCircle className="w-3 h-3 ml-1" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>                                        <div className="border-t p-4">
                                            <div className="flex gap-3">
                                                <Input
                                                    value={replyMessage}
                                                    onChange={(e) => setReplyMessage(e.target.value)}
                                                    placeholder="Escribe tu respuesta..."
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            sendReply();
                                                        }
                                                    }}
                                                    disabled={sending}
                                                />

                                                <Button
                                                    onClick={sendReply}
                                                    disabled={!replyMessage.trim() || sending}
                                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                                                >
                                                    {sending ? (
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <Send className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ) : (
                                    <Card className="h-[600px] flex items-center justify-center">
                                        <div className="text-center">
                                            <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                            <p className="text-slate-500 font-medium">
                                                Selecciona una conversación para empezar
                                            </p>
                                            <p className="text-slate-400 text-sm mt-2">
                                                O genera un token para que un cliente pueda contactarte
                                            </p>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Modal para generar token */}
            {showTokenForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Generar Token de Acceso</CardTitle>
                            <CardDescription>
                                Crea un enlace único para que el cliente pueda contactarte
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Seleccionar Cliente
                                </label>
                                <select
                                    value={selectedClientForToken}
                                    onChange={(e) => setSelectedClientForToken(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {clients.length === 0 ? (
                                        <option disabled>No hay clientes disponibles</option>
                                    ) : (
                                        clients.map((client) => (
                                            <option key={client.id} value={client.id}>
                                                {client.name} {client.company && `(${client.company})`}
                                            </option>
                                        ))
                                    )}
                                </select>
                                <p className="text-xs text-slate-500 mt-1">
                                    Clientes disponibles: {clients.length}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Mensaje Personalizado (opcional)
                                </label>
                                <Input
                                    value={emailMessage}
                                    onChange={(e) => setEmailMessage(e.target.value)}
                                    placeholder="Escribe un mensaje personalizado para el email..."
                                    className="border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Este mensaje se incluirá en el email junto con el enlace de acceso
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    onClick={() => setShowTokenForm(false)}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={generateToken}
                                    disabled={!selectedClientForToken || generatingToken}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    {generatingToken ? 'Generando...' : 'Solo Generar'}
                                </Button>
                                <Button
                                    onClick={sendTokenByEmail}
                                    disabled={!selectedClientForToken || sendingEmail}
                                    className="flex-1"
                                >
                                    {sendingEmail ? 'Enviando...' : '📧 Generar y Enviar'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
