#use <bitmap_rect>

//Ouvrez Outils > Affichage Bitmap et connectez-vous à MIPS.
//Le programme configure l'unité 1x1, l'affichage 128x64 et la base 0x10020000.
int main(void) {
  int cols = 128;
  int rows = 64;
  bitmap_configure_display(128, 64, 1, 1, 0x10020000);   //le programme lui-même définit la résolution et la base du framebuffer via MMIO

  bitmap_fill_rect(0, 0, cols, rows, cols, rows, 0x00000000);   //effacer signifie écrire chaque mot de pixel : il n'y a pas de remplissage matériel

  bitmap_fill_rect(6, 5, 30, 18, cols, rows, 0x00ff3a3a);   //les couleurs sont des 0x00RRGGBB mots, écrits directement dans la mémoire
  bitmap_fill_rect(42, 9, 35, 22, cols, rows, 0x0036d15b);
  bitmap_fill_rect(84, 14, 30, 20, cols, rows, 0x003b82f6);
  bitmap_fill_rect(28, 38, 55, 18, cols, rows, 0x00ffd166);

  return 0;
}
