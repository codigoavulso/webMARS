#use <stdio>

int main(void) {
  // Le uma linha completa e faz parse de um inteiro.
  // C0 representa estes buffers como arrays de words, inclusive o texto recebido.
  int line[64];
  int value[1] = {0};

  puts("=== parse de linha stdio ===");
  puts("Escreve uma linha que comece com um inteiro (exemplo: 42 macas).");
  printf("> ");

  // fgets devolve o comprimento lido; zero ou negativo indica fim/erro de entrada.
  int len = fgets(line, 64, stdin_fd);
  if (len <= 0) {
    puts("A entrada terminou antes de ler uma linha.");
    return 0;
  }

  // sscanf devolve o número de conversões efetuadas com sucesso.
  if (sscanf(line, "%d", value) == 1) {
    printf("Inteiro extraido: ");
    print_int(value[0]);
    print_char(10);
  } else {
    puts("Nao foi encontrado um inteiro no inicio da linha.");
  }

  // Demonstra ungetc ao ler um caractere duas vezes.
  // ungetc recua logicamente um caráter no stream, sem pedir nova entrada ao utilizador.
  puts("Agora escreve um caractere:");
  int ch = fgetc(stdin_fd);
  if (ch != EOF) {
    ungetc(ch, stdin_fd);
    int again = fgetc(stdin_fd);
    printf("Lido duas vezes (mesmo codigo esperado): ");
    print_int(ch);
    printf(" / ");
    print_int(again);
    print_char(10);
  }

  return 0;
}
