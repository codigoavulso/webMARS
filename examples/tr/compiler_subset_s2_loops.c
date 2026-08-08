int main(void) {
  //Döngüler, ara/devam ve ++/-- için C0-S2- veya üzeri gerekir.
  int sum = 0;   //akümülatör derlendikten sonra bir kayıt defterinde yaşar

  for (int i = 0; i < 10; i++) {   //for döngüsü bir karşılaştırma artı bir geriye doğru dal haline gelir
    if ((i % 2) == 0) continue;   //gövdeyi atlayarak artışa atlamaya devam edin
    if (i > 7) break;   //break döngünün sonuna atlar
    sum += i;
  }

  int down = 3;
  down--;   //azalma sonrası ve artış öncesi aynı eklemeye derleme
  int up = 3;
  ++up;

  //Beklenen çıktı: 16 2 4
  print_int(sum);
  print_char(32);
  print_int(down);
  print_char(32);
  print_int(up);
  print_char(10);
  return 0;
}
