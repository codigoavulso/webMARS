//@requires \length(row) == 3;
int row_sum(int row[]) {   //le paramètre est une adresse : la ligne n'est pas copiée
  int total = 0;
  for (int i = 0; i < 3; i++) {
    total += row[i];   //row[i] compile en base + i*4
  }
  return total;
}

int main(void) {
  //Sujet sur les tableaux S3 : tableaux locaux, listes d'initialisation, formes multidimensionnelles et paramètres de tableau.
  int matrix[2][3] = { {1, 2, 3}, {4, 5, 6} };   //deux rangées de trois mots, contigus en mémoire
  int total = row_sum(matrix[0]) + row_sum(matrix[1]);   //matrice[0] et matrice[1] sont des adresses espacées de 12 octets

  //Résultat attendu : 21
  print_int(total);
  print_char(10);
  return 0;
}
