//@requires \length(row) == 3;
int row_sum(int row[]) {   //پیرامیٹر ایک پتہ ہے: قطار کاپی نہیں کی گئی ہے۔
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   //قطار[i] بیس + i*4 پر مرتب کرتا ہے۔
  }
  return total;
}

int main(void) {
  // ایک 2 بائی 3 صف قطار در قطار رکھی گئی ہے۔ ایک قطار سے گزرنے سے اس کا پتہ گزر جاتا ہے۔
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   //تین الفاظ کی دو قطاریں، یادداشت میں ملحقہ
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   //میٹرکس[0] اور میٹرکس[1] ایڈریس 12 بائٹس کے علاوہ ہیں۔

  //متوقع پیداوار: 21
  print_int(total);
  print_char(10);
  return 0;
}
