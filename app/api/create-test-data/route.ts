import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            );
                        } catch {
                            // El método `setAll` fue llamado desde un componente Server Component.
                            // Esto puede ser ignorado si tienes middleware refrescando
                            // las sesiones del usuario.
                        }
                    },
                },
            }
        );
        
        // Obtener el usuario actual
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            return NextResponse.json({ 
                error: 'Usuario no autenticado',
                details: userError?.message 
            }, { status: 401 });
        }

        const results: {
            user_id: string;
            clients: any[];
            projects: any[];
            invoices: any[];
            tasks?: any[];
            errors: Array<{ table: string; error: string }>;
        } = {
            user_id: user.id,
            clients: [],
            projects: [],
            invoices: [],
            errors: []
        };

        // 1. CREAR CLIENTES DE PRUEBA
        
        const clientsData = [
            {
                user_id: user.id,
                name: 'María García',
                email: 'maria.garcia@test.com',
                phone: '+34 600 123 456',
                company: 'García Consulting'
            },
            {
                user_id: user.id,
                name: 'Carlos López',
                email: 'carlos.lopez@test.com',
                phone: '+34 600 234 567',
                company: 'López & Asociados'
            },
            {
                user_id: user.id,
                name: 'Ana Martínez',
                email: 'ana.martinez@test.com',
                phone: '+34 600 345 678',
                company: 'Martínez Solutions'
            },
            {
                user_id: user.id,
                name: 'Pedro Sánchez',
                email: 'pedro.sanchez@test.com',
                phone: '+34 600 456 789',
                company: 'Sánchez Tech'
            },
            {
                user_id: user.id,
                name: 'Laura Ruiz',
                email: 'laura.ruiz@test.com',
                phone: '+34 600 567 890',
                company: 'Ruiz Digital'
            }
        ];

        const { data: clients, error: clientsError } = await supabase
            .from('clients')
            .insert(clientsData)
            .select();

        if (clientsError) {
            console.error('❌ Error creando clientes:', clientsError);
            results.errors.push({ table: 'clients', error: clientsError.message });
            
            // Intentar con campos básicos si hay error de columnas
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
            } else {
                results.errors.push({ table: 'clients_basic', error: basicError?.message });
            }
        } else if (clients) {
            results.clients = clients;
        }

        // 2. CREAR PROYECTOS (si tenemos clientes)
        if (results.clients.length > 0) {
            
            const projectsData = [
                {
                    user_id: user.id,
                    client_id: results.clients[0].id,
                    name: 'Rediseño Web Corporativo',
                    description: 'Renovación completa del sitio web corporativo',
                    status: 'active',
                    budget: 15000
                },
                {
                    user_id: user.id,
                    client_id: results.clients[1].id,
                    name: 'App Móvil MVP',
                    description: 'Desarrollo de aplicación móvil mínima viable',
                    status: 'active',
                    budget: 25000
                },
                {
                    user_id: user.id,
                    client_id: results.clients[2].id,
                    name: 'Sistema de Gestión CRM',
                    description: 'Implementación de sistema CRM personalizado',
                    status: 'planning',
                    budget: 30000
                },
                {
                    user_id: user.id,
                    client_id: results.clients[0].id,
                    name: 'Campaña de Marketing Digital',
                    description: 'Estrategia completa de marketing digital',
                    status: 'active',
                    budget: 8000
                }
            ];

            const { data: projects, error: projectsError } = await supabase
                .from('projects')
                .insert(projectsData)
                .select();

            if (projectsError) {
                console.error('❌ Error creando proyectos:', projectsError);
                results.errors.push({ table: 'projects', error: projectsError.message });
                
                // Intentar con campos básicos
                const basicProjectsData = projectsData.map(p => ({
                    user_id: p.user_id,
                    client_id: p.client_id,
                    name: p.name,
                    description: p.description
                }));

                const { data: basicProjects, error: basicProjectError } = await supabase
                    .from('projects')
                    .insert(basicProjectsData)
                    .select();

                if (!basicProjectError && basicProjects) {
                    results.projects = basicProjects;
                }
            } else if (projects) {
                results.projects = projects;
            }
        }

        // 3. CREAR FACTURAS
        if (results.clients.length > 0) {
            
            const today = new Date();
            const futureDate = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000); // +15 días
            const pastDate = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000); // -10 días
            const veryPastDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000); // -30 días

            const invoicesData = [
                {
                    user_id: user.id,
                    client_id: results.clients[0].id,
                    invoice_number: 'INV-TEST-001',
                    amount: 5000,
                    status: 'pending',
                    due_date: futureDate.toISOString(),
                    issue_date: today.toISOString()
                },
                {
                    user_id: user.id,
                    client_id: results.clients[1].id,
                    invoice_number: 'INV-TEST-002',
                    amount: 8500,
                    status: 'overdue',
                    due_date: pastDate.toISOString(),
                    issue_date: veryPastDate.toISOString()
                },
                {
                    user_id: user.id,
                    client_id: results.clients[2].id,
                    invoice_number: 'INV-TEST-003',
                    amount: 3200,
                    status: 'paid',
                    due_date: pastDate.toISOString(),
                    issue_date: veryPastDate.toISOString()
                },
                {
                    user_id: user.id,
                    client_id: results.clients[3].id,
                    invoice_number: 'INV-TEST-004',
                    amount: 12000,
                    status: 'pending',
                    due_date: futureDate.toISOString(),
                    issue_date: today.toISOString()
                }
            ];

            const { data: invoices, error: invoicesError } = await supabase
                .from('invoices')
                .insert(invoicesData)
                .select();

            if (invoicesError) {
                console.error('❌ Error creando facturas:', invoicesError);
                results.errors.push({ table: 'invoices', error: invoicesError.message });
                
                // Intentar con campos básicos
                const basicInvoicesData = invoicesData.map(i => ({
                    user_id: i.user_id,
                    client_id: i.client_id,
                    invoice_number: i.invoice_number,
                    amount: i.amount,
                    due_date: i.due_date
                }));

                const { data: basicInvoices, error: basicInvoiceError } = await supabase
                    .from('invoices')
                    .insert(basicInvoicesData)
                    .select();

                if (!basicInvoiceError && basicInvoices) {
                    results.invoices = basicInvoices;
                }
            } else if (invoices) {
                results.invoices = invoices;
            }
        }

        // 4. CREAR ALGUNAS TAREAS TAMBIÉN (si la tabla existe)
        try {
            const tasksData = [
                {
                    user_id: user.id,
                    title: 'Revisar mockups del cliente',
                    description: 'Validar los diseños propuestos',
                    status: 'pending',
                    priority: 'high'
                },
                {
                    user_id: user.id,
                    title: 'Preparar presentación del proyecto',
                    description: 'Crear slides para la reunión del viernes',
                    status: 'in_progress',
                    priority: 'medium'
                }
            ];

            const { data: tasks, error: tasksError } = await supabase
                .from('tasks')
                .insert(tasksData)
                .select();

            if (!tasksError && tasks) {
                results.tasks = tasks;
            }
        } catch (error) {
        }

        // Resumen final
        const summary = {
            success: true,
            message: '🎉 Datos de prueba creados exitosamente',
            data: {
                clients_created: results.clients.length,
                projects_created: results.projects.length,
                invoices_created: results.invoices.length,
                tasks_created: results.tasks?.length || 0,
                total_entities: results.clients.length + results.projects.length + results.invoices.length + (results.tasks?.length || 0)
            },
            errors: results.errors,
            next_steps: [
                '1. Ve a /dashboard/automations',
                '2. Prueba el botón "Ejecutar" en cualquier automatización',
                '3. Verás las entidades disponibles para seleccionar',
                '4. Los logs de ejecución aparecerán en la consola del navegador'
            ]
        };

        return NextResponse.json(summary);

    } catch (error) {
        console.error('❌ Error general:', error);
        return NextResponse.json({ 
            success: false,
            error: 'Error interno del servidor',
            details: error instanceof Error ? error.message : 'Error desconocido'
        }, { status: 500 });
    }
}
