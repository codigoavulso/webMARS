#use <conio>

struct stats {   //ایک ڈھانچہ میموری میں لگاتار الفاظ کا ایک بلاک ہے۔
  int count;
  int total;
};

typedef struct stats* stats_t;   //پروگرام ایڈریس پاس کرتا ہے، کبھی بھی پورا بلاک نہیں۔

//@requires box != NULL;
//@requires 0 <= n && n <= \length(values);
//@ensures \result == box->total;
int accumulate(stats_t box, int values[], int n) {   //مندرجہ بالا معاہدوں کو کمپائلر کے ذریعہ چیک کیا جاتا ہے، پرنٹ نہیں کیا جاتا ہے۔
  box->count = n;
  box->total = 0;

  int i = 0;
  //@loop_invariant 0 <= i && i <= n;
  //@loop_invariant box->count == n;
  while (i < n) {
    box->total += values[i];   //box-> ایڈریس سے فکسڈ آفسیٹ پر فیلڈ پڑھتا ہے۔
    i++;
  }

  return box->total;
}

int main(void) {
  //مکمل C0 بنیادی مثال: معاہدے، لوپ انویرینٹ، typedef، struct، alloc، alloc_array، اور پوائنٹر فیلڈ اپ ڈیٹس۔
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


