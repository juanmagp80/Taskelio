import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    // Solo para desarrollo - usuario de prueba
    const testUserEmail = 'juanmagpdev@gmail.com';


    // Simular el componente DashboardClient con isDemo=false para probar datos reales
    return new NextResponse(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Debug Dashboard</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-50 p-4">
            <div class="max-w-7xl mx-auto">
                <h1 class="text-2xl font-bold mb-4">🔧 Debug Dashboard</h1>
                <p class="mb-4">Probando dashboard con usuario: <strong>${testUserEmail}</strong></p>
                <p class="mb-4">isDemo: <strong>false</strong> (debería mostrar datos reales o cero)</p>

                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <h2 class="font-semibold text-yellow-800">📋 Instrucciones:</h2>
                    <ul class="text-sm text-yellow-700 mt-2">
                        <li>• Si ves datos demo (horas ficticias), hay un problema con las variables de entorno</li>
                        <li>• Si ves cero datos, el dashboard está funcionando correctamente para nuevos usuarios</li>
                        <li>• Revisa la consola del navegador para logs detallados</li>
                    </ul>
                </div>

                <div id="dashboard-container">
                    <!-- El DashboardClient se renderizará aquí -->
                </div>

                <script>
                    // Simular la carga del DashboardClient
                </script>
            </div>
        </body>
        </html>
    `, {
        headers: {
            'Content-Type': 'text/html',
        },
    });
}