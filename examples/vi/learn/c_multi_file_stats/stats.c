#include "stats.h"   //mô-đun tự kiểm tra theo các khai báo của chính nó

int array_sum(int values[], int length) {   //các giá trị đến dưới dạng một con trỏ tới mảng của người gọi
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   //mỗi chỉ mục trở thành một phép tính địa chỉ trong MIPS
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   //bắt đầu từ phần tử đầu tiên, sau đó so sánh phần còn lại
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   //một so sánh cho mỗi phần tử: vòng lặp này là tuyến tính
  }
  return result;
}
