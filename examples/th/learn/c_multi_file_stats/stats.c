#include "stats.h"   //โมดูลจะตรวจสอบตัวเองกับการประกาศของตัวเอง

int array_sum(int values[], int length) {   //ค่ามาถึงเป็นตัวชี้ไปยังอาร์เรย์ของผู้เรียก
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   //แต่ละดัชนีจะกลายเป็นการคำนวณที่อยู่ใน MIPS
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   //เริ่มจากองค์ประกอบแรก แล้วจึงเปรียบเทียบส่วนที่เหลือ
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   //การเปรียบเทียบหนึ่งรายการต่อองค์ประกอบ: การวนซ้ำนี้เป็นแบบเส้นตรง
  }
  return result;
}
