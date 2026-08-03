#use <conio>

struct stats {   //структура — это блок последовательных слов в памяти
  int count;
  int total;
};

typedef struct stats* stats_t;   //программа передает адрес, а не весь блок

//@requires box != NULL;
//@requires 0 <= n && n <= \length(values);
//@ensures \result == box->total;
int accumulate(stats_t box, int values[], int n) {   //приведенные выше контракты проверяются компилятором, а не печатаются
  box->count = n;
  box->total = 0;

  int i = 0;
  //@loop_invariant 0 <= i && i <= n;
  //@loop_invariant box->count == n;
  while (i < n) {
    box->total += values[i];   //box-> читает поле с фиксированным смещением от адреса
    i++;
  }

  return box->total;
}

int main(void) {
  //Полный пример ядра C0: контракты, инвариант цикла, typedef, struct, alloc, alloc_array и обновления полей указателей.
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


