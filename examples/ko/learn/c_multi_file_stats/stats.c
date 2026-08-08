#include "stats.h"   //모듈은 자체 선언과 비교하여 자체적으로 확인합니다.

int array_sum(int values[], int length) {   //값은 호출자의 배열에 대한 포인터로 도착합니다.
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   //각 인덱스는 MIPS에서 주소 계산이 됩니다.
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   //첫 번째 요소부터 시작한 다음 나머지 요소를 비교하십시오.
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   //요소당 하나의 비교: 이 루프는 선형입니다.
  }
  return result;
}
