import Link from "next/link";
import { CONTACT_EMAIL, LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Política de Privacidade", description: "Como o Jogus Connect coleta, usa e protege seus dados pessoais (LGPD)." };

export default function Privacidade() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <LegalPage title="Política de Privacidade">
      <p>
        Esta política explica quais dados pessoais o Jogus Connect (jogusconnect.com.br) coleta, para que usa, com quem compartilha e como você exerce seus direitos,
        de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018, LGPD). Dúvidas ou pedidos: {mail}.
      </p>

      <h2>1. Quem cuida dos seus dados</h2>
      <p>
        O Jogus Connect é o controlador dos dados das contas e da plataforma. Já os dados que o organizador cadastra sobre os jogadores da pelada dele
        (lista de jogadores, presenças, pagamentos, notas) são organizados por ele: o Jogus guarda esses dados e trata em nome do organizador.
      </p>

      <h2>2. Dados que coletamos</h2>
      <ul>
        <li><b>Conta:</b> nome, e-mail e senha (guardada só de forma criptografada, nunca em texto).</li>
        <li><b>Jogador:</b> nome, apelido, WhatsApp, foto (opcional), posição, presença nas partidas, gols, assistências, cartões, votos de craque e pagamentos registrados pelo organizador.</li>
        <li><b>Avaliações:</b> notas de qualidade e conduta e etiquetas dadas pelos colegas depois das partidas. Quem avaliou não é identificado.</li>
        <li><b>Confirmação pelo link sem conta:</b> o nome e, se você informar, o WhatsApp. Um cookie guarda neste aparelho quem você é, para a próxima partida.</li>
        <li><b>Assinatura (só organizadores):</b> CPF ou CNPJ, CEP, número do endereço, celular e dados do cartão. Esses dados vão direto para o Asaas e o Jogus não guarda CPF, endereço nem cartão.</li>
        <li><b>Peladas e partidas:</b> nome, local, endereço e coordenadas do campo, horários e valores.</li>
        <li><b>Técnicos:</b> cookie de sessão para manter você logado e registros de acesso da hospedagem. Não usamos cookies de publicidade nem rastreadores de terceiros.</li>
      </ul>

      <h2>3. Para que usamos</h2>
      <ul>
        <li>Fazer o app funcionar: lista de presença, sorteio de times, rankings, financeiro e notificações (execução do contrato).</li>
        <li>Cobrar a assinatura do organizador e emitir as cobranças (execução do contrato e obrigação legal).</li>
        <li>Enviar e-mails da conta, como recuperação de senha e aviso de fim do teste grátis.</li>
        <li>Na busca &quot;Quero jogar&quot;, mostrar ao organizador de outra pelada as suas médias de qualidade e conduta e as etiquetas recebidas quando você pede vaga, para ele decidir se aprova (legítimo interesse; você é avisado antes de pedir).</li>
        <li>Segurança, prevenção de fraude e cumprimento de obrigações legais.</li>
      </ul>
      <p>Não vendemos seus dados e não usamos seus dados para publicidade.</p>

      <h2>4. Com quem compartilhamos</h2>
      <ul>
        <li><b>Organizador e colegas da pelada:</b> veem seu nome, apelido, foto, presença e estatísticas. A nota de habilidade é vista só pelo organizador.</li>
        <li><b>Asaas</b> (pagamentos): dados de cobrança dos organizadores.</li>
        <li><b>Resend</b> (envio de e-mails): seu e-mail e o texto da mensagem.</li>
        <li><b>Vercel</b> (hospedagem do site) e <b>Supabase</b> (banco de dados): guardam e processam os dados para o app funcionar.</li>
        <li><b>Google Maps</b> e <b>OpenStreetMap</b>: mostram mapas e buscam endereços de quadras. Seu navegador carrega os mapas direto desses serviços.</li>
        <li>Autoridades, quando a lei exigir.</li>
      </ul>
      <p>Alguns desses serviços podem guardar dados fora do Brasil, com as garantias previstas na LGPD.</p>

      <h2>5. Por quanto tempo guardamos</h2>
      <p>
        Enquanto sua conta existir ou enquanto a pelada estiver ativa. Quando você exclui a conta, apagamos seus dados de conta. Registros de cobrança podem ser
        mantidos pelo prazo exigido por lei. Dados que o organizador cadastrou na pelada dele ficam com ele até ele apagar a pelada ou o jogador.
      </p>

      <h2>6. Seus direitos</h2>
      <p>Você pode pedir a qualquer momento:</p>
      <ul>
        <li>confirmação de que tratamos seus dados e acesso a eles;</li>
        <li>correção de dados errados (nome e senha você muda em <Link href="/app/perfil">Meu perfil</Link>);</li>
        <li>cópia dos seus dados (portabilidade);</li>
        <li>exclusão da conta e dos dados, direto em <Link href="/app/perfil">Meu perfil</Link> &gt; Excluir minha conta;</li>
        <li>informação sobre com quem compartilhamos e revisão de decisões;</li>
        <li>oposição a um uso que você considere indevido.</li>
      </ul>
      <p>
        Para os demais pedidos, escreva para {mail}. Respondemos em até 15 dias. Se você está numa pelada sem conta e quer sair dela, peça ao organizador ou escreva para nós.
        Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2>7. Segurança</h2>
      <p>
        Usamos conexão criptografada (HTTPS), senhas com hash, sessões com cookie protegido e banco de dados sem acesso público. Nenhum sistema é 100% seguro;
        se acontecer um incidente que possa causar risco a você, avisaremos você e a ANPD.
      </p>

      <h2>8. Crianças e adolescentes</h2>
      <p>A conta é para maiores de 18 anos. Menores podem participar de peladas cadastrados pelo organizador, com autorização do responsável.</p>

      <h2>9. Mudanças</h2>
      <p>Se esta política mudar, atualizamos a data no topo e avisamos no app quando a mudança for importante.</p>
    </LegalPage>
  );
}
