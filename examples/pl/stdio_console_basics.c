#use <stdio>

int main(void) {
  //Podstawowe wejścia/wyjścia konsoli z opakowaniami stdio.
  //Tablice jednoelementowe pełnią funkcję zapisywalnych parametrów wyjściowych w podzbiorze C0.
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  //Konsola scanf czeka na prawidłową liczbę całkowitą i dlatego zwraca jeden element.
  scanf("%d", number_box);
  printf("You typed: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Type one visible character and press Enter: ");
  //scanf_char przechowuje kod znaku w char_box[0].
  scanf_char(char_box);
  printf("Character code: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Echo with putchar: ");
  //putchar interpretuje liczbę całkowitą jako znak ASCII.
  putchar(char_box[0]);
  print_char(10);

  puts("End of example.");
  return 0;
}
