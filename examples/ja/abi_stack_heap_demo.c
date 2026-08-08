//最小限の ABI デモ:
//- スタックフレーム (メイン/関数のローカル)
//- alloc(int) によるヒープ割り当て
//- 引数の受け渡し ($a0-$a3 + スタック上の 5 番目の引数)
//- $v0 の戻り値

int sum5(int a, int b, int c, int d, int e) {
  //最初の 4 つの引数は $a0-$a3 を使用します。 5 番目は呼び出し側のスタックから読み取られます。
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  //ヒープ メモリにポインタを書き込みます。
  *slot = x + y;
  //逆参照すると、シミュレートされた MIPS メモリから値が読み取られます。
  return *slot * 2;
}

int main(void) {
  int local = 7;                //スタックローカル
  int* heap_value = alloc(int); //ヒープ (syscall sbrk)

  //ポインタはヒープ メモリを参照するため、呼び出し先が戻った後も有効なままです。
  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); //5番目の引数がスタックに溢れます

  //予想される出力: 52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
