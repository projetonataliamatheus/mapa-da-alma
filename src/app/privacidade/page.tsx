import type { Metadata } from 'next';
import { companyInfo } from '../legal';
import '../legal.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Política de privacidade' };

export default async function Privacidade() {
  const c = await companyInfo();
  return (
    <div className="lg">
      <main>
        <nav>
          <a href="/termos">Termos de uso</a>
          <a href="/privacidade">Política de privacidade</a>
        </nav>
        <h1>Política de privacidade</h1>
        <small>
          {c.name}
          {c.doc ? ` · CNPJ/CPF ${c.doc}` : ''} · em conformidade com a LGPD (Lei 13.709/2018)
        </small>
        <h2>1. Quais dados usamos</h2>
        <p>Nome, telefone/WhatsApp, e-mail, CPF ou CNPJ (só para emitir a cobrança e o recibo), informações do seu negócio que você nos passa ou que são públicas (como a ficha no Google) e as mensagens trocadas no atendimento.</p>
        <h2>2. Para que usamos</h2>
        <p>Para atender você, preparar prévias e propostas, processar pagamentos, emitir recibos, entregar os serviços e melhorar o atendimento. Não vendemos seus dados.</p>
        <h2>3. Atendimento com assistente virtual</h2>
        <p>Parte do atendimento pelo WhatsApp pode ser feita com ajuda de um assistente virtual (inteligência artificial), sempre com a nossa equipe acompanhando. Você pode pedir para falar com uma pessoa a qualquer momento.</p>
        <h2>4. Com quem compartilhamos</h2>
        <p>Só com os parceiros necessários para prestar o serviço: processador de pagamentos, provedores de hospedagem e de mensagens. Todos tratam os dados com segurança.</p>
        <h2>5. Quanto tempo guardamos</h2>
        <p>Pelo tempo necessário para o atendimento e para cumprir obrigações legais (por exemplo, registros de pagamento).</p>
        <h2>6. Seus direitos</h2>
        <p>Você pode pedir a qualquer momento para ver, corrigir ou apagar seus dados, ou para não receber mais mensagens. Basta responder &quot;não quero mais receber&quot; no WhatsApp ou falar com a gente pelos contatos abaixo.</p>
        <h2>7. Contato do responsável</h2>
        <p>
          {[c.email && `E-mail: ${c.email}`, c.phone && `WhatsApp: ${c.phone}`, c.address].filter(Boolean).join(' · ') || 'Pelo WhatsApp que atendeu você.'}
        </p>
      </main>
    </div>
  );
}
