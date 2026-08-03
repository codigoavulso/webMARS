#use <bitmap_rect>

//Откройте «Инструменты» > «Растровое изображение» и подключитесь к MIPS.
//Программа настраивает Модуль 1x1, Дисплей 128x64 и Базу 0x10020000.
int main(void) {
  int cols = 128;
  int rows = 64;
  bitmap_configure_display(128, 64, 1, 1, 0x10020000);   //программа сама устанавливает разрешение и базу фреймбуфера через MMIO

  bitmap_fill_rect(0, 0, cols, rows, cols, rows, 0x00000000);   //очистка означает запись каждого пиксельного слова: аппаратного заполнения нет

  bitmap_fill_rect(6, 5, 30, 18, cols, rows, 0x00ff3a3a);   // цвета 0x00RRGGBB слов, записанных прямо в память
  bitmap_fill_rect(42, 9, 35, 22, cols, rows, 0x0036d15b);
  bitmap_fill_rect(84, 14, 30, 20, cols, rows, 0x003b82f6);
  bitmap_fill_rect(28, 38, 55, 18, cols, rows, 0x00ffd166);

  return 0;
}
