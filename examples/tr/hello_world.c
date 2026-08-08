//C0-S1 örnek: dize çıktısı ve main'den normal dönüş.
//Derleyici bu yardımcıları Assembly tarafından kullanılan aynı MIPS yazdırma sistem çağrılarına indirir.
int main(void) {
  //Dize değişmezleri, veri segmentinde sonunda sıfır bayt olacak şekilde yayılır.
  print_string("Hello from C on webMARS!");
  //ASCII 10 satır beslemedir; print_char tam olarak bir karakter yayar.
  print_char(10);
  //Ana programdan geri dönmek, temiz bir program çıkışı haline gelir.
  return 0;
}
