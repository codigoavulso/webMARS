#use <conio>
#use <string>

int main(void) {
  //يتطلب C0-S4 - أو أعلى: bool وchar وstring ومكتبة السلسلة.
  char suffix = 'M';   //الحرف هو بايت واحد يحمل رمزًا، هنا 77
  string joined = string_join("web", string_fromchar(suffix));   //يتم إنشاء السلاسل في الكومة، وليس في السجلات
  bool matches = string_equal(joined, "webM");   //مقارنة النص تعني مقارنة البايت بالبايت

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);   //المنطق لا يزال كلمة: 0 أو 1
  printchar('\n');
  return 0;
}



