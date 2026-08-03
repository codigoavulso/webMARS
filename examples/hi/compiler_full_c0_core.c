#use <conio>

struct stats {   //एक संरचना स्मृति में लगातार शब्दों का एक ब्लॉक है
  int count;
  int total;
};

typedef struct stats* stats_t;   //प्रोग्राम पते को पार करता है, पूरे ब्लॉक को कभी नहीं

//@requires box != NULL;
//@requires 0 <= n && n <= \length(values);
//@ensures \result == box->total;
int accumulate(stats_t box, int values[], int n) {   //उपरोक्त अनुबंधों को संकलक द्वारा जांचा जाता है, मुद्रित नहीं किया जाता है
  box->count = n;
  box->total = 0;

  int i = 0;
  //@loop_invariant 0 <= i && i <= n;
  //@loop_invariant box->count == n;
  while (i < n) {
    box->total += values[i];   //बॉक्स-> पते से एक निश्चित ऑफसेट पर एक फ़ील्ड पढ़ता है
    i++;
  }

  return box->total;
}

int main(void) {
  //पूर्ण C0 कोर उदाहरण: कॉन्ट्रैक्ट्स, लूप इनवेरिएंट, टाइपडेफ़, स्ट्रक्चर, एलोक, एलोक_एरे और पॉइंटर फ़ील्ड अपडेट।
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


