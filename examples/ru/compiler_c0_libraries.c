#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  //Полный пример библиотек C0 +: совместная работа parse, string, util и rand.
  int* parsed = parse_int("1f", 16);   //parse_int возвращает указатель: ноль означает, что это не удалось
  rand_t a = init_rand(17);   //одно и то же начальное число дает одну и ту же последовательность, что обеспечивает повторяемость прогонов
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   //int2hex форматирует число так, как его показывает отладчик.

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));   //библиотека синтаксического анализа разбивает текст без ручной работы с указателем
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



