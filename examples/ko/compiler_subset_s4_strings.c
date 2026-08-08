#use <conio>
#use <string>

int main(void) {
  //C0-S4 이상 필요: bool, char, string 및 문자열 라이브러리.
  char suffix = 'M';   //char은 코드를 담고 있는 1바이트입니다. 여기서는 77입니다.
  string joined = string_join("web", string_fromchar(suffix));   //문자열은 레지스터가 아닌 힙에 구축됩니다.
  bool matches = string_equal(joined, "webM");   //텍스트를 비교한다는 것은 바이트 단위로 비교하는 것을 의미합니다.

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);   //bool은 여전히 단어입니다: 0 또는 1
  printchar('\n');
  return 0;
}



