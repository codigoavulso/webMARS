// Um cabeçalho é um contrato: diz o que existe, não como funciona.
// O main.c inclui-o para conhecer as duas assinaturas abaixo, e o stats.c
// inclui-o para o compilador confrontar a implementação com elas.
// Deste ficheiro não sai código nenhum.

int array_sum(int values[], int length);   // só declaração: o compilador fica a saber a assinatura
int array_max(int values[], int length);   // quem incluir este cabeçalho pode chamá-la
