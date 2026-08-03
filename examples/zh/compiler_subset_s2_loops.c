int main(void) {
  //需要 C0-S2- 或更高版本：for 循环、break/ continue 和 ++/--。
  int sum = 0;   //编译后累加器位于寄存器中

  for (int i = 0; i < 10; i++) {   //for 循环变成比较加向后分支
    if ((i % 2) == 0) continue;   //continue 跳转到增量，跳过主体
    if (i > 7) break;   //Break 跳转到循环末尾
    sum += i;
  }

  int down = 3;
  down--;   //后自减和预自增编译为相同的 add
  int up = 3;
  ++up;

  //预期输出：16 2 4
  print_int(sum);
  print_char(32);
  print_int(down);
  print_char(32);
  print_int(up);
  print_char(10);
  return 0;
}
