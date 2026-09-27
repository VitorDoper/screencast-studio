# 🖥️ ScreenCast Studio - Transmissor de Tela PC

Aplicativo moderno e profissional para capturar, transmitir ao vivo e gravar a tela do seu computador com áudio do sistema, microfone, webcam (facecam) e anotações em tempo real.

![ScreenCast Studio](public/icon.svg)

---

## 🚀 Funcionalidades

- **Captura em Alta Definição**: Até 4K / 1080p a 60 FPS com áudio nativo do computador.
- **Transmissão WebRTC P2P**: Sala exclusiva com link direto e QR Code para celular.
- **Webcam Picture-in-Picture (PiP)**: Câmera flutuante arrastável, espelhável e redimensionável.
- **Mixer de Áudio Integrado**: Volume independente para microfone e sons do PC com VU Meter ao vivo.
- **Anotações ao Vivo**: Caneta, marcador fluorescente, ponteiro laser, caixas e setas.
- **Gravação Local em HD**: Formato WebM/MP4 sem envio para servidores de terceiros.
- **Modo Privacidade**: Oculte a tela em 1 clique durante digitação de senhas.
- **Integração com OBS Studio**: URL de Fonte de Navegador (Browser Source) pronta para colar no OBS.

---

## ⚡ Como Rodar Localmente

1. Clone o repositório:
```bash
git clone <URL_DO_SEU_REPOSITORIO>
cd screencast-studio
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor:
```bash
npm run dev
```

Acesse no seu navegador: `http://localhost:3000`

---

## 📦 Como Gerar o Executável (.EXE) para Windows

### Opção 1: Pelo GitHub Actions (100% Gratuito na Nuvem)
Este repositório já inclui o arquivo `.github/workflows/build-desktop-exe.yml`:
1. Suba este código para o seu repositório no GitHub.
2. Acesse a aba **Actions** no seu GitHub.
3. Selecione o workflow **"Compilar Executavel Desktop (.EXE)"** e clique em **"Run workflow"**.
4. O GitHub compilará o programa em uma máquina Windows na nuvem e deixará o arquivo `ScreenCast-Studio-Windows.zip` pronto para download!

### Opção 2: Gerar Localmente pelo Terminal
No Prompt de Comando (CMD) ou PowerShell:
```bash
npx nativefier --name "ScreenCast Studio" "https://ais-pre-qvfwhvwcniscbpe5cudjwn-613439356316.us-east1.run.app"
```

---

## 🌐 Deploy Grátis na Nuvem

- **Render.com**: Arquivo `render.yaml` pronto para deploy automático em 1 clique.
- **Vercel**: Arquivo `vercel.json` configurado para hospedagem estática gratuita.
- **Google Cloud Run**: Já hospedado e ativo 24/7.
