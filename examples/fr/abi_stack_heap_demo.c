//Démo minimale de ABI :
//- cadre de pile (locales dans main/functions)
//- allocation du tas via alloc(int)
//- passage d'argument ($a0-$a3 + 5ème argument sur la pile)
//- valeur de retour dans $v0

int sum5(int a, int b, int c, int d, int e) {
  //Les quatre premiers arguments utilisent $a0-$a3 ; le cinquième est lu dans la pile de l'appelant.
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  //Le pointeur écrit dans la mémoire tas.
  *slot = x + y;
  //Le déréférencement lit la valeur à partir de la mémoire MIPS simulée.
  return *slot * 2;
}

int main(void) {
  int local = 7;                //pile locale
  int* heap_value = alloc(int); //tas (appel système sbrk)

  //Le pointeur reste valide après le retour de l'appelé car il fait référence à la mémoire tas.
  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); //Le 5ème argument se répand dans la pile

  //Résultat attendu : 52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
