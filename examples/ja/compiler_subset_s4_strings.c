#use <conio>
#use <string>

int main(void) {
  //C0-S4- 以上が必要です: bool、char、string、および文字列ライブラリ。
  char suffix = 'M';   //char はコードを保持する 1 バイトです。ここでは 77
  string joined = string_join("web", string_fromchar(suffix));   //文字列はレジスタではなくヒープに構築されます
  bool matches = string_equal(joined, "webM");   //テキストを比較するということは、バイトごとに比較することを意味します

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);   //bool は依然として単語です: 0 または 1
  printchar('\n');
  return 0;
}



