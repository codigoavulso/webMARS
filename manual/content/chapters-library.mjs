import { html, callout, screenshot, steps, table, workflow } from "./shared.mjs";

export const libraryChapters = [
  {
    id: "biblioteca-publica",
    number: "14",
    part: "Serviços e configuração",
    title: "Biblioteca pública e ligações estáveis",
    summary: "Explorar, abrir, publicar e versionar exemplos/exercícios na instalação BackMars, com URLs próprias para aulas e LMS.",
    intro: "A Biblioteca pública permite distribuir projetos sem os transformar em projetos Cloud partilhados. Cada publicação é um snapshot de texto sanitizado; quem abre recebe uma cópia local independente.",
    level: "Intermédio",
    readingMinutes: 28,
    keywords: ["biblioteca", "publicar", "exemplo", "exercício", "url", "ligação", "revisão", "unlisted", "arquivo", "lms", "backmars"],
    sources: [
      "assets/js/app-modules/19-public-library.js",
      "assets/js/app-modules/20-app-runtime.js",
      "assets/js/app-modules/13-ui-menu-system.js",
      "examples/stable-ids.json",
      "docs/stable-links.md",
      "tests/public-links.test.mjs"
    ],
    sections: [
      {
        id: "modelo",
        title: "Biblioteca não é Cloud",
        content: html`
          <p><strong>Cloud</strong> guarda projetos privados da conta e sincroniza versões editáveis entre dispositivos. <strong>Biblioteca</strong> publica uma representação deliberadamente menor para leitura anónima. Não existe edição remota colaborativa: abrir significa criar um novo projeto local.</p>
          ${table(["Aspeto", "Cloud", "Biblioteca pública"], [
            ["Leitura", "Conta autenticada", "Anónima por URL; listagem apenas de itens publicados"],
            ["Conteúdo", "Documento completo do projeto", "Snapshot de ficheiros de texto suportados"],
            ["Identidade", "ID interno e nome por utilizador", "Nome público único na instalação"],
            ["Atualização", "Sync e ETag", "Nova revisão imutável"],
            ["Ao abrir", "Importa/sincroniza projeto", "Cria cópia local independente"],
            ["Instância", "BackMars configurado", "O mesmo BackMars configurado"]
          ])}
          ${callout("note", "Por instalação", "<p><code>https://a.example/p/aula-1</code> e <code>https://b.example/p/aula-1</code> podem pertencer a autores diferentes. Contas e nomes não atravessam instalações.</p>")}
          ${screenshot("./assets/screenshots/library-menu-light.png", "Menu Biblioteca aberto no webMARS em tema claro", "A Biblioteca é um menu próprio, separado de Cloud e do catálogo de exemplos incorporados.")}
        `
      },
      {
        id: "exemplos-incorporados",
        title: "Ligação direta para um exemplo incorporado",
        content: html`
          <p>Cada exemplo distribuído com o webMARS tem um ID público permanente. Escolha <strong>Biblioteca → Copiar ligação de exemplo incorporado…</strong>, selecione o exemplo e copie a URL.</p>
          ${workflow([
            { label: "1", title: "Escolher exemplo" },
            { label: "2", title: "Copiar /e/ID" },
            { label: "3", title: "Colar no LMS" },
            { label: "4", title: "Abrir como projeto novo" }
          ])}
          <p>Uma navegação direta, por exemplo <code>/e/lesson01-registers</code>, tem prioridade sobre a janela de Boas-vindas. O utilizador vê a pré-visualização e decide abrir como projeto novo; o exemplo original nunca é alterado.</p>
          ${callout("tip", "ID estável", "<p>O nome de ficheiro, o título traduzido e a categoria podem evoluir sem mudar o ID. IDs retirados permanecem no registo como tombstones e nunca são reutilizados.</p>")}
        `
      },
      {
        id: "explorar",
        title: "Explorar em tabela, pesquisar e abrir",
        content: html`
          ${steps([
            "Escolha <strong>Biblioteca → Explorar biblioteca pública…</strong>.",
            "Consulte a tabela com título, nome público, autor, tipo, dificuldade, idioma e data de modificação.",
            "Escreva na barra de pesquisa para filtrar por nome público, título, descrição ou tag. A pesquisa é submetida após uma breve pausa; o botão <strong>Explorar</strong> permite submetê-la imediatamente. Deixe vazio para consultar todos os itens publicados.",
            "Use <strong>Página anterior</strong> e <strong>Página seguinte</strong>: o servidor entrega até 25 resultados de cada vez. Uma pesquisa nova regressa à primeira página.",
            "Escolha um item e selecione <strong>Pré-visualizar</strong>.",
            "Confirme autor, revisão, licença, descrição e instruções.",
            "Selecione <strong>Abrir como cópia local</strong>. O novo projeto passa a pertencer apenas ao seu browser."
          ])}
          <p>Um clique seleciona a linha e mostra descrição, revisão, licença e tags na zona de detalhes. Faça duplo clique ou prima <kbd>Enter</kbd> para pré-visualizar; as setas <kbd>↑</kbd>/<kbd>↓</kbd> percorrem as linhas. Os cabeçalhos identificam as colunas; esta versão não oferece ordenação ao clicar neles.</p>
          ${screenshot("./assets/screenshots/public-library-search-light.png", "Biblioteca pública em vista de detalhe: pesquisa, linhas com metadados, descrição do item selecionado e paginação", "Interface real do webMARS 0.6.3 com publicações sintéticas. A pesquisa consulta o servidor da instalação; a paginação limita cada resposta a 25 resultados.")}
          <p><strong>Abrir ligação pública…</strong> aceita um nome, <code>/p/nome</code>, <code>/p/nome@3</code> ou uma URL completa da mesma origem webMARS. Uma URL absoluta de outra instalação é recusada para não abrir silenciosamente um projeto homónimo no servidor errado.</p>
        `
      },
      {
        id: "publicar",
        title: "Publicar o projeto ativo",
        content: html`
          <p>Publicar exige projeto aberto, sessão BackMars e email verificado. A verificação usa o código enviado no registo; pode introduzir esse código sem pedir outro. Se pedir um novo, o anterior deixa de ser válido.</p>
          ${steps([
            "Guarde e execute o projeto local; remova dados que não pretende tornar públicos.",
            "Escolha <strong>Biblioteca → Publicar projeto ativo…</strong>.",
            "Se necessário, confirme o email com o código temporário.",
            "Escolha o nome público. Use apenas letras minúsculas, números e hífen; o primeiro autor a reclamar o nome fica com ele permanentemente.",
            "Preencha título, descrição, tags, tipo, dificuldade e licença.",
            "Marque <strong>Não listado</strong> se pretender acesso apenas por ligação.",
            "Confirme e guarde as duas URLs apresentadas: latest e revisão fixa."
          ])}
          ${screenshot("./assets/screenshots/publish-project-light.png", "Diálogo Publicar projeto do webMARS em tema claro", "Os metadados ajudam docentes e estudantes a avaliar o material antes de criarem uma cópia local.")}
          ${table(["Campo", "Regra prática"], [
            ["Nome público", "64 caracteres; permanente, único e não renomeável"],
            ["Título", "Humano e pesquisável; pode ser atualizado no latest"],
            ["Descrição/instruções", "Objetivo, pré-requisitos, input e resultado esperado"],
            ["Tags", "Até 8, curtas; por exemplo arrays, recursion, lab-2"],
            ["Tipo", "Exemplo, exercício, solução, laboratório ou biblioteca"],
            ["Dificuldade", "Iniciante, intermédio, avançado ou misto"],
            ["Licença", "Declare permissão de reutilização; CC BY 4.0 é uma opção comum"],
            ["Não listado", "Não aparece na pesquisa, mas continua legível por URL"]
          ])}
        `
      },
      {
        id: "sanitizacao-limites",
        title: "O que é — e não é — publicado",
        content: html`
          <p>O BackMars reconstrói um formato inerte em vez de confiar no documento enviado pelo browser. O cliente repete as verificações antes de guardar uma cópia.</p>
          ${table(["Incluído", "Removido"], [
            ["Nome/descrição pública", "URL Cloud/BackMars guardada no projeto"],
            ["Ficheiros .s, .asm, .mips, .c, .c0, .h, .h0 e .txt", "Cookies, passwords e tokens"],
            ["Path relativo e ficheiro ativo", "IDs locais/remotos e timestamps"],
            ["Texto UTF-8", "Preferências, layout e janelas"],
            ["Metadados públicos da revisão", "Slots de estado, registos e memória em execução"]
          ])}
          <p>Limites predefinidos: 128 ficheiros, 512 KiB por ficheiro, 2 MiB no total, paths até 256 caracteres e oito níveis de diretoria. Paths absolutos, <code>..</code>, duplicados sem distinção de maiúsculas, NUL e extensões binárias são recusados.</p>
          ${callout("warning", "Leia antes de publicar", "<p>Sanitização reduz fugas acidentais do estado da aplicação, mas não entende segredos escritos dentro do código ou comentários. Revise sempre fontes, nomes, descrições e dados de teste.</p>")}
        `
      },
      {
        id: "revisoes-urls",
        title: "Latest, revisão fixa e garantia de URL",
        content: html`
          ${table(["URL", "Comportamento", "Uso recomendado"], [
            ["<code>/p/nome</code>", "Abre a revisão mais recente e metadados atuais; deixa de abrir após arquivo", "Página pessoal, material que deve acompanhar atualizações"],
            ["<code>/p/nome@N</code>", "Conteúdo e metadados imutáveis; permanece após arquivo normal", "LMS, enunciado, aula, avaliação e referência científica"]
          ])}
          <p>Escolha <strong>Biblioteca → As minhas publicações… → Publicar projeto ativo como nova revisão</strong>. A revisão seguinte recebe um número novo; as anteriores não são reescritas. Editar metadados altera o latest, não a resposta já fixada em <code>@N</code>.</p>
          ${callout("note", "Exceção operacional", "<p>Um operador pode remover material por segurança, privacidade ou obrigação legal. Fora dessa exceção, nomes nunca mudam de dono e revisões fixas sobrevivem ao arquivo do autor.</p>")}
        `
      },
      {
        id: "gerir-arquivar",
        title: "Gerir e arquivar uma publicação",
        content: html`
          <p>Em <strong>As minhas publicações…</strong> pode copiar a URL latest, copiar a revisão fixa, pré-visualizar/abrir, editar detalhes e visibilidade, publicar nova revisão ou arquivar.</p>
          <p><strong>Editar detalhes e visibilidade</strong> altera título, descrição, instruções, etiquetas, tipo, dificuldade, licença e o estado publicado/não listado. Numa publicação arquivada, guardar um destes dois estados também a restaura, sem mudar o nome público nem qualquer revisão anterior.</p>
          <p>Arquivar remove o item da pesquisa e faz <code>/p/nome</code> deixar de abrir. O nome continua reservado para sempre e as ligações <code>/p/nome@N</code> mantêm as revisões existentes. Editar ou restaurar exige a conta proprietária com email verificado.</p>
          ${callout("warning", "Arquivo não é apagamento", "<p>Não use arquivo como mecanismo de eliminação urgente de dados sensíveis: revisões fixas foram concebidas para persistir. Contacte o operador para um takedown administrativo.</p>")}
        `
      },
      {
        id: "erros",
        title: "Diagnosticar publicação e abertura",
        content: html`
          ${table(["Mensagem/sintoma", "Causa provável", "Ação"], [
            ["Nome já reclamado", "Outra conta chegou primeiro ou o nome foi arquivado", "Escolher outro nome; o antigo não é libertado"],
            ["Email não verificado", "Código ainda não confirmado", "Cloud → Verificar email; usar o código recebido ou pedir novo"],
            ["Ficheiro inseguro/não suportado", "Path, extensão, duplicado, NUL ou limite", "Corrigir a árvore local e publicar novamente"],
            ["Ligação de outra instalação", "Origem absoluta não corresponde", "Abrir a instalação indicada pela URL, não o nome local"],
            ["Publicação não encontrada", "Nome/revisão incorreto, latest arquivado ou takedown", "Confirmar URL completa e contactar o autor/operador"],
            ["BackMars indisponível", "Rede, CORS, cookie, proxy ou serviço", "O trabalho local continua; tentar mais tarde e fornecer URL/estado ao suporte"]
          ])}
        `
      }
    ]
  }
];
