# ♻️ EcoLoop — Mercado de Economia Circular

![Status](https://img.shields.io/badge/Status-Concluído-success) ![License](https://img.shields.io/badge/License-MIT-blue)

## 📖 Sobre o Projeto

O **EcoLoop** é uma Single Page Application (SPA) focada em sustentabilidade e economia circular. A plataforma conecta pessoas que desejam dar um novo destino a materiais, móveis e resíduos, permitindo não apenas a **venda**, mas também **doações** e contratação de **serviços de retirada**.

O diferencial do projeto é sua arquitetura *client-side*: toda a persistência de dados (usuários, anúncios, propostas e notificações) é gerenciada via `localStorage`, simulando um backend real e permitindo que a aplicação funcione e mantenha o estado mesmo após recarregar a página.

## 🚀 Funcionalidades

- **Autenticação Simulada:** Sistema de Login e Cadastro de usuários.
- **CRUD de Anúncios:** Criação, leitura e exclusão de itens (com categorias, validade e volume).
- **Sistema de Negociação Flexível:**
  - 💰 **Compra:** Usuário oferece um valor pelo item.
  - 🎁 **Doação:** Usuário solicita retirada gratuita.
  - 🚛 **Serviço:** Usuário cobra um valor para retirar o item (ex: entulho).
- **Dashboard do Usuário:** Gestão de itens anunciados e ofertas enviadas.
- **Centro de Notificações:** Alertas em tempo real sobre propostas recebidas e status de negociações.
- **Busca e Filtros:** Pesquisa por palavras-chave e categorias (Móveis, Madeira, Eletrônicos, etc.).

## 🛠️ Tecnologias Utilizadas

- **HTML5 & CSS3**
- **JavaScript (ES6+):** Lógica completa da aplicação (SPA).
- **Bootstrap 5.3:** Framework para layout responsivo e componentes de UI.
- **FontAwesome:** Ícones vetoriais.
- **LocalStorage API:** Persistência de dados no navegador (Mock Database).

## 📸 Screenshots
<img width="1423" height="728" alt="image" src="https://github.com/user-attachments/assets/bf52025f-4c2c-47f8-9e12-e91365f15c54" />

<img width="1413" height="726" alt="image" src="https://github.com/user-attachments/assets/108688b3-03a7-4c85-9036-42b57ac58cb9" />


## 📦 Como rodar este projeto

1. Acesse o site: https://appecoloop.vercel.app/
