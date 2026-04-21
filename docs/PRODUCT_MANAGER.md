# 📦 Instruções - Gerenciador de Produtos

## ✅ O que foi implementado

### 1. **22 Produtos Importados**
- ✅ 5 Achocolatados (Nescau)
- ✅ 3 Bebidas (Refrigerante, Suco, Leite)
- ✅ 3 Mercearia (Arroz, Feijão, Óleo)
- ✅ 2 Padaria/Confeitaria (Pão, Bolo)
- ✅ 3 Hortifruti (Maçã, Batata, Cebola)
- ✅ 3 Limpeza (Detergente, Desinfetante, Sabão)
- ✅ 3 Higiene (Sabonete, Papel Higiênico, Escova)
- ✅ 2 Congelados (Frango, Brócolis)
- ✅ 1 Oferta Especial (Combo Café da Manhã)

**Todos com preços diferenciados por loja:**
- Benedito Bentes
- Vergel
- Salvador Lyra

### 2. **Interface Admin Completa**
Interface de gerenciamento de produtos integrada no painel admin com:
- ➕ **Adicionar** novos produtos
- ✏️ **Editar** produtos existentes
- 🗑️ **Remover** produtos
- 🔍 **Buscar** por nome ou categoria
- 📊 **Estatísticas** em tempo real

---

## 🚀 Como Usar

### **Acessar o Gerenciador**

1. **Abra a vitrine**: http://localhost:3001
2. **Clique em "Admin"** (canto superior)
3. **Faça login** com suas credenciais
4. **No painel lateral, clique em "Gerenciar Produtos"**

---

### **Adicionar um Novo Produto**

1. Clique no botão **"+ Novo Produto"**
2. Preencha os campos:
   - **Nome** (obrigatório)
   - **Categoria** (selecione uma das 11 opções)
   - **Descrição** (opcional)
   - **URL da Imagem** (opcional)
   - **Preços por Loja** (Benedito Bentes, Vergel, Salvador Lyra)
   - **Em Oferta** (checkbox para marcar produtos em oferta)
3. Clique em **"Salvar"**

### **Editar um Produto**

1. Localize o produto na lista
2. Clique no botão **"Editar"**
3. Modifique os campos necessários
4. Clique em **"Salvar"**

### **Remover um Produto**

1. Localize o produto na lista
2. Clique no botão **"Remover"**
3. Confirme a exclusão

### **Buscar Produtos**

Use a caixa de busca no topo da página para filtrar por:
- Nome do produto
- Categoria

---

## 📋 Categorias Disponíveis

- **Ofertas** - Promoções especiais
- **Mercearia** - Produtos secos
- **Bebidas** - Bebidas em geral
- **Hortifruti** - Frutas e verduras
- **Açougue** - Carnes vermelhas
- **Peixaria** - Peixes e frutos do mar
- **Padaria** - Pães e afins
- **Confeitaria** - Bolos e doces
- **Limpeza** - Produtos de limpeza
- **Higiene** - Produtos de higiene pessoal
- **Congelados** - Alimentos congelados

---

## 💾 Integração com Vitrine

Todos os produtos adicionados via admin aparecem **automaticamente** na vitrine pública:

✅ Aparecem no seletor de categorias
✅ Filtram corretamente
✅ Mostram preços por loja
✅ Atualizam em tempo real
✅ Aparecem carrossel de ofertas

---

## 🔧 Comandos Úteis

```bash
# Importar 22 produtos mock
npm run import-mock

# Importar produtos via ID e API
npm run import-products

# Iniciar dev server
npm run dev
```

---

## 📝 Estrutura do Produto no Firestore

```json
{
  "nome": "Produto XYZ",
  "descricao": "Descrição do produto",
  "categoria": "Mercearia",
  "imagem": "https://...",
  "emOferta": false,
  "precos": {
    "benedito_bentes": 12.50,
    "vergel": 12.00,
    "salvador_lyra": 13.00
  }
}
```

---

## 🎯 Próximos Passos

- Teste adicionar/editar/remover produtos
- Verifique se aparecem na vitrine
- Customize preços por loja conforme necessário
- Marque produtos especiais como ofertas

---

## ❓ Dúvidas?

Se um produto não aparecer na vitrine:
1. Confirme que ele foi salvo (sem mensagens de erro)
2. Recarregue a página (F5)
3. Verifique se a categoria está correta
4. Confirme que pelo menos um preço foi preenchido

---

**Sistema pronto para uso! 🎉**
