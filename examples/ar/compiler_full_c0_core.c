#use <conio>

struct stats {   //البنية عبارة عن كتلة من الكلمات المتتالية في الذاكرة
  int count;
  int total;
};

typedef struct stats* stats_t;   //يقوم البرنامج بتمرير العنوان، وليس الكتلة بأكملها

//@requires box != NULL;
//@requires 0 <= n && n <= \length(values);
//@ensures \result == box->total;
int accumulate(stats_t box, int values[], int n) {   //يتم فحص العقود المذكورة أعلاه بواسطة المترجم، ولا تتم طباعتها
  box->count = n;
  box->total = 0;

  int i = 0;
  //@loop_invariant 0 <= i && i <= n;
  //@loop_invariant box->count == n;
  while (i < n) {
    box->total += values[i];   //box-> يقرأ الحقل بإزاحة ثابتة من العنوان
    i++;
  }

  return box->total;
}

int main(void) {
  //مثال أساسي كامل لـ C0: العقود، والحلقة الثابتة، وtypedef، وstruct، وalloc، وalloc_array، وتحديثات حقل المؤشر.
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


