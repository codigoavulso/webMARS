//C0-S1 예: 문자열 출력 및 메인에서의 일반 반환.
//컴파일러는 이러한 도우미를 Assembly에서 사용하는 것과 동일한 MIPS 인쇄 시스템 호출로 낮춥니다.
int main(void) {
  //문자열 리터럴은 후행 0바이트가 있는 데이터 세그먼트에서 내보내집니다.
  print_string("Hello from C on webMARS!");
  //ASCII 10은 줄 바꿈입니다. print_char는 정확히 한 문자를 내보냅니다.
  print_char(10);
  //메인에서 돌아오면 프로그램이 깔끔하게 종료됩니다.
  return 0;
}
