#use <conio>
#use <string>

int main(void) {
  //به C0-S4- یا بالاتر نیاز دارد: bool، char، string و کتابخانه رشته.
  char suffix = 'M';   //یک کاراکتر یک بایت است که یک کد را در خود نگه می دارد، در اینجا 77
  string joined = string_join("web", string_fromchar(suffix));   //رشته ها در پشته ساخته می شوند، نه در رجیسترها
  bool matches = string_equal(joined, "webM");   //مقایسه متن به معنای مقایسه بایت به بایت است

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);   //a bool هنوز یک کلمه است: 0 یا 1
  printchar('\n');
  return 0;
}



