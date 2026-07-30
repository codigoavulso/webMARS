// Minimal ABI demo:
// - stack frame (locals in main/functions)
// - heap allocation via alloc(int)
// - argument passing ($a0-$a3 + 5th arg on stack)
// - return value in $v0

int sum5(int a, int b, int c, int d, int e) {
  // The first four arguments use $a0-$a3; the fifth is read from the caller's stack.
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  // Pointer write into heap memory.
  *slot = x + y;
  // Dereferencing reads the value back from simulated MIPS memory.
  return *slot * 2;
}

int main(void) {
  int local = 7;                // stack local
  int* heap_value = alloc(int); // heap (syscall sbrk)

  // The pointer remains valid after the callee returns because it refers to heap memory.
  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); // 5th argument spills to stack

  // Expected output: 52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
