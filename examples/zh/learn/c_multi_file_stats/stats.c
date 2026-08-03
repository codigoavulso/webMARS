#include "stats.h"   //模块根据自己的声明检查自身

int array_sum(int values[], int length) {   //值作为指向调用者数组的指针到达
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   //每个索引都成为 MIPS 中的地址计算
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   //从第一个元素开始，然后比较其余元素
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   //每个元素进行一次比较：此循环是线性的
  }
  return result;
}
