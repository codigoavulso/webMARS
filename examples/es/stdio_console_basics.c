#use <stdio>

int main(void) {
  // E/S basica de consola con wrappers de stdio.
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== bases de consola stdio ===");
  printf("Escribe un entero y pulsa Enter: ");
  // El scanf de consola espera un entero valido y devuelve un elemento.
  scanf("%d", number_box);
  printf("Has escrito: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Escribe un caracter visible y pulsa Enter: ");
  scanf_char(char_box);
  printf("Codigo del caracter: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Eco con putchar: ");
  putchar(char_box[0]);
  print_char(10);

  puts("Fin del ejemplo.");
  return 0;
}
