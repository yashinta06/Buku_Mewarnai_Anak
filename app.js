import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBbNz5rX7XPZ-8uHMGwvr70dyz3KrmZyNg",
    authDomain: "buku-mewarnai-anak-9b93f.firebaseapp.com",
    projectId: "buku-mewarnai-anak-9b93f",
    storageBucket: "buku-mewarnai-anak-9b93f.firebasestorage.app",
    messagingSenderId: "662992684485",
    appId: "1:662992684485:web:8abd965af0ba9038abf7ac",
    measurementId: "G-8M9NVJR8W3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log("Firebase connected!");

function getUserId() {
    let id = localStorage.getItem('mewarnai_user_id');
    if (!id) { id = 'user_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('mewarnai_user_id', id); }
    return id;
}
const userId = getUserId();

const state = {
    currentColor: '#FF6B6B', currentTool: 'brush', brushSize: 12,
    isDrawing: false, currentImageIndex: 0, currentCategory: 'hewan',
    undoStack: [], maxUndo: 20, canvasReady: false
};

// ===== 1 CANVAS SAJA =====
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
let currentLineArtImage = null; // Simpan gambar line art saat ini

const categories = [
    { id: 'hewan', name: 'Hewan', icon: '🐱' },
    { id: 'bunga', name: 'Bunga', icon: '🌸' },
    { id: 'alam', name: 'Alam', icon: '🌿' },
    { id: 'kendaraan', name: 'Kendaraan', icon: '🚀' }
];

const images = [
    { name: "Kucing", category: "hewan", src: "images/kucing.jpeg" },
    { name: "Anjing", category: "hewan", src: "images/anjing.jpeg" },
    { name: "Ikan", category: "hewan", src: "images/ikan.jpeg" },
    { name: "Kambing", category: "hewan", src: "images/kambing.jpeg" },
    { name: "Lumba-lumba", category: "hewan", src: "images/lumba.jpeg" },
    { name: "Sapi", category: "hewan", src: "images/sapi.jpeg" },
    { name: "Dinosaurus", category: "hewan", src: "images/dino.jpeg" },
    { name: "Mawar", category: "bunga", src: "images/mawar.jpeg" },
    { name: "Melati", category: "bunga", src: "images/melati.jpeg" },
    { name: "Tulip", category: "bunga", src: "images/tulip.jpeg" },
    { name: "Gunung", category: "alam", src: "images/gunung.jpeg" },
    { name: "Matahari", category: "alam", src: "images/matahari.jpeg" },
    { name: "Pantai", category: "alam", src: "images/pantai.jpeg" },
    { name: "Sungai", category: "alam", src: "images/sungai.jpeg" },
    { name: "Taman", category: "alam", src: "images/taman.jpeg" },
    { name: "Becak", category: "kendaraan", src: "images/becak.jpeg" },
    { name: "Mobil", category: "kendaraan", src: "images/mobil.jpeg" },
    { name: "Motor", category: "kendaraan", src: "images/motor.jpeg" },
    { name: "Pesawat", category: "kendaraan", src: "images/pesawat.jpeg" },
    { name: "Sepeda", category: "kendaraan", src: "images/sepeda.jpeg" }
];

const paletteColors = [
    '#FF6B6B','#FF8E8E','#FFB4B4','#FF9F43','#FFBE76','#FFDAB3',
    '#FECA57','#FFEAA7','#FFF3CD','#10B981','#34D399','#A7F3D0',
    '#3B82F6','#60A5FA','#BFDBFE','#8B5CF6','#A78BFA','#DDD6FE',
    '#EC4899','#F472B6','#FBCFE8','#F97316','#FB923C','#FED7AA',
    '#000000','#555555','#AAAAAA','#FFFFFF','#F5F5DC','#DEB887'
];

const imageCache = {};

document.addEventListener('DOMContentLoaded', function() {
    setupPalette();
    setupCategories();
    setupEventListeners();
    loadRecentDrawings();
    preloadAllImages();

    setTimeout(function() {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('slide1').style.display = 'flex';
    }, 700);

    document.getElementById('btnStart').addEventListener('click', function() { showSlide(2); });
});

function showSlide(n) {
    document.querySelectorAll('.slide').forEach(function(s) { s.style.display = 'none'; });
    if (n === 1) document.getElementById('slide1').style.display = 'flex';
    else if (n === 2) { document.getElementById('slide2').style.display = 'block'; loadRecentDrawings(); }
    else if (n === 3) { document.getElementById('slide3').style.display = 'block'; setupPicker(); }
    else if (n === 4) { document.getElementById('slide4').style.display = 'block'; setTimeout(setupCanvas, 100); }
}

function preloadAllImages() {
    images.forEach(function(img) {
        const image = new Image();
        image.onload = function() { imageCache[img.src] = image; };
        image.src = img.src;
    });
}

function setupCategories() {
    const grid = document.getElementById('categoryGrid');
    grid.innerHTML = '';
    categories.forEach(function(cat) {
        const card = document.createElement('div');
        card.className = 'category-card';
        const iconDiv = document.createElement('div'); iconDiv.className = 'category-icon'; iconDiv.textContent = cat.icon;
        const nameDiv = document.createElement('div'); nameDiv.className = 'category-name'; nameDiv.textContent = cat.name;
        card.appendChild(iconDiv); card.appendChild(nameDiv);
        card.addEventListener('click', function() {
            state.currentCategory = cat.id; state.currentImageIndex = 0;
            document.getElementById('pickerCategoryName').textContent = cat.icon + ' ' + cat.name;
            document.getElementById('pickerTitle').textContent = cat.name;
            showSlide(3);
        });
        grid.appendChild(card);
    });
}

function setupPicker() {
    const grid = document.getElementById('pickerGrid');
    grid.innerHTML = '';
    const catImages = getImagesByCategory(state.currentCategory);
    if (catImages.length === 0) { grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#7A7A7A;padding:40px;">Belum ada gambar</p>'; return; }
    catImages.forEach(function(img, index) {
        const card = document.createElement('div'); card.className = 'picker-card';
        const imgEl = document.createElement('img'); imgEl.className = 'picker-card-img'; imgEl.src = img.src; imgEl.alt = img.name;
        const nameEl = document.createElement('div'); nameEl.className = 'picker-card-name'; nameEl.textContent = img.name;
        card.appendChild(imgEl); card.appendChild(nameEl);
        card.addEventListener('click', function() {
            state.currentImageIndex = index;
            document.getElementById('canvasTitle').textContent = img.name;
            document.getElementById('currentImageName').textContent = img.name;
            showSlide(4);
            setTimeout(function() { loadImageToCanvas(img); setupImageSelector(); }, 200);
        });
        grid.appendChild(card);
    });
}

function getImagesByCategory(catId) { return images.filter(function(img) { return img.category === catId; }); }

// ===== CANVAS SETUP =====
function setupCanvas() {
    if (state.canvasReady) return;
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) { setTimeout(setupCanvas, 100); return; }

    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    state.canvasReady = true;
    console.log("Canvas ready:", canvas.width, "x", canvas.height);

    // Jika ada gambar line art yang sudah dipilih, draw sekarang
    if (currentLineArtImage) {
        drawLineArtToCanvas(currentLineArtImage);
    }
}

function drawLineArtToCanvas(img) {
    if (!state.canvasReady) { setTimeout(function() { drawLineArtToCanvas(img); }, 100); return; }
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.9;
    const x = (canvas.width - img.width * scale) / 2;
    const y = (canvas.height - img.height * scale) / 2;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    console.log("Line art drawn:", img.width, "x", img.height);
}

function loadImageToCanvas(imgData) {
    let img = imageCache[imgData.src];
    if (img && img.complete) {
        currentLineArtImage = img;
        if (state.canvasReady) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            drawLineArtToCanvas(img);
            state.undoStack = [];
            saveUndoState();
        }
    } else {
        img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function() {
            imageCache[imgData.src] = img;
            currentLineArtImage = img;
            if (state.canvasReady) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                drawLineArtToCanvas(img);
                state.undoStack = [];
                saveUndoState();
            }
        };
        img.onerror = function() { console.error("Failed to load:", imgData.src); };
        img.src = imgData.src;
    }
}

function resizeCanvas() {
    if (!state.canvasReady) return;
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
    tempCanvas.getContext('2d').drawImage(canvas, 0, 0);

    canvas.width = rect.width * 2; canvas.height = rect.height * 2;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
}

function setupImageSelector() {
    const list = document.getElementById('imageList');
    list.innerHTML = '';
    const catImages = getImagesByCategory(state.currentCategory);
    catImages.forEach(function(img, index) {
        const thumb = document.createElement('div');
        thumb.className = 'image-thumb' + (index === state.currentImageIndex ? ' active' : '');
        const imgEl = document.createElement('img'); imgEl.src = img.src; imgEl.alt = img.name;
        thumb.appendChild(imgEl);
        thumb.addEventListener('click', function() { selectImage(index, thumb, img); });
        list.appendChild(thumb);
    });
}

function selectImage(index, element, imgData) {
    if (state.undoStack.length > 1) { if (!confirm('Ganti gambar?')) return; }
    state.currentImageIndex = index;
    document.getElementById('currentImageName').textContent = imgData.name;
    document.getElementById('canvasTitle').textContent = imgData.name;
    document.querySelectorAll('.image-thumb').forEach(function(t) { t.classList.remove('active'); });
    if (element) element.classList.add('active');
    if (state.canvasReady) { loadImageToCanvas(imgData); }
    showToast(imgData.name + ' dipilih!');
}

function setupPalette() {
    const palette = document.getElementById('colorPalette');
    paletteColors.forEach(function(color, index) {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch' + (index === 0 ? ' active' : '');
        swatch.style.backgroundColor = color;
        swatch.addEventListener('click', function() { selectColor(color, swatch); });
        palette.appendChild(swatch);
    });
}

function selectColor(color, element) {
    state.currentColor = color; state.currentTool = 'brush';
    document.getElementById('customColor').value = color;
    document.querySelectorAll('.color-swatch').forEach(function(s) { s.classList.remove('active'); });
    if (element) element.classList.add('active');
    updateToolButtons();
}

function setupEventListeners() {
    document.getElementById('btnBrush').addEventListener('click', function() { state.currentTool = 'brush'; updateToolButtons(); });
    document.getElementById('btnEraser').addEventListener('click', function() { state.currentTool = 'eraser'; updateToolButtons(); });
    document.getElementById('btnFill').addEventListener('click', function() { state.currentTool = 'fill'; updateToolButtons(); });

    const brushSize = document.getElementById('brushSize');
    const sizeValue = document.getElementById('sizeValue');
    brushSize.addEventListener('input', function(e) { state.brushSize = parseInt(e.target.value); sizeValue.textContent = state.brushSize; });

    document.getElementById('customColor').addEventListener('input', function(e) {
        state.currentColor = e.target.value; state.currentTool = 'brush';
        document.querySelectorAll('.color-swatch').forEach(function(s) { s.classList.remove('active'); });
        updateToolButtons();
    });

    document.getElementById('btnUndo').addEventListener('click', undo);
    document.getElementById('btnClear').addEventListener('click', clearCanvas);
    document.getElementById('btnSave').addEventListener('click', function() { document.getElementById('saveModal').classList.add('show'); });
    document.getElementById('closeSave').addEventListener('click', function() { document.getElementById('saveModal').classList.remove('show'); });
    document.getElementById('btnDownload').addEventListener('click', downloadDrawing);
    document.getElementById('btnSaveCloud').addEventListener('click', saveToCloud);
    document.getElementById('btnGalleryHome').addEventListener('click', openGallery);
    document.getElementById('btnGalleryPicker').addEventListener('click', openGallery);
    document.getElementById('btnGalleryCanvas').addEventListener('click', openGallery);
    document.getElementById('closeGallery').addEventListener('click', function() { document.getElementById('galleryModal').classList.remove('show'); });
    document.getElementById('btnBackToHome').addEventListener('click', function() { showSlide(2); });
    document.getElementById('btnBackToPicker').addEventListener('click', function() { showSlide(3); });

    // Event listener di 1 canvas saja
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);
    canvas.addEventListener('click', handleClick);

    window.addEventListener('resize', function() { if (state.canvasReady) resizeCanvas(); });
}

function updateToolButtons() {
    document.querySelectorAll('.tool-btn').forEach(function(btn) { btn.classList.remove('active'); });
    if (state.currentTool === 'brush') document.getElementById('btnBrush').classList.add('active');
    if (state.currentTool === 'eraser') document.getElementById('btnEraser').classList.add('active');
    if (state.currentTool === 'fill') document.getElementById('btnFill').classList.add('active');
}

function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
    else if (e.changedTouches && e.changedTouches.length > 0) { clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY; }
    else { clientX = e.clientX; clientY = e.clientY; }
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

function handleTouchStart(e) {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    if (state.currentTool === 'fill') { floodFill(Math.round(coords.x), Math.round(coords.y), state.currentColor); saveUndoState(); }
    else { startDrawingAt(coords.x, coords.y); }
}

function handleTouchMove(e) { e.preventDefault(); const coords = getCanvasCoords(e); drawAt(coords.x, coords.y); }

function startDrawing(e) { if (state.currentTool === 'fill') return; const coords = getCanvasCoords(e); startDrawingAt(coords.x, coords.y); }

function startDrawingAt(x, y) {
    state.isDrawing = true;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1);
    ctx.strokeStyle = state.currentTool === 'eraser' ? 'white' : state.currentColor;
    ctx.lineWidth = state.brushSize * 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke();
}

function draw(e) { if (!state.isDrawing || state.currentTool === 'fill') return; const coords = getCanvasCoords(e); drawAt(coords.x, coords.y); }

function drawAt(x, y) {
    if (!state.isDrawing) return;
    ctx.lineTo(x, y);
    ctx.strokeStyle = state.currentTool === 'eraser' ? 'white' : state.currentColor;
    ctx.lineWidth = state.brushSize * 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
}

function stopDrawing() { if (state.isDrawing) { state.isDrawing = false; ctx.beginPath(); saveUndoState(); } }

function handleClick(e) {
    if (state.currentTool === 'fill') { const coords = getCanvasCoords(e); floodFill(Math.round(coords.x), Math.round(coords.y), state.currentColor); saveUndoState(); }
}

function floodFill(startX, startY, fillColor) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width, height = canvas.height;
    const startPos = (startY * width + startX) * 4;
    const startR = data[startPos], startG = data[startPos+1], startB = data[startPos+2], startA = data[startPos+3];
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = fillColor; tempCtx.fillRect(0, 0, 1, 1);
    const fillData = tempCtx.getImageData(0, 0, 1, 1).data;
    const fillR = fillData[0], fillG = fillData[1], fillB = fillData[2], fillA = fillData[3];
    if (startR === fillR && startG === fillG && startB === fillB && startA === fillA) return;
    const tolerance = 30;
    const stack = [[startX, startY]];
    const visited = new Uint8Array(width * height);
    function matchesColor(pos) {
        return Math.abs(data[pos]-startR)<=tolerance && Math.abs(data[pos+1]-startG)<=tolerance && Math.abs(data[pos+2]-startB)<=tolerance && Math.abs(data[pos+3]-startA)<=tolerance;
    }
    while (stack.length > 0) {
        const xy = stack.pop(); const x = xy[0], y = xy[1];
        const pos = (y * width + x) * 4; const visitedPos = y * width + x;
        if (x<0||x>=width||y<0||y>=height) continue;
        if (visited[visitedPos]) continue;
        if (!matchesColor(pos)) continue;
        visited[visitedPos] = 1;
        data[pos]=fillR; data[pos+1]=fillG; data[pos+2]=fillB; data[pos+3]=fillA;
        stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    }
    ctx.putImageData(imageData, 0, 0);
}

function saveUndoState() {
    if (canvas.width === 0 || canvas.height === 0) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    state.undoStack.push(imageData);
    if (state.undoStack.length > state.maxUndo) state.undoStack.shift();
}

function undo() {
    if (state.undoStack.length <= 1) { showToast('Tidak ada undo'); return; }
    state.undoStack.pop();
    ctx.putImageData(state.undoStack[state.undoStack.length - 1], 0, 0);
    showToast('Undo!');
}

function clearCanvas() {
    if (confirm('Hapus semua warna?')) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Redraw line art
        if (currentLineArtImage) { drawLineArtToCanvas(currentLineArtImage); }
        state.undoStack = [];
        saveUndoState();
        showToast('Canvas dibersihkan!');
    }
}

function downloadDrawing() {
    const link = document.createElement('a');
    link.download = 'mewarnai-' + Date.now() + '.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    showToast('Download berhasil!');
    document.getElementById('saveModal').classList.remove('show');
}

async function saveToCloud() {
    const title = document.getElementById('drawingTitle').value.trim();
    if (!title) { showToast('Masukkan judul dulu!'); return; }

    const saveStatus = document.getElementById('saveStatus');
    const btnSaveCloud = document.getElementById('btnSaveCloud');
    btnSaveCloud.disabled = true;
    btnSaveCloud.textContent = 'Menyimpan...';
    saveStatus.className = 'save-status';
    saveStatus.style.display = 'none';

    try {
        const imageDataUrl = canvas.toDataURL('image/png');
        const imageName = document.getElementById('currentImageName').textContent;

        // KIRIM KE SERVER (simpan sebagai file PNG di folder images/saved/)
        const response = await fetch('http://localhost:3001/save-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageData: imageDataUrl,
                title: title,
                imageName: imageName
            })
        });

        if (!response.ok) throw new Error('Server error');
        const result = await response.json();

        if (result.success) {
            console.log('✅ Saved to folder:', result.filename);
            saveStatus.className = 'save-status success';
            saveStatus.textContent = 'Berhasil disimpan ke folder!';
            saveStatus.style.display = 'block';
            btnSaveCloud.textContent = 'Tersimpan!';
            showToast('Karya disimpan!');

            setTimeout(function() {
                document.getElementById('saveModal').classList.remove('show');
                btnSaveCloud.disabled = false;
                btnSaveCloud.textContent = 'Simpan ke Galeri';
                saveStatus.style.display = 'none';
                document.getElementById('drawingTitle').value = '';
            }, 1500);
        } else {
            throw new Error(result.error || 'Gagal menyimpan');
        }
    } catch (error) {
        console.error('Save error:', error);
        saveStatus.className = 'save-status error';
        saveStatus.textContent = 'Gagal: ' + error.message + '. Pastikan server.js berjalan!';
        saveStatus.style.display = 'block';
        btnSaveCloud.disabled = false;
        btnSaveCloud.textContent = 'Simpan ke Galeri';
    }
}

async function openGallery() {
    const modal = document.getElementById('galleryModal');
    const content = document.getElementById('galleryContent');
    modal.classList.add('show');
    content.innerHTML = '<p style="text-align:center;padding:20px;">Memuat dari server...</p>';

    try {
        const response = await fetch('http://localhost:3001/api/gallery');
        
        if (!response.ok) throw new Error('Server tidak merespon');
        
        const result = await response.json();
        
        if (!result.success || !result.drawings || result.drawings.length === 0) {
            content.innerHTML = '<p style="text-align:center;color:#7A7A7A;padding:40px;">Belum ada karya. Yuk mulai mewarnai!</p>';
            return;
        }

        const drawings = result.drawings;
        let html = '<div class="gallery-grid">';
        
        drawings.forEach(function(item) {
            const date = new Date(item.createdAt).toLocaleDateString('id-ID');
            const imageUrl = 'http://localhost:3001' + item.url;
            
            html += '<div class="gallery-item">';
            html += '<img src="' + imageUrl + '" alt="' + item.title + '" onerror="this.style.background=\'#f0f0f0\'">';
            html += '<div class="gallery-item-info"><strong>' + item.title + '</strong><small>' + date + '</small></div>';
            html += '<div class="gallery-item-actions">';
            html += '<button class="btn-view" data-url="' + imageUrl + '" data-title="' + item.title + '">Lihat</button>';
            html += '<button class="btn-download" data-url="' + imageUrl + '" data-title="' + item.title + '">Download</button>';
            html += '<button class="btn-delete" data-filename="' + item.filename + '">Hapus</button>';
            html += '</div></div>';
        });
        html += '</div>';
        content.innerHTML = html;

        // Event: Lihat
        content.querySelectorAll('.btn-view').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const win = window.open();
                win.document.write('<html><head><title>' + btn.dataset.title + '</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f0f0f0;}img{max-width:100%;max-height:100vh;}</style></head><body><img src="' + btn.dataset.url + '"></body></html>');
            });
        });

        // Event: Download
        content.querySelectorAll('.btn-download').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const link = document.createElement('a');
                link.download = btn.dataset.title + '.png';
                link.href = btn.dataset.url;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showToast('Download berhasil!');
            });
        });

        // Event: Hapus
        content.querySelectorAll('.btn-delete').forEach(function(btn) {
            btn.addEventListener('click', async function() {
                if (!confirm('Hapus karya ini?')) return;
                try {
                    const delResponse = await fetch('http://localhost:3001/api/gallery/' + btn.dataset.filename, {
                        method: 'DELETE'
                    });
                    const delResult = await delResponse.json();
                    if (delResult.success) {
                        showToast('Dihapus!');
                        openGallery();
                    } else {
                        showToast('Gagal hapus: ' + delResult.error);
                    }
                } catch (err) {
                    showToast('Gagal: ' + err.message);
                }
            });
        });

    } catch (error) {
        console.error('Gallery error:', error);
        content.innerHTML = '<p style="color:red;text-align:center;padding:20px;">Gagal memuat galeri.<br>Pastikan server.js berjalan!<br><small>' + error.message + '</small></p>';
    }
}

async function loadRecentDrawings() {
    const container = document.getElementById('recentDrawings');
    container.innerHTML = '<p style="text-align:center;color:#7A7A7A;grid-column:1/-1;">Memuat...</p>';

    try {
        const response = await fetch('http://localhost:3001/api/gallery');
        if (!response.ok) throw new Error('Server error');
        
        const result = await response.json();
        
        if (!result.success || !result.drawings || result.drawings.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#7A7A7A;grid-column:1/-1;">Belum ada karya</p>';
            return;
        }

        let html = '';
        result.drawings.slice(0, 6).forEach(function(item) {
            const imageUrl = 'http://localhost:3001' + item.url;
            html += '<div class="recent-item"><img src="' + imageUrl + '" alt="' + item.title + '" onerror="this.style.background=\'#f0f0f0\'"></div>';
        });
        container.innerHTML = html;
    } catch (error) {
        console.error('Recent drawings error:', error);
        container.innerHTML = '<p style="text-align:center;color:#7A7A7A;grid-column:1/-1;">Server tidak berjalan</p>';
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message; toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 2500);
}