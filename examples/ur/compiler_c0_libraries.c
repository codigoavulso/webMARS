#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  //مکمل C0 + لائبریریوں کی مثال: پارس، سٹرنگ، یوٹیل، اور رینڈ ایک ساتھ کام کرنا۔
  int* parsed = parse_int("1f", 16);   //parse_int ایک پوائنٹر واپس کرتا ہے: null کا مطلب ہے کہ یہ ناکام ہوگیا۔
  rand_t a = init_rand(17);   //ایک ہی بیج ایک ہی ترتیب دیتا ہے، جو رنز کو دہرانے کے قابل رہتا ہے۔
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   //int2hex نمبر کو فارمیٹ کرتا ہے جس طرح ڈیبگر اسے دکھاتا ہے۔

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));   //پارس لائبریری دستی پوائنٹر کے کام کے بغیر متن کو تقسیم کرتی ہے۔
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



