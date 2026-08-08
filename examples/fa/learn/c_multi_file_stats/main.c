//پروژه C چند فایلی stats.c اظهارنامه های خود را از stats.h وارد می کند.
#include "stats.h"   //هدر آنچه را که وجود دارد را اعلام می کند
#use "stats.c"   //و این خط فایلی را وارد می کند که آن را پیاده سازی می کند

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   //آرایه در قاب اصلی زندگی می کند
  print_string("sum=");
  print_int(array_sum(values, 6));   //آرایه به عنوان آدرس ارسال می شود، کپی نمی شود
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));   //همان آرایه، تابع دیگری از همان ماژول
  print_char(10);
  return 0;
}
