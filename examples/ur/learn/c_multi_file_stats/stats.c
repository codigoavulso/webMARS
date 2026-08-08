#include "stats.h"   //ماڈیول اپنے ہی اعلانات کے خلاف خود کو چیک کرتا ہے۔

int array_sum(int values[], int length) {   //اقدار کال کرنے والے کی صف کی طرف اشارہ کے طور پر پہنچتی ہیں۔
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   //ہر انڈیکس MIPS میں ایک ایڈریس کمپیوٹیشن بن جاتا ہے۔
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   //پہلے عنصر سے شروع کریں، پھر باقی کا موازنہ کریں۔
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   //فی عنصر ایک موازنہ: یہ لوپ لکیری ہے۔
  }
  return result;
}
