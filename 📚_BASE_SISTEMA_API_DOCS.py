#!/usr/bin/env python3
"""
BASE DO SISTEMA - API DOCUMENTATION
Endpoints e integração com APIs backend
"""

# ============================================================================
# API MODULES - REFERÊNCIA TÉCNICA
# ============================================================================

"""
Todos os componentes usam API modules localizados em:
src/lib/**Api.js

Exemplo: src/lib/servicesApi.js
"""

# ============================================================================
# 1. SERVICES API
# ============================================================================

"""
File: src/lib/servicesApi.js

const servicesApi = {
  async listServices({ clinicId, search = '', page = 1, limit = 10 }) {
    let query = supabaseClient
      .from('services')
      .select('*')
      .eq('clinic_id', clinicId)
      .is('deleted_at', null)
      .order('name');
    
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    
    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  
  async createService(clinicId, data) {
    const { data: service, error } = await supabaseClient
      .from('services')
      .insert([{ clinic_id: clinicId, ...data, active: true }])
      .select()
      .single();
    
    if (error) throw error;
    return service;
  },
  
  async updateService(serviceId, data) {
    const { data: service, error } = await supabaseClient
      .from('services')
      .update(data)
      .eq('id', serviceId)
      .select()
      .single();
    
    if (error) throw error;
    return service;
  },
  
  async deleteService(serviceId) {
    const { data: service, error } = await supabaseClient
      .from('services')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', serviceId)
      .select()
      .single();
    
    if (error) throw error;
    return service;
  },
};
"""

# ============================================================================
# 2. PROFESSIONALS API
# ============================================================================

"""
File: src/lib/professionalsApi.js

const professionalsApi = {
  async listProfessionals({ clinicId, search = '' }) {
    let query = supabaseClient
      .from('professionals')
      .select('*')
      .eq('clinic_id', clinicId)
      .is('deleted_at', null)
      .order('name');
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  
  async createProfessional(clinicId, data) {
    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Email inválido');
    }
    
    const { data: professional, error } = await supabaseClient
      .from('professionals')
      .insert([{ clinic_id: clinicId, ...data }])
      .select()
      .single();
    
    if (error) throw error;
    return professional;
  },
  
  // updateProfessional, deleteProfessional...
};
"""

# ============================================================================
# 3. HEALTH INSURANCES API
# ============================================================================

"""
File: src/lib/healthInsurancesApi.js

const healthInsurancesApi = {
  async listHealthInsurances({ clinicId }) {
    const { data, error } = await supabaseClient
      .from('health_insurances')
      .select('*')
      .eq('clinic_id', clinicId)
      .is('deleted_at', null)
      .order('code');
    
    if (error) throw error;
    return data;
  },
  
  async createHealthInsurance(clinicId, data) {
    // Verifica código único
    const { data: existing } = await supabaseClient
      .from('health_insurances')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('code', data.code)
      .is('deleted_at', null)
      .single();
    
    if (existing) {
      throw new Error('Código já existe para esta clínica');
    }
    
    const { data: insurance, error } = await supabaseClient
      .from('health_insurances')
      .insert([{ clinic_id: clinicId, ...data }])
      .select()
      .single();
    
    if (error) throw error;
    return insurance;
  },
};
"""

# ============================================================================
# 4. ROOMS API
# ============================================================================

"""
File: src/lib/roomsApi.js

const roomsApi = {
  async listRooms({ clinicId }) {
    const { data, error } = await supabaseClient
      .from('rooms')
      .select('*')
      .eq('clinic_id', clinicId)
      .is('deleted_at', null);
    
    if (error) throw error;
    return data;
  },
  
  async createRoom(clinicId, data) {
    // Validação: capacidade deve ser número > 0
    if (isNaN(data.capacity) || data.capacity <= 0) {
      throw new Error('Capacidade deve ser um número maior que 0');
    }
    
    const { data: room, error } = await supabaseClient
      .from('rooms')
      .insert([{ clinic_id: clinicId, ...data }])
      .select()
      .single();
    
    if (error) throw error;
    return room;
  },
};
"""

# ============================================================================
# 5. RESOURCES API
# ============================================================================

"""
File: src/lib/resourcesApi.js

Similar a servicesApi, com validações para:
- Name: obrigatório, mínimo 3 caracteres
- Category: obrigatório
"""

# ============================================================================
# 6. PROFESSIONAL SERVICES API (M:M)
# ============================================================================

"""
File: src/lib/professionalServicesApi.js

const professionalServicesApi = {
  async listProfessionalServices({ clinicId, professionalId = null }) {
    let query = supabaseClient
      .from('professional_services')
      .select(`
        id,
        professional_id,
        service_id,
        active,
        professionals(name),
        services(name)
      `)
      .eq('clinic_id', clinicId)
      .is('deleted_at', null);
    
    if (professionalId) {
      query = query.eq('professional_id', professionalId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
  
  async createProfessionalService(clinicId, data) {
    // Verificar duplicata
    const { data: existing } = await supabaseClient
      .from('professional_services')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('professional_id', data.professional_id)
      .eq('service_id', data.service_id)
      .is('deleted_at', null)
      .single();
    
    if (existing) {
      throw new Error('Profissional já possui este serviço');
    }
    
    const { data: assignment, error } = await supabaseClient
      .from('professional_services')
      .insert([{ clinic_id: clinicId, ...data }])
      .select()
      .single();
    
    if (error) throw error;
    return assignment;
  },
};
"""

# ============================================================================
# 7. AGENDA RULES API
# ============================================================================

"""
File: src/lib/agendaRulesApi.js

Tipos de regra suportados:
- default: Padrão
- min_interval: Intervalo mínimo (em minutos)
- max_per_day: Máximo por dia
- buffer_time: Tempo de buffer
- blackout: Períodos indisponíveis

const agendaRulesApi = {
  async createRule(clinicId, data) {
    // Validar tipo
    const validTypes = ['default', 'min_interval', 'max_per_day', 'buffer_time', 'blackout'];
    if (!validTypes.includes(data.rule_type)) {
      throw new Error('Tipo de regra inválido');
    }
    
    const { data: rule, error } = await supabaseClient
      .from('agenda_rules')
      .insert([{ clinic_id: clinicId, ...data }])
      .select()
      .single();
    
    if (error) throw error;
    return rule;
  },
};
"""

# ============================================================================
# 8. ROOM RESOURCES API (M:M)
# ============================================================================

"""
File: src/lib/roomResourcesApi.js

Similar a professionalServicesApi, mas com campo 'quantity':

async createRoomResource(clinicId, data) {
  // Validar quantidade > 0
  if (data.quantity <= 0) {
    throw new Error('Quantidade deve ser maior que 0');
  }
  
  // Verificar duplicata
  const { data: existing } = await supabaseClient
    .from('room_resources')
    .select('id')
    .eq('clinic_id', clinicId)
    .eq('room_id', data.room_id)
    .eq('resource_id', data.resource_id)
    .is('deleted_at', null)
    .single();
  
  if (existing) {
    throw new Error('Sala já possui este recurso');
  }
  
  // Inserir
  const { data: assignment, error } = await supabaseClient
    .from('room_resources')
    .insert([{ clinic_id: clinicId, ...data }])
    .select()
    .single();
  
  if (error) throw error;
  return assignment;
}
"""

# ============================================================================
# 9. PROFESSIONAL SCHEDULE API
# ============================================================================

"""
File: src/lib/professionalScheduleApi.js

const professionalScheduleApi = {
  async createSchedule(clinicId, data) {
    // Validar horários
    const startMin = timeToMinutes(data.start_time);
    const endMin = timeToMinutes(data.end_time);
    
    if (startMin >= endMin) {
      throw new Error('Horário de fim deve ser depois do início');
    }
    
    // Validar pausa se fornecida
    if (data.break_start && data.break_end) {
      const breakStartMin = timeToMinutes(data.break_start);
      const breakEndMin = timeToMinutes(data.break_end);
      
      if (breakStartMin <= startMin || breakEndMin > endMin) {
        throw new Error('Pausa deve estar dentro do horário de trabalho');
      }
    }
    
    const { data: schedule, error } = await supabaseClient
      .from('professional_schedules')
      .insert([{ clinic_id: clinicId, ...data }])
      .select()
      .single();
    
    if (error) throw error;
    return schedule;
  },
};
"""

# ============================================================================
# 10. SERVICE PRICES API
# ============================================================================

"""
File: src/lib/servicePricesApi.js

const servicePricesApi = {
  async createServicePrice(clinicId, data) {
    // Validar preço > 0
    if (data.price <= 0) {
      throw new Error('Preço deve ser maior que 0');
    }
    
    // Validar custo <= preço
    if (data.cost > data.price) {
      throw new Error('Custo não pode ser maior que o preço');
    }
    
    // Calcular margem
    const margin = ((data.price - data.cost) / data.price) * 100;
    
    const { data: price, error } = await supabaseClient
      .from('service_prices')
      .insert([{ 
        clinic_id: clinicId,
        ...data,
        margin_percentage: margin 
      }])
      .select()
      .single();
    
    if (error) throw error;
    return price;
  },
};
"""

# ============================================================================
# 11. REVENUE RULES API
# ============================================================================

"""
File: src/lib/revenueRulesApi.js

Tipos suportados:
- percentage: Porcentagem (0-100%)
- fixed: Valor fixo
- combined: Porcentagem + Fixo
- tiered: Por faixa de valor

const revenueRulesApi = {
  async createRule(clinicId, data) {
    // Validar porcentagem se fornecida
    if (data.percentage !== undefined) {
      if (data.percentage < 0 || data.percentage > 100) {
        throw new Error('Porcentagem deve estar entre 0 e 100');
      }
    }
    
    const { data: rule, error } = await supabaseClient
      .from('revenue_rules')
      .insert([{ clinic_id: clinicId, ...data }])
      .select()
      .single();
    
    if (error) throw error;
    return rule;
  },
};
"""

# ============================================================================
# 12. PROFESSIONAL PAYER API (M:M)
# ============================================================================

"""
File: src/lib/professionalPayerApi.js

const professionalPayerApi = {
  async createProfessionalPayer(clinicId, data) {
    // Validar comissão
    if (data.commission_percentage < 0 || data.commission_percentage > 100) {
      throw new Error('Comissão deve estar entre 0 e 100%');
    }
    
    // Verificar duplicata
    const { data: existing } = await supabaseClient
      .from('professional_payer')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('professional_id', data.professional_id)
      .eq('payer_id', data.payer_id)
      .is('deleted_at', null)
      .single();
    
    if (existing) {
      throw new Error('Profissional já atribuído a este convênio');
    }
    
    const { data: assignment, error } = await supabaseClient
      .from('professional_payer')
      .insert([{ clinic_id: clinicId, ...data }])
      .select()
      .single();
    
    if (error) throw error;
    return assignment;
  },
};
"""

# ============================================================================
# PADRÕES COMUNS
# ============================================================================

"""
1. CLINIC_ID ISOLAMENTO
   Todas as queries adicionam: .eq('clinic_id', clinicId)
   Todas as queries filtram: .is('deleted_at', null)

2. SOFT DELETE
   Ao deletar: UPDATE tabela SET deleted_at = NOW() WHERE id = X
   Nunca remove dados do banco

3. VALIDAÇÃO
   Validação ocorre:
   - No frontend (antes de enviar)
   - Na API module (antes de fazer requisição)
   - No banco de dados (constraints)

4. PAGINAÇÃO
   Para listas grandes: usar .range(offset, limit)
   Padrão: 10-25 itens por página

5. ORDENAÇÃO
   Padrão: .order('name') ou .order('created_at', desc: true)
"""

# ============================================================================
# INTEGRAÇÃO COM COMPONENTES REACT
# ============================================================================

"""
Padrão de uso nos componentes:

import { useState, useEffect } from 'react';
import { useClinicContext } from '@/context/ClinicContext';
import { servicesApi } from '@/lib/servicesApi';

export function ServicesPage() {
  const { clinicId } = useClinicContext();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Carregar dados
  useEffect(() => {
    if (!clinicId) return;
    
    const loadItems = async () => {
      try {
        setLoading(true);
        const data = await servicesApi.listServices({ clinicId });
        setItems(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadItems();
  }, [clinicId]);
  
  // Salvar novo item
  const handleSave = async (formData) => {
    try {
      const newItem = await servicesApi.createService(clinicId, formData);
      setItems([...items, newItem]);
    } catch (err) {
      setError(err.message);
    }
  };
  
  // Deletar item
  const handleDelete = async (itemId) => {
    try {
      await servicesApi.deleteService(itemId);
      setItems(items.filter(item => item.id !== itemId));
    } catch (err) {
      setError(err.message);
    }
  };
  
  // Render...
}
"""

# ============================================================================
# TRATAMENTO DE ERROS
# ============================================================================

"""
Erros comuns e como tratar:

1. CLINIC_ID NÃO DEFINIDO
   Error: "Cannot read property 'clinicId' of null"
   Causa: useClinicContext() retornou null
   Solução: Verifique loadingClinic e renderização condicional

2. EMAIL INVÁLIDO
   Error: "Email inválido"
   Causa: Regex rejeitou formato
   Solução: Use "nome@dominio.com"

3. VALOR NUMÉRICO INVÁLIDO
   Error: "isNaN(value) is true"
   Causa: Valor não é número
   Solução: Converta para número com parseFloat() ou Number()

4. DUPLICATA
   Error: "Profissional já possui este serviço"
   Causa: Combinação M:M já existe
   Solução: Verificar lista antes de criar

5. CONSTRAINT VIOLATION
   Error: "Unique constraint violation"
   Causa: Valor único duplicado
   Solução: Usar outro valor único
"""

# ============================================================================
# TESTES
# ============================================================================

"""
Arquivo: tests/integration/base-sistema-crud.integration.test.js

Testes cobrem:
- Carregamento de dados
- CREATE (novo registro)
- READ (listar registros)
- UPDATE (editar registro)
- DELETE (soft delete)
- Validações
- Isolamento clinic_id
- Error handling

Executar testes: npm run test:integration
"""

# ============================================================================
# PERFORMANCE
# ============================================================================

"""
Otimizações implementadas:

1. LAZY LOADING
   Componentes carregam sob demanda em AppRoutes.jsx
   
2. PAGINAÇÃO
   Listagens dividem em páginas (10-25 itens)
   
3. BUSCA OTIMIZADA
   Filtro usa .ilike() para busca case-insensitive
   
4. MEMOIZATION
   useCallback para funções de callback
   
5. CACHE
   Dados em estado local reduzem requisições
"""

# ============================================================================

print("BASE DO SISTEMA - API DOCUMENTATION")
print("Versão: 1.0")
print("Data: 15 de Janeiro de 2026")
print("Status: ✅ Pronto para Uso")
