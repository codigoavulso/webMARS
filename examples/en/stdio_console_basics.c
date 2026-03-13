#use <stdio>

int main(void) {
  // Basic console I/O with stdio wrappers.
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  if (scanf("%d", number_box) == 1) {
    printf("You typed: ");
    print_int(number_box[0]);
    print_char(10);
  } else {
    puts("No valid integer was read.");
    clearerr(stdin_fd);
  }

  printf("Type one visible character and press Enter: ");
  if (scanf_char(char_box) == 1) {
    printf("Character code: ");
    print_int(char_box[0]);
    print_char(10);
    printf("Echo with putchar: ");
    putchar(char_box[0]);
    print_char(10);
  } else {
    puts("No character was read.");
  }

  puts("End of example.");
  return 0;
}

