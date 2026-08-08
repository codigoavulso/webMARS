int main(void) {
  //Wymaga C0-S2- lub nowszego: for pętli, przerwania/kontynuowania i ++/--.
  int sum = 0;   //akumulator po skompilowaniu znajduje się w rejestrze

  for (int i = 0; i < 10; i++) {   //pętla for staje się porównaniem i gałęzią wsteczną
    if ((i % 2) == 0) continue;   //kontynuuj skoki do przyrostu, pomijając ciało
    if (i > 7) break;   //break przeskakuje poza koniec pętli
    sum += i;
  }

  int down = 3;
  down--;   //po dekrementacji i pre-inkrementacji kompiluje się do tego samego dodatku
  int up = 3;
  ++up;

  //Oczekiwany wynik: 16 2 4
  print_int(sum);
  print_char(32);
  print_int(down);
  print_char(32);
  print_int(up);
  print_char(10);
  return 0;
}
