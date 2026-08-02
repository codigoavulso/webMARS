#use <conio>

struct stats {   // una struct es un bloque de palabras consecutivas en memoria
  int count;
  int total;
};

typedef struct stats* stats_t;   // el programa pasa la dirección, nunca el bloque entero

//@requires box != NULL;
//@requires 0 <= n && n <= \length(values);
//@ensures \result == box->total;
int accumulate(stats_t box, int values[], int n) {   // los contratos de arriba los verifica el compilador, no se imprimen
  box->count = n;
  box->total = 0;

  int i = 0;
  //@loop_invariant 0 <= i && i <= n;
  //@loop_invariant box->count == n;
  while (i < n) {
    box->total += values[i];   // box-> lee un campo en un desplazamiento fijo desde la dirección
    i++;
  }

  return box->total;
}

int main(void) {
  // Ejemplo de C0 completo: contratos, invariante de bucle, typedef, struct, alloc, alloc_array y actualizacion de campos por puntero.
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
  print("Conteo: ");
  printint(box->count);
  printchar('\n');
  return 0;
}


