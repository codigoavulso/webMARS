#use <bitmap_ascii>
#use <bitmap_rect>

//टूल्स > बिटमैप डिस्प्ले खोलें और MIPS से कनेक्ट करें।
//प्रोग्राम यूनिट 1x1, डिस्प्ले 128x64 और बेस 0x10020000 को कॉन्फ़िगर करता है।
void draw_ascii_line(int x, int y, int cols, int rows, int glyphs[], int length, int fg, int bg) {   //प्रत्येक ग्लिफ़ को फ़्रेमबफ़र में पिक्सेल दर पिक्सेल खींचा जाता है
  int index = 0;
  while (index < length) {
    bitmap_ascii_put_char(x + index * 6, y, cols, rows, glyphs[index], fg, bg);   //प्रति वर्ण 6 पिक्सेल: फ़ॉन्ट में अपनी कोई रिक्ति नहीं होती है
    index = index + 1;
  }
}

int main(void) {
  int cols = 128;
  int rows = 64;
  int bg = 0x00000000;   //प्रति पिक्सेल एक शब्द, 0x00RRGGBB
  int fg = 0x00ffffff;
  bitmap_configure_display(128, 64, 1, 1, 0x10020000);

  int line1[] = {104, 101, 108, 108, 111, 32, 77, 65, 82, 83};
  int line2[] = {
    67, 32, 66, 73, 84, 77, 65, 80, 32, 65, 83, 67, 73, 73
  };

  bitmap_fill_rect(0, 0, cols, rows, cols, rows, bg);
  draw_ascii_line(8, 12, cols, rows, line1, 10, fg, bg);
  draw_ascii_line(8, 28, cols, rows, line2, 14, fg, bg);
  return 0;
}
