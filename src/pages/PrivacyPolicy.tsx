import { MarketingShell } from "@/components/MarketingShell";
import { LegalDocument, type LegalSection } from "@/components/legal/LegalDocument";

export default function PrivacyPolicy() {
  const updatedAt = "22 de fevereiro de 2026";

  const sections: LegalSection[] = [
    {
      id: "overview",
      title: "1. Visão geral",
      content: (
        <>
          <p>
            Esta Política de Privacidade descreve como a <strong>KAIROOS</strong> ("Plataforma") trata dados pessoais quando você utiliza nossos
            recursos de onboarding, trilhas de aprendizagem, gestão de OKRs, organograma, perfis e integrações (ex.: YouTube).
          </p>
          <p>
            Aplicamos os princípios de privacidade por padrão e por design: coletamos o mínimo necessário, limitamos acessos, registramos atividades
            relevantes e adotamos práticas de segurança alinhadas ao mercado.
          </p>
        </>
      ),
    },
    {
      id: "roles",
      title: "2. Papéis e responsabilidade (Controlador/Operador)",
      content: (
        <>
          <p>
            Na maioria dos cenários, a <strong>empresa cliente</strong> (sua organização) é a <strong>Controladora</strong> dos dados pessoais
            inseridos e gerenciados na Plataforma (por exemplo: usuários, departamentos, metas, trilhas, documentos internos). A KAIROOS atua como
            <strong> Operadora</strong>, tratando dados conforme instruções da Controladora e para prestar o serviço.
          </p>
          <p>
            Em alguns contextos limitados, a KAIROOS pode atuar como Controladora de dados operacionais (por exemplo, dados de cobrança,
            administração do serviço, auditoria, prevenção a fraude e segurança).
          </p>
        </>
      ),
    },
    {
      id: "data",
      title: "3. Quais dados tratamos",
      content: (
        <>
          <p>
            Conforme os módulos habilitados pela sua empresa, podemos tratar as seguintes categorias de dados pessoais:
          </p>
          <ul>
            <li>
              <strong>Dados de cadastro e perfil</strong>: nome, e-mail, cargo, telefone, avatar, gestor, vínculo com empresa/departamento.
            </li>
            <li>
              <strong>Dados de uso</strong>: registros de acesso, ações dentro da Plataforma (ex.: criação/edição de trilhas), preferências e eventos
              de navegação.
            </li>
            <li>
              <strong>Conteúdo corporativo</strong>: materiais de trilhas, documentos internos, descrições, metas/OKRs, anotações e anexos que a sua
              organização incluir.
            </li>
            <li>
              <strong>Dados de integrações</strong>: quando você conecta serviços externos (ex.: Google/YouTube), podemos armazenar tokens de
              autorização necessários para executar ações em seu nome (ex.: upload). A senha da sua conta externa não é coletada nem armazenada.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "purposes",
      title: "4. Finalidades do tratamento",
      content: (
        <>
          <ul>
            <li>Permitir autenticação e controle de acesso (inclusive por papel/função).</li>
            <li>Entregar funcionalidades da Plataforma: onboarding, trilhas, vídeos, OKRs, organograma e relatórios.</li>
            <li>Manter a segurança, prevenir abusos e investigar incidentes.</li>
            <li>Suporte técnico, melhoria do produto, qualidade e estabilidade do serviço.</li>
            <li>Cumprir obrigações legais/regulatórias aplicáveis.</li>
          </ul>
        </>
      ),
    },
    {
      id: "legal-basis",
      title: "5. Bases legais (LGPD)",
      content: (
        <>
          <p>
            O tratamento pode se apoiar, conforme o caso, em: execução de contrato, legítimo interesse (com avaliações de impacto quando necessário),
            cumprimento de obrigação legal/regulatória e consentimento (por exemplo, para certas integrações ou comunicações específicas).
          </p>
        </>
      ),
    },
    {
      id: "sharing",
      title: "6. Compartilhamento de dados",
      content: (
        <>
          <p>
            Não vendemos dados pessoais. Podemos compartilhar dados com:
          </p>
          <ul>
            <li>
              <strong>Fornecedores de infraestrutura</strong> (ex.: hospedagem, banco de dados, armazenamento, monitoramento) para operar a Plataforma.
            </li>
            <li>
              <strong>Integrações escolhidas pelo usuário</strong> (ex.: Google/YouTube) quando você solicita uma ação (ex.: publicar vídeo).
            </li>
            <li>
              <strong>Autoridades</strong> quando houver obrigação legal, ordem judicial ou necessidade de proteção contra fraude/abuso.
            </li>
          </ul>
          <p>
            Sempre que possível, aplicamos minimização, pseudonimização, criptografia e contratos com cláusulas de confidencialidade e proteção.
          </p>
        </>
      ),
    },
    {
      id: "retention",
      title: "7. Retenção e descarte",
      content: (
        <>
          <p>
            Mantemos dados pelo tempo necessário para prestar o serviço, cumprir obrigações e resguardar direitos. Ao término do contrato, a
            Controladora pode solicitar exportação e/ou exclusão, observadas exigências legais e prazos técnicos razoáveis.
          </p>
        </>
      ),
    },
    {
      id: "security",
      title: "8. Segurança da informação",
      content: (
        <>
          <p>
            Adotamos controles compatíveis com práticas de mercado, incluindo (quando aplicável): criptografia em trânsito, segregação por tenant
            (empresa), políticas de acesso, registros de auditoria, backups, princípios de menor privilégio e monitoramento. Ainda assim, nenhum
            sistema é totalmente livre de riscos — por isso mantemos processos de prevenção, detecção e resposta.
          </p>
        </>
      ),
    },
    {
      id: "international",
      title: "9. Transferências internacionais",
      content: (
        <>
          <p>
            Dependendo da infraestrutura e dos fornecedores, dados podem ser processados em outros países. Nesses casos, buscamos medidas adequadas
            de proteção (contratos, padrões de segurança e controles técnicos).
          </p>
        </>
      ),
    },
    {
      id: "rights",
      title: "10. Direitos do titular",
      content: (
        <>
          <p>
            Você pode ter direitos previstos na LGPD, como confirmação de tratamento, acesso, correção, anonimização, portabilidade e eliminação.
            Como a empresa cliente é usualmente a Controladora, solicitações relacionadas a dados corporativos devem ser direcionadas ao seu RH/DPO.
          </p>
          <p>
            Se você precisar de suporte da KAIROOS para encaminhar ou operacionalizar um pedido, entre em contato.
          </p>
        </>
      ),
    },
    {
      id: "cookies",
      title: "11. Cookies e tecnologias similares",
      content: (
        <>
          <p>
            Utilizamos cookies e armazenamento local estritamente necessários para autenticação, segurança e experiência de uso. Quando aplicável,
            poderemos usar métricas de desempenho para melhorar o serviço, limitando identificação direta.
          </p>
        </>
      ),
    },
    {
      id: "contact",
      title: "12. Contato",
      content: (
        <>
          <p>
            Para dúvidas sobre privacidade e segurança, contate: <strong>privacidade@kairoos.ai</strong>.
          </p>
        </>
      ),
    },
    {
      id: "changes",
      title: "13. Alterações desta política",
      content: (
        <>
          <p>
            Podemos atualizar esta Política periodicamente. Quando a alteração for relevante, informaremos na Plataforma e/ou por meios razoáveis.
          </p>
        </>
      ),
    },
  ];

  return (
    <MarketingShell
      title="Política de Privacidade"
      description="Como a KAIROOS trata dados pessoais para entregar onboarding, aprendizagem e execução com segurança."
    >
      <LegalDocument
        eyebrow="Legal"
        title="Política de Privacidade — KAIROOS"
        updatedAt={updatedAt}
        intro={
          <>
            Este documento é disponibilizado para transparência. Se você estiver configurando integrações (ex.: Google/YouTube), use as URLs desta
            página no Google Cloud quando solicitado.
          </>
        }
        sections={sections}
        aside={
          <>
            <div className="font-medium text-[color:var(--sinaxys-ink)]">Dica para integrações (Google OAuth)</div>
            <div className="mt-1">
              Use esta URL como “Privacy Policy URL” no Google Cloud: <span className="font-medium">https://kairoos.ai/privacidade</span>
            </div>
          </>
        }
      />
    </MarketingShell>
  );
}
