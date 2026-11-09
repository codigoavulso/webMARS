#use <conio>

struct stats {   //구조체는 메모리에 있는 연속적인 단어의 블록입니다.
  int count;
  int total;
};

typedef struct stats* stats_t;   //프로그램은 전체 블록이 아닌 주소를 전달합니다.

//@requires box != NULL;
//@requires 0 <= n && n <= \length(values);
//@ensures \result == box->total;
int accumulate(stats_t box, int values[], int n) {   // 전제 조건은 n을 배열 범위로 제한합니다. 루프가 읽을 수 있는 인덱스를 지정하는 불변 트랙입니다.
  box->count = n;
  box->total = 0;

  int i = 0;
  //@loop_invariant 0 <= i && i <= n;
  //@loop_invariant box->count == n;
  while (i < n) {
    box->total += values[i];   //box-> 주소로부터 고정된 오프셋에 있는 필드를 읽습니다.
    i++;
  }

  return box->total;
}

int main(void) {
  //전체 C0 핵심 예: 계약, 루프 불변, typedef, struct, alloc, alloc_array 및 포인터 필드 업데이트.
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


