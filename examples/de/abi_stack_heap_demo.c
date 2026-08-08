//Minimale ABI-Demo:
//- Stack-Frame (Lokale in main/functions)
//- Heap-Zuweisung über alloc(int)
//- Argumentübergabe ($a0-$a3 + 5. Argument auf dem Stapel)
//- Rückgabewert in $v0

int sum5(int a, int b, int c, int d, int e) {
  //Die ersten vier Argumente verwenden $a0-$a3; der fünfte wird vom Stapel des Aufrufers gelesen.
  int total = a + b;
  total = total + c;
  total = total + d;
  total = total + e;
  return total;
}

int write_and_double(int* slot, int x, int y) {
  //Zeiger in den Heap-Speicher schreiben.
  *slot = x + y;
  //Durch die Dereferenzierung wird der Wert aus dem simulierten MIPS-Speicher zurückgelesen.
  return *slot * 2;
}

int main(void) {
  int local = 7;                //lokal stapeln
  int* heap_value = alloc(int); //Heap (Systemaufruf sbrk)

  //Der Zeiger bleibt nach der Rückkehr des Aufgerufenen gültig, da er auf den Heap-Speicher verweist.
  int doubled = write_and_double(heap_value, local, 5);
  int combined = sum5(local, 2, 3, 4, *heap_value); //Das fünfte Argument läuft auf den Stapel über

  //Erwartete Ausgabe: 52
  print_int(doubled + combined);
  print_char(10);
  return 0;
}
