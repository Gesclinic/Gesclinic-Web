import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { NONE } from "@/lib/selectUtils";

/**
 * Combobox super simples focado apenas em funcionalidade
 */
export function SimpleCombobox({
  value,
  textValue,
  onValueChange,
  onTextValueChange,
  placeholder = "Selecione...",
  fetcher,
  minLength = 2,
  debounceMs = 300,
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceTimeout = useRef(null);
  const containerRef = useRef(null);

  // Busca com debounce
  useEffect(() => {
    console.log("🔍 SimpleCombobox useEffect: textValue =", textValue, "length =", textValue?.length, "minLength =", minLength);
    
    if (!textValue || textValue.trim().length < minLength) {
      console.log("❌ SimpleCombobox: Query muito curta ou vazia");
      setOptions([]);
      return;
    }

    if (debounceTimeout.current) {
      console.log("🔄 SimpleCombobox: Cancelando busca anterior");
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      console.log("🔍 SimpleCombobox: Iniciando busca para:", textValue);
      console.log("🔍 SimpleCombobox: Fetcher disponível?", typeof fetcher);
      
      setLoading(true);
      try {
        const fetchedOptions = await fetcher(textValue.trim());
        console.log("✅ SimpleCombobox: Opções recebidas:", fetchedOptions);
        console.log("✅ SimpleCombobox: Tipo das opções:", typeof fetchedOptions, Array.isArray(fetchedOptions));
        setOptions(fetchedOptions || []);
      } catch (error) {
        console.error("❌ SimpleCombobox: Erro na busca:", error);
        setOptions([]);
      } finally {
        setLoading(false);
        console.log("🏁 SimpleCombobox: Busca finalizada");
      }
    }, debounceMs);

    return () => clearTimeout(debounceTimeout.current);
  }, [textValue, fetcher, debounceMs, minLength]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const handleSelect = (selectedValue, selectedLabel) => {
    console.log("🎯 SimpleCombobox: Selecionando", selectedValue, selectedLabel);
    
    if (onValueChange) {
      onValueChange(selectedValue, selectedLabel);
    }
    
    if (onTextValueChange) {
      onTextValueChange(selectedLabel);
    }
    
    setOpen(false);
    console.log("✅ SimpleCombobox: Seleção concluída");
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    if (onTextValueChange) {
      onTextValueChange(newValue);
    }
    if (!open && newValue.length >= minLength) {
      setOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (textValue && textValue.length >= minLength) {
      setOpen(true);
    }
  };

  const clearValue = () => {
    if (onValueChange) onValueChange(NONE, "");
    if (onTextValueChange) onTextValueChange("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input Field */}
      <div className="relative">
        <Input
          value={textValue || ""}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full pr-16"
        />
        
        {/* Clear Button */}
        {value && value !== NONE && (
          <button
            type="button"
            onClick={clearValue}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
        
        {/* Dropdown Arrow */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1"
        >
          <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {/* Dropdown List */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading && (
            <div className="p-3 text-sm text-gray-500 text-center">
              Carregando...
            </div>
          )}
          
          {!loading && options.length === 0 && textValue && textValue.length >= minLength && (
            <div className="p-3 text-sm text-gray-500 text-center">
              Nenhum resultado encontrado
            </div>
          )}
          
          {!loading && options.length > 0 && (
            <div className="py-1">
              {console.log("🎨 SimpleCombobox: Renderizando", options.length, "opções:", options)}
              {options.map((option, index) => (
                <div
                  key={`${option.value}-${index}`}
                  className="px-3 py-2 cursor-pointer hover:bg-blue-50 flex items-center text-sm border-b border-gray-100 last:border-b-0"
                  onClick={() => {
                    console.log("🎯 SimpleCombobox: Item clicado!", option.value, option.label);
                    handleSelect(option.value, option.label);
                  }}
                  onMouseDown={() => {
                    console.log("🎯 SimpleCombobox: Item mousedown!", option.value, option.label);
                    handleSelect(option.value, option.label);
                  }}
                >
                  <span className="flex-1">{option.label}</span>
                  {value === option.value && (
                    <span className="text-blue-600 ml-2">✓</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SimpleCombobox;