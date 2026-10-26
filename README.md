# Rastro

**Ações reais, assinadas por quem fez, confirmadas por quem estava lá.**

Rastro é um app para registrar ações regenerativas no mundo real — começando por mutirões de limpeza —
e para que as pessoas presentes confirmem essas ações com a própria assinatura. Funciona sem internet,
não tem cadastro nem carteira, e não depende de nenhum servidor central: é construído sobre
[Nostr](https://nostr.com), então nenhuma empresa ou governo consegue apagar o que foi registrado.

Segue os princípios da Aletheia: a verdade não é decidida por votação nem por autoridade —
ela emerge de registros assinados e de testemunhos públicos.

## Como funciona

1. **Identidade em 10 segundos.** Abra o app, digite um nome. Uma chave é criada no aparelho.
2. **Registre a ação.** Fotos de antes e depois, local, números (kg, sacos, área…). Sem sinal? Fica guardada e sai sozinha depois.
3. **Mostre o QR de presença.** Quem estava lá escaneia e toca em "Eu estive aqui". Cada testemunho é assinado pela chave de quem confirmou.
4. **O status aparece sozinho.** *Observado* → *Confirmado* (2 testemunhas) → *Consolidado* (5 testemunhas). Ninguém aprova nada.
5. **Compartilhe ou exporte.** Link público verificável e exportação no formato da [DeCleanup Network](https://decleanup.net).

Privacidade por padrão: localização pública aproximada (~5 km), metadados das fotos removidos.

## Rodando localmente

```bash
npm install
npm run dev        # http://localhost:5173/rastro/
npm test           # testes do modelo de dados e regras de status
npm run build      # gera dist/ (PWA)
```

## Publicação

Cada push na `main` publica o app no GitHub Pages (`.github/workflows/deploy.yml`).
Na primeira vez: **Settings → Pages → Source: GitHub Actions**.

## Infraestrutura

Por padrão o app usa relays Nostr públicos e servidores de fotos [Blossom](https://github.com/hzrd149/blossom) públicos.
Em **Você → Servidores** dá para apontar para o nó da sua comunidade. Um pacote de nó com um comando
(relay + Blossom + Tor) está no plano (etapa C da especificação).

## Estrutura

```
src/
├── model/     # Ação, Testemunho, regras de status (com testes)
├── nostr/     # chaves, relays, armazenamento local, fila offline
├── media/     # compressão de fotos e envio Blossom
├── geo/       # geohash
├── export/    # exportação DeCleanup
├── screens/   # telas
└── ui/        # componentes
docs/V1_SPEC.md  # especificação da v1
```

## Estado

Demo (etapa A da [especificação](docs/V1_SPEC.md)). Os números de `kind` dos eventos são provisórios.
