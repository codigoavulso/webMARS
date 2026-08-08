//Minimalne demo ABI:
//- ramka stosu (lokalne w main/functions)
//- alokacja sterty poprzez alloc(int)
//- przekazanie argumentu ($a0-$a3 + 5-ty argument na stosie)
//- zwróć wartość w $v0

int sum5(int a, int b, int c, int d, int e) {
  //Pierwsze cztery argumenty wykorzystują $a0-$a3; piąty jest odczytywany ze stosu wywołującego.
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  //Wskaźnik zapisuje do pamięci sterty.
  *slot = x + y;
  //Dereferencja odczytuje wartość z powrotem z symulowanej pamięci MIPS.
  return *slot * 2;
}

int main(void) {
  int local = 7;                //stos lokalny
  int* heap_value = alloc(int); //sterta (syscall sbrk)

  //Wskaźnik pozostaje ważny po powrocie wywoływanego, ponieważ odwołuje się do pamięci sterty.
  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); //Piąty argument rozlewa się na stos

  //Oczekiwana produkcja: 52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
