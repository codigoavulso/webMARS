//@requires \length(row) == 3;
int row_sum(int row[]) {   //المعلمة هي عنوان: لم يتم نسخ الصف
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   //يتم تجميع الصف [i] إلى القاعدة + i*4
  }
  return total;
}

int main(void) {
  //موضوع صفائف S3: المصفوفات المحلية، وقوائم التهيئة، والأشكال متعددة الأبعاد، ومعلمات المصفوفة.
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   //صفين من ثلاث كلمات، متجاورتين في الذاكرة
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   //المصفوفة [0] والمصفوفة [1] هما عنوانان يفصل بينهما 12 بايت

  //الناتج المتوقع: 21
  print_int(total);
  print_char(10);
  return 0;
}
