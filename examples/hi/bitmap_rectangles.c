#use <bitmap_rect>

//टूल्स > बिटमैप डिस्प्ले खोलें और MIPS से कनेक्ट करें।
//प्रोग्राम यूनिट 1x1, डिस्प्ले 128x64 और बेस 0x10020000 को कॉन्फ़िगर करता है।
int main(void) {
  int cols = 128;
  int rows = 64;
  bitmap_configure_display(128, 64, 1, 1, 0x10020000);   //प्रोग्राम स्वयं MMIO के माध्यम से रिज़ॉल्यूशन और फ़्रेमबफ़र बेस सेट करता है

  bitmap_fill_rect(0, 0, cols, rows, cols, rows, 0x00000000);   //समाशोधन का अर्थ है प्रत्येक पिक्सेल शब्द लिखना: कोई हार्डवेयर भरण नहीं है

  bitmap_fill_rect(6, 5, 30, 18, cols, rows, 0x00ff3a3a);   //रंग 0x00RRGGBB शब्द हैं, जो सीधे स्मृति में लिखे जाते हैं
  bitmap_fill_rect(42, 9, 35, 22, cols, rows, 0x0036d15b);
  bitmap_fill_rect(84, 14, 30, 20, cols, rows, 0x003b82f6);
  bitmap_fill_rect(28, 38, 55, 18, cols, rows, 0x00ffd166);

  return 0;
}
