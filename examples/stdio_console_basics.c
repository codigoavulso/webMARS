#use <stdio>

int main(void) {
  // Basic console I/O with stdio wrappers.
  // One-element arrays act as writable output parameters in the C0 subset.
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  // Console scanf waits for a valid integer and therefore returns one item.
  scanf("%d", number_box);
  printf("You typed: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Type one visible character and press Enter: ");
  // scanf_char stores the character code in char_box[0].
  scanf_char(char_box);
  printf("Character code: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Echo with putchar: ");
  // putchar interprets the integer as an ASCII character.
  putchar(char_box[0]);
  print_char(10);

  puts("End of example.");
  return 0;
}
