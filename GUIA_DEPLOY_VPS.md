Manual - Deploy do Sistema Neuro (Frontend + Backend) no VPS com Cloudflare + NGINX + PM2
Domínio: moiseslab.shop | Subdomínio: app.moiseslab.shop | VPS: 173.212.202.150
Última atualização: 09/02/2026

Objetivo
Este guia documenta, do zero, o que foi feito para publicar o sistema (Vite/React no frontend + Node/Express no backend) no domínio app.moiseslab.shop com HTTPS (Let's Encrypt), NGINX servindo o frontend e proxy para a API, e PM2 garantindo que o backend suba automaticamente após reboot.

Arquitetura final (como ficou)
•	DNS (Cloudflare): A record app.moiseslab.shop -> 173.212.202.150
•	NGINX: entrega arquivos estáticos do build (/home/moises/apps/neuro/dist) e faz proxy de /api/ para http://127.0.0.1:5000
•	Backend (Node/Express): rodando com PM2, ouvindo apenas em 127.0.0.1:5000 (não exposto na internet)
•	HTTPS: Certbot/Let's Encrypt no NGINX para app.moiseslab.shop
•	Systemd: serviço pm2-moises (oneshot) que executa 'pm2 resurrect' no boot

Pré-requisitos
•	Acesso SSH ao VPS com um usuário não-root (ex: moises) e sudo habilitado.
•	NGINX instalado e funcionando.
•	Domínio gerenciado no Cloudflare (nameservers apontando para Cloudflare).
•	Projeto no servidor em: /home/moises/apps/neuro (com backend em /home/moises/apps/neuro/backend).

1) Configurar DNS no Cloudflare
No Cloudflare > DNS > Records:
1.	1. Criar/ajustar um registro A para o subdomínio:
•	   - Type: A
•	   - Name: app
•	   - IPv4 address: 173.212.202.150
•	   - TTL: Auto
•	   - Proxy status: recomendado 'DNS only' durante o setup do Certbot. Depois pode avaliar ativar o proxy.
2.	2. Validar resolução DNS (no Windows):
•	   nslookup app.moiseslab.shop

2) Preparar NGINX e emitir certificado HTTPS (Certbot)
Instalar Certbot (Ubuntu/Debian):
•	sudo apt update
•	sudo apt install -y certbot python3-certbot-nginx
Criar um site básico para o subdomínio (antes do SSL):
•	sudo nano /etc/nginx/sites-available/app.moiseslab.shop
•	Criar link simbólico:
•	sudo ln -s /etc/nginx/sites-available/app.moiseslab.shop /etc/nginx/sites-enabled/app.moiseslab.shop
•	Remover default (se existir) para evitar conflito:
•	sudo rm -f /etc/nginx/sites-enabled/default
•	Testar e recarregar:
•	sudo nginx -t
•	sudo systemctl reload nginx
Emitir certificado para app.moiseslab.shop:
•	sudo certbot --nginx -d app.moiseslab.shop
•	Após sucesso, validar:
•	curl -I https://app.moiseslab.shop

3) Copiar o projeto para o servidor (forma rápida)
Recomendado: copiar como .zip/.tar.gz e extrair no servidor para evitar travamentos em SFTP com muitos arquivos.
•	No seu PC (Windows), dentro da pasta do projeto, crie um zip sem node_modules (se possível):
•	Exemplo (PowerShell):
•	Compress-Archive -Path .\* -DestinationPath sistema-neuro.zip
•	Enviar para o servidor com scp (mais confiável que SFTP quando o painel trava):
•	scp -P 2222 sistema-neuro.zip moises@173.212.202.150:/home/moises/
•	No servidor, preparar pasta e extrair:
•	mkdir -p ~/apps/neuro
•	unzip ~/sistema-neuro.zip -d ~/apps/neuro
•	Como checar e limpar 'resíduos' de tentativas anteriores (opcional):
•	ls -la ~/apps/neuro
•	rm -rf ~/apps/neuro/node_modules ~/apps/neuro/backend/node_modules

4) Instalar Node.js (Node 20) e corrigir conflitos
Situação encontrada: Node antigo (v12) e conflito com libnode-dev durante upgrade.
Instalar Node 20 via NodeSource (Ubuntu):
•	curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
•	sudo apt install -y nodejs
•	Se der erro de overwrite em /usr/include/node/common.gypi por causa do libnode-dev, remover o pacote antigo e repetir:
•	sudo apt remove -y libnode-dev
•	sudo apt -f install
•	sudo apt install -y nodejs
•	Validar versões:
•	node -v
•	npm -v

5) Backend: instalar dependências e subir com PM2
Entrar no backend e instalar dependências:
•	cd ~/apps/neuro/backend
•	npm install
•	Se ocorrer erro de permissão (EACCES) dentro de node_modules, normalmente é porque arquivos foram criados como root. Resolver assim:
•	sudo rm -rf node_modules
•	sudo rm -f package-lock.json
•	sudo chown -R moises:moises ~/apps/neuro/backend
•	chmod -R u+rwX,go+rX ~/apps/neuro/backend
•	npm install
Porta do backend (confirmada no .env): PORT=5000
•	Arquivo: ~/apps/neuro/backend/.env
•	Instalar PM2 global:
•	sudo npm install -g pm2
•	Iniciar o backend com variáveis do .env (PM2 não aceita --env-file diretamente):
•	cd ~/apps/neuro/backend
•	set -a
•	source .env
•	set +a
•	pm2 start index.js --name neuro-backend --update-env
•	pm2 save
•	Testar backend localmente:
•	curl -I http://127.0.0.1:5000

6) Frontend: ajustar API_URL, build e publicar
Problema identificado: frontend chamava API em http://<host>:5000/api (causa Mixed Content e expõe porta).
•	Correção aplicada em /home/moises/apps/neuro/src/services/data.js:
•	ANTES: const API_URL = `http://${window.location.hostname}:5000/api`;
•	DEPOIS: const API_URL = `/api`;
•	Rebuild do frontend:
•	cd ~/apps/neuro
•	npm install
•	npm run build
•	Verificar dist:
•	ls -la ~/apps/neuro/dist | head

7) NGINX final (Frontend + /api proxy)
Arquivo: /etc/nginx/sites-available/app.moiseslab.shop
•	Configuração final (resumo):
server {
    server_name app.moiseslab.shop;

    root /home/moises/apps/neuro/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/app.moiseslab.shop/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/app.moiseslab.shop/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    listen 80;
    server_name app.moiseslab.shop;
    return 301 https://$host$request_uri; # managed by Certbot
}

•	Aplicar mudanças:
•	sudo nginx -t
•	sudo systemctl reload nginx
•	Teste:
•	curl -I https://app.moiseslab.shop
•	curl -i -X POST https://app.moiseslab.shop/api/login -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'

8) Permissões (erro 500 do NGINX - Permission denied)
Erro visto no error.log: stat() ... Permission denied ao acessar /home/moises/.../dist/index.html.
Causa: /home/moises estava sem permissão de travessia (o+x) para o usuário do NGINX (www-data).
•	Diagnóstico:
•	namei -l /home/moises/apps/neuro/dist/index.html
•	Correção aplicada:
•	chmod o+x /home/moises

9) Segurança: não expor a porta 5000
Situação: backend estava ouvindo em *:5000 (exposto).
Correção: alterar listen do Express para bind em 127.0.0.1.
•	Arquivo: ~/apps/neuro/backend/index.js
•	ANTES: app.listen(PORT, () => {
•	DEPOIS: app.listen(PORT, "127.0.0.1", () => {
•	Reiniciar:
•	pm2 restart neuro-backend
•	Validar:
•	sudo ss -lntp | grep 5000
•	Esperado: 127.0.0.1:5000

10) PM2 no boot (systemd) - configuração final
Para subir automaticamente após reboot, usamos um serviço systemd que roda 'pm2 resurrect'.
•	Arquivo: /etc/systemd/system/pm2-moises.service
[Unit]
Description=PM2 resurrect for moises
Documentation=https://pm2.keymetrics.io/
After=network.target

[Service]
Type=oneshot
User=moises
Environment=PM2_HOME=/home/moises/.pm2
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
RemainAfterExit=yes

ExecStart=/usr/bin/pm2 resurrect
ExecReload=/usr/bin/pm2 reload all
ExecStop=/usr/bin/pm2 kill

[Install]
WantedBy=multi-user.target

•	Ativar e aplicar:
•	sudo systemctl daemon-reload
•	sudo systemctl enable pm2-moises
•	sudo systemctl start pm2-moises
•	pm2 save
•	Checagem:
•	systemctl status pm2-moises --no-pager -l
•	Deve aparecer: active (exited) e o processo neuro-backend online.

11) Comandos úteis (troubleshooting rápido)
•	Limpar terminal: clear
•	Ver portas abertas (80/443/5000): sudo ss -lntp | egrep ':80|:443|:5000'
•	Testar NGINX: sudo nginx -t
•	Recarregar NGINX: sudo systemctl reload nginx
•	Logs NGINX: sudo tail -n 80 /var/log/nginx/error.log
•	Status PM2: pm2 list
•	Logs backend: pm2 logs neuro-backend --lines 80
•	Reiniciar backend: pm2 restart neuro-backend
•	Regerar cert (se necessário): sudo certbot renew --dry-run

Checklist final
•	DNS resolve: nslookup app.moiseslab.shop -> 173.212.202.150
•	HTTPS OK: curl -I https://app.moiseslab.shop -> 200
•	API OK (exemplo): curl POST /api/login retorna JSON (401 para credenciais falsas)
•	Backend não exposto: ss mostra 127.0.0.1:5000 (não *:5000)
•	Reboot-proof: systemctl status pm2-moises = active (exited) e neuro-backend online
