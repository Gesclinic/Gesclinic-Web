import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, X } from "lucide-react";
import { stockItemsApi } from "@/lib/stockApi";

export default function ProductSelect({ clinicId, value, itemId, onChange, required = false, hideLabel = false, disabled = false }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!clinicId) return;
    
    const loadProducts = async () => {
      setLoading(true);
      try {
        const data = await stockItemsApi.list(clinicId);
        setProducts(data || []);
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [clinicId]);

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const term = search.toLowerCase();
    return products.filter(p => 
      p.name?.toLowerCase().includes(term) || 
      p.sku?.toLowerCase().includes(term)
    );
  }, [products, search]);

  const selectedProduct = products.find(p => p.id === itemId);

  const handleSelect = (product) => {
    // Passa também a categoria e saldo disponível (quando retornado pelo RPC)
    onChange({
      product: product.name,
      itemId: product.id,
      category_id: product.category_id,
      available: product.total_balance,
      unit_symbol: product.unit_symbol,
    });
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange({ product: "", itemId: "" });
    setSearch("");
  };

  const innerContent = (
    <>
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              id="product"
              type="text"
              placeholder="Buscar produto por nome ou código..."
              value={open ? search : value}
              onChange={(e) => {
                setSearch(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              disabled={loading || disabled}
              required={required}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
              disabled={loading || disabled}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          {itemId && !disabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {open && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center text-sm text-gray-500">
                Carregando produtos...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-3 text-center text-sm text-gray-500">
                {products.length === 0
                  ? "Nenhum produto cadastrado"
                  : "Nenhum produto encontrado"}
              </div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelect(product)}
                  className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b last:border-b-0 ${
                    itemId === product.id ? "bg-blue-100" : ""
                  }`}
                >
                  <div className="font-medium text-sm">{product.name}</div>
                  {product.sku && (
                    <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                  )}
                  {product.total_balance !== undefined && (
                    <div className="text-xs text-gray-500">
                      Saldo: {product.total_balance} {product.unit_symbol || ""}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {itemId && selectedProduct && !hideLabel && (
        <div className="text-xs text-gray-600 mt-2">
          <strong>Selecionado:</strong> {selectedProduct.name} (ID: {itemId.substring(0, 8)}...)
        </div>
      )}
    </>
  );

  return hideLabel ? (
    innerContent
  ) : (
    <div className="space-y-2">
      <Label htmlFor="product">
        Produto {required && <span className="text-red-500">*</span>}
      </Label>
      {innerContent}
    </div>
  );
}
