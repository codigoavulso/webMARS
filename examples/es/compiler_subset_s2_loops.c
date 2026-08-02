int main(void) {
  // Requiere C0-S2- o superior: bucles for, break/continue y ++/--.
  int sum = 0;   // el acumulador vive en un registro tras compilar

  for (int i = 0; i < 10; i++) {   // un bucle for se vuelve una comparación más un salto hacia atrás
    if ((i % 2) == 0) continue;   // continue salta al incremento, ignorando el cuerpo
    if (i > 7) break;   // break salta más allá del final del bucle
    sum += i;
  }

  int down = 3;
  down--;   // posdecremento y preincremento compilan a la misma suma
  int up = 3;
  ++up;

  // Salida esperada: 16 2 4
  print_int(sum);
  print_char(32);
  print_int(down);
  print_char(32);
  print_int(up);
  print_char(10);
  return 0;
}
