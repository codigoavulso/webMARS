#use <conio>

struct stats {   //yapı, bellekteki ardışık kelimelerden oluşan bir bloktur
  int count;
  int total;
};

typedef struct stats* stats_t;   //program adresi iletir, asla bloğun tamamını geçmez

//@requires box != NULL;
//@requires 0 <= n && n <= \length(values);
//@ensures \result == box->total;
int accumulate(stats_t box, int values[], int n) {   //yukarıdaki sözleşmeler derleyici tarafından kontrol edilir, yazdırılmaz
  box->count = n;
  box->total = 0;

  int i = 0;
  //@loop_invariant 0 <= i && i <= n;
  //@loop_invariant box->count == n;
  while (i < n) {
    box->total += values[i];   //kutu-> adresten sabit bir uzaklıktaki bir alanı okur
    i++;
  }

  return box->total;
}

int main(void) {
  //Tam C0 temel örneği: sözleşmeler, döngü değişmezi, typedef, struct, alloc, alloc_array ve işaretçi alanı güncellemeleri.
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


