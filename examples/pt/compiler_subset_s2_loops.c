int main(void) {
  // Requer C0-S2- ou superior: ciclos for, break/continue e ++/--.
  int sum = 0;

  for (int i = 0; i < 10; i++) {
    if ((i % 2) == 0) continue;
    if (i > 7) break;
    sum += i;
  }

  int down = 3;
  down--;
  ++down;

  // Saida esperada: 19
  print_int(sum + down);
  print_char(10);
  return 0;
}
