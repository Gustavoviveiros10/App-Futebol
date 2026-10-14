import Link from "next/link";
import { CONTACT_EMAIL, LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Termos de Uso", description: "Regras de uso do Jogus Connect." };

export default function Termos() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <LegalPage title="Termos de Uso">
      <p>
        Estes termos valem para quem usa o Jogus Connect (jogusconnect.com.br), com ou sem conta. Ao usar o app, você concorda com eles e com a{" "}
        <Link href="/privacidade">Política de Privacidade</Link>.
      </p>

      <h2>1. O que é o Jogus</h2>
      <p>
        Uma plataforma para organizar peladas: lista de presença, sorteio de times, estatísticas, avaliações, financeiro e busca de partidas abertas.
        O Jogus não organiza os jogos, não é dono das quadras e não responde pelo que acontece dentro e fora de campo.
      </p>

      <h2>2. Conta</h2>
      <ul>
        <li>Você precisa ter 18 anos ou mais para criar conta.</li>
        <li>Informe dados verdadeiros e guarde sua senha. Você é responsável pelo que for feito na sua conta.</li>
        <li>Jogadores podem confirmar presença pelo link da pelada sem criar conta.</li>
      </ul>

      <h2>3. Organizadores</h2>
      <ul>
        <li>Quem organiza a pelada é responsável pelos dados que cadastra dos jogadores e deve usá-los só para organizar os jogos.</li>
        <li>Valores de mensalidade, cobranças entre jogadores e o caixa da pelada são combinados entre vocês. O Jogus só ajuda a registrar.</li>
      </ul>

      <h2>4. Planos e pagamento</h2>
      <ul>
        <li>Os planos pagos são cobrados pelo Asaas, por mês ou por ano, no valor mostrado em <Link href="/app/planos">Planos</Link>.</li>
        <li>O teste grátis dura o período informado na tela. Se você não cancelar antes do fim, a cobrança começa automaticamente.</li>
        <li>Você pode cancelar quando quiser em Planos. O plano continua valendo até o fim do período já pago e não há multa.</li>
        <li>Pelo Código de Defesa do Consumidor, você pode desistir em até 7 dias da primeira contratação e pedir o valor de volta pelo {mail}.</li>
      </ul>

      <h2>5. Regras de convivência</h2>
      <ul>
        <li>Não use o app para ofender, discriminar, assediar ou expor outras pessoas, nem nas avaliações.</li>
        <li>Não cadastre dados de alguém sem ter motivo para isso nem fotos que a pessoa não autorizou.</li>
        <li>Não tente acessar dados de outras peladas, burlar limites dos planos ou atrapalhar o funcionamento do site.</li>
      </ul>
      <p>Podemos suspender ou encerrar contas que desrespeitem estas regras.</p>

      <h2>6. Avaliações</h2>
      <p>
        As avaliações são anônimas e servem para ajudar organizadores a montar times e aprovar pedidos de vaga. Quando você pede vaga numa partida pública, o
        organizador vê suas médias e etiquetas. Avaliações abusivas podem ser removidas.
      </p>

      <h2>7. Disponibilidade</h2>
      <p>
        Fazemos o possível para o app ficar no ar, mas podem ocorrer falhas e manutenções. Na medida permitida pela lei, o Jogus não responde por prejuízos
        indiretos causados por indisponibilidade.
      </p>

      <h2>8. Encerramento</h2>
      <p>Você pode excluir sua conta quando quiser em Meu perfil. As peladas que você organiza são apagadas junto.</p>

      <h2>9. Mudanças e contato</h2>
      <p>
        Podemos atualizar estes termos e avisaremos no app quando a mudança for importante. Vale a lei brasileira. Dúvidas: {mail}.
      </p>
    </LegalPage>
  );
}
