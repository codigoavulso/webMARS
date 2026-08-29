# Self-hosting, privacidade e suporte

## Antes de abrir a instância

- [ ] webMARS e BackMars têm URLs e versões registadas.
- [ ] HTTPS, CORS, limites e fallback `/e`/`/p` foram testados.
- [ ] `SECRET_KEY`, pepper e SMTP estão fora do código, em ficheiro `0600`.
- [ ] Diretório da base de dados é privado e existe backup verificado.
- [ ] Registo, verificação, reset, publicação e revisão fixa passaram smoke tests.
- [ ] Política de retenção, logs, suporte e incidente está publicada.
- [ ] Existe contacto institucional para utilizadores.

## Separação de dados

- Local: fontes, preferências, execução e downloads no browser/dispositivo.
- Cloud: conta e projetos enviados explicitamente ao BackMars.
- Biblioteca: snapshot sanitizado publicado explicitamente; leitura anónima.
- SMTP: apenas códigos temporários e avisos; credenciais só no servidor.

## Pedido de suporte seguro

Enviar: hostname, versões, browser/SO, passos, URL público e mensagem de erro.

Nunca enviar: App Password, `SECRET_KEY`, pepper, cookie, código temporário,
base de dados ou ficheiros de alunos numa conversa pública.
