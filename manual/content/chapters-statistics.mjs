import { html, callout, screenshot, steps, table } from "./shared.mjs";

export const statisticsChapters = [
  {
    id: "estatisticas-utilizacao",
    number: "20",
    part: "Aprender e manter",
    title: "Estatísticas de utilização",
    summary: "Consultar a atividade pública, comparar períodos e perceber quais os recursos usados, com os limites de cada medição.",
    intro: "O painel reúne estatísticas agregadas da instalação. Permite observar visitas e adoção de recursos sem publicar contas, sessões individuais ou o conteúdo dos projetos.",
    level: "Todos os níveis",
    readingMinutes: 16,
    keywords: ["estatísticas", "métricas", "sessões", "heartbeat", "ping", "presença", "interação", "gráficos", "mediana", "p90", "privacidade"],
    sources: ["assets/js/app-modules/19-usage-statistics.js", "assets/js/usage-metrics.js", "assets/js/active-heartbeat.js", "ops/raspberry-pi/webmars-metrics.py", "docs/usage-metrics.md"],
    sections: [
      {
        id: "abrir-e-escolher-periodo",
        title: "Abrir e escolher um período",
        content: html`
          ${steps([
            "Escolha <strong>Ajuda → Estatísticas de utilização</strong>. Não é necessário iniciar sessão Cloud.",
            "Em <strong>Período</strong>, selecione os últimos 60 minutos, 24 horas ou 30 dias.",
            "Em <strong>Público</strong>, escolha tráfego público, provável humano, sem classificação, utilização interna, testes, provável automação ou todo o tráfego. O tráfego público inclui sessões sem classificação; não representa pessoas confirmadas.",
            "Leia os seis indicadores principais e compare os gráficos de evolução e distribuição.",
            "Abra <strong>Mostrar valores</strong> sob o resumo para consultar todas as medições; cada gráfico tem a sua própria tabela de valores.",
            "Use <strong>Atualizar</strong> para pedir uma leitura nova. A janela também atualiza automaticamente a cada minuto enquanto está aberta."
          ])}
          <p>Em <strong>Classificação do tráfego</strong>, consulte os grupos medidos nos logs e a ligação às sessões da app. A atividade Cloud confirmada pelo servidor apresenta contagens de criação, entrada e utilização de contas, separadamente das sessões anónimas. Para excluir os seus próprios usos da medição pública, marque este navegador como utilização interna em <strong>Ajuda → Sobre → Privacidade</strong>. Os dados antigos e os usos internos sem marcação continuam sem classificação.</p>
          ${table(["Período", "Intervalos do gráfico", "Pergunta a que ajuda a responder"], [
            ["Últimos 60 minutos", "12 intervalos de cinco minutos", "Há atividade recente e que recursos estão a ser usados?"],
            ["Últimas 24 horas", "24 intervalos de uma hora", "Em que horas se concentra a utilização?"],
            ["Últimos 30 dias", "30 intervalos de um dia", "Como evoluem as visitas e a adoção ao longo das semanas?"]
          ])}
          ${screenshot("./assets/screenshots/usage-statistics-light.png", "Estatísticas de utilização no tema claro: seis indicadores principais, evolução da atividade e distribuição por tipos de evento", "Interface real do webMARS 0.6.3 com dados sintéticos de demonstração; os números não representam utilização real. As duas visualizações partilham uma linha em ecrãs largos e ficam empilhadas em ecrãs menores.")}
          <p>Os períodos são móveis, contados para trás a partir da leitura do servidor. As horas e datas são apresentadas segundo o idioma e o fuso horário do browser. A resposta agregada pode ficar em cache no servidor durante 30 segundos.</p>
        `
      },
      {
        id: "resumo-e-medicoes",
        title: "Interpretar o resumo e as medições completas",
        content: html`
          <p>O resumo destaca seis valores. A opção <strong>Mostrar valores</strong> conserva as 12 medições, incluindo presença recente e distribuições de duração.</p>
          ${table(["Medição", "Como interpretar"], [
            ["Sessões medidas", "Sessões temporárias com pelo menos um evento recebido no período; não corresponde a pessoas únicas."],
            ["Novas sessões", "Sessões observadas pela primeira vez no período, sem eventos anteriores na base retida; não significa novos utilizadores ou novas contas."],
            ["Sessões com app pronta", "Sessões com o evento de carregamento concluído dentro do período."],
            ["Sessões prontas com execução bem-sucedida", "Sessões com app pronta e uma execução terminada normalmente no período; não demonstra correção do exercício."],
            ["Eventos recebidos", "Quantidade de eventos, incluindo resultados de ações, amostras de interação e pings."],
            ["Tempo de interação", "Incrementos de tempo medidos com a página visível, focada e interação recente."],
            ["Presença visível", "Incrementos de tempo com a página visível, mesmo sem foco, medidos pelo heartbeat."],
            ["Presentes nos últimos 5 minutos", "Sessões com heartbeat recebido recentemente, dentro do período consultado; é uma estimativa de presença."],
            ["Mediana de interação / presença visível", "Valor central das durações observadas nas sessões com amostras desse relógio."],
            ["P90 de interação / presença visível", "Percentil 90 das durações observadas: ajuda a perceber o limite superior da maioria da amostra, com menor influência de uma visita muito longa."]
          ])}
          ${callout("note", "Dois relógios separados", "<p>Interação e presença podem medir o mesmo intervalo com regras diferentes. Não some os dois tempos. Os valores representam o período selecionado e podem ser parciais quando uma visita atravessa os seus limites.</p>")}
        `
      },
      {
        id: "graficos-e-filtros",
        title: "Escolher gráficos e filtrar os resultados",
        content: html`
          <p>Na barra superior, <strong>Métrica da evolução</strong> escolhe o valor do gráfico temporal: sessões, novas sessões, eventos, carregamentos, resultados de compilação/montagem/execução, ferramentas, funcionalidades, exemplos, heartbeats ou duração. <strong>Tipo de gráfico</strong> alterna entre colunas e linha nos dois gráficos.</p>
          <p>Em <strong>Distribuição</strong>, escolha como agrupar: tipos de evento, recursos, origens, idiomas, dispositivos de entrada, páginas/app ou categorias de regresso. A medida <strong>Sessões</strong> indica quantas visitas utilizaram uma categoria. <strong>Eventos</strong> está disponível para tipos de evento e recursos.</p>
          ${steps([
            "Para comparar ferramentas, escolha <strong>Agrupar por → Recursos</strong> e <strong>Medida → Sessões</strong>.",
            "Escreva parte do nome em <strong>Filtrar resultados</strong>; o filtro atua sobre as categorias já agregadas.",
            "Em <strong>Mostrar</strong>, escolha os primeiros 10, 20 ou todos os resultados. A ordenação segue a medida escolhida, do maior para o menor.",
            "Consulte <strong>Mostrar valores</strong> sob o gráfico para ler nomes completos e quantidades exatas. Passe o ponteiro sobre uma coluna ou ponto para consultar o respetivo valor."
          ])}
          <p>Mudar a métrica, a distribuição, o texto ou a quantidade mostrada reutiliza os agregados carregados. Mudar o período ou atualizar pede novos dados ao servidor. Uma sessão pode surgir em vários intervalos temporais e categorias: somar as colunas de sessões pode contar a mesma visita mais de uma vez.</p>
        `
      },
      {
        id: "o-que-e-enviado",
        title: "Que informação alimenta os gráficos",
        content: html`
          <p>A instalação oficial envia automaticamente eventos estatísticos para o seu próprio coletor. A informação ao utilizador encontra-se na área de privacidade de <strong>Ajuda / Sobre</strong> e nas páginas públicas de privacidade. Não existe uma caixa de estatísticas em <strong>Definições → Interface</strong> nem um diálogo de aceitação; as preferências de interface não controlam este envio.</p>
          <p>Os eventos descrevem abertura da página/app, app pronta, resultados de compilação, montagem e execução, exemplos, ferramentas e funcionalidades incluídas. Idioma, dispositivo de entrada, origem e regresso são categorias limitadas. O tempo de interação é aproximado; o heartbeat envia a presença visível acumulada a cada 60 segundos, através do mesmo fluxo de eventos e da mesma sessão temporária.</p>
          <p>Não são enviados fontes, nomes de ficheiros, conteúdo dos projetos, input/output, mensagens de erro completas, emails, identificadores de conta ou URLs completas. Um identificador aleatório temporário permite agrupar eventos da mesma visita; os gráficos públicos não expõem esse identificador nem registos individuais.</p>
          <p>A recolha da app, os logs do servidor web e a conta Cloud são sistemas distintos. O Manual mantém pesquisa local e não envia telemetria. Os detalhes de alojamento e dados constam de <a href="#/apendices/privacidade">Mapa de dados e privacidade</a>.</p>
        `
      },
      {
        id: "limites-da-analise",
        title: "Avaliar crescimento sem confundir as medidas",
        content: html`
          ${table(["Observação", "Conclusão possível", "Conclusão que não demonstra"], [
            ["Mais sessões medidas", "Mais visitas observadas sob a mesma política de recolha", "Mais pessoas únicas ou mais contas Cloud"],
            ["Mais sessões a abrir uma ferramenta", "Maior adoção observada dessa ferramenta", "Mais cliques ou uso continuado durante toda a visita"],
            ["Mais execuções bem-sucedidas", "Mais saídas normais do runtime", "Respostas corretas, aprovação ou conclusão de exercícios"],
            ["Mais presença visível", "Mais tempo observado com a página visível", "Atenção contínua ou trabalho efetivo de cada pessoa"],
            ["Categoria de regresso", "Indicação aproximada baseada num timestamp local", "Retenção individual entre dispositivos ou browsers"]
          ])}
          <p>Bloqueadores, falhas de rede, suspensão, páginas ocultas e visitas curtas podem reduzir a cobertura. Recarregar, abrir outros separadores ou indisponibilidade do armazenamento podem alterar o agrupamento. As estatísticas são declaradas pelo cliente e não servem para avaliar alunos ou contar utilizadores registados.</p>
          <p>Compare períodos equivalentes, tendo em conta horários de aulas e alterações de recolha. O número de contas da Cloud só pode ser apurado pelos dados administrativos do BackMars; não se deduz deste painel.</p>
        `
      },
      {
        id: "indisponibilidade-e-instalacao",
        title: "Painel vazio e instalação própria",
        content: html`
          <p><strong>Sem dados para estes filtros</strong> pode significar um período sem eventos ou um filtro demasiado restrito. Limpe o texto, escolha todos os resultados e confirme o período antes de concluir que o serviço está vazio.</p>
          <p><strong>Estatísticas indisponíveis nesta instalação</strong> indica falha ou ausência do serviço agregado. O editor e o simulador continuam utilizáveis. Num alojamento apenas estático, o coletor não está incluído no ZIP e tem de ser instalado à parte.</p>
          <p>O operador configura <code>metrics.publicEndpoint</code> na mesma origem da app e instala o coletor Python/SQLite com o proxy apropriado. O serviço publica agregados para 60 minutos, 24 horas e 30 dias; conserva registos durante 35 dias e não precisa da base de contas BackMars. Veja <a href="#/administrar-estender/estatisticas">Instalar e manter as estatísticas</a> para os passos do operador.</p>
        `
      }
    ]
  }
];
