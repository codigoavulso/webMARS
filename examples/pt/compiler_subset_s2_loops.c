int main(void) {
  // Requer C0-S2- ou superior: ciclos for, break/continue e ++/--.
  int sum = 0;   // o acumulador vive num registo depois de compilado

  for (int i = 0; i < 10; i++) {   // um ciclo for torna-se uma comparação mais um desvio para trás
    if ((i % 2) == 0) continue;   // continue salta para o incremento, ignorando o corpo
    if (i > 7) break;   // break salta para lá do fim do ciclo
    sum += i;
  }

  int down = 3;
  down--;   // pós-decremento e pré-incremento compilam para a mesma soma
  int up = 3;
  ++up;

  // Saida esperada: 16 2 4
  print_int(sum);
  print_char(32);
  print_int(down);
  print_char(32);
  print_int(up);
  print_char(10);
  return 0;
}
