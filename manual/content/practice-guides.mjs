import { html, codeBlock, steps, table, callout } from "./shared.mjs";
import { WORKED_EXAMPLES as examples } from "./worked-examples.mjs";

export const practiceGuides = {
  "primeiros-passos": {
    minutes: 10,
    sections: [{
      id: "percurso-pratico", title: "Percurso prático: executar, observar e explicar",
      content: html`
        <p>O objetivo deste percurso é explicar o que mudou na máquina. Use um projeto de treino e conserve o trabalho habitual noutro projeto. Antes de executar, escreva a previsão; depois registe o resultado e uma explicação.</p>
        ${table(["Etapa", "Tarefa", "Evidência de aprendizagem"], [
          ["Preparar", "Identifique o ficheiro ativo, a linguagem e os painéis de mensagens/E/S.", "Distingue a fonte que edita da imagem já montada."],
          ["Executar", '<a href="#/assembler/soma-vetor">Monte a soma de um vetor</a>.', "O programa imprime 12 e também guarda 12 na memória."],
          ["Observar", '<a href="#/executar-depurar/investigacao-vetor">Siga as quatro iterações</a> com breakpoints e passos.', "Prevê o endereço seguinte e o próximo acumulador."],
          ["Comparar", '<a href="#/minic/vetor-comparado">Compile a versão Mini-C</a> do mesmo algoritmo.', "Explica por que o resultado coincide mesmo com Assembly e organização de memória diferentes."],
          ["Conservar", '<a href="#/projetos-ficheiros/rotina-segura">Guarde e exporte uma cópia</a>.', "A cópia abre num projeto de verificação e reproduz o resultado."]
        ])}
        <p>Não se limite a verificar o número final. O guia de depuração inclui um erro de limite que pode deixar a saída aparentemente correta; os endereços e estados intermédios permitem detetá-lo.</p>
      `
    }]
  },
  "projetos-ficheiros": {
    minutes: 15,
    sections: [{
      id: "rotina-segura", title: "Guardar, transferir e recuperar trabalho com confiança",
      content: html`
        <p>Guardar a edição corrente, conservar uma cópia recuperável e trabalhar noutro dispositivo são necessidades diferentes. Escolha a operação pelo destino pretendido e confirme que consegue recuperar o conteúdo.</p>
        ${table(["Situação", "Procedimento", "Confirmação"], [
          ["Continuar neste browser", "Guarde o ficheiro e o projeto locais.", "Reabra o ficheiro e confira a alteração; evite limpar os dados desta origem."],
          ["Fechar uma sessão privada ou usar um computador partilhado", "Descarregue as fontes antes de fechar; use Cloud se estiver configurada.", "Os ficheiros descarregados contêm as últimas alterações."],
          ["Mudar de computador", "Guarde na Cloud e confirme a sincronização, ou transfira cópias das fontes.", "No destino, abra o projeto na mesma instalação Cloud e monte de novo."],
          ["Entregar um exercício", "Inclua fontes, instruções e opções relevantes. Para publicação, prefira uma revisão fixa.", "A entrega funciona numa cópia nova sem depender dos separadores do projeto original."],
          ["Limpar armazenamento", "Exporte os projetos necessários e confira os documentos Cloud.", "Consegue recuperar uma amostra a partir da cópia antes de limpar."]
        ])}
        ${steps([
          "Identifique a raiz de compilação ou montagem. Use nomes que distingam fonte, saída gerada e variantes do exercício.",
          "Registe perfil Mini-C, mapa de memória, desvios retardados e dispositivos necessários. Essas opções podem mudar o comportamento.",
          "Antes de uma alteração extensa, conserve uma cópia identificável. Um estado de layout não substitui uma cópia das fontes.",
          "Na recuperação, compile/monte novamente e compare a saída com o resultado esperado. O aspeto da janela não prova que todos os ficheiros foram recuperados."
        ])}
        ${callout("warning", "O local de armazenamento depende da origem", "<p>Browsers, perfis e origens diferentes não partilham necessariamente os mesmos projetos locais. A versão pública e <code>localhost</code> são locais de armazenamento distintos. Atualizar a aplicação não exige, por si só, apagar os dados do browser.</p>")}
      `
    }, {
      id: "projeto-multificheiro", title: "Projeto Mini-C completo: raiz, cabeçalho e implementação",
      content: html`
        <p>Crie estes três ficheiros no mesmo projeto e escolha o perfil <strong>C0-S2</strong>. O cabeçalho declara as funções; a implementação contém os seus corpos; a raiz reúne as dependências e chama as funções.</p>
        ${codeBlock(examples.multiFileMiniC.source, "src/main.c")}
        ${codeBlock(examples.multiFileMiniC.files["src/stats.h"], "src/stats.h")}
        ${codeBlock(examples.multiFileMiniC.files["src/stats.c"], "src/stats.c")}
        ${steps([
          "Guarde os três ficheiros com estes nomes e ative <code>src/main.c</code>.",
          "Compile com <kbd>F4</kbd>, abra o Assembly gerado como novo ficheiro, monte com <kbd>F3</kbd> e execute com <kbd>F5</kbd>.",
          "Confirme duas linhas: <samp>soma=42</samp> e <samp>maximo=13</samp>.",
          "Altere o último elemento de 13 para 1. Recompile a raiz e confirme <samp>soma=30</samp> e <samp>maximo=11</samp>."
        ])}
        <p><code>#include "stats.h"</code> torna as declarações conhecidas; <code>#use "stats.c"</code> traz a implementação para este fluxo Mini-C. Isto não reproduz compilação separada e ligação de objetos de uma ferramenta ISO C. Compilar só o cabeçalho não cria um executável; colocar ficheiros na pasta também não dispensa as dependências explícitas.</p>
        ${table(["Sintoma", "Verificação"], [
          ["Ficheiro incluído não encontrado", "Nome exato e caminho relativo ao ficheiro que o inclui."],
          ["Função declarada mas não definida", "A implementação é alcançada pela raiz?"],
          ["Definição duplicada", "Existem corpos repetidos ou implementações incluídas indevidamente?"],
          ["A saída continua a antiga", "Recompile main.c e monte o Assembly acabado de gerar; editar C não altera a imagem em execução."]
        ])}
      `
    }]
  },
  assembler: {
    minutes: 12,
    sections: [{
      id: "soma-vetor", title: "Exemplo completo: somar um vetor e guardar o resultado",
      content: html`
        <p>Guarde como <code>soma.s</code>. No mapa <strong>Default</strong>, as quatro words começam em <code>0x10010000</code>; a variável <code>soma</code> fica em <code>0x10010010</code>. Os <code>nop</code> depois dos saltos tornam os slots explícitos e mantêm este exemplo válido com desvios retardados ligados ou desligados.</p>
        ${codeBlock(examples.arrayAssembly.source)}
        ${table(["Papel", "Estado inicial", "Mudança em cada iteração"], [
          ["$t0: endereço atual", "Endereço de numeros", "Avança quatro bytes: cada elemento é uma word."],
          ["$t1: elementos restantes", "4", "Diminui um; o ciclo termina a zero."],
          ["$t2: acumulador", "0", "Soma o elemento acabado de ler."],
          ["$t3: elemento atual", "Ainda não lido", "Recebe 3, −2, 7 e 4, por esta ordem."]
        ])}
        <p>No fim, <code>$t2 = 12</code>. A store escreve 12 na memória; o syscall 1 imprime a representação decimal. São efeitos distintos: retirar a impressão não impede a store, e retirar a store não impede a impressão.</p>
        <p><strong>Exercício:</strong> mude o vetor para <code>10, 0, -5, 2</code>. Espere <strong>7</strong>. Se mudar a quantidade de elementos, atualize também o contador. Quatro elementos deste tipo ocupam 16 bytes, não quatro.</p>
      `
    }, {
      id: "chamadas-aninhadas", title: "Exemplo completo: chamadas aninhadas, retorno e stack",
      content: html`
        <p>O programa calcula <code>2 × 6 + 1</code>. Como <code>dobro_mais_um</code> chama outra função, tem de guardar o seu retorno antes de executar <code>jal</code>. Usa também <code>$s0</code>, que deve devolver ao chamador com o valor original.</p>
        ${codeBlock(examples.nestedCalls.source)}
        ${table(["Ponto", "O que deve observar"], [
          ["Antes da primeira chamada", "$a0 = 6, $s0 = 99. O ajuste inicial de quatro bytes alinha a stack predefinida MARS a oito bytes."],
          ["Dentro de dobro_mais_um", "Frame de oito bytes: $s0 em 0($sp), $ra em 4($sp). O retorno guardado é o de main."],
          ["Depois de dobro", "$v0 = 12; o incremento seguinte produz 13."],
          ["De volta a main", "$s0 = 99 e o frame da função já foi libertado."],
          ["Ao terminar", "A E/S mostra 13 e $sp recuperou o valor inicial."]
        ])}
        ${callout("note", "Frame reduzido para este exemplo", "<p>O frame mostra os registos que esta função guarda. Não é uma receita universal o32: funções com mais argumentos ou dados locais exigem espaço e alinhamento adequados.</p>")}
        <p><strong>Exercício de diagnóstico:</strong> numa cópia, retire apenas a reposição de <code>$ra</code>. Antes de executar, explique por que <code>jr $ra</code> passa a usar o retorno da chamada mais recente. Reponha a instrução e confirme que o programa termina; saltos arbitrários em main não corrigem a convenção violada.</p>
      `
    }]
  },
  "executar-depurar": {
    minutes: 15,
    sections: [{
      id: "investigacao-vetor", title: "Depuração guiada: um resultado correto pode esconder um erro",
      content: html`
        <p>Monte a <a href="#/assembler/soma-vetor">soma do vetor</a> e marque a caixa BP da linha básica <code>lw $t3, 0($t0)</code>. Ao parar nesse breakpoint, a leitura ainda não aconteceu: o PC aponta para a instrução que vai executar.</p>
        ${steps([
          "Antes da primeira load, registe $t0, $t1 e $t2. No mapa Default, espere 0x10010000, 4 e 0.",
          "Avance a leitura e a soma com <kbd>F7</kbd>. Distinga o elemento em $t3 do acumulador em $t2.",
          "Continue até à próxima passagem e compare com a tabela. Uma pseudoinstrução pode corresponder a várias linhas básicas.",
          "Após uma soma, use <kbd>F8</kbd> para observar o acumulador anterior; avance novamente e confirme a transição.",
          "No fim, confira a E/S e a word em 0x10010010."
        ])}
        ${table(["Iteração", "Endereço lido", "Elemento", "Acumulador após addu"], [
          ["1", "0x10010000", "3", "3"], ["2", "0x10010004", "−2", "1"],
          ["3", "0x10010008", "7", "8"], ["4", "0x1001000c", "4", "12"]
        ])}
        <p>Altere só o contador inicial de <strong>4 para 3</strong>, monte e execute. A saída passa a <strong>8</strong>: omitiu o último elemento. A primeira divergência está na condição de fim, não na impressão.</p>
        <p>Numa segunda cópia, use <strong>5</strong>. A saída continua a ser <strong>12</strong>: a quinta leitura chega à variável <code>soma</code>, inicialmente zero, imediatamente após o vetor. É memória acessível, mas não pertence ao vetor pretendido; o simulador não tem de a tratar como erro de endereço. O breakpoint revela a leitura em <code>0x10010010</code>. Verificar só a saída deixaria este erro passar.</p>
      `
    }, {
      id: "diagnostico-por-fase", title: "Diagnosticar pela fase e pela primeira divergência",
      content: html`
        ${table(["Sintoma", "Primeira pergunta", "Observação útil"], [
          ["F4 falha", "Qual é o primeiro diagnóstico do compilador?", "Raiz, linha, perfil e dependências; ainda não existe nova saída Assembly válida."],
          ["F3 falha", "Que símbolo, operando ou diretiva não foi resolvido?", "Linha fonte, includes e âmbito; F5 não corrige a fonte."],
          ["F5 não termina", "Aguarda entrada, parou num breakpoint ou continua ativo?", "E/S, PC e instrução atual; interrompa antes de editar."],
          ["O número está errado", "Qual é o primeiro estado diferente da previsão?", "Argumentos, loads, acumulador e condição de fim."],
          ["Termina mas o ecrã não muda", "As stores atingiram a base observada?", "Memória, configuração, ligação e protocolo do dispositivo."],
          ["Editar C não mudou o resultado", "Está a executar a saída acabada de gerar?", "Ficheiro ativo, compilação nova, montagem e imagem do runtime."]
        ])}
        <p>Reduza o programa e repita com as mesmas opções e input. Registe <strong>o que esperava, o que observou e a instrução onde apareceu a diferença</strong>. Uma captura de registos sem indicar o ponto de execução raramente basta para explicar uma falha.</p>
      `
    }]
  },
  minic: {
    minutes: 14,
    sections: [{
      id: "vetor-comparado", title: "Do algoritmo Mini-C ao Assembly: o mesmo vetor",
      content: html`
        <p>Use <strong>C0-S2</strong>, pois o exemplo contém <code>for</code> e incremento. <code>print_int</code> e <code>print_char</code> são intrínsecas do compilador: este programa não precisa de bibliotecas externas.</p>
        ${codeBlock(examples.arrayMiniC.source, "soma.c · C0-S2")}
        <p>Compile, abra o Assembly como ficheiro, monte e execute. Espere <samp>12</samp> e mudança de linha. Na <a href="#/assembler/soma-vetor">versão Assembly escrita à mão</a>, o vetor está em .data. Aqui é local a main e pode ocupar o frame da stack: não procure automaticamente os elementos em <code>0x10010000</code>.</p>
        ${table(["Na fonte", "O que procurar no Assembly gerado"], [
          ["valores[i]", "Base do vetor e índice escalado pelo tamanho do elemento."],
          ["total += …", "Leitura do acumulador, soma e conservação do resultado."],
          ["i < n", "Comparação e transferência de controlo para continuar ou sair."],
          ["somar(valores, 4)", "Passagem do endereço e comprimento, chamada e retorno."],
          ["return total", "Resultado no registo de retorno e libertação do frame."]
        ])}
        <p><strong>Exercício:</strong> chame <code>somar(valores, 3)</code>; espere <strong>8</strong>. Depois recupere o comprimento 4 e use <code>10, 0, -5, 2</code>; espere <strong>7</strong>. Recompile após cada alteração.</p>
      `
    }, {
      id: "recursao-com-limites", title: "Recursão: paragem, frames e limites numéricos",
      content: html`
        ${codeBlock(examples.recursiveMiniC.source, "fatorial.c · C0-S0")}
        <p>A saída é <strong>720</strong>. A descida cria chamadas para 6, 5, 4, 3, 2 e 1. O caso base devolve 1; os retornos recompõem o produto até 6 × 120. No Assembly, procure o estado conservado enquanto cada chamada aguarda a seguinte.</p>
        ${table(["Entrada", "Resultado matemático", "Interpretação"], [
          ["0 ou 1", "1", "O caso base evita outra chamada."],
          ["6", "720", "Os retornos recompõem o produto."],
          ["12", "479001600", "Cabe num inteiro assinado de 32 bits."],
          ["13", "6227020800", "Não cabe no int de 32 bits usado neste exercício."]
        ])}
        <p>Estabeleça o domínio <strong>0 ≤ n ≤ 12</strong>. Se ler n do utilizador, valide antes da chamada. <code>n <= 1</code> devolve 1 também para negativos, mas isso não torna essas entradas válidas para a especificação do fatorial.</p>
        <p>Um contrato exprime uma condição; não escolhe um tipo maior nem substitui a validação de entrada. Limitar n também é diferente de limitar passos ou memória do simulador. Um resultado numérico fora do domínio não é prova de um fatorial matematicamente correto.</p>
      `
    }]
  },
  ferramentas: {
    minutes: 10,
    sections: [{
      id: "primeiro-framebuffer", title: "Experiência reproduzível: quatro cores no Bitmap Display",
      content: html`
        <p>No mapa <strong>Default</strong>, abra <strong>Ferramentas → Ecrã de mapa de bits</strong> (Bitmap Display). Escolha base <code>0x10010000</code>, largura/altura do ecrã <strong>64</strong> e largura/altura da unidade <strong>16</strong>. Obtém quatro colunas e quatro linhas; cada célula corresponde a uma word.</p>
        ${codeBlock(examples.bitmapAssembly.source)}
        ${steps([
          "Monte e confira a base da região tela na memória.",
          "Ligue a ferramenta ao MIPS antes de executar as stores; execute o programa.",
          "A primeira linha deve conter vermelho, verde, azul e branco, da esquerda para a direita. As outras células começam a zero.",
          "Confira as words: 0x00ff0000, 0x0000ff00, 0x000000ff e 0x00ffffff.",
          "Mude só a última cor para 0x00ffff00, monte e repita: a quarta célula passa a amarela."
        ])}
        <p>Uma célula ampliada a 16 × 16 píxeis continua a consumir <strong>quatro bytes</strong> no framebuffer. O tamanho da unidade controla a ampliação visual. Este programa não imprime na E/S; uma saída textual vazia é normal.</p>
        ${table(["Sintoma", "Verificação"], [
          ["Memória correta, ecrã vazio", "Ligação, base e grelha; ligue antes de repetir as stores."],
          ["Cores noutra linha", "Colunas = largura do ecrã ÷ largura da unidade."],
          ["Cor inesperada", "Valor 0x00RRGGBB e endereço da word. A ordem dos bytes não muda a notação da cor."],
          ["Mudou depois de trocar o mapa", "Confira de novo o endereço real da etiqueta tela."]
        ])}
      `
    }]
  },
  "modelo-mips": {
    minutes: 8,
    sections: [{
      id: "interpretar-bits", title: "Ler os mesmos bits como inteiro, endereço ou bytes",
      content: html`
        <p>Um registo conserva 32 bits. O significado depende da instrução e da representação escolhida: os mesmos bits podem representar um inteiro com sinal, um inteiro sem sinal ou um endereço. Mudar a coluna de apresentação não converte o valor guardado.</p>
        ${table(["Bits em hexadecimal", "Inteiro com sinal", "Inteiro sem sinal"], [
          ["0x0000000c", "12", "12"], ["0xfffffffe", "−2", "4294967294"],
          ["0xffffffff", "−1", "4294967295"], ["0x80000000", "−2147483648", "2147483648"]
        ])}
        <p>Na <a href="#/assembler/soma-vetor">soma do vetor</a>, a segunda load lê <code>−2</code>. Se a vista mostrar <code>0xfffffffe</code>, o programa não leu outro número: são os mesmos bits. A escolha entre operações com sinal e sem sinal importa nas comparações e no tratamento de overflow. <code>addu</code> não gera a exceção de overflow assinado de <code>add</code>; o nome não torna automaticamente os dados positivos.</p>
        <p>No mapa little-endian, a word <code>0x12345678</code> ocupa quatro bytes: <code>78</code>, <code>56</code>, <code>34</code>, <code>12</code>, por ordem crescente de endereço. Uma leitura de word reconstrói <code>0x12345678</code>. Uma leitura de byte no primeiro endereço obtém <code>0x78</code>. O salto entre elementos de um vetor de words continua a ser quatro bytes.</p>
        <p>Antes de interpretar uma tabela, identifique <strong>endereço, largura e representação</strong>. A word no endereço de uma etiqueta não é o endereço dessa etiqueta; <code>la</code> obtém o endereço e <code>lw</code> lê o conteúdo. Confundir os dois explica muitas tentativas de imprimir strings ou percorrer vetores a partir da posição errada.</p>
      `
    }]
  },
  "referencia-mips": {
    minutes: 8,
    sections: [{
      id: "receitas-syscalls", title: "Syscalls frequentes: preparar argumentos e conservar resultados",
      content: html`
        <p>Antes de <code>syscall</code>, coloque o número do serviço em <code>$v0</code> e os argumentos nos registos definidos por esse serviço. Depois, leia os resultados antes de reutilizar esses registos para outra operação.</p>
        ${table(["Serviço", "Preparação", "Resultado / cuidado"], [
          ["1 — imprimir inteiro", "$a0 contém o valor; $v0 = 1.", "Imprime o inteiro. Não imprime o conteúdo apontado por $a0."],
          ["4 — imprimir string", "$a0 contém o endereço de bytes terminados em zero; $v0 = 4.", "Use .asciiz ou um buffer corretamente terminado; um inteiro literal não é uma string."],
          ["5 — ler inteiro", "$v0 = 5; forneça entrada no painel ou diálogo.", "O valor lido fica em $v0. Copie-o antes de selecionar outro serviço nesse registo."],
          ["8 — ler string", "$a0 aponta para um buffer reservado e $a1 indica a sua capacidade; $v0 = 8.", "A capacidade limita os bytes disponíveis, incluindo o terminador. Não é um número de words."],
          ["9 — reservar heap", "$a0 indica o número de bytes; $v0 = 9.", "O endereço devolvido fica em $v0. Reservar não inicializa a estrutura lógica do seu programa."],
          ["10 — terminar", "$v0 = 10.", "Termina a execução; não devolve da função como jr $ra."],
          ["11 — imprimir carácter", "$a0 contém o código do carácter; $v0 = 11.", "O valor 10 imprime uma mudança de linha."],
          ["12 — ler carácter", "$v0 = 12.", "Leia o resultado em $v0; não confunda este serviço com ler uma linha inteira."]
        ])}
        ${codeBlock(`li   $v0, 5
syscall
move $s0, $v0       # conservar o inteiro lido
move $a0, $s0
li   $v0, 1
syscall`, "Fragmento: ler um inteiro e voltar a imprimi-lo")}
        <p>Este fragmento pressupõe um programa já preparado e não inclui a sua terminação. Se selecionar o serviço 1 antes de copiar o resultado da leitura, substitui o número lido em <code>$v0</code>. Se o programa aparentar estar parado na leitura, confirme o estado de espera e forneça os dados; premir Executar de novo não substitui input.</p>
        <p>Para ficheiros, strings Mini-C e serviços estendidos, consulte os contratos próprios na referência e as bibliotecas fornecidas. Um descritor VFS não é um caminho do disco do computador; um ponteiro da representação C0 não deve ser tratado automaticamente como uma string nativa terminada em zero.</p>
      `
    }]
  },
  "pipeline-lab": {
    minutes: 10,
    sections: [{
      id: "comparacao-controlada", title: "Experiência guiada: explicar o efeito do reencaminhamento",
      content: html`
        <p>Use a <a href="#/assembler/soma-vetor">soma do vetor</a>: há uma dependência imediata entre <code>lw $t3, 0($t0)</code> e <code>addu $t2, $t2, $t3</code>. Execute primeiro no runtime e confirme 12. No Pipeline Lab, escolha o replay da execução gravada para comparar o mesmo percurso real.</p>
        ${steps([
          "Registe perfil, reencaminhamento, resolução e previsão de saltos, delay slot e latência de memória.",
          "Compare duas leituras, mudando só o reencaminhamento. Avance até escoar o pipeline em ambas.",
          "Na dependência lw → addu, identifique quando o valor fica disponível e como chega ao consumidor.",
          "Registe ciclos, instruções concluídas, CPI e esperas por causa. Exporte as duas leituras para comparação.",
          "Justifique a diferença por uma dependência concreta. Se mudou também o percurso ou os saltos, repita com as condições controladas."
        ])}
        ${table(["Afirmação", "Evidência necessária"], [
          ["O consumidor esperou pelo produtor", "Registos envolvidos e ciclos em que surge a dependência."],
          ["O reencaminhamento reduziu o custo", "Mesma sequência, memória e controlo; mudança identificada nas esperas."],
          ["O load-use ainda exigiu espera", "O dado da load só fica disponível depois da fase de memória."],
          ["Ficou mais rápido neste modelo", "CPI e configuração. Ciclos pedagógicos não são tempo real do browser."]
        ])}
        <p>Não existe um número universal de ciclos para um texto fonte: pseudoinstruções expandem, syscalls têm regras próprias e saltos dependem das opções. Se usar fluxo estático, registe essa escolha e as hipóteses de percurso; não a apresente como execução real gravada.</p>
      `
    }]
  }
};
