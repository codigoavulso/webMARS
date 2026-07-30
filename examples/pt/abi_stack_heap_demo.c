// Demo ABI minima:
// - frame de pilha (locais em main/funcoes)
// - alocacao em heap com alloc(int)
// - passagem de argumentos ($a0-$a3 + 5o argumento na pilha)
// - valor de retorno em $v0

int sum5(int a, int b, int c, int d, int e) {
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  // Escrita por ponteiro em memoria de heap.
  *slot = x + y;
  return *slot * 2;
}

int main(void) {
  // As variáveis locais vivem no frame atual; alloc reserva memória com vida independente.
  int local = 7;                // variavel local na pilha
  int* heap_value = alloc(int); // heap (syscall sbrk)

  // Um ponteiro permite à função alterar diretamente a word reservada no heap.
  int doubled = write_and_double(heap_value, local, 5);
  // Na ABI o32, os quatro primeiros argumentos usam $a0-$a3 e o quinto usa a pilha.
  int combined = sum5(local, 2, 3, 4, *heap_value); // 5o argumento passa na pilha

  // Saida esperada: 52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
