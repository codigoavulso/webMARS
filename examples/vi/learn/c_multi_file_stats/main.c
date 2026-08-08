//Dự án nhiều tập tin C. stats.c nhập các khai báo của nó từ stats.h.
#include "stats.h"   //tiêu đề khai báo những gì tồn tại
#use "stats.c"   //và dòng này mang đến tập tin thực hiện nó

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   //mảng nằm trong khung chính
  print_string("sum=");
  print_int(array_sum(values, 6));   //mảng được truyền dưới dạng địa chỉ, không được sao chép
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));   //cùng một mảng, một chức năng khác từ cùng một mô-đun
  print_char(10);
  return 0;
}
