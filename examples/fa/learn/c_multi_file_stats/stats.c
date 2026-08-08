#include "stats.h"   //ماژول خود را در برابر اعلامیه های خود بررسی می کند

int array_sum(int values[], int length) {   //مقادیر به عنوان یک اشاره گر به آرایه تماس گیرنده می رسد
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   //هر فهرست به یک محاسبه آدرس در MIPS تبدیل می‌شود.
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   //از عنصر اول شروع کنید، سپس بقیه را مقایسه کنید
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   //یک مقایسه برای هر عنصر: این حلقه خطی است
  }
  return result;
}
