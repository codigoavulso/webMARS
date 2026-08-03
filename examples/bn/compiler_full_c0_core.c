#use <conio>

struct stats {   //একটি struct হল মেমরিতে পরপর শব্দের একটি ব্লক
  int count;
  int total;
};

typedef struct stats* stats_t;   //প্রোগ্রাম ঠিকানা পাস, পুরো ব্লক কখনও

//@requires box != NULL;
//@requires 0 <= n && n <= \length(values);
//@ensures \result == box->total;
int accumulate(stats_t box, int values[], int n) {   //উপরের চুক্তিগুলি কম্পাইলার দ্বারা চেক করা হয়, মুদ্রিত নয়
  box->count = n;
  box->total = 0;

  int i = 0;
  //@loop_invariant 0 <= i && i <= n;
  //@loop_invariant box->count == n;
  while (i < n) {
    box->total += values[i];   //box-> ঠিকানা থেকে একটি নির্দিষ্ট অফসেটে একটি ক্ষেত্র পড়ে
    i++;
  }

  return box->total;
}

int main(void) {
  //সম্পূর্ণ C0 মূল উদাহরণ: চুক্তি, লুপ ইনভেরিয়েন্ট, typedef, struct, alloc, alloc_array, এবং পয়েন্টার ফিল্ড আপডেট।
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


