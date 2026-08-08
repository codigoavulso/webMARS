int main(void) {
  //C0-S2- 이상이 필요합니다: for 루프, 중단/계속 및 ++/--.
  int sum = 0;   //누산기는 일단 컴파일되면 레지스터에 존재합니다.

  for (int i = 0; i < 10; i++) {   //for 루프는 비교와 역방향 분기가 됩니다.
    if ((i % 2) == 0) continue;   //계속해서 증분으로 점프하고 본문을 건너뜁니다.
    if (i > 7) break;   //break는 루프의 끝을 지나서 점프합니다.
    sum += i;
  }

  int down = 3;
  down--;   //사후 감소 및 사전 증가는 동일한 추가로 컴파일됩니다.
  int up = 3;
  ++up;

  //예상 출력: 16 2 4
  print_int(sum);
  print_char(32);
  print_int(down);
  print_char(32);
  print_int(up);
  print_char(10);
  return 0;
}
