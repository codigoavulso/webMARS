# ============================================================
# MARS-OS v0.1 - Bootstrap + consola grafica no Bitmap Display
# Bitmap Display:
#   Largura/Altura da unidade: 1
#   Ecra: 512 x 256
#   Endereco base: 0x10010000
#
# Consola:
#   celula 8x8 px => 64 colunas x 32 linhas
#   scroll por copia de linhas (copy-up)
# ============================================================

.eqv DISP_W              512
.eqv DISP_H              256
.eqv CELL_W              8
.eqv CELL_H              8
.eqv COLS                64      # 512/8
.eqv ROWS                32      # 256/8

.eqv FB_PIXELS           131072  # 512*256
.eqv FB_BYTES            524288  # 512*256*4

.eqv SCROLL_COPY_WORDS   126976  # 512*(256-8)
.eqv CLEAR_LAST_WORDS    4096    # 512*8
.eqv CELL_ROW_BYTES      16384   # 512*8*4 = 8 linhas de pixeis

# MMIO (MARS)
.eqv KBD_CTRL            0xFFFF0000
.eqv KBD_DATA            0xFFFF0004

.data
.align 2

# --- O framebuffer TEM de ser o primeiro item de .data
framebuffer:
  .space FB_BYTES        # base = 0x10010000 (se for mesmo o primeiro em .data)

# --- Estado da consola (fica depois do framebuffer)
.align 2
cursor_row: .word 0
cursor_col: .word 0
fg_color:   .word 0x00FFFFFF     # branco
bg_color:   .word 0x00000000     # preto

banner:     .asciiz "MARS-OS v0.1\n> "

# ------------------------------------------------------------
# Glyphs 8x8 (tabela esparsa): cada registo tem 9 bytes:
#   [char_code][row0]..[row7]
# bits da linha: bit7 = pixel mais a esquerda.
# ------------------------------------------------------------
.align 1
glyph_table:
  .byte 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00  # ' '
  .byte 0x21, 0x10, 0x10, 0x10, 0x10, 0x10, 0x00, 0x10, 0x00  # '!'
  .byte 0x3F, 0x38, 0x44, 0x04, 0x08, 0x10, 0x00, 0x10, 0x00  # '?'
  .byte 0x2E, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x10, 0x00  # '.'
  .byte 0x3A, 0x00, 0x10, 0x10, 0x00, 0x10, 0x10, 0x00, 0x00  # ':'
  .byte 0x2D, 0x00, 0x00, 0x00, 0x7C, 0x00, 0x00, 0x00, 0x00  # '-'
  .byte 0x5F, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x7C, 0x00  # '_'
  .byte 0x2F, 0x04, 0x08, 0x10, 0x20, 0x40, 0x00, 0x00, 0x00  # '/'

  .byte 0x30, 0x38, 0x44, 0x4C, 0x54, 0x64, 0x44, 0x38, 0x00  # '0'
  .byte 0x31, 0x10, 0x30, 0x10, 0x10, 0x10, 0x10, 0x38, 0x00  # '1'
  .byte 0x32, 0x38, 0x44, 0x04, 0x08, 0x10, 0x20, 0x7C, 0x00  # '2'
  .byte 0x33, 0x78, 0x04, 0x04, 0x38, 0x04, 0x04, 0x78, 0x00  # '3'
  .byte 0x34, 0x08, 0x18, 0x28, 0x48, 0x7C, 0x08, 0x08, 0x00  # '4'
  .byte 0x35, 0x7C, 0x40, 0x40, 0x78, 0x04, 0x04, 0x78, 0x00  # '5'
  .byte 0x36, 0x18, 0x20, 0x40, 0x78, 0x44, 0x44, 0x38, 0x00  # '6'
  .byte 0x37, 0x7C, 0x04, 0x08, 0x10, 0x20, 0x20, 0x20, 0x00  # '7'
  .byte 0x38, 0x38, 0x44, 0x44, 0x38, 0x44, 0x44, 0x38, 0x00  # '8'
  .byte 0x39, 0x38, 0x44, 0x44, 0x3C, 0x04, 0x08, 0x18, 0x00  # '9'

  .byte 0x41, 0x38, 0x44, 0x44, 0x7C, 0x44, 0x44, 0x44, 0x00  # 'A'
  .byte 0x42, 0x78, 0x44, 0x44, 0x78, 0x44, 0x44, 0x78, 0x00  # 'B'
  .byte 0x43, 0x38, 0x44, 0x40, 0x40, 0x40, 0x44, 0x38, 0x00  # 'C'
  .byte 0x44, 0x70, 0x48, 0x44, 0x44, 0x44, 0x48, 0x70, 0x00  # 'D'
  .byte 0x45, 0x7C, 0x40, 0x40, 0x78, 0x40, 0x40, 0x7C, 0x00  # 'E'
  .byte 0x46, 0x7C, 0x40, 0x40, 0x78, 0x40, 0x40, 0x40, 0x00  # 'F'
  .byte 0x47, 0x38, 0x44, 0x40, 0x5C, 0x44, 0x44, 0x38, 0x00  # 'G'
  .byte 0x48, 0x44, 0x44, 0x44, 0x7C, 0x44, 0x44, 0x44, 0x00  # 'H'
  .byte 0x49, 0x38, 0x10, 0x10, 0x10, 0x10, 0x10, 0x38, 0x00  # 'I'
  .byte 0x4A, 0x1C, 0x08, 0x08, 0x08, 0x48, 0x48, 0x30, 0x00  # 'J'
  .byte 0x4B, 0x44, 0x48, 0x50, 0x60, 0x50, 0x48, 0x44, 0x00  # 'K'
  .byte 0x4C, 0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x7C, 0x00  # 'L'
  .byte 0x4D, 0x44, 0x6C, 0x54, 0x54, 0x44, 0x44, 0x44, 0x00  # 'M'
  .byte 0x4E, 0x44, 0x64, 0x54, 0x4C, 0x44, 0x44, 0x44, 0x00  # 'N'
  .byte 0x4F, 0x38, 0x44, 0x44, 0x44, 0x44, 0x44, 0x38, 0x00  # 'O'
  .byte 0x50, 0x78, 0x44, 0x44, 0x78, 0x40, 0x40, 0x40, 0x00  # 'P'
  .byte 0x51, 0x38, 0x44, 0x44, 0x44, 0x54, 0x48, 0x34, 0x00  # 'Q'
  .byte 0x52, 0x78, 0x44, 0x44, 0x78, 0x50, 0x48, 0x44, 0x00  # 'R'
  .byte 0x53, 0x3C, 0x40, 0x40, 0x38, 0x04, 0x04, 0x78, 0x00  # 'S'
  .byte 0x54, 0x7C, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x00  # 'T'
  .byte 0x55, 0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x38, 0x00  # 'U'
  .byte 0x56, 0x44, 0x44, 0x44, 0x44, 0x44, 0x28, 0x10, 0x00  # 'V'
  .byte 0x57, 0x44, 0x44, 0x44, 0x54, 0x54, 0x54, 0x28, 0x00  # 'W'
  .byte 0x58, 0x44, 0x44, 0x28, 0x10, 0x28, 0x44, 0x44, 0x00  # 'X'
  .byte 0x59, 0x44, 0x44, 0x28, 0x10, 0x10, 0x10, 0x10, 0x00  # 'Y'
  .byte 0x5A, 0x7C, 0x04, 0x08, 0x10, 0x20, 0x40, 0x7C, 0x00  # 'Z'

  .byte 0x00  # marcador de fim

.text
.globl main
main:
  # stack relativamente segura
  lui  $sp, 0x7FFF
  ori  $sp, $sp, 0xEFFC

  jal  console_init
  nop

  la   $a0, banner
  jal  console_puts
  nop

  j    kernel_main
  nop

# ------------------------------------------------------------
# console_init: limpa e repoe o cursor
# ------------------------------------------------------------
console_init:
  addiu $sp, $sp, -8
  sw    $ra, 4($sp)

  la    $t0, cursor_row
  sw    $zero, 0($t0)
  la    $t0, cursor_col
  sw    $zero, 0($t0)

  jal   fb_clear
  nop

  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

# ------------------------------------------------------------
# fb_clear: preenche o framebuffer com bg_color
# ------------------------------------------------------------
# ------------------------------------------------------------
# fb_clear: preenche o framebuffer com bg_color
# versao otimizada: limpa blocos 8x8 (64 pixeis)
# ------------------------------------------------------------
fb_clear:
  addiu $sp,$sp,-8
  sw    $ra,4($sp)

  la    $t0,framebuffer
  la    $t1,bg_color
  lw    $t2,0($t1)

  li    $t3,FB_PIXELS
  srl   $t3,$t3,6          # /64 (64 pixeis por ciclo)

fb_clear_loop:

  sw $t2,0($t0)
  sw $t2,4($t0)
  sw $t2,8($t0)
  sw $t2,12($t0)
  sw $t2,16($t0)
  sw $t2,20($t0)
  sw $t2,24($t0)
  sw $t2,28($t0)

  sw $t2,32($t0)
  sw $t2,36($t0)
  sw $t2,40($t0)
  sw $t2,44($t0)
  sw $t2,48($t0)
  sw $t2,52($t0)
  sw $t2,56($t0)
  sw $t2,60($t0)

  sw $t2,64($t0)
  sw $t2,68($t0)
  sw $t2,72($t0)
  sw $t2,76($t0)
  sw $t2,80($t0)
  sw $t2,84($t0)
  sw $t2,88($t0)
  sw $t2,92($t0)

  sw $t2,96($t0)
  sw $t2,100($t0)
  sw $t2,104($t0)
  sw $t2,108($t0)
  sw $t2,112($t0)
  sw $t2,116($t0)
  sw $t2,120($t0)
  sw $t2,124($t0)

  sw $t2,128($t0)
  sw $t2,132($t0)
  sw $t2,136($t0)
  sw $t2,140($t0)
  sw $t2,144($t0)
  sw $t2,148($t0)
  sw $t2,152($t0)
  sw $t2,156($t0)

  sw $t2,160($t0)
  sw $t2,164($t0)
  sw $t2,168($t0)
  sw $t2,172($t0)
  sw $t2,176($t0)
  sw $t2,180($t0)
  sw $t2,184($t0)
  sw $t2,188($t0)

  sw $t2,192($t0)
  sw $t2,196($t0)
  sw $t2,200($t0)
  sw $t2,204($t0)
  sw $t2,208($t0)
  sw $t2,212($t0)
  sw $t2,216($t0)
  sw $t2,220($t0)

  sw $t2,224($t0)
  sw $t2,228($t0)
  sw $t2,232($t0)
  sw $t2,236($t0)
  sw $t2,240($t0)
  sw $t2,244($t0)
  sw $t2,248($t0)
  sw $t2,252($t0)

  addiu $t0,$t0,256
  addiu $t3,$t3,-1
  bnez  $t3,fb_clear_loop
  nop

  lw    $ra,4($sp)
  addiu $sp,$sp,8
  jr    $ra
  nop

# ------------------------------------------------------------
# console_puts($a0=asciiz)
# ------------------------------------------------------------
console_puts:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s0, 4($sp)

  move  $s0, $a0

puts_loop:
  lbu   $t0, 0($s0)
  beqz  $t0, puts_done
  nop

  move  $a0, $t0
  jal   console_putc
  nop

  addiu $s0, $s0, 1
  j     puts_loop
  nop

puts_done:
  lw    $s0, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# ------------------------------------------------------------
# console_backspace: recua o cursor e apaga a celula (desenha ' ')
# ------------------------------------------------------------
console_backspace:
  addiu $sp, $sp, -16
  sw    $ra, 12($sp)
  sw    $s0, 8($sp)
  sw    $s1, 4($sp)

  # carregar linha/coluna
  la    $t0, cursor_row
  lw    $s0, 0($t0)          # linha
  la    $t1, cursor_col
  lw    $s1, 0($t1)          # coluna

  # se estamos em (0,0) nao faz nada
  bnez  $s1, bs_dec_col
  nop
  bnez  $s0, bs_prev_line
  nop
  j     bs_done
  nop

bs_prev_line:
  addiu $s0, $s0, -1
  li    $s1, COLS
  addiu $s1, $s1, -1
  j     bs_store
  nop

bs_dec_col:
  addiu $s1, $s1, -1

bs_store:
  # guardar cursor
  la    $t0, cursor_row
  sw    $s0, 0($t0)
  la    $t0, cursor_col
  sw    $s1, 0($t0)

  # desenhar espaco na celula atual
  li    $a0, 0x20
  move  $a1, $s1
  move  $a2, $s0
  jal   draw_char_cell
  nop

bs_done:
  lw    $s1, 4($sp)
  lw    $s0, 8($sp)
  lw    $ra, 12($sp)
  addiu $sp, $sp, 16
  jr    $ra
  nop

# ------------------------------------------------------------
# console_putc($a0=char)
#   suporta: '\n' (LF), '\r' (CR), '\t' (tab=4), backspace
#   converte 'a'..'z' em 'A'..'Z' (por agora)
# ------------------------------------------------------------
console_putc:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s0, 12($sp)
  sw    $s1, 8($sp)
  sw    $s2, 4($sp)

  move  $s0, $a0

  # backspace (0x08) ou DEL (0x7F)
  li    $t0, 0x08
  beq   $s0, $t0, do_bs
  nop
  li    $t0, 0x7F
  beq   $s0, $t0, do_bs
  nop
  j     chk_tab
  nop
do_bs:
  jal   console_backspace
  nop
  j     putc_done
  nop

chk_tab:
  # tab => 4 espacos
  li    $t0, 0x09
  bne   $s0, $t0, chk_nl
  nop
  li    $s1, 4
tab_loop:
  li    $a0, 0x20
  jal   console_putc
  nop
  addiu $s1, $s1, -1
  bnez  $s1, tab_loop
  nop
  j     putc_done
  nop

chk_nl:
  li    $t0, 0x0A
  bne   $s0, $t0, chk_cr
  nop
  jal   console_newline
  nop
  j     putc_done
  nop

chk_cr:
  li    $t0, 0x0D
  bne   $s0, $t0, chk_lower
  nop
  la    $t1, cursor_col
  sw    $zero, 0($t1)
  j     putc_done
  nop

chk_lower:
  # 'a'..'z' => uppercase
  li    $t1, 'a'
  li    $t2, 'z'
  blt   $s0, $t1, draw_it
  nop
  bgt   $s0, $t2, draw_it
  nop
  addiu $s0, $s0, -32

draw_it:
  la    $t0, cursor_row
  lw    $s1, 0($t0)          # linha
  la    $t0, cursor_col
  lw    $s2, 0($t0)          # coluna

  move  $a0, $s0
  move  $a1, $s2
  move  $a2, $s1
  jal   draw_char_cell
  nop

  addiu $s2, $s2, 1
  li    $t3, COLS
  blt   $s2, $t3, store_cursor
  nop

  jal   console_newline
  nop
  j     putc_done
  nop

store_cursor:
  la    $t0, cursor_col
  sw    $s2, 0($t0)

putc_done:
  lw    $s2, 4($sp)
  lw    $s1, 8($sp)
  lw    $s0, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

# ------------------------------------------------------------
# console_newline: col=0; row++; scroll se necessario
# ------------------------------------------------------------
console_newline:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s0, 4($sp)

  la    $t0, cursor_col
  sw    $zero, 0($t0)

  la    $t0, cursor_row
  lw    $s0, 0($t0)
  addiu $s0, $s0, 1

  li    $t1, ROWS
  blt   $s0, $t1, nl_store
  nop

  jal   console_scroll
  nop
  li    $s0, ROWS
  addi  $s0, $s0, -1

nl_store:
  la    $t0, cursor_row
  sw    $s0, 0($t0)

  lw    $s0, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# ------------------------------------------------------------
# console_scroll: copia o framebuffer 8 linhas para cima + limpa a ultima banda
# ------------------------------------------------------------
console_scroll:
  addiu $sp, $sp, -12
  sw    $ra, 8($sp)
  sw    $s0, 4($sp)

  la    $t0, framebuffer
  addiu $t1, $t0, CELL_ROW_BYTES
  move  $t2, $t0
  move  $t3, $t1

  li    $t4, SCROLL_COPY_WORDS
scroll_copy_loop:
  lw    $t5, 0($t3)
  sw    $t5, 0($t2)
  addiu $t3, $t3, 4
  addiu $t2, $t2, 4
  addiu $t4, $t4, -1
  bnez  $t4, scroll_copy_loop
  nop

  la    $t6, bg_color
  lw    $t7, 0($t6)
  li    $t4, CLEAR_LAST_WORDS

scroll_clear_loop:
  sw    $t7, 0($t2)
  addiu $t2, $t2, 4
  addiu $t4, $t4, -1
  bnez  $t4, scroll_clear_loop
  nop

  lw    $s0, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# ------------------------------------------------------------
# draw_char_cell($a0=char, $a1=col, $a2=row)
# ------------------------------------------------------------
draw_char_cell:
  addiu $sp, $sp, -20
  sw    $ra, 16($sp)
  sw    $s0, 12($sp)
  sw    $s1, 8($sp)
  sw    $s2, 4($sp)

  move  $s0, $a0
  move  $s1, $a1
  move  $s2, $a2

  sll   $a1, $s1, 3
  sll   $a2, $s2, 3
  move  $a0, $s0

  jal   draw_glyph8x8
  nop

  lw    $s2, 4($sp)
  lw    $s1, 8($sp)
  lw    $s0, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

# ------------------------------------------------------------
# glyph_lookup($a0=char) -> $v0 = ptr para 8 bytes (row0..row7)
# ------------------------------------------------------------
glyph_lookup:
  move  $t9,$a0
  la    $t0,glyph_table

gl_find:
  lbu   $t1,0($t0)
  beqz  $t1,gl_return_q
  nop

  beq   $t1,$t9,gl_found
  nop

  addiu $t0,$t0,9
  j     gl_find
  nop

gl_found:
  addiu $v0,$t0,1
  jr    $ra
  nop

gl_return_q:
  la    $t0,glyph_table
gl_q_loop:
  lbu   $t1,0($t0)
  li    $t2,0x3F
  beq   $t1,$t2,gl_found
  nop
  addiu $t0,$t0,9
  j     gl_q_loop
  nop

# ------------------------------------------------------------
# draw_glyph8x8($a0=char, $a1=x, $a2=y)
# ------------------------------------------------------------
draw_glyph8x8:
  addiu $sp, $sp, -28
  sw    $ra, 24($sp)
  sw    $s0, 20($sp)
  sw    $s1, 16($sp)
  sw    $s2, 12($sp)
  sw    $s3, 8($sp)
  sw    $s4, 4($sp)

  move  $s0, $a0
  move  $s1, $a1
  move  $s2, $a2

  move  $a0, $s0
  jal   glyph_lookup
  nop
  move  $s3, $v0

  la    $t0, fg_color
  lw    $s4, 0($t0)
  la    $t0, bg_color
  lw    $t1, 0($t0)

  la    $t2, framebuffer

  li    $t3, 0
dg_row_loop:
  addu  $t4, $s3, $t3
  lbu   $t5, 0($t4)

  addu  $t6, $s2, $t3
  sll   $t6, $t6, 9
  addu  $t6, $t6, $s1
  sll   $t6, $t6, 2
  addu  $t6, $t6, $t2

  li    $t7, 0
dg_bit_loop:
  li    $t8, 0x80
  srlv  $t8, $t8, $t7
  and   $t9, $t5, $t8
  beqz  $t9, dg_bg
  nop
  sw    $s4, 0($t6)
  j     dg_next
  nop
dg_bg:
  sw    $t1, 0($t6)
dg_next:
  addiu $t6, $t6, 4
  addiu $t7, $t7, 1
  blt   $t7, 8, dg_bit_loop
  nop

  addiu $t3, $t3, 1
  blt   $t3, 8, dg_row_loop
  nop

  lw    $s4, 4($sp)
  lw    $s3, 8($sp)
  lw    $s2, 12($sp)
  lw    $s1, 16($sp)
  lw    $s0, 20($sp)
  lw    $ra, 24($sp)
  addiu $sp, $sp, 28
  jr    $ra
  nop

# ------------------------------------------------------------
# kernel_main: le teclado por MMIO e faz eco
# ------------------------------------------------------------
kernel_main:
  li   $t0,KBD_CTRL

loop:
  lw   $t1,0($t0)
  andi $t1,$t1,1
  beqz $t1,loop
  nop

  lw   $a0,4($t0)
  andi $a0,$a0,0xFF

  jal  draw_debug_char
  nop

  j loop
  nop
  
draw_debug_char:
  addiu $sp,$sp,-8
  sw    $ra,4($sp)

  li    $a1,0
  li    $a2,0
  jal   draw_char_cell
  nop

  lw    $ra,4($sp)
  addiu $sp,$sp,8
  jr    $ra
  nop