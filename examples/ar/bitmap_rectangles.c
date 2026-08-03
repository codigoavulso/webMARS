#use <bitmap_rect>

//افتح الأدوات > عرض الصورة النقطية واتصل بـ MIPS.
//يقوم البرنامج بتكوين الوحدة 1x1 والعرض 128x64 والقاعدة 0x10020000.
int main(void) {
  int cols = 128;
  int rows = 64;
  bitmap_configure_display(128, 64, 1, 1, 0x10020000);   //يقوم البرنامج نفسه بتعيين قاعدة الدقة والمخزن المؤقت للإطارات من خلال MMIO

  bitmap_fill_rect(0, 0, cols, rows, cols, rows, 0x00000000);   //يعني المسح كتابة كل كلمة بكسل: لا يوجد تعبئة للأجهزة

  bitmap_fill_rect(6, 5, 30, 18, cols, rows, 0x00ff3a3a);   // الألوان هي 0x00RRGGBB كلمات، مكتوبة مباشرة في الذاكرة
  bitmap_fill_rect(42, 9, 35, 22, cols, rows, 0x0036d15b);
  bitmap_fill_rect(84, 14, 30, 20, cols, rows, 0x003b82f6);
  bitmap_fill_rect(28, 38, 55, 18, cols, rows, 0x00ffd166);

  return 0;
}
