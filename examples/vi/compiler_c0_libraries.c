#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  //Ví dụ đầy đủ về thư viện C0 +: phân tích cú pháp, chuỗi, util và Rand hoạt động cùng nhau.
  int* parsed = parse_int("1f", 16);   //Parse_int trả về một con trỏ: null có nghĩa là nó thất bại
  rand_t a = init_rand(17);   //cùng một hạt giống cho cùng một trình tự, điều này giúp cho các lần chạy lặp lại
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   //int2hex định dạng số theo cách trình gỡ lỗi hiển thị

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));   //thư viện phân tích cú pháp chia nhỏ văn bản mà không cần thao tác với con trỏ thủ công
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



