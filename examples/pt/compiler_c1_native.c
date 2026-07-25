#include <stdio.h>
#include <string.h>

// Requer C1-NATIVE: argc/argv nativos, arrays de char enderecados por byte
// e chamadas atraves de um function pointer.
// Ative os argumentos de programa nas Definicoes e experimente: mul
// No webMARS, argv[0] e o primeiro token fornecido, nao o nome do executavel.
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
  char* operation_name = "somar";

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
  printf("operacao=%s\n", operation_name);
  printf("resultado=%d\n", apply(operation, 6, 7));
  printf("buffer=%s comprimento=%d\n", buffer, (int)strlen(buffer));
  printf("valor do ponteiro void=%d\n", *recovered);
  return 0;
}
