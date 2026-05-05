// src/pages/clinica/base-sistema/SalasPage.jsx
// ============================================================
// CRUD Completo de Salas - Base do Sistema com M:M Recursos
// ============================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/ClinicContext';
import BaseSystemHeader from '@/components/layout/BaseSystemHeader';
import { Alert } from '@/components/layout/BaseSystemAlert';
import EmptyState from '@/components/layout/EmptyState';
import * as roomsApi from '@/lib/roomsApi';
import * as servicesApi from '@/lib/servicesApi';
import { ROOM_STATUS } from '@/lib/selectConstants';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Plus, Edit2, Trash2, Check, X, DoorOpen } from 'lucide-react';

export function SalasPage() {
  const { user, isAuthenticated } = useAuth();
  const { clinicId } = useClinicContext();

  // Estado: Listagem
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(false);

  // Estado: Detalhe com M:M Recursos
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [services, setServices] = useState([]);
  const [roomServices, setRoomServices] = useState([]);
  const [roomResources, setRoomResources] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [resourceFormData, setResourceFormData] = useState({
    resource_name: '',
    quantity: 1,
  });

  const [formData, setFormData] = useState({
    name: '',
    room_number: '',
    type: '',
    unit: '',
    floor: '',
    wing: '',
    section: '',
    description: '',
    capacity: 1,
    has_bathroom: false,
    has_ac: false,
    notes: '',
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (clinicId && isAuthenticated) {
      loadRooms();
    }
  }, [clinicId, isAuthenticated]);

  useEffect(() => {
    if (selectedRoom) {
      loadResourcesTab();
    }
  }, [selectedRoom]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await roomsApi.listRooms(clinicId);
      // Filtrar itens nulos e garantir que name e clinic_id existem
      const filteredRooms = Array.isArray(data)
        ? data.filter((room) => room && room.name && room.clinic_id)
        : [];
      setRooms(filteredRooms);
    } catch (err) {
      setError(err.message || 'Erro ao carregar salas');
      console.error('Erro:', err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const loadResourcesTab = async () => {
    if (!selectedRoom) {
      return;
    }
    try {
      setTabLoading(true);
      setError(null);

      // Carregar lista de serviços disponíveis
      const srvs = await servicesApi.listServices(clinicId);
      setServices(Array.isArray(srvs) ? srvs : []);

      // Carregar recursos da sala (se existir API futura)
      // Pode ser parseado do campo resources da sala
      if (selectedRoom?.resources && typeof selectedRoom.resources === 'string') {
        try {
          const parsed = JSON.parse(selectedRoom.resources);
          setRoomResources(Array.isArray(parsed) ? parsed : []);
        } catch {
          setRoomResources([]);
        }
      } else if (Array.isArray(selectedRoom?.resources)) {
        setRoomResources(selectedRoom.resources);
      } else {
        setRoomResources([]);
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar recursos');
      console.error('Erro:', err);
    } finally {
      setTabLoading(false);
    }
  };

  const handleNew = () => {
    setEditingId(null);
    setFormData({
      name: '',
      room_number: '',
      type: '',
      unit: '',
      floor: '',
      wing: '',
      section: '',
      description: '',
      capacity: 1,
      has_bathroom: false,
      has_ac: false,
      notes: '',
      active: true,
    });
    setShowForm(true);
    setError(null);
  };

  const handleEdit = (room) => {
    setEditingId(room.id);
    setFormData({
      name: room.name || '',
      room_number: room.room_number || '',
      type: room.type || '',
      unit: room.unit || '',
      floor: room.floor || '',
      wing: room.wing || '',
      section: room.section || '',
      description: room.description || '',
      capacity: room.capacity || 1,
      has_bathroom: room.has_bathroom || false,
      has_ac: room.has_ac || false,
      notes: room.notes || '',
      active: room.is_active !== false,
    });
    setShowForm(true);
    setError(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      room_number: '',
      type: '',
      unit: '',
      floor: '',
      wing: '',
      section: '',
      description: '',
      capacity: 1,
      has_bathroom: false,
      has_ac: false,
      notes: '',
      active: true,
    });
    setSubmitting(false);
  };

  const handleCloseWithCheck = () => {
    const hasData = Object.entries(formData).some(([key, value]) => {
      if (typeof value === 'string') {
        return value.trim() !== '';
      }
      if (typeof value === 'number') {
        return value !== 0;
      }
      if (typeof value === 'boolean') {
        return value !== true;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return false;
    });

    if (hasData) {
      if (window.confirm('Tem certeza que deseja sair? As alterações não salvas serão perdidas.')) {
        closeForm();
      }
    } else {
      closeForm();
    }
  };

  const closeResourceForm = () => {
    setShowResourceForm(false);
    setResourceFormData({
      resource_name: '',
      quantity: 1,
    });
  };

  const selectRoom = (room) => {
    setSelectedRoom(room);
    setError(null);
  };

  const closeRoomDetail = () => {
    setSelectedRoom(null);
  };

  const addResource = () => {
    if (!resourceFormData.resource_name.trim()) {
      setError('Nome do recurso é obrigatório');
      return;
    }

    if (resourceFormData.quantity < 1) {
      setError('Quantidade deve ser maior que 0');
      return;
    }

    try {
      const newResources = [
        ...roomResources,
        {
          id: Date.now(),
          resource_name: resourceFormData.resource_name.trim(),
          quantity: parseInt(resourceFormData.quantity),
        },
      ];

      setRoomResources(newResources);
      setError(null);
      closeResourceForm();
    } catch (err) {
      setError(err.message || 'Erro ao adicionar recurso');
    }
  };

  const deleteResource = (resourceId) => {
    if (!window.confirm('Tem certeza que deseja remover este recurso?')) {
      return;
    }

    try {
      setRoomResources(roomResources.filter((r) => r.id !== resourceId));
      setError(null);
    } catch (err) {
      setError(err.message || 'Erro ao remover recurso');
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Nome da sala é obrigatório');
      return false;
    }
    if (formData.capacity && isNaN(parseInt(formData.capacity))) {
      setError('Capacidade deve ser um número');
      return false;
    }
    if (parseInt(formData.capacity) < 1) {
      setError('Capacidade deve ser no mínimo 1');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const dataToSave = {
        clinic_id: clinicId,
        name: (formData.name || '').trim(),
        room_number: (formData.room_number || '').trim(),
        type: (formData.type || '').trim() || null,
        unit: (formData.unit || '').trim() || null,
        floor: formData.floor ? parseInt(formData.floor) : null,
        wing: (formData.wing || '').trim() || null,
        section: (formData.section || '').trim() || null,
        description: (formData.description || '').trim(),
        capacity: formData.capacity ? parseInt(formData.capacity) : 1,
        has_bathroom: formData.has_bathroom || false,
        has_ac: formData.has_ac || false,
        notes: (formData.notes || '').trim() || null,
        is_active: formData.active !== undefined ? formData.active : true,
      };

      if (editingId) {
        await roomsApi.updateRoom(editingId, dataToSave);
        setRooms(rooms.map((r) => (r.id === editingId ? { ...r, ...dataToSave } : r)));
      } else {
        const newRoom = await roomsApi.createRoom(dataToSave);
        setRooms([...rooms, newRoom]);
      }

      closeForm();
      loadRooms(); // Recarrega a lista para garantir sincronização
    } catch (err) {
      setError(err.message || 'Erro ao salvar sala');
      console.error('Erro:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Tem certeza que deseja deletar "${name}"?`)) {
      return;
    }

    try {
      setError(null);
      await roomsApi.deleteRoom(id);
      setRooms(rooms.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.message || 'Erro ao deletar sala');
      console.error('Erro:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 w-full">
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  // Detalhe de Sala com M:M Recursos
  if (selectedRoom) {
    return (
      <div className="space-y-6 w-full">
        <button
          onClick={closeRoomDetail}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-2"
        >
          ← Voltar à lista
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{selectedRoom?.name || 'Sem nome'}</h1>
          <p className="text-gray-600 mt-1">Sala {selectedRoom?.room_number || '#'}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Erro</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Informações da Sala */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Informações</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Capacidade</p>
                  <p className="font-medium text-gray-900">{selectedRoom?.capacity || 1} pessoas</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipo</p>
                  <p className="font-medium text-gray-900">{selectedRoom?.type || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Unidade</p>
                  <p className="font-medium text-gray-900">{selectedRoom?.unit || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Descrição</p>
                  <p className="text-sm text-gray-700">{selectedRoom?.description || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recursos */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Recursos</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {tabLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin inline-block">⌛</div>
                  <p className="text-gray-600 mt-2">Carregando...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button
                    onClick={() => setShowResourceForm(true)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Recurso
                  </Button>

                  {showResourceForm && (
                    <div className="border rounded-lg p-4 bg-blue-50">
                      <h4 className="font-medium text-gray-900 mb-3">Novo Recurso</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={resourceFormData.resource_name}
                            onChange={(e) =>
                              setResourceFormData({
                                ...resourceFormData,
                                resource_name: e.target.value,
                              })
                            }
                            placeholder="Ex: Cama, Cadeira, Monitor"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            disabled={submitting}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantidade
                          </label>
                          <input
                            type="number"
                            value={resourceFormData.quantity}
                            onChange={(e) =>
                              setResourceFormData({
                                ...resourceFormData,
                                quantity: parseInt(e.target.value) || 1,
                              })
                            }
                            min="1"
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            disabled={submitting}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={closeResourceForm}
                            variant="outline"
                            className="flex-1 text-sm"
                            disabled={submitting}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={addResource}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm"
                            disabled={submitting}
                          >
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {roomResources.length > 0 ? (
                    <div className="space-y-2">
                      {roomResources.map((resource) => (
                        <div
                          key={resource.id}
                          className="flex items-center justify-between border rounded-lg p-3 bg-gray-50"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{resource.resource_name}</p>
                            <p className="text-sm text-gray-600">Qtd: {resource.quantity}</p>
                          </div>
                          <button
                            onClick={() => deleteResource(resource.id)}
                            className="p-1 hover:bg-red-100 rounded text-red-600 transition"
                            disabled={submitting}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 border rounded-lg bg-gray-50">
                      <p className="text-sm text-gray-600">Nenhum recurso cadastrado</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full mx-auto">
      <BaseSystemHeader
        category="4.1 Cadastros Estruturais"
        title="Salas"
        subtitle="Gerencie as salas da clínica"
      />

      {error && <Alert type="error" title="Aviso" message={error} onClose={() => setError(null)} />}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>Salas Cadastradas ({rooms.length})</CardTitle>
          <Button
            onClick={handleNew}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nova Sala
          </Button>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <EmptyState
              icon={<DoorOpen className="w-12 h-12 mx-auto text-gray-400" />}
              title="Nenhuma sala cadastrada"
              description="Comece criando sua primeira sala para gerenciar os espaços da clínica"
              action={
                <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
                  Cadastrar Primeira Sala
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Capacidade
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Descrição</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((room) =>
                      room && room.id ? (
                        <tr key={room.id} className="border-b hover:bg-gray-50 transition">
                          <td
                            className="py-3 px-4 font-medium text-blue-600 cursor-pointer hover:text-blue-700"
                            onClick={() => selectRoom(room)}
                          >
                            {room?.name || 'Sem nome'}
                          </td>
                          <td className="py-3 px-4 text-gray-600">{room?.type || '-'}</td>
                          <td className="py-3 px-4 text-gray-600">{room?.capacity || '-'}</td>
                          <td className="py-3 px-4 text-gray-600">{room?.description || '-'}</td>
                          <td className="py-3 px-4 text-center">
                            {room?.active ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <Check className="w-3 h-3" />
                                Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <X className="w-3 h-3" />
                                Inativo
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 flex justify-center gap-2">
                            <button
                              onClick={() => handleEdit(room)}
                              className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition"
                              disabled={submitting}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(room.id, room?.name || 'Sem nome')}
                              className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition"
                              disabled={submitting}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ) : null,
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <div className="app-modal-overlay">
          <div className="app-modal-shell app-modal-shell--compact">
            <Card className="app-modal-card app-modal-card--auto shadow-2xl border-0">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-lg shadow-md">
                <div className="flex items-center gap-3">
                  <DoorOpen size={24} className="text-white" />
                  <h2 className="text-xl font-bold text-white">
                    {editingId ? '✏️ Editar Sala' : '➕ Nova Sala'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => handleCloseWithCheck()}
                  className="text-white hover:bg-blue-600 p-2 rounded-full transition-colors"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <CardContent className="app-modal-body p-6 modal-content-scroll">
                <form
                  id="salas-form"
                  onSubmit={handleSubmit}
                  className="space-y-5"
                  style={{ flex: 1, overflow: 'visible' }}
                >
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                    {/* SEÇÃO 1: IDENTIFICAÇÃO DA SALA */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                      <div className="border-b pb-3">
                        <h3 className="text-lg font-bold text-gray-900">
                          🚪 Identificação da Sala
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Informações básicas e tipo de sala
                        </p>
                      </div>

                      {/* Nome */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Nome da Sala <span className="text-red-600 font-bold">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ex: Consultório 1, Sala de Cirurgia A"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          disabled={submitting}
                          autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Nome único e descritivo da sala
                        </p>
                      </div>

                      {/* Número/Identificação e Tipo */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Número/Identificação
                          </label>
                          <input
                            type="text"
                            value={formData.room_number}
                            onChange={(e) =>
                              setFormData({ ...formData, room_number: e.target.value })
                            }
                            placeholder="Ex: 201, A1"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={submitting}
                          />
                          <p className="text-xs text-gray-500 mt-2">Número ou código da sala</p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Tipo de Sala
                          </label>
                          <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            disabled={submitting}
                          >
                            <option value="">Selecione...</option>
                            <option value="Consultório">👨‍⚕️ Consultório</option>
                            <option value="Cirurgia">🏨 Sala de Cirurgia</option>
                            <option value="Exame">🔬 Sala de Exame</option>
                            <option value="Recuperação">🛏️ Recuperação</option>
                            <option value="Espera">⏳ Sala de Espera</option>
                            <option value="Procedimento">📋 Procedimento</option>
                            <option value="Outro">📝 Outro</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-2">Classifique o tipo de sala</p>
                        </div>
                      </div>

                      {/* Unidade */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Unidade/Prédio
                        </label>
                        <input
                          type="text"
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          placeholder="Ex: Prédio Principal, Anexo"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={submitting}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Unidade ou prédio ao qual pertence
                        </p>
                      </div>
                    </div>

                    {/* SEÇÃO 2: LOCALIZAÇÃO */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                      <div className="border-b pb-3">
                        <h3 className="text-lg font-bold text-gray-900">📍 Localização</h3>
                        <p className="text-sm text-gray-600 mt-1">Onde a sala está localizada</p>
                      </div>

                      {/* Andar, Ala/Bloco, Seção */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Andar
                          </label>
                          <input
                            type="number"
                            value={formData.floor}
                            onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                            placeholder="Ex: 1, 2, 3"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={submitting}
                          />
                          <p className="text-xs text-gray-500 mt-2">Número do andar</p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Ala/Bloco
                          </label>
                          <input
                            type="text"
                            value={formData.wing}
                            onChange={(e) => setFormData({ ...formData, wing: e.target.value })}
                            placeholder="Ex: Ala Norte, Bloco A"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={submitting}
                          />
                          <p className="text-xs text-gray-500 mt-2">Ala ou bloco</p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Seção
                          </label>
                          <input
                            type="text"
                            value={formData.section}
                            onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                            placeholder="Ex: A, B, C"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={submitting}
                          />
                          <p className="text-xs text-gray-500 mt-2">Seção ou divisão</p>
                        </div>
                      </div>
                    </div>

                    {/* SEÇÃO 3: CARACTERÍSTICAS */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                      <div className="border-b pb-3">
                        <h3 className="text-lg font-bold text-gray-900">⚙️ Características</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Capacidade e informações da sala
                        </p>
                      </div>

                      {/* Capacidade */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Capacidade (pessoas) <span className="text-red-600 font-bold">*</span>
                        </label>
                        <input
                          type="number"
                          value={formData.capacity}
                          onChange={(e) =>
                            setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })
                          }
                          min="1"
                          placeholder="Ex: 4"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          disabled={submitting}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Capacidade máxima de pessoas na sala
                        </p>
                      </div>

                      {/* Descrição */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Descrição
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({ ...formData, description: e.target.value })
                          }
                          placeholder="Ex: Equipamentos disponíveis, características especiais..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows={3}
                          disabled={submitting}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Detalhes adicionais sobre a sala
                        </p>
                      </div>

                      {/* Observações */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Observações/Notas
                        </label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Notas adicionais, restrições, etc..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows={3}
                          disabled={submitting}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Informações adicionais sobre a sala
                        </p>
                      </div>
                    </div>

                    {/* SEÇÃO 4: AMENIDADES E STATUS */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
                      <div className="border-b pb-3">
                        <h3 className="text-lg font-bold text-gray-900">🏠 Amenidades e Status</h3>
                        <p className="text-sm text-gray-600 mt-1">Recursos e situação da sala</p>
                      </div>

                      {/* Banheiro */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            id="has_bathroom"
                            checked={formData.has_bathroom}
                            onChange={(e) =>
                              setFormData({ ...formData, has_bathroom: e.target.checked })
                            }
                            className="w-5 h-5 rounded border border-gray-300 cursor-pointer accent-blue-600"
                            disabled={submitting}
                          />
                          <span className="text-sm font-semibold text-gray-800 flex-1">
                            Possui Banheiro
                          </span>
                          <span className="text-xs text-gray-500">Banheiro disponível</span>
                        </label>
                      </div>

                      {/* Ar Condicionado */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            id="has_ac"
                            checked={formData.has_ac}
                            onChange={(e) => setFormData({ ...formData, has_ac: e.target.checked })}
                            className="w-5 h-5 rounded border border-gray-300 cursor-pointer accent-blue-600"
                            disabled={submitting}
                          />
                          <span className="text-sm font-semibold text-gray-800 flex-1">
                            Ar Condicionado
                          </span>
                          <span className="text-xs text-gray-500">Sistema de climatização</span>
                        </label>
                      </div>

                      {/* Status */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            id="active"
                            checked={formData.active}
                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                            className="w-5 h-5 rounded border border-gray-300 cursor-pointer accent-blue-600"
                            disabled={submitting}
                          />
                          <span className="text-sm font-semibold text-gray-800 flex-1">
                            Sala Ativa
                          </span>
                          <span className="text-xs text-gray-500">Disponível para agendamento</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </form>
              </CardContent>

              {/* Footer */}
              <div
                style={{ flexShrink: 0 }}
                className="border-t bg-gradient-to-r from-gray-50 to-white px-6 py-4 flex gap-3 justify-end rounded-b-lg"
              >
                <Button
                  type="button"
                  onClick={handleCloseWithCheck}
                  variant="outline"
                  disabled={submitting}
                  className="border-2 border-gray-300 hover:bg-gray-100 font-bold"
                >
                  ✕ Cancelar
                </Button>
                <Button
                  form="salas-form"
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold shadow-lg"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="inline-block animate-spin mr-2">⌛</span>
                      Salvando...
                    </>
                  ) : editingId ? (
                    '✓ Atualizar'
                  ) : (
                    '✓ Criar'
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
