#use <stdio>

int main(void) {
  //อ่านหนึ่งบรรทัดเต็มและแยกวิเคราะห์จำนวนเต็มจากบรรทัดนั้น
  //C0 ใช้อาร์เรย์ int เป็นบัฟเฟอร์อินพุตที่ไม่แน่นอนที่ไลบรารีคาดหวัง
  int line[64];
  int value[1] = {0};

  puts("=== stdio line parse ===");
  puts("Type a line that starts with an integer (example: 42 apples).");
  printf("> ");

  //fgets ส่งคืนจำนวนไบต์ที่อ่าน หรือค่าที่ไม่ใช่ค่าบวกที่ส่วนท้ายของอินพุต
  int len = fgets(line, 64, stdin_fd);
  if (len <= 0) {
    puts("Input ended before a line was read.");
    return 0;
  }

  //sscanf ส่งคืนจำนวนฟิลด์ที่แปลงสำเร็จ
  if (sscanf(line, "%d", value) == 1) {
    printf("Parsed integer: ");
    print_int(value[0]);
    print_char(10);
  } else {
    puts("No integer found at line start.");
  }

  //สาธิต ungetc โดยการอ่านอักขระตัวหนึ่งสองครั้ง
  puts("Now type one character:");
  int ch = fgetc(stdin_fd);
  if (ch != EOF) {
    //ungetc ดันกลับหนึ่งไบต์ ดังนั้น fgetc ถัดไปจะสังเกตไบต์เดียวกัน
    ungetc(ch, stdin_fd);
    int again = fgetc(stdin_fd);
    printf("Read twice (same code expected): ");
    print_int(ch);
    printf(" / ");
    print_int(again);
    print_char(10);
  }

  return 0;
}
