#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  //نمونه کتابخانه های C0 + کامل: تجزیه، رشته، util و رند با هم کار می کنند.
  int* parsed = parse_int("1f", 16);   //parse_int یک اشاره گر را برمی گرداند: null به این معنی است که شکست خورد
  rand_t a = init_rand(17);   //همان دانه همان دنباله را می دهد، که باعث می شود اجراها تکرار شوند
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   //int2hex عدد را طوری فرمت می کند که دیباگر آن را نشان می دهد

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));   //کتابخانه تجزیه متن را بدون کار با اشاره گر دستی تقسیم می کند
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



