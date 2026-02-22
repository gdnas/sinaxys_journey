import { MarketingShell } from "@/components/MarketingShell";
import { LegalDocument, type LegalSection } from "@/components/legal/LegalDocument";

export default function TermsOfService() {
  const updatedAt = "22 de fevereiro de 2026";

  const sections: LegalSection[] = [
    {
      id: "acceptance",
      title: "1. Aceitação",
      content: (
        <>
          <p>
            Estes Termos de Serviço ("Termos") regulam o uso da plataforma <strong>KAIROOS</strong> por usuários finais e administradores vinculados a
            uma empresa cliente. Ao acessar ou usar a Plataforma, você concorda com estes Termos.
          </p>
        </>
      ),
    },
    {
      id: "scope",
      title: "2. O que a Plataforma oferece",
      content: (
        <>
          <p>
            A KAIROOS é uma plataforma de execução e desenvolvimento (onboarding, trilhas, OKRs, organograma e recursos correlatos). Recursos podem
            variar conforme o plano contratado e os módulos habilitados pela empresa.
          </p>
        </>
      ),
    },
    {
      id: "accounts",
      title: "3. Contas, perfis e acesso",
      content: (
        <>
          <ul>
            <li>O acesso pode ser provisionado pela empresa (administração interna) e depende do seu vínculo com ela.</li>
            <li>Você é responsável por manter suas credenciais seguras e por atividades realizadas com sua conta.</li>
            <li>
              Podemos suspender acessos em casos de suspeita de fraude, violação de segurança, uso abusivo ou por determinação da empresa.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "acceptable-use",
      title: "4. Uso aceitável",
      content: (
        <>
          <p>Você concorda em não:</p>
          <ul>
            <li>tentar burlar autenticação, autorização, limites ou mecanismos de segurança;</li>
            <li>utilizar a Plataforma para fins ilícitos, discriminatórios, assediadores ou que violem direitos de terceiros;</li>
            <li>enviar malware, explorar vulnerabilidades ou realizar engenharia reversa indevida;</li>
            <li>compartilhar dados pessoais de terceiros sem base legal e autorização aplicável.</li>
          </ul>
        </>
      ),
    },
    {
      id: "content",
      title: "5. Conteúdo e propriedade intelectual",
      content: (
        <>
          <p>
            O conteúdo corporativo inserido na Plataforma (ex.: documentos, trilhas, metas) permanece de titularidade da empresa/usuários conforme
            regras internas. A KAIROOS mantém direitos sobre a Plataforma, marcas, interface e componentes.
          </p>
          <p>
            Ao enviar conteúdo, você declara possuir permissões necessárias. A empresa é responsável por governança, confidencialidade e
            conformidade do conteúdo que disponibiliza aos colaboradores.
          </p>
        </>
      ),
    },
    {
      id: "integrations",
      title: "6. Integrações (ex.: YouTube)",
      content: (
        <>
          <p>
            Quando você conecta uma integração, a Plataforma pode receber tokens de autorização para agir em seu nome (por exemplo, publicar um vídeo
            no YouTube). A senha da conta externa permanece com o provedor (Google/YouTube).
          </p>
          <p>
            O uso de integrações está sujeito também aos termos e políticas do provedor externo. Em caso de revogação de acesso, o recurso integrado
            pode parar de funcionar.
          </p>
        </>
      ),
    },
    {
      id: "availability",
      title: "7. Disponibilidade e mudanças",
      content: (
        <>
          <p>
            Buscamos alta disponibilidade e melhorias contínuas. Podemos realizar manutenções, atualizações e alterações de recursos para evolução do
            produto, segurança e conformidade.
          </p>
        </>
      ),
    },
    {
      id: "support",
      title: "8. Suporte",
      content: (
        <>
          <p>
            O suporte e níveis de serviço podem variar por contrato/plano. Solicitações devem, preferencialmente, seguir o canal definido pela sua
            empresa administradora.
          </p>
        </>
      ),
    },
    {
      id: "privacy",
      title: "9. Privacidade e proteção de dados",
      content: (
        <>
          <p>
            O tratamento de dados pessoais é regido pela nossa <a href="/privacidade">Política de Privacidade</a> e pelas instruções da empresa
            Controladora, quando aplicável.
          </p>
        </>
      ),
    },
    {
      id: "liability",
      title: "10. Limitação de responsabilidade",
      content: (
        <>
          <p>
            Na extensão permitida pela lei, a KAIROOS não se responsabiliza por: (i) decisões de gestão tomadas com base em informações lançadas na
            Plataforma; (ii) indisponibilidades causadas por fatores fora de controle razoável (ex.: falhas de provedores, internet, força maior);
            (iii) conteúdo inserido por usuários/empresas.
          </p>
        </>
      ),
    },
    {
      id: "termination",
      title: "11. Encerramento",
      content: (
        <>
          <p>
            A empresa cliente pode encerrar o contrato conforme condições comerciais. Usuários finais podem perder acesso quando houver desligamento
            ou desativação pela empresa administradora.
          </p>
        </>
      ),
    },
    {
      id: "law",
      title: "12. Lei aplicável e foro",
      content: (
        <>
          <p>
            Estes Termos serão interpretados conforme as leis aplicáveis no Brasil. Eventuais disputas serão tratadas preferencialmente por acordo e,
            na ausência, no foro competente.
          </p>
        </>
      ),
    },
    {
      id: "contact",
      title: "13. Contato",
      content: (
        <>
          <p>
            Dúvidas sobre estes Termos: <strong>legal@kairoos.ai</strong>.
          </p>
        </>
      ),
    },
    {
      id: "changes",
      title: "14. Alterações",
      content: (
        <>
          <p>
            Podemos atualizar estes Termos para refletir mudanças do produto, exigências legais ou melhorias de segurança. A continuidade de uso após
            a atualização indica concordância com a versão vigente.
          </p>
        </>
      ),
    },
  ];

  return (
    <MarketingShell title="Termos de Serviço" description="As regras de uso da KAIROOS, responsabilidades e condições gerais do serviço.">
      <LegalDocument
        eyebrow="Legal"
        title="Termos de Serviço — KAIROOS"
        updatedAt={updatedAt}
        intro={
          <>
            Se você estiver configurando integrações (ex.: Google OAuth), esta página pode ser usada como “Terms of Service URL”.
          </>
        }
        sections={sections}
        aside={
          <>
            <div className="font-medium text-[color:var(--sinaxys-ink)]">Dica para integrações (Google OAuth)</div>
            <div className="mt-1">
              Use esta URL como “Terms of Service URL” no Google Cloud: <span className="font-medium">https://kairoos.ai/termos</span>
            </div>
          </>
        }
      />
    </MarketingShell>
  );
}
