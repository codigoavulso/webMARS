int main(void) {
  //Richiede C0-S2- o versione successiva: cicli for, interruzione/continua e ++/--.
  int sum = 0;   //l'accumulatore risiede in un registro una volta compilato

  for (int i = 0; i < 10; i++) {   //un ciclo for diventa un confronto più un ramo all'indietro
    if ((i % 2) == 0) continue;   //continua salta all'incremento, saltando il corpo
    if (i > 7) break;   //break salta oltre la fine del ciclo
    sum += i;
  }

  int down = 3;
  down--;   //post-decremento e pre-incremento vengono compilati con la stessa aggiunta
  int up = 3;
  ++up;

  //Risultato previsto: 16 2 4
  print_int(sum);
  print_char(32);
  print_int(down);
  print_char(32);
  print_int(up);
  print_char(10);
  return 0;
}
