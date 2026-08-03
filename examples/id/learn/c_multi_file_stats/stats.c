#include "stats.h"   //modul memeriksa dirinya sendiri berdasarkan deklarasinya sendiri

int array_sum(int values[], int length) {   //nilai-nilai tiba sebagai penunjuk ke array pemanggil
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   //setiap indeks menjadi perhitungan alamat di MIPS
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   //mulai dari elemen pertama, lalu bandingkan sisanya
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   //satu perbandingan per elemen: loop ini linier
  }
  return result;
}
