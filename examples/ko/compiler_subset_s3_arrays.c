//@requires \length(row) == 3;
int row_sum(int row[]) {   //매개변수가 주소입니다. 행이 복사되지 않습니다.
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   //row[i]는 base + i*4로 컴파일됩니다.
  }
  return total;
}

int main(void) {
  // 2x3 배열은 행별로 배치됩니다. 한 행을 전달하면 해당 주소가 전달됩니다.
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   //세 단어로 구성된 두 행, 메모리에 연속됨
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   //행렬[0]과 행렬[1]은 12바이트 떨어진 주소입니다.

  //예상 출력: 21
  print_int(total);
  print_char(10);
  return 0;
}
