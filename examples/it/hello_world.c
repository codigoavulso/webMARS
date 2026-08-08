//C0-S1 esempio: output di stringa e ritorno normale da main.
//Il compilatore riduce questi helper alle stesse MIPS chiamate di sistema di stampa utilizzate da Assembly.
int main(void) {
  //I valori letterali stringa vengono emessi nel segmento dati con un byte zero finale.
  print_string("Hello from C on webMARS!");
  //ASCII 10 è l'avanzamento riga; print_char emette esattamente un carattere.
  print_char(10);
  //Il ritorno da main diventa un'uscita pulita dal programma.
  return 0;
}
