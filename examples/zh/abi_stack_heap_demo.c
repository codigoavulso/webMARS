//最小 ABI 演示：
//- 堆栈帧（主/函数中的局部变量）
//- 通过 alloc(int) 进行堆分配
//- 参数传递（$a0-$a3 + 堆栈上的第 5 个参数）
//- 返回值在 $v0 中

int sum5(int a, int b, int c, int d, int e) {
  //前四个参数使用 $a0-$a3；第五个是从调用者的堆栈中读取的。
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  //指针写入堆内存。
  *slot = x + y;
  //取消引用从模拟的 MIPS 内存中读回值。
  return *slot * 2;
}

int main(void) {
  int local = 7;                //本地堆栈
  int* heap_value = alloc(int); //堆（系统调用 sbrk）

  //该指针在被调用者返回后仍然有效，因为它引用的是堆内存。
  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); //第 5 个参数溢出到堆栈

  //预期产量：52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
