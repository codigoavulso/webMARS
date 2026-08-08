#use <stdio>

int main(void) {
  //stdio 래퍼를 사용한 기본 콘솔 I/O.
  //단일 요소 배열은 C0 하위 집합에서 쓰기 가능한 출력 매개 변수로 작동합니다.
  int number_box[1] = {0};
  int char_box[1] = {0};

  puts("=== stdio console basics ===");
  printf("Type one integer and press Enter: ");
  //Console scanf는 유효한 정수를 기다리므로 하나의 항목을 반환합니다.
  scanf("%d", number_box);
  printf("You typed: ");
  print_int(number_box[0]);
  print_char(10);

  printf("Type one visible character and press Enter: ");
  //scanf_char는 char_box[0]에 문자 코드를 저장합니다.
  scanf_char(char_box);
  printf("Character code: ");
  print_int(char_box[0]);
  print_char(10);
  printf("Echo with putchar: ");
  //putchar는 정수를 ASCII 문자로 해석합니다.
  putchar(char_box[0]);
  print_char(10);

  puts("End of example.");
  return 0;
}
