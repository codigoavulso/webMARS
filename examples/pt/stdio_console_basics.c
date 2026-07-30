#use <stdio>

int main(void) {
  // E/S basica de consola com wrappers de stdio.
  // Os arrays com um elemento funcionam como parâmetros de saída graváveis.
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== basicos de consola stdio ===");
  printf("Escreve um inteiro e prime Enter: ");
  // O scanf da consola espera por um inteiro valido e devolve um item.
  scanf("%d", number_box);
  printf("Escreveste: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Escreve um caractere visivel e prime Enter: ");
  // scanf_char guarda o código do caráter em char_box[0].
  scanf_char(char_box);
  printf("Codigo do caractere: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Eco com putchar: ");
  // putchar interpreta o inteiro como um único código de caráter.
  putchar(char_box[0]);
  print_char(10);

  puts("Fim do exemplo.");
  return 0;
}
