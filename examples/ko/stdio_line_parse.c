#use <stdio>

int main(void) {
  //하나의 전체 라인을 읽고 그로부터 정수를 구문 분석합니다.
  //C0은 라이브러리에서 예상하는 변경 가능한 입력 버퍼로 int 배열을 사용합니다.
  int line[64];
  int value[1] = {0};

  puts("=== stdio line parse ===");
  puts("Type a line that starts with an integer (example: 42 apples).");
  printf("> ");

  //fgets는 읽은 바이트 수 또는 입력 끝에서 양수가 아닌 값을 반환합니다.
  int len = fgets(line, 64, stdin_fd);
  if (len <= 0) {
    puts("Input ended before a line was read.");
    return 0;
  }

  //sscanf는 성공적으로 변환된 필드 수를 반환합니다.
  if (sscanf(line, "%d", value) == 1) {
    printf("Parsed integer: ");
    print_int(value[0]);
    print_char(10);
  } else {
    puts("No integer found at line start.");
  }

  //한 문자를 두 번 읽어 ungetc를 시연합니다.
  puts("Now type one character:");
  int ch = fgetc(stdin_fd);
  if (ch != EOF) {
    //ungetc는 1바이트를 뒤로 푸시하므로 다음 fgetc는 동일한 바이트를 관찰합니다.
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
