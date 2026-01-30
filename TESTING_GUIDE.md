# Guia de Testes de Qualidade (QA) e Rede Local

Este guia foi criado para ajudá-lo a encontrar bugs ("caçar problemas") e validar se o sistema está pronto para uso real, além de explicar como conectar o segundo computador.

## Parte 1: Checklist de Testes (Caça aos Bugs)

Tente realizar essas ações. Se algo estranho acontecer (tela branca, erro vermelho, botão não funciona), anote!

### 1. Fluxo de Pacientes
- [ ] **Criar Paciente**: Criar um paciente com todos os dados.
    - *Teste de Estresse*: Tente criar um sem nome ou sem DNI. O sistema avisa ou dá erro?
- [ ] **Editar Paciente**: Mude o telefone e salve. A mudança aparece na lista?
- [ ] **Busca**: Digite parte do nome na barra de busca. O paciente aparece?

### 2. Fluxo da Agenda (O Coração do Sistema)
- [ ] **Nova Cita**: Agende para hoje.
- [ ] **Conflito de Horário**: Tente agendar outra pessoa EXATAMENTE no mesmo horário com o mesmo médico. O sistema deixa? Deveria avisar?
- [ ] **Mover Cita (Reprogramar)**: Mude a cita para amanhã.
- [ ] **Cancelar**: Cancele a cita. Ela fica vermelha?
- [ ] **Triaje (Novo!)**:
    - Abra uma cita "Confirmada".
    - Clique em "Triaje", preencha Peso/Altura.
    - Salve. O botão virou verde?
    - Abra de novo. Os dados estão lá?

### 3. Fluxo Clínico (Histórico)
- [ ] **Ver Histórico**: Entre nos detalhes do paciente.
- [ ] **Aparece tudo?**: Você vê a Cita? Vê o Triaje que acabou de fazer?
- [ ] **Imprimir**: Tente gerar um PDF de receita (se houver botão). Ele baixa o arquivo?

---

## Parte 2: Usando em Rede Local (2 Computadores)

Para usar o sistema no "Computador 2" (Recepção ou Consultório) acessando o "Computador 1" (Servidor onde está o código):

### Passo 1: Descobrir o IP do Servidor
No computador onde o sistema está rodando:
1.  Abra o terminal (PowerShell).
2.  Digite: `ipconfig`
3.  Procure por **"Endereço IPv4"**. (Geralmente é algo como `192.168.1.XX` ou `192.168.0.XX`).
    *   *Anote esse número! Ex: 192.168.1.50*

### Passo 2: Testar a Conexão
No **Computador 2**:
1.  Abra o navegador (Chrome/Edge).
2.  Digite na barra de endereço: `http://192.168.1.50:5173` (Troque pelo IP que anotou).
    *   *Nota: Use a porta 5173 para o Frontend.*

### Passo 3: Solução de Problemas (Se não conectar)
Se ficar "carregando infinitamente" ou der erro:
1.  **Firewall do Windows (No Servidor)**:
    - O Windows pode estar bloqueando.
    - Teste rápido: Desative o firewall temporariamente para testar.
    - Solução correta: Adicione uma "Regra de Entrada" no Firewall permitindo a porta `5173` e `5000` (Backend).
2.  **Mesma Rede**:
    - Os dois computadores PRECISAM estar no mesmo Wi-Fi ou cabo de rede.

### Dica de Ouro para Produção
Para evitar que o IP mude todo dia (o que faria o Computador 2 perder a conexão), configure um **IP Fixo** no Computador Servidor nas configurações de rede do Windows.
