//Wieloplikowy projekt C. stats.c importuje swoje deklaracje z stats.h.
#include "stats.h"   //nagłówek deklaruje, co istnieje
#use "stats.c"   //i ta linia wprowadza plik, który go implementuje

int main(void) {
  int values[6] = {3, 5, 8, 2, 11, 13};   //tablica znajduje się w ramce głównej
  print_string("sum=");
  print_int(array_sum(values, 6));   //tablica jest przekazywana jako adres, a nie kopiowana
  print_char(10);
  print_string("max=");
  print_int(array_max(values, 6));   //ta sama tablica, inna funkcja z tego samego modułu
  print_char(10);
  return 0;
}
