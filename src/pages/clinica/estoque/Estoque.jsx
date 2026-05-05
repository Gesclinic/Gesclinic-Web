import React from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  PackagePlus,
  PackageSearch,
  PackageCheck,
  PackageX,
  FileCog,
  Users,
  Truck,
  Map,
  Warehouse,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const Estoque = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      title: 'Produtos',
      icon: Package,
      path: 'produtos',
      desc: 'Cadastre e gerencie seus produtos.',
    },
    {
      title: 'Movimentações',
      icon: PackagePlus,
      path: 'movimentos',
      desc: 'Registre entradas, saídas e transferências.',
    },
    {
      title: 'Fornecedores',
      icon: Truck,
      path: 'fornecedores',
      desc: 'Gerencie sua base de fornecedores.',
    },
    {
      title: 'Categorias',
      icon: FileCog,
      path: 'categorias',
      desc: 'Organize seus produtos em categorias.',
    },
    {
      title: 'Locais de Estoque',
      icon: Warehouse,
      path: 'locais',
      desc: 'Defina os locais de armazenamento.',
    },
    {
      title: 'Relatórios',
      icon: PackageSearch,
      path: 'relatorios',
      desc: 'Analise o desempenho do seu estoque.',
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Helmet>
        <title>Estoque - Gesclinic Web</title>
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold">Controle de Estoque</h1>
          <p className="text-muted-foreground mt-1">Gerencie medicamentos e materiais médicos</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="h-full hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer flex flex-col"
                onClick={() => navigate(item.path)}
              >
                <CardHeader className="flex-row items-center gap-4 space-y-0">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Icon className="w-6 h-6" />
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Estoque;
