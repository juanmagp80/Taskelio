'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { SpanishCompanyData, validateSpanishNIF, validateSpanishCIF } from '@/lib/spanish-invoice-utils';
import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { Building2, MapPin, Phone, Mail, Globe, FileText, Euro, Save, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface CompanyConfigProps {
    onSave?: (data: SpanishCompanyData) => void;
}

export default function CompanyConfig({ onSave }: CompanyConfigProps) {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const supabase = createSupabaseClient();
    const router = useRouter();
    
    const [companyData, setCompanyData] = useState<SpanishCompanyData>({
        companyName: '',
        nif: '',
        address: '',
        postalCode: '',
        city: '',
        province: '',
        country: 'España',
        registrationNumber: '',
        socialCapital: 0,
        phone: '',
        email: '',
        website: ''
    });

    useEffect(() => {
        loadCompanyData();
    }, []);

    const loadCompanyData = async () => {
        if (!supabase) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('company_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error loading company data:', error);
                return;
            }

            if (data) {
                setCompanyData({
                    companyName: data.company_name || '',
                    nif: data.nif || '',
                    address: data.address || '',
                    postalCode: data.postal_code || '',
                    city: data.city || '',
                    province: data.province || '',
                    country: data.country || 'España',
                    registrationNumber: data.registration_number || '',
                    socialCapital: data.social_capital || 0,
                    phone: data.phone || '',
                    email: data.email || '',
                    website: data.website || ''
                });
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!companyData.companyName.trim()) {
            newErrors.companyName = 'El nombre de la empresa es obligatorio';
        }

        if (!companyData.nif.trim()) {
            newErrors.nif = 'El NIF/CIF es obligatorio';
        } else if (!validateSpanishNIF(companyData.nif) && !validateSpanishCIF(companyData.nif)) {
            newErrors.nif = 'El NIF/CIF no tiene un formato válido';
        }

        if (!companyData.address.trim()) {
            newErrors.address = 'La dirección es obligatoria';
        }

        if (!companyData.postalCode.trim()) {
            newErrors.postalCode = 'El código postal es obligatorio';
        } else if (!/^\d{5}$/.test(companyData.postalCode)) {
            newErrors.postalCode = 'El código postal debe tener 5 dígitos';
        }

        if (!companyData.city.trim()) {
            newErrors.city = 'La ciudad es obligatoria';
        }

        if (!companyData.province.trim()) {
            newErrors.province = 'La provincia es obligatoria';
        }

        if (companyData.email && !/\S+@\S+\.\S+/.test(companyData.email)) {
            newErrors.email = 'El formato del email no es válido';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const saveCompanyData = async () => {
        if (!validateForm()) {
            toast.error('Por favor, corrige los errores en el formulario');
            return;
        }

        if (!supabase) {
            toast.error('Error de conexión con la base de datos');
            return;
        }

        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error('Usuario no autenticado');
                return;
            }

            const dataToSave = {
                user_id: user.id,
                company_name: companyData.companyName,
                nif: companyData.nif.toUpperCase(),
                address: companyData.address,
                postal_code: companyData.postalCode,
                city: companyData.city,
                province: companyData.province,
                country: companyData.country,
                registration_number: companyData.registrationNumber || null,
                social_capital: companyData.socialCapital || null,
                phone: companyData.phone || null,
                email: companyData.email || null,
                website: companyData.website || null,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('company_settings')
                .upsert(dataToSave, {
                    onConflict: 'user_id'
                });

            if (error) {
                console.error('Error saving company data:', error);
                toast.error(`Error al guardar: ${error.message}`);
                return;
            }

            // IMPORTANTE: También actualizar la tabla profiles para que los PDFs usen los datos correctos
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    company: companyData.companyName,
                    full_name: companyData.companyName, // Usar el nombre de la empresa como nombre completo
                    email: companyData.email || user.email,
                    phone: companyData.phone,
                    website: companyData.website,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (profileError) {
                console.error('Error actualizando perfil:', profileError);
                // No bloqueamos el guardado, solo advertimos
                toast.warning('Datos guardados, pero hubo un problema al actualizar el perfil');
            }

            // Notificaciones de éxito más visibles
            toast.success('✅ Datos de la empresa guardados correctamente', {
                duration: 3000
            });
            
            // Feedback adicional visual
            onSave?.(companyData);

            // Redirigir al dashboard después de 1.5 segundos
            setTimeout(() => {
                router.push('/dashboard');
            }, 1500);

        } catch (error) {
            console.error('Error:', error);
            toast.error('Error inesperado al guardar los datos');
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field: keyof SpanishCompanyData, value: string | number) => {
        setCompanyData(prev => ({
            ...prev,
            [field]: value
        }));

        // Limpiar error del campo cuando se modifica
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                        Configuración Fiscal de la Empresa
                    </h1>
                    <p className="text-slate-600">Datos obligatorios para la facturación según normativa española</p>
                </div>
            </div>

            <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                        <FileText className="w-5 h-5" />
                        Datos Fiscales Obligatorios
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Nombre de la empresa */}
                        <div className="md:col-span-2">
                            <Label htmlFor="companyName" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                Nombre o Razón Social *
                            </Label>
                            <Input
                                id="companyName"
                                value={companyData.companyName}
                                onChange={(e) => updateField('companyName', e.target.value)}
                                placeholder="Ej: Mi Empresa S.L."
                                className={`mt-1 ${errors.companyName ? 'border-red-300 focus:ring-red-500' : ''}`}
                            />
                            {errors.companyName && (
                                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.companyName}
                                </p>
                            )}
                        </div>

                        {/* NIF/CIF */}
                        <div>
                            <Label htmlFor="nif" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                NIF/CIF *
                            </Label>
                            <Input
                                id="nif"
                                value={companyData.nif}
                                onChange={(e) => updateField('nif', e.target.value.toUpperCase())}
                                placeholder="12345678Z o A12345674"
                                className={`mt-1 ${errors.nif ? 'border-red-300 focus:ring-red-500' : ''}`}
                                maxLength={9}
                            />
                            {errors.nif && (
                                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.nif}
                                </p>
                            )}
                        </div>

                        {/* Código Postal */}
                        <div>
                            <Label htmlFor="postalCode" className="text-sm font-semibold text-slate-700">
                                Código Postal *
                            </Label>
                            <Input
                                id="postalCode"
                                value={companyData.postalCode}
                                onChange={(e) => updateField('postalCode', e.target.value.replace(/\D/g, ''))}
                                placeholder="28001"
                                className={`mt-1 ${errors.postalCode ? 'border-red-300 focus:ring-red-500' : ''}`}
                                maxLength={5}
                            />
                            {errors.postalCode && (
                                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.postalCode}
                                </p>
                            )}
                        </div>

                        {/* Dirección */}
                        <div className="md:col-span-2">
                            <Label htmlFor="address" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                Dirección Completa *
                            </Label>
                            <Input
                                id="address"
                                value={companyData.address}
                                onChange={(e) => updateField('address', e.target.value)}
                                placeholder="Calle Mayor, 123, 1º A"
                                className={`mt-1 ${errors.address ? 'border-red-300 focus:ring-red-500' : ''}`}
                            />
                            {errors.address && (
                                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.address}
                                </p>
                            )}
                        </div>

                        {/* Ciudad */}
                        <div>
                            <Label htmlFor="city" className="text-sm font-semibold text-slate-700">
                                Ciudad *
                            </Label>
                            <Input
                                id="city"
                                value={companyData.city}
                                onChange={(e) => updateField('city', e.target.value)}
                                placeholder="Madrid"
                                className={`mt-1 ${errors.city ? 'border-red-300 focus:ring-red-500' : ''}`}
                            />
                            {errors.city && (
                                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.city}
                                </p>
                            )}
                        </div>

                        {/* Provincia */}
                        <div>
                            <Label htmlFor="province" className="text-sm font-semibold text-slate-700">
                                Provincia *
                            </Label>
                            <Input
                                id="province"
                                value={companyData.province}
                                onChange={(e) => updateField('province', e.target.value)}
                                placeholder="Madrid"
                                className={`mt-1 ${errors.province ? 'border-red-300 focus:ring-red-500' : ''}`}
                            />
                            {errors.province && (
                                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.province}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Datos adicionales */}
            <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                        <Euro className="w-5 h-5" />
                        Datos Adicionales (Opcionales)
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Número de registro mercantil */}
                        <div>
                            <Label htmlFor="registrationNumber" className="text-sm font-semibold text-slate-700">
                                Registro Mercantil
                            </Label>
                            <Input
                                id="registrationNumber"
                                value={companyData.registrationNumber || ''}
                                onChange={(e) => updateField('registrationNumber', e.target.value)}
                                placeholder="Ej: Madrid, Tomo 12345, Folio 67, Sección 8"
                            />
                        </div>

                        {/* Capital social */}
                        <div>
                            <Label htmlFor="socialCapital" className="text-sm font-semibold text-slate-700">
                                Capital Social (€)
                            </Label>
                            <Input
                                type="number"
                                id="socialCapital"
                                value={companyData.socialCapital || ''}
                                onChange={(e) => updateField('socialCapital', parseFloat(e.target.value) || 0)}
                                placeholder="3000"
                                min="0"
                                step="0.01"
                            />
                        </div>

                        {/* Teléfono */}
                        <div>
                            <Label htmlFor="phone" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                Teléfono
                            </Label>
                            <Input
                                id="phone"
                                value={companyData.phone || ''}
                                onChange={(e) => updateField('phone', e.target.value)}
                                placeholder="+34 912 345 678"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <Label htmlFor="email" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Email
                            </Label>
                            <Input
                                type="email"
                                id="email"
                                value={companyData.email || ''}
                                onChange={(e) => updateField('email', e.target.value)}
                                placeholder="info@miempresa.com"
                                className={`${errors.email ? 'border-red-300 focus:ring-red-500' : ''}`}
                            />
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        {/* Website */}
                        <div className="md:col-span-2">
                            <Label htmlFor="website" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                Sitio Web
                            </Label>
                            <Input
                                id="website"
                                value={companyData.website || ''}
                                onChange={(e) => updateField('website', e.target.value)}
                                placeholder="https://www.miempresa.com"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Botones de acción */}
            <div className="flex justify-between gap-4">
                <Button
                    onClick={() => router.push('/dashboard')}
                    variant="outline"
                    disabled={loading}
                    className="px-6 py-3 rounded-xl border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 transition-all duration-200 flex items-center gap-2"
                >
                    <X className="w-4 h-4" />
                    Cancelar
                </Button>
                
                <Button
                    onClick={saveCompanyData}
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Guardando y regresando...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Guardar y Volver al Dashboard
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
