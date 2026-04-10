import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import PatientRecordTabs from '@/components/prontuario/PatientRecordTabs';
import { bloodTypes, maritalStatuses, genders, ptBrStates } from '@/lib/formData';

const PatientTabs = ({ paciente, setPaciente, isNew }) => {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [isEditing, setIsEditing] = useState(isNew);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dados');

  // Função utilitária para formatar data DD/MM/YYYY
  function formatDateBR(dateStr) {
    if (!dateStr) return '';
    // Espera formato YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ssZ
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return dateStr;
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  useEffect(() => {
    setIsEditing(isNew);
  }, [isNew]);

  const handleInputChange = (field) => (e) => {
    setPaciente({ ...paciente, [field]: e.target.value });
  };

  const handleSelectChange = (field) => (value) => {
    setPaciente({ ...paciente, [field]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Filtro super restritivo: só permite campos válidos e remove qualquer variante de telefone/celular
    const allowedFields = [
      'id', 'clinic_id','full_name', 'cpf', 'rg', 'birth_date', 'sexo', 'marital_status', 'email',
      'phone', 'cell_phone', 'street', 'number', 'complement', 'neighborhood', 'city', 'state', 'zip_code',
      'mother_name', 'father_name', 'responsible_name', 'responsible_relationship', 'responsible_document',
      'emergency_contact', 'insurance_name', 'insurance_plan', 'insurance_number', 'insurance_validity',
      'cns_number', 'company_name', 'profession_id', 'education_level_id', 'blood_type_id', 'religion_id',
      'ethnicity_id', 'discovery_source_id', 'observations', 'notes', 'clinical_notes', 'inactive', 'deceased', 'death_date', 'record_number', 'gender'
    ];
    
    const dataToSave = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(paciente, key)) {
        dataToSave[key] = paciente[key];
      }
    }
    
    // Remover explicitamente qualquer campo variante de telefone/celular
    delete dataToSave.telefone;
    delete dataToSave.cellphone;
    delete dataToSave.celular;

    if (!paciente.full_name) {
      toast({
        variant: "destructive",
        title: "Erro de Validação",
        description: "O nome completo do paciente é obrigatório.",
      });
      setIsLoading(false);
      return;
    }
    
    if (!clinicId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "ID da clínica não encontrado. Por favor, recarregue a página.",
      });
      setIsLoading(false);
      return;
    }

    try {
      let response;
      // Remove id for insert operations to let the database generate it
      if (isNew) {
        delete dataToSave.id;
        response = await supabase.from('patients').insert([{ ...dataToSave, clinic_id: clinicId }]).select();
      } else {
        response = await supabase.from('patients').update(dataToSave).eq('id', paciente.id).select();
      }

      const { data, error } = response;
      if (error) throw error;

      // Update state with the returned data from supabase
      if (data && data.length > 0) {
        setPaciente(data[0]);
      }

      setIsEditing(false);
      toast({
        title: "Sucesso!",
        description: "Dados do paciente salvos.",
      });
    } catch (error) {
      console.error('Error saving patient:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar os dados do paciente. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex justify-between items-center mb-4">
        <TabsList>
          <TabsTrigger value="dados">Dados Cadastrais</TabsTrigger>
          <TabsTrigger value="prontuario" disabled={isNew}>Prontuário</TabsTrigger>
        </TabsList>
        {activeTab === 'dados' && !isEditing && !isNew && (
            <Button onClick={() => setIsEditing(true)}>Editar</Button>
        )}
      </div>

      <TabsContent value="dados">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Paciente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <fieldset disabled={!isEditing} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="record_number">Prontuário</Label>
                    <Input id="record_number" value={paciente.record_number || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input id="full_name" value={paciente.full_name || ''} onChange={handleInputChange('full_name')} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Data de Nascimento</Label>
                    {/* Exibe a data formatada quando não está editando */}
                    {!isEditing && paciente.birth_date && (
                      <div style={{ marginBottom: 4, fontWeight: 500 }}>
                        {formatDateBR(paciente.birth_date)}
                      </div>
                    )}
                    <Input id="birth_date" type="date" value={paciente.birth_date || ''} onChange={handleInputChange('birth_date')} style={isEditing ? {} : { display: 'none' }} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input id="cpf" value={paciente.cpf || ''} onChange={handleInputChange('cpf')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rg">RG</Label>
                    <Input id="rg" value={paciente.rg || ''} onChange={handleInputChange('rg')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={paciente.email || ''} onChange={handleInputChange('email')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cell_phone">Celular</Label>
                    {/* Campo Celular correto */}
                    <Input id="cell_phone" value={paciente.cell_phone || ''} onChange={handleInputChange('cell_phone')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone Fixo</Label>
                    {/* Campo Telefone correto */}
                    <Input id="phone" value={paciente.phone || ''} onChange={handleInputChange('phone')} />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="sexo">Gênero</Label>
                    <Select onValueChange={handleSelectChange('sexo')} value={paciente.sexo || ''}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {genders.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="marital_status">Estado Civil</Label>
                    <Select onValueChange={handleSelectChange('marital_status')} value={paciente.marital_status || ''}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {maritalStatuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="blood_type">Tipo Sanguíneo</Label>
                    <Select onValueChange={handleSelectChange('blood_type')} value={paciente.blood_type || ''}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {bloodTypes.map(bt => <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <h3 className="text-lg font-semibold border-t pt-4 mt-4">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zip_code">CEP</Label>
                    <Input id="zip_code" value={paciente.zip_code || ''} onChange={handleInputChange('zip_code')} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="street">Endereço</Label>
                    <Input id="street" value={paciente.street || ''} onChange={handleInputChange('street')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number">Número</Label>
                    <Input id="number" value={paciente.number || ''} onChange={handleInputChange('number')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input id="complement" value={paciente.complement || ''} onChange={handleInputChange('complement')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input id="neighborhood" value={paciente.neighborhood || ''} onChange={handleInputChange('neighborhood')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" value={paciente.city || ''} onChange={handleInputChange('city')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Select onValueChange={handleSelectChange('state')} value={paciente.state || ''}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {ptBrStates.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <h3 className="text-lg font-semibold border-t pt-4 mt-4">Informações Adicionais</h3>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações Gerais</Label>
                  <Textarea id="notes" value={paciente.notes || ''} onChange={handleInputChange('notes')} />
                </div>
                
                {isEditing && (
                  <div className="flex justify-end space-x-2 pt-4">
                    {!isNew && (
                      <Button variant="outline" type="button" onClick={() => setIsEditing(false)}>Cancelar</Button>
                    )}
                    <Button type="submit" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar'}</Button>
                  </div>
                )}
              </fieldset>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="prontuario">
        <PatientRecordTabs patient={paciente} />
      </TabsContent>
    </Tabs>
  );
};

export default PatientTabs;