'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

export default function UpdateUserForm({ email }: { email: string }) {
    const [newEmail, setNewEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password && password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        // Validar que al menos un campo esté lleno
        if (!newEmail && !password) {
            toast.error('Debes proporcionar un nuevo email o una nueva contraseña');
            return;
        }

        // Validar formato de email
        if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            toast.error('El formato del email no es válido');
            return;
        }

        // Validar longitud mínima de contraseña
        if (password && password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/update-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    ...(newEmail ? { newEmail } : {}),
                    ...(password ? { password } : {})
                }),
            });

            let data;
            try {
                data = await response.json();
            } catch (e) {
                console.error('Error al parsear respuesta:', e);
                throw new Error('Error al procesar la respuesta del servidor');
            }

            if (!response.ok) {
                console.error('Error del servidor:', data);
                throw new Error(data.error || `Error ${response.status}: ${data.message || 'Error desconocido'}`);
            }

            toast.success(data.message || 'Usuario actualizado correctamente');
            
            // Si se actualizó el email, actualizar la UI
            if (data.updated?.includes('email')) {
                window.location.reload(); // Recargar para actualizar la sesión
            } else {
                setNewEmail('');
                setPassword('');
                setConfirmPassword('');
            }
        } catch (error: any) {
            console.error('Error al actualizar usuario:', error);
            toast.error(error.message || 'Error desconocido al actualizar usuario');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="p-6 max-w-md mx-auto mt-8">
            <h2 className="text-2xl font-semibold mb-6">Actualizar Usuario</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Email Actual
                    </label>
                    <Input
                        type="email"
                        value={email}
                        disabled
                        className="bg-gray-50"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">
                        Nuevo Email (opcional)
                    </label>
                    <Input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Nuevo email"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">
                        Nueva Contraseña (opcional)
                    </label>
                    <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Nueva contraseña"
                    />
                </div>

                {password && (
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Confirmar Contraseña
                        </label>
                        <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirmar nueva contraseña"
                        />
                    </div>
                )}

                <Button
                    type="submit"
                    className="w-full"
                    disabled={
                        isLoading ||
                        (!Boolean(newEmail) && !Boolean(password)) ||
                        (Boolean(password) && !Boolean(confirmPassword))
                    }
                >
                    {isLoading ? 'Actualizando...' : 'Actualizar Usuario'}
                </Button>
            </form>
        </Card>
    );
}
