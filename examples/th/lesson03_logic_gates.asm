# ==========================================================
#บทที่ 03 - ลอจิกเกตข้าม 32 บิต
#
#THE PROBLEM
#AND, OR และ XOR เป็นเกตหนึ่งบิต รีจิสเตอร์เก็บได้ 32 บิต
#ประตูหมายถึงอะไรที่ความกว้างนั้น?
#
#WHAT THE HARDWARE DOES
#โดยวางสำเนาของประตูไว้ 32 ชุดเคียงข้างกัน บิต 0 ของ
#ผลลัพธ์ขึ้นอยู่กับบิต 0 ของแต่ละตัวถูกดำเนินการ บิต 1 เปิดเท่านั้น
#บิต 1 เป็นต้น ไม่มีการเดินทางระหว่างพวกเขา
#
#THE SOLUTION
#ความเป็นอิสระนั้นคือสิ่งที่ทำให้หน้ากากใช้งานได้: เลือกอันไหน
#บิตที่จะเก็บไว้ด้วย AND บังคับเป็นหนึ่งด้วย OR พลิกด้วย XOR
#
#WATCH FOR
#0xCC คือ 11001100 และมาสก์ 0x0F คือ 00001111 AND เก็บ
#สี่บิตต่ำ หรือตั้งค่า XOR จะพลิกมัน เท่านั้น
#แทะต่ำที่เคยเปลี่ยนแปลง
# ==========================================================
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
