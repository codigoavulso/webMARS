#use <stdio>

int main(void) {
  //Przeczytaj jedną pełną linię i przeanalizuj z niej liczbę całkowitą.
  //C0 używa tablicy int jako modyfikowalnego bufora wejściowego oczekiwanego przez bibliotekę.
  int line[64];
  int value[1] = {0};

  puts("=== stdio line parse ===");
  puts("Type a line that starts with an integer (example: 42 apples).");
  printf("> ");

  //fgets zwraca liczbę odczytanych bajtów lub wartość różną od dodatniej na końcu wejścia.
  int len = fgets(line, 64, stdin_fd);
  if (len <= 0) {
    puts("Input ended before a line was read.");
    return 0;
  }

  //sscanf zwraca liczbę pomyślnie przekonwertowanych pól.
  if (sscanf(line, "%d", value) == 1) {
    printf("Parsed integer: ");
    print_int(value[0]);
    print_char(10);
  } else {
    puts("No integer found at line start.");
  }

  //Zademonstruj ungetc, czytając jeden znak dwukrotnie.
  puts("Now type one character:");
  int ch = fgetc(stdin_fd);
  if (ch != EOF) {
    //ungetc przesuwa jeden bajt do tyłu, więc następny fgetc obserwuje ten sam bajt.
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
