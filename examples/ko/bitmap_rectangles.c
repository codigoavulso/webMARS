#use <bitmap_rect>

//도구 > 비트맵 디스플레이를 열고 MIPS에 연결합니다.
//프로그램은 단위 1x1, 디스플레이 128x64 및 베이스 0x10020000를 구성합니다.
int main(void) {
  int cols = 128;
  int rows = 64;
  bitmap_configure_display(128, 64, 1, 1, 0x10020000);   //프로그램 자체는 MMIO을 통해 해상도와 프레임 버퍼 기반을 설정합니다.

  bitmap_fill_rect(0, 0, cols, rows, cols, rows, 0x00000000);   //지우는 것은 모든 픽셀 단어를 쓰는 것을 의미합니다. 하드웨어 채우기가 없습니다.

  bitmap_fill_rect(6, 5, 30, 18, cols, rows, 0x00ff3a3a);   //색상은 0x00RRGGBB 단어로, 메모리에 직접 기록됩니다.
  bitmap_fill_rect(42, 9, 35, 22, cols, rows, 0x0036d15b);
  bitmap_fill_rect(84, 14, 30, 20, cols, rows, 0x003b82f6);
  bitmap_fill_rect(28, 38, 55, 18, cols, rows, 0x00ffd166);

  return 0;
}
