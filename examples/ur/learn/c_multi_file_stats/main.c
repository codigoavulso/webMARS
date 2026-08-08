//ملٹی فائل سی پروجیکٹ۔ stats.c اپنے اعلانات stats.h سے درآمد کرتا ہے۔
#include "stats.h"   //ہیڈر اعلان کرتا ہے کہ کیا موجود ہے۔
#use "stats.c"   //اور یہ لائن فائل میں لاتی ہے جو اسے نافذ کرتی ہے۔

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   //صف مین کے فریم میں رہتی ہے۔
  print_string("sum=");
  print_int(array_sum(values, 6));   //صف کو ایڈریس کے طور پر پاس کیا جاتا ہے، کاپی نہیں کیا جاتا ہے۔
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));   //ایک ہی صف، اسی ماڈیول سے ایک اور فنکشن
  print_char(10);
  return 0;
}
