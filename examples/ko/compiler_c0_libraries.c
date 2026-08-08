#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  //전체 C0 + 라이브러리 예: 구문 분석, 문자열, util 및 rand가 함께 작동합니다.
  int* parsed = parse_int("1f", 16);   //parse_int는 포인터를 반환합니다. null은 실패했음을 의미합니다.
  rand_t a = init_rand(17);   //동일한 시드가 동일한 시퀀스를 제공하므로 실행이 반복 가능하게 유지됩니다.
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   //int2hex는 디버거가 표시하는 방식으로 숫자 형식을 지정합니다.

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));   //구문 분석 라이브러리는 수동 포인터 작업 없이 텍스트를 분할합니다.
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



