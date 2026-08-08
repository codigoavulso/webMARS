#use <stdio>

int main(void) {
  //Đọc một dòng đầy đủ và phân tích một số nguyên từ nó.
  //C0 sử dụng mảng int làm bộ đệm đầu vào có thể thay đổi mà thư viện mong đợi.
  int line[64];
  int value[1] = {0};

  puts("=== stdio line parse ===");
  puts("Type a line that starts with an integer (example: 42 apples).");
  printf("> ");

  //fgets trả về số byte đã đọc hoặc giá trị không dương ở cuối đầu vào.
  int len = fgets(line, 64, stdin_fd);
  if (len <= 0) {
    puts("Input ended before a line was read.");
    return 0;
  }

  //sscanf trả về số lượng trường được chuyển đổi thành công.
  if (sscanf(line, "%d", value) == 1) {
    printf("Parsed integer: ");
    print_int(value[0]);
    print_char(10);
  } else {
    puts("No integer found at line start.");
  }

  //Chứng minh ungetc bằng cách đọc một ký tự hai lần.
  puts("Now type one character:");
  int ch = fgetc(stdin_fd);
  if (ch != EOF) {
    //ungetc đẩy lùi một byte, do đó fgetc tiếp theo sẽ quan sát cùng một byte.
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
