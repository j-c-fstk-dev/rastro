# Rastro v1 — Especificação e estrutura

> **Rastro** é uma rede onde ações regenerativas reais são registradas por quem fez,
> confirmadas por quem estava lá, e que nenhuma empresa ou governo consegue apagar.
>
> Construído sobre Nostr, seguindo os princípios da Aletheia:
> verdade sem votação, sem autoridade central e sem ordem global.

Status: **rascunho para revisão** · Versão 0.1 · Out/2026

---

## 1. Objetivo da v1

Demonstrar, com um grupo real (primeiro caso: **mutirões da DeCleanup Network**), que é possível:

1. registrar uma ação no campo, **mesmo sem internet**, com fotos e números;
2. ter essa ação **confirmada por quem estava presente**, sem admin nem verificador central;
3. gerar um **relatório de impacto** e uma **página pública** que qualquer pessoa pode conferir;
4. tudo isso **sem cadastro, sem carteira cripto, sem token e sem custo de infraestrutura**.

Métrica de sucesso: o grupo usa em pelo menos 3 ações reais e diz que o relatório
"valeu a pena" (e quanto pagaria por ele).

## 2. Escopo

| Entra na v1 | Fica para depois |
|---|---|
| Identidade por chave no aparelho, backup por QR/senha | Sincronização celular↔celular sem internet (Bluetooth/Wi-Fi) |
| Registrar ação com fotos, local, números e participantes | Tor e espelhamento automático entre nós |
| Fila offline: registra sem rede, envia quando conectar | Rede de confiança completa (web of trust) |
| Confirmação de presença por QR | QR de rastreabilidade de produto (apiário) — v1.1 |
| Status: observado → confirmado → consolidado | IA assistente (sempre opcional, nunca juiz) |
| Feed, mapa e página pública da ação | App nativo nas lojas |
| Relatório de impacto (página para imprimir/PDF) | Qualquer token, NFT ou pagamento dentro do app |
| Exportação no formato da DeCleanup | Ponte automática com contratos da DeCleanup |
| Pacote de nó com 1 comando (opcional na v1) | Moderação compartilhada entre nós |

## 3. Pessoas e papéis

Não existem papéis com poder sobre os outros. Existem só funções práticas:

- **Quem registra**: cria a ação (normalmente quem organizou o mutirão).
- **Testemunha**: confirma que esteve lá ou que viu o resultado.
- **Coletivo**: um grupo (ex.: "DeCleanup Floripa") com uma lista pública de membros.
  Quem cria o coletivo mantém a lista, mas **não aprova nem apaga ações** de ninguém.
- **Quem lê**: qualquer pessoa com o link — patrocinador, prefeitura, público.

## 4. Fluxos principais

### 4.1 Primeiro uso (≤ 30 segundos)
1. Abre o link → "Adicionar à tela inicial".
2. App gera a chave automaticamente. Pede só um **nome** (e foto opcional).
3. Sugere fazer backup: **QR impresso** ou **chave protegida por senha** (NIP-49).
   Pode pular e fazer depois — o app lembra.

### 4.2 Registrar um mutirão
1. "Nova ação" → escolhe o tipo (**Limpeza** na v1; tipos novos depois).
2. Foto **antes** e foto **depois** (comprimidas no aparelho).
3. Local: GPS automático, com precisão reduzida por padrão (ver §9).
4. Números: peso (kg), sacos, área (m²), duração, tipos de resíduo, recicláveis.
5. Descrição curta (opcional) e coletivo (opcional).
6. "Publicar" → a ação é assinada **na hora** e vai para a fila.
   Sem internet, fica marcada "aguardando envio" e sai sozinha quando conectar.

### 4.3 Confirmar presença (o coração da v1)
1. Ao final, quem registrou toca **"Mostrar QR de presença"**.
2. Os participantes escaneiam com o próprio Rastro → toque em "Eu estive aqui".
3. Cada celular publica um **testemunho presencial** assinado pela própria chave.
4. Funciona offline: o QR traz o identificador da ação; os testemunhos entram na fila.

Quem não estava presente mas viu o resultado pode deixar um **testemunho remoto**
(peso menor, ver §6).

### 4.4 Ver, compartilhar e prestar contas
- **Feed** e **mapa** de ações do coletivo / de quem você segue.
- **Página pública** de cada ação (link + QR), com fotos, números, testemunhas e o status.
- **Relatório**: escolhe coletivo + período → página pronta para imprimir/salvar em PDF,
  com totais, mapa, galeria e lista de ações com links de verificação.

## 5. Modelo de dados (eventos Nostr)

Tudo é um evento Nostr assinado (NIP-01). Números de `kind` marcados com ✱ são
**provisórios** e precisam ser checados contra o registro de NIPs antes do lançamento.

| O quê | kind | Tipo | Observações |
|---|---|---|---|
| Perfil | `0` | padrão | NIP-01 |
| **Ação** | `✱ 3910` | regular (imutável) | o registro em si |
| **Testemunho** | `✱ 3911` | regular | aponta para a ação |
| **Coletivo** | `✱ 33910` | endereçável (`d` tag) | nome, descrição, lista de membros |
| Comentário | `1111` | padrão | NIP-22 |
| Pedido de remoção | `5` | padrão | NIP-09 (relays honestos removem; não há garantia) |
| Fotos | Blossom | arquivo por hash | BUD-01/02; referência via `imeta` (NIP-92) |

### 5.1 Ação (exemplo)

```json
{
  "kind": 3910,
  "content": "Mutirão na praia do Campeche com a turma da escola.",
  "tags": [
    ["t", "cleanup"],
    ["alt", "Rastro: ação de limpeza com 12.5 kg removidos"],
    ["a", "33910:<pubkey-do-coletivo>:decleanup-floripa"],
    ["g", "6gkzm"],
    ["location", "Campeche, Florianópolis"],
    ["m", "weight_kg", "12.5"],
    ["m", "bags", "8"],
    ["m", "area_sqm", "200"],
    ["m", "duration_min", "120"],
    ["m", "participants", "6"],
    ["m", "recyclables_kg", "3.2"],
    ["waste", "plastic"], ["waste", "glass"],
    ["imeta", "url https://blossom.exemplo/<sha256>.jpg", "x <sha256>", "m image/jpeg", "role before"],
    ["imeta", "url https://blossom.exemplo/<sha256>.jpg", "x <sha256>", "m image/jpeg", "role after"],
    ["client", "rastro", "0.1"]
  ]
}
```

- `g` = geohash com **5 caracteres (~5 km)** por padrão; 7 (~150 m) só se a pessoa escolher.
- `m` = métricas numéricas, extensíveis para outros tipos de ação (mudas, colmeias, kg de mel).
- `alt` faz a ação aparecer de forma legível em outros clientes Nostr.
- O hash `x` de cada foto garante que ela não foi trocada depois.

### 5.2 Testemunho

```json
{
  "kind": 3911,
  "content": "Estive lá, ajudei no trecho norte.",
  "tags": [
    ["e", "<id-da-ação>"],
    ["p", "<pubkey-de-quem-registrou>"],
    ["mode", "presencial"],
    ["g", "6gkzm"]
  ]
}
```

`mode` = `presencial` (via QR no local) ou `remoto`.

## 6. Status da ação (sem porteiro)

Calculado **por cada aparelho**, a partir dos testemunhos que ele recebeu.
Ninguém "aprova"; a evidência se acumula.

| Status | Regra v1 |
|---|---|
| **Observado** | ação publicada, com pelo menos 1 foto |
| **Confirmado** | ≥ 2 testemunhos de pessoas diferentes (não conta quem registrou) |
| **Consolidado** | ≥ 5 testemunhos, **ou** ≥ 2 presenciais de membros do coletivo |

Regras de contagem:
- 1 testemunho por pessoa por ação.
- Testemunho de **membro do coletivo** ou de quem você segue conta normal;
  de chaves desconhecidas aparece listado, mas só conta para "Confirmado".
- A interface sempre mostra **quem** confirmou — o status é um resumo, não uma sentença.

Limitação conhecida: um grupo pode se confirmar mutuamente. Na v1 isso é aceito;
a defesa é a transparência (todos os testemunhos são públicos e assinados).
A rede de confiança completa vem depois.

## 7. Arquitetura técnica

```
┌──────────── Celular / navegador (PWA) ─────────────┐
│ React + TypeScript + Vite                           │
│ nostr-tools (chaves, assinatura, relays)            │
│ IndexedDB: eventos, fila de envio, fotos pendentes   │
│ Service Worker: funciona offline                     │
│ Leaflet + OpenStreetMap: mapa                       │
└──────────┬───────────────────────────┬──────────────┘
           │ eventos assinados          │ fotos (por hash)
           ▼                            ▼
   Relays Nostr                  Servidores Blossom
   (3 públicos + o nosso)        (1 público + o nosso)
```

- **Hospedagem do app**: GitHub Pages (grátis). Espelhos em outros domínios depois.
- **Relays**: começar com relays públicos + 1 nó próprio. A lista vem embutida e é editável.
- **Nó próprio (opcional na v1)**: `docker compose up -d` sobe um relay
  ([strfry](https://github.com/hoytech/strfry)) + servidor Blossom num PC ou mini PC.
- **Chaves**: secp256k1/Schnorr (padrão Nostr). Isso substitui as chaves WebCrypto
  do RegenKernel antigo; o conceito (chave no aparelho, assinar offline) é o mesmo.
- **Custo**: zero, além de um PC ligado para o nó próprio.

## 8. Integração com a DeCleanup Network

O Rastro **não compete** com a dapp da DeCleanup: é uma camada de **coleta em campo
e confirmação por testemunhas**, sem carteira e sem internet.

- Os campos da ação de limpeza seguem os da API pública da DeCleanup
  (`weightKg`, `bags`, `areaSqm`, `durationMinutes`, `wasteTypes`,
  `contributorsCount`, fotos antes/depois, recicláveis).
- v1: botão **"Exportar para DeCleanup"** gera um JSON/pacote nesse formato,
  com links para os eventos assinados como prova.
- O que a DeCleanup ganha:
  1. participantes **sem carteira e sem internet** conseguem contribuir;
  2. **testemunhos assinados** como sinal extra para os verificadores (menos trabalho manual);
  3. um registro público que não depende de nenhum servidor da DeCleanup.
- Depois (se fizer sentido para eles): ponte automática para a submissão on-chain.

## 9. Privacidade e segurança

Uma rede incensurável também não "esquece". Por isso, a v1 vem com proteção por padrão:

- **Localização com precisão reduzida** (~5 km) por padrão; precisão alta é escolha explícita.
- Aviso antes de publicar fotos com **rostos ou crianças**; remoção automática de metadados EXIF.
- Explicar com clareza que **apagar não é garantido** (cópias podem existir em outros relays).
- A chave privada **nunca sai do aparelho**, a não ser no backup que a pessoa faz.

## 10. Estrutura do repositório

```
rastro/
├── src/
│   ├── nostr/            # chaves, eventos, relays, fila offline
│   ├── model/            # tipos Ação/Testemunho/Coletivo + cálculo de status
│   ├── media/            # compressão, EXIF, upload Blossom
│   ├── screens/          # Início, Nova ação, QR, Ação, Mapa, Relatório, Perfil
│   └── export/           # relatório e exportação DeCleanup
├── public/               # ícones
├── node/                 # (etapa C) docker-compose: strfry + Blossom (+ Tor na v2)
├── docs/                 # esta especificação, guia do nó, guia do piloto
└── README.md
```

Recomendação: **repositório próprio `rastro`**, separado do RegenImpactHub antigo,
que fica preservado como referência (tag `v0-firebase`).

## 11. Plano de entrega

| Etapa | Entrega | Para quê |
|---|---|---|
| **A. Demo** | Fluxo 4.1 → 4.2 → 4.3 → página pública, usando relays públicos | Mostrar para a DeCleanup **antes** de propor o piloto |
| **B. Piloto** | Offline completo, mapa, relatório, exportação DeCleanup | Primeiro mutirão real |
| **C. Nó** | Pacote do nó com 1 comando + guia | Independência dos relays públicos |
| **D. v1.1** | Tipos de ação para apiário e agrofloresta, QR de produto | Segundo e terceiro grupos |

## 12. Questões em aberto

1. Confirmar números de `kind` livres no registro de NIPs.
2. Quais relays públicos aceitam bem kinds novos e fotos grandes (testar na etapa A).
3. Regras de status: validar com o grupo se 2 / 5 testemunhos fazem sentido na prática.
4. Domínio e checagem do nome "Rastro" (INPI, redes, domínio).
5. A DeCleanup tem interesse em receber o pacote exportado? Em que formato?
