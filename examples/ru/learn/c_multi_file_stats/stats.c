#include "stats.h"   //модуль проверяет себя на соответствие собственным объявлениям

int array_sum(int values[], int length) {   //значения поступают как указатель на массив вызывающего объекта
  int total = 0;
  for (int i = 0; i < length; i++) {
    total += values[i];   //каждый индекс становится вычислением адреса в MIPS
  }
  return total;
}

int array_max(int values[], int length) {
  int result = values[0];   //начните с первого элемента, затем сравните остальные
  for (int i = 1; i < length; i++) {
    if (values[i] > result) result = values[i];   //одно сравнение на элемент: этот цикл линейный
  }
  return result;
}
