#use <stdio>

int main(void) {
  //Leggi una riga intera e analizza un numero intero da essa.
  //C0 utilizza un array int come buffer di input mutabile previsto dalla libreria.
  int line[64];
  int value[1] = {0};

  puts("=== stdio line parse ===");
  puts("Type a line that starts with an integer (example: 42 apples).");
  printf("> ");

  //fgets restituisce il numero di byte letti o un valore non positivo alla fine dell'input.
  int len = fgets(line, 64, stdin_fd);
  if (len <= 0) {
    puts("Input ended before a line was read.");
    return 0;
  }

  //sscanf restituisce il numero di campi convertiti correttamente.
  if (sscanf(line, "%d", value) == 1) {
    printf("Parsed integer: ");
    print_int(value[0]);
    print_char(10);
  } else {
    puts("No integer found at line start.");
  }

  //Dimostrare ungetc leggendo un carattere due volte.
  puts("Now type one character:");
  int ch = fgetc(stdin_fd);
  if (ch != EOF) {
    //ungetc spinge indietro un byte, quindi il successivo fgetc osserva lo stesso byte.
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
