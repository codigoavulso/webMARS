//최소 ABI 데모:
//- 스택 프레임(메인/함수의 로컬)
//- alloc(int)를 통한 힙 할당
//- 인수 전달 ($a0-$a3 + 스택의 5번째 인수)
//- $v0의 반환 값

int sum5(int a, int b, int c, int d, int e) {
  //처음 4개의 인수는 $a0-$a3를 사용합니다. 다섯 번째는 호출자의 스택에서 읽혀집니다.
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  //포인터가 힙 메모리에 기록됩니다.
  *slot = x + y;
  //역참조는 시뮬레이션된 MIPS 메모리에서 값을 다시 읽습니다.
  return *slot * 2;
}

int main(void) {
  int local = 7;                //로컬 스택
  int* heap_value = alloc(int); //힙(syscall sbrk)

  //포인터는 힙 메모리를 참조하므로 호출 수신자가 반환된 후에도 유효한 상태로 유지됩니다.
  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); //다섯 번째 인수가 스택으로 유출됨

  //예상 출력: 52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
