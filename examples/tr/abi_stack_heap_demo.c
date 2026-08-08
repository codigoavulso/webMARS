//Minimum ABI demo:
//- yığın çerçevesi (ana/işlevlerdeki yereller)
//- alloc(int) aracılığıyla yığın tahsisi
//- bağımsız değişken geçişi ($a0-$a3 + yığındaki 5. bağımsız değişken)
//- $v0 cinsinden değeri döndür

int sum5(int a, int b, int c, int d, int e) {
  //İlk dört bağımsız değişken $a0-$a3 kullanır; beşincisi arayanın yığınından okunur.
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  //İşaretçi yığın belleğine yazar.
  *slot = x + y;
  //Referans kaldırma, değeri simüle edilmiş MIPS hafızasından geri okur.
  return *slot * 2;
}

int main(void) {
  int local = 7;                //yerel yığın
  int* heap_value = alloc(int); //yığın (sistem çağrısı sbrk)

  //İşaretçi, yığın belleğine başvurduğu için aranan kişi geri döndükten sonra geçerli kalır.
  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); //5. argüman yığına dökülüyor

  //Beklenen çıktı: 52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
