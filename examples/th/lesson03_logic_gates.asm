# 03 - ลอจิกเกตมากกว่า 32 บิต
#
# แต่ละบิตผลลัพธ์ขึ้นอยู่กับบิตที่สอดคล้องกันของตัวถูกดำเนินการทั้งสองเท่านั้น
# ไม่มีการพกพาระหว่างตำแหน่งบิต
#
# ด้วยมาสก์ `0x0F` และ เก็บสี่บิตต่ำไว้และล้างส่วนที่เหลือ หรือตั้งค่าสี่บิตต่ำแล้ว XOR
# จะพลิกมัน
#
# เปรียบเทียบผลลัพธ์ทั้งสามในรูปแบบเลขฐานสิบหก จากนั้นลองใช้มาสก์ `0xF0`
# เพื่อทำงานกับกลุ่มสี่บิตถัดไป

        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #0x0F หน้ากาก

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND ล้างทุกตำแหน่งที่มาสก์มีค่าศูนย์
        and  $t2, $t0, $t1
        move $a0, $t2
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mo
        li   $v0, 4
        syscall
        or   $t3, $t0, $t1
        move $a0, $t3
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        la   $a0, mx
        li   $v0, 4
        syscall
        #XOR สลับเฉพาะตำแหน่งที่เลือกโดยตำแหน่งในมาสก์
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
