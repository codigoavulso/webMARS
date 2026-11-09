//@requires \length(row) == 3;
int row_sum(int row[]) {   //tham số là một địa chỉ: hàng không được sao chép
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   //row[i] biên dịch thành base + i*4
  }
  return total;
}

int main(void) {
  // Mảng 2 x 3 được sắp xếp theo từng hàng. Đi qua một hàng sẽ chuyển địa chỉ của nó.
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   //hai hàng ba chữ liền nhau trong trí nhớ
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   //ma trận [0] và ma trận [1] là các địa chỉ cách nhau 12 byte

  //Sản lượng dự kiến: 21
  print_int(total);
  print_char(10);
  return 0;
}
