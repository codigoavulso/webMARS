//مشروع متعدد الملفات C. تقوم stats.c باستيراد إعلاناتها من stats.h.
#include "stats.h"   //يعلن الرأس ما هو موجود
#use "stats.c"   //وهذا السطر يجلب الملف الذي ينفذه

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   //تعيش المصفوفة في الإطار الرئيسي
  print_string("sum=");
  print_int(array_sum(values, 6));   //يتم تمرير المصفوفة كعنوان، ولا يتم نسخها
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));   //نفس المصفوفة، وظيفة أخرى من نفس الوحدة
  print_char(10);
  return 0;
}
