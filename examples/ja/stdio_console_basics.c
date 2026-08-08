#use <stdio>

int main(void) {
  //stdio ラッパーを使用した基本的なコンソール I/O。
  //1 要素の配列は、C0 サブセット内の書き込み可能な出力パラメーターとして機能します。
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  //コンソールの scanf は有効な整数を待機するため、1 つの項目を返します。
  scanf("%d", number_box);
  printf("You typed: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Type one visible character and press Enter: ");
  //scanf_charはchar_box[0]に文字コードを格納します。
  scanf_char(char_box);
  printf("Character code: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Echo with putchar: ");
  //putchar は、整数を ASCII 文字として解釈します。
  putchar(char_box[0]);
  print_char(10);

  puts("End of example.");
  return 0;
}
