import { html, callout, steps, table, workflow } from "./shared.mjs";

export const teacherChapters = [
  {
    id: "kit-docente",
    number: "18",
    part: "Aprender e manter",
    title: "Kit para docentes",
    summary: "Migração do MARS, preparação de aulas, publicação com revisões estáveis, LMS, avaliação, contingência e instalação própria.",
    intro: "Este capítulo transforma um projeto que funciona no MARS numa atividade webMARS reproduzível. As contas, os nomes públicos e a biblioteca pertencem sempre à instalação BackMars indicada pelo URL completo.",
    level: "Docente",
    readingMinutes: 28,
    keywords: ["docente", "professor", "Moodle", "Canvas", "exercício", "publicar", "revisão", "self-hosting", "privacidade"],
    sources: ["help/pt/TeacherKit.html", "assets/js/app-modules/19-public-library.js", "manual/teacher-kit/*"],
    sections: [
      {
        id: "migrar-em-15-minutos",
        title: "Migrar do MARS em 15 minutos",
        content: html`
          ${workflow([
            { label: "1", title: "Abrir a fonte" },
            { label: "2", title: "Montar e executar" },
            { label: "3", title: "Comparar comportamento" },
            { label: "4", title: "Partilhar uma revisão" }
          ])}
          ${steps([
            "Abra o ficheiro original <code>.s</code>, <code>.asm</code> ou <code>.mips</code> com <strong>Ficheiro → Abrir do disco</strong>. Para trabalhos com vários ficheiros, crie primeiro um projeto e mantenha os caminhos relativos esperados pelos <code>.include</code>.",
            "Monte com <kbd>F3</kbd>. Resolva primeiro os erros de sintaxe; depois confirme os warnings, símbolos e o segmento Text. O webMARS não necessita de Java.",
            "Execute com <kbd>F5</kbd>, avance com <kbd>F7</kbd> e recue com <kbd>F8</kbd>. Repita o input que será fornecido aos alunos e compare output, registos e memória com a referência do enunciado.",
            "Se a atividade depende de uma particularidade histórica, ative <strong>Compatibilidade estrita MARS 4.5</strong> e registe essa opção no enunciado.",
            "Guarde uma cópia descarregável da fonte e, quando usar a Biblioteca, fixe uma revisão <code>/p/nome@N</code>."
          ])}
          ${callout("note", "O teste mínimo", "<p>Não basta montar sem erros. Teste o caminho feliz, input vazio ou limite, syscalls, endereço inicial, mapa de memória e qualquer ferramenta exigida.</p>")}
        `
      },
      {
        id: "primeira-aula",
        title: "Preparar a primeira aula",
        content: html`
          ${table(["Momento", "Decisão docente", "Evidência a guardar"], [
            ["Antes", "Abrir o URL exato num browser sem sessão", "Hostname, versão webMARS e screenshot clara"],
            ["Início", "Demonstrar Abrir, Montar, Executar, Passo e Backstep", "Fonte mínima e output esperado"],
            ["Prática", "Indicar se cada aluno trabalha localmente ou usa Cloud", "Regra de entrega e política de conta"],
            ["Fecho", "Descarregar a fonte e confirmar que reabre", "Ficheiro entregue e, se aplicável, revisão pública"],
            ["Contingência", "Disponibilizar fonte e instruções sem rede", "Anexo no LMS ou pasta da turma"]
          ])}
          <p>Comece com <code>/e/lesson01-registers</code> ou copie a ligação estável através de <strong>Biblioteca → Copiar ligação de exemplo incorporado</strong>. Uma ligação direta abre uma pré-visualização; o aluno confirma <strong>Abrir como novo projeto</strong>, criando uma cópia local independente.</p>
          <p>Explique explicitamente as três zonas de persistência: projeto local no browser, download no dispositivo e projeto Cloud opcional. Publicar na Biblioteca é uma quarta ação, deliberada, e nunca acontece ao guardar localmente.</p>
        `
      },
      {
        id: "publicar-e-fixar-revisao",
        title: "Publicar, corrigir e fixar uma revisão",
        content: html`
          <p>O nome público é atribuído ao primeiro utilizador que o reservar naquela instalação. É insensível a maiúsculas, não pode ser renomeado e não volta a ficar livre depois de arquivado. Esta regra evita que uma ficha antiga passe a apontar para trabalho de outra pessoa.</p>
          ${table(["URL", "Comportamento", "Uso recomendado"], [
            ["<code>/e/id</code>", "Exemplo incorporado e versionado com a aplicação", "Aulas introdutórias e documentação"],
            ["<code>/p/nome</code>", "Segue sempre a revisão mais recente publicada", "Material vivo, demonstrações e erratas"],
            ["<code>/p/nome@3</code>", "Abre exatamente a revisão 3, imutável", "Avaliações, artigos, fichas e reprodutibilidade"]
          ])}
          ${steps([
            "Inicie sessão e confirme o email. A verificação impede publicação abusiva com endereços não controlados.",
            "Teste e guarde o projeto local. Escolha <strong>Biblioteca → Publicar projeto ativo</strong>.",
            "Defina nome público, título, descrição, tags, tipo, dificuldade, licença e visibilidade. Não inclua dados pessoais nos ficheiros.",
            "Copie o URL da revisão mais recente e o URL fixo apresentado após a publicação.",
            "Para corrigir, abra o projeto revisto e use <strong>As minhas publicações → Publicar projeto ativo como nova revisão</strong>. Nunca tente substituir a revisão usada numa avaliação."
          ])}
          ${callout("warning", "Instâncias diferentes", "<p><code>redes-01</code> pode existir numa universidade A e numa universidade B. Só o URL completo — protocolo, hostname, nome e revisão — identifica o recurso universalmente.</p>")}
        `
      },
      {
        id: "textos-lms",
        title: "Textos prontos para Moodle, Canvas e email",
        content: html`
          <p>Os blocos seguintes podem ser colados em Moodle, Canvas, Blackboard ou numa mensagem de email e depois adaptados à política da unidade curricular.</p>
          <h3>Atividade com revisão fixa</h3>
          <pre>Exercício: [URL WEBMARS COMPLETO /p/nome@revisão]
Versão de referência: webMARS [VERSÃO]; revisão [N]
Objetivo: [RESULTADO DE APRENDIZAGEM]
Input de teste: [INPUT]
Entrega: fonte .s/.asm e [OUTPUT / EXPLICAÇÃO / SCREENSHOT]
Prazo: [DATA E FUSO HORÁRIO]
Sem rede: use o ficheiro anexado e abra-o a partir do disco.</pre>
          <h3>Demonstração que acompanha a versão mais recente</h3>
          <pre>Demonstração webMARS: [URL COMPLETO /p/nome]
Este link acompanha correções futuras. Para citar um resultado, copie também
o link de revisão fixa mostrado em Biblioteca → As minhas publicações.</pre>
          <h3>Mensagem de privacidade</h3>
          <pre>Não é necessária conta para editar ou executar localmente. A conta é usada
apenas para Cloud, recuperação por email e publicação. Esta turma utiliza a
instalação [HOSTNAME], operada por [ENTIDADE / CONTACTO].
Consulte a área de privacidade em Ajuda/Sobre para conhecer a recolha
de estatísticas da instalação; na instalação oficial é automática.</pre>
          <p>Substitua todos os campos entre parênteses retos. Não publique passwords, códigos temporários, emails de alunos ou tokens em enunciados e screenshots.</p>
        `
      },
      {
        id: "avaliacao-e-contingencia",
        title: "Recolha, avaliação e plano sem rede",
        content: html`
          ${table(["Estratégia", "Vantagem", "Cuidado"], [
            ["Entrega do ficheiro fonte", "Portátil, simples e independente de conta", "Peça também input/output quando a correção depende da execução"],
            ["Projeto Cloud", "Continuidade entre dispositivos", "Defina operador, retenção e procedimento de indisponibilidade"],
            ["Revisão pública", "Reprodutibilidade e partilha", "Não use para entregas privadas de alunos"],
            ["Screenshot", "Evidência visual rápida", "Não substitui a fonte; ocultar emails e outros dados pessoais"],
            ["Demonstração presencial", "Permite observar o processo", "Prepare fonte local se a rede falhar"]
          ])}
          <p>Para avaliação automatizada, fixe o enunciado numa revisão e distribua casos de teste sem depender da sessão Cloud. Para avaliação manual, peça fonte, comando/input usado e output observado. Registe também mapa de memória, compatibilidade estrita, delayed branching ou outras opções que alterem o resultado.</p>
          ${callout("tip", "Pacote de contingência", "<p>No LMS, anexe a fonte, uma cópia PDF/HTML do enunciado, input esperado e instruções: abrir do disco, F3, F5. O aluno continua a trabalhar sem BackMars; apenas a recuperação de conta, Cloud e Biblioteca ficam indisponíveis.</p>")}
        `
      },
      {
        id: "self-hosting-privacidade-suporte",
        title: "Self-hosting, privacidade e suporte",
        content: html`
          <p>Cada universidade ou docente pode instalar o frontend webMARS e o BackMars. A configuração pública do frontend define a identidade da instância, o BackMars correspondente, o URL do Manual e o contacto de suporte. Essa configuração nunca contém segredos.</p>
          ${table(["Componente", "Responsabilidade"], [
            ["webMARS estático", "Interface, simulador, exemplos, rotas <code>/e</code>/<code>/p</code> e configuração pública"],
            ["BackMars", "Contas, sessões, projetos Cloud, códigos de recuperação, biblioteca e revisões"],
            ["Coletor de métricas", "Eventos e tempos aproximados; agregados públicos sem contas ou conteúdo dos projetos"],
            ["SMTP", "Entrega de códigos temporários; password de aplicação apenas no ambiente protegido do BackMars"],
            ["Proxy/HTTPS", "TLS, CORS, limite de pedidos, fallback de rotas e logs de acesso"],
            ["Operador", "Backups, retenção, resposta a incidentes, contacto e informação aos utilizadores"]
          ])}
          <p>Antes de anunciar a instância, teste registo, confirmação de email, reset de password, abertura anónima de publicação, conflito de nome, revisão fixa e arquivo. Faça backup consistente da SQLite e proteja diretório, base de dados, <code>SECRET_KEY</code>, pepper de códigos e credenciais SMTP com permissões apenas de administrador.</p>
          <p>Documente a recolha configurada na área de privacidade. O painel <a href="#/estatisticas-utilizacao">Estatísticas de utilização</a> permite observar agregados; não identifica alunos nem comprova a correção do trabalho. Interação e presença têm regras diferentes e não devem ser somadas.</p>
          <p>Ao pedir suporte, recolha hostname da instância, versão webMARS/BackMars, browser, sistema operativo, URL sem dados secretos, passos e mensagem de erro. Nunca envie App Password, cookie, código temporário ou base de dados numa conversa pública.</p>
        `
      },
      {
        id: "downloads",
        title: "Downloads editáveis do kit",
        content: html`
          <p>A distribuição autónoma do Manual inclui a pasta <code>teacher-kit/</code> com ficheiros de texto e Markdown que podem ser adaptados ao curso:</p>
          <ul>
            <li><a href="./teacher-kit/migration.md" download>Plano de migração</a></li>
            <li><a href="./teacher-kit/first-class.md" download>Checklist da primeira aula</a></li>
            <li><a href="./teacher-kit/lms-copy.txt" download>Textos para LMS/email</a></li>
            <li><a href="./teacher-kit/publishing-stable-links.md" download>Publicação e URLs estáveis</a></li>
            <li><a href="./teacher-kit/self-hosting-privacy.md" download>Self-hosting e privacidade</a></li>
          </ul>
          <p>Conserve o URL completo da instância em cada adaptação. Os nomes públicos não são globais entre instalações.</p>
        `
      }
    ]
  }
];
