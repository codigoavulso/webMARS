#use <stdio>

int main(void) {
  //Lesen Sie eine vollständige Zeile und analysieren Sie daraus eine Ganzzahl.
  //C0 verwendet ein int-Array als veränderbaren Eingabepuffer, den die Bibliothek erwartet.
  int line[64];
  int value[1] = {0};

  puts("=== stdio line parse ===");
  puts("Type a line that starts with an integer (example: 42 apples).");
  printf("> ");

  //fgets gibt die Anzahl der gelesenen Bytes oder einen nicht positiven Wert am Ende der Eingabe zurück.
  int len = fgets(line, 64, stdin_fd);
  if (len <= 0) {
    puts("Input ended before a line was read.");
    return 0;
  }

  //sscanf gibt die Anzahl der erfolgreich konvertierten Felder zurück.
  if (sscanf(line, "%d", value) == 1) {
    printf("Parsed integer: ");
    print_int(value[0]);
    print_char(10);
  } else {
    puts("No integer found at line start.");
  }

  //Demonstrieren Sie ungetc, indem Sie ein Zeichen zweimal lesen.
  puts("Now type one character:");
  int ch = fgetc(stdin_fd);
  if (ch != EOF) {
    //ungetc schiebt ein Byte zurück, sodass das nächste fgetc dasselbe Byte beobachtet.
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
