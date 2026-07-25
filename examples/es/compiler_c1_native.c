#include <stdio.h>
#include <string.h>

// Requiere C1-NATIVE: argc/argv nativos, arrays de char direccionados por byte
// y llamadas mediante un function pointer.
// Active los argumentos de programa en Configuracion y pruebe: mul
// En webMARS, argv[0] es el primer token dado, no el nombre del ejecutable.
typedef int (*binary_op)(int left, int right);

int add(int left, int right) {
  return left + right;
}

int multiply(int left, int right) {
  return left * right;
}

int apply(binary_op operation, int left, int right) {
  return operation(left, right);
}

int main(int argc, char** argv) {
  binary_op operation = add;
  char* operation_name = "sumar";

  if (argc > 0 && strcmp(argv[0], "mul") == 0) {
    operation = multiply;
    operation_name = "multiplicar";
  }

  char buffer[24] = "por";
  strcat(buffer, "-byte");
  int stored = 42;
  void* generic = (void*)&stored;
  int* recovered = (int*)generic;

  printf("argc=%d\n", argc);
  if (argc > 0) printf("argv[0]=%s\n", argv[0]);
  printf("operacion=%s\n", operation_name);
  printf("resultado=%d\n", apply(operation, 6, 7));
  printf("buffer=%s longitud=%d\n", buffer, (int)strlen(buffer));
  printf("valor del puntero void=%d\n", *recovered);
  return 0;
}
