#use <args>

//เปิดใช้งานการตั้งค่า > อาร์กิวเมนต์ของโปรแกรมที่มีให้กับโปรแกรม MIPS
//อาร์กิวเมนต์ที่แนะนำ: -verbose -repeat 3 -name Ada alpha beta
int main(void) {
  bool verbose = false;
  int repeat = 1;
  string name = "MARS";

  //ลงทะเบียนตัวเลือกที่มีชื่อและที่อยู่ที่ต้องจัดเก็บค่าที่แยกวิเคราะห์
  args_flag("verbose", &verbose);
  args_int("repeat", &repeat);
  args_string("name", &name);
  //args_parse ใช้ตัวเลือกที่รู้จักและส่งกลับเฉพาะอาร์กิวเมนต์ตำแหน่งเท่านั้น
  args_t remaining = args_parse();

  if (remaining == NULL) {
    print_string("Invalid argument list.\n");
    return 0;
  }

  print_string("name=");
  print_string(name);
  print_char(10);
  print_string("repeat=");
  print_int(repeat);
  print_char(10);
  print_string("verbose=");
  if (verbose) print_string("true\n");
  else print_string("false\n");

  print_string("positional arguments=");
  print_int(remaining->argc);
  print_char(10);
  for (int i = 0; i < remaining->argc; i++) {
    //argv เป็นอาร์เรย์ของสตริง แต่ละดัชนีเป็นโทเค็นที่ไม่ได้ใช้งานหนึ่งรายการ
    print_string(remaining->argv[i]);
    print_char(10);
  }
  return 0;
}
