#use <conio>

struct stats {   //یک ساختار بلوکی از کلمات متوالی در حافظه است
  int count;
  int total;
};

typedef struct stats* stats_t;   //برنامه آدرس را ارسال می کند، نه کل بلوک را

//@requires box != NULL;
//@requires 0 <= n && n <= \length(values);
//@ensures \result == box->total;
int accumulate(stats_t box, int values[], int n) {   //قراردادهای بالا توسط کامپایلر بررسی می شوند، نه چاپ شده اند
  box->count = n;
  box->total = 0;

  int i = 0;
  //@loop_invariant 0 <= i && i <= n;
  //@loop_invariant box->count == n;
  while (i < n) {
    box->total += values[i];   //box-> یک فیلد را با فاصله ثابت از آدرس می خواند
    i++;
  }

  return box->total;
}

int main(void) {
  //نمونه هسته کامل C0: قراردادها، حلقه ثابت، typedef، struct، alloc، alloc_array، و به روز رسانی فیلد اشاره گر.
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


