//@requires \length(row) == 3;
int row_sum(int row[]) {   //พารามิเตอร์คือที่อยู่: แถวจะไม่ถูกคัดลอก
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   //row[i] คอมไพล์เป็นฐาน + i*4
  }
  return total;
}

int main(void) {
  //หัวข้ออาร์เรย์ S3: อาร์เรย์ภายใน รายการเครื่องมือเริ่มต้น รูปร่างหลายมิติ และพารามิเตอร์อาร์เรย์
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   //สองแถวสามคำติดกันในความทรงจำ
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   //matrix[0] และ matrix[1] อยู่ห่างกัน 12 ไบต์

  //ผลลัพธ์ที่คาดหวัง: 21
  print_int(total);
  print_char(10);
  return 0;
}
