//多文件 C 项目。 stats.c 从 stats.h 导入其声明。
#include "stats.h"   //标头声明存在什么
#use "stats.c"   //这行引入了实现它的文件

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   //该数组位于主框架中
  print_string("sum=");
  print_int(array_sum(values, 6));   //数组作为地址传递，而不是复制
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));   //同一数组，同一模块中的另一个函数
  print_char(10);
  return 0;
}
