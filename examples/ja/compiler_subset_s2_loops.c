int main(void) {
  //C0-S2- 以上が必要です: for ループ、ブレーク/続行、および ++/--。
  int sum = 0;   //アキュムレータはコンパイルされるとレジスタ内に存在します

  for (int i = 0; i < 10; i++) {   //for ループは比較と後方分岐になります
    if ((i % 2) == 0) continue;   //continue は本体をスキップして増分にジャンプします
    if (i > 7) break;   //ブレークはループの終わりを越えてジャンプします
    sum += i;
  }

  int down = 3;
  down--;   //ポストデクリメントとプリインクリメントは同じ加算にコンパイルされます
  int up = 3;
  ++up;

  //予想される出力: 16 2 4
  print_int(sum);
  print_char(32);
  print_int(down);
  print_char(32);
  print_int(up);
  print_char(10);
  return 0;
}
