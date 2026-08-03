#use <stdio>

int main(void) {
  //Lisez une ligne complète et analysez-en un entier.
  //C0 utilise un tableau int comme tampon d'entrée mutable attendu par la bibliothèque.
  int line[64];
  int value[1] = {0};

  puts("=== stdio line parse ===");
  puts("Type a line that starts with an integer (example: 42 apples).");
  printf("> ");

  //fgets renvoie le nombre d'octets lus ou une valeur non positive à la fin de l'entrée.
  int len = fgets(line, 64, stdin_fd);
  if (len <= 0) {
    puts("Input ended before a line was read.");
    return 0;
  }

  //sscanf renvoie le nombre de champs convertis avec succès.
  if (sscanf(line, "%d", value) == 1) {
    printf("Parsed integer: ");
    print_int(value[0]);
    print_char(10);
  } else {
    puts("No integer found at line start.");
  }

  //Démontrez ungetc en lisant un caractère deux fois.
  puts("Now type one character:");
  int ch = fgetc(stdin_fd);
  if (ch != EOF) {
    //ungetc repousse un octet, donc le fgetc suivant observe le même octet.
    ungetc(ch, stdin_fd);
    int again = fgetc(stdin_fd);
    printf("Read twice (same code expected): ");
    print_int(ch);
    printf(" / ");
    print_int(again);
    print_char(10);
  }

  return 0;
}
