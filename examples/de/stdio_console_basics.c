#use <stdio>

int main(void) {
  //Grundlegende Konsolen-E/A mit stdio-Wrappern.
  //Ein-Element-Arrays fungieren als beschreibbare Ausgabeparameter in der C0-Teilmenge.
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  //Console scanf wartet auf eine gültige Ganzzahl und gibt daher ein Element zurück.
  scanf("%d", number_box);
  printf("You typed: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Type one visible character and press Enter: ");
  //scanf_char speichert den Zeichencode in char_box[0].
  scanf_char(char_box);
  printf("Character code: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Echo with putchar: ");
  //putchar interpretiert die Ganzzahl als ASCII-Zeichen.
  putchar(char_box[0]);
  print_char(10);

  puts("End of example.");
  return 0;
}
