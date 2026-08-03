#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  //完整的 C0 + 库示例：parse、string、util 和 rand 一起工作。
  int* parsed = parse_int("1f", 16);   //parse_int返回一个指针：null表示失败
  rand_t a = init_rand(17);   //相同的种子给出相同的序列，这使得运行可重复
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   //int2hex 按照调试器显示的方式格式化数字

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));   //解析库无需手动指针工作即可分割文本
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



