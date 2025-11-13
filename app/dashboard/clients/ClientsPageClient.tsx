'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import TrialBanner from '@/components/TrialBanner';
import { getCitiesByProvince, getProvinceNames } from '@/src/data/spanish-locations';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { useTrialStatus } from '@/src/lib/useTrialStatus';
import { showToast } from '@/utils/toast';
import {
    Building,
    Edit3,
    Grid3X3,
    List,
    Mail,
    MapPin,
    Phone,
    Plus,
    Search,
    Trash2,
    Users,
    X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Client = {
    id: string;
    name: string;
    email: string;
    tag: string;
    phone?: string;
    company?: string;
    address?: string;
    city?: string;
    province?: string;
    nif?: string;
    created_at: string;
};

interface ClientsPageClientProps {
    userEmail: string;
}

export default function ClientsPageClient({ userEmail }: ClientsPageClientProps) {
    const supabase = createSupabaseClient();
    const router = useRouter();
    const { trialInfo, loading: trialLoading, hasReachedLimit, canUseFeatures } = useTrialStatus(userEmail);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInputRef, setSearchInputRef] = useState<HTMLInputElement | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        city: '',
        province: '',
        nif: '',
        tag: ''
    });
    const [availableCities, setAvailableCities] = useState<string[]>([]);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [showEditForm, setShowEditForm] = useState(false);
    const [editFormData, setEditFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        city: '',
        province: '',
        nif: '',
        tag: ''
    });
    const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');
    const [editAvailableCities, setEditAvailableCities] = useState<string[]>([]);

    useEffect(() => {
        fetchClients();
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                searchInputRef?.focus();
            }
            if (event.key === 'Escape') {
                setSearchTerm('');
                searchInputRef?.blur();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [searchInputRef]);

    const handleProvinceChange = (provinceName: string) => {
        setFormData({ ...formData, province: provinceName, city: '' });
        const cities = getCitiesByProvince(provinceName);
        setAvailableCities(cities);
    };

    const handleEditProvinceChange = (provinceName: string) => {
        setEditFormData({ ...editFormData, province: provinceName, city: '' });
        const cities = getCitiesByProvince(provinceName);
        setEditAvailableCities(cities);
    };

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowForm(false);
                setShowEditForm(false);
            }
        };

        if (showForm || showEditForm) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [showForm, showEditForm]);

    const fetchClients = async () => {
        try {
            if (!supabase) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error('No hay usuario autenticado');
                return;
            }

            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching clients:', error);
                return;
            }

            setClients(data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const addClient = async () => {
        try {
            if (!canUseFeatures) {
                showToast.warning('❌ Tu trial ha expirado. Actualiza tu suscripción para continuar creando clientes.');
                return;
            }

            if (hasReachedLimit('clients')) {
                showToast.error(`❌ Has alcanzado el límite de clientes de tu plan (${trialInfo?.limits.maxClients}). Actualiza tu suscripción para crear más clientes.`);
                return;
            }

            if (!formData.name.trim() || !formData.nif.trim() || !formData.city.trim() || !formData.province.trim() || !supabase) {
                showToast.warning('Por favor, complete todos los campos obligatorios: Nombre, NIF/CIF, Ciudad y Provincia');
                return;
            }

            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error('No hay usuario autenticado');
                return;
            }

            const { data, error } = await supabase
                .from('clients')
                .insert([{
                    user_id: user.id,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    company: formData.company,
                    address: formData.address,
                    city: formData.city,
                    province: formData.province,
                    nif: formData.nif,
                    tag: formData.tag
                }])
                .select();

            if (error) {
                console.error('Error adding client:', error);
                return;
            }

            if (data) {
                setClients(prev => [data[0], ...prev]);
                setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    company: '',
                    address: '',
                    city: '',
                    province: '',
                    nif: '',
                    tag: ''
                });
                setAvailableCities([]);
                setShowForm(false);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateClient = async () => {
        try {
            if (!editingClient || !editFormData.name.trim() || !editFormData.nif.trim() || !editFormData.city.trim() || !editFormData.province.trim() || !supabase) {
                showToast.warning('Por favor, complete todos los campos obligatorios: Nombre, NIF/CIF, Ciudad y Provincia');
                return;
            }

            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error('No hay usuario autenticado');
                return;
            }

            const { data, error } = await supabase
                .from('clients')
                .update({
                    name: editFormData.name,
                    email: editFormData.email,
                    phone: editFormData.phone,
                    company: editFormData.company,
                    address: editFormData.address,
                    city: editFormData.city,
                    province: editFormData.province,
                    nif: editFormData.nif,
                    tag: editFormData.tag
                })
                .eq('id', editingClient.id)
                .eq('user_id', user.id)
                .select();

            if (error) {
                console.error('Error updating client:', error);
                showToast.error('Error actualizando cliente: ' + error.message);
                return;
            }

            if (data && data.length > 0) {
                setClients(prev => prev.map(client => client.id === data[0].id ? data[0] : client));
                setEditFormData({
                    name: '',
                    email: '',
                    phone: '',
                    company: '',
                    address: '',
                    city: '',
                    province: '',
                    nif: '',
                    tag: ''
                });
                setEditAvailableCities([]);
                setShowEditForm(false);
                setEditingClient(null);
            }
        } catch (error) {
            console.error('Error updating client:', error);
            showToast.error('Error actualizando cliente');
        } finally {
            setLoading(false);
        }
    };

    const deleteClient = async (clientId: string) => {
        try {
            const confirmed = await showToast.confirm('¿Estás seguro de que quieres eliminar este cliente?');
            if (!confirmed) {
                return;
            }

            if (!supabase) return;

            setLoading(true);

            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', clientId);

            if (error) {
                console.error('Error deleting client:', error);
                showToast.error('Error eliminando cliente: ' + error.message);
                return;
            }

            setClients(prev => prev.filter(client => client.id !== clientId));
        } catch (error) {
            console.error('Error:', error);
            showToast.error('Error eliminando cliente');
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (client: Client) => {
        setEditingClient(client);
        setEditFormData({
            name: client.name,
            email: client.email,
            phone: client.phone || '',
            company: client.company || '',
            address: client.address || '',
            city: client.city || '',
            province: client.province || '',
            nif: client.nif || '',
            tag: client.tag
        });

        if (client.province) {
            const cities = getCitiesByProvince(client.province);
            setEditAvailableCities(cities);
        } else {
            setEditAvailableCities([]);
        }

        setShowEditForm(true);
    };

    const cancelEdit = () => {
        setEditingClient(null);
        setShowEditForm(false);
        setEditFormData({
            name: '',
            email: '',
            phone: '',
            company: '',
            address: '',
            city: '',
            province: '',
            nif: '',
            tag: ''
        });
        setEditAvailableCities([]);
    };

    const handleLogout = async () => {
        try {
            if (!supabase) return;
            await supabase.auth.signOut();
            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const handleNewClientClick = () => {
        if (!canUseFeatures) {
            showToast.warning('❌ Tu trial ha expirado. Actualiza tu suscripción para continuar creando clientes.');
            return;
        }

        if (hasReachedLimit('clients')) {
            showToast.error(`❌ Has alcanzado el límite de clientes de tu plan (${trialInfo?.limits.maxClients}). Actualiza tu suscripción para crear más clientes.`);
            return;
        }

        setShowForm(true);
    };

    const filteredClients = clients.filter(client => {
        if (!searchTerm.trim()) return true;

        const searchLower = searchTerm.toLowerCase().trim();

        const searchableFields = [
            client.name,
            client.email,
            client.company,
            client.phone,
            client.address,
            client.city,
            client.province,
            client.nif,
            client.tag
        ].filter(Boolean);

        return searchableFields.some(field =>
            field?.toLowerCase().includes(searchLower)
        ) ||
            searchLower.split(' ').every(word =>
                searchableFields.some(field =>
                    field?.toLowerCase().includes(word)
                )
            );
    });

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            <div className="flex flex-col flex-1 ml-56">
                <TrialBanner userEmail={userEmail} />
                <Header userEmail={userEmail} onLogout={handleLogout} />
                <div className="flex-1 overflow-auto">
                    <div className="w-full">
                        {/* Header Bonsai Style */}
                        <div className="bg-white border-b border-gray-200 px-6 py-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
                                    <p className="mt-1 text-sm text-gray-600">
                                        Gestiona tu cartera de {clients.length} clientes
                                    </p>
                                </div>
                                <button
                                    onClick={handleNewClientClick}
                                    disabled={trialLoading || (!canUseFeatures || hasReachedLimit('clients'))}
                                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${trialLoading
                                        ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-wait'
                                        : (!canUseFeatures || hasReachedLimit('clients'))
                                            ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                                            : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700'
                                        }`}
                                >
                                    {trialLoading ? (
                                        <>
                                            <div className="w-4 h-4 mr-2 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                            Cargando...
                                        </>
                                    ) : (!canUseFeatures || hasReachedLimit('clients')) ? (
                                        <>
                                            <X className="w-4 h-4 mr-2" />
                                            Trial Expirado
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Nuevo Cliente
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Stats Section */}
                        <div className="bg-white border-b border-gray-200 px-6 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <Users className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Total</p>
                                            <p className="text-2xl font-semibold text-gray-900">{clients.length}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <Building className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Con Empresa</p>
                                            <p className="text-2xl font-semibold text-gray-900">
                                                {clients.filter(client => client.company).length}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <Mail className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Con Email</p>
                                            <p className="text-2xl font-semibold text-gray-900">
                                                {clients.filter(client => client.email).length}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <Phone className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Con Teléfono</p>
                                            <p className="text-2xl font-semibold text-gray-900">
                                                {clients.filter(client => client.phone).length}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Search and Filters */}
                        <div className="bg-white border-b border-gray-200 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 max-w-lg">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            ref={(el) => setSearchInputRef(el)}
                                            type="text"
                                            placeholder="Buscar clientes por nombre, empresa, email..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm('')}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            >
                                                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="ml-4 flex items-center space-x-2">
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-2 rounded-lg ${viewMode === 'list'
                                            ? 'bg-blue-100 text-blue-600'
                                            : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        <List className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('cards')}
                                        className={`p-2 rounded-lg ${viewMode === 'cards'
                                            ? 'bg-blue-100 text-blue-600'
                                            : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        <Grid3X3 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Clients Content */}
                        <div className="bg-white px-6 py-6">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse"></div>
                                        <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                </div>
                            ) : filteredClients.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                                        {searchTerm ? 'No se encontraron clientes' : 'No hay clientes'}
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {searchTerm
                                            ? `No hay clientes que coincidan con "${searchTerm}"`
                                            : 'Comienza creando tu primer cliente.'
                                        }
                                    </p>
                                    {!searchTerm && (
                                        <div className="mt-6">
                                            <button
                                                onClick={handleNewClientClick}
                                                disabled={trialLoading || (!canUseFeatures || hasReachedLimit('clients'))}
                                                className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${trialLoading
                                                    ? 'bg-gray-400 cursor-wait'
                                                    : (!canUseFeatures || hasReachedLimit('clients'))
                                                        ? 'bg-gray-400 cursor-not-allowed'
                                                        : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                                                    }`}
                                            >
                                                {trialLoading ? (
                                                    <>
                                                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        Cargando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Nuevo Cliente
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : viewMode === 'list' ? (
                                /* Vista Lista */
                                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-300">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Cliente
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Contacto
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Ubicación
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Creado
                                                </th>
                                                <th className="relative px-6 py-3">
                                                    <span className="sr-only">Acciones</span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredClients.map((client) => (
                                                <tr key={client.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 h-10 w-10">
                                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                                    <span className="text-sm font-medium text-blue-800">
                                                                        {getInitials(client.name)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {client.name}
                                                                </div>
                                                                {client.company && (
                                                                    <div className="text-sm text-gray-500">
                                                                        {client.company}
                                                                    </div>
                                                                )}
                                                                {client.tag && (
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                                                        {client.tag}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {client.email && (
                                                            <div className="flex items-center">
                                                                <Mail className="h-4 w-4 text-gray-400 mr-2" />
                                                                {client.email}
                                                            </div>
                                                        )}
                                                        {client.phone && (
                                                            <div className="flex items-center mt-1">
                                                                <Phone className="h-4 w-4 text-gray-400 mr-2" />
                                                                {client.phone}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {client.city && client.province && (
                                                            <div>{client.city}, {client.province}</div>
                                                        )}
                                                        {client.address && (
                                                            <div className="text-xs">{client.address}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(client.created_at).toLocaleDateString('es-ES')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex items-center space-x-2">
                                                            <Link href={`/dashboard/clients/${client.id}`}>
                                                                <button className="text-blue-600 hover:text-blue-900 text-sm">
                                                                    Ver
                                                                </button>
                                                            </Link>
                                                            <button
                                                                onClick={() => startEdit(client)}
                                                                className="text-gray-600 hover:text-gray-900"
                                                            >
                                                                <Edit3 className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteClient(client.id)}
                                                                className="text-red-600 hover:text-red-900"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                /* Vista Cards */
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {filteredClients.map((client) => (
                                        <div key={client.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                            <div className="p-6">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0">
                                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                            <span className="text-sm font-medium text-blue-800">
                                                                {getInitials(client.name)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-4 flex-1">
                                                        <h3 className="text-lg font-medium text-gray-900 truncate">
                                                            {client.name}
                                                        </h3>
                                                        {client.company && (
                                                            <p className="text-sm text-gray-500 truncate">
                                                                {client.company}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {client.tag && (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            {client.tag}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-4 space-y-2">
                                                    {client.email && (
                                                        <div className="flex items-center text-sm text-gray-600">
                                                            <Mail className="h-4 w-4 text-gray-400 mr-2" />
                                                            <span className="truncate">{client.email}</span>
                                                        </div>
                                                    )}
                                                    {client.phone && (
                                                        <div className="flex items-center text-sm text-gray-600">
                                                            <Phone className="h-4 w-4 text-gray-400 mr-2" />
                                                            {client.phone}
                                                        </div>
                                                    )}
                                                    {client.city && client.province && (
                                                        <div className="flex items-center text-sm text-gray-600">
                                                            <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                                                            <span className="truncate">{client.city}, {client.province}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-4 flex items-center justify-between">
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(client.created_at).toLocaleDateString('es-ES')}
                                                    </span>
                                                    <div className="flex space-x-2">
                                                        <Link href={`/dashboard/clients/${client.id}`}>
                                                            <button className="text-sm text-blue-600 hover:text-blue-800">
                                                                Ver
                                                            </button>
                                                        </Link>
                                                        <button
                                                            onClick={() => startEdit(client)}
                                                            className="text-gray-400 hover:text-gray-600"
                                                        >
                                                            <Edit3 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteClient(client.id)}
                                                            className="text-gray-400 hover:text-red-600"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Nuevo Cliente */}
            {showForm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b">
                            <h3 className="text-lg font-medium text-gray-900">
                                Nuevo Cliente
                            </h3>
                            <button
                                onClick={() => setShowForm(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); addClient(); }} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nombre *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">NIF/CIF *</label>
                                    <input
                                        type="text"
                                        value={formData.nif}
                                        onChange={(e) => setFormData({ ...formData, nif: e.target.value.toUpperCase() })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Empresa</label>
                                    <input
                                        type="text"
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Etiqueta</label>
                                    <input
                                        type="text"
                                        value={formData.tag}
                                        onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Provincia *</label>
                                    <select
                                        value={formData.province}
                                        onChange={(e) => handleProvinceChange(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        required
                                    >
                                        <option value="">Selecciona una provincia</option>
                                        {getProvinceNames().map((province, index) => (
                                            <option key={`form-province-${province}-${index}`} value={province}>
                                                {province}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Ciudad *</label>
                                    <select
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        required
                                        disabled={!formData.province}
                                    >
                                        <option value="">
                                            {formData.province ? 'Selecciona una ciudad' : 'Primero selecciona una provincia'}
                                        </option>
                                        {availableCities.map((city, index) => (
                                            <option key={`${city}-${index}`} value={city}>
                                                {city}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Dirección</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {loading ? 'Guardando...' : 'Guardar Cliente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Editar Cliente */}
            {showEditForm && editingClient && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b">
                            <h3 className="text-lg font-medium text-gray-900">
                                Editar Cliente
                            </h3>
                            <button
                                onClick={cancelEdit}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); updateClient(); }} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nombre *</label>
                                    <input
                                        type="text"
                                        value={editFormData.name}
                                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">NIF/CIF *</label>
                                    <input
                                        type="text"
                                        value={editFormData.nif}
                                        onChange={(e) => setEditFormData({ ...editFormData, nif: e.target.value.toUpperCase() })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        value={editFormData.email}
                                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                                    <input
                                        type="text"
                                        value={editFormData.phone}
                                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Empresa</label>
                                    <input
                                        type="text"
                                        value={editFormData.company}
                                        onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Etiqueta</label>
                                    <input
                                        type="text"
                                        value={editFormData.tag}
                                        onChange={(e) => setEditFormData({ ...editFormData, tag: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Provincia *</label>
                                    <select
                                        value={editFormData.province}
                                        onChange={(e) => handleEditProvinceChange(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        required
                                    >
                                        <option value="">Selecciona una provincia</option>
                                        {getProvinceNames().map((province, index) => (
                                            <option key={`edit-province-${province}-${index}`} value={province}>
                                                {province}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Ciudad *</label>
                                    <select
                                        value={editFormData.city}
                                        onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        required
                                        disabled={!editFormData.province}
                                    >
                                        <option value="">
                                            {editFormData.province ? 'Selecciona una ciudad' : 'Primero selecciona una provincia'}
                                        </option>
                                        {editAvailableCities.map((city, index) => (
                                            <option key={`edit-${city}-${index}`} value={city}>
                                                {city}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Dirección</label>
                                    <input
                                        type="text"
                                        value={editFormData.address}
                                        onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {loading ? 'Actualizando...' : 'Actualizar Cliente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
