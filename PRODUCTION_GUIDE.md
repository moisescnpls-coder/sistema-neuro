# Guia de Produção e Blindagem do Sistema

Este guia explica como configurar o Sistema Neuro para que ele inicie automaticamente com o Windows e use sempre as portas corretas, evitando conflitos.

## 1. Blindagem de Portas (Já configurado)
Fizemos as seguintes alterações para garantir estabilidade:
- **Backend**: Forçado a usar a porta **3001**. Se estiver ocupada, ele não iniciará (em vez de pegar uma porta aleatória), facilitando a detecção do erro.
- **Frontend**: Forçado a usar a porta **5173**.

## 2. Instalação do Gerenciador (PM2)
O **PM2** é uma ferramenta profissional que mantém seu sistema rodando. Se o servidor cair, o PM2 o levanta. Se o Windows reiniciar, o PM2 inicia o sistema.

### Passo A: Instalar PM2
Abra o terminal (PowerShell) como Administrador e execute:
```powershell
npm install pm2 -g
```

### Passo B: Iniciar o Backend
Navegue até a pasta `backend` e inicie usando o arquivo de configuração que criei:
```powershell
cd backend
pm2 start ecosystem.config.js
```
*Isso iniciará o processo "sistema-neuro-backend".*

### Passo C: Salvar e Configurar Inicialização
Para que o PM2 lembre dos processos e inicie com o Windows:
```powershell
pm2 save
pm2 startup
```
*Siga as instruções que o comando `pm2 startup` exibir na tela.*

## 3. Comandos Úteis do PM2

- **Ver status**: `pm2 status`
- **Ver logs (erros)**: `pm2 logs`
- **Reiniciar sistema**: `pm2 restart all`
- **Parar sistema**: `pm2 stop all`

## 4. Frontend (React)
Para o Frontend em produção na rede local, recomenda-se gerar a versão otimizada ("build") e servi-la.
```powershell
npm run build
npm run preview
```
Ou configurar um servidor web (como Nginx ou IIS) apontando para a pasta `dist` gerada.
