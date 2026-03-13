#use <stdio>

int main(void) {
  // E/S basica de consola com wrappers de stdio.
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== basicos de consola stdio ===");
  printf("Escreve um inteiro e prime Enter: ");
  if (scanf("%d", number_box) == 1) {
    printf("Escreveste: ");
    print_int(number_box[0]);
    print_char(10);
  } else {
    puts("Nao foi lido um inteiro valido.");
    clearerr(stdin_fd);
  }

  printf("Escreve um caractere visivel e prime Enter: ");
  if (scanf_char(char_box) == 1) {
    printf("Codigo do caractere: ");
    print_int(char_box[0]);
    print_char(10);
    printf("Eco com putchar: ");
    putchar(char_box[0]);
    print_char(10);
  } else {
    puts("Nao foi lido nenhum caractere.");
  }

  puts("Fim do exemplo.");
  return 0;
}

