# 03 - 32 বিটের উপর লজিক গেটস
#
# প্রতিটি ফলাফল বিট শুধুমাত্র দুটি অপারেন্ডের সংশ্লিষ্ট বিটের উপর নির্ভর করে। বিট অবস্থানের
# মধ্যে কোন বহন নেই।
#
# মাস্ক `0x0F` সহ, এবং নিম্ন চারটি বিট রাখে এবং বাকিগুলি পরিষ্কার করে। OR কম চারটি বিট সেট করে
# এবং XOR সেগুলিকে ফ্লিপ করে।
#
# হেক্সাডেসিমেলে তিনটি ফলাফলের তুলনা করুন, তারপর চারটি বিটের পরবর্তী গ্রুপে কাজ করার জন্য মাস্ক
# `0xF0` চেষ্টা করুন।

        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #0x0F মুখোশ

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND মাস্কে শূন্য থাকে এমন প্রতিটি অবস্থান পরিষ্কার করে।
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
        #XOR শুধুমাত্র মুখোশের দ্বারা নির্বাচিত অবস্থানগুলিকে টগল করে৷
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
