const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const SAVED_FOLDER = path.join(__dirname, 'images', 'saved');

// Buat folder saved kalau belum ada
if (!fs.existsSync(SAVED_FOLDER)) {
    fs.mkdirSync(SAVED_FOLDER, { recursive: true });
    console.log('📁 Folder created:', SAVED_FOLDER);
}

const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // ===== GET: List semua gambar tersimpan =====
    if (req.method === 'GET' && req.url === '/api/gallery') {
        try {
            const files = fs.readdirSync(SAVED_FOLDER)
                .filter(f => f.endsWith('.png'))
                .map(filename => {
                    const filePath = path.join(SAVED_FOLDER, filename);
                    const stats = fs.statSync(filePath);
                    // Parse nama file: Judul_timestamp.png
                    const parts = filename.replace('.png', '').split('_');
                    const timestamp = parseInt(parts[parts.length - 1]);
                    const title = parts.slice(0, -1).join(' ').replace(/_/g, ' ');
                    
                    return {
                        id: filename,
                        title: title || 'Tanpa Judul',
                        filename: filename,
                        createdAt: stats.mtime.toISOString(),
                        url: '/images/saved/' + filename
                    };
                })
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, drawings: files }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
    }

    // ===== GET: Serve gambar dari folder saved =====
    if (req.method === 'GET' && req.url.startsWith('/images/saved/')) {
        const filename = path.basename(req.url);
        const filePath = path.join(SAVED_FOLDER, filename);
        
        if (fs.existsSync(filePath)) {
            const imgData = fs.readFileSync(filePath);
            res.writeHead(200, { 'Content-Type': 'image/png' });
            res.end(imgData);
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
        return;
    }

    // ===== POST: Simpan gambar baru =====
    if (req.method === 'POST' && req.url === '/save-image') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { imageData, title, imageName } = data;
                
                const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                
                const safeTitle = (title || 'gambar').replace(/[^a-zA-Z0-9]/g, '_');
                const filename = safeTitle + '_' + Date.now() + '.png';
                const filepath = path.join(SAVED_FOLDER, filename);
                
                fs.writeFileSync(filepath, buffer);
                console.log('✅ Saved:', filename);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    filename: filename,
                    url: '/images/saved/' + filename
                }));
            } catch (error) {
                console.error('❌ Error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }

    // ===== DELETE: Hapus gambar =====
    if (req.method === 'DELETE' && req.url.startsWith('/api/gallery/')) {
        const filename = req.url.split('/').pop();
        const filePath = path.join(SAVED_FOLDER, filename);
        
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('🗑️ Deleted:', filename);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'File not found' }));
            }
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log('🚀 Server running at http://localhost:' + PORT);
    console.log('📁 Saved images folder:', SAVED_FOLDER);
});