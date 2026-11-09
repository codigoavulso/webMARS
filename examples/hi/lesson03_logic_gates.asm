# 03 - 32 बिट से अधिक लॉजिक गेट
#
# प्रत्येक परिणाम बिट केवल दो ऑपरेंड के संबंधित बिट्स पर निर्भर करता है। बिट स्थितियों के बीच
# कोई अंतर नहीं है।
#
# मास्क `0x0F` के साथ, और निम्न चार बिट रखता है और बाकी को साफ़ करता है। OR निम्न चार बिट्स सेट
# करता है और XOR उन्हें फ़्लिप करता है।
#
# हेक्साडेसिमल में तीन परिणामों की तुलना करें, फिर चार बिट्स के अगले समूह पर काम करने के लिए
# मास्क `0xF0` आज़माएं।

        .data
ma:     .asciiz "AND keeps the low nibble: "
mo:     .asciiz "OR sets the low nibble:   "
mx:     .asciiz "XOR flips the low nibble: "
        .text
        .globl main
main:
        li   $t0, 204           #0xCC
        li   $t1, 15            #0x0F मुखौटा

        la   $a0, ma
        li   $v0, 4
        syscall
        #AND हर उस स्थिति को साफ़ करता है जहां मास्क में शून्य होता है।
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
        #XOR केवल मास्क में लोगों द्वारा चुनी गई स्थिति को टॉगल करता है।
        xor  $t4, $t0, $t1
        move $a0, $t4
        li   $v0, 1
        syscall
        li   $v0, 11
        li   $a0, 10
        syscall
        li   $v0, 10
        syscall
