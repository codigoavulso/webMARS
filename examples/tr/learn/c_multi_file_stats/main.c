//Çok dosyalı C projesi. stats.c, bildirimlerini stats.h'den içe aktarır.
#include "stats.h"   //başlık neyin var olduğunu bildirir
#use "stats.c"   //ve bu satır onu uygulayan dosyayı getirir

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   //dizi ana çerçevede yaşıyor
  print_string("sum=");
  print_int(array_sum(values, 6));   //dizi kopyalanmaz, adres olarak iletilir
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));   //aynı dizi, aynı modülden başka bir işlev
  print_char(10);
  return 0;
}
