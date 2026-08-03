#use <stdio>

int main(void) {
  //Прочитайте одну полную строку и проанализируйте из нее целое число.
  //C0 использует массив int в качестве изменяемого входного буфера, ожидаемого библиотекой.
  int line[64];
  int value[1] = {0};

  puts("=== stdio line parse ===");
  puts("Type a line that starts with an integer (example: 42 apples).");
  printf("> ");

  //fgets возвращает количество прочитанных байтов или неположительное значение в конце ввода.
  int len = fgets(line, 64, stdin_fd);
  if (len <= 0) {
    puts("Input ended before a line was read.");
    return 0;
  }

  //sscanf возвращает количество успешно преобразованных полей.
  if (sscanf(line, "%d", value) == 1) {
    printf("Parsed integer: ");
    print_int(value[0]);
    print_char(10);
  } else {
    puts("No integer found at line start.");
  }

  //Продемонстрируйте работу ungetc, прочитав один символ дважды.
  puts("Now type one character:");
  int ch = fgetc(stdin_fd);
  if (ch != EOF) {
    //ungetc возвращает один байт назад, поэтому следующий fgetc обрабатывает тот же байт.
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
