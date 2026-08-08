#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  //Tam C0 + kitaplıkları örneği: ayrıştırma, dize, util ve rand'ın birlikte çalışması.
  int* parsed = parse_int("1f", 16);   //parse_int bir işaretçi döndürür: null, başarısız olduğu anlamına gelir
  rand_t a = init_rand(17);   //aynı tohum aynı sırayı verir, bu da çalışmaların tekrarlanabilir olmasını sağlar
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   //int2hex sayıyı hata ayıklayıcının gösterdiği şekilde biçimlendirir

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));   //ayrıştırma kitaplığı metni manuel işaretçi çalışması olmadan böler
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



