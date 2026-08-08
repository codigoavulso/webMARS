//複数ファイルの C プロジェクト。 stats.c は stats.h から宣言をインポートします。
#include "stats.h"   //ヘッダーは存在するものを宣言します
#use "stats.c"   //この行はそれを実装するファイルを取り込みます

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   //配列はメインフレーム内に存在します
  print_string("sum=");
  print_int(array_sum(values, 6));   //配列はコピーされずにアドレスとして渡されます
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));   //同じ配列、同じモジュールの別の関数
  print_char(10);
  return 0;
}
