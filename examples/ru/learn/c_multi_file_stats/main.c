//Многофайловый проект C. stats.c импортирует свои объявления из stats.h.
#include "stats.h"   //заголовок объявляет то, что существует
#use "stats.c"   //и эта строка содержит файл, который ее реализует

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   //массив находится в основном кадре
  print_string("sum=");
  print_int(array_sum(values, 6));   //массив передается как адрес, а не копируется
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));   //тот же массив, другая функция из того же модуля
  print_char(10);
  return 0;
}
