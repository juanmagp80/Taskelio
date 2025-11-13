import { createServerSupabaseClient } from '@/src/lib/supabase-server';
import { redirect } from 'next/navigation';
// El archivo principal del dashboard fue renombrado a DashboardBonsai
import DashboardClient from './DashboardBonsai';

export default async function DashboardPage() {
    try {

        // ✅ Verificar si Supabase está configurado
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey,
            urlValid: supabaseUrl?.startsWith('https://'),
        });

        // Si Supabase no está configurado, usar modo demo
        if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_supabase_project_url_here')) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100 text-slate-900 relative overflow-hidden">
                    <div className="fixed inset-0 z-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(99,102,241,0.08),transparent_50%)]" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(139,92,246,0.06),transparent_50%)]" />
                        <div className="absolute inset-0 bg-grid-slate-900/[0.02] bg-[size:32px_32px]" />

                        <div className="absolute top-24 left-16 w-40 h-40 bg-gradient-to-br from-indigo-100/40 to-violet-100/40 rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute bottom-40 right-24 w-56 h-56 bg-gradient-to-br from-violet-100/40 to-indigo-100/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                        <div className="absolute top-1/3 left-8 w-28 h-28 bg-gradient-to-br from-blue-100/40 to-indigo-100/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
                    </div>

                    <div className="relative z-10 p-8">
                        <div className="max-w-4xl mx-auto">
                            <div className="relative bg-white/95 backdrop-blur-2xl border border-amber-200/60 rounded-3xl p-8 mb-8 shadow-2xl shadow-amber-500/10">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/80 via-transparent to-orange-50/80 rounded-3xl blur-sm -z-10"></div>
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 to-orange-50/30 rounded-3xl"></div>

                                <div className="relative">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/25">
                                            <span className="text-white font-bold text-lg">⚙️</span>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black bg-gradient-to-r from-amber-900 via-orange-900 to-amber-900 bg-clip-text text-transparent">Modo Desarrollo</h2>
                                            <p className="text-amber-700 font-medium">Dashboard en modo demo</p>
                                        </div>
                                    </div>
                                    <p className="text-amber-800 mb-6 text-base leading-relaxed font-medium">
                                        El dashboard está funcionando en modo demo porque Supabase no está configurado.
                                        Puedes explorar todas las funcionalidades con datos ficticios.
                                    </p>
                                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-amber-200/60 shadow-lg shadow-amber-500/5">
                                        <h3 className="font-bold text-amber-900 mb-4 flex items-center gap-2">
                                            <span className="w-5 h-5 bg-amber-500 rounded-lg flex items-center justify-center">
                                                <span className="text-white text-xs">✓</span>
                                            </span>
                                            Para activar funcionalidad completa:
                                        </h3>
                                        <ol className="text-sm text-amber-800 space-y-2 font-medium">
                                            <li className="flex items-center gap-2">
                                                <span className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 font-bold text-xs">1</span>
                                                Crea un proyecto en <a href="https://supabase.com" target="_blank" className="underline font-bold hover:text-amber-900">supabase.com</a>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 font-bold text-xs">2</span>
                                                Copia tu Project URL y anon key
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 font-bold text-xs">3</span>
                                                Edita el archivo <code className="bg-amber-100 px-2 py-1 rounded-lg font-mono text-xs">.env.local</code>
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 font-bold text-xs">4</span>
                                                Reinicia el servidor
                                            </li>
                                        </ol>
                                    </div>
                                </div>
                            </div>

                            <DashboardClient
                                userEmail="demo@taskelio.com"
                                isDemo={true}
                            />
                        </div>
                    </div>
                </div>
            );
        }

        const supabase = await createServerSupabaseClient();

        const {
            data: { session },
            error: sessionError
        } = await supabase.auth.getSession();

            hasSession: !!session,
            hasUser: !!session?.user,
            hasEmail: !!session?.user?.email,
            sessionError: sessionError,
            userId: session?.user?.id
        });

        // 🔧 DEBUG: Para desarrollo, si no hay sesión, usar usuario de prueba
        let userEmail = session?.user?.email;
        if (!userEmail) {
            userEmail = 'juanmagpdev@gmail.com';
        }

        if (!userEmail) {
            redirect('/login');
        }

        return <DashboardClient userEmail={userEmail} />;
    } catch (error) {
        console.error('❌ Error in dashboard page:', error);
        redirect('/login');
    }
}
