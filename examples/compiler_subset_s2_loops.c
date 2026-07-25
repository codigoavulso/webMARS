int main(void) {
  // Requires C0-S2- or higher: for loops, break/continue, and ++/--.
  int sum = 0;

  for (int i = 0; i < 10; i++) {
    if ((i % 2) == 0) continue;
    if (i > 7) break;
    sum += i;
  }

  int down = 3;
  down--;
  int up = 3;
  ++up;

  // Expected output: 16 2 4
  print_int(sum);
  print_char(32);
  print_int(down);
  print_char(32);
  print_int(up);
  print_char(10);
  return 0;
}
