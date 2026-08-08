//Demo minima di ABI:
//- stack frame (locali in main/funzioni)
//- allocazione dell'heap tramite alloc(int)
//- passaggio argomento ($a0-$a3 + 5° argomento sullo stack)
//- valore restituito in $v0

int sum5(int a, int b, int c, int d, int e) {
  //I primi quattro argomenti utilizzano $a0-$a3; il quinto viene letto dallo stack del chiamante.
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  //Il puntatore scrive nella memoria heap.
  *slot = x + y;
  //Il dereferenziamento rilegge il valore dalla memoria simulata MIPS.
  return *slot * 2;
}

int main(void) {
  int local = 7;                //impilare locale
  int* heap_value = alloc(int); //heap (chiamata di sistema sbrk)

  //Il puntatore rimane valido dopo che il chiamato ritorna perché fa riferimento alla memoria heap.
  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); //Il quinto argomento si riversa nello stack

  //Produzione prevista: 52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
