#use <conio>

struct stats {   // uma struct é um bloco de palavras consecutivas em memória
  int count;
  int total;
};

typedef struct stats* stats_t;   // o programa passa o endereço, nunca o bloco inteiro

//@requires box != NULL;
//@requires 0 <= n && n <= \length(values);
//@ensures \result == box->total;
int accumulate(stats_t box, int values[], int n) {   // os contratos acima são verificados pelo compilador, não impressos
  box->count = n;
  box->total = 0;

  int i = 0;
  //@loop_invariant 0 <= i && i <= n;
  //@loop_invariant box->count == n;
  while (i < n) {
    box->total += values[i];   // box-> lê um campo num deslocamento fixo a partir do endereço
    i++;
  }

  return box->total;
}

int main(void) {
  // Exemplo de C0 completo: contratos, invariante de ciclo, typedef, struct, alloc, alloc_array e atualizacao de campos por ponteiro.
  int values[4] = {2, 4, 6, 8};
  int* heap_values = alloc_array(int, 2);
  heap_values[0] = 10;
  heap_values[1] = 20;
  assert(heap_values[1] == 20);

  stats_t box = alloc(struct stats);
  int total = accumulate(box, values, 4);
  assert(box->count == 4);

  print("Total: ");
  printint(total);
  printchar('\n');
  print("Contagem: ");
  printint(box->count);
  printchar('\n');
  return 0;
}


