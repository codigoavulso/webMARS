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
  int local = 7;                // variavel local na pilha
  int* heap_value = alloc(int); // heap (syscall sbrk)

  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); // 5o argumento passa na pilha

  return doubled + combined;
}

