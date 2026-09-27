import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '2mb' }));

// In-memory signaling store for WebRTC screen transmission rooms
interface SignalMessage {
  id: string;
  senderId: string;
  targetId?: string; // specific peer or broadcast
  type: 'offer' | 'answer' | 'candidate' | 'joined' | 'left' | 'status';
  data: any;
  timestamp: number;
}

interface Room {
  id: string;
  hostId: string;
  title: string;
  createdAt: number;
  active: boolean;
  participants: Map<string, { id: string; name: string; role: 'host' | 'viewer'; lastSeen: number }>;
  messages: SignalMessage[];
}

const rooms = new Map<string, Room>();

// Cleanup stale rooms periodically (older than 4 hours)
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (now - room.createdAt > 4 * 3600 * 1000) {
      rooms.delete(roomId);
    }
  }
}, 60000);

// API Routes
app.post('/api/rooms', (req, res) => {
  const { title, hostId } = req.body;
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const room: Room = {
    id: roomId,
    hostId: hostId || 'host',
    title: title || 'Transmissão de Tela',
    createdAt: Date.now(),
    active: true,
    participants: new Map([
      [hostId || 'host', { id: hostId || 'host', name: 'Apresentador', role: 'host', lastSeen: Date.now() }]
    ]),
    messages: []
  };
  rooms.set(roomId, room);
  res.json({ roomId, title: room.title });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: 'Sala de transmissão não encontrada' });
  }
  res.json({
    id: room.id,
    title: room.title,
    active: room.active,
    viewerCount: Math.max(0, room.participants.size - 1),
    createdAt: room.createdAt
  });
});

app.post('/api/rooms/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const { peerId, role, name } = req.body;
  const normalizedId = roomId.toUpperCase();
  let room = rooms.get(normalizedId);

  // If host creates room implicitly by joining as host with custom code
  if (!room) {
    room = {
      id: normalizedId,
      hostId: role === 'host' ? peerId : '',
      title: 'Transmissão ao Vivo',
      createdAt: Date.now(),
      active: true,
      participants: new Map(),
      messages: []
    };
    rooms.set(normalizedId, room);
  }

  room.participants.set(peerId, {
    id: peerId,
    name: name || (role === 'host' ? 'Apresentador' : `Espectador-${peerId.slice(0, 4)}`),
    role: role || 'viewer',
    lastSeen: Date.now()
  });

  // Notify existing peers
  room.messages.push({
    id: Math.random().toString(36).substring(2, 9),
    senderId: peerId,
    type: 'joined',
    data: { peerId, role, name },
    timestamp: Date.now()
  });

  res.json({
    success: true,
    roomId: room.id,
    viewerCount: Math.max(0, room.participants.size - 1),
    hostPresent: !!room.hostId
  });
});

app.post('/api/rooms/:roomId/signal', (req, res) => {
  const { roomId } = req.params;
  const { senderId, targetId, type, data } = req.body;
  const room = rooms.get(roomId.toUpperCase());

  if (!room) {
    return res.status(404).json({ error: 'Sala não encontrada' });
  }

  // Update participant lastSeen
  if (room.participants.has(senderId)) {
    const p = room.participants.get(senderId)!;
    p.lastSeen = Date.now();
  }

  const message: SignalMessage = {
    id: Math.random().toString(36).substring(2, 9),
    senderId,
    targetId,
    type,
    data,
    timestamp: Date.now()
  };

  room.messages.push(message);

  // Cap message log to last 200
  if (room.messages.length > 200) {
    room.messages = room.messages.slice(-200);
  }

  res.json({ success: true, messageId: message.id });
});

app.get('/api/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  const { since = '0', peerId } = req.query;
  const room = rooms.get(roomId.toUpperCase());

  if (!room) {
    return res.status(404).json({ error: 'Sala não encontrada' });
  }

  const sinceTimestamp = parseInt(since as string, 10) || 0;
  
  // Filter messages newer than sinceTimestamp and either broadcast or targeted to this peer
  const relevantMessages = room.messages.filter(msg => {
    if (msg.timestamp <= sinceTimestamp) return false;
    if (msg.senderId === peerId) return false; // don't echo to self
    if (!msg.targetId) return true; // broadcast
    return msg.targetId === peerId;
  });

  // Keep participant active
  if (peerId && typeof peerId === 'string' && room.participants.has(peerId)) {
    room.participants.get(peerId)!.lastSeen = Date.now();
  }

  res.json({
    messages: relevantMessages,
    viewerCount: Math.max(0, room.participants.size - 1),
    timestamp: Date.now()
  });
});

app.post('/api/rooms/:roomId/leave', (req, res) => {
  const { roomId } = req.params;
  const { peerId } = req.body;
  const room = rooms.get(roomId.toUpperCase());

  if (room && peerId) {
    room.participants.delete(peerId);
    room.messages.push({
      id: Math.random().toString(36).substring(2, 9),
      senderId: peerId,
      type: 'left',
      data: { peerId },
      timestamp: Date.now()
    });
  }

  res.json({ success: true });
});

// Windows 1-Click Executable Launchers Download Endpoints
const getActiveUrl = (req: express.Request) => {
  const host = req.headers.host || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  return `${protocol}://${host}`;
};

app.get('/api/download/ScreenCast-Studio.bat', (req, res) => {
  const activeUrl = getActiveUrl(req);
  const batContent = `@echo off
title ScreenCast Studio
echo ========================================================
echo        Iniciando ScreenCast Studio no seu PC...
echo ========================================================
start msedge --app="${activeUrl}" 2>nul || start chrome --app="${activeUrl}" 2>nul || start ${activeUrl}
exit
`;
  res.setHeader('Content-Type', 'application/x-bat');
  res.setHeader('Content-Disposition', 'attachment; filename="ScreenCast-Studio.bat"');
  res.send(batContent);
});

app.get('/api/download/Criar-Atalho-Area-de-Trabalho.bat', (req, res) => {
  const activeUrl = getActiveUrl(req);
  const installContent = `@echo off
title Instalador ScreenCast Studio
chcp 65001 >nul
echo ========================================================
echo     Criando atalho do ScreenCast Studio no seu PC...
echo ========================================================
set "DESKTOP_DIR=%USERPROFILE%\\Desktop"
set "SHORTCUT_PATH=%DESKTOP_DIR%\\ScreenCast Studio.url"

echo [InternetShortcut] > "%SHORTCUT_PATH%"
echo URL=${activeUrl} >> "%SHORTCUT_PATH%"
echo IconIndex=0 >> "%SHORTCUT_PATH%"
echo IconFile=%SystemRoot%\\System32\\shell32.dll >> "%SHORTCUT_PATH%"

echo.
echo [SUCESSO] Atalho criado na sua Area de Trabalho!
echo Abrindo o ScreenCast Studio agora...
echo.
start "" "%SHORTCUT_PATH%"
timeout /t 3 >nul
exit
`;
  res.setHeader('Content-Type', 'application/x-bat');
  res.setHeader('Content-Disposition', 'attachment; filename="Instalar-Atalho-Area-de-Trabalho.bat"');
  res.send(installContent);
});

// Download whole source code as a ZIP archive
app.get('/api/download/screencast-studio.zip', async (_req, res) => {
  try {
    const zip = new JSZip();
    const rootDir = __dirname;

    function addFilesToZip(currentDir: string, zipFolder: JSZip) {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        if (
          item === 'node_modules' ||
          item === '.git' ||
          item === 'dist' ||
          item === '.DS_Store'
        ) {
          continue;
        }
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const subFolder = zipFolder.folder(item);
          if (subFolder) {
            addFilesToZip(fullPath, subFolder);
          }
        } else {
          const content = fs.readFileSync(fullPath);
          zipFolder.file(item, content);
        }
      }
    }

    addFilesToZip(rootDir, zip);

    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="screencast-studio.zip"');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Error generating zip archive:', error);
    res.status(500).json({ error: 'Erro ao gerar o arquivo zip' });
  }
});

// Vite middleware in dev or static files in prod
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`ScreenCast Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
