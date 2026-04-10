import React, { useState } from "react";
import PageLayout from "@/components/ui/PageLayout";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ConfigFaturamento() {
  const breadcrumbs = useBreadcrumbs([
    { label: "Faturamento", path: "/clinica/faturamento" },
    { label: "Configurações" }
  ]);

  const [tab, setTab] = useState("tiss");

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Configurações de Faturamento"
      subtitle="Parâmetros de CBHPM, TUSS, Lotes e Regras de cobrança."
    >
      <Card className="p-6 mt-6">
        <Tabs value={tab} onValueChange={setTab}>

          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="tiss">Padrões TISS</TabsTrigger>
            <TabsTrigger value="tuss">Tabela TUSS</TabsTrigger>
            <TabsTrigger value="cbhpm">CBHPM</TabsTrigger>
            <TabsTrigger value="regras">Regras</TabsTrigger>
          </TabsList>

          {/* TISS */}
          <TabsContent value="tiss">
            <Card>
              <CardHeader><CardTitle>Padrões TISS</CardTitle></CardHeader>
              <CardContent>
                <Input placeholder="Registro ANS" className="mb-3" />
                <Input placeholder="Nome da Operadora" className="mb-3" />
                <Button>Salvar</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TUSS */}
          <TabsContent value="tuss">
            <Card>
              <CardHeader><CardTitle>Tabela TUSS</CardTitle></CardHeader>
              <CardContent>
                <Input placeholder="Código TUSS" className="mb-3" />
                <Input placeholder="Descrição" className="mb-3" />
                <Button>Adicionar Procedimento</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CBHPM */}
          <TabsContent value="cbhpm">
            <Card>
              <CardHeader><CardTitle>CBHPM</CardTitle></CardHeader>
              <CardContent>
                <Input placeholder="Ano Base" className="mb-3" />
                <Input placeholder="Fator multiplicador" className="mb-3" />
                <Button>Salvar</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Regras */}
          <TabsContent value="regras">
            <Card>
              <CardHeader><CardTitle>Regras de Faturamento</CardTitle></CardHeader>
              <CardContent>
                <Input placeholder="Ex: valor mínimo para enviar lote" className="mb-3" />
                <Button>Salvar Regras</Button>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </Card>
    </PageLayout>
  );
}

