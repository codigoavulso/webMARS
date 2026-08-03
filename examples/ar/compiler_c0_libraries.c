#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  //مثال كامل لمكتبات C0 +: التحليل، والسلسلة، والاستخدام، والراند التي تعمل معًا.
  int* parsed = parse_int("1f", 16);   //يقوم parse_int بإرجاع مؤشر: null يعني أنه فشل
  rand_t a = init_rand(17);   //نفس البذرة تعطي نفس التسلسل، مما يجعل عمليات التشغيل قابلة للتكرار
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   //يقوم int2hex بتنسيق الرقم بالطريقة التي يعرضها بها مصحح الأخطاء

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));   //تقوم مكتبة التحليل بتقسيم النص دون عمل المؤشر اليدوي
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



