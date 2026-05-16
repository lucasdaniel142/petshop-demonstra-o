# Pasta « copia para auditoria »

Esta pasta guarda um **espelho do projeto** para entrega a auditores ou gestão, sem precisar dar acesso ao repositório principal.

## Onde está o snapshot

O conteúdo atualizado está em:

**`copia para auditoria/copia para auditoria/`**

Lá você encontra:

| Item | Descrição |
|------|-----------|
| `src/` e `api/` | Código sincronizado com o projeto principal (última auditoria aplicada). |
| `RELATORIO_AUDITORIA.md` | Tabelas e evidências (segurança, performance, UX). |
| `DOCUMENTACAO_SISTEMA.md` | Documentação geral + **§8 Auditoria aplicada**. |
| `CHECKLIST_POS_DEPLOY.md` | Checklist operacional + bloco **Auditoria (regressão rápida)**. |
| `firestore.rules`, `vite.config.ts`, `package.json` | Configs alinhadas ao deploy. |

## Observação

A cópia interna pode conter `.git`, `node_modules` ou `dist` de um estado anterior — para revisão de código, priorize `src/`, `api/` e os `.md` acima. Para builds limpos, rode `npm install` e `npm run build` **no projeto principal** ou após copiar só os artefatos necessários.
