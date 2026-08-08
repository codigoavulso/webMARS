#include "stats.h"   //modül kendi bildirimlerine göre kendini kontrol eder

int array_sum(int values[], int length) {   //değerler arayanın dizisine bir işaretçi olarak gelir
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   //her dizin MIPS içinde bir adres hesaplamasına dönüşür
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   //ilk öğeden başlayın, ardından geri kalanını karşılaştırın
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   //eleman başına bir karşılaştırma: bu döngü doğrusaldır
  }
  return result;
}
