#use <stdio>

int main(void) {
  //E/S de console de base avec wrappers stdio.
  //Les tableaux à un élément agissent comme des paramètres de sortie inscriptibles dans le sous-ensemble C0.
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  //Console scanf attend un entier valide et renvoie donc un élément.
  scanf("%d", number_box);
  printf("You typed: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Type one visible character and press Enter: ");
  //scanf_char stocke le code du caractère dans char_box[0].
  scanf_char(char_box);
  printf("Character code: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Echo with putchar: ");
  //putchar interprète l'entier comme un caractère ASCII.
  putchar(char_box[0]);
  print_char(10);

  puts("End of example.");
  return 0;
}
