import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabbedForm } from '@/components/forms/TabbedForm';
import { MaskedInput } from '@/components/forms/MaskedInput';
import { ValidatedFormField } from '@/components/forms/ValidatedFormField';

/**
 * Testes de Integração: TabbedForm
 */
describe('TabbedForm - Integração', () => {
  const mockTabs = [
    {
      label: 'Básico',
      description: 'Informações básicas',
      fields: [
        { name: 'name', label: 'Nome Completo', required: true, type: 'text' },
        { name: 'email', label: 'Email', required: true, type: 'email' }
      ]
    },
    {
      label: 'Profissional',
      description: 'Dados profissionais',
      fields: [
        { name: 'crm', label: 'CRM', required: true, type: 'text' },
        { name: 'specialty', label: 'Especialidade', required: true, type: 'select', options: [] }
      ]
    },
    {
      label: 'Confirmação',
      description: 'Revise os dados',
      fields: []
    }
  ];

  const initialValues = {
    name: '',
    email: '',
    crm: '',
    specialty: ''
  };

  it('renderiza todos os abas', () => {
    const handleSubmit = vi.fn();
    render(
      <TabbedForm
        title="Formulário Test"
        tabs={mockTabs}
        initialValues={initialValues}
        onSubmit={handleSubmit}
      />
    );

    expect(screen.getByText('Básico')).toBeInTheDocument();
    expect(screen.getByText('Profissional')).toBeInTheDocument();
    expect(screen.getByText('Confirmação')).toBeInTheDocument();
  });

  it('mostra primeira aba ao renderizar', () => {
    const handleSubmit = vi.fn();
    render(
      <TabbedForm
        title="Formulário Test"
        tabs={mockTabs}
        initialValues={initialValues}
        onSubmit={handleSubmit}
      />
    );

    expect(screen.getByText('Nome Completo')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('navega entre abas com clicks', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <TabbedForm
        title="Formulário Test"
        tabs={mockTabs}
        initialValues={initialValues}
        onSubmit={handleSubmit}
      />
    );

    // Preencher primeira aba
    const nameInput = screen.getByLabelText('Nome Completo');
    const emailInput = screen.getByLabelText('Email');

    await user.type(nameInput, 'João Silva');
    await user.type(emailInput, 'joao@email.com');

    // Clicar em "Próximo"
    const nextButton = screen.getByText('Próximo');
    await user.click(nextButton);

    // Verificar segunda aba
    await waitFor(() => {
      expect(screen.getByLabelText('CRM')).toBeInTheDocument();
    });
  });

  it('valida aba antes de avançar', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <TabbedForm
        title="Formulário Test"
        tabs={mockTabs}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validateBeforeMove={true}
      />
    );

    // Tentar avançar sem preencher
    const nextButton = screen.getByText('Próximo');
    await user.click(nextButton);

    // Deve mostrar erros
    await waitFor(() => {
      expect(screen.getByText(/obrigatório/i)).toBeInTheDocument();
    });

    // Não deve avançar de aba
    expect(screen.getByLabelText('Nome Completo')).toBeInTheDocument();
  });

  it('volta para aba anterior', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <TabbedForm
        title="Formulário Test"
        tabs={mockTabs}
        initialValues={initialValues}
        onSubmit={handleSubmit}
      />
    );

    // Avançar
    const nextButton = screen.getByText('Próximo');
    await user.click(nextButton);

    // Deve estar na segunda aba
    await waitFor(() => {
      expect(screen.getByLabelText('CRM')).toBeInTheDocument();
    });

    // Voltar
    const backButton = screen.getByText('Anterior');
    await user.click(backButton);

    // Deve estar de volta na primeira aba
    await waitFor(() => {
      expect(screen.getByLabelText('Nome Completo')).toBeInTheDocument();
    });
  });

  it('submete formulário com dados de todas as abas', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <TabbedForm
        title="Formulário Test"
        tabs={mockTabs}
        initialValues={initialValues}
        onSubmit={handleSubmit}
      />
    );

    // Preencher primeira aba
    await user.type(screen.getByLabelText('Nome Completo'), 'João Silva');
    await user.type(screen.getByLabelText('Email'), 'joao@email.com');

    // Avançar para segunda aba
    await user.click(screen.getByText('Próximo'));

    await waitFor(() => {
      expect(screen.getByLabelText('CRM')).toBeInTheDocument();
    });

    // Preencher segunda aba
    await user.type(screen.getByLabelText('CRM'), '123456/SP');

    // Avançar para confirmação
    await user.click(screen.getByText('Próximo'));

    // Submeter
    const submitButton = screen.getByText('Confirmar');
    await user.click(submitButton);

    // Verificar chamada
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'João Silva',
          email: 'joao@email.com',
          crm: '123456/SP'
        })
      );
    });
  });

  it('mostra barra de progresso corretamente', () => {
    const handleSubmit = vi.fn();
    render(
      <TabbedForm
        title="Formulário Test"
        tabs={mockTabs}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        showProgress={true}
      />
    );

    expect(screen.getByText(/1 de 3/i)).toBeInTheDocument();
  });
});

/**
 * Testes de Integração: MaskedInput com Validação
 */
describe('MaskedInput - Integração com Validação', () => {
  it('aplica máscara e valida CPF', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <ValidatedFormField
        name="cpf"
        label="CPF"
        maskType="cpf"
        required={true}
        onChange={handleChange}
        validators={[(value) => {
          if (!value) return { error: 'CPF é obrigatório' };
          return { error: null };
        }]}
      />
    );

    const input = screen.getByLabelText('CPF');

    // Digitar CPF sem formatação
    await user.type(input, '12345678901');

    // Deve estar formatado
    await waitFor(() => {
      expect(input.value).toContain('.');
      expect(input.value).toContain('-');
    });
  });

  it('aplica máscara e valida telefone', async () => {
    const user = userEvent.setup();

    render(
      <ValidatedFormField
        name="phone"
        label="Telefone"
        maskType="phone"
        required={true}
      />
    );

    const input = screen.getByLabelText('Telefone');

    await user.type(input, '11987654321');

    await waitFor(() => {
      expect(input.value).toBe('(11) 98765-4321');
    });
  });

  it('aplica máscara e valida moeda', async () => {
    const user = userEvent.setup();

    render(
      <ValidatedFormField
        name="value"
        label="Valor"
        maskType="currency"
        required={true}
      />
    );

    const input = screen.getByLabelText('Valor');

    await user.type(input, '12345');

    await waitFor(() => {
      expect(input.value).toContain('R$');
      expect(input.value).toContain(',');
    });
  });
});

/**
 * Testes de Integração: Fluxo Completo de Cadastro
 */
describe('Fluxo Completo: Cadastro de Profissional', () => {
  const cadastroTabs = [
    {
      label: 'Pessoal',
      fields: [
        { name: 'name', label: 'Nome Completo', required: true, type: 'text' },
        { name: 'cpf', label: 'CPF', required: true, maskType: 'cpf' },
        { name: 'birthDate', label: 'Data de Nascimento', required: true, maskType: 'date' }
      ]
    },
    {
      label: 'Contato',
      fields: [
        { name: 'email', label: 'Email', required: true, type: 'email' },
        { name: 'phone', label: 'Telefone', required: true, maskType: 'phone' }
      ]
    },
    {
      label: 'Profissional',
      fields: [
        { name: 'crm', label: 'CRM', required: true, type: 'text' },
        { name: 'specialty', label: 'Especialidade', required: true, type: 'select' }
      ]
    },
    {
      label: 'Revisão',
      fields: []
    }
  ];

  it('completa cadastro de profissional em múltiplas abas', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <TabbedForm
        title="Cadastro de Profissional"
        tabs={cadastroTabs}
        initialValues={{
          name: '',
          cpf: '',
          birthDate: '',
          email: '',
          phone: '',
          crm: '',
          specialty: ''
        }}
        onSubmit={handleSubmit}
      />
    );

    // ABA 1: Pessoal
    await user.type(screen.getByLabelText('Nome Completo'), 'Dr. João da Silva');
    await user.type(screen.getByLabelText('CPF'), '12345678901');
    await user.type(screen.getByLabelText('Data de Nascimento'), '15011990');

    await user.click(screen.getByText('Próximo'));

    // ABA 2: Contato
    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Email'), 'joao@email.com');
    await user.type(screen.getByLabelText('Telefone'), '11987654321');

    await user.click(screen.getByText('Próximo'));

    // ABA 3: Profissional
    await waitFor(() => {
      expect(screen.getByLabelText('CRM')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('CRM'), '123456/SP');

    await user.click(screen.getByText('Próximo'));

    // ABA 4: Revisão e Submeter
    await waitFor(() => {
      expect(screen.getByText('Confirmar')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Confirmar'));

    // Verificar submissão
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Dr. João da Silva',
          cpf: expect.stringContaining('.'),
          email: 'joao@email.com',
          phone: expect.stringContaining('(11)'),
          crm: '123456/SP'
        })
      );
    });
  });
});

/**
 * Testes de Edge Cases
 */
describe('Edge Cases e Erros', () => {
  it('trata caracteres especiais em máscaras', async () => {
    const user = userEvent.setup();

    render(
      <MaskedInput
        label="CPF"
        maskType="cpf"
      />
    );

    const input = screen.getByLabelText('CPF');

    // Digitar com caracteres especiais
    await user.type(input, '123#456*789@01');

    // Deve filtrar especiais e manter apenas números
    await waitFor(() => {
      const cleanValue = input.value.replace(/\D/g, '');
      expect(cleanValue).toBe('12345678901');
    });
  });

  it('reseta formulário para estado inicial', async () => {
    const user = userEvent.setup();
    const { result } = renderHook(() =>
      useFormValidation({ email: '', name: '' }, null)
    );

    // Preencher
    act(() => {
      result.current.setFieldValue('email', 'teste@email.com');
      result.current.setFieldValue('name', 'João');
    });

    expect(result.current.values.email).toBe('teste@email.com');

    // Resetar
    act(() => {
      result.current.resetForm();
    });

    expect(result.current.values).toEqual({ email: '', name: '' });
  });

  it('trata valores nulos e undefined', () => {
    const { result } = renderHook(() =>
      useFormValidation({ email: null, name: undefined }, null)
    );

    // Deve converter para strings vazias ou valores seguros
    expect(typeof result.current.values.email).toBe('string');
    expect(typeof result.current.values.name).toBe('string');
  });
});
