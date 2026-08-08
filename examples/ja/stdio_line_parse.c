#use <stdio>

int main(void) {
  //1 行全体を読み取り、そこから整数を解析します。
  //C0 は、ライブラリが期待する可変入力バッファとして int 配列を使用します。
  int line[64];
  int value[1] = {0};

  puts("=== stdio line parse ===");
  puts("Type a line that starts with an integer (example: 42 apples).");
  printf("> ");

  //fgets は、読み取られたバイト数、または入力の終わりに正以外の値を返します。
  int len = fgets(line, 64, stdin_fd);
  if (len <= 0) {
    puts("Input ended before a line was read.");
    return 0;
  }

  //sscanf は、正常に変換されたフィールドの数を返します。
  if (sscanf(line, "%d", value) == 1) {
    printf("Parsed integer: ");
    print_int(value[0]);
    print_char(10);
  } else {
    puts("No integer found at line start.");
  }

  //1 つの文字を 2 回読み取ることで ungetc をデモンストレーションします。
  puts("Now type one character:");
  int ch = fgetc(stdin_fd);
  if (ch != EOF) {
    //ungetc は 1 バイトを押し戻すため、次の fgetc は同じバイトを監視します。
    ungetc(ch, stdin_fd);
    int again = fgetc(stdin_fd);
    printf("Read twice (same code expected): ");
    print_int(ch);
    printf(" / ");
    print_int(again);
    print_char(10);
  }

  return 0;
}
