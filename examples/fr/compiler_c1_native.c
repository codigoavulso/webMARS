#include <stdio.h>
#include <string.h>

//Nécessite C1-NATIVE : argc/argv natif, tableaux de caractères adressés par octets
//et appelle via un pointeur de fonction.
//Activez les arguments du programme dans Paramètres et essayez : mul
//webMARS argv[0] est le premier jeton fourni, pas un nom d'exécutable.
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
  char* operation_name = "add";

  if (argc > 0 && strcmp(argv[0], "mul") == 0) {
    operation = multiply;
    operation_name = "multiply";
  }

  char buffer[24] = "byte";
  strcat(buffer, "-addressed");
  int stored = 42;
  void* generic = (void*)&stored;
  int* recovered = (int*)generic;

  printf("argc=%d\n", argc);
  if (argc > 0) printf("argv[0]=%s\n", argv[0]);
  printf("operation=%s\n", operation_name);
  printf("result=%d\n", apply(operation, 6, 7));
  printf("buffer=%s length=%d\n", buffer, (int)strlen(buffer));
  printf("void pointer value=%d\n", *recovered);
  return 0;
}
