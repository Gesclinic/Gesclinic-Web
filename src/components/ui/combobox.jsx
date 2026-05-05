import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, ChevronsUpDown, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { NONE } from '@/lib/selectUtils';

/**
 * 🔍 Componente Combobox reutilizável com busca assíncrona.
 * Ideal para campos que precisam consultar o Supabase (ex: pacientes, convênios, etc).
 */
export function Combobox({
  value,
  textValue,
  onValueChange,
  onTextValueChange,
  placeholder = 'Selecione...',
  fetcher,
  minLength = 2, // 🔸 número mínimo de caracteres antes de buscar
  debounceMs = 300, // 🔸 tempo de espera após digitar
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceTimeout = useRef(null);

  /**
   * Faz a requisição ao fetcher de forma controlada.
   */
  const performFetch = useCallback(
    async (query) => {
      if (!fetcher || !query || query.trim().length < minLength) {
        setOptions([]);
        return;
      }
      setLoading(true);
      try {
        const fetchedOptions = await fetcher(query.trim());
        setOptions(fetchedOptions || []);
      } catch (error) {
        console.error('❌ Falha ao buscar opções no Combobox:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [fetcher, minLength],
  );

  /**
   * Debounce — busca automática conforme o usuário digita.
   */
  useEffect(() => {
    if (!textValue || textValue.trim().length < minLength) {
      setOptions([]);
      return;
    }

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      performFetch(textValue);
    }, debounceMs);

    return () => clearTimeout(debounceTimeout.current);
  }, [textValue, performFetch, debounceMs, minLength]);

  /**
   * Seleciona um item da lista.
   */
  const handleSelect = (currentValue) => {
    console.log('🎯 === INÍCIO HANDLESELECT ===');
    console.log('🎯 Combobox handleSelect chamado:', currentValue);
    console.log('🎯 Opções disponíveis:', options);

    const selectedOption = options.find((opt) => opt.value === currentValue);
    console.log('🎯 Opção encontrada:', selectedOption);

    if (selectedOption) {
      const newText = selectedOption.label || '';

      console.log('🎯 Chamando onValueChange com valor:', currentValue);
      console.log('🎯 Chamando onValueChange com texto:', newText);
      console.log('🎯 Tipo da função onValueChange:', typeof onValueChange);

      try {
        if (onValueChange) {
          onValueChange(currentValue, newText);
        }
        if (onTextValueChange) {
          onTextValueChange(newText);
        }
        console.log('✅ Callbacks executados com sucesso');
        setOpen(false);
        console.log('✅ Dropdown fechado');
      } catch (error) {
        console.error('❌ Erro ao executar callbacks:', error);
      }
    } else {
      console.warn('❌ Opção não encontrada para valor:', currentValue);
      console.log(
        '❌ Valores de opções disponíveis:',
        options.map((o) => o.value),
      );
    }

    console.log('🎯 === FIM HANDLESELECT ===');
  };

  /**
   * Atualiza o texto conforme o usuário digita.
   */
  const handleInputChange = (e) => {
    const newText = e.target.value;
    if (onTextValueChange) {
      onTextValueChange(newText);
    }
  };

  /**
   * Limpa seleção atual.
   */
  const clearSelection = (e) => {
    e.stopPropagation();
    onValueChange(NONE, '');
    if (onTextValueChange) {
      onTextValueChange('');
    }
    setOptions([]);
  };

  const displayValue = textValue || '';
  const hasValue = value && value !== NONE;

  return (
    <Popover modal={false} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Input
            value={displayValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="w-full pr-16"
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
          />
          <div className="absolute right-0 top-0 h-full flex items-center">
            {hasValue && (
              <Button
                variant="ghost"
                size="icon"
                className="h-full w-8 rounded-none"
                onClick={clearSelection}
                type="button"
              >
                <X className="h-4 w-4 opacity-50" />
              </Button>
            )}
            <Button
              variant="ghost"
              role="combobox"
              aria-expanded={open}
              className="h-full w-8 rounded-none"
              onClick={(e) => {
                e.preventDefault();
                setOpen((o) => !o);
              }}
              type="button"
              tabIndex={-1}
            >
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </Button>
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={6}
      >
        <div className="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0"
              placeholder="Digite para buscar..."
              value={textValue}
              onChange={(e) => onTextValueChange && onTextValueChange(e.target.value)}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto overflow-x-hidden">
            {loading && <div className="py-6 text-center text-sm">Carregando...</div>}
            {!loading && options.length === 0 && textValue.length >= minLength && (
              <div className="py-6 text-center text-sm">Nenhum resultado encontrado.</div>
            )}
            <div className="overflow-hidden p-1 text-foreground">
              {options.map((option, index) => (
                <div
                  key={`${option.value}-${index}`}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  onClick={(e) => {
                    console.log('🎯 === CLIQUE DETECTADO ===');
                    console.log('🎯 Item clicked:', option.value, option.label);
                    console.log('🎯 Event target:', e.target);
                    console.log('🎯 Current target:', e.currentTarget);
                    e.preventDefault();
                    e.stopPropagation();

                    // Chamada imediata para testar
                    console.log('🎯 Chamando handleSelect...');
                    handleSelect(option.value);
                  }}
                  onMouseDown={(e) => {
                    console.log('🎯 Item mousedown:', option.value, option.label);
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(option.value);
                  }}
                  onPointerDown={(e) => {
                    console.log('🎯 Item pointerdown:', option.value, option.label);
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(option.value);
                  }}
                  onTouchStart={(e) => {
                    console.log('🎯 Item touchstart:', option.value, option.label);
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(option.value);
                  }}
                  style={{
                    minHeight: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 flex-shrink-0',
                      value === option.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="flex-1" style={{ pointerEvents: 'none' }}>
                    {option.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default Combobox;
