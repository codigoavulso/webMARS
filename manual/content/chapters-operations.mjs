import {
  MANUAL,
  html,
  callout,
  codeBlock,
  steps,
  table,
  screenshot,
  SHORTCUTS,
  MENU_ATLAS,
  MEMORY_MAP,
  SETTINGS_MATRIX,
  FEATURE_FAMILIES
} from "./shared.mjs";

const GLOSSARY = [
  ["ABI o32", "Convenção MIPS que define argumentos, retornos, registos preservados e frames."],
  ["Assembler / montar", "Traduzir fonte Assembly para instruções e dados endereçados."],
  ["Assembly", "Linguagem textual próxima das instruções e diretivas da máquina."],
  ["Backstep / passo atrás", "Aplicar o delta inverso da última instrução para regressar ao estado anterior."],
  ["BHT", "Tabela de história de branches usada para fazer previsões locais."],
  ["Breakpoint", "Endereço marcado onde a execução para antes de executar a instrução."],
  ["Browser Storage", "Gestor plano de ficheiros persistidos no browser; não é a biblioteca de projetos."],
  ["Bubble", "Slot vazio que atravessa o pipeline sem representar uma instrução útil."],
  ["C0", "Família educativa de linguagem C segura/subconjuntos usada pelo Mini-C."],
  ["C1-NATIVE", "Perfil Mini-C com char por byte, strings nativas, argc/argv e ponteiros adicionais."],
  ["Cloud", "Backend opcional para conta, sessão e documentos de projeto remotos."],
  ["COP0", "Coprocessador de controlo: Status, Cause, EPC, BadVAddr e exceções/interrupções."],
  ["COP1", "Coprocessador de ponto flutuante e respetivos registos/flags."],
  ["CPI", "Ciclos por instrução concluída num modelo de pipeline."],
  ["Delayed branching", "Modo em que a instrução após um branch ocupa um delay slot."],
  ["Diretiva", "Comando ao assembler que organiza segmentos, dados, símbolos ou pré-processamento."],
  ["Endianness", "Ordem dos bytes de um valor multibyte na memória; webMARS usa little-endian."],
  ["EPC", "Registo COP0 que conserva o endereço associado à exceção/retorno."],
  ["ETag", "Token de versão de um documento Cloud usado para impedir sobrescritas obsoletas."],
  ["Exceção", "Transferência de controlo provocada por falha, trap, syscall ou interrupção."],
  ["Flush", "Descarte de instruções em voo após uma decisão ou evento."],
  ["Forwarding", "Encaminhamento de um resultado em voo diretamente para um consumidor."],
  ["Framebuffer", "Região de memória cujas words/bytes são interpretadas como imagem ou terminal."],
  ["Handler", "Rotina que recebe exceção/interrupção, inspeciona COP0 e pode regressar com eret."],
  ["Hazard", "Dependência ou conflito que impede uma instrução de avançar normalmente no pipeline."],
  ["Heap", "Região de alocação dinâmica que cresce para endereços maiores."],
  ["Imagem executável", "Resultado montado: segmentos, símbolos e instruções prontos para o runtime."],
  ["Instrução básica", "Forma que corresponde à codificação executada pelo motor."],
  ["Instrução em voo", "Instrução presente num estágio do pipeline mas ainda não comprometida."],
  ["LL/SC", "Par load-linked/store-conditional baseado numa reserva para atualização atómica."],
  ["Macro", "Sequência fonte parametrizada expandida antes da montagem normal."],
  ["Mapa de memória", "Conjunto de bases/limites de texto, dados, heap, stack, kernel e MMIO."],
  ["Mini-C", "Compilador educativo integrado e os perfis C-like que aceita."],
  ["MMIO", "Memory-mapped I/O: dispositivos controlados por loads/stores em endereços especiais."],
  ["PC", "Program Counter; endereço da próxima instrução funcional."],
  ["Pipeline", "Modelo que sobrepõe fases de várias instruções em ciclos."],
  ["Projeto", "Árvore persistente de fontes, settings, layout e metadados de trabalho."],
  ["Pseudoinstrução", "Forma conveniente expandida pelo assembler numa ou mais básicas."],
  ["Registo", "Elemento de estado de acesso rápido; no MIPS geral tem 32 bits."],
  ["Runtime funcional", "Motor que aplica efeitos arquiteturais sem simular ciclos de um CPU."],
  ["Segmento de dados", "Região da imagem que contém dados estáticos e áreas relacionadas."],
  ["Segmento de texto", "Região da imagem que contém instruções executáveis."],
  ["Snapshot", "Representação de estado observável entregue a vistas/tools; backstep usa deltas inversos."],
  ["Stack", "Região LIFO de chamadas/locais que cresce para endereços menores."],
  ["Stack frame", "Fatia da stack associada a uma chamada de função."],
  ["Stall", "Ciclo em que uma instrução não avança por dependência/recurso."],
  ["Syscall", "Instrução que pede ao runtime um serviço identificado em $v0."],
  ["TTY", "Terminal de texto com dispositivo de entrada/saída e interpretação ANSI opcional."],
  ["VFS", "Sistema virtual de ficheiros persistido no browser para syscalls/programas."],
  ["#use / #include", "Diretivas Mini-C que resolvem bibliotecas ou ficheiros do projeto."]
];

export const operationChapters = [
  {
    id: "cloud",
    number: "13",
    part: "Serviços e configuração",
    title: "Cloud e sincronização",
    summary: "Modelo local-first, conta, sessão, projetos remotos, conflitos, rede, privacidade e recuperação.",
    intro: "Cloud é opcional e independente da execução MIPS. Guarda documentos de projeto num servidor configurado com cookies de sessão e controlo de concorrência por ETag.",
    level: "Intermédio",
    readingMinutes: 24,
    keywords: ["cloud", "login", "conta", "sincronizar", "etag", "conflito", "backmars", "privacidade"],
    sources: ["assets/js/app-modules/20-app-runtime.js", "assets/js/app-modules/13-ui-menu-system.js", "tests/cloud-sync-contract-regression.test.mjs"],
    sections: [
      {
        id: "local-first",
        title: "O modelo local-first",
        content: html`
          <p>O projeto local continua a ser editável sem conta ou rede. Uma sessão Cloud acrescenta uma coleção remota; Sincronizar compara as cópias e pede uma decisão quando encontra diferenças em conflito.</p>
          ${table(["Operação", "Local", "Rede"], [
            ["Editar/compilar/montar/executar", "Completa", "Não necessária"],
            ["Guardar ficheiro/projeto local", "Browser", "Não necessária"],
            ["Atualizar sessão", "Lê cookie", "<code>GET /me</code>"],
            ["Abrir Cloud", "Importa para biblioteca", "Lista e descarrega documento"],
            ["Guardar projeto Cloud", "Persiste primeiro o projeto ativo", "Cria ou atualiza o documento remoto"],
            ["Sincronizar", "Compara/protege cópia", "Upload/download com versões"],
            ["Logout", "Limpa estado autenticado", "Invalida sessão no servidor"]
          ])}
          ${screenshot("./assets/screenshots/cloud-menu-light.png", "Menu Cloud do webMARS sem sessão iniciada, em tema claro", "Sem autenticação, os comandos remotos estão desativados. O projeto local e o runtime permanecem disponíveis.")}
        `
      },
      {
        id: "servidor",
        title: "Servidor Cloud",
        content: html`
          <p>Cada instalação define o seu BackMars em <code>webmars-config.js</code>. A instalação pública do projeto usa <code>https://backmars.nfiles.top/api</code> como referência, mas uma universidade, um docente ou outro operador pode usar um domínio próprio; em desenvolvimento local é frequente usar um endpoint no mesmo computador. Por omissão, <strong>Definições → Servidor Cloud…</strong> apenas informa qual é o serviço fixado pelo administrador, evitando que contas e nomes públicos sejam acidentalmente enviados para outra instância. Só um deployment que declare <code>allowBackMarsOverride: true</code> permite alterá-lo.</p>
          ${callout("warning", "Confie no endpoint", "<p>Username, email, password e projetos são enviados ao servidor selecionado durante as operações correspondentes. Não use um endpoint que não administra ou não reconhece.</p>")}
        `
      },
      {
        id: "conta",
        title: "Criar conta, iniciar e terminar sessão",
        content: html`
          <p>O botão <strong>Continuar com Google</strong>, quando disponível, aparece tanto ao iniciar sessão como ao criar conta. A autorização abre numa janela Google; a palavra-passe Google nunca é introduzida no webMARS. Na primeira entrada, escolha um nome de utilizador disponível. Se cancelar este passo, poderá retomá-lo na próxima entrada.</p>
          <p>Se já tem uma conta com palavra-passe, entre primeiro nessa conta e associe o Google em <strong>Online → Conta → Métodos de entrada associados</strong>. Entrar diretamente com Google pela primeira vez pode criar uma conta Cloud separada; nesse caso, siga o procedimento de fusão abaixo.</p>
          ${steps([
            "Na janela de entrada, escolha <strong>Criar conta</strong>, ou use a opção de registo no menu <strong>Online → Conta</strong>.",
            "Preencha nome de utilizador, email e palavra-passe. Repita a palavra-passe para confirmar. Pode usar Mostrar/Ocultar para a conferir.",
            "Após sucesso, a sessão é iniciada e o nome aparece no menu.",
            "Noutro dispositivo, inicie sessão com o nome de utilizador ou email e a palavra-passe, ou com o Google associado.",
            "Use <strong>Terminar sessão</strong> no menu Online → Conta para sair da conta."
          ])}
          <p>Se uma tentativa falhar, corrija os campos e volte a tentar na mesma janela. Os atalhos entre entrada, registo e recuperação mantêm a operação que estava a realizar, sem transportar a palavra-passe entre formulários.</p>
          <p><strong>Esqueceu-se da palavra-passe?</strong> permite pedir um código temporário para o email da conta ou usar um código já recebido. No passo seguinte pode reenviar o código ou alterar o email. A resposta ao pedido não revela se existe uma conta com esse endereço. Depois de confirmar o código e a nova palavra-passe, fica com sessão iniciada; as outras sessões são revogadas. Se entrar com Google, também pode voltar à janela de entrada e escolher <strong>Continuar com Google</strong>.</p>
          <p><strong>Online → Conta → Verificar email…</strong> permite confirmar o endereço antes de publicar projetos. Introduza o código recebido ou escolha <strong>Enviar novo código</strong>. Cada código é temporário e de uso único; o novo código substitui o anterior. A eliminação de conta ainda depende do administrador da instalação.</p>
          ${screenshot("./assets/screenshots/password-reset-light.png", "Diálogo Esqueceu-se da palavra-passe no tema claro, com o email de uma conta de teste e a opção para usar um código já recebido", "A recuperação começa pelo email da conta ou continua com um código temporário já recebido; a resposta não confirma se esse email está registado.")}
          ${screenshot("./assets/screenshots/email-verification-light.png", "Diálogo Verificar email no tema claro, com o campo para um código temporário de seis dígitos", "A verificação associa o endereço de email à conta antes de permitir publicação pública; o código temporário é introduzido apenas nesta instalação BackMars.")}
        `
      },
      {
        id: "associar-e-fundir",
        title: "Associar Google e fundir duas contas existentes",
        content: html`
          <p><strong>Associar</strong> acrescenta um método de entrada à conta atual. Se esse Google já criou outra conta Cloud, o webMARS apresenta uma proposta de <strong>fusão</strong> para reunir os dados numa única conta.</p>
          ${steps([
            "Termine a sessão e entre com a conta que pretende conservar, usando o respetivo nome de utilizador e palavra-passe.",
            "Abra <strong>Online → Conta → Métodos de entrada associados</strong> e escolha <strong>Associar Google</strong>.",
            "Na janela Google, selecione a identidade que pretende associar e conclua a autorização.",
            "Se existir outra conta Cloud ligada a essa identidade, leia o resumo: conta de origem, conta a conservar e quantidades de projetos e publicações a transferir.",
            "Confirme a palavra-passe da conta que vai conservar e escolha <strong>Fundir contas</strong>. Se os nomes ou as quantidades não forem os esperados, cancele e volte a confirmar as contas.",
            "Após o sucesso, confirme os projetos e as publicações. A mesma conta passa a aceitar tanto a palavra-passe original como a entrada Google."
          ])}
          ${table(["Elemento", "Resultado da fusão"], [
            ["Conta de destino", "Mantém o nome e a palavra-passe da conta em que iniciou sessão."],
            ["Projetos Cloud", "Os projetos da origem são transferidos. Projetos com nomes iguais são preservados separadamente."],
            ["Publicações", "A propriedade passa para a conta de destino; confirme as ligações e revisões na Biblioteca."],
            ["Métodos de entrada", "A identidade Google fica associada à conta conservada."],
            ["Trabalho local", "Continua no browser; a fusão atua sobre as contas e documentos Cloud."]
          ])}
          ${callout("warning", "Escolha a conta a conservar antes de associar", "<p>O sentido da fusão é a conta Google de origem para a conta onde está autenticado. Cancelar a confirmação permite rever a escolha antes da transferência. Não se deve presumir uma função de desfazer a fusão.</p>")}
          <p>Se a janela não abrir, permita popups para esta instalação e repita o clique. Se o Google apresentar uma conta diferente, use o seletor de contas do próprio Google. Uma sessão expirada exige nova entrada antes de repetir a associação.</p>
        `
      },
      {
        id: "pedido-arranque",
        title: "Pedido de sessão no arranque",
        content: html`
          <p>Ao iniciar, o cliente consulta <code>/me</code> para restaurar uma sessão Cloud anterior. Este pedido pode acontecer mesmo sem abrir o menu Cloud. Sem cookie válido, o resultado é “anónimo” e nenhum projeto é enviado.</p>
          ${callout("note", "Privacidade de rede", "<p>“Local por omissão” significa que edição e execução não precisam de backend; não significa ausência absoluta de qualquer pedido ao endpoint Cloud configurado. O pedido de sessão é a exceção de arranque desta release.</p>")}
        `
      },
      {
        id: "abrir",
        title: "Abrir um projeto remoto",
        content: html`
          ${steps([
            "Inicie sessão e selecione <strong>Online → Projetos na nuvem</strong>.",
            "Na vista Projetos, escolha Nuvem. Expanda o projeto para consultar os ficheiros; faça duplo clique para abrir o ficheiro pretendido.",
            "O documento é normalizado e importado para a biblioteca local; preferências/layout locais em vigor não são substituídos indiscriminadamente.",
            "Confirme a árvore, ficheiro ativo e badge de sincronização antes de editar."
          ])}
        `
      },
      {
        id: "guardar-cloud",
        title: "Guardar o projeto ativo na Cloud",
        content: html`
          <p><strong>Online → Projeto → Guardar projeto</strong> envia o projeto ativo para o BackMars configurado. Antes do pedido de rede, o webMARS incorpora as alterações do editor no documento do projeto e persiste a cópia local.</p>
          ${steps([
            "Abra o projeto que pretende enviar e guarde qualquer edição em curso.",
            "Inicie sessão e escolha <strong>Online → Projeto → Guardar projeto</strong>.",
            "O webMARS procura o projeto remoto com o mesmo nome: cria-o se ainda não existir ou atualiza-o com a versão remota atual como precondição.",
            "Aguarde a mensagem <strong>Projeto Cloud guardado</strong> e confirme o nome apresentado.",
            "Se surgir um conflito, mantenha a cópia local, abra a versão remota para comparação e combine conscientemente as alterações."
          ])}
          ${callout("note", "Projeto ativo ou coleção completa", "<p><strong>Guardar projeto</strong> trata apenas do projeto aberto. <strong>Sincronizar todos os projetos</strong> compara a coleção local e remota e é o fluxo indicado para trabalhar em vários projetos ou dispositivos.</p>")}
        `
      },
      {
        id: "sync",
        title: "Sincronizar todos os projetos",
        content: html`
          <p>Sync lista documentos remotos, mede a diferença entre relógio local e servidor e compara metadados/conteúdo. Um projeto local mais recente pode subir; um remoto mais recente ou ausente localmente pode descer.</p>
          ${steps([
            "Guarde primeiro os ficheiros/projetos locais.",
            "Selecione <strong>Sincronizar todos os projetos</strong>.",
            "Não feche o separador enquanto o indicador estiver ativo.",
            "Leia Mensagens MARS: número de projetos verificados e qualquer conflito/erro.",
            "Confirme badges verdes/sincronizados; investigue laranja/vermelho antes de continuar noutro dispositivo."
          ])}
        `
      },
      {
        id: "etag",
        title: "ETags, versões e conflitos",
        content: html`
          <p>Cada documento remoto fornece um ETag calculado a partir do nome/conteúdo. Atualização, rename ou delete envia <code>If-Match</code>. Se outra sessão alterou o projeto, o servidor rejeita a versão antiga e o cliente preserva a cópia local.</p>
          <p>A janela de conflito apresenta as duas cópias lado a lado, com comparação dos ficheiros. Pode manter ambas indicando um nome livre, conservar a cópia local ou conservar a cópia da nuvem. Cancelar mantém ambas inalteradas. Se a cópia remota voltar a mudar durante a decisão, a substituição é recusada e deve rever a diferença atual.</p>
        `
      },
      {
        id: "rename-delete",
        title: "Renomear e eliminar com sessão ativa",
        content: html`
          <p>Apagar um projeto neste dispositivo guarda primeiro uma cópia recuperável na reciclagem e não elimina a cópia Cloud. A sincronização de todos os projetos respeita esta eliminação local e não volta a descarregar automaticamente o projeto enquanto existir esse registo na reciclagem.</p>
          ${callout("warning", "Confirme antes de eliminar", "<p>Apagar na Nuvem é uma operação distinta de apagar neste dispositivo. Confirme a localização antes de eliminar; pode restaurar projetos locais a partir da Reciclagem.</p>")}
        `
      },
      {
        id: "indisponibilidade",
        title: "Trabalhar sem servidor",
        content: html`
          <p>Uma falha Cloud muda o estado/mostra erro, mas o editor e runtime locais continuam. Guarde localmente e descarregue antes de fechar. Quando a rede regressar, atualize a sessão e sincronize.</p>
          <p>Não mude o endpoint para “contornar” uma falha sem saber onde os projetos serão enviados. Um servidor diferente tem contas e coleção independentes.</p>
        `
      }
    ]
  },
  {
    id: "preferencias-acessibilidade",
    number: "15",
    part: "Serviços e configuração",
    title: "Preferências, idiomas e acessibilidade",
    summary: "Todas as definições, valores, temas, localização, teclado, layouts responsivos e limites conhecidos.",
    intro: "Preferências afetam apresentação, âmbito de montagem e semântica de execução. As opções de compatibilidade exigem uma nova montagem; as de interface aplicam-se imediatamente.",
    level: "Todos os níveis",
    readingMinutes: 32,
    keywords: ["settings", "definições", "tema", "idioma", "rtl", "acessibilidade", "memória", "backstep", "mobile"],
    sources: ["assets/js/app-modules/19-runtime-settings.js", "assets/js/app-modules/20-app-runtime.js", "assets/js/app-modules/00-i18n.js", "docs/accessibility.md"],
    sections: [
      {
        id: "indice",
        title: "Índice completo das definições",
        content: table(["Definição", "Efeito"], SETTINGS_MATRIX)
      },
      {
        id: "interface",
        title: "Preferências da interface",
        content: html`
          ${table(["Campo", "Opções/intervalo", "Predefinição"], [
            ["Tema", "Sistema, Claro, Escuro", "Sistema"],
            ["Idioma", "20 idiomas", "Deteção do browser/inglês"],
            ["Menu", "Em cima ou em baixo", "Em cima"],
            ["Faixa Bench", "Mostrar/ocultar", "Oculta"],
            ["Tamanho do editor", "9–22 px", "12 px"],
            ["Altura de linha", "1,0–2,2", "1,25"],
            ["Realce", "Texto, dados e registos", "Ativo conforme defaults"]
          ])}
          <p><strong>Sistema</strong> acompanha a preferência do sistema/browser em tempo real. Para documentação e avaliação reprodutível, escolha Claro ou Escuro explicitamente.</p>
          ${screenshot("./assets/screenshots/settings-interface-light.png", "Diálogo Preferências da interface com tema Claro, Português, menu no Topo e opções de realce", "O tema usado em todas as capturas desta edição foi selecionado explicitamente como Claro.")}
        `
      },
      {
        id: "runtime",
        title: "Runtime e memória",
        content: html`
          ${table(["Campo", "Intervalo", "Nota"], [
            ["Mapa", "Default / Compact Data / Compact Text", "Volte a montar."],
            ["Memória máxima", "0,25–2 GiB", "Alocação esparsa; limite prático do browser."],
            ["Backsteps", "0–1 000 000", "0 desativa; memória cresce com deltas."],
            ["Handler", "Endereço decimal ou hexadecimal válido", "Default <code>0x80000180</code>."]
          ])}
          <p>Uma configuração inválida é rejeitada no diálogo. Mesmo um teto alto não obriga o browser a reservar toda a região, mas um programa que efetivamente toca muita memória pode esgotar recursos.</p>
        `
      },
      {
        id: "idiomas",
        title: "Idiomas e direção do texto",
        content: html`
          <p>A aplicação inclui inglês, espanhol, português, chinês, hindi, árabe, francês, bengali, russo, indonésio, alemão, japonês, coreano, turco, vietnamita, urdu, italiano, polaco, persa e tailandês.</p>
          <p>Na primeira utilização, o código escolhe uma língua base suportada do browser. Uma escolha explícita é guardada e tem prioridade. Chaves ausentes caem para inglês ou para a própria chave.</p>
          <p>Árabe, urdu e persa ativam interface RTL. Texto Assembly e registos continuam a exigir leitura técnica coerente; a UI ajusta direção sem alterar bytes do programa.</p>
        `
      },
      {
        id: "teclado",
        title: "Navegação por teclado",
        content: html`
          <p>Menus, tabs, botões e diálogos oferecem foco e rótulos. O Project Explorer suporta setas, Home, End, Enter, Space, F2 e Delete; atalhos globais aceleram edição/execução.</p>
          <p>A pesquisa <strong>Editar → Procurar</strong> é literal e sensível a maiúsculas/minúsculas; procura a ocorrência seguinte e, uma vez, volta ao início. <kbd>Escape</kbd> fecha menus e várias janelas de ajuda/diálogo.</p>
          ${callout("tip", "Foco visível", "<p>Se um atalho atuar na área errada, prima <kbd>Tab</kbd> até o foco visível estar no alvo. <kbd>Ctrl</kbd> + <kbd>A</kbd> seleciona código quando o editor tem foco, mas pode ter outro efeito fora dele.</p>")}
        `
      },
      {
        id: "responsive",
        title: "Reflow e dispositivos móveis",
        content: html`
          <p>Abaixo de aproximadamente 800 px, o desktop passa a empilhado; abaixo de 500 px, usa variantes compactas. A versão é testada num viewport móvel de referência de 375×812, mas plataformas/touch reais ainda não têm a mesma profundidade de validação que Chrome/Windows.</p>
          <p>No móvel: um painel ativo, tabs de tools, toque simples para abrir ficheiros, long press de cerca de 480 ms para contexto e duplo toque em Ver para fullscreen conforme o fluxo implementado.</p>
        `
      },
      {
        id: "wcag",
        title: "Estado de acessibilidade",
        content: html`
          <p>O objetivo é WCAG 2.2 AA e a auditoria automatizada atual cobre contraste, cor, resize, teclado, movimento reduzido, nome/função/valor e idioma. Isso é evidência inicial, não certificação.</p>
          <ul>
            <li>Temas com contraste medido e foco visível.</li>
            <li>Não depender apenas de cor para estados essenciais.</li>
            <li><code>prefers-reduced-motion</code> reduz transições.</li>
            <li>Rótulos ARIA em tabs móveis e controlos principais.</li>
            <li>Screen Magnifier como apoio em demonstrações.</li>
          </ul>
        `
      },
      {
        id: "limites-a11y",
        title: "Limites conhecidos de acessibilidade",
        content: html`
          ${callout("warning", "Não confundir testes automáticos com uso real", "<p>Screen readers não foram testados por utilizadores em profundidade; reflow a 320 px, tamanhos mínimos de alvo, canvases de dispositivos e ajuda em iframe mantêm pontos de auditoria manual.</p>")}
          <p>Para uma aula inclusiva, disponibilize código/descrições em texto, não dependa das cores do pipeline, permita zoom e ritmo reduzido e forneça alternativa textual aos canvases.</p>
        `
      },
      {
        id: "limpeza",
        title: "Persistência das preferências",
        content: html`
          <p>Preferências são guardadas no armazenamento local e podem ser incluídas nos slots do projeto. <strong>Limpar dados locais</strong> remove também idioma, projetos, recovery, layouts, VFS e Browser Storage e recarrega a aplicação.</p>
          ${callout("danger", "Ação abrangente", "<p>Não use a limpeza apenas para corrigir uma janela. Recupere pelo menu Ver/layout; exporte dados antes de qualquer limpeza global.</p>")}
        `
      }
    ]
  },
  {
    id: "aprender-ensinar",
    number: "16",
    part: "Aprender e manter",
    title: "Aprender e ensinar",
    summary: "Percursos, exemplos, lições, laboratórios, avaliação e recomendações para docentes.",
    intro: "O catálogo contém 58 exemplos localizados em vinte idiomas, organizados em cinco categorias. A melhor aprendizagem combina previsão, execução por passos, explicação e uma pequena modificação.",
    level: "Estudante e docente",
    readingMinutes: 28,
    keywords: ["lições", "exemplos", "ensinar", "docente", "laboratório", "avaliação", "mars-os"],
    sources: ["examples/examples.json", "docs/labs/labs.json", "docs/labs/README.md", "README.md"],
    sections: [
      {
        id: "catalogo",
        title: "As cinco categorias",
        content: html`
          ${table(["Categoria", "Quantidade", "Âmbito"], [
            ["Lessons", "15", "Sequência Assembly progressiva."],
            ["Fundamentals", "6", "Hello, pseudo, strings, input, argumentos e multificheiro."],
            ["Algorithms", "7", "Recursão, ciclos, arrays, matrizes, estilo compilador e COP1."],
            ["C and compilation", "13", "Mini-C, bibliotecas, ABI, perfis e projetos."],
            ["Devices and system", "17", "MMIO, terminais, bitmap, interrupções, cache, BHT e MARS-OS."]
          ])}
          <p>Abra em <strong>Ficheiro → Exemplos → categoria → exemplo</strong>. O menu é hierárquico e não tem pesquisa na 0.6.3; use esta página ou a pesquisa do manual para escolher. A pesquisa da <a href="#/biblioteca-publica/explorar">Biblioteca pública</a> é um fluxo separado.</p>
          ${screenshot("./assets/screenshots/help-menu-light.png", "Menu Ajuda do webMARS 0.6.3 com a entrada Estatísticas de utilização", "O menu reúne ajuda, documentação, Boas-vindas, Kit Docente, estatísticas públicas e informação da aplicação.")}
        `
      },
      {
        id: "licoes",
        title: "As 15 lições Assembly",
        content: html`
          ${table(["N.º", "Conceito", "Pergunta de verificação"], [
            ["01", "Registos e imediatos", "Que bits mudaram e porquê?"],
            ["02", "Complemento para dois", "Como −1 aparece em hex?"],
            ["03", "Portas lógicas em 32 bits", "Que máscara conserva/limpa cada bit?"],
            ["04", "Shifts e potências de dois", "Quando um shift difere de multiplicação/divisão?"],
            ["05", "Comparador e branch", "Qual condição escolhe o PC seguinte?"],
            ["06", "Ciclo contador", "Que registo é estado do ciclo?"],
            ["07", "Words na memória", "Como endereço e conteúdo diferem?"],
            ["08", "Bytes e endianness", "Em que ordem aparecem os bytes?"],
            ["09", "Indexação de array", "Como índice vira offset?"],
            ["10", "Stack", "Por que $sp diminui?"],
            ["11", "Chamada de função", "Onde fica o endereço de retorno?"],
            ["12", "Recursão e frames", "O que cada chamada preserva?"],
            ["13", "Codificação", "Que campos representam os operandos?"],
            ["14", "IEEE 754", "Como sinal/expoente/fração codificam o valor?"],
            ["15", "Hierarquia/stride", "Por que o padrão de acesso muda a cache?"]
          ])}
        `
      },
      {
        id: "metodo",
        title: "Método prever–executar–explicar–alterar",
        content: html`
          ${steps([
            "Leia o comentário e escreva a previsão de registos, output ou métrica.",
            "Monte e avance apenas até ao primeiro ponto que pode refutar a previsão.",
            "Explique a mudança em termos de instrução, operandos e estado anterior.",
            "Use backstep e repita com uma entrada/constante alterada.",
            "No fim, execute à velocidade máxima e compare o resultado global."
          ])}
          <p>Este método evita que a animação substitua o raciocínio. Ferramentas são mais úteis depois de o aluno ter uma hipótese.</p>
        `
      },
      {
        id: "percurso-minic",
        title: "Percurso Mini-C recomendado",
        content: html`
          <ol>
            <li>Hello C e console basics.</li>
            <li>Ciclos S2 e arrays.</li>
            <li>Stack/heap/ABI com Stack Visualizer.</li>
            <li>Strings e stdio/readline/parse.</li>
            <li>Projeto multificheiro com includes explícitos.</li>
            <li>C0 completo e bibliotecas.</li>
            <li>C1-NATIVE, argc/argv e strings nativas.</li>
          </ol>
          <p>Em cada etapa, abra o Assembly gerado e escolha uma função para relacionar parâmetros, prólogo, loads/stores e retorno.</p>
        `
      },
      {
        id: "laboratorios-pipeline",
        title: "Laboratórios Pipeline",
        content: html`
          <p>Os sete laboratórios incluem worksheet, solução e teacher guide. Começam pelos cinco estágios e avançam por hazards de dados, forwarding/load-use, branches, previsão, CPI/scheduling e latência de memória.</p>
          ${callout("tip", "Avaliação", "<p>Peça a previsão antes de abrir a solução; recolha export JSON/CSV, configuração e uma explicação curta. Avalie causalidade, não apenas o CPI final.</p>")}
        `
      },
      {
        id: "mars-os",
        title: "MARS-OS como estudo de caso",
        content: html`
          <p>MARS-OS é um projeto Assembly com nove ficheiros: entrada, bibliotecas, filesystem, aplicações, editor, folha de cálculo, BASIC, desktop e kernel. Arranca num ambiente ao estilo Windows 95 dentro do TTY ANSI.</p>
          <p>Use-o só depois de dominar MMIO, chamadas, exceções e projeto multificheiro. É excelente para arquitetura de software e integração, mas demasiado grande para introduzir uma instrução isolada.</p>
        `
      },
      {
        id: "guia-docente",
        title: "Preparar uma aula reproduzível",
        content: html`
          <ul>
            <li>Fixe versão webMARS, tema Claro, idioma e viewport.</li>
            <li>Distribua nome/categoria do exemplo e alterações, não uma sessão pessoal.</li>
            <li>Abra e ligue tools antes do run; Reset entre grupos.</li>
            <li>Desative execução máxima quando quer observar estados intermédios.</li>
            <li>Guarde um slot de projeto para layout/configuração e faça download dos ficheiros.</li>
            <li>Tenha um plano sem Cloud/rede.</li>
            <li>Não use cor/canvas como única evidência; peça tabela/texto exportado.</li>
          </ul>
        `
      }
    ]
  },
  {
    id: "resolucao-problemas",
    number: "17",
    part: "Aprender e manter",
    title: "Resolução de problemas",
    summary: "Sintomas, diagnóstico e recuperação para carregamento, construção, execução, ferramentas, armazenamento, Cloud e layout.",
    intro: "Diagnostique pela fase e preserve dados antes de experimentar uma recuperação abrangente. A maioria dos problemas torna-se simples quando se distingue fonte, imagem, runtime, tool e persistência.",
    level: "Todos os níveis",
    readingMinutes: 34,
    keywords: ["erro", "problema", "não funciona", "bloqueado", "quota", "layout", "cloud", "diagnóstico"],
    sources: ["help/pt/BugReportingHelp.html", "help/pt/MarsHelpLimits.html", "tests/robustness-fuzz.test.mjs"],
    sections: [
      {
        id: "arvore-diagnostico",
        title: "Primeiro: identifique a fase",
        content: html`
          ${table(["Sintoma", "Fase provável", "Primeira evidência"], [
            ["Página incompleta", "Carregamento", "Consola/rede e versão servida."],
            ["Diagnóstico no F4", "Mini-C", "Primeiro erro do Log."],
            ["Diagnóstico no F3", "Assembler", "Primeira Mensagem MARS."],
            ["Botões Go/Step inativos", "Imagem/estado", "Montagem e estado do controlo."],
            ["Go não termina", "Runtime/input/ciclo", "Estado, PC, E/S e contador."],
            ["Tool vazia", "Ligação/configuração", "Connect, exemplo, base e momento de abertura."],
            ["Projeto não persiste", "Armazenamento/quota", "Mensagem de gravação e tamanho."],
            ["Cloud diverge", "Sessão/versionamento", "Mensagens, badge e ETag/conflito."]
          ])}
        `
      },
      {
        id: "carregamento",
        title: "A aplicação não termina de carregar",
        content: html`
          ${steps([
            "Confirme que abriu por HTTP(S), não <code>file:</code>.",
            "Recarregue uma vez sem preservar uma versão parcial do cache/proxy.",
            "Se for local, confirme que o servidor anuncia a raiz completa e Node 20+.",
            "Verifique se scripts, exemplos, libs, tools, help e vendor foram publicados — não apenas index.html.",
            "Não limpe projetos antes de descarregar/inspecionar o armazenamento num perfil que ainda abra."
          ])}
        `
      },
      {
        id: "ficheiros",
        title: "O ficheiro não abre ou não aparece",
        content: html`
          <ul>
            <li>Confirme extensão suportada e ausência de bytes NUL/conteúdo binário.</li>
            <li>Um <code>.p</code> deve ser selecionado sozinho para importação de projeto.</li>
            <li>Limpe o filtro/pesquisa da árvore e verifique ordenação.</li>
            <li>Ficheiros de outro projeto ou biblioteca global podem abrir <code>[RO]</code>.</li>
            <li>O Browser Storage é uma lista separada da árvore de projetos.</li>
          </ul>
        `
      },
      {
        id: "build",
        title: "Erros de Mini-C ou Assembly",
        content: html`
          <p>No Mini-C, confirme perfil, raiz ativa e includes explícitos. No assembler, confirme âmbito, símbolos, diretivas e intervalos. Corrija sempre o primeiro erro; volte a executar a fase e confirme sucesso.</p>
          ${callout("warning", "Imagem anterior", "<p>Se a nova montagem falhou, não assuma que os botões executam a fonte atual. Reinicie o fluxo depois de uma montagem bem-sucedida.</p>")}
        `
      },
      {
        id: "botoes",
        title: "Botões de execução desativados",
        content: html`
          <p>Compile exige C ativo; Montar exige Assembly/âmbito; Go/Step exigem imagem; Pause/Stop exigem run ativo; Backstep exige história. Se o programa terminou/parou, use Reiniciar. Se alterou mapa/opções, volte a montar.</p>
        `
      },
      {
        id: "input",
        title: "Programa bloqueado à espera de input",
        content: html`
          <p>Leia o estado e o painel E/S. Escreva o formato correto e Enviar/Enter. Verifique se popup input está ativo e atrás de outra janela. Para fim de ficheiro/linha nos serviços aplicáveis, use <code>/eof</code>.</p>
        `
      },
      {
        id: "breakpoint",
        title: "Programa para repetidamente no mesmo breakpoint",
        content: html`
          <p>O primeiro Step/Go deve atravessar o breakpoint uma vez. Se o controlo regressa pelo ciclo, voltará a parar legitimamente. Desmarque BP ou coloque a paragem numa condição/posição diferente; o editor não tem gutter.</p>
        `
      },
      {
        id: "backstep",
        title: "Passo atrás indisponível",
        content: html`
          <ul>
            <li>Histórico configurado como 0.</li>
            <li>Nenhuma instrução executada desde Reset/montagem.</li>
            <li>Chegou ao delta mais antigo ainda conservado.</li>
            <li>A execução foi substituída por uma nova imagem/estado incompatível.</li>
          </ul>
        `
      },
      {
        id: "ferramenta",
        title: "Ferramenta sem dados",
        content: html`
          ${steps([
            "Confirme que a janela está em Connect, não apenas aberta.",
            "Use o exemplo recomendado e o mapa de memória correto.",
            "Faça Reset da tool e Reiniciar do programa; ligue antes do Go.",
            "Avance por Step e veja se o primeiro evento chega.",
            "Para MMIO, confirme base, offsets, bits ready/enable e que nenhuma outra tool sobrepõe endereços."
          ])}
        `
      },
      {
        id: "bitmap-terminal",
        title: "Bitmap ou terminal vazio",
        content: html`
          <p>Confirme framebuffer, dimensões, unidade, destino WBMP e momento de ligação. No TTY, confirme que montou o Assembly gerado do exemplo C, ligou antes de Go e deu foco ao terminal. Um programa em polling pode estar simplesmente à espera de tecla.</p>
        `
      },
      {
        id: "midi-download-popup",
        title: "MIDI sem som, download ou popup bloqueado",
        content: html`
          <p>Faça uma interação do utilizador para desbloquear áudio, confirme volume e política do site. Downloads/popups devem resultar de um clique/tecla; autorize o site ou use o painel E/S em vez de input popup.</p>
        `
      },
      {
        id: "quota",
        title: "Quota do browser atingida",
        content: html`
          <p>Descarregue ficheiros, remova projetos/slots/VFS desnecessários e reduza conteúdos. Browser Storage e source de projetos aplicam limites próprios próximos de 1 MiB; o browser acrescenta a sua quota.</p>
          ${callout("danger", "Não limpe antes do backup", "<p>Uma limpeza global remove todas as famílias locais e recarrega. Use-a apenas depois de exportar e verificar.</p>")}
        `
      },
      {
        id: "cloud",
        title: "Cloud indisponível ou em conflito",
        content: html`
          <p>Guarde/descarregue localmente e atualize a sessão. Use <strong>Online → Projeto → Guardar projeto</strong> para enviar apenas o projeto ativo ou <strong>Sincronizar todos os projetos</strong> para comparar a coleção. Em conflito, preserve ambas as versões e combine manualmente; não repita uploads cegamente.</p>
        `
      },
      {
        id: "layout",
        title: "Janela invisível ou layout perdido",
        content: html`
          <ol>
            <li>Use <strong>Ver</strong> para tornar a janela visível.</li>
            <li>Alterne fullscreen/layout e regresse.</li>
            <li>Carregue/reponha layout em vez de limpar dados.</li>
            <li>Se mudou muito a resolução, use o reset de layout para esse viewport.</li>
          </ol>
        `
      },
      {
        id: "relatorio",
        title: "Preparar um relatório de erro útil",
        content: html`
          <p>Inclua versão, browser/OS, passos mínimos, fonte pequena, input, opções relevantes, mensagem completa e resultado esperado/real. Para pipeline/tool, anexe export/configuração; para Cloud, não envie password, cookie, token ou projeto privado.</p>
          ${table(["Incluir", "Evitar"], [
            ["webMARS 0.6.3 e URL/local", "“Não funciona” sem fase"],
            ["Exemplo ou fonte mínima", "Projeto inteiro com dados pessoais"],
            ["Primeiro diagnóstico completo", "Screenshot ilegível sem texto"],
            ["Mapa, delayed branch, strict, backsteps", "Credenciais, IPs, cookies ou tokens"],
            ["Passos determinísticos", "Limpar dados antes de preservar evidência"]
          ])}
        `
      }
    ]
  },
  {
    id: "administrar-estender",
    number: "19",
    part: "Aprender e manter",
    title: "Instalar, administrar e estender",
    summary: "Alojamento estático, backend Cloud, ferramentas, instruções, syscalls, localização, testes e releases.",
    intro: "Este capítulo separa tarefas de utilizador das responsabilidades de quem aloja ou modifica o webMARS. Alterações de runtime precisam de testes e documentação proporcionais ao risco.",
    level: "Avançado",
    readingMinutes: 52,
    keywords: ["hosting", "deploy", "backend", "tool api", "extensão", "syscall", "instrução", "localização", "testes"],
    sources: ["docs/self-hosting.md", "docs/stable-links.md", "docs/tool-api.md", "docs/adding-instructions.md", "docs/adding-syscalls-and-devices.md", "docs/localization.md", "docs/evidence.md", "scripts/package-release.mjs"],
    sections: [
      {
        id: "hosting",
        title: "Alojar a aplicação estática",
        content: html`
          <p>Publique a release completa com caminhos intactos e tipos MIME para HTML, JS/MJS, JSON, CSS, imagens, PDF e fontes Assembly/C. Use HTTPS público, headers de segurança compatíveis e logs/retention declarados. Gere primeiro o pacote isolado com <code>npm run package:release</code>; não copie <code>.git</code>, testes ou ficheiros temporários para a raiz pública.</p>
          ${table(["Campo em webmars-config.js", "Valor/efeito"], [
            ["instanceName", "Nome da universidade, disciplina ou instalação mostrado nas Boas-vindas"],
            ["appBasePath", "<code>/</code> ou subpasta terminada em <code>/</code>; deve coincidir com <code>&lt;base href&gt;</code>"],
            ["publicBaseUrl", "Origem/base canónica usada nas ligações copiadas"],
            ["backMarsApiBase", "API desta instalação, terminada em <code>/api</code>"],
            ["allowBackMarsOverride", "Recomendado <code>false</code> para não fragmentar identidade/contas"],
            ["manualUrl", "Deployment independente deste Manual"],
            ["supportUrl", "Contacto público do operador; nunca um segredo"]
          ])}
          ${steps([
            "Defina a identidade pública sem credenciais em <code>webmars-config.js</code>.",
            "Valide a release e gere ZIP/checksum através do fluxo do repositório.",
            "Publique numa pasta de release nova e troque o symlink/raiz só depois de completa.",
            "Configure fallback para <code>/e/ID</code> e <code>/p/nome@N</code>, mas mantenha 404 real para assets ausentes.",
            "Teste <code>/</code>, refresh numa ligação estável, exemplos, libs, tools, help, Manual, PDF e versão.",
            "Abra uma sessão limpa e execute os smoke tests Assembly/Mini-C/tool.",
            "Só depois atualize ligações/documentação pública."
          ])}
          <p>A configuração Nginx de referência está em <code>ops/raspberry-pi/nginx-webmars-routes.conf</code>. Num deployment em subpasta, prefixe as rotas e o path de <code>index.html</code>; um catch-all indiscriminado pode esconder uma release incompleta ao devolver HTML no lugar de JavaScript.</p>
        `
      },
      {
        id: "estatisticas",
        title: "Instalar e manter as estatísticas",
        content: html`
          <p>O painel de <strong>Ajuda → Estatísticas de utilização</strong> é público e independente do BackMars. O ZIP estático contém a interface; a recolha e os agregados exigem um serviço separado na mesma origem. A instalação oficial ativa-o automaticamente; noutra instalação, a configuração pertence ao operador.</p>
          ${table(["Configuração", "Função"], [
            ["metrics.enabled", "Ativa a recolha desta instalação"],
            ["metrics.endpoint", "Destino dos eventos, incluindo heartbeat; normalmente <code>/_metrics/events</code>"],
            ["metrics.publicEndpoint", "Leitura agregada; normalmente <code>/_metrics/public</code>"]
          ])}
          ${steps([
            "Instale o coletor e os snippets através de <code>ops/raspberry-pi/install-metrics.sh</code> antes de publicar o frontend que os usa.",
            "Mantenha Python/SQLite em loopback e a base de métricas privada, separada da base de contas/projetos do BackMars.",
            "Inclua o snippet de métricas no servidor HTTPS, valide Nginx e confirme os limites de pedidos e a política de logs.",
            "Verifique a leitura pública para <code>?window=60m</code>, <code>24h</code> e <code>30d</code>, sem sessões ou linhas individuais na resposta.",
            "Use uma base de dados isolada para eventos sintéticos; confirme o painel e a atualização sem poluir os dados públicos.",
            "Registe a data de alteração da política de recolha e conserve essa referência ao comparar tendências."
          ])}
          <p>O coletor conserva registos durante 35 dias, elimina os expirados periodicamente e disponibiliza agregados com cache de 30 segundos. Os eventos e o heartbeat atual partilham o mesmo fluxo; o antigo endpoint separado mantém compatibilidade com clientes anteriores. O guia técnico é <code>docs/usage-metrics.md</code>. O <a href="#/estatisticas-utilizacao">capítulo de estatísticas</a> explica o que cada medida permite concluir.</p>
        `
      },
      {
        id: "backend",
        title: "Configurar o backend Cloud",
        content: html`
          <p>O serviço BackMars é Flask/SQLite separado. Produção exige ambiente explícito, segredo de sessão aleatório, pepper independente para códigos, origens exatas, proxy confiável correto, cookies seguros, base fora do checkout e migração/restart controlados.</p>
          ${table(["Configuração", "Regra de produção"], [
            ["WEBMARS_USERS_ENV", "<code>production</code>; o serviço recusa adivinhar"],
            ["SECRET_KEY", "Aleatório; rodar termina todas as sessões"],
            ["BACKMARS_ACCOUNT_CODE_PEPPER", "Aleatório e diferente; rodar invalida códigos pendentes"],
            ["BACKMARS_DATABASE", "Path absoluto fora do código; diretório 0700, DB 0600"],
            ["WEBMARS_USERS_ALLOWED_ORIGINS", "Origem HTTPS exata do frontend"],
            ["WEBMARS_USERS_TRUSTED_PROXIES", "Número real de proxies; não confiar em X-Forwarded-For diretamente"],
            ["SESSION_COOKIE_*", "Secure; SameSite Lax no mesmo site ou None apenas em cross-site HTTPS"],
            ["Limite de body", "Nginx e BackMars coerentes; 4 MiB por omissão"]
          ])}
          <p>O contrato inclui health, register/login/logout/me, verificação/recuperação de conta, CRUD/sync Cloud com ETags e publicações/revisões. Não exponha listagem administrativa de utilizadores na API pública. O guia executável está em <code>docs/self-hosting.md</code>.</p>
        `
      },
      {
        id: "smtp",
        title: "Configurar Gmail/SMTP sem expor a password",
        content: html`
          ${steps([
            "Ative verificação em dois passos na conta Gmail do remetente.",
            "Crie uma App Password; não use a password normal da conta.",
            "No servidor, crie <code>/etc/backmars/backmars.env</code> como root:root, modo 0600.",
            "Defina MAIL_ENABLED, remetente, smtp.gmail.com, porta 587, starttls, username e App Password.",
            "Ative envio assíncrono e exigência de email verificado para publicação.",
            "Reinicie, confirme <code>mailConfigured</code> em health e faça um reset real numa conta de teste."
          ])}
          ${callout("danger", "Segredo só no servidor", "<p>Nunca escreva a App Password em <code>webmars-config.js</code>, Git, logs, screenshot, issue ou conversa. Introduza-a diretamente no ficheiro root-only. O frontend nunca precisa de a conhecer.</p>")}
          <p>BackMars recusa modos SMTP desconhecidos e transporte sem TLS em produção. Os códigos têm seis dígitos, expiram, permitem poucas tentativas, são de uso único e só o HMAC é guardado. Limites por conta/endereço protegem a quota; instalações grandes devem preferir relay institucional.</p>
        `
      },
      {
        id: "backup-upgrade",
        title: "Backup, migração e smoke test",
        content: html`
          ${steps([
            "Abra uma janela curta de manutenção e identifique paths absolutos do serviço e DB.",
            "Faça backup consistente com <code>sqlite3 app.db '.backup ...'</code>; não copie apenas o ficheiro principal com WAL ativo.",
            "Guarde a configuração sem imprimir os segredos e confirme permissões 0700/0600.",
            "Instale a nova release numa diretoria diferente e dependências Python fixadas.",
            "Arranque um processo para concluir migrações aditivas; só depois aumente workers.",
            "Teste health, registo+email, reset, login, Cloud save/sync, primeira reclamação de nome, latest, revisão fixa e arquivo.",
            "Mantenha código anterior e backup até o teste passar; restaure ambos em conjunto se necessário."
          ])}
          ${callout("note", "URLs durante arquivo", "<p>O latest deixa de abrir quando o autor arquiva. Revisões <code>@N</code> continuam disponíveis; apenas um takedown administrativo explícito pode removê-las.</p>")}
        `
      },
      {
        id: "tool-api",
        title: "Criar uma ferramenta webMARS",
        content: html`
          <p>Use <code>docs/tool-api.md</code> e o scaffold <code>npm run new:tool</code>. Uma tool declara ID/label, cria uma janela, liga/desliga, recebe snapshots/eventos e deve isolar erros.</p>
          ${codeBlock(`host.register({
  id: "minha-tool",
  label: "Minha Tool",
  create(context) {
    // construir UI, ligar observadores e devolver lifecycle
  }
});`, "JavaScript — esquema ilustrativo")}
          <ul>
            <li>Não mutar estado fora das APIs autorizadas.</li>
            <li>Implementar Reset, Connect/Disconnect e cleanup idempotentes.</li>
            <li>Respeitar backstep, execução máxima, layout móvel e tema.</li>
            <li>Não bloquear o event loop em cada instrução.</li>
            <li>Adicionar ao manifesto e testes do catálogo/contrato.</li>
          </ul>
        `
      },
      {
        id: "instrucoes",
        title: "Adicionar uma instrução",
        content: html`
          <p>Siga parsing/normalização, pass 1/2, codificação/decodificação, execução, exceções, PC e registos. Resolva nomes através do catálogo do motor, nunca escreva <code>$zero</code> e preserve atomicidade de memória.</p>
          <p>Adicione testes positivos, limites de imediatos, alinhamento/endereço, overflow e diferencial quando a instrução existe no MARS 4.5. Atualize referência gerada e matriz de compatibilidade.</p>
        `
      },
      {
        id: "syscalls-dispositivos",
        title: "Adicionar syscall ou dispositivo",
        content: html`
          <p>Documente número/endereços, entradas, saídas, memória, blocking/async, erros, reversibilidade e portabilidade. Valide todo o destino antes de escrever; um erro não deve deixar efeitos parciais.</p>
          <p>Dispositivos precisam de protocolo ready/enable/interrupt, reset, snapshot/backstep, mapa compacto e interação com ferramentas. Evite sobreposição MMIO não declarada.</p>
        `
      },
      {
        id: "localizacao",
        title: "Adicionar ou manter uma tradução",
        content: html`
          <p>Inglês é fonte; espanhol/português têm revisão manual; outros catálogos podem ser gerados. Preserve placeholders, registos, nomes de produto e marcação. A cobertura exige paridade de chaves.</p>
          <p>Traduza texto visível, title, aria-label e placeholder. Teste direção RTL quando aplicável e ajuda/exemplos no idioma.</p>
        `
      },
      {
        id: "testes",
        title: "Validar uma alteração",
        content: html`
          ${table(["Camada", "Evidência"], [
            ["Estática/build", "Arquivos, manifestos, versões e imports."],
            ["Regressão funcional", "Assembler, runtime, Mini-C, tools, Cloud."],
            ["Invariantes", "$zero, PC, memória atómica, heap, backstep."],
            ["Diferencial", "Resultados contra MARS 4.5 com diferenças declaradas."],
            ["Pipeline", "Microarquitetura, replay, BHT, export determinístico."],
            ["Acessibilidade/i18n", "Contraste, teclado, nomes, paridade e RTL."],
            ["Robustez", "Fuzz, limites, exceções e casos adversos."],
            ["Release", "Pacote, versão, changelog e smoke tests."]
          ])}
        `
      },
      {
        id: "manual-release",
        title: "Manter este manual",
        content: html`
          <p>Atualize a versão editorial, a versão webMARS compatível, commit/data de verificação, changelog e matriz de cobertura. Gere referências a partir da release, recapture estados no tema Claro e execute <code>npm run validate</code> dentro de <code>manual/</code>.</p>
          <p>Uma funcionalidade nova só está documentada quando tem página, termos de pesquisa, procedimentos/limites e, se visual, uma captura reproduzível.</p>
        `
      }
    ]
  },
  {
    id: "apendices",
    number: "A",
    part: "Apêndices",
    title: "Apêndices e glossário",
    summary: "Atlas de menus, atalhos, defaults, mapas, formatos, glossário, privacidade, créditos e citação.",
    intro: "Tabelas de consulta rápida para usar ao lado do webMARS ou imprimir.",
    level: "Referência",
    readingMinutes: 25,
    keywords: ["apêndice", "glossário", "atalhos", "defaults", "menus", "privacidade", "licença", "citação"],
    sources: ["assets/js/app-modules/13-ui-menu-system.js", "assets/js/app-modules/10-ui.js", "assets/js/app-modules/00-core.js", "LICENSE", "CITATION.cff"],
    sections: [
      {
        id: "menus",
        title: "Atlas dos menus",
        content: table(["Menu", "Comandos"], MENU_ATLAS)
      },
      {
        id: "atalhos",
        title: "Mapa de atalhos",
        content: table(["Ação", "Atalho", "Notas"], SHORTCUTS)
      },
      {
        id: "defaults",
        title: "Valores predefinidos selecionados",
        content: html`
          ${table(["Área", "Predefinição"], [
            ["Versão MARS", "4.5"],
            ["Assembler estendido", "Ativo"],
            ["Delayed branching / strict / self-modifying", "Inativos"],
            ["Começar em main / argumentos / popup input", "Inativos"],
            ["Backsteps", "100"],
            ["Máximo de mensagens", "200 000 caracteres"],
            ["Máximo de erros", "200"],
            ["Armazenamento de source", "1 MiB em famílias limitadas"],
            ["Tema / menu / Bench", "Sistema / topo / oculto"],
            ["Editor", "12 px / altura 1,25"],
            ["Cloud", "Definida por <code>webmars-config.js</code>; a instalação pública usa <code>https://backmars.nfiles.top/api</code>"]
          ])}
        `
      },
      {
        id: "mapa",
        title: "Mapa Default",
        content: table(["Região", "Base", "Papel"], MEMORY_MAP)
      },
      {
        id: "formatos",
        title: "Formatos e limites rápidos",
        content: html`
          ${table(["Item", "Valor"], [
            ["Fontes", "<code>.s .asm .mips .c .c0 .h .h0 .txt</code>"],
            ["Projeto importável", "<code>.p</code> JSON, selecionado sozinho"],
            ["VFS descriptors", "32 incluindo 0/1/2"],
            ["String terminada em zero", "Até 1 MiB no scan do runtime"],
            ["Data view", "16 linhas por página; range navegável limitado"],
            ["Memória configurável", "0,25–2 GiB, esparsa e sujeita ao browser"],
            ["Backstep", "0–1 000 000 e orçamento de bytes"],
            ["Pipeline replay", "Até 20 000 eventos observados"],
            ["Undo por ficheiro", "Até 500 estados"]
          ])}
        `
      },
      {
        id: "glossario",
        title: "Glossário",
        content: table(["Termo", "Definição"], GLOSSARY)
      },
      {
        id: "privacidade",
        title: "Mapa de dados e privacidade",
        content: html`
          ${table(["Dados", "Destino", "Quando"], [
            ["Fontes/projetos locais", "Armazenamento do browser", "Autosave/Guardar"],
            ["Preferências/layout/VFS", "Armazenamento do browser", "Ao alterar/usar"],
            ["Estado de sessão", "Endpoint Cloud", "Pedido <code>/me</code> no arranque"],
            ["Username/email/password", "Endpoint Cloud", "Registo/login"],
            ["Documento de projeto", "Endpoint Cloud", "Abrir/sincronizar"],
            ["Eventos, categorias e sessão temporária", "Coletor da instalação", "Automaticamente na instalação oficial; sem conteúdo de fontes ou identificadores de conta"],
            ["Interação e presença visível", "Mesmo fluxo de eventos estatísticos", "Amostras de interação e heartbeat de presença a cada 60 segundos"],
            ["Gráficos públicos", "Endpoint de agregados da instalação", "Ao abrir/atualizar as estatísticas; sem registos individuais"],
            ["Bench", "Só memória/UI local", "Compilar/montar/executar"],
            ["Manual: pesquisa", "Só browser", "Ao escrever nesta pesquisa"]
          ])}
          <p>A área de privacidade de Ajuda/Sobre e as páginas públicas explicam a recolha automática. As preferências de interface não controlam o envio. O token temporário liga eventos de uma visita, mas não é publicado no painel; <a href="#/estatisticas-utilizacao/o-que-e-enviado">Que informação alimenta os gráficos</a> descreve os campos e exclusões.</p>
          <p>Os logs do servidor web podem registar pedidos e endereços conforme a política do operador; são separados da base de métricas. O coletor de referência não guarda IP, cookies ou cabeçalhos completos, e expira os seus registos após 35 dias. Não inclua credenciais ou dados pessoais em screenshots, exports ou relatórios públicos.</p>
        `
      },
      {
        id: "licenca-citacao",
        title: "Licença, créditos e citação",
        content: html`
          <p>O repositório usa licença MIT. O webMARS reconhece a linhagem MARS original de Pete Sanderson e Kenneth Vollmar, além de contributos da comunidade. Consulte <code>LICENSE</code>, ajuda Acknowledgements e <code>CITATION.cff</code> antes de redistribuir ou citar academicamente.</p>
          <p>Ao citar resultados, inclua versão webMARS, commit quando possível, exemplo/fonte, opções e ambiente. Para o manual, inclua versão ${MANUAL.version} e data de acesso.</p>
        `
      }
    ]
  },
  {
    id: "cobertura",
    number: "",
    part: "Apêndices",
    title: "Cobertura funcional da v0.2",
    summary: "Matriz auditável das famílias que esta edição se compromete a documentar.",
    intro: "Cobertura não significa que todas as linhas de implementação são reproduzidas; significa que cada superfície do utilizador tem uma explicação, procedimento, referência ou limite explícito.",
    level: "Meta",
    readingMinutes: 8,
    keywords: ["cobertura", "matriz", "audit", "feature ids", "manual v0.2"],
    sources: ["manual/content/*.mjs", "tools/tools.json", "help/pt/help-reference.json", "examples/examples.json"],
    sections: [
      {
        id: "familias",
        title: "Famílias cobertas",
        content: table(["Família", "Itens", "Estado"], FEATURE_FAMILIES.map(([family, count, status]) => [family, String(count), `<span class="status-badge">${status}</span>`]))
      },
      {
        id: "divergencias",
        title: "Divergências corrigidas nesta edição",
        content: html`
          <ul>
            <li>20 ferramentas, não 18.</li>
            <li>Breakpoints na tabela Text Segment, não no gutter do editor.</li>
            <li>Slots não guardam o estado do motor MIPS.</li>
            <li>Browser Storage gere ficheiros individuais, não slots de projeto.</li>
            <li>Novo projeto cria <code>src/main.c</code> e <code>src/main.s</code>.</li>
            <li>Exemplos são menus hierárquicos, sem pesquisa.</li>
            <li>Compilação C segue apenas raiz ativa e includes explícitos.</li>
            <li>Menu em cima/baixo; RTL em árabe, urdu e persa.</li>
            <li><code>$sp</code> inicial Default é <code>0x7fffeffc</code>.</li>
            <li>Backstep usa deltas inversos, não snapshots integrais.</li>
            <li>Online → Projeto → Guardar projeto envia o projeto ativo; Sync compara a coleção completa.</li>
            <li>Importação <code>.p</code> existe sem exportação de projeto equivalente identificada.</li>
            <li>Biblioteca pública em tabela, com pesquisa no servidor e páginas de 25 resultados.</li>
            <li>Estatísticas públicas em Ajuda, com seis indicadores imediatos e 12 medições disponíveis.</li>
            <li>Sessões de utilização não equivalem a pessoas únicas nem a contas Cloud.</li>
          </ul>
        `
      },
      {
        id: "imagens",
        title: "Estado das capturas",
        content: html`
          <p>A edição v0.2 integra <strong>36 capturas reais em tema claro</strong>: 16 estados gerais e uma captura isolada de cada uma das 20 ferramentas. Biblioteca pública, menu Ajuda e estatísticas foram capturados no webMARS 0.6.3; as 33 imagens restantes mantêm a proveniência 0.6.0 indicada no protocolo. O conjunto e os fixtures estão definidos em <code>SCREENSHOTS.md</code>; mockups nunca substituem evidência visual do produto.</p>
          ${callout("note", "Critério de publicação", "<p>Cada captura tem de indicar versão, tema, idioma, viewport, exemplo e estado. A ausência de uma imagem nunca remove os passos em texto.</p>")}
        `
      },
      {
        id: "proximas-versoes",
        title: "Critérios para as próximas edições",
        content: html`
          <ul>
            <li>Manter as 36 capturas, recapturando cada estado quando a interface correspondente mudar.</li>
            <li>Separar páginas profundas por ferramenta sem quebrar slugs.</li>
            <li>Gerar edição PDF completa e índice remissivo.</li>
            <li>Adicionar manifesto automatizado de features → capítulos → screenshots → testes.</li>
            <li>Auditar uma release webMARS posterior e registar alterações de comportamento ou interface.</li>
          </ul>
        `
      }
    ]
  },
  {
    id: "changelog",
    number: "",
    part: "Apêndices",
    title: "Changelog do manual",
    summary: "Histórico editorial independente do changelog da aplicação.",
    intro: "A versão do manual muda quando o conteúdo, cobertura ou formato editorial muda — não apenas quando o webMARS lança uma versão.",
    level: "Meta",
    readingMinutes: 4,
    keywords: ["changelog", "histórico", "versão 0.2"],
    sources: ["manual/CHANGELOG.md"],
    sections: [
      {
        id: "v0-2-0",
        title: "0.2.0 — 20 de outubro de 2026",
        content: html`
          <h3>Adicionado e atualizado</h3>
          <ul>
            <li>Capítulo de estatísticas: períodos, resumo, medições completas, filtros, tabelas e limites de interpretação.</li>
            <li>Biblioteca em vista de detalhe, pesquisa no servidor, paginação de 25 resultados e navegação por teclado.</li>
            <li>Mapa de dados, informação sobre recolha automática e instruções do coletor no guia do operador e no Kit Docente.</li>
            <li>Três capturas atuais dos fluxos novos ou alterados; 36 imagens no total.</li>
            <li>Catálogos auditados contra o webMARS 0.6.3 e referências de versão atualizadas.</li>
          </ul>
          <p>webMARS <code>${MANUAL.webmarsVersion}</code>, commit <code>${MANUAL.verifiedCommit.slice(0, 12)}</code>, verificado em ${MANUAL.verifiedAt}.</p>
        `
      },
      {
        id: "v0-1-1",
        title: "0.1.1 — 3 de setembro de 2026",
        content: html`
          <h3>Corrigido</h3>
          <ul>
            <li>Contraste WCAG AA dos textos atenuados nos temas claro e escuro.</li>
            <li>Contraste das contagens nos separadores da referência pesquisável.</li>
            <li>Validação automatizada das combinações de texto e superfícies do Manual.</li>
            <li>Inclusão integral do Manual e do Kit Docente no ZIP de instalação do webMARS.</li>
          </ul>
          <h3>Produto documentado</h3>
          <p>webMARS <code>0.6.1</code>, commit <code>9835baae3f8d</code>, verificado em 2026-09-03.</p>
        `
      },
      {
        id: "v0-1-0",
        title: "0.1.0 — 29 de agosto de 2026",
        content: html`
          <h3>Adicionado</h3>
          <ul>
            <li>Arquitetura editorial completa em português europeu.</li>
            <li>Navegação por capítulos/secções, pesquisa local e URLs profundas.</li>
            <li>20 capítulos numerados, além da entrada, apêndices, cobertura e changelog.</li>
            <li>Tutoriais, procedimentos e referência para toda a superfície principal.</li>
            <li>20 ferramentas e capítulo integral do Pipeline Lab.</li>
            <li>Referência versionada de 157 instruções básicas, 388 pseudoinstruções, 20 diretivas e matriz de syscalls.</li>
            <li>Cloud, acessibilidade, armazenamento, administração, troubleshooting, glossário e cobertura.</li>
            <li>Biblioteca pública, ligações estáveis, snapshots sanitizados, revisões e arquivo.</li>
            <li>Recuperação de password/verificação de email por código temporário e Boas-vindas.</li>
            <li>Kit Docente com migração do MARS, primeira aula, LMS, avaliação e self-hosting.</li>
            <li>35 capturas reais em tema claro: 15 estados gerais e as 20 ferramentas.</li>
            <li>Build autónomo, testes editoriais, impressão e protocolo de screenshots.</li>
          </ul>
          <h3>Produto documentado</h3>
          <p>webMARS <code>0.6.0</code>, commit <code>e15ce68b3b90</code>, verificado em 2026-08-29.</p>
        `
      },
      {
        id: "politica",
        title: "Política de versões",
        content: html`
          ${table(["Tipo", "Exemplo"], [
            ["Patch", "Correção factual ou editorial sem alterar cobertura/URLs."],
            ["Minor", "Nova release webMARS auditada, novo capítulo ou cobertura material."],
            ["Major", "Reorganização incompatível de slugs, esquema ou público principal."]
          ])}
        `
      }
    ]
  }
];
