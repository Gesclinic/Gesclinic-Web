import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Phone, MapPin } from 'lucide-react';

const ContatoPage = () => {
  return (
    <div className="bg-background text-foreground">
      <Helmet>
        <title>Contato - Gesclinic Web</title>
        <meta
          name="description"
          content="Entre em contato com a equipe da Gesclinic Web para tirar dúvidas, solicitar uma demonstração ou obter suporte."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4">
            Fale Conosco
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            Estamos aqui para ajudar. Preencha o formulário abaixo ou utilize um de nossos canais de
            atendimento.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16 max-w-5xl mx-auto">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Informações de Contato</h2>
              <div className="space-y-4 text-muted-foreground">
                <div className="flex items-center gap-4">
                  <Mail className="h-6 w-6 text-primary" />
                  <span>suporte@gesclinicweb.com.br</span>
                </div>
                <div className="flex items-center gap-4">
                  <Phone className="h-6 w-6 text-primary" />
                  <span>(45) 9 9999-9999 (WhatsApp)</span>
                </div>
                <div className="flex items-center gap-4">
                  <MapPin className="h-6 w-6 text-primary" />
                  <span>Atendimento 100% digital em todo o Brasil.</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Horário de Atendimento</h3>
              <p className="text-muted-foreground">Segunda a Sexta, das 8h às 18h.</p>
            </div>
          </div>

          <div>
            <form className="space-y-6 p-8 border rounded-lg shadow-sm bg-card">
              <div className="space-y-2">
                <Label htmlFor="name">Seu Nome</Label>
                <Input id="name" placeholder="João da Silva" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Seu Email</Label>
                <Input id="email" type="email" placeholder="joao.silva@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Assunto</Label>
                <Input id="subject" placeholder="Dúvida sobre o plano Profissional" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Sua Mensagem</Label>
                <Textarea id="message" placeholder="Escreva sua mensagem aqui..." rows={5} />
              </div>
              <Button type="submit" className="w-full">
                Enviar Mensagem
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContatoPage;
