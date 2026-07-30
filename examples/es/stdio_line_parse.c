#use <stdio>

int main(void) {
  // Lee una linea completa y parsea un entero.
  // C0 usa un array de int como buffer mutable para la biblioteca.
  int line[64];
  int value[1] = {0};

  puts("=== parseo de linea stdio ===");
  puts("Escribe una linea que empiece por un entero (ejemplo: 42 manzanas).");
  printf("> ");

  // fgets devuelve los bytes leídos o un valor no positivo al terminar la entrada.
  int len = fgets(line, 64, stdin_fd);
  if (len <= 0) {
    puts("La entrada termino antes de leer una linea.");
    return 0;
  }

  // sscanf devuelve el número de campos convertidos correctamente.
  if (sscanf(line, "%d", value) == 1) {
    printf("Entero parseado: ");
    print_int(value[0]);
    print_char(10);
  } else {
    puts("No se encontro un entero al inicio.");
  }

  // Demuestra ungetc leyendo un caracter dos veces.
  puts("Ahora escribe un caracter:");
  int ch = fgetc(stdin_fd);
  if (ch != EOF) {
    // ungetc devuelve un byte al stream; el siguiente fgetc observa el mismo byte.
    ungetc(ch, stdin_fd);
    int again = fgetc(stdin_fd);
    printf("Leido dos veces (mismo codigo esperado): ");
    print_int(ch);
    printf(" / ");
    print_int(again);
    print_char(10);
  }

  return 0;
}
