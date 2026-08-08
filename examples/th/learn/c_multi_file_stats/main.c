//โครงการ C หลายไฟล์ stats.c นำเข้าการประกาศจาก stats.h
#include "stats.h"   //ส่วนหัวประกาศสิ่งที่มีอยู่
#use "stats.c"   //และบรรทัดนี้จะนำไฟล์ที่ใช้งานเข้ามา

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   //อาร์เรย์อาศัยอยู่ในเฟรมของเมน
  print_string("sum=");
  print_int(array_sum(values, 6));   //อาร์เรย์ถูกส่งผ่านเป็นที่อยู่ ไม่ได้คัดลอก
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));   //อาร์เรย์เดียวกัน ฟังก์ชันอื่นจากโมดูลเดียวกัน
  print_char(10);
  return 0;
}
