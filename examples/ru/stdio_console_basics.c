#use <stdio>

int main(void) {
  //Базовый консольный ввод-вывод с обертками stdio.
  //Одноэлементные массивы действуют как записываемые выходные параметры в подмножестве C0.
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  //Консольное сканирование ожидает допустимого целого числа и поэтому возвращает один элемент.
  scanf("%d", number_box);
  printf("You typed: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Type one visible character and press Enter: ");
  //scanf_char сохраняет код символа в char_box[0].
  scanf_char(char_box);
  printf("Character code: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Echo with putchar: ");
  //putchar интерпретирует целое число как символ ASCII.
  putchar(char_box[0]);
  print_char(10);

  puts("End of example.");
  return 0;
}
