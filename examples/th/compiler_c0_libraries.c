#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  //ตัวอย่างไลบรารี C0 + แบบเต็ม: parse, string, util และ rand ที่ทำงานร่วมกัน
  int* parsed = parse_int("1f", 16);   //parse_int ส่งคืนตัวชี้: null หมายความว่าล้มเหลว
  rand_t a = init_rand(17);   //เมล็ดเดียวกันจะให้ลำดับเดียวกัน ซึ่งทำให้สามารถทำซ้ำได้
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   //int2hex จัดรูปแบบตัวเลขตามที่ดีบักเกอร์แสดง

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));   //ไลบรารีการแยกวิเคราะห์แยกข้อความโดยไม่ต้องใช้ตัวชี้แบบแมนนวล
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



