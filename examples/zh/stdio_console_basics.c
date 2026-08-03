#use <stdio>

int main(void) {
  //带有 stdio 包装器的基本控制台 I/O。
  //单元素数组充当 C0 子集中的可写输出参数。
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  //控制台 scanf 等待有效整数，因此返回一项。
  scanf("%d", number_box);
  printf("You typed: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Type one visible character and press Enter: ");
  //scanf_char将字符代码存储在char_box[0]中。
  scanf_char(char_box);
  printf("Character code: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Echo with putchar: ");
  //putchar 将整数解释为 ASCII 字符。
  putchar(char_box[0]);
  print_char(10);

  puts("End of example.");
  return 0;
}
