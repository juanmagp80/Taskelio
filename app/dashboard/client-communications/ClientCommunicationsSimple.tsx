'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { createSupabaseClient } from '@/src/lib/supabase';
import {
    MessageCircle,
    Users,
    Database,
    AlertTriangle,
    CheckCircle,
    ExternalLink,
    Copy,
    Plus,
    RefreshCw
} from 'lucide-react';

interface ClientCommunicationsProps {
    userEmail?: string;
}

export default function ClientCommunicationsSimple({ userEmail = "demo@example.com" }: ClientCommunicationsProps) {
    const supabase = createSupabaseClient();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [tablesExist, setTablesExist] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogout = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        router.push('/login');
    };

    useEffect(() => {
        checkTablesExist();
    }, []);

    const checkTablesExist = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!supabase) {
                setError('Supabase no configurado');
                return;
            }

            // Intentar hacer una consulta simple para verificar si las tablas existen
            const { data, error: checkError } = await supabase
                .from('client_tokens')
                .select('id')
                .limit(1);

            if (checkError) {
                if (checkError.code === 'PGRST116' || checkError.message.includes('does not exist')) {
                    setTablesExist(false);
                } else {
                    setError('Error de conexión: ' + checkError.message);
                }
            } else {
                setTablesExist(true);
            }

        } catch (error: any) {
            console.error('Error:', error);
            setError('Error verificando configuración');
        } finally {
            setLoading(false);
        }
    };

    const copyMigrationScript = () => {
        const script = `-- EJECUTAR EN SUPABASE SQL EDITOR
-- Copiar contenido de: database/client_communication_migration.sql`;
        
        navigator.clipboard.writeText(script);
        alert('Script de migración copiado al portapapeles!');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 text-slate-900">
                <div className="flex">
                    <Sidebar userEmail={userEmail} onLogout={handleLogout} />
                    
                    <main className="flex-1 ml-56 overflow-auto">
                        <div className="p-4 flex items-center justify-center min-h-screen">
                            <div className="text-center">
                                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-slate-600 font-medium">Verificando configuración...</p>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

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
                                        <p className="text-slate-600 text-sm">Sistema de mensajería sin registro para clientes</p>
                                    </div>
                                </div>

                                <Button
                                    onClick={checkTablesExist}
                                    variant="outline"
                                    disabled={loading}
                                >
                                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                    Verificar
                                </Button>
                            </div>
                        </div>

                        {/* Estado del Sistema */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Estado de la Base de Datos */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Database className="w-5 h-5 text-blue-600" />
                                        Estado de la Base de Datos
                                    </CardTitle>
                                    <CardDescription>Configuración requerida para el sistema</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {error ? (
                                        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                                            <AlertTriangle className="w-6 h-6 text-red-600" />
                                            <div>
                                                <p className="font-medium text-red-900">Error de Configuración</p>
                                                <p className="text-red-700 text-sm">{error}</p>
                                            </div>
                                        </div>
                                    ) : tablesExist ? (
                                        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                                            <CheckCircle className="w-6 h-6 text-green-600" />
                                            <div>
                                                <p className="font-medium text-green-900">¡Sistema Listo!</p>
                                                <p className="text-green-700 text-sm">Las tablas están configuradas correctamente</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                                                <AlertTriangle className="w-6 h-6 text-amber-600" />
                                                <div>
                                                    <p className="font-medium text-amber-900">Configuración Pendiente</p>
                                                    <p className="text-amber-700 text-sm">
                                                        Las tablas de comunicación no están creadas en Supabase
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <h4 className="font-medium text-slate-900">Pasos para configurar:</h4>
                                                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
                                                    <li>Ir a <strong>Supabase Dashboard</strong> → SQL Editor</li>
                                                    <li>Ejecutar el script de migración (archivo incluido)</li>
                                                    <li>Configurar variable <code className="bg-slate-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code></li>
                                                    <li>Verificar de nuevo esta página</li>
                                                </ol>

                                                <div className="flex gap-2 mt-4">
                                                    <Button
                                                        onClick={copyMigrationScript}
                                                        size="sm"
                                                        variant="outline"
                                                        className="flex-1"
                                                    >
                                                        <Copy className="w-4 h-4 mr-2" />
                                                        Copiar Script
                                                    </Button>
                                                    <Button
                                                        onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        <ExternalLink className="w-4 h-4 mr-2" />
                                                        Supabase
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Información del Sistema */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="w-5 h-5 text-indigo-600" />
                                        ¿Cómo Funciona?
                                    </CardTitle>
                                    <CardDescription>Sistema de comunicación sin registro</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3">
                                                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                                                <div>
                                                    <p className="font-medium text-slate-900">Generas token único</p>
                                                    <p className="text-slate-600 text-sm">Para cada cliente que quiera contactarte</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-start gap-3">
                                                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                                                <div>
                                                    <p className="font-medium text-slate-900">Envías enlace único</p>
                                                    <p className="text-slate-600 text-sm">Por WhatsApp, email o como prefieras</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-start gap-3">
                                                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                                                <div>
                                                    <p className="font-medium text-slate-900">Cliente accede sin registro</p>
                                                    <p className="text-slate-600 text-sm">Portal web elegante tipo WhatsApp</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-start gap-3">
                                                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">4</div>
                                                <div>
                                                    <p className="font-medium text-slate-900">Gestionas desde tu CRM</p>
                                                    <p className="text-slate-600 text-sm">Todas las conversaciones centralizadas</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                                            <p className="text-blue-900 font-medium text-sm">
                                                ✨ <strong>Ventaja principal:</strong> Los clientes pueden contactarte 
                                                profesionalmente sin la fricción de registrarse en tu web.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Documentación */}
                        <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>Documentación y Archivos</CardTitle>
                                <CardDescription>Guías y recursos para configurar el sistema</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 border rounded-lg">
                                        <h4 className="font-medium text-slate-900 mb-2">📄 Migración SQL</h4>
                                        <p className="text-sm text-slate-600 mb-3">
                                            <code>database/client_communication_migration.sql</code>
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Ejecutar en Supabase SQL Editor para crear las tablas necesarias
                                        </p>
                                    </div>
                                    
                                    <div className="p-4 border rounded-lg">
                                        <h4 className="font-medium text-slate-900 mb-2">📖 Guía Completa</h4>
                                        <p className="text-sm text-slate-600 mb-3">
                                            <code>docs/client-communication-implementation.md</code>
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Documentación completa con ejemplos y casos de uso
                                        </p>
                                    </div>
                                    
                                    <div className="p-4 border rounded-lg">
                                        <h4 className="font-medium text-slate-900 mb-2">🚀 Portal Cliente</h4>
                                        <p className="text-sm text-slate-600 mb-3">
                                            <code>/client-portal/[token]</code>
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Interfaz web para que los clientes envíen mensajes
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </div>
    );
}
