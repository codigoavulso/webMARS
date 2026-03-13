// Demo ABI minima:
// - marco de pila (variables locales en main/funciones)
// - reserva en heap con alloc(int)
// - paso de argumentos ($a0-$a3 + 5o argumento en pila)
// - valor de retorno en $v0

int sum5(int a, int b, int c, int d, int e) {
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  // Escritura por puntero en memoria del heap.
  *slot = x + y;
  return *slot * 2;
}

int main(void) {
  int local = 7;                // variable local en pila
  int* heap_value = alloc(int); // heap (syscall sbrk)

  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); // el 5o argumento pasa por pila

  return doubled + combined;
}

