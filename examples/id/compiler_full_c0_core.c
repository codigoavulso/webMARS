#use <conio>

struct stats {   //struct adalah blok kata-kata yang berurutan dalam memori
  int count;
  int total;
};

typedef struct stats* stats_t;   //program meneruskan alamatnya, tidak pernah seluruh blok

//@requires box != NULL;
//@requires 0 <= n && n <= \length(values);
//@ensures \result == box->total;
int accumulate(stats_t box, int values[], int n) {   //kontrak di atas diperiksa oleh kompiler, bukan dicetak
  box->count = n;
  box->total = 0;

  int i = 0;
  //@loop_invariant 0 <= i && i <= n;
  //@loop_invariant box->count == n;
  while (i < n) {
    box->total += values[i];   //box-> membaca bidang dengan offset tetap dari alamat
    i++;
  }

  return box->total;
}

int main(void) {
  //Contoh inti C0 lengkap: kontrak, invarian loop, typedef, struct, alokasi, alloc_array, dan pembaruan bidang penunjuk.
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


