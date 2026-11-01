import type { Metadata } from 'next';
import { companyInfo } from '../legal';
import '../legal.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Termos de uso' };

export default async function Termos() {
  const c = await companyInfo();
  return (
    <div className="lg">
      <main>
        <nav>
          <a href="/termos">Termos de uso</a>
          <a href="/privacidade">Política de privacidade</a>
        </nav>
        <h1>Termos de uso</h1>
        <small>
          {c.name}
          {c.doc ? ` · CNPJ/CPF ${c.doc}` : ''}
        </small>
        <h2>1. Serviços</h2>
        <p>A {c.brand} cria sites, páginas de links (link na bio), catálogos digitais, packs de artes e presta serviços de marketing digital. O que está incluso em cada contratação é o que aparece na proposta e no link de pagamento.</p>
        <h2>2. Prévias</h2>
        <p>As prévias enviadas antes da contratação são demonstrações gratuitas e sem compromisso, feitas com informações públicas do negócio (por exemplo, a ficha no Google). As fotos podem ser ilustrativas. Se você não quiser a prévia, é só pedir que ela é retirada do ar.</p>
        <h2>3. Pagamento</h2>
        <p>O pagamento é feito pelo link seguro (Pix ou cartão), processado por instituição de pagamento parceira. O recibo é enviado pelo WhatsApp. Serviços com pagamento único não têm mensalidade; planos mensais ou anuais são cobrados na periodicidade contratada e podem ser cancelados a qualquer momento, sem multa, valendo até o fim do período já pago.</p>
        <h2>4. Prazos e entrega</h2>
        <p>Os prazos informados contam a partir da confirmação do pagamento e do envio do material necessário (logo, fotos, textos). Produtos digitais prontos (packs, link na bio, catálogo) podem ser entregues automaticamente pelo WhatsApp logo após a confirmação.</p>
        <h2>5. Ajustes e responsabilidade pelo conteúdo</h2>
        <p>Os ajustes combinados estão inclusos. O cliente é responsável pelas informações, imagens e marcas que fornecer e por ter o direito de usá-las.</p>
        <h2>6. Arrependimento e reembolso</h2>
        <p>Compras feitas pela internet podem ser canceladas em até 7 dias (Código de Defesa do Consumidor, art. 49), com devolução do valor, desde que o serviço ainda não tenha sido entregue por completo. Fale com a gente pelo WhatsApp.</p>
        <h2>7. Contato</h2>
        <p>
          {[c.email && `E-mail: ${c.email}`, c.phone && `WhatsApp: ${c.phone}`, c.address].filter(Boolean).join(' · ') || 'Pelo WhatsApp que atendeu você.'}
        </p>
      </main>
    </div>
  );
}
