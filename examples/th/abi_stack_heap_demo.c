//การสาธิต ABI ขั้นต่ำ:
//- สแต็กเฟรม (คนในพื้นที่ใน main/functions)
//- การจัดสรรฮีปผ่านการจัดสรร (int)
//- การส่งผ่านอาร์กิวเมนต์ ($a0-$a3 + arg ที่ 5 บนสแต็ก)
//- คืนค่าเป็น $v0

int sum5(int a, int b, int c, int d, int e) {
  //อาร์กิวเมนต์สี่ตัวแรกใช้ $a0-$a3; อันที่ห้าอ่านจากสแต็กของผู้โทร
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  //ตัวชี้เขียนลงในหน่วยความจำฮีป
  *slot = x + y;
  //การยกเลิกการอ้างอิงจะอ่านค่ากลับจากหน่วยความจำจำลอง MIPS
  return *slot * 2;
}

int main(void) {
  int local = 7;                //สแต็กท้องถิ่น
  int* heap_value = alloc(int); //ฮีป (syscall sbrk)

  //ตัวชี้ยังคงใช้ได้หลังจากที่ผู้เรียกกลับมา เพราะมันอ้างถึงหน่วยความจำฮีป
  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); //อาร์กิวเมนต์ที่ 5 รั่วไหลเพื่อกองซ้อน

  //ผลลัพธ์ที่คาดหวัง: 52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
