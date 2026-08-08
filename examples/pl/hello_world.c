//C0-S1 przykład: wyjście ciągu znaków i normalny powrót z głównego.
//Kompilator obniża te pomocniki do tych samych wywołań systemowych MIPS print używanych przez Assembly.
int main(void) {
  //Literały łańcuchowe są emitowane w segmencie danych z końcowym bajtem zerowym.
  print_string("Hello from C on webMARS!");
  //ASCII 10 to przesunięcie wiersza; print_char emituje dokładnie jeden znak.
  print_char(10);
  //Powrót z głównego staje się czystym wyjściem z programu.
  return 0;
}
