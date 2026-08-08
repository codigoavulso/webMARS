#use <stdio>

int main(void) {
  //การสาธิตไปกลับ: เขียนไบต์ลงในไฟล์ แล้วอ่านกลับ
  //จำนวนเต็มแต่ละจำนวนด้านล่างแสดงถึงหนึ่งไบต์ ศูนย์สุดท้ายคือจุดสิ้นสุดที่สะดวก
  int payload[18] = {
    104, 101, 108, 108, 111, 32, 115, 116, 100, 105, 111, 32, 102, 105, 108, 101, 10, 0
  };
  int read_back[32];

  puts("=== stdio file roundtrip ===");

  //ฟังก์ชันไฟล์ส่งคืนคำอธิบาย >= 0 เมื่อสำเร็จ และค่าลบเมื่อล้มเหลว
  int writer = fopen_write("stdio_demo.txt");
  if (writer < 0) {
    puts("Could not open file for writing.");
    return 0;
  }

  //เขียนองค์ประกอบหนึ่งไบต์ 17 รายการ ผู้ยุติไม่ได้ตั้งใจเขียน
  int written = fwrite(payload, 1, 17, writer);
  fclose(writer);
  printf("Bytes written: ");
  print_int(written);
  print_char(10);

  int reader = fopen_read("stdio_demo.txt");
  if (reader < 0) {
    puts("Could not open file for reading.");
    return 0;
  }

  //SEEK_SET ทำให้ออฟเซ็ต 6 สัมพันธ์กับจุดเริ่มต้นของไฟล์
  printf("fseek to byte 6 result: ");
  print_int(fseek(reader, 6, SEEK_SET));
  print_char(10);
  printf("ftell after seek: ");
  print_int(ftell(reader));
  print_char(10);
  printf("First character after seek: ");
  putchar(fgetc(reader));
  print_char(10);
  fclose(reader);

  //เปิดอีกครั้งเพื่อรีเซ็ตเคอร์เซอร์ก่อนที่จะอ่านเพย์โหลดทั้งหมด
  reader = fopen_read("stdio_demo.txt");
  int read_count = fread(read_back, 1, 31, reader);
  printf("Bytes read: ");
  print_int(read_count);
  print_char(10);

  printf("ftell after read: ");
  print_int(ftell(reader));
  print_char(10);

  //EOF/ธงข้อผิดพลาดเป็นของสตรีมและ clearerr จะรีเซ็ตตัวบ่งชี้ทั้งสอง
  printf("feof flag: ");
  print_int(feof(reader));
  print_char(10);

  printf("ferror flag: ");
  print_int(ferror(reader));
  print_char(10);

  clearerr(reader);
  printf("feof after clearerr: ");
  print_int(feof(reader));
  print_char(10);

  puts("File contents:");
  int i = 0;
  while (i < read_count) {
    //fread รายงานจำนวนไบต์ที่ถูกต้อง ดังนั้นจึงไม่จำเป็นต้องมีตัวยุติสตริงที่นี่
    putchar(read_back[i]);
    i = i + 1;
  }

  fclose(reader);
  return 0;
}
