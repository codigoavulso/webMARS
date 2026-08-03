//Минимальная демонстрация ABI:
//- кадр стека (локальные в main/functions)
//- выделение кучи через alloc(int)
//- передача аргумента ($a0-$a3 + 5-й аргумент в стеке)
//- возвращаемое значение в $v0

int sum5(int a, int b, int c, int d, int e) {
  //Первые четыре аргумента используют $a0-$a3; пятый читается из стека вызывающей стороны.
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  //Указатель записывается в кучу памяти.
  *slot = x + y;
  //При разыменовании значение считывается обратно из моделируемой памяти MIPS.
  return *slot * 2;
}

int main(void) {
  int local = 7;                //стек локальный
  int* heap_value = alloc(int); //куча (системный вызов sbrk)

  //Указатель остается действительным после возврата вызываемого объекта, поскольку он ссылается на динамическую память.
  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); //Пятый аргумент складывается в стек

  //Ожидаемый результат: 52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
