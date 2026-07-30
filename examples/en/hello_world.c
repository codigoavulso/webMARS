// C0-S1 example: string output and a normal return from main.
// The compiler lowers these helpers to the same MIPS print syscalls used by Assembly.
int main(void) {
  // String literals are emitted in the data segment with a trailing zero byte.
  print_string("Hello from C on webMARS!");
  // ASCII 10 is line feed; print_char emits exactly one character.
  print_char(10);
  // Returning from main becomes a clean program exit.
  return 0;
}
