int main(void) {
  //Nécessite C0-S2- ou supérieur : for boucles, break/continue et ++/--.
  int sum = 0;   //l'accumulateur vit dans un registre une fois compilé

  for (int i = 0; i < 10; i++) {   //une boucle for devient une comparaison plus une branche arrière
    if ((i % 2) == 0) continue;   //continuer à sauter par incréments, en sautant le corps
    if (i > 7) break;   //break saute après la fin de la boucle
    sum += i;
  }

  int down = 3;
  down--;   //compilation post-décrémentation et pré-incrémentée avec le même ajout
  int up = 3;
  ++up;

  //Sortie attendue : 16 2 4
  print_int(sum);
  print_char(32);
  print_int(down);
  print_char(32);
  print_int(up);
  print_char(10);
  return 0;
}
