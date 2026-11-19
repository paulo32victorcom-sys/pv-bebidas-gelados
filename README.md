# PV Bebidas e Gelados

Loja virtual em React + Vite, com Supabase (banco compartilhado, autenticação, estoque e fotos) e Netlify.

## O que está pronto
- Catálogo público e responsivo; busca de produtos e atualização em tempo real.
- Carrinho, quantidades, cálculo de total e checkout.
- Pedido gravado no banco e estoque baixado de forma transacional.
- Abre WhatsApp `+55 88 99223-5590` com os detalhes do pedido.
- Área administrativa com login Supabase: cadastrar, editar, excluir/desativar produtos, preço, fotos e entrada de estoque.
- Produtos iniciais cadastrados. Gutinho R$ 1,50 e sorvete 1 litro R$ 15,00. Preços ainda não informados começam em R$ 0,00 e precisam ser definidos no painel antes das vendas.

## 1. Criar o banco Supabase (gratuito para começar)
1. Acesse https://supabase.com e crie um projeto.
2. Guarde a senha do banco em local seguro.
3. No painel, abra **SQL Editor → New query**.
4. Copie todo o conteúdo de `supabase/schema.sql`, cole e clique em **Run**.
5. Vá em **Project Settings → API** e copie `Project URL` e a chave `anon`/`publishable` (NUNCA use a `service_role` no navegador).

## 2. Criar o acesso do proprietário
1. No Supabase, abra **Authentication → Users → Add user**.
2. Cadastre o e-mail do proprietário e use inicialmente a senha `9361` (se o painel exigir senha mais forte, use uma senha forte; a segurança deve prevalecer). Confirme/crie o usuário.
3. Copie o UUID desse usuário na lista.
4. No SQL Editor, execute, substituindo pelo UUID real:
   `insert into public.admin_users(user_id) values ('COLE-AQUI-O-UUID');`
5. Entre na loja com esse e-mail e senha. **Troque a senha inicial por uma senha forte antes de divulgar o endereço do site.** O número 9361 é fraco e não deve ser mantido em produção.

## 3. Configurar e testar no computador
1. Instale Node.js LTS: https://nodejs.org
2. Descompacte o ZIP e abra a pasta do projeto no terminal.
3. Execute `npm install`.
4. Crie um arquivo chamado `.env` na raiz (mesma pasta do package.json), usando `.env.example` como modelo:
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`
   - `VITE_WHATSAPP=5588992235590`
5. Execute `npm run dev` e abra o endereço local informado pelo Vite.
6. Entre na Administração, edite os preços que faltam e informe o estoque real de cada produto. Faça um pedido de teste antes de divulgar.

## 4. Publicar gratuitamente no Netlify
1. Crie conta em https://netlify.com.
2. No Netlify, escolha **Add new site → Import an existing project** e conecte um repositório GitHub com estes arquivos (ou use o deploy manual da pasta `dist` depois de executar `npm run build`).
3. Build command: `npm run build`. Publish directory: `dist`.
4. Em **Site configuration → Environment variables**, adicione as três variáveis do `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WHATSAPP`).
5. Faça o deploy/redeploy. O Netlify fornecerá um endereço público `*.netlify.app`; você pode personalizar o subdomínio nas configurações.
6. No Supabase, em **Authentication → URL Configuration**, adicione o domínio do Netlify em **Site URL** e **Redirect URLs**. Para este fluxo de login, inclua `https://SEU-SITE.netlify.app/**`.
7. Teste o site pelo link público em outro celular ou navegador.

## 5. Rotina de uso
- Administração → login → Novo produto para cadastrar.
- Editar para alterar nome/preço/estoque/foto.
- `+ Estoque` registra entrada de mercadorias.
- Excluir desativa o produto no catálogo, preservando registros antigos.
- O cliente adiciona ao carrinho e confirma o pedido. O banco valida o estoque, registra o pedido e baixa as quantidades. Em seguida, o WhatsApp abre com a mensagem pronta; o cliente ainda precisa tocar em **Enviar** no WhatsApp.

## Atenção antes de vender
- Preencha preços e estoque dos produtos que ainda estão em R$ 0,00/estoque zero.
- A senha 9361 é apenas uma senha inicial solicitada; troque-a por uma senha forte.
- O pedido é registrado no banco antes de abrir o WhatsApp. Se o cliente fechar o WhatsApp sem enviar, o pedido ainda ficará registrado no banco.
- Não há painel de consulta de pedidos nesta primeira versão; os pedidos ficam na tabela `orders` do Supabase. Pode-se adicionar uma tela de pedidos depois.
- O plano gratuito do Supabase/Netlify pode ter limites, pausas ou mudanças de política. Confira os limites atuais dos serviços antes de depender deles comercialmente.
- Não coloque a chave `service_role` no código, no Netlify como variável `VITE_` ou em repositório público.
