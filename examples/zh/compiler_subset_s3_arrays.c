//@requires \length(row) == 3;
int row_sum(int row[]) {   //参数是一个地址：该行不被复制
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   //row[i] 编译为 base + i*4
  }
  return total;
}

int main(void) {
  //S3 数组主题：本地数组、初始化列表、多维形状和数组参数。
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   //两行三个单词，在内存中连续
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   //矩阵[0]和矩阵[1]是相距12字节的地址

  //预期产量：21
  print_int(total);
  print_char(10);
  return 0;
}
