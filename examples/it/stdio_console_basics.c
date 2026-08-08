#use <stdio>

int main(void) {
  //I/O della console di base con wrapper stdio.
  //Gli array a un elemento fungono da parametri di output scrivibili nel sottoinsieme C0.
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  //La scansione della console attende un numero intero valido e pertanto restituisce un elemento.
  scanf("%d", number_box);
  printf("You typed: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Type one visible character and press Enter: ");
  //scanf_char memorizza il codice carattere in char_box[0].
  scanf_char(char_box);
  printf("Character code: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Echo with putchar: ");
  //putchar interpreta il numero intero come un carattere ASCII.
  putchar(char_box[0]);
  print_char(10);

  puts("End of example.");
  return 0;
}
