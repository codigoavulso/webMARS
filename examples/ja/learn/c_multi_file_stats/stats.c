#include "stats.h"   //モジュールは自身の宣言と照らし合わせて自身をチェックします

int array_sum(int values[], int length) {   //値は呼び出し元の配列へのポインタとして到着します
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   //各インデックスは MIPS のアドレス計算になります。
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   //最初の要素から開始して残りを比較します
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   //要素ごとに 1 つの比較: このループは線形です
  }
  return result;
}
