int main(void) {
  //Erfordert C0-S2- oder höher: für Schleifen, Break/Continue und ++/--.
  int sum = 0;   //Der Akkumulator befindet sich nach der Kompilierung in einem Register

  for (int i = 0; i < 10; i++) {   //Eine for-Schleife wird zu einem Vergleich plus einem Rückwärtszweig
    if ((i % 2) == 0) continue;   //Springt weiter zum Inkrement und überspringt den Körper
    if (i > 7) break;   //break springt über das Ende der Schleife hinaus
    sum += i;
  }

  int down = 3;
  down--;   //Kompilieren nach dem Dekrementieren und Vorinkrementieren zum gleichen Add
  int up = 3;
  ++up;

  //Erwartete Ausgabe: 16 2 4
  print_int(sum);
  print_char(32);
  print_int(down);
  print_char(32);
  print_int(up);
  print_char(10);
  return 0;
}
