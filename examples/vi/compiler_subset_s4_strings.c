#use <conio>
#use <string>

int main(void) {
  //Yêu cầu C0-S4- hoặc cao hơn: bool, char, string và thư viện chuỗi.
  char suffix = 'M';   //char là một byte chứa mã, ở đây 77
  string joined = string_join("web", string_fromchar(suffix));   //chuỗi được tạo trong heap, không phải trong sổ đăng ký
  bool matches = string_equal(joined, "webM");   //so sánh văn bản có nghĩa là so sánh từng byte

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);   //bool vẫn là một từ: 0 hoặc 1
  printchar('\n');
  return 0;
}



