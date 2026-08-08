#use <conio>

struct stats {   //Eine Struktur ist ein Block aufeinanderfolgender Wörter im Speicher
  int count;
  int total;
};

typedef struct stats* stats_t;   //Das Programm übergibt die Adresse, niemals den gesamten Block

//@requires box != NULL;
//@requires 0 <= n && n <= \length(values);
//@ensures \result == box->total;
int accumulate(stats_t box, int values[], int n) {   //Die oben genannten Verträge werden vom Compiler geprüft und nicht gedruckt
  box->count = n;
  box->total = 0;

  int i = 0;
  //@loop_invariant 0 <= i && i <= n;
  //@loop_invariant box->count == n;
  while (i < n) {
    box->total += values[i];   //box-> liest ein Feld mit einem festen Offset von der Adresse
    i++;
  }

  return box->total;
}

int main(void) {
  //Vollständiges C0-Kernbeispiel: Verträge, Schleifeninvariante, Typedef, Struktur, Alloc, Alloc_Array und Zeigerfeldaktualisierungen.
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


