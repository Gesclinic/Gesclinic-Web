import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation, validators, composeValidators } from '@/hooks/useFormValidation';
import { maskCPF, maskPhone, maskCEP, maskDate, maskCurrency, maskCNPJ } from '@/components/MaskedInput';

/**
 * Testes para useFormValidation Hook
 */
describe('useFormValidation Hook', () => {
  it('inicializa com valores padrão', () => {
    const { result } = renderHook(() =>
      useFormValidation({ email: '', password: '' }, null)
    );

    expect(result.current.values).toEqual({ email: '', password: '' });
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isValid).toBe(true);
  });

  it('atualiza valores com setFieldValue', () => {
    const { result } = renderHook(() =>
      useFormValidation({ email: '' }, null)
    );

    act(() => {
      result.current.setFieldValue('email', 'teste@email.com');
    });

    expect(result.current.values.email).toBe('teste@email.com');
  });

  it('marca campo como touched', () => {
    const { result } = renderHook(() =>
      useFormValidation({ email: '' }, null)
    );

    act(() => {
      result.current.setFieldTouched('email', true);
    });

    expect(result.current.touched.email).toBe(true);
  });

  it('reseta o formulário', () => {
    const initialValues = { email: '', password: '' };
    const { result } = renderHook(() =>
      useFormValidation(initialValues, null)
    );

    act(() => {
      result.current.setFieldValue('email', 'teste@email.com');
      result.current.setFieldTouched('email', true);
    });

    expect(result.current.values.email).toBe('teste@email.com');

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.values.email).toBe('');
    expect(result.current.touched).toEqual({});
  });
});

/**
 * Testes para Validadores
 */
describe('Validadores', () => {
  describe('validators.required', () => {
    it('retorna erro para valor vazio', () => {
      const result = validators.required('Email')('');
      expect(result.error).toBe('Email é obrigatório');
    });

    it('retorna erro para espaços em branco', () => {
      const result = validators.required('Email')('   ');
      expect(result.error).toBe('Email é obrigatório');
    });

    it('retorna OK para valor preenchido', () => {
      const result = validators.required('Email')('teste@email.com');
      expect(result.error).toBeNull();
    });
  });

  describe('validators.email', () => {
    it('retorna erro para email inválido', () => {
      const result = validators.email('teste@');
      expect(result.error).toBe('Email inválido');
    });

    it('aceita email válido', () => {
      const result = validators.email('teste@email.com');
      expect(result.error).toBeNull();
    });

    it('aceita email com subdomain', () => {
      const result = validators.email('user@mail.domain.com');
      expect(result.error).toBeNull();
    });
  });

  describe('validators.minLength', () => {
    it('retorna erro para string curta', () => {
      const result = validators.minLength(5, 'Senha')('abc');
      expect(result.error).toBe('Senha deve ter no mínimo 5 caracteres');
    });

    it('retorna OK para string com comprimento mínimo', () => {
      const result = validators.minLength(5, 'Senha')('abcde');
      expect(result.error).toBeNull();
    });
  });

  describe('validators.phone', () => {
    it('retorna erro para telefone inválido', () => {
      const result = validators.phone('123');
      expect(result.error).toBe('Telefone inválido (use formato: (11) 9999-9999)');
    });

    it('aceita telefone válido', () => {
      const result = validators.phone('(11) 98765-4321');
      expect(result.error).toBeNull();
    });

    it('aceita telefone sem formatação', () => {
      const result = validators.phone('11987654321');
      expect(result.error).toBeNull();
    });
  });

  describe('validators.cpf', () => {
    it('retorna erro para CPF inválido', () => {
      const result = validators.cpf('00000000000');
      expect(result.error).toBe('CPF inválido');
    });

    it('aceita CPF válido', () => {
      // CPF: 123.456.789-09 (válido para teste)
      const result = validators.cpf('12345678909');
      expect(result.error).toBeNull();
    });
  });

  describe('composeValidators', () => {
    it('aplica múltiplos validadores em sequência', () => {
      const validate = composeValidators(
        validators.required('Email'),
        validators.email
      );

      const resultEmpty = validate('');
      expect(resultEmpty.error).toContain('obrigatório');

      const resultInvalid = validate('teste@');
      expect(resultInvalid.error).toContain('Email inválido');

      const resultValid = validate('teste@email.com');
      expect(resultValid.error).toBeNull();
    });
  });
});

/**
 * Testes para Máscaras
 */
describe('Máscaras de Input', () => {
  describe('maskCPF', () => {
    it('retorna vazio para entrada vazia', () => {
      expect(maskCPF('')).toBe('');
    });

    it('formata CPF corretamente', () => {
      expect(maskCPF('12345678901')).toBe('123.456.789-01');
    });

    it('ignora caracteres não numéricos', () => {
      expect(maskCPF('123.456.789-01')).toBe('123.456.789-01');
    });

    it('limita a 11 dígitos', () => {
      expect(maskCPF('123456789012345')).toBe('123.456.789-01');
    });
  });

  describe('maskPhone', () => {
    it('formata telefone corretamente', () => {
      expect(maskPhone('11987654321')).toBe('(11) 98765-4321');
    });

    it('ignora caracteres não numéricos', () => {
      expect(maskPhone('(11) 98765-4321')).toBe('(11) 98765-4321');
    });
  });

  describe('maskCEP', () => {
    it('formata CEP corretamente', () => {
      expect(maskCEP('01310100')).toBe('01310-100');
    });

    it('limita a 8 dígitos', () => {
      expect(maskCEP('01310100123')).toBe('01310-100');
    });
  });

  describe('maskDate', () => {
    it('formata data corretamente', () => {
      expect(maskDate('15012026')).toBe('15/01/2026');
    });

    it('limita a 8 dígitos', () => {
      expect(maskDate('150120261234')).toBe('15/01/2026');
    });
  });

  describe('maskCurrency', () => {
    it('formata valor monetário', () => {
      expect(maskCurrency('12345')).toBe('R$ 123,45');
    });

    it('ignora caracteres não numéricos', () => {
      expect(maskCurrency('R$ 123,45')).toBe('R$ 123,45');
    });
  });

  describe('maskCNPJ', () => {
    it('formata CNPJ corretamente', () => {
      expect(maskCNPJ('12345678901234')).toBe('12.345.678/0001-34');
    });

    it('limita a 14 dígitos', () => {
      expect(maskCNPJ('123456789012345')).toBe('12.345.678/0001-34');
    });
  });
});

/**
 * Testes de Integração
 */
describe('Integração: Validação + Máscaras', () => {
  it('valida CPF formatado', () => {
    const cpfFormatado = maskCPF('12345678901');
    const validation = validators.cpf(cpfFormatado);
    expect(validation.error).toBeNull();
  });

  it('valida telefone após formatação', () => {
    const phoneFormatado = maskPhone('11987654321');
    const validation = validators.phone(phoneFormatado);
    expect(validation.error).toBeNull();
  });

  it('rejeita CPF inválido mesmo após formatação', () => {
    const cpfFormatado = maskCPF('00000000000');
    const validation = validators.cpf(cpfFormatado);
    expect(validation.error).not.toBeNull();
  });
});

/**
 * Testes de Fluxo
 */
describe('Fluxo de Formulário Completo', () => {
  it('fluxo: preencher → validar → submeter', async () => {
    const handleSubmit = vi.fn();
    const { result } = renderHook(() =>
      useFormValidation(
        { email: '', password: '' },
        async (fieldName, value) => {
          if (fieldName === 'email') return validators.email(value);
          if (fieldName === 'password') {
            return validators.minLength(8, 'Senha')(value);
          }
          return { error: null };
        }
      )
    );

    // 1. Preencher email
    act(() => {
      result.current.setFieldValue('email', 'teste@email.com');
    });

    expect(result.current.values.email).toBe('teste@email.com');

    // 2. Validar email
    act(() => {
      result.current.setFieldTouched('email', true);
    });

    // 3. Preencher senha
    act(() => {
      result.current.setFieldValue('password', 'senhaForte123');
    });

    // 4. Validar tudo
    const allValid = await act(async () => {
      return await result.current.validateAll();
    });

    expect(allValid).toBe(true);
  });
});
