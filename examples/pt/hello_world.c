// Exemplo C0-S1: escrita de uma string e retorno normal de main.
// Os literais string ficam no segmento de dados e terminam com um byte zero.
int main(void) {
  // O compilador C0 traduz estas funções de consola em syscalls do runtime MIPS.
  print_string("Ola do C no webMARS!");
  // O código ASCII 10 muda para a linha seguinte no painel Run I/O.
  print_char(10);
  // Devolver zero indica que o programa terminou com sucesso.
  return 0;
}
