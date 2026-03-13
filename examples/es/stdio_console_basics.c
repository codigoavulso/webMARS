#use <stdio>

int main(void) {
  // E/S basica de consola con wrappers de stdio.
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== bases de consola stdio ===");
  printf("Escribe un entero y pulsa Enter: ");
  if (scanf("%d", number_box) == 1) {
    printf("Has escrito: ");
    print_int(number_box[0]);
    print_char(10);
  } else {
    puts("No se leyo un entero valido.");
    clearerr(stdin_fd);
  }

  printf("Escribe un caracter visible y pulsa Enter: ");
  if (scanf_char(char_box) == 1) {
    printf("Codigo del caracter: ");
    print_int(char_box[0]);
    print_char(10);
    printf("Eco con putchar: ");
    putchar(char_box[0]);
    print_char(10);
  } else {
    puts("No se leyo ningun caracter.");
  }

  puts("Fin del ejemplo.");
  return 0;
}

