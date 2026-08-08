//@requires \length(row) == 3;
int row_sum(int row[]) {   //پارامتر یک آدرس است: ردیف کپی نشده است
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   //row[i] به پایه + i*4 کامپایل می شود
  }
  return total;
}

int main(void) {
  //موضوع آرایه های S3: آرایه های محلی، لیست های اولیه، اشکال چند بعدی و پارامترهای آرایه.
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   //دو ردیف از سه کلمه، به هم پیوسته در حافظه
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   //ماتریس[0] و ماتریس[1] آدرس هایی هستند که 12 بایت از هم فاصله دارند

  //خروجی مورد انتظار: 21
  print_int(total);
  print_char(10);
  return 0;
}
