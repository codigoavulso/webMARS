//@requires \length(row) == 3;
int row_sum(int row[]) {   //パラメータはアドレスです: 行はコピーされません
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   //row[i] は、base + i*4 にコンパイルされます。
  }
  return total;
}

int main(void) {
  //S3 配列のトピック: ローカル配列、初期化子リスト、多次元形状、および配列パラメーター。
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   //メモリ内で連続した 3 つの単語を 2 行に配置
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   //行列[0]と行列[1]は12バイト離れたアドレスです

  //予想される出力: 21
  print_int(total);
  print_char(10);
  return 0;
}
