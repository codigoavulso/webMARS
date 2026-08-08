//C0-S1 例: 文字列出力とメインからの通常の戻り。
//コンパイラは、これらのヘルパーを、Assembly で使用される同じ MIPS 出力システムコールに下げます。
int main(void) {
  //文字列リテラルは、末尾にゼロ バイトが付いたデータ セグメントで出力されます。
  print_string("Hello from C on webMARS!");
  //ASCII 10 は改行です。 print_char は 1 文字だけを出力します。
  print_char(10);
  //メインから戻ると、クリーンなプログラム終了になります。
  return 0;
}
