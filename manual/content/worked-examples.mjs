// The Manual displays these exact sources; root regression tests execute them.
export const WORKED_EXAMPLES = Object.freeze({
  arrayAssembly: {
    language: "assembly", sourceName: "soma.s", expectedOutput: "12\n",
    memory: [[0x10010010, 12]],
    source: `.data
numeros: .word 3, -2, 7, 4
soma:    .word 0

.text
.globl main
main:
    la    $t0, numeros       # endereço do elemento atual
    li    $t1, 4             # elementos que faltam
    li    $t2, 0             # acumulador
ciclo:
    beq   $t1, $zero, fim
    nop
    lw    $t3, 0($t0)
    addu  $t2, $t2, $t3
    addiu $t0, $t0, 4       # uma word ocupa quatro bytes
    addiu $t1, $t1, -1
    j     ciclo
    nop
fim:
    sw    $t2, soma
    move  $a0, $t2
    li    $v0, 1
    syscall
    li    $a0, 10
    li    $v0, 11
    syscall
    li    $v0, 10
    syscall`
  },
  nestedCalls: {
    language: "assembly", sourceName: "funcoes.s", expectedOutput: "13\n",
    registers: [[16, 99]], preservesStack: true,
    source: `.text
.globl main
main:
    addiu $sp, $sp, -4      # alinhar a stack inicial MARS a 8 bytes
    li    $s0, 99           # a função tem de preservar este valor
    li    $a0, 6
    jal   dobro_mais_um
    nop
    addiu $sp, $sp, 4
    move  $a0, $v0
    li    $v0, 1
    syscall
    li    $a0, 10
    li    $v0, 11
    syscall
    li    $v0, 10
    syscall

dobro_mais_um:
    addiu $sp, $sp, -8
    sw    $s0, 0($sp)
    sw    $ra, 4($sp)       # jal vai substituir este retorno
    move  $s0, $a0
    move  $a0, $s0
    jal   dobro
    nop
    addiu $v0, $v0, 1
    lw    $s0, 0($sp)
    lw    $ra, 4($sp)
    addiu $sp, $sp, 8
    jr    $ra
    nop

dobro:
    sll   $v0, $a0, 1
    jr    $ra
    nop`
  },
  arrayMiniC: {
    language: "minic", subset: "C0-S2", sourceName: "soma.c", expectedOutput: "12\n",
    source: `int somar(int valores[], int n) {
    int total = 0;
    for (int i = 0; i < n; i++) {
        total += valores[i];
    }
    return total;
}

int main(void) {
    int valores[4] = {3, -2, 7, 4};
    print_int(somar(valores, 4));
    print_char(10);
    return 0;
}`
  },
  recursiveMiniC: {
    language: "minic", subset: "C0-S0", sourceName: "fatorial.c", expectedOutput: "720\n",
    source: `int fatorial(int n) {
    if (n <= 1) return 1;
    return n * fatorial(n - 1);
}

int main(void) {
    print_int(fatorial(6));
    print_char(10);
    return 0;
}`
  },
  bitmapAssembly: {
    language: "assembly", sourceName: "quatro-cores.s", expectedOutput: "",
    memory: [[0x10010000, 0x00ff0000], [0x10010004, 0x0000ff00],
      [0x10010008, 0x000000ff], [0x1001000c, 0x00ffffff]],
    source: `.data
.align 2
tela: .space 64              # 4 × 4 células de quatro bytes

.text
.globl main
main:
    la  $t0, tela
    li  $t1, 0x00ff0000      # vermelho
    sw  $t1, 0($t0)
    li  $t1, 0x0000ff00      # verde
    sw  $t1, 4($t0)
    li  $t1, 0x000000ff      # azul
    sw  $t1, 8($t0)
    li  $t1, 0x00ffffff      # branco
    sw  $t1, 12($t0)
    li  $v0, 10
    syscall`
  },
  multiFileMiniC: {
    language: "minic", subset: "C0-S2", sourceName: "src/main.c", expectedOutput: "soma=42\nmaximo=13\n",
    source: `#include "stats.h"
#use "stats.c"

int main(void) {
    int valores[6] = {3, 5, 8, 2, 11, 13};
    print_string("soma=");
    print_int(array_sum(valores, 6));
    print_char(10);
    print_string("maximo=");
    print_int(array_max(valores, 6));
    print_char(10);
    return 0;
}`,
    files: {
      "src/stats.h": `int array_sum(int valores[], int n);
int array_max(int valores[], int n);`,
      "src/stats.c": `#include "stats.h"

int array_sum(int valores[], int n) {
    int total = 0;
    for (int i = 0; i < n; i++) total += valores[i];
    return total;
}

int array_max(int valores[], int n) {
    int maior = valores[0];
    for (int i = 1; i < n; i++) {
        if (valores[i] > maior) maior = valores[i];
    }
    return maior;
}`
    }
  }
});
