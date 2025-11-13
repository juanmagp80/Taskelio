'use client';

import { useState } from 'react';
import { createSupabaseClient } from '@/src/lib/supabase';

export default function CreateTestDataSimplePage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);

    const createTestDataDirectly = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            // Usar el cliente Supabase directamente desde el navegador
            const supabase = createSupabaseClient();
            
            // Verificar usuario actual
            const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !currentUser) {
                setError('Usuario no autenticado. Asegúrate de estar logueado.');
                return;
            }
            
            setUser(currentUser);

            const results: {
                user_id: string;
                clients: any[];
                projects: any[];
                invoices: any[];
                errors: Array<{ table: string; error: string }>;
            } = {
                user_id: currentUser.id,
                clients: [],
                projects: [],
                invoices: [],
                errors: []
            };

            // 1. CREAR CLIENTES
            
            const clientsData = [
                {
                    user_id: currentUser.id,
                    name: 'María García',
                    email: 'maria.garcia@test.com',
                    phone: '+34 600 123 456'
                },
                {
                    user_id: currentUser.id,
                    name: 'Carlos López',
                    email: 'carlos.lopez@test.com',
                    phone: '+34 600 234 567'
                },
                {
                    user_id: currentUser.id,
                    name: 'Ana Martínez',
                    email: 'ana.martinez@test.com',
                    phone: '+34 600 345 678'
                },
                {
                    user_id: currentUser.id,
                    name: 'Pedro Sánchez',
                    email: 'pedro.sanchez@test.com',
                    phone: '+34 600 456 789'
                },
                {
                    user_id: currentUser.id,
                    name: 'Laura Ruiz',
                    email: 'laura.ruiz@test.com',
                    phone: '+34 600 567 890'
                }
            ];

            const { data: clients, error: clientsError } = await supabase
                .from('clients')
                .insert(clientsData)
                .select();

            if (clientsError) {
                console.error('❌ Error creando clientes:', clientsError);
                results.errors.push({ table: 'clients', error: clientsError.message });
                
                // Intentar con campos básicos
                const basicClientsData = clientsData.map(c => ({
                    user_id: c.user_id,
                    name: c.name,
                    email: c.email
                }));

                const { data: basicClients, error: basicError } = await supabase
                    .from('clients')
                    .insert(basicClientsData)
                    .select();

                if (!basicError && basicClients) {
                    results.clients = basicClients;
                }
            } else if (clients) {
                results.clients = clients;
            }

            // 2. CREAR PROYECTOS (si tenemos clientes)
            if (results.clients.length > 0) {
                
                const projectsData = [
                    {
                        user_id: currentUser.id,
                        client_id: results.clients[0].id,
                        name: 'Rediseño Web Corporativo',
                        description: 'Renovación completa del sitio web corporativo'
                    },
                    {
                        user_id: currentUser.id,
                        client_id: results.clients[1].id,
                        name: 'App Móvil MVP',
                        description: 'Desarrollo de aplicación móvil mínima viable'
                    },
                    {
                        user_id: currentUser.id,
                        client_id: results.clients[2].id,
                        name: 'Sistema de Gestión CRM',
                        description: 'Implementación de sistema CRM personalizado'
                    }
                ];

                const { data: projects, error: projectsError } = await supabase
                    .from('projects')
                    .insert(projectsData)
                    .select();

                if (projectsError) {
                    console.error('❌ Error creando proyectos:', projectsError);
                    results.errors.push({ table: 'projects', error: projectsError.message });
                } else if (projects) {
                    results.projects = projects;
                }
            }

            // 3. CREAR FACTURAS
            if (results.clients.length > 0) {
                
                const today = new Date();
                const futureDate = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
                const pastDate = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000);

                const invoicesData = [
                    {
                        user_id: currentUser.id,
                        client_id: results.clients[0].id,
                        invoice_number: 'INV-TEST-001',
                        amount: 5000,
                        due_date: futureDate.toISOString()
                    },
                    {
                        user_id: currentUser.id,
                        client_id: results.clients[1].id,
                        invoice_number: 'INV-TEST-002',
                        amount: 8500,
                        due_date: pastDate.toISOString()
                    },
                    {
                        user_id: currentUser.id,
                        client_id: results.clients[2].id,
                        invoice_number: 'INV-TEST-003',
                        amount: 3200,
                        due_date: futureDate.toISOString()
                    }
                ];

                const { data: invoices, error: invoicesError } = await supabase
                    .from('invoices')
                    .insert(invoicesData)
                    .select();

                if (invoicesError) {
                    console.error('❌ Error creando facturas:', invoicesError);
                    results.errors.push({ table: 'invoices', error: invoicesError.message });
                } else if (invoices) {
                    results.invoices = invoices;
                }
            }

            const summary = {
                success: true,
                message: '🎉 Datos de prueba creados exitosamente',
                data: {
                    clients_created: results.clients.length,
                    projects_created: results.projects.length,
                    invoices_created: results.invoices.length,
                    total_entities: results.clients.length + results.projects.length + results.invoices.length
                },
                errors: results.errors
            };

            setResult(summary);

        } catch (error) {
            console.error('❌ Error general:', error);
            setError(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        🧪 Crear Datos de Prueba (Cliente)
                    </h1>
                    <p className="text-lg text-gray-600">
                        Genera datos directamente desde tu navegador usando el cliente Supabase
                    </p>
                    {user && (
                        <div className="mt-4 inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                            <span className="text-lg mr-2">👤</span>
                            <span className="font-medium">{user.email}</span>
                        </div>
                    )}
                </div>

                {/* Botón principal */}
                <div className="text-center mb-8">
                    <button
                        onClick={createTestDataDirectly}
                        disabled={loading}
                        className="inline-flex items-center px-8 py-4 text-lg font-medium text-white 
                                 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg 
                                 hover:from-purple-700 hover:to-indigo-700 focus:outline-none 
                                 focus:ring-4 focus:ring-purple-300 disabled:opacity-50 
                                 disabled:cursor-not-allowed transition-all duration-200 
                                 transform hover:scale-105"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                                     xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" 
                                            stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" 
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Creando datos...
                            </>
                        ) : (
                            <>
                                🚀 Crear Datos (Método Cliente)
                            </>
                        )}
                    </button>
                </div>

                {/* Resultado exitoso */}
                {result && result.success && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                        <div className="flex items-center mb-4">
                            <span className="text-3xl mr-3">🎉</span>
                            <h3 className="text-xl font-semibold text-green-900">
                                ¡Datos creados exitosamente!
                            </h3>
                        </div>
                        
                        <div className="grid md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-white rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {result.data.clients_created}
                                </div>
                                <div className="text-sm text-gray-600">Clientes</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {result.data.projects_created}
                                </div>
                                <div className="text-sm text-gray-600">Proyectos</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                    {result.data.invoices_created}
                                </div>
                                <div className="text-sm text-gray-600">Facturas</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                    {result.data.total_entities}
                                </div>
                                <div className="text-sm text-gray-600">Total</div>
                            </div>
                        </div>

                        {result.errors && result.errors.length > 0 && (
                            <div className="mt-4 bg-yellow-100 rounded-lg p-4">
                                <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Advertencias:</h4>
                                <ul className="space-y-1 text-yellow-800 text-sm">
                                    {result.errors.map((error: any, index: number) => (
                                        <li key={index}>
                                            <strong>{error.table}:</strong> {error.error}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Botón para ir a automatizaciones */}
                        <div className="mt-6 text-center">
                            <a
                                href="/dashboard/automations"
                                className="inline-flex items-center px-6 py-3 text-base font-medium 
                                         text-white bg-gradient-to-r from-green-600 to-emerald-600 
                                         rounded-lg shadow-md hover:from-green-700 hover:to-emerald-700 
                                         focus:outline-none focus:ring-4 focus:ring-green-300 
                                         transition-all duration-200 transform hover:scale-105"
                            >
                                🤖 Probar Automatizaciones
                                <svg className="ml-2 -mr-1 w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"></path>
                                </svg>
                            </a>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                        <div className="flex items-center mb-2">
                            <span className="text-2xl mr-3">❌</span>
                            <h3 className="text-lg font-semibold text-red-900">Error</h3>
                        </div>
                        <p className="text-red-800">{error}</p>
                        <div className="mt-4 text-sm text-red-600">
                            <p>💡 <strong>Sugerencias:</strong></p>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>Ve a /login y asegúrate de estar autenticado</li>
                                <li>Verifica que las tablas existan en tu base de datos</li>
                                <li>Abre la consola del navegador para más detalles</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* Footer info */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <div className="bg-blue-50 rounded-lg p-4">
                        <p className="font-medium text-blue-900 mb-2">🔧 Este método:</p>
                        <ul className="text-blue-800 space-y-1">
                            <li>• Usa tu cliente Supabase directamente desde el navegador</li>
                            <li>• Respeta tu sesión de usuario actual</li>
                            <li>• Muestra logs detallados en la consola</li>
                            <li>• No requiere APIs adicionales</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
