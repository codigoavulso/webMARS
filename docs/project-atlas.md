# webMARS - Atlas do projeto em Mermaid

Propósito, filosofia, arquitetura e algoritmos, explicados através de diagramas
editáveis. Leitura do webMARS **0.6.6**, revista em **29 de outubro de 2026**,
com base no commit `098494f17a36b14a6639048e834550ebd07f7a58`.

Este ficheiro é a fonte principal do atlas. Os blocos `mermaid` são apresentados
como diagramas em leitores compatíveis, incluindo o GitHub. Podem ser editados
diretamente em Markdown, sem gerar um PDF nem alterar a aplicação.

## 1. Propósito: tornar a máquina compreensível

O programa é o fio condutor: o utilizador escreve, observa o comportamento,
experimenta configurações e partilha o trabalho. As ferramentas acrescentam
perspetivas sobre esse mesmo programa.

```mermaid
flowchart LR
    P["Programa do utilizador"]
    P --> C["Construir<br/>Mini-C e Assembly"]
    C --> E["Executar<br/>Montar, correr e depurar"]
    E --> O["Observar<br/>Registos, memória e E/S"]
    O --> X["Experimentar<br/>Pipeline, cache e dispositivos"]
    X --> C
    P --> S["Partilhar<br/>Exemplos, projetos e publicações"]
    S --> A["Aprender e ensinar"]
    O --> A
    X --> A
    classDef program fill:#173344,color:#fff,stroke:#173344;
    classDef local fill:#e8f3f0,color:#173344,stroke:#087e81;
    classDef learning fill:#fbf0e7,color:#173344,stroke:#b65e27;
    class P program;
    class C,E,O,S local;
    class X,A learning;
```

**Fronteira de escopo:** Mini-C é um subconjunto de C; o sistema de ficheiros é
virtual; a execução é uma simulação educativa. Conta e serviços Online não são
requisitos para editar, compilar, montar ou executar localmente.

## 2. Filosofia: princípios traduzidos em decisões

Este mapa é uma interpretação dos contratos atuais do projeto. Explica por que
uma fronteira técnica importa para a experiência de quem usa a aplicação.

```mermaid
flowchart LR
    subgraph Principles["Princípios"]
        A["Aprender pela observação"]
        B["Autonomia local"]
        C["Preservar o trabalho"]
        D["Separar factos de modelos"]
        E["Compatibilidade demonstrável"]
    end
    subgraph Decisions["Decisões concretas"]
        A1["Estado MIPS visível<br/>e ferramentas ligadas à execução"]
        B1["Motor no browser<br/>e conta opcional"]
        C1["Reciclagem, recuperação<br/>e confirmação de conflitos"]
        D1["Runtime funcional separado<br/>do modelo de pipeline"]
        E1["Referência MARS, testes<br/>e diferenças documentadas"]
    end
    A --> A1 --> A2["Confrontar a explicação com o estado"]
    B --> B1 --> B2["Programar sem depender de login"]
    C --> C1 --> C2["Evitar perdas silenciosas"]
    D --> D1 --> D2["Interpretar corretamente as medições"]
    E --> E1 --> E2["Saber o que está verificado"]
```

Coerência visual, teclado, temas e traduções atravessam estes princípios: uma
funcionalidade deve continuar compreensível quando muda a janela, o idioma ou
a localização do projeto.

## 3. Mapa de camadas: quem coordena quem

As caixas agrupam responsabilidades dos ficheiros atuais. As setas indicam
coordenação ou resultados; não representam a ordem de carregamento dos scripts.

```mermaid
flowchart TB
    subgraph Browser["No browser"]
        UI["Experiência<br/>Editor, projetos, menus, janelas e ajuda"]
        APP["Coordenação<br/>20-app-runtime.js"]
        COMP["Mini-C<br/>17-mini-c-interface.js<br/>17-mini-c-compiler.js a pedido"]
        PROJECTS["Projetos e recuperação<br/>18-runtime-browser-storage.js<br/>20-project-bootstrap.js<br/>20-project-repository.js<br/>21-project-manager.js"]
        TOOLS["Ferramentas<br/>12-ui-tool-manager.js<br/>tools/*.js"]
        CORE["Núcleo MIPS sem DOM<br/>00-core.js<br/>Assembler, execução, memória e backstep"]
        LOCAL["Persistência local<br/>Catálogo confirmado em localStorage<br/>Espelho de recuperação em IndexedDB"]
        SUPPORT["Recursos transversais<br/>Traduções, temas, exemplos e referências"]
        UI --> APP
        APP --> COMP
        APP --> PROJECTS
        APP --> TOOLS
        APP --> CORE
        COMP -->|"Assembly gerado"| CORE
        CORE -->|"Snapshots e eventos via anfitrião"| TOOLS
        PROJECTS --> LOCAL
        SUPPORT -.-> UI
    end
    ONLINE["BackMars opcional<br/>Contas, projetos Cloud e publicações"]
    METRICS["Coletores separados<br/>Estatísticas de utilização"]
    APP <-->|"API e sessão"| ONLINE
    APP -. "Eventos de utilização" .-> METRICS
    classDef core fill:#ebf0f8,color:#173344,stroke:#365f9b;
    classDef service fill:#e8f3f0,color:#173344,stroke:#087e81;
    classDef remote fill:#fbf0e7,color:#173344,stroke:#b65e27;
    class CORE core;
    class APP,COMP,PROJECTS,TOOLS,LOCAL service;
    class ONLINE,METRICS remote;
```

O núcleo não acede ao DOM nem ao armazenamento do browser. A coordenação instala
as ligações necessárias entre motor, interface e serviços. O projeto usa scripts
ordenados com globais partilhados; as camadas acima não implicam uma arquitetura
ESM ou diretórios que não existem.

## 4. Do código à execução: três operações diferentes

Compilar produz Assembly. Montar produz instruções e dados. Executar transforma
o estado MIPS. O Assembly gerado por Mini-C percorre a mesma montagem que o
Assembly escrito à mão.

```mermaid
flowchart TB
    C["Fonte Mini-C"] --> LOAD["Carregar compilador se necessário"]
    LOAD --> PARSE["Analisar e validar<br/>Gerar Assembly"]
    ASM["Fonte Assembly"] --> INPUT["Fontes Assembly comuns"]
    PARSE --> INPUT
    INPUT --> PASS1["Preparar fontes e expansões<br/>Atribuir endereços e símbolos"]
    PASS1 --> PASS2["Resolver referências<br/>Codificar instruções e dados"]
    PARSE -->|"Diagnóstico"| ERR["Corrigir a fonte na fase indicada"]
    PASS1 -->|"Diagnóstico"| ERR
    PASS2 -->|"Diagnóstico"| ERR
    PASS2 --> IMAGE["Imagem montada<br/>Texto, dados e símbolos"]
    IMAGE --> RUN["Executar instruções"]
    RUN --> STATE["Estado MIPS<br/>PC, registos, memória e E/S"]
    STATE --> VIEW["Inspecionar e depurar"]
    classDef artifact fill:#e8f3f0,color:#173344,stroke:#087e81;
    classDef warning fill:#fbf0e7,color:#173344,stroke:#b65e27;
    class INPUT,IMAGE,STATE artifact;
    class ERR warning;
```

O mapa simplifica o algoritmo do assembler; não enumera todos os mecanismos de
macros, diretivas e resolução. Uma falha numa fase não deve ser confundida com
um erro da fase seguinte.

## 5. Execução e backstep: alterações com um rasto inverso

O percurso normal de uma instrução é mostrado abaixo. Os desvios de exceção,
os pedidos de input e os detalhes das syscalls têm contratos próprios.

```mermaid
flowchart LR
    BEFORE["Estado antes do passo"]
    STEP["Ler, descodificar<br/>e executar instrução"]
    AFTER["Estado depois do passo"]
    HISTORY["Histórico limitado<br/>Deltas inversos do PC, registos,<br/>memória e estado capturado"]
    OBS["Observadores<br/>Interface e ferramentas"]
    BACK["Passo atrás<br/>Aplicar inversos pela ordem inversa"]
    BEFORE --> STEP --> AFTER
    STEP -->|"Registar o que mudou"| HISTORY
    AFTER -->|"Snapshots e eventos"| OBS
    HISTORY --> BACK
    BACK -->|"Restaurar estado anterior"| BEFORE
    BACK -->|"Notificar reversão"| OBS
```

Invariantes: `$zero` permanece zero; acessos à memória passam pela API; snapshots
não podem ser alterados pelos consumidores. O histórico tem limites de passos
e bytes: não se promete recuar além do que foi conservado.

## 6. Pipeline: dois relógios e dois fluxos

Um passo funcional executa uma instrução. Um ciclo de pipeline pertence a uma
microarquitetura modelada, com opções de forwarding, predição e latência.

```mermaid
flowchart TB
    IMAGE["Programa montado"] --> FUNCTIONAL["Runtime funcional<br/>Executa a semântica MIPS"]
    FUNCTIONAL --> STATE["Estado real da simulação<br/>PC, registos e memória"]
    FUNCTIONAL --> TRACE["Registo de execução<br/>Sequência, leituras, escritas e saltos observados"]
    IMAGE --> STATIC["Fluxo estático<br/>Ordem do programa e hipótese de saltos"]
    STATIC --> MODEL["Pipeline Lab<br/>Modelo de ciclos configurável"]
    TRACE --> MODEL
    MODEL --> IF["IF"] --> ID["ID"] --> EX["EX"] --> MEM["MEM"] --> WB["WB"]
    WB --> REPORT["Ocupação dos estágios, stalls,<br/>previsões, ciclos e CPI do modelo"]
    classDef functional fill:#ebf0f8,color:#173344,stroke:#365f9b;
    classDef timing fill:#fbf0e7,color:#173344,stroke:#b65e27;
    class FUNCTIONAL,STATE,TRACE functional;
    class MODEL,IF,ID,EX,MEM,WB,REPORT timing;
```

O Pipeline Lab não escreve no estado do runtime. No fluxo estático, os resultados
dos saltos são hipóteses declaradas e não há valores de execução. No replay,
utiliza-se a sequência realmente registada. Ciclos modelados não medem a
velocidade real do browser.

## 7. Projetos: identidade, cópias e publicação

Uma localização não é um formato diferente de projeto. Uma publicação representa
uma revisão partilhável; consultar essa revisão não dá acesso de edição à pasta
do autor.

```mermaid
flowchart LR
    FILES["Ficheiros e pastas"] --> PROJECT["Projeto<br/>Identidade, conteúdo e metadados"]
    PROJECT --> LOCAL["Neste dispositivo<br/>Cópia editável"]
    LOCAL <-->|"Sincronizar"| CLOUD["Nuvem<br/>Documento privado da conta"]
    LOCAL -->|"Publicar snapshot"| REV["Publicação<br/>Revisão imutável"]
    REV --> LIB["Biblioteca pública<br/>Consulta e descoberta"]
    LIB -->|"Abrir uma cópia"| COPY["Novo trabalho local<br/>Editável sem alterar a publicação"]
    LOCAL -->|"Apagar localmente"| TRASH["Reciclagem local"]
    TRASH -->|"Restaurar com nomes e IDs livres"| LOCAL
    classDef local fill:#e8f3f0,color:#173344,stroke:#087e81;
    classDef public fill:#fbf0e7,color:#173344,stroke:#b65e27;
    class LOCAL,COPY,TRASH local;
    class REV,LIB public;
```

Apagar localmente não elimina a cópia Cloud. As ações disponíveis dependem da
localização, das permissões e da seleção. Publicações são snapshots imutáveis;
as ações de gestão do autor tratam revisões, visibilidade e arquivo.

## 8. Recuperação: um catálogo vazio também é uma decisão

Estes estados descrevem a política de arranque, não um novo enum persistido.
O objetivo é impedir que um snapshot antigo faça reaparecer um projeto apagado.

```mermaid
stateDiagram-v2
    state "Ler catálogo confirmado" as Read
    state "Escolher projeto ativo ou primeiro disponível" as Select
    state "Manter catálogo vazio e ficheiros independentes" as Empty
    state "Recuperar ou migrar dados anteriores" as Legacy
    state "Ambiente disponível" as Ready
    [*] --> Read
    Read --> Select: Catálogo válido com projetos
    Read --> Empty: Catálogo válido vazio
    Read --> Legacy: Sem catálogo válido
    Select --> Ready
    Empty --> Ready
    Legacy --> Ready
    Ready --> [*]
```

Na implementação atual, o catálogo confirmado em **localStorage** é a fonte de
verdade. O espelho **IndexedDB** é atualizado após gravações confirmadas e serve
a recuperação. A migração integral para IndexedDB principal continua em aberto.

## 9. Conflitos: escolher antes de substituir

Fluxo da gravação conservadora de um projeto na Cloud. A sincronização da coleção
também compara projetos, mas este diagrama foca a decisão de substituição.

```mermaid
flowchart TB
    START["Preparar cópia local válida"] --> EXISTS{"Há projeto remoto correspondente?"}
    EXISTS -->|"Não"| CREATE["Criar documento remoto"]
    EXISTS -->|"Sim"| READ["Ler conteúdo e ETag atuais"]
    READ --> EQUAL{"Conteúdos iguais?"}
    EQUAL -->|"Sim"| SAME["Confirmar sem substituir"]
    EQUAL -->|"Não"| COMPARE["Mostrar local e Cloud lado a lado"]
    COMPARE --> CHOICE{"Decisão do utilizador"}
    CHOICE -->|"Cancelar"| CANCEL["Manter ambas as cópias inalteradas"]
    CHOICE -->|"Manter ambas"| NAME["Pedir nome livre<br/>Validar no dispositivo e na Cloud"]
    NAME --> BOTH["Criar cópia separada<br/>Preservar a original remota"]
    CHOICE -->|"Manter Cloud"| IMPORT["Importar a cópia remota escolhida"]
    CHOICE -->|"Manter local"| PUT["Substituir usando If-Match<br/>com o ETag revisto"]
    PUT --> MATCH{"A versão remota ainda corresponde?"}
    MATCH -->|"Sim"| SAVED["Confirmar gravação e atualizar referência"]
    MATCH -->|"Não"| REFUSED["Recusar gravação obsoleta<br/>Pedir nova comparação"]
    classDef safe fill:#e8f3f0,color:#173344,stroke:#087e81;
    classDef decision fill:#fbf0e7,color:#173344,stroke:#b65e27;
    class CREATE,SAME,CANCEL,BOTH,IMPORT,SAVED safe;
    class COMPARE,CHOICE,REFUSED decision;
```

O algoritmo escolhe cópias completas; não promete uma fusão automática de linhas.
Falhas de rede, importação ou persistência continuam a ser resultados de erro,
não confirmações de sucesso.

### Porque é que o ETag continua necessário após a confirmação?

O utilizador pode comparar duas cópias e, antes de confirmar, outro dispositivo
alterar a cópia remota. A decisão humana e a precondição do servidor protegem
momentos diferentes.

```mermaid
sequenceDiagram
    actor U as Utilizador
    participant A as webMARS
    participant B as BackMars
    participant O as Outro dispositivo
    A->>B: Ler projeto remoto
    B-->>A: Conteúdo e ETag A
    A-->>U: Comparar local e Cloud
    O->>B: Gravar nova versão com precondição válida
    B-->>O: Nova versão confirmada
    U->>A: Manter a cópia local
    A->>B: PUT do projeto, If-Match ETag A
    B-->>A: Recusar versão obsoleta
    A-->>U: Rever a diferença atual antes de substituir
    Note over A,B: A confirmação não autoriza substituir uma versão ainda não revista
```

## 10. Dados e rede: fronteiras explícitas

Executar o programa no browser não implica ausência de rede. A instalação pode
consultar a sessão, carregar recursos e enviar estatísticas configuradas.

```mermaid
flowchart TB
    subgraph Device["Dispositivo do utilizador"]
        SOURCE["Fontes e projetos locais"]
        ENGINE["Compilação e simulação MIPS"]
        STATE["Estado da máquina simulada"]
        EVENTS["Sinais de utilização<br/>e duração"]
        SOURCE --> ENGINE --> STATE
    end
    HOST["Alojamento estático<br/>App, exemplos, ferramentas e manual"]
    AUTH["BackMars<br/>Contas e sessão"]
    PRIVATE["Projetos Cloud privados"]
    PUBLIC["Publicações públicas"]
    COLLECTOR["Coletor de métricas"]
    AGG["Estatísticas públicas agregadas"]
    HOST -->|"Recursos da aplicação"| ENGINE
    SOURCE <-->|"Sincronização autenticada"| PRIVATE
    SOURCE -->|"Publicação explícita"| PUBLIC
    AUTH -. "Controla acesso" .-> PRIVATE
    EVENTS -->|"Recolha configurada; sem texto do programa"| COLLECTOR
    COLLECTOR --> AGG
    classDef private fill:#ebf0f8,color:#173344,stroke:#365f9b;
    classDef public fill:#fbf0e7,color:#173344,stroke:#b65e27;
    class SOURCE,STATE,AUTH,PRIVATE private;
    class PUBLIC,AGG public;
```

A instalação oficial tem recolha automática configurada. Sessões medidas não
são pessoas únicas; as classes de tráfego são sinais estatísticos, não prova
de humanidade. Os agregados de atividade Cloud confirmados pelo servidor são
distintos da recolha de utilização no browser.

## 11. Evidência: da alteração ao artefacto publicado

O projeto liga o comportamento a testes e a uma versão identificável. Este mapa
organiza as verificações; não afirma que todos os tipos de teste são executados
em todos os jobs de CI.

```mermaid
flowchart LR
    CHANGE["Alteração"] --> FUNCTIONAL["Regressões funcionais<br/>Motor, compilador, ferramentas e projetos"]
    CHANGE --> REFERENCE["Comparação com MARS<br/>Referência fixada por checksum"]
    CHANGE --> PRODUCT["Coerência do produto<br/>Idiomas, manual e ligações"]
    FUNCTIONAL --> EVIDENCE["Evidência e revisão"]
    REFERENCE --> EVIDENCE
    PRODUCT --> EVIDENCE
    MUTATION["Mutações selecionadas"] --> EVIDENCE
    COVERAGE["Cobertura com limites declarados"] --> EVIDENCE
    EVIDENCE --> PACKAGE["Pacote estático validado"]
    PACKAGE --> IDENT["Versão + build + checksums"]
    IDENT --> RELEASE["Publicação reproduzível e identificável"]
```

No relatório desta versão, 11 programas de referência produzem 8 resultados
idênticos ao MARS e 3 com diferenças declaradas, sem diferenças inexplicadas.
As 12 mutações selecionadas foram detetadas. Estes conjuntos são limitados:
cobertura não prova correção e nenhum destes números equivale a compatibilidade
integral ou a uma auditoria completa da interface.

## 12. Evolução: preservar contratos enquanto se simplifica

O trabalho em aberto deve ser lido como direção de manutenção, sem datas
implícitas ou funcionalidades prometidas.

```mermaid
flowchart TB
    subgraph Stable["Contratos a preservar"]
        CORE["Núcleo sem DOM"]
        CLOCKS["Execução separada do timing"]
        WORK["Trabalho local e recuperação"]
        USER["Decisão explícita nos conflitos"]
    end
    REFACTOR["Refatoração incremental<br/>com regressões e fronteiras verificáveis"]
    CORE --> REFACTOR
    CLOCKS --> REFACTOR
    WORK --> REFACTOR
    USER --> REFACTOR
    REFACTOR -.-> SPLIT["Em aberto<br/>Extrair responsabilidades dos módulos extensos"]
    REFACTOR -.-> IDB["Em aberto<br/>Completar a migração para IndexedDB principal"]
    REFACTOR -.-> UX["Manutenção contínua<br/>Coerência de UI, idiomas e documentação"]
    classDef future fill:#fbf0e7,color:#173344,stroke:#b65e27,stroke-dasharray:5 5;
    class SPLIT,IDB future;
```

## Fontes e manutenção

As fontes principais são a [arquitetura](code-architecture.md), os
[invariantes](runtime-invariants.md), o [Pipeline Lab](pipeline-lab.md), as
[métricas](usage-metrics.md), a [evidência](evidence.md), `webmars-config.js` e os
módulos indicados nos mapas. O código e os contratos específicos prevalecem
sobre resumos mais antigos.

Para atualizar: editar o texto e os blocos Mermaid neste ficheiro; rever as
afirmações contra o código; confirmar a renderização dos diagramas. Os mapas
são conceptuais, não uma especificação exaustiva de todas as chamadas ou erros.
Não são consultados dados de utilizadores nem serviços de produção para os gerar.

A [edição anterior em PDF](../output/pdf/webmars-atlas-do-projeto.pdf) é uma
apresentação complementar, com fonte própria em
[`scripts/generate-project-atlas.py`](../scripts/generate-project-atlas.py).
Alterar este Markdown não atualiza automaticamente esse PDF.
