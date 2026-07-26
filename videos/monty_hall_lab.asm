# -----------------------------------------------------------------------------
# Monty Hall Lab — tutorial MIPS para o webMARS 0.4.11
# -----------------------------------------------------------------------------
# Interface:
#   Ferramentas > TTY Device + ANSI Terminal > Connect to MIPS
#
# O programa usa:
#   - teclado/ecrã por MMIO em 0xFFFF0000;
#   - sequências ANSI para cores e limpeza do terminal;
#   - syscall 40 para definir a seed pseudoaleatória;
#   - syscall 42 para gerar inteiros aleatórios num intervalo;
#   - uma ronda interativa;
#   - simulações comparativas de 1 000 ou 10 000 jogos.
#
# Portas internas: 0, 1 e 2.
# Como 0 + 1 + 2 = 3:
#   porta_restante = 3 - porta_a - porta_b
#
# Registos principais durante a simulação:
#   $t0 = porta do prémio
#   $t1 = escolha inicial
#   $t2 = porta aberta por Monty
#   $t3 = porta escolhida ao trocar
#   $s0 = total de jogos
#   $s1 = vitórias ao ficar
#   $s2 = vitórias ao trocar
#   $s3 = contador do ciclo
#   $s7 = base MMIO 0xFFFF0000
# -----------------------------------------------------------------------------

.data

# Controlo ANSI.
ansi_reset_terminal: .byte 27, 99, 0
ansi_clear:          .byte 27, 91, 50, 74, 27, 91, 72, 0
ansi_normal:         .byte 27, 91, 48, 109, 0
ansi_cyan:           .byte 27, 91, 57, 54, 109, 0
ansi_green:          .byte 27, 91, 57, 50, 109, 0
ansi_yellow:         .byte 27, 91, 57, 51, 109, 0
ansi_red:            .byte 27, 91, 57, 49, 109, 0
ansi_white:          .byte 27, 91, 57, 55, 109, 0
newline:             .byte 13, 10, 0

# Cabeçalho e menu. O texto da TTY usa ASCII para funcionar em todos os modos
# de codificação do terminal.
line_top:     .asciiz "+------------------------------------------------------------+\r\n"
line_mid:     .asciiz "+------------------------------------------------------------+\r\n"
title:        .asciiz "|             MONTY HALL - LABORATORIO MIPS                 |\r\n"
subtitle:     .asciiz "|        Probabilidade, simulacao e arquitetura MIPS        |\r\n"

menu_1:       .asciiz "|  [1] Jogar uma ronda                                      |\r\n"
menu_2:       .asciiz "|  [2] Simular 1 000 jogos                                  |\r\n"
menu_3:       .asciiz "|  [3] Simular 10 000 jogos                                 |\r\n"
menu_q:       .asciiz "|  [Q] Sair                                                 |\r\n"
menu_prompt:  .asciiz "Escolha: "
invalid_menu: .asciiz "\r\nOpcao invalida. Use 1, 2, 3 ou Q.\r\n"

# Ronda interativa.
round_intro_1: .asciiz "Ha um premio atras de uma das tres portas.\r\n"
round_intro_2: .asciiz "Escolha primeiro; Monty conhece o premio e revela uma cabra.\r\n\r\n"
doors_closed:  .asciiz "       [ PORTA 1 ]   [ PORTA 2 ]   [ PORTA 3 ]\r\n"
door_prompt:   .asciiz "A sua porta inicial (1, 2 ou 3): "
invalid_door:  .asciiz "\r\nPorta invalida. Prima 1, 2 ou 3: "
chosen_msg:    .asciiz "\r\nEscolheu a porta "
monty_msg:     .asciiz ".\r\nMonty abre a porta "
goat_msg:      .asciiz " e mostra uma CABRA.\r\n"
strategy_msg:  .asciiz "Quer [F]icar ou [T]rocar? "
invalid_strategy: .asciiz "\r\nOpcao invalida. Prima F para ficar ou T para trocar: "
stay_msg:      .asciiz "\r\nDecidiu FICAR com a porta "
switch_msg:    .asciiz "\r\nDecidiu TROCAR para a porta "
prize_msg:     .asciiz ".\r\nO premio estava na porta "
win_msg:       .asciiz ". PARABENS: ganhou o premio!\r\n"
lose_msg:      .asciiz ". Desta vez encontrou uma cabra.\r\n"
logic_stay:    .asciiz "Ficar ganha quando a primeira escolha estava certa: P = 1/3.\r\n"
logic_switch:  .asciiz "Trocar ganha quando a primeira escolha estava errada: P = 2/3.\r\n"

# Simulação e resultados.
simulation_1:  .asciiz "A executar "
simulation_2:  .asciiz " jogos sem animacao...\r\n"
simulation_3:  .asciiz "Cada jogo testa simultaneamente as estrategias ficar e trocar.\r\n\r\n"
results_title: .asciiz "+---------------------- RESULTADOS --------------------------+\r\n"
games_msg:     .asciiz "| Jogos:                 "
stay_count_msg:.asciiz "| Vitorias ao ficar:     "
switch_count_msg:.asciiz "| Vitorias ao trocar:    "
percent_open:  .asciiz "  ("
percent_close: .asciiz ")\r\n"
check_msg:     .asciiz "| Verificacao F + T:     "
check_ok:      .asciiz "  OK\r\n"
check_fail:    .asciiz "  ERRO\r\n"
results_end:   .asciiz "+------------------------------------------------------------+\r\n"
theory_1:      .asciiz "Teoria: ficar = 1/3 (33,33%); trocar = 2/3 (66,67%).\r\n"
theory_2:      .asciiz "A simulacao deve aproximar-se destes valores quando N cresce.\r\n"

pause_msg:     .asciiz "\r\nPrima qualquer tecla para voltar ao menu..."
bye_msg:       .asciiz "\r\nObrigado por experimentar Monty Hall no webMARS!\r\n"
percent_sign:  .asciiz "%"

.text
.globl main

# -----------------------------------------------------------------------------
# main
# -----------------------------------------------------------------------------
main:
  # Base do dispositivo Keyboard/Display MMIO.
  lui   $s7, 0xffff

  # Stream pseudoaleatória 7 com seed fixa para resultados reproduzíveis.
  li    $v0, 40
  li    $a0, 7
  li    $a1, 20260725
  syscall

main_menu:
  jal   draw_menu
  nop

  jal   tty_read_key
  nop
  move  $t0, $v0

  # Eco visual da tecla escolhida.
  move  $a0, $t0
  jal   tty_putc
  nop
  la    $a0, newline
  jal   tty_puts
  nop

  li    $t1, 49                    # '1'
  beq   $t0, $t1, menu_play
  nop
  li    $t1, 50                    # '2'
  beq   $t0, $t1, menu_sim_1000
  nop
  li    $t1, 51                    # '3'
  beq   $t0, $t1, menu_sim_10000
  nop
  li    $t1, 81                    # 'Q'
  beq   $t0, $t1, menu_exit
  nop
  li    $t1, 113                   # 'q'
  beq   $t0, $t1, menu_exit
  nop

  la    $a0, ansi_red
  jal   tty_puts
  nop
  la    $a0, invalid_menu
  jal   tty_puts
  nop
  la    $a0, ansi_normal
  jal   tty_puts
  nop
  jal   wait_for_key
  nop
  b     main_menu
  nop

menu_play:
  jal   play_interactive_round
  nop
  b     main_menu
  nop

menu_sim_1000:
  li    $a0, 1000
  jal   run_simulation
  nop
  b     main_menu
  nop

menu_sim_10000:
  li    $a0, 10000
  jal   run_simulation
  nop
  b     main_menu
  nop

menu_exit:
  la    $a0, ansi_cyan
  jal   tty_puts
  nop
  la    $a0, bye_msg
  jal   tty_puts
  nop
  la    $a0, ansi_normal
  jal   tty_puts
  nop

  li    $v0, 10
  syscall

# -----------------------------------------------------------------------------
# draw_menu
# -----------------------------------------------------------------------------
draw_menu:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)

  jal   tty_clear
  nop

  la    $a0, ansi_cyan
  jal   tty_puts
  nop
  la    $a0, line_top
  jal   tty_puts
  nop
  la    $a0, title
  jal   tty_puts
  nop
  la    $a0, subtitle
  jal   tty_puts
  nop
  la    $a0, line_mid
  jal   tty_puts
  nop

  la    $a0, ansi_white
  jal   tty_puts
  nop
  la    $a0, menu_1
  jal   tty_puts
  nop
  la    $a0, menu_2
  jal   tty_puts
  nop
  la    $a0, menu_3
  jal   tty_puts
  nop
  la    $a0, menu_q
  jal   tty_puts
  nop

  la    $a0, ansi_cyan
  jal   tty_puts
  nop
  la    $a0, line_mid
  jal   tty_puts
  nop
  la    $a0, ansi_normal
  jal   tty_puts
  nop
  la    $a0, menu_prompt
  jal   tty_puts
  nop

  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# -----------------------------------------------------------------------------
# play_interactive_round
# Preserva os registos $s usados temporariamente nesta ronda.
# -----------------------------------------------------------------------------
play_interactive_round:
  addiu $sp, $sp, -24
  sw    $s0, 0($sp)                # porta após trocar
  sw    $s1, 4($sp)                # porta final
  sw    $s4, 8($sp)                # prémio
  sw    $s5, 12($sp)               # escolha inicial
  sw    $s6, 16($sp)               # porta aberta por Monty
  sw    $ra, 20($sp)

  jal   tty_clear
  nop

  la    $a0, ansi_cyan
  jal   tty_puts
  nop
  la    $a0, line_top
  jal   tty_puts
  nop
  la    $a0, title
  jal   tty_puts
  nop
  la    $a0, line_mid
  jal   tty_puts
  nop
  la    $a0, ansi_normal
  jal   tty_puts
  nop

  la    $a0, round_intro_1
  jal   tty_puts
  nop
  la    $a0, round_intro_2
  jal   tty_puts
  nop
  la    $a0, doors_closed
  jal   tty_puts
  nop

  # Sortear a porta do prémio.
  jal   rand3
  nop
  move  $s4, $v0

read_door:
  la    $a0, door_prompt
  jal   tty_puts
  nop
  jal   tty_read_key
  nop
  move  $t0, $v0

  # Aceitar apenas os códigos ASCII '1', '2' e '3'.
  slti  $t1, $t0, 49
  bne   $t1, $zero, bad_door
  nop
  slti  $t1, $t0, 52
  beq   $t1, $zero, bad_door
  nop

  move  $a0, $t0
  jal   tty_putc
  nop
  addiu $s5, $t0, -49
  b     door_ready
  nop

bad_door:
  la    $a0, ansi_red
  jal   tty_puts
  nop
  la    $a0, invalid_door
  jal   tty_puts
  nop
  la    $a0, ansi_normal
  jal   tty_puts
  nop
  b     read_door_without_prompt
  nop

read_door_without_prompt:
  jal   tty_read_key
  nop
  move  $t0, $v0
  slti  $t1, $t0, 49
  bne   $t1, $zero, bad_door
  nop
  slti  $t1, $t0, 52
  beq   $t1, $zero, bad_door
  nop
  move  $a0, $t0
  jal   tty_putc
  nop
  addiu $s5, $t0, -49

door_ready:
  # Monty escolhe uma porta que não é a escolha nem o prémio.
  move  $a0, $s4
  move  $a1, $s5
  jal   choose_host_door
  nop
  move  $s6, $v0

  # Porta final se o concorrente trocar.
  move  $a0, $s5
  move  $a1, $s6
  jal   choose_switch_door
  nop
  move  $s0, $v0

  la    $a0, chosen_msg
  jal   tty_puts
  nop
  move  $a0, $s5
  jal   print_door_number
  nop

  la    $a0, ansi_yellow
  jal   tty_puts
  nop
  la    $a0, monty_msg
  jal   tty_puts
  nop
  move  $a0, $s6
  jal   print_door_number
  nop
  la    $a0, goat_msg
  jal   tty_puts
  nop
  la    $a0, ansi_normal
  jal   tty_puts
  nop

read_strategy:
  la    $a0, strategy_msg
  jal   tty_puts
  nop
  jal   tty_read_key
  nop
  move  $t0, $v0

  li    $t1, 70                    # 'F'
  beq   $t0, $t1, strategy_stay
  nop
  li    $t1, 102                   # 'f'
  beq   $t0, $t1, strategy_stay
  nop
  li    $t1, 84                    # 'T'
  beq   $t0, $t1, strategy_switch
  nop
  li    $t1, 116                   # 't'
  beq   $t0, $t1, strategy_switch
  nop

  la    $a0, ansi_red
  jal   tty_puts
  nop
  la    $a0, invalid_strategy
  jal   tty_puts
  nop
  la    $a0, ansi_normal
  jal   tty_puts
  nop
  b     read_strategy_without_prompt
  nop

read_strategy_without_prompt:
  jal   tty_read_key
  nop
  move  $t0, $v0
  li    $t1, 70
  beq   $t0, $t1, strategy_stay
  nop
  li    $t1, 102
  beq   $t0, $t1, strategy_stay
  nop
  li    $t1, 84
  beq   $t0, $t1, strategy_switch
  nop
  li    $t1, 116
  beq   $t0, $t1, strategy_switch
  nop
  b     read_strategy_without_prompt
  nop

strategy_stay:
  move  $a0, $t0
  jal   tty_putc
  nop
  move  $s1, $s5
  la    $a0, stay_msg
  jal   tty_puts
  nop
  move  $a0, $s1
  jal   print_door_number
  nop
  b     show_round_result
  nop

strategy_switch:
  move  $a0, $t0
  jal   tty_putc
  nop
  move  $s1, $s0
  la    $a0, switch_msg
  jal   tty_puts
  nop
  move  $a0, $s1
  jal   print_door_number
  nop

show_round_result:
  la    $a0, prize_msg
  jal   tty_puts
  nop
  move  $a0, $s4
  jal   print_door_number
  nop

  bne   $s1, $s4, round_lost
  nop

  la    $a0, ansi_green
  jal   tty_puts
  nop
  la    $a0, win_msg
  jal   tty_puts
  nop
  b     show_round_logic
  nop

round_lost:
  la    $a0, ansi_red
  jal   tty_puts
  nop
  la    $a0, lose_msg
  jal   tty_puts
  nop

show_round_logic:
  la    $a0, ansi_normal
  jal   tty_puts
  nop
  la    $a0, logic_stay
  jal   tty_puts
  nop
  la    $a0, logic_switch
  jal   tty_puts
  nop

  jal   wait_for_key
  nop

  lw    $s0, 0($sp)
  lw    $s1, 4($sp)
  lw    $s4, 8($sp)
  lw    $s5, 12($sp)
  lw    $s6, 16($sp)
  lw    $ra, 20($sp)
  addiu $sp, $sp, 24
  jr    $ra
  nop

# -----------------------------------------------------------------------------
# run_simulation
# Entrada: $a0 = número total de jogos.
# -----------------------------------------------------------------------------
run_simulation:
  addiu $sp, $sp, -20
  sw    $s0, 0($sp)
  sw    $s1, 4($sp)
  sw    $s2, 8($sp)
  sw    $s3, 12($sp)
  sw    $ra, 16($sp)

  move  $s0, $a0                  # total
  move  $s1, $zero                # vitórias ao ficar
  move  $s2, $zero                # vitórias ao trocar
  move  $s3, $zero                # contador

  jal   tty_clear
  nop
  la    $a0, ansi_cyan
  jal   tty_puts
  nop
  la    $a0, results_title
  jal   tty_puts
  nop
  la    $a0, ansi_normal
  jal   tty_puts
  nop
  la    $a0, simulation_1
  jal   tty_puts
  nop
  move  $a0, $s0
  jal   tty_putint
  nop
  la    $a0, simulation_2
  jal   tty_puts
  nop
  la    $a0, simulation_3
  jal   tty_puts
  nop

simulation_loop:
  # Para a estatística, o resultado depende apenas de a escolha inicial
  # estar certa. Sorteamos uniformemente um dos nove pares possíveis:
  #
  #   valor / 3 = porta do prémio
  #   valor % 3 = escolha inicial
  #
  # Há três pares iguais (ficar ganha) e seis diferentes (trocar ganha).
  # Uma só syscall por jogo reduz fortemente tempo e pressão de memória.
  li    $v0, 42
  li    $a0, 7
  li    $a1, 9
  syscall

  li    $t0, 3
  divu  $a0, $t0
  mflo  $t1                       # porta do prémio
  mfhi  $t2                       # escolha inicial

  bne   $t1, $t2, simulation_switch_win
  nop
  addiu $s1, $s1, 1
  b     simulation_next
  nop

simulation_switch_win:
  addiu $s2, $s2, 1

simulation_next:
  addiu $s3, $s3, 1
  bne   $s3, $s0, simulation_loop
  nop

  jal   print_results
  nop
  jal   wait_for_key
  nop

  lw    $s0, 0($sp)
  lw    $s1, 4($sp)
  lw    $s2, 8($sp)
  lw    $s3, 12($sp)
  lw    $ra, 16($sp)
  addiu $sp, $sp, 20
  jr    $ra
  nop

# -----------------------------------------------------------------------------
# choose_host_door
# Entrada:
#   $a0 = porta do prémio
#   $a1 = escolha inicial
# Saída:
#   $v0 = porta que Monty abre
# -----------------------------------------------------------------------------
choose_host_door:
  # Se escolha != prémio, a porta de Monty é forçada.
  beq   $a0, $a1, host_has_choice
  nop

  li    $v0, 3
  subu  $v0, $v0, $a0
  subu  $v0, $v0, $a1
  jr    $ra
  nop

host_has_choice:
  # Se escolha == prémio, selecionar aleatoriamente uma das outras duas.
  move  $t4, $a1
  li    $v0, 42
  li    $a0, 7
  li    $a1, 2
  syscall

  # (escolha + 1 + aleatório[0,2)) mod 3
  addu  $v0, $t4, $a0
  addiu $v0, $v0, 1
  slti  $t5, $v0, 3
  bne   $t5, $zero, host_ready
  nop
  addiu $v0, $v0, -3

host_ready:
  jr    $ra
  nop

# -----------------------------------------------------------------------------
# choose_switch_door
# Entrada:
#   $a0 = escolha inicial
#   $a1 = porta aberta por Monty
# Saída:
#   $v0 = única porta fechada restante
# -----------------------------------------------------------------------------
choose_switch_door:
  li    $v0, 3
  subu  $v0, $v0, $a0
  subu  $v0, $v0, $a1
  jr    $ra
  nop

# -----------------------------------------------------------------------------
# rand3
# Saída: $v0 = inteiro pseudoaleatório em [0, 3).
# -----------------------------------------------------------------------------
rand3:
  li    $v0, 42
  li    $a0, 7
  li    $a1, 3
  syscall
  move  $v0, $a0
  jr    $ra
  nop

# -----------------------------------------------------------------------------
# print_results
# Usa os acumuladores:
#   $s0 total, $s1 ficar, $s2 trocar.
# -----------------------------------------------------------------------------
print_results:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)

  la    $a0, ansi_cyan
  jal   tty_puts
  nop
  la    $a0, results_title
  jal   tty_puts
  nop
  la    $a0, ansi_normal
  jal   tty_puts
  nop

  la    $a0, games_msg
  jal   tty_puts
  nop
  move  $a0, $s0
  jal   tty_putint
  nop
  la    $a0, newline
  jal   tty_puts
  nop

  la    $a0, stay_count_msg
  jal   tty_puts
  nop
  move  $a0, $s1
  jal   tty_putint
  nop
  la    $a0, percent_open
  jal   tty_puts
  nop
  move  $a0, $s1
  move  $a1, $s0
  jal   tty_print_percent
  nop
  la    $a0, percent_sign
  jal   tty_puts
  nop
  la    $a0, percent_close
  jal   tty_puts
  nop

  la    $a0, switch_count_msg
  jal   tty_puts
  nop
  move  $a0, $s2
  jal   tty_putint
  nop
  la    $a0, percent_open
  jal   tty_puts
  nop
  move  $a0, $s2
  move  $a1, $s0
  jal   tty_print_percent
  nop
  la    $a0, percent_sign
  jal   tty_puts
  nop
  la    $a0, percent_close
  jal   tty_puts
  nop

  la    $a0, check_msg
  jal   tty_puts
  nop
  addu  $t0, $s1, $s2
  move  $a0, $t0
  jal   tty_putint
  nop

  addu  $t0, $s1, $s2
  bne   $t0, $s0, result_check_failed
  nop
  la    $a0, ansi_green
  jal   tty_puts
  nop
  la    $a0, check_ok
  jal   tty_puts
  nop
  b     result_check_done
  nop

result_check_failed:
  la    $a0, ansi_red
  jal   tty_puts
  nop
  la    $a0, check_fail
  jal   tty_puts
  nop

result_check_done:
  la    $a0, ansi_cyan
  jal   tty_puts
  nop
  la    $a0, results_end
  jal   tty_puts
  nop
  la    $a0, ansi_normal
  jal   tty_puts
  nop
  la    $a0, theory_1
  jal   tty_puts
  nop
  la    $a0, theory_2
  jal   tty_puts
  nop

  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# -----------------------------------------------------------------------------
# print_door_number
# Entrada: $a0 = porta interna 0, 1 ou 2.
# -----------------------------------------------------------------------------
print_door_number:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  addiu $a0, $a0, 1
  jal   tty_putint
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# -----------------------------------------------------------------------------
# tty_print_percent
# Entrada:
#   $a0 = vitórias
#   $a1 = total
# Saída TTY:
#   percentagem com duas casas decimais, sem o símbolo '%'.
# Exemplo: 3333 centésimos -> "33.33"
# -----------------------------------------------------------------------------
tty_print_percent:
  addiu $sp, $sp, -12
  sw    $s0, 0($sp)
  sw    $s1, 4($sp)
  sw    $ra, 8($sp)

  move  $s0, $a0
  move  $s1, $a1

  beq   $s1, $zero, percent_zero
  nop

  # percentagem_em_centésimos = vitórias * 10000 / total
  li    $t0, 10000
  multu $s0, $t0
  mflo  $t1
  divu  $t1, $s1
  mflo  $s0

  # Separar parte inteira e duas casas decimais.
  li    $t0, 100
  divu  $s0, $t0
  mflo  $a0
  mfhi  $s1
  jal   tty_putint
  nop

  li    $a0, 46                    # '.'
  jal   tty_putc
  nop

  slti  $t0, $s1, 10
  beq   $t0, $zero, percent_two_digits
  nop
  li    $a0, 48                    # zero à esquerda
  jal   tty_putc
  nop

percent_two_digits:
  move  $a0, $s1
  jal   tty_putint
  nop
  b     percent_done
  nop

percent_zero:
  li    $a0, 48
  jal   tty_putc
  nop
  li    $a0, 46
  jal   tty_putc
  nop
  li    $a0, 48
  jal   tty_putc
  nop
  li    $a0, 48
  jal   tty_putc
  nop

percent_done:
  lw    $s0, 0($sp)
  lw    $s1, 4($sp)
  lw    $ra, 8($sp)
  addiu $sp, $sp, 12
  jr    $ra
  nop

# -----------------------------------------------------------------------------
# tty_clear
# -----------------------------------------------------------------------------
tty_clear:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a0, ansi_reset_terminal
  jal   tty_puts
  nop
  la    $a0, ansi_clear
  jal   tty_puts
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# -----------------------------------------------------------------------------
# wait_for_key
# -----------------------------------------------------------------------------
wait_for_key:
  addiu $sp, $sp, -4
  sw    $ra, 0($sp)
  la    $a0, ansi_yellow
  jal   tty_puts
  nop
  la    $a0, pause_msg
  jal   tty_puts
  nop
  la    $a0, ansi_normal
  jal   tty_puts
  nop
  jal   tty_read_key
  nop
  lw    $ra, 0($sp)
  addiu $sp, $sp, 4
  jr    $ra
  nop

# -----------------------------------------------------------------------------
# tty_read_key
# Espera por uma tecla não vazia. Ignora CR e LF deixados por Enter.
# Saída: $v0 = byte lido.
# -----------------------------------------------------------------------------
tty_read_key:
tty_read_wait:
  lbu   $t8, 0($s7)                # receiver control
  andi  $t8, $t8, 1
  bne   $t8, $zero, tty_read_ready
  nop

  # Evitar uma espera ativa que execute milhões de instruções enquanto o
  # utilizador pensa. O Sleep cede o browser durante 16 ms, mantém o terminal
  # responsivo e continua a produzir histórico de backstep normal.
  li    $v0, 32
  li    $a0, 16
  syscall
  b     tty_read_wait
  nop

tty_read_ready:
  lbu   $v0, 4($s7)                # receiver data
  li    $t8, 10
  beq   $v0, $t8, tty_read_wait
  nop
  li    $t8, 13
  beq   $v0, $t8, tty_read_wait
  nop
  jr    $ra
  nop

# -----------------------------------------------------------------------------
# tty_puts
# Entrada: $a0 = endereço de string terminada por zero.
# -----------------------------------------------------------------------------
tty_puts:
  addiu $sp, $sp, -8
  sw    $s6, 0($sp)
  sw    $ra, 4($sp)
  move  $s6, $a0

tty_puts_loop:
  lbu   $a0, 0($s6)
  beq   $a0, $zero, tty_puts_done
  nop
  jal   tty_putc
  nop
  addiu $s6, $s6, 1
  b     tty_puts_loop
  nop

tty_puts_done:
  lw    $s6, 0($sp)
  lw    $ra, 4($sp)
  addiu $sp, $sp, 8
  jr    $ra
  nop

# -----------------------------------------------------------------------------
# tty_putc
# Entrada: $a0 = byte a transmitir.
# -----------------------------------------------------------------------------
tty_putc:
tty_write_wait:
  lbu   $t8, 8($s7)                # transmitter control
  andi  $t8, $t8, 1
  beq   $t8, $zero, tty_write_wait
  nop
  sb    $a0, 12($s7)               # transmitter data
  jr    $ra
  nop

# -----------------------------------------------------------------------------
# tty_putint
# Entrada: $a0 = inteiro assinado.
# -----------------------------------------------------------------------------
tty_putint:
  addiu $sp, $sp, -28
  sw    $s0, 12($sp)
  sw    $s1, 16($sp)
  sw    $s2, 20($sp)
  sw    $ra, 24($sp)

  move  $s0, $a0
  move  $s1, $sp                   # início do buffer de dígitos
  move  $s2, $zero                 # quantidade de dígitos

  bne   $s0, $zero, tty_int_nonzero
  nop
  li    $a0, 48
  jal   tty_putc
  nop
  b     tty_int_done
  nop

tty_int_nonzero:
  bgez  $s0, tty_int_collect
  nop
  li    $a0, 45                    # '-'
  jal   tty_putc
  nop
  subu  $s0, $zero, $s0

tty_int_collect:
  li    $t0, 10
  divu  $s0, $t0
  mflo  $s0
  mfhi  $t1
  addiu $t1, $t1, 48
  sb    $t1, 0($s1)
  addiu $s1, $s1, 1
  addiu $s2, $s2, 1
  bne   $s0, $zero, tty_int_collect
  nop

tty_int_emit:
  addiu $s1, $s1, -1
  lbu   $a0, 0($s1)
  jal   tty_putc
  nop
  addiu $s2, $s2, -1
  bgtz  $s2, tty_int_emit
  nop

tty_int_done:
  lw    $s0, 12($sp)
  lw    $s1, 16($sp)
  lw    $s2, 20($sp)
  lw    $ra, 24($sp)
  addiu $sp, $sp, 28
  jr    $ra
  nop
