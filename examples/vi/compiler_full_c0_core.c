#use <conio>

struct stats {   //một cấu trúc là một khối các từ liên tiếp trong bộ nhớ
  int count;
  int total;
};

typedef struct stats* stats_t;   //chương trình chuyển địa chỉ, không bao giờ chuyển toàn bộ khối

//@requires box != NULL;
//@requires 0 <= n && n <= \length(values);
//@ensures \result == box->total;
int accumulate(stats_t box, int values[], int n) {   //các hợp đồng trên được trình biên dịch kiểm tra, không được in ra
  box->count = n;
  box->total = 0;

  int i = 0;
  //@loop_invariant 0 <= i && i <= n;
  //@loop_invariant box->count == n;
  while (i < n) {
    box->total += values[i];   //box-> đọc một trường ở độ lệch cố định từ địa chỉ
    i++;
  }

  return box->total;
}

int main(void) {
  //Ví dụ đầy đủ về lõi C0: hợp đồng, bất biến vòng lặp, typedef, struct, alloc, alloc_array và cập nhật trường con trỏ.
  int values[4] = {2, 4, 6, 8};
  int* heap_values = alloc_array(int, 2);
  heap_values[0] = 10;
  heap_values[1] = 20;
  assert(heap_values[1] == 20);

  stats_t box = alloc(struct stats);
  int total = accumulate(box, values, 4);
  assert(box->count == 4);

  print("Total: ");
  printint(total);
  printchar('\n');
  print("Count: ");
  printint(box->count);
  printchar('\n');
  return 0;
}


