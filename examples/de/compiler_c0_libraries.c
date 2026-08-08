#use <conio>
#use <parse>
#use <string>
#use <util>
#use <rand>

int main(void) {
  //Beispiel für vollständige C0+-Bibliotheken: Parse, String, Util und Rand arbeiten zusammen.
  int* parsed = parse_int("1f", 16);   //parse_int gibt einen Zeiger zurück: null bedeutet, dass es fehlgeschlagen ist
  rand_t a = init_rand(17);   //Der gleiche Startwert ergibt die gleiche Sequenz, wodurch die Läufe wiederholbar bleiben
  rand_t b = init_rand(17);
  string rendered = string_join("hex=", int2hex(*parsed));   //int2hex formatiert die Zahl so, wie sie der Debugger anzeigt

  print("Parsed and formatted: ");
  print(rendered);
  printchar('\n');

  print("Token count: ");
  printint(num_tokens("alpha beta gamma"));   //Die Parse-Bibliothek teilt Text ohne manuelle Zeigerarbeit
  printchar('\n');

  print("Deterministic rand: ");
  printbool(rand(a) == rand(b));
  printchar('\n');
  return 0;
}



