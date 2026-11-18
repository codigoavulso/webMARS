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
    sources: ["assets/js/app-modules/19-usage-statistics.js", "assets/js/usage-metrics.js", "assets/js/active-heartbeat.js", "docs/usage-metrics.md"],
    sections: [
      {
        id: "abrir-e-escolher-periodo",
        title: "Abrir e escolher um período",
        content: html`
          ${steps([
            "Escolha <strong>Ajuda → Estatísticas de utilização</strong>. Não é necessário iniciar sessão Cloud.",
            "Em <strong>Período</strong>, selecione os últimos 60 minutos, 6 horas, 24 horas, 7 dias ou 30 dias.",
            "Em <strong>Público</strong>, escolha tráfego público, provável humano, sem classificação, utilização interna, testes, provável automação ou todo o tráfego. O tráfego público inclui sessões sem classificação; não representa pessoas confirmadas.",
            "Leia os quatro indicadores principais e selecione um cartão para ver a sua evolução no gráfico.",
            "Em <strong>Resultados observados</strong>, compare os resultados de compilar, montar e executar. Abra <strong>Análise</strong> para estudar a recuperação após erros e comparar segmentos.",
            "Abra <strong>Mostrar valores</strong> para consultar os valores do gráfico. O separador <strong>Diagnóstico</strong> detalha o arranque e a execução.",
            "Use <strong>Atualizar</strong> para pedir uma leitura nova. A janela também atualiza automaticamente a cada minuto enquanto está aberta."
          ])}
          <p>A <strong>Panorâmica</strong> apresenta os indicadores, a evolução e as listas de utilização. Abra <strong>Recursos</strong> para filtrar e ordenar as listas, <strong>Versões</strong> para comparar os builds ou <strong>Nuvem</strong> para consultar a atividade de contas e projetos confirmada pelo servidor.</p>
          <p>Em <strong>Classificação do tráfego</strong>, consulte separadamente os grupos medidos nos logs web e nas sessões da app. Para excluir os seus próprios usos da medição pública, marque este navegador como utilização interna na mesma secção. Os dados antigos e os usos internos sem marcação continuam sem classificação.</p>
          ${table(["Período", "Intervalos do gráfico", "Pergunta a que ajuda a responder"], [
            ["Últimos 60 minutos", "60 intervalos de um minuto", "Em que minutos houve atividade recente?"],
            ["Últimas 6 horas", "72 intervalos de cinco minutos", "Durante que partes da aula houve mais atividade?"],
            ["Últimas 24 horas", "Horas de xx:00 a xx:59", "Em que horas se concentra a utilização?"],
            ["Últimos 7 dias", "Sete dias de calendário", "Em que dias da semana houve mais utilização?"],
            ["Últimos 30 dias", "Dias de 00:00 a 23:59", "Como evoluem as visitas e a adoção ao longo das semanas?"]
          ])}
          ${screenshot("./assets/screenshots/usage-statistics-light.png", "Panorâmica semanal com quatro indicadores e um gráfico de evolução", "Os cartões mostram a evolução e a comparação com o período anterior. Os valores são fictícios.")}
          <p>O gráfico usa a hora de Lisboa. Assinala o intervalo em curso como parcial e inclui os dados recebidos até à última leitura. Na mudança de hora, o desvio UTC distingue as horas que se repetem. As vistas de 6 horas e 7 dias requerem o coletor atualizado. Para consultar as contas Cloud a partir de uma destas vistas, use <strong>Últimas 24 horas</strong> no separador <strong>Nuvem</strong>.</p>
        `
      },
      {
        id: "recuperacao-e-segmentos",
        title: "Analisar a recuperação e comparar segmentos",
        content: html`
          <p>No separador <strong>Análise</strong>, <strong>Recuperação após erros</strong> mostra o percurso observado em cada etapa. Uma sessão com o primeiro resultado bem-sucedido entra na primeira categoria. Se o primeiro resultado for um erro, a sessão entra em <strong>Recuperaram após um erro</strong> quando há um sucesso posterior na mesma etapa e no mesmo período. A última categoria conta sessões com erros e sem sucesso registado. Cada sessão com resultado ocupa uma categoria por etapa.</p>
          <p>Por exemplo, se 40 sessões tiverem um resultado de montagem, 25 podem ter sucesso no primeiro resultado registado, 9 podem recuperar após um erro e 6 podem ter só erros. As três categorias somam as 40 sessões. A análise usa a ordem dos resultados recebidos, que pode diferir da ordem real em ligações instáveis. As sessões sem resultado registado ficam fora do total dessa etapa. Compilar, montar e executar são etapas independentes nesta tabela.</p>
          <p>Entre as sessões que recuperaram, a mediana e o percentil 90 descrevem o tempo decorrido entre o primeiro erro e o primeiro sucesso recebido na mesma etapa. Pelo menos 90% das recuperações registadas ocorreram dentro do tempo indicado pelo percentil 90.</p>
          <p>Em <strong>Comparar segmentos</strong>, escolha uma dimensão e dois grupos dessa dimensão. Compare os totais de sessões, a taxa de interação e a taxa de sessões com execução bem-sucedida. Cada taxa divide o número de sessões com o sinal observado pelo total de sessões do segmento. Uma diferença de 10 pontos percentuais separa, por exemplo, 45% de 35%. Ordene a tabela de segmentos para localizar os grupos de maior volume ou com taxas diferentes.</p>
          <p>Use <strong>Mínimo de sessões</strong> para restringir a leitura a grupos de um determinado tamanho. Confira os totais dos dois segmentos antes de interpretar a diferença. Poucas sessões tornam a comparação sensível a um único evento. Diferenças de público, tarefa e período podem influenciar o resultado.</p>
          <p>A origem e o dispositivo vêm do primeiro evento da sessão no período. O idioma vem do último. Ao comparar versões, a mesma sessão pode aparecer em mais do que uma versão. A interação e a execução contam para cada versão em que foram observadas.</p>
        `
      },
      {
        id: "diagnostico-do-arranque-e-da-execucao",
        title: "Consultar tempos e erros no Diagnóstico",
        content: html`
          <p><strong>Tempo visível por janela</strong> soma os segundos observados nos painéis do editor, execução, registos, mensagens, projetos, ajuda e definições, e nas ferramentas incluídas. Uma ferramenta atrás de outra ainda contribui se parte dela estiver visível nos pontos amostrados. Podem contar várias janelas no mesmo segundo. Leia estes valores como tempo de exposição de cada janela.</p>
          <p><strong>Duração das operações</strong> mostra quantas compilações e montagens foram cronometradas, separando sucessos e erros. A mediana descreve uma operação típica. Pelo menos 90% das amostras terminaram no tempo indicado pelo P90 ou antes. O máximo mostra a maior amostra registada. O relógio mede o trabalho do compilador ou montador no navegador.</p>
          <p><strong>Erros detalhados</strong> mostra categorias fixas, como sintaxe, etiqueta duplicada, leitura de memória ou divisão por zero. Cada operação contribui uma vez para cada categoria que apresenta. O CSV inclui as categorias e os tempos agregados.</p>
          <p>No separador <strong>Diagnóstico</strong>, <strong>Como terminam as execuções</strong> distingue saídas normais, erros de execução, paragens pedidas pelo utilizador, fins de programa sem chamada de saída e cancelamentos de entrada. As tabelas mostram eventos recebidos e sessões distintas por categoria. Uma sessão pode contribuir para várias linhas.</p>
          <p>Em <strong>Categorias de erros de execução</strong>, consulte tipos como endereço de memória, chamada de sistema e aritmética. Cada categoria descreve um erro de execução já contado na outra tabela. A aplicação envia apenas uma categoria fixa, sem a mensagem de erro, o endereço ou o número da chamada de sistema.</p>
          <p><strong>Arranque da aplicação</strong> agrupa o tempo desde a navegação até ao primeiro carregamento comunicado por página: menos de um segundo, de um a menos de três, de três a menos de oito e oito segundos ou mais. As falhas comunicadas têm uma categoria própria. As novas categorias abrangem os eventos da aplicação atualizada.</p>
          <p>Em <strong>Recursos</strong> também pode consultar a adoção dos comandos de compilar, montar, repor e pausar, das paragens em pontos de paragem e das esperas por entrada. Cada funcionalidade contribui uma vez por sessão.</p>
        `
      },
      {
        id: "resumo-e-medicoes",
        title: "Interpretar o resumo e as medições completas",
        content: html`
          <p>Cada cartão mostra o total e um gráfico compacto da evolução no período e público selecionados. Os cartões de interação e execução também mostram a percentagem de sessões. A comparação usa o intervalo imediatamente anterior, de igual duração, quando existe cobertura e o coletor fornece os dados. A secção <strong>Diagnóstico</strong> inclui sessões prontas, eventos, presença recente e distribuições de duração.</p>
          ${table(["Medição", "Como interpretar"], [
            ["Sessões medidas", "Sessões temporárias com pelo menos um evento recebido no período; não corresponde a pessoas únicas."],
            ["Novas sessões", "Sessões observadas pela primeira vez no período, sem eventos anteriores na base retida; não significa novos utilizadores ou novas contas."],
            ["Sessões com interação", "Sessões em que o navegador registou uma interação do utilizador ou mediu tempo adicional de interação durante o período."],
            ["Regressos após 24 h", "Sessões iniciadas pelo menos 24 horas após a visita anterior registada no mesmo navegador."],
            ["Sessões com execução bem-sucedida", "Sessões com pelo menos uma execução terminada normalmente. Várias execuções na mesma sessão contam uma vez neste cartão."],
            ["Sessões com app pronta", "Sessões com o evento de carregamento concluído dentro do período."],
            ["Sessões prontas com execução bem-sucedida", "Sessões com app pronta e uma execução terminada normalmente no período; não demonstra correção do exercício."],
            ["Eventos recebidos", "Quantidade de eventos, incluindo resultados de ações, amostras de interação e pings."],
            ["Tempo de interação", "Incrementos de tempo medidos com a página visível, focada e interação recente."],
            ["Presença visível", "Incrementos de tempo com a página visível, mesmo sem foco, medidos pelo heartbeat."],
            ["Presentes nos últimos 5 minutos", "Sessões com heartbeat recebido recentemente, dentro do período consultado; é uma estimativa de presença."],
            ["Mediana de interação / presença visível", "Valor central das durações observadas nas sessões com amostras desse relógio."],
            ["P90 de interação / presença visível", "Percentil 90 das durações observadas: ajuda a perceber o limite superior da maioria da amostra, com menor influência de uma visita muito longa."]
          ])}
          <p>A tabela <strong>Resultados observados</strong> conta sucessos e erros por ação e quantas sessões tiveram pelo menos um resultado. Uma sessão entra na coluna de sessões só com erros quando teve um ou mais erros e nenhum sucesso nessa ação durante o período. A taxa divide os sucessos pela soma de sucessos e erros registados. Uma sessão com três erros de montagem e uma montagem bem-sucedida contribui com quatro resultados, uma sessão e zero sessões só com erros.</p>
          <p>Na execução, ficam fora da taxa as pausas, a espera ou o cancelamento de entrada, as interrupções pelo utilizador e os términos ao chegar ao fim do código. A verificação da solução de um exercício requer critérios do próprio exercício.</p>
          ${callout("note", "Dois relógios separados", "<p>Interação e presença podem medir o mesmo intervalo com regras diferentes. Não some os dois tempos. Os valores representam o período selecionado e podem ser parciais quando uma visita atravessa os seus limites.</p>")}
        `
      },
      {
        id: "graficos-e-filtros",
        title: "Escolher gráficos e filtrar os resultados",
        content: html`
          <p>Em <strong>Panorâmica</strong>, selecione um cartão ou use <strong>Métrica da evolução</strong> para escolher o valor do gráfico. <strong>Tipo de gráfico</strong> alterna entre colunas e linha. Passe o ponteiro sobre o gráfico para ler as datas e o valor de um intervalo. Com o teclado, use Tab para focar o gráfico, as setas para mudar de intervalo e Home ou End para ir ao primeiro ou ao último.</p>
          <p>Os painéis de ferramentas, funcionalidades, exemplos, origens, idiomas e dispositivos de entrada ordenam as categorias pelo número de sessões observadas. Abra <strong>Recursos</strong> para escolher uma distribuição e filtrar os resultados. A medida <strong>Sessões</strong> conta as visitas em cada categoria. <strong>Eventos</strong> conta os registos recebidos nos agrupamentos que oferecem essa medida.</p>
          ${steps([
            "Abra o separador <strong>Recursos</strong> e escolha <strong>Agrupar por → Recursos</strong> e <strong>Medida → Sessões</strong>.",
            "Escreva parte do nome em <strong>Filtrar resultados</strong> para restringir as categorias.",
            "Em <strong>Mostrar</strong>, escolha os primeiros 10, 20 ou todos os resultados. A ordenação segue a medida escolhida, do maior para o menor.",
            "Leia a quantidade ao lado de cada barra."
          ])}
          <p>Mudar a métrica, a distribuição, o texto ou a quantidade mostrada reutiliza os agregados carregados. Mudar o período ou atualizar pede novos dados ao servidor. Uma sessão pode surgir em vários intervalos temporais e categorias: somar as colunas de sessões pode contar a mesma visita mais de uma vez.</p>
        `
      },
      {
        id: "builds",
        title: "Consultar sessões e eventos por versão",
        content: html`
          <p>Abra <strong>Versões</strong> para consultar as sessões e os eventos recebidos por build. A tabela segue os filtros de período e público e também é incluída em <strong>Exportar CSV</strong>.</p>
          <p>O número segue o formato <code>AAAAMMDDhhmm</code>. Um travessão agrupa eventos recebidos sem número de build. Cada sessão é contada uma vez por build e pode aparecer em mais de uma linha se atravessar uma atualização.</p>
        `
      },
      {
        id: "perguntas-praticas",
        title: "Responder a perguntas concretas e exportar dados",
        content: html`
          ${table(["Pergunta", "Leitura recomendada", "Verificação essencial"], [
            ["Estamos a crescer?", "Compare sete dias com o período anterior e acompanhe a tendência dos últimos 30 dias com o mesmo filtro de público.", "Consulte o início da cobertura. Uma alteração na recolha pode simular crescimento."],
            ["As visitas estão a usar a app?", "Compare no resumo as sessões medidas, com interação e com execução bem-sucedida.", "Cada indicador conta as sessões que cumprem a respetiva condição no período."],
            ["Em que ações aparecem mais dificuldades?", "Em Análise, consulte a recuperação após erros por etapa.", "Confira o total de sessões com resultado na etapa e use períodos comparáveis."],
            ["Que ferramentas são mais usadas?", "Consulte o painel de ferramentas na Panorâmica.", "O primeiro uso de cada ferramenta contribui para a adoção medida na sessão."],
            ["Os meus testes estão a distorcer os resultados?", "Compare Público com Utilização interna, Testes e Todo o tráfego.", "Marque o navegador em Classificação do tráfego para classificar as sessões seguintes."],
            ["Quantas contas foram usadas?", "Atividade Cloud confirmada pelo servidor: operações e métodos de entrada.", "Contas ativas no período não são o total de contas registadas na base de dados."]
          ])}
          <p>Use <strong>Exportar CSV</strong> para descarregar os totais, resultados por ação, evolução temporal, listas da panorâmica, distribuição, builds e atividade Cloud carregada para o período e público selecionados. O ficheiro inclui também os agregados de diagnóstico, a recuperação por etapa e os segmentos visíveis na dimensão escolhida, com o mínimo de sessões, a ordenação e os grupos selecionados. As datas de início e fim permitem comparar leituras. A distribuição exportada segue os filtros de nome e limite da vista de recursos.</p>
          <p>O CSV é um retrato dos agregados carregados no momento. Não contém a lista de pessoas, emails, fontes nem sessões individuais. Para responder a uma pergunta administrativa sobre todas as contas registadas, o operador deve consultar os dados próprios do BackMars.</p>
        `
      },
      {
        id: "o-que-e-enviado",
        title: "Que informação alimenta os gráficos",
        content: html`
          <p>A instalação oficial envia automaticamente eventos estatísticos para o seu próprio coletor. A informação ao utilizador encontra-se na área de privacidade de <strong>Ajuda / Sobre</strong> e no apêndice de privacidade do Manual. Não existe uma caixa de estatísticas em <strong>Definições → Interface</strong> nem um diálogo de aceitação; as preferências de interface não controlam este envio.</p>
          <p>Os eventos descrevem abertura e arranque da app, resultados de compilação, montagem e execução, exemplos, ferramentas e funcionalidades incluídas. Idioma, dispositivo de entrada, origem, regresso e tipos de erro de execução são categorias limitadas. O tempo de interação é aproximado. O heartbeat envia a presença visível acumulada a cada 60 segundos, através do mesmo fluxo de eventos e da mesma sessão temporária.</p>
          <p>A recolha exclui fontes, nomes de ficheiros, conteúdo dos projetos, entrada e saída, mensagens de erro, endereços de memória, números de chamadas de sistema, emails, identificadores de conta e URLs completas. Um identificador aleatório temporário permite agrupar eventos da mesma visita. Os gráficos públicos mostram apenas agregados.</p>
          <p>O separador <strong>Manual</strong> mostra sessões de consulta, aberturas do documento e visualizações de capítulos por parte. A mudança de secção dentro do mesmo capítulo não soma uma visualização. Estes números estão disponíveis no CSV e ficam fora dos totais do simulador. Os termos de pesquisa permanecem no dispositivo. Os detalhes de alojamento e dados constam de <a href="#/apendices/privacidade">Mapa de dados e privacidade</a>.</p>
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
          <p>O operador configura <code>metrics.publicEndpoint</code> na mesma origem da app e instala o coletor Python/SQLite com o proxy apropriado. O serviço publica agregados para 60 minutos, 6 horas, 24 horas, 7 dias e 30 dias. Conserva registos durante 35 dias. Veja <a href="#/administrar-estender/estatisticas">Instalar e manter as estatísticas</a> para os passos do operador.</p>
        `
      }
    ]
  }
];
