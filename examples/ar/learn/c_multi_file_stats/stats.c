#include "stats.h"   //تتحقق الوحدة من نفسها وفقًا لإعلاناتها الخاصة

int array_sum(int values[], int length) {   //تصل القيم كمؤشر إلى مجموعة المتصل
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   //يصبح كل فهرس حساب عنوان في MIPS
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   //ابدأ بالعنصر الأول، ثم قارن الباقي
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   //مقارنة واحدة لكل عنصر: هذه الحلقة خطية
  }
  return result;
}
