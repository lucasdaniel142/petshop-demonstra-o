# 📦 Guia de Importação de Produtos

## 🎯 O que faz?

O script `scripts/importarProdutos.js` importa produtos reais do **Open Food Facts API** (banco de dados colaborativo de alimentos) e os popula no Firestore com preços específicos para cada unidade da Supermercado Sagrada Família.

## 📋 Pré-requisitos

✅ `serviceAccountKey.json` existente na raiz do projeto
✅ Firebase project ID correto (sagrada-familia-a334e)
✅ Dependências instaladas: `npm install`

## 🚀 Como executar

### Opção 1: Usando npm script (recomendado)
```bash
npm run import-products
```

### Opção 2: Diretamente com Node.js
```bash
node scripts/importarProdutos.js
```

## 💾 Dados que são importados

### Produtos mockados (5):
1. **Nescau Nestlé** (EAN: 7891000412855)
   - Benedito Bentes: R$ 12,49
   - Vergel: R$ 12,15
   - Salvador Lyra: R$ 12,85

2. **Nescau Lata 350g** (EAN: 7891000426210)
   - Benedito Bentes: R$ 10,99
   - Vergel: R$ 10,75
   - Salvador Lyra: R$ 11,20

3. **Nescau Nestlé** (EAN: 7891000379585)
   - Benedito Bentes: R$ 13,90
   - Vergel: R$ 13,55
   - Salvador Lyra: R$ 14,10

4. **Nescau Nestlé** (EAN: 7891000379691)
   - Benedito Bentes: R$ 13,80
   - Vergel: R$ 13,45
   - Salvador Lyra: R$ 14,00

5. **Cereal Matinal Duo Nescau** (EAN: 7891000258613)
   - Benedito Bentes: R$ 14,90
   - Vergel: R$ 14,55
   - Salvador Lyra: R$ 15,20

## 📊 Estrutura do Firestore

Cada produto é salvo com a estrutura:

```javascript
{
  ean: "7891000412855",           // ID do documento
  nome: "Nescau",                 // Nome obtido da API
  imageUrl: "https://...",        // Imagem obtida da API
  unit: "un",
  categoria: "Achocolatados",     // Categoria mapeada da API
  precos: {
    benedito_bentes: {
      valor: 12.49,
      emOferta: false,
      esgotado: false
    },
    vergel: {
      valor: 12.15,
      emOferta: false,
      esgotado: false
    },
    salvador_lyra: {
      valor: 12.85,
      emOferta: false,
      esgotado: false
    }
  },
  updatedAt: "2024-01-15T10:30:00.000Z"
}
```

## 🏪 Categorias Disponíveis

O sistema agora suporta as seguintes categorias:

- 🔥 **Ofertas** - Produtos em promoção
- 🥫 **Mercearia** - Produtos de mercearia geral
- 🥤 **Bebidas** - Refrigerantes, sucos, etc.
- 🍎 **Hortifruti** - Frutas, verduras, legumes
- 🥩 **Açougue** - Carnes bovinas, suínas, aves
- 🐟 **Peixaria** - Peixes e frutos do mar
- 🍞 **Padaria** - Pães e produtos de padaria
- 🍰 **Confeitaria** - Doces, bolos, sobremesas
- 🧼 **Limpeza** - Produtos de limpeza
- 🧴 **Higiene** - Higiene pessoal
- ❄️ **Congelados** - Produtos congelados

## ⚙️ Como funciona

1. **Lê os dados de entrada** do array `produtosEntrada` (EAN + preços)
2. **Busca na API Open Food Facts** para cada EAN
   - Extrai: nome do produto + URL da imagem + categoria
   - Timeout: 8 segundos por produto
   - Rate limit: 1 segundo entre requisições
3. **Mapeia categoria** para uma das categorias do sistema
4. **Estrutura os dados** combinando API + preços locais
5. **Salva no Firestore** usando EAN como ID do documento
6. **Exibe relatório** com sucessos/erros

## 🔧 Personalizando

### Adicionar mais produtos

Edite o array `produtosEntrada` em `scripts/importarProdutos.js`:

```javascript
const produtosEntrada = [
  {
    ean: '7891000412855', // Seu EAN aqui
    preco_benedito_bentes: 12.49,
    preco_vergel: 12.15,
    preco_salvador_lyra: 12.85,
  },
  // ... mais produtos
];
```

### Encontrar EANs reais

- Procure no Google: `"EAN" + "produto"`
- Ou visite: https://www.gtin.info/
- Ou procure a barra do código de barras no produto

## ⚠️ Tratamento de Erros

O script continua processando mesmo se alguns produtos falhem:

- ✅ Produtos encontrados: salvos no Firestore
- ❌ Produtos não encontrados: relatado como erro

Ao final, exibe um relatório com:
```
📊 RELATÓRIO DA IMPORTAÇÃO
✅ Sucessos: 4
❌ Erros: 1
```

## 🔐 Segurança

- Credenciais do Firebase lidas de `serviceAccountKey.json`
- NÃO faça commit dessa chave (está no `.gitignore`)
- API Open Food Facts é pública (sem autenticação)

## 📱 Integrando com a Loja

Após executar o script:

1. Acesse http://localhost:3000 (ou seu domínio de produção)
2. Produtos aparecem na vitrine com preços por loja
3. Cliente seleciona a loja → vê preços locais
4. Cliente clica em categoria → vê produtos filtrados
5. Cliente clica em "Ofertas" → vê apenas produtos em promoção
6. Pode adicionar ao carrinho e comprar via WhatsApp

## 🐛 FAQ

**P: Erro "serviceAccountKey.json not found"**
R: Certifique-se de que o arquivo está na raiz do projeto.

**P: Todos os produtos retornam erro?**
R: Verifique sua conexão com internet. A API pode estar temporariamente indisponível.

**P: Como atualizar preços existentes?**
R: Execute o script novamente. Ele faz `merge: true`, então atualiza sem deletar.

**P: Posso importar 1000 produtos?**
R: Sim, mas levará tempo (1s entre requisições). Considere dividir em lotes.

**P: Como marcar um produto como oferta?**
R: No painel admin, edite o produto e marque "Em oferta".

## 📞 Suporte

Para mais informações sobre a API Open Food Facts:
👉 https://wiki.openfoodfacts.org/API

```javascript
const produtosEntrada = [
  {
    ean: '7894900010014', // Seu EAN aqui
    preco_benedito_bentes: 9.99,
    preco_vergel: 9.85,
    preco_salvador_lyra: 10.15,
  },
  // ... mais produtos
];
```

### Encontrar EANs reais

- Procure no Google: `"EAN" + "produto"`
- Ou visite: https://www.gtin.info/
- Ou procure a barra do código de barras no produto

## ⚠️ Tratamento de Erros

O script continua processando mesmo se alguns produtos falhem:

- ✅ Produtos encontrados: salvos no Firestore
- ❌ Produtos não encontrados: relatado no final
- ⏱️ Timeouts: relatado como erro

Ao final, exibe um relatório com:
```
📊 RELATÓRIO DA IMPORTAÇÃO
✅ Sucessos: 4
❌ Erros: 1
```

## 🔐 Segurança

- Credenciais do Firebase lidas de `serviceAccountKey.json`
- NÃO faça commit dessa chave (está no `.gitignore`)
- API Open Food Facts é pública (sem autenticação)

## 📱 Integrando com a Loja

Após executar o script:

1. Acesse http://localhost:3000 (ou seu domínio de produção)
2. Produtos aparecem na vitrine com preços por loja
3. Cliente seleciona a loja → vê preços locais
4. Pode adicionar ao carrinho e comprar via WhatsApp

## 🐛 FAQ

**P: Erro "serviceAccountKey.json not found"**  
R: Certifique-se de que o arquivo está na raiz do projeto.

**P: Todos os produtos retornam erro?**  
R: Verifique sua conexão com internet. A API pode estar temporariamente indisponível.

**P: Como atualizar preços existentes?**  
R: Execute o script novamente. Ele faz `merge: true`, então atualiza sem deletar.

**P: Posso importar 1000 produtos?**  
R: Sim, mas levará tempo (1s entre requisições). Considere dividir em lotes.

## 📞 Suporte

Para mais informações sobre a API Open Food Facts:  
👉 https://wiki.openfoodfacts.org/API
