// 🎯 EXEMPLO DO PADRÃO PADRONIZADO DE MODAL
// ============================================
// Este arquivo mostra como ficou o padrão aplicado em todos os 6 arquivos

import { Plus, Edit2, Trash2, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ✅ 1️⃣ FUNÇÃO handleCloseWithCheck IMPLEMENTADA
const handleCloseWithCheck = () => {
  const hasData = Object.entries(formData).some(([key, value]) => {
    if (typeof value === "string") return value.trim() !== "";
    if (typeof value === "number") return value !== 0;
    if (typeof value === "boolean") return value !== true;
    if (Array.isArray(value)) return value.length > 0;
    return false;
  });

  if (hasData) {
    if (window.confirm("Tem certeza que deseja sair? As alterações não salvas serão perdidas.")) {
      closeForm();
    }
  } else {
    closeForm();
  }
};

// ✅ 2️⃣ MODAL PADRONIZADO
export function ExemploModalPadronizado() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: "", description: "", active: true });
    setSubmitting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Sua lógica de submissão aqui
  };

  return (
    <>
      {/* MODAL PADRONIZADO */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" 
             style={{overflow: "hidden"}}>
          <div className="my-auto" 
               style={{
                 width: "90vw", 
                 maxWidth: "1200px", 
                 height: "85vh", 
                 display: "flex", 
                 flexDirection: "column", 
                 position: "relative"
               }}>
            <Card className="w-full h-full shadow-2xl border-0 flex flex-col" 
                  style={{
                    display: "flex", 
                    flexDirection: "column", 
                    height: "100%", 
                    position: "relative"
                  }}>
              
              {/* BOTÃO DE FECHAR NO CANTO SUPERIOR DIREITO */}
              <button
                type="button"
                onClick={() => handleCloseWithCheck()}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors z-10"
                title="Fechar"
              >
                <X size={20} />
              </button>

              {/* HEADER - NÃO PRECISA SCROLL */}
              <CardHeader className="border-b shrink-0" style={{flexShrink: 0}}>
                <CardTitle>
                  {editingId ? "Editar Item" : "Novo Item"}
                </CardTitle>
              </CardHeader>

              {/* CONTEÚDO - COM SCROLL AUTOMÁTICO */}
              <CardContent className="p-6 flex-1 overflow-y-auto modal-content-scroll" 
                           style={{
                             display: "flex", 
                             flexDirection: "column", 
                             minHeight: 0, 
                             flex: 1
                           }}>
                <form id="exemplo-form" 
                      onSubmit={handleSubmit} 
                      className="space-y-4" 
                      style={{flex: 1, overflow: "visible"}}>
                  
                  {/* DIV INTERNA PARA SCROLL DO CONTEÚDO */}
                  <div style={{flex: 1, overflowY: "auto", paddingRight: "8px"}}>
                    
                    {/* SEUS CAMPOS DE FORMULÁRIO AQUI */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Digite o nome"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        disabled={submitting}
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descrição
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="Digite a descrição"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        disabled={submitting}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="active"
                        checked={formData.active}
                        onChange={(e) =>
                          setFormData({ ...formData, active: e.target.checked })
                        }
                        className="rounded"
                        disabled={submitting}
                      />
                      <label htmlFor="active" className="text-sm font-medium text-gray-700">
                        Ativo
                      </label>
                    </div>
                  </div>
                </form>
              </CardContent>

              {/* FOOTER COM BOTÕES - NÃO PRECISA SCROLL */}
              <div style={{flexShrink: 0}} 
                   className="border-t bg-white px-6 py-4 flex gap-3 justify-end">
                <Button
                  type="button"
                  onClick={handleCloseWithCheck}
                  variant="outline"
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  form="exemplo-form"
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={submitting}
                >
                  {submitting ? "Salvando..." : editingId ? "Atualizar" : "Criar/Adicionar"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// 🎯 CARACTERÍSTICAS DO PADRÃO IMPLEMENTADO
// ════════════════════════════════════════════════════════════════════

/*
✅ DESIGN RESPONSIVO
   • Largura: 90vw (responsivo)
   • Máximo: 1200px
   • Altura: 85vh
   • Overflow: hidden (modal)

✅ ESTRUTURA FLEXÍVEL
   • Header: flexShrink 0 (não encolhe)
   • Content: flex-1 com overflow-y-auto (cresce/encolhe)
   • Footer: flexShrink 0 (não encolhe)

✅ SCROLL INTELIGENTE
   • CardContent tem overflow-y-auto
   • Div interna tem flex-1 com overflowY auto
   • Conteúdo fica com scroll automático
   • Botões sempre visíveis

✅ CONFIRMAÇÃO DE SAÍDA
   • handleCloseWithCheck verifica dados preenchidos
   • Se tem dados, pede confirmação
   • Se vazio, fecha diretamente

✅ FORM ID ÚNICO
   • Cada página tem seu próprio form-id
   • Botão submit usa form="[ID]"
   • Melhor rastreamento e debugging

✅ UX MELHORADO
   • Botão X para fechar (visual familiar)
   • Hover effects nos botões
   • Footer com ações fixas
   • Shadow-2xl para elevação visual
   • border-0 para aparência moderna

✅ COMPATIBILIDADE
   • Usa Tailwind CSS
   • Usa componentes Radix UI
   • Funciona com todos os hooks React
   • Sem conflitos com estilos existentes
*/

// ════════════════════════════════════════════════════════════════════
// 📋 FORM IDS ÚNICOS POR PÁGINA
// ════════════════════════════════════════════════════════════════════

/*
1. ProfessionalServicesPage.jsx     → id="professional-services-form"
2. RoomResourcesPage.jsx            → id="room-resources-form"
3. SalasPage.jsx                    → id="salas-form"
4. ServicePricesPage.jsx            → id="service-prices-form"
5. RevenueRulesPage.jsx             → id="revenue-rules-form"
6. RecursosPage.jsx                 → id="recursos-form"
*/
