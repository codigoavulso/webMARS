# Plano de validação com pessoas

Quase tudo o que este projeto afirma sobre si próprio é verificável sem
perguntar ao autor: há relatórios gerados para conformidade, cobertura,
mutação, desempenho, acessibilidade automática e portabilidade. Ver
[evidence.md](evidence.md).

Três afirmações não são: que a API de ferramentas é utilizável por quem não a
escreveu, que o Pipeline Lab ensina alguma coisa, e que a interface é operável
por quem usa tecnologia de apoio. Nenhuma delas se resolve com mais testes
automáticos — resolvem-se com pessoas.

Este documento prepara esse trabalho para que possa ser executado sem o
desenhar de novo. **Nada aqui foi executado.** Enquanto assim for, nenhuma
conclusão destas secções pode ser citada.

## 1. Validação da API por terceiros

**Objetivo.** Saber se `docs/tool-api.md` e `npm run new:tool` chegam para
alguém que nunca viu o código escrever uma ferramenta que funcione.

**Quem.** Dois contribuidores externos, com experiência de JavaScript e sem
familiaridade com este repositório.

**Tarefas.**

| # | Tarefa | Referência |
| --- | --- | --- |
| A | Criar uma ferramenta que observe um registo e registe as alterações. | `tools/example-register-watch.js` |
| B | Criar uma ferramenta que consuma eventos de runtime e conte instruções por tipo. | `tools/instruction-counter.js` |
| C | Acrescentar uma instrução simples à ISA e um teste que a fixe. | [adding-instructions.md](adding-instructions.md) |

Cada participante recebe apenas: o repositório, o `README.md` e a instrução de
começar por [contributing-first-change.md](contributing-first-change.md). Não
recebe ajuda do autor enquanto não desistir de um passo.

**O que se regista** (por participante e por tarefa):

- tempo até ao primeiro ecrã a funcionar, e tempo total;
- cada momento em que a documentação foi consultada e não respondeu;
- cada erro de execução e o que o causou;
- cada alteração ao core que a tarefa obrigou a fazer;
- o ponto exato onde pediu ajuda, se pediu.

**Critério.** A tarefa A tem de ser concluível sem ajuda. Se não for, a falha é
da documentação, não do participante, e o relatório diz qual parágrafo faltava.

**Saída.** Um relatório anónimo em `docs/third-party-validation.md`, com os
tempos, a lista de bloqueios e as alterações que os bloqueios provocaram. Os
participantes são identificados por letra.

## 2. Estudo de usabilidade do Pipeline Lab

### Perguntas de investigação

Definidas antes de haver quaisquer dados, para que os dados não as escolham:

- **PI1.** Depois de um laboratório guiado, um estudante consegue identificar a
  causa de um stall específico numa linha temporal que nunca viu?
- **PI2.** A vista "Arquitetura" melhora essa identificação em relação à vista
  "Aprender" sozinha, piora-a, ou não a altera?
- **PI3.** Reproduzir a execução real (valores nos registos, saltos reais) leva
  a explicações mais corretas do que o fluxo estático com saltos assumidos?
- **PI4.** Que parte da interface é lida como sendo o runtime funcional quando
  na verdade é o modelo de ciclos — ou seja, onde é que os dois relógios são
  confundidos?

PI4 é a pergunta de risco: se a resposta for "com frequência", a separação
entre modelo e runtime está a ser afirmada pela documentação e não pela
interface, e isso é um defeito de desenho.

### Desenho

- **Participantes.** 20 se possível, estudantes de uma cadeira de arquitetura
  de computadores e docentes da mesma área. Menos de 12 não sustenta comparação
  entre grupos; nesse caso o estudo passa a descritivo e diz isso.
- **Grupos.** Atribuição aleatória entre "Aprender apenas" e "Aprender +
  Arquitetura" para PI2. PI3 é intra-participante: cada um vê os dois fluxos,
  em ordem contrabalançada.
- **Duração.** 60 minutos: 5 consentimento, 10 pré-teste, 25 laboratório, 15
  tarefas, 5 questionário.

### Instrumentos

**Pré-teste e pós-teste** (mesmas 8 perguntas, ordem trocada): identificar um
hazard RAW em três instruções; dizer quantos ciclos separa duas instruções
dependentes com e sem forwarding; explicar por que razão um `lw` seguido do seu
consumidor custa um ciclo mesmo com forwarding; dizer o que acontece às
instruções mais novas quando um salto é mal previsto.

**Tarefas medidas** (tempo, erros, conclusão):

| # | Tarefa | Mede |
| --- | --- | --- |
| T1 | Encontrar o primeiro stall numa linha temporal dada e dizer que registo o causou. | PI1 |
| T2 | Prever os ciclos de um programa de 6 instruções e verificar com **Verificar previsão**. | PI1 |
| T3 | Explicar por que razão o mesmo programa tem CPI diferente em dois perfis. | PI2 |
| T4 | Dizer o valor de um registo três ciclos antes do fim, e onde estava antes disso. | PI3 |
| T5 | Dizer quantas instruções o webMARS executou e quantos ciclos o modelo contou, e porquê diferem. | PI4 |

**Questionário.** SUS (10 itens, escala de 5) por ser curto, validado e
comparável com a literatura. UEQ apenas se a sessão tiver folga.

### Consentimento

Antes de qualquer recolha, por escrito, cobrindo: o objetivo do estudo, que a
participação é voluntária e interrompível a qualquer momento sem justificação,
que não são recolhidos dados pessoais além do nível de estudos e da experiência
prévia com assembly, que os dados são publicados apenas agregados e anonimizados
e que nada é gravado em vídeo ou áudio sem pedido separado.

Um participante que interrompa tem os seus dados eliminados a pedido.

### Análise e publicação

Publicar em `docs/usability-study.md`: metodologia, instrumentos completos,
número de participantes, dados agregados e anonimizados, e as conclusões.

**Limitações a declarar sempre**, mesmo que os resultados sejam favoráveis: a
amostra é de conveniência e não representa a população estudantil; o autor do
software não deve conduzir as sessões; um estudo de 60 minutos mede aquisição
imediata e não retenção; e um `n` abaixo de 12 não sustenta afirmações
comparativas entre grupos, apenas descrição.

Nenhuma conclusão pode ir além do que a amostra sustenta. Um resultado nulo é
publicável e é publicado.

## 3. Acessibilidade: o que falta a uma auditoria WCAG 2.2 AA

[accessibility.md](accessibility.md) diz o que já é verificado automaticamente e
o que não é. O que falta precisa de pessoas:

- **Auditoria completa AA.** Percorrer os critérios que a verificação automática
  não cobre — significado transmitido só por forma ou posição, ordem de foco em
  fluxos completos, nome acessível de cada controlo, mensagens de estado.
- **Leitores de ecrã.** NVDA + Firefox e VoiceOver + Safari, no mínimo. As
  perguntas concretas: a linha temporal do Pipeline Lab é navegável e cada
  célula anuncia ciclo e estágio? A mudança de ciclo é anunciada ou é silenciosa?
  O pipeline vertical é lido pela ordem IF→WB?
- **Quem.** Pelo menos uma pessoa que use tecnologia de apoio no dia a dia. Um
  programador a testar com um leitor de ecrã que não usa mede outra coisa.

Até isso acontecer, `accessibility.md` não deve afirmar conformidade AA.

## 4. Portabilidade: a matriz por preencher

[portability.md](portability.md) descreve o que foi executado. Falta executar em:

| Plataforma | Navegadores |
| --- | --- |
| Windows | Chrome, Firefox, Edge |
| macOS | Safari, Chrome |
| Linux | Firefox, Chrome |
| Android | Chrome |
| iOS | Safari |

Por combinação, o mínimo: montar e correr um programa; usar o Pipeline Lab nos
dois fluxos; exportar JSON e CSV; e, em Android e iOS, verificar o modo
empilhado em pelo menos duas larguras. O resultado entra em `portability.md`
com versão do navegador e do sistema — uma linha por combinação, sem
generalizações a partir de uma só.

## Estado

| Secção | Preparado | Executado |
| --- | --- | --- |
| Validação por terceiros | Sim | Não |
| Estudo de usabilidade | Sim | Não |
| Auditoria WCAG AA | Parcial (automática feita) | Não |
| Matriz de portabilidade | Sim | Não |
