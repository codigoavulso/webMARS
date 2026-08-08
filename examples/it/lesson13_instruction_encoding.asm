# ==========================================================
#Lezione 13 - Un'istruzione è un numero
#
#THE PROBLEM
#Il processore recupera le parole dalla memoria. Il codice vive
#anche la memoria. Quindi cosa distingue un'istruzione da a
#pezzo di dati?
#
#WHAT THE HARDWARE DOES
#Niente, oltre il quale registro viene caricata la parola. Il
#Il PC seleziona le parole che vanno al decoder; lw seleziona le parole
#che vanno al file di registro. I bit sono dello stesso tipo.
#
#THE SOLUTION
#Leggi direttamente la codifica. Assemblare e aprire
#Principale > Esegui: la colonna Codice mostra ciascuna istruzione come
#la parola a 32 bit che è realmente.
#
#WATCH FOR
#Questa lezione non stampa nulla di proposito: l'output è the
#Segmento di testo stesso. Confronta le due aggiunte: stesso codice operativo e
#campi funzione, numeri di registro diversi. Quindi trova il
#letterale 100 all'interno della parola addi.
# ==========================================================
        .text
        .globl main
main:
        #Ispeziona la colonna Codice dopo l'assemblaggio: questi mnemonici non vengono memorizzati come testo.
        add  $t0, $t1, $t2      #Tipo R: codice operativo, rs, rt, rd, funz
        add  $t3, $t4, $t5      #stessa forma, registri diversi
        addi $t0, $t1, 100      #Tipo I: la costante è nella parola
        sll  $t0, $t1, 4        #l'importo del turno ha un proprio campo
        j    tail               #Tipo J: un indirizzo, non un registro
tail:
        #li è esso stesso espanso prima dell'esecuzione; il processore vede solo parole codificate.
        li   $v0, 10
        syscall
