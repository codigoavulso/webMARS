#use <conio>

struct stats {   //una struttura è un blocco di parole consecutive in memoria
  int count;
  int total;
};

typedef struct stats* stats_t;   //il programma passa l'indirizzo, mai l'intero blocco

//@requires box != NULL;
//@requires 0 <= n && n <= \length(values);
//@ensures \result == box->total;
int accumulate(stats_t box, int values[], int n) {   //i contratti di cui sopra vengono controllati dal compilatore, non stampati
  box->count = n;
  box->total = 0;

  int i = 0;
  //@loop_invariant 0 <= i && i <= n;
  //@loop_invariant box->count == n;
  while (i < n) {
    box->total += values[i];   //box-> legge un campo a un offset fisso dall'indirizzo
    i++;
  }

  return box->total;
}

int main(void) {
  //Esempio di base C0 completo: contratti, invariante del ciclo, typedef, struct, alloc, alloc_array e aggiornamenti dei campi del puntatore.
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
  print("Count: ");
  printint(box->count);
  printchar('\n');
  return 0;
}


