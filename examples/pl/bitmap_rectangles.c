#use <bitmap_rect>

//Otwórz Narzędzia > Wyświetlanie mapy bitowej i połącz się z MIPS.
//Program konfiguruje jednostkę 1x1, wyświetlacz 128x64 i podstawę 0x10020000.
int main(void) {
  int cols = 128;
  int rows = 64;
  bitmap_configure_display(128, 64, 1, 1, 0x10020000);   //program sam ustawia rozdzielczość i bazę bufora ramki poprzez MMIO

  bitmap_fill_rect(0, 0, cols, rows, cols, rows, 0x00000000);   //czyszczenie oznacza zapisanie każdego słowa pikselowego: nie ma wypełnienia sprzętowego

  bitmap_fill_rect(6, 5, 30, 18, cols, rows, 0x00ff3a3a);   //kolory to słowa 0x00RRGGBB zapisane bezpośrednio w pamięci
  bitmap_fill_rect(42, 9, 35, 22, cols, rows, 0x0036d15b);
  bitmap_fill_rect(84, 14, 30, 20, cols, rows, 0x003b82f6);
  bitmap_fill_rect(28, 38, 55, 18, cols, rows, 0x00ffd166);

  return 0;
}
