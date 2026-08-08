#use <conio>
#use <string>

int main(void) {
  //ต้องการ C0-S4- หรือสูงกว่า: บูล, ถ่าน, สตริง และไลบรารีสตริง
  char suffix = 'M';   //ถ่านคือหนึ่งไบต์ที่มีรหัสอยู่ ที่นี่ 77
  string joined = string_join("web", string_fromchar(suffix));   //สตริงถูกสร้างขึ้นในฮีป ไม่ใช่ในรีจิสเตอร์
  bool matches = string_equal(joined, "webM");   //การเปรียบเทียบข้อความหมายถึงการเปรียบเทียบไบต์ต่อไบต์

  print("Joined string: ");
  print(joined);
  printchar('!');
  printchar('\n');

  print("Matches expected: ");
  printbool(matches);   //บูลยังคงเป็นคำ: 0 หรือ 1
  printchar('\n');
  return 0;
}



