#use <conio>

struct stats {   //une structure est un bloc de mots consécutifs en mémoire
  int count;
  int total;
};

typedef struct stats* stats_t;   //le programme transmet l'adresse, jamais le bloc entier

//@requires box != NULL;
//@requires 0 <= n && n <= \length(values);
//@ensures \result == box->total;
int accumulate(stats_t box, int values[], int n) {   //les contrats ci-dessus sont vérifiés par le compilateur, non imprimés
  box->count = n;
  box->total = 0;

  int i = 0;
  //@loop_invariant 0 <= i && i <= n;
  //@loop_invariant box->count == n;
  while (i < n) {
    box->total += values[i];   //box-> lit un champ à un décalage fixe de l'adresse
    i++;
  }

  return box->total;
}

int main(void) {
  //Exemple de base C0 complet : contrats, invariants de boucle, typedef, struct, alloc, alloc_array et mises à jour des champs de pointeur.
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


