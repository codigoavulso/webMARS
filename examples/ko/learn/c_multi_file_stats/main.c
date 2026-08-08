//다중 파일 C 프로젝트. stats.c는 stats.h에서 선언을 가져옵니다.
#include "stats.h"   //헤더는 존재하는 것을 선언합니다.
#use "stats.c"   //이 줄은 이를 구현하는 파일을 가져옵니다.

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   //배열은 메인 프레임에 있습니다.
  print_string("sum=");
  print_int(array_sum(values, 6));   //배열은 복사되지 않고 주소로 전달됩니다.
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));   //동일한 배열, 동일한 모듈의 다른 함수
  print_char(10);
  return 0;
}
