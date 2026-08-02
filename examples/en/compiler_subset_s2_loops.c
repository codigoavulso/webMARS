int main(void) {
  // Requires C0-S2- or higher: for loops, break/continue, and ++/--.
  int sum = 0;   // the accumulator lives in a register once compiled

  for (int i = 0; i < 10; i++) {   // a for loop becomes a comparison plus a backward branch
    if ((i % 2) == 0) continue;   // continue jumps to the increment, skipping the body
    if (i > 7) break;   // break jumps past the end of the loop
    sum += i;
  }

  int down = 3;
  down--;   // post-decrement and pre-increment compile to the same add
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
