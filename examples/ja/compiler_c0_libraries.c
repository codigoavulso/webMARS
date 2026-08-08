#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  //完全な C0 + ライブラリの例: parse、string、util、rand が連携して動作します。
  int* parsed = parse_int("1f", 16);   //parse_int はポインタを返します。null は失敗したことを意味します
  rand_t a = init_rand(17);   //同じシードから同じシーケンスが得られるため、実行の反復性が保たれます。
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   //int2hex は、デバッガーが表示する方法で数値をフォーマットします。

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));   //解析ライブラリは、手動によるポインタ作業を行わずにテキストを分割します。
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



