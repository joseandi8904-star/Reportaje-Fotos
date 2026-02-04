// ===============================================
// REPORTES FOTOGRÁFICOS - v3.0 MEJORADO
// ===============================================

// Configuración global
const CONFIG = {
    maxPhotosPerPage: 12,  // ¡AHORA HASTA 12 FOTOS!
    compressionQuality: 0.8,
    maxImageSize: 1920,
    autoSave: true,
    pdfTemplate: 'default',
    pdfAlignment: 'center',
    darkMode: false,
    logoImage: null,
    bottomText: 'Período del 01 de septiembre al 30 de septiembre de 2025 - INSTITUCIÓN EDUCATIVA',
    titleSize: 14,
    bottomSize: 8,
    logoSize: 20
};

// Variables globales
let currentReport = {
    id: null,
    title: 'Reporte 1',
    pages: [{ photos: [] }],
    createdAt: new Date(),
    logoImage: CONFIG.logoImage,
    bottomText: CONFIG.bottomText
};

let reports = [];
let currentPhotoIndex = null;
let currentPageIndex = 0;
let isZoomed = false;
let pdfInstance = null;
let sortableInstance = null;

// ===============================================
// INICIALIZACIÓN
// ===============================================

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        loadSettings();
        await loadReports();
        updateStats();
        renderReports();
        
        if (CONFIG.darkMode) {
            document.body.classList.add('dark-mode');
            document.getElementById('darkModeToggle').checked = true;
        }
        
        setupDragAndDrop();
        registerServiceWorker();
        
        console.log('✅ App inicializada correctamente');
    } catch (error) {
        console.error('❌ Error al inicializar:', error);
        showToast('⚠️ Error al cargar la aplicación');
    }
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('✅ Service Worker registrado'))
            .catch(err => console.error('❌ Error al registrar SW:', err));
    }
}

// ===============================================
// COMPRESIÓN DE IMÁGENES
// ===============================================

async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            
            img.onload = function() {
                try {
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > CONFIG.maxImageSize || height > CONFIG.maxImageSize) {
                        if (width > height) {
                            height = (height / width) * CONFIG.maxImageSize;
                            width = CONFIG.maxImageSize;
                        } else {
                            width = (width / height) * CONFIG.maxImageSize;
                            height = CONFIG.maxImageSize;
                        }
                    }
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob(
                        (blob) => resolve(blob),
                        'image/jpeg',
                        CONFIG.compressionQuality
                    );
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = reject;
            img.src = e.target.result;
        };
        
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// ===============================================
// MANEJO DE IMÁGENES
// ===============================================

async function handleImageUpload(event) {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;
    
    showLoading('Procesando imágenes...');
    
    try {
        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            
            const compressedBlob = await compressImage(file);
            const base64 = await blobToBase64(compressedBlob);
            
            const photo = {
                id: Date.now() + Math.random(),
                data: base64,
                note: '',
                timestamp: new Date()
            };
            
            addPhotoToCurrentPage(photo);
        }
        
        renderPhotos();
        if (CONFIG.autoSave) saveCurrentReport();
        
        event.target.value = '';
        hideLoading();
        showToast('✅ Fotos agregadas correctamente');
    } catch (error) {
        hideLoading();
        showToast('❌ Error al procesar las imágenes');
        console.error(error);
    }
}

function addPhotoToCurrentPage(photo) {
    const currentPage = currentReport.pages[currentPageIndex];
    
    if (currentPage.photos.length >= CONFIG.maxPhotosPerPage) {
        currentReport.pages.push({ photos: [photo] });
        currentPageIndex = currentReport.pages.length - 1;
    } else {
        currentPage.photos.push(photo);
    }
}

// ===============================================
// NAVEGACIÓN
// ===============================================

function showHome() {
    document.getElementById('newReportScreen').classList.remove('active');
    document.getElementById('homeScreen').classList.add('active');
    updateStats();
    renderReports();
}

function showNewReport() {
    currentReport = {
        id: Date.now(),
        title: `Reporte ${reports.length + 1}`,
        pages: [{ photos: [] }],
        createdAt: new Date(),
        logoImage: CONFIG.logoImage,
        bottomText: CONFIG.bottomText
    };
    
    currentPageIndex = 0;
    document.getElementById('reportTitle').textContent = currentReport.title;
    document.getElementById('homeScreen').classList.remove('active');
    document.getElementById('newReportScreen').classList.add('active');
    renderPhotos();
}

function openReport(reportId) {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    
    currentReport = JSON.parse(JSON.stringify(report));
    currentPageIndex = 0;
    
    document.getElementById('reportTitle').textContent = currentReport.title;
    document.getElementById('homeScreen').classList.remove('active');
    document.getElementById('newReportScreen').classList.add('active');
    renderPhotos();
}

// ===============================================
// RENDERIZADO DE FOTOS
// ===============================================

function renderPhotos() {
    const grid = document.getElementById('photosGrid');
    const currentPage = currentReport.pages[currentPageIndex];
    
    if (!currentPage || currentPage.photos.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📸</div>
                <p>No hay fotos aún</p>
                <p class="empty-subtitle">Agrega fotos desde la cámara, galería o arrastra aquí</p>
            </div>
        `;
        updatePhotoCounter();
        return;
    }
    
    grid.innerHTML = '';
    
    currentPage.photos.forEach((photo, index) => {
        const photoCard = document.createElement('div');
        photoCard.className = 'photo-card';
        photoCard.innerHTML = `
            <img src="${photo.data}" alt="Foto ${index + 1}" draggable="false">
            <div class="photo-overlay">
                <button class="photo-btn" data-action="view" data-index="${index}">👁️</button>
                <button class="photo-btn" data-action="delete" data-index="${index}">🗑️</button>
            </div>
            ${photo.note ? `<div class="photo-note-preview">📝 ${photo.note.substring(0, 30)}...</div>` : ''}
        `;
        
        // Agregar event listeners a los botones
        const viewBtn = photoCard.querySelector('[data-action="view"]');
        const deleteBtn = photoCard.querySelector('[data-action="delete"]');
        
        viewBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            viewPhoto(index);
        });
        
        viewBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            viewPhoto(index);
        });
        
        deleteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            deletePhoto(index);
        });
        
        deleteBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            deletePhoto(index);
        });
        
        grid.appendChild(photoCard);
    });
    
    updatePhotoCounter();
    initSortable();
}

function updatePhotoCounter() {
    const currentPage = currentReport.pages[currentPageIndex];
    const photoCount = currentPage ? currentPage.photos.length : 0;
    
    document.getElementById('currentPhoto').textContent = photoCount;
    document.getElementById('currentPageNum').textContent = currentPageIndex + 1;
}

function initSortable() {
    const grid = document.getElementById('photosGrid');
    
    if (sortableInstance) {
        sortableInstance.destroy();
    }
    
    if (typeof Sortable !== 'undefined') {
        sortableInstance = Sortable.create(grid, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            handle: '.photo-card',
            filter: '.photo-btn',
            preventOnFilter: false,
            onEnd: function(evt) {
                const currentPage = currentReport.pages[currentPageIndex];
                const item = currentPage.photos.splice(evt.oldIndex, 1)[0];
                currentPage.photos.splice(evt.newIndex, 0, item);
                
                if (CONFIG.autoSave) saveCurrentReport();
            }
        });
    }
}

// ===============================================
// MODAL DE FOTO
// ===============================================

function viewPhoto(index) {
    currentPhotoIndex = index;
    const currentPage = currentReport.pages[currentPageIndex];
    const photo = currentPage.photos[index];
    
    document.getElementById('modalImage').src = photo.data;
    document.getElementById('photoNote').value = photo.note || '';
    updateNoteCounter();
    
    document.getElementById('photoModal').classList.add('active');
    isZoomed = false;
}

function closePhotoModal() {
    document.getElementById('photoModal').classList.remove('active');
    currentPhotoIndex = null;
    isZoomed = false;
}

function savePhotoNote() {
    if (currentPhotoIndex === null) return;
    
    const currentPage = currentReport.pages[currentPageIndex];
    const note = document.getElementById('photoNote').value;
    currentPage.photos[currentPhotoIndex].note = note;
    
    renderPhotos();
    if (CONFIG.autoSave) saveCurrentReport();
    
    closePhotoModal();
    showToast('✅ Nota guardada');
}

function deleteCurrentPhoto() {
    if (currentPhotoIndex === null) return;
    
    if (confirm('¿Eliminar esta foto?')) {
        deletePhoto(currentPhotoIndex);
        closePhotoModal();
    }
}

function deletePhoto(index) {
    const currentPage = currentReport.pages[currentPageIndex];
    currentPage.photos.splice(index, 1);
    
    if (currentPage.photos.length === 0 && currentReport.pages.length > 1) {
        currentReport.pages.splice(currentPageIndex, 1);
        if (currentPageIndex >= currentReport.pages.length) {
            currentPageIndex = currentReport.pages.length - 1;
        }
    }
    
    renderPhotos();
    if (CONFIG.autoSave) saveCurrentReport();
    showToast('🗑️ Foto eliminada');
}

function toggleZoom() {
    const img = document.getElementById('modalImage');
    isZoomed = !isZoomed;
    img.style.transform = isZoomed ? 'scale(2)' : 'scale(1)';
}

function updateNoteCounter() {
    const noteInput = document.getElementById('photoNote');
    const counter = document.getElementById('noteLength');
    counter.textContent = noteInput.value.length;
}

document.getElementById('photoNote')?.addEventListener('input', updateNoteCounter);

// ===============================================
// GENERACIÓN DE PDF MEJORADO
// ===============================================

async function generatePDF() {
    const currentPage = currentReport.pages[currentPageIndex];
    
    if (!currentPage || currentPage.photos.length === 0) {
        showToast('⚠️ No hay fotos para generar el PDF');
        return;
    }
    
    showLoading('Generando PDF...');
    
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter'
        });
        
        pdfInstance = pdf;
        
        // Generar todas las páginas
        for (let pageIdx = 0; pageIdx < currentReport.pages.length; pageIdx++) {
            if (pageIdx > 0) {
                pdf.addPage();
            }
            
            await generatePDFPage(pdf, pageIdx);
        }
        
        hideLoading();
        
        // Descargar PDF directamente (optimizado para APK/Web2App)
        showPDFPreview(pdf);
        
    } catch (error) {
        hideLoading();
        console.error('Error generando PDF:', error);
        showToast('❌ Error al generar el PDF');
    }
}

async function generatePDFPage(pdf, pageIdx) {
    const page = currentReport.pages[pageIdx];
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    const margin = 10;
    const logoSize = CONFIG.logoSize || 20;
    const titleFontSize = CONFIG.titleSize || 14;
    const bottomFontSize = CONFIG.bottomSize || 8;

    // LOGO (si existe, a la izquierda arriba)
    let titleX = margin;
    let headerHeight = titleFontSize * 0.4 + 6; // altura dinámica según font
    if (currentReport.logoImage) {
        try {
            pdf.addImage(currentReport.logoImage, 'JPEG', margin, 2, logoSize, logoSize);
            titleX = margin + logoSize + 4;
            if (logoSize + 4 > headerHeight) headerHeight = logoSize + 4;
        } catch (e) {
            console.warn('Error agregando logo:', e);
        }
    }

    // TÍTULO (negro, sin fondo de color)
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(titleFontSize);
    pdf.setFont('helvetica', 'bold');
    const titleY = (headerHeight / 2) + (titleFontSize * 0.35);
    pdf.text(currentReport.title, titleX, titleY);

    // ÁREA DE CONTENIDO
    const contentY = headerHeight + 3;
    const contentHeight = pageHeight - headerHeight - 14;
    
    // CALCULAR GRID DE FOTOS
    const photos = page.photos;
    let cols, rows;
    
    if (photos.length <= 4) {
        cols = 2;
        rows = 2;
    } else if (photos.length <= 6) {
        cols = 3;
        rows = 2;
    } else if (photos.length <= 9) {
        cols = 3;
        rows = 3;
    } else {
        cols = 4;
        rows = 3;
    }
    
    const availableWidth = pageWidth - (2 * margin);
    const availableHeight = contentHeight;
    
    const cellWidth = availableWidth / cols;
    const cellHeight = availableHeight / rows;
    
    const photoMargin = 2;
    const photoWidth = cellWidth - (2 * photoMargin);
    const photoHeight = cellHeight - (2 * photoMargin) - 8; // Espacio para nota
    
    // AGREGAR FOTOS
    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        const x = margin + (col * cellWidth) + photoMargin;
        const y = contentY + (row * cellHeight) + photoMargin;
        
        try {
            // Calcular dimensiones manteniendo aspecto
            const img = await loadImage(photo.data);
            const imgRatio = img.width / img.height;
            const boxRatio = photoWidth / photoHeight;
            
            let drawWidth = photoWidth;
            let drawHeight = photoHeight;
            let drawX = x;
            let drawY = y;
            
            if (imgRatio > boxRatio) {
                drawHeight = photoWidth / imgRatio;
                drawY = y + (photoHeight - drawHeight) / 2;
            } else {
                drawWidth = photoHeight * imgRatio;
                drawX = x + (photoWidth - drawWidth) / 2;
            }
            
            // Dibujar foto
            pdf.addImage(photo.data, 'JPEG', drawX, drawY, drawWidth, drawHeight);
            
            // Agregar nota si existe
            if (photo.note) {
                pdf.setFontSize(7);
                pdf.setTextColor(0, 0, 0);
                pdf.setFont('helvetica', 'normal');
                const noteY = y + photoHeight + 4;
                const noteLines = pdf.splitTextToSize(photo.note, photoWidth);
                pdf.text(noteLines[0] || '', x, noteY);
            }
        } catch (error) {
            console.error('Error agregando foto:', error);
        }
    }
    
    // TEXTO INFERIOR (sin fondo, solo texto)
    pdf.setTextColor(80, 80, 80);
    pdf.setFontSize(bottomFontSize);
    pdf.setFont('helvetica', 'normal');
    const bottomText = currentReport.bottomText || CONFIG.bottomText;
    pdf.text(bottomText, pageWidth / 2, pageHeight - 11, { align: 'center' });

    // Número de página
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 120);
    pdf.text(`Página ${pageIdx + 1} de ${currentReport.pages.length}`, pageWidth / 2, pageHeight - 4, { align: 'center' });
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 107, b: 53 };
}

// ===============================================
// VISTA PREVIA PDF
// ===============================================

async function showPDFPreview(pdf) {
    try {
        // Generar nombre del archivo
        const fileName = currentReport.title.replace(/[^a-z0-9]/gi, '_') + '_' + Date.now() + '.pdf';
        
        // Método mejorado para APK/Web2App - Descarga forzada con Blob
        const pdfBlob = pdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        
        // Limpiar después de un momento
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        showToast('✅ PDF descargado en carpeta Descargas');
    } catch (error) {
        console.error('Error al descargar PDF:', error);
        showToast('❌ Error al descargar el PDF');
    }
}

function closePDFPreview() {
    document.getElementById('pdfPreviewModal').classList.remove('active');
}

async function downloadPDFFromPreview() {
    if (!pdfInstance) return;
    
    try {
        // Generar nombre del archivo
        const fileName = `${currentReport.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().getTime()}.pdf`;
        
        // Método mejorado para APK/Web2App - Descarga forzada con Blob
        const pdfBlob = pdfInstance.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        
        // Limpiar después de un momento
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        showToast('✅ PDF descargado en carpeta Descargas');
        closePDFPreview();
    } catch (error) {
        console.error('Error al descargar PDF:', error);
        showToast('❌ Error al descargar el PDF');
    }
}

// ===============================================
// CONFIGURACIÓN Y PERSONALIZACIÓN
// ===============================================

function showSettings() {
    document.getElementById('settingsModal').classList.add('active');
    
    // Cargar valores actuales
    document.getElementById('qualitySelect').value = CONFIG.compressionQuality;
    document.getElementById('darkModeToggle').checked = CONFIG.darkMode;
    document.getElementById('autoSaveToggle').checked = CONFIG.autoSave;
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('active');
}

async function uploadLogo() {
    closeMenu();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            showLoading('Procesando logo...');
            const compressedBlob = await compressImage(file);
            const base64 = await blobToBase64(compressedBlob);
            
            currentReport.logoImage = base64;
            CONFIG.logoImage = base64;
            
            if (CONFIG.autoSave) saveCurrentReport();
            saveSettings();
            
            hideLoading();
            showToast('✅ Logo actualizado');
        } catch (error) {
            hideLoading();
            showToast('❌ Error al cargar el logo');
            console.error(error);
        }
    };
    
    input.click();
}

function editBottomText() {
    const txt = prompt('Texto inferior de la hoja:', currentReport.bottomText || CONFIG.bottomText);
    if (txt !== null) {
        currentReport.bottomText = txt;
        if (CONFIG.autoSave) saveCurrentReport();
        showToast('✅ Texto inferior actualizado');
    }
    closeMenu();
}

// ===============================================
// MENÚ DE OPCIONES
// ===============================================

function showMenu() {
    document.getElementById('menuModal').classList.add('active');
}

function closeMenu() {
    document.getElementById('menuModal').classList.remove('active');
}

function editReportTitle() {
    const newTitle = prompt('Título (aparece arriba de la hoja en el PDF):', currentReport.title);
    if (newTitle && newTitle.trim()) {
        currentReport.title = newTitle.trim();
        document.getElementById('reportTitle').textContent = currentReport.title;
        if (CONFIG.autoSave) saveCurrentReport();
        showToast('✅ Título actualizado');
    }
    closeMenu();
}

function duplicateReport() {
    const duplicate = JSON.parse(JSON.stringify(currentReport));
    duplicate.id = Date.now();
    duplicate.title = `${duplicate.title} (copia)`;
    duplicate.createdAt = new Date();
    
    reports.push(duplicate);
    localStorage.setItem('reports', JSON.stringify(reports));
    
    showToast('✅ Reporte duplicado');
    closeMenu();
}

function clearAllPhotos() {
    if (confirm('¿Eliminar todas las fotos del reporte actual?')) {
        currentReport.pages = [{ photos: [] }];
        currentPageIndex = 0;
        renderPhotos();
        if (CONFIG.autoSave) saveCurrentReport();
        showToast('🗑️ Todas las fotos eliminadas');
    }
    closeMenu();
}

async function shareReport() {
    if (navigator.share) {
        try {
            await navigator.share({
                title: currentReport.title,
                text: `Reporte con ${currentReport.pages.reduce((sum, p) => sum + p.photos.length, 0)} fotos`
            });
        } catch (error) {
            console.log('Compartir cancelado');
        }
    } else {
        showToast('ℹ️ Compartir no disponible en este navegador');
    }
    closeMenu();
}

function exportReport() {
    const dataStr = JSON.stringify(currentReport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportName = `${currentReport.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
    
    showToast('✅ Reporte exportado');
    closeMenu();
}

// ===============================================
// GESTIÓN DE REPORTES
// ===============================================

async function loadReports() {
    try {
        const saved = localStorage.getItem('reports');
        reports = saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Error cargando reportes:', error);
        reports = [];
    }
}

function saveCurrentReport() {
    const index = reports.findIndex(r => r.id === currentReport.id);
    
    if (index >= 0) {
        reports[index] = currentReport;
    } else {
        reports.push(currentReport);
    }
    
    localStorage.setItem('reports', JSON.stringify(reports));
}

function deleteReport(reportId, event) {
    event.stopPropagation();
    
    if (confirm('¿Eliminar este reporte?')) {
        reports = reports.filter(r => r.id !== reportId);
        localStorage.setItem('reports', JSON.stringify(reports));
        renderReports();
        updateStats();
        showToast('🗑️ Reporte eliminado');
    }
}

function renderReports() {
    const container = document.getElementById('reportsContainer');
    
    if (reports.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <p>No hay reportes guardados</p>
                <p class="empty-subtitle">Crea tu primer reporte</p>
            </div>
        `;
        return;
    }
    
    // Ordenar reportes antes de renderizar
    sortReports();
    
    container.innerHTML = reports.map(report => {
        const totalPhotos = report.pages.reduce((sum, page) => sum + page.photos.length, 0);
        const date = new Date(report.createdAt).toLocaleDateString();
        
        return `
            <div class="report-card" onclick="openReport(${report.id})">
                <div class="report-info">
                    <h4>${report.title}</h4>
                    <p>📸 ${totalPhotos} foto(s) • 📄 ${report.pages.length} página(s)</p>
                    <p class="report-date">📅 ${date}</p>
                </div>
                <button class="btn-delete-report" onclick="deleteReport(${report.id}, event)">🗑️</button>
            </div>
        `;
    }).join('');
}

function sortReports() {
    const sortBy = document.getElementById('sortSelect')?.value || 'newest';
    
    switch(sortBy) {
        case 'newest':
            reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'oldest':
            reports.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'name':
            reports.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'photos':
            reports.sort((a, b) => {
                const aPhotos = a.pages.reduce((sum, p) => sum + p.photos.length, 0);
                const bPhotos = b.pages.reduce((sum, p) => sum + p.photos.length, 0);
                return bPhotos - aPhotos;
            });
            break;
    }
}

function searchReports() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const container = document.getElementById('reportsContainer');
    
    const filtered = reports.filter(report => 
        report.title.toLowerCase().includes(query)
    );
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <p>No se encontraron reportes</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(report => {
        const totalPhotos = report.pages.reduce((sum, page) => sum + page.photos.length, 0);
        const date = new Date(report.createdAt).toLocaleDateString();
        
        return `
            <div class="report-card" onclick="openReport(${report.id})">
                <div class="report-info">
                    <h4>${report.title}</h4>
                    <p>📸 ${totalPhotos} foto(s) • 📄 ${report.pages.length} página(s)</p>
                    <p class="report-date">📅 ${date}</p>
                </div>
                <button class="btn-delete-report" onclick="deleteReport(${report.id}, event)">🗑️</button>
            </div>
        `;
    }).join('');
}

// ===============================================
// ESTADÍSTICAS
// ===============================================

function updateStats() {
    const totalReports = reports.length;
    const totalPhotos = reports.reduce((sum, report) => 
        sum + report.pages.reduce((pageSum, page) => pageSum + page.photos.length, 0), 0
    );
    
    const storageSize = new Blob([JSON.stringify(reports)]).size;
    const storageMB = (storageSize / 1024 / 1024).toFixed(2);
    
    document.getElementById('totalReports').textContent = totalReports;
    document.getElementById('totalPhotos').textContent = totalPhotos;
    document.getElementById('storageUsed').textContent = `${storageMB} MB`;
    document.getElementById('storageDetails').textContent = `${storageMB} MB`;
}

// ===============================================
// CONFIGURACIÓN
// ===============================================

function loadSettings() {
    try {
        const saved = localStorage.getItem('config');
        if (saved) {
            const savedConfig = JSON.parse(saved);
            Object.assign(CONFIG, savedConfig);
        }
    } catch (error) {
        console.error('Error cargando configuración:', error);
    }
}

function saveSettings() {
    localStorage.setItem('config', JSON.stringify(CONFIG));
}

function toggleDarkMode() {
    CONFIG.darkMode = document.getElementById('darkModeToggle').checked;
    document.body.classList.toggle('dark-mode', CONFIG.darkMode);
    saveSettings();
}

function updateQuality() {
    CONFIG.compressionQuality = parseFloat(document.getElementById('qualitySelect').value);
    saveSettings();
    showToast('✅ Calidad actualizada');
}

function toggleAutoSave() {
    CONFIG.autoSave = document.getElementById('autoSaveToggle').checked;
    saveSettings();
}

function updatePDFAlignment() {
    CONFIG.pdfAlignment = document.getElementById('pdfAlignmentSelect').value;
    saveSettings();
    showToast('✅ Alineación PDF actualizada');
}

function updatePDFTemplate() {
    CONFIG.pdfTemplate = document.getElementById('pdfTemplateSelect').value;
    saveSettings();
    showToast('✅ Plantilla PDF actualizada');
}

function confirmClearAll() {
    if (confirm('⚠️ ¿Eliminar TODOS los reportes? Esta acción no se puede deshacer.')) {
        reports = [];
        localStorage.removeItem('reports');
        renderReports();
        updateStats();
        closeSettings();
        showToast('🗑️ Todos los reportes eliminados');
    }
}

function exportAllData() {
    const dataStr = JSON.stringify({ reports, config: CONFIG }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `backup_reportes_${Date.now()}.json`);
    linkElement.click();
    
    showToast('✅ Datos exportados');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.reports) {
                reports = data.reports;
                localStorage.setItem('reports', JSON.stringify(reports));
            }
            
            if (data.config) {
                Object.assign(CONFIG, data.config);
                saveSettings();
            }
            
            renderReports();
            updateStats();
            showToast('✅ Datos importados correctamente');
        } catch (error) {
            showToast('❌ Error al importar los datos');
            console.error(error);
        }
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

// ===============================================
// DRAG & DROP
// ===============================================

function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    
    if (!dropZone) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        });
    });
    
    dropZone.addEventListener('drop', handleDrop);
}

async function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files);
    
    showLoading('Procesando imágenes...');
    
    try {
        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            
            const compressedBlob = await compressImage(file);
            const base64 = await blobToBase64(compressedBlob);
            
            const photo = {
                id: Date.now() + Math.random(),
                data: base64,
                note: '',
                timestamp: new Date()
            };
            
            addPhotoToCurrentPage(photo);
        }
        
        renderPhotos();
        if (CONFIG.autoSave) saveCurrentReport();
        
        hideLoading();
        showToast('✅ Fotos agregadas correctamente');
    } catch (error) {
        hideLoading();
        showToast('❌ Error al procesar las imágenes');
        console.error(error);
    }
}

// ===============================================
// NOTAS DE TEXTO
// ===============================================

function addTextNote() {
    const note = prompt('Escribe una nota:');
    if (!note || !note.trim()) return;
    
    // Crear una imagen de texto
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#333';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const maxWidth = 700;
    const lineHeight = 35;
    const words = note.split(' ');
    let line = '';
    let y = canvas.height / 2 - 50;
    
    for (let word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && line !== '') {
            ctx.fillText(line, canvas.width / 2, y);
            line = word + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, canvas.width / 2, y);
    
    const photo = {
        id: Date.now(),
        data: canvas.toDataURL('image/jpeg', 0.9),
        note: note,
        timestamp: new Date()
    };
    
    addPhotoToCurrentPage(photo);
    renderPhotos();
    if (CONFIG.autoSave) saveCurrentReport();
    
    showToast('✅ Nota agregada');
}

// ===============================================
// UI HELPERS
// ===============================================

function showLoading(text = 'Cargando...') {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingModal').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingModal').classList.remove('active');
}

function showToast(message) {
    // Crear toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Cerrar modales al hacer click fuera
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
};


// ===============================================
// MODAL DE TAMAÑOS
// ===============================================

function showSizesModal() {
    closeMenu();
    document.getElementById('titleSizeSlider').value = CONFIG.titleSize || 14;
    document.getElementById('titleSizeValue').textContent = CONFIG.titleSize || 14;
    document.getElementById('bottomSizeSlider').value = CONFIG.bottomSize || 8;
    document.getElementById('bottomSizeValue').textContent = CONFIG.bottomSize || 8;
    document.getElementById('logoSizeSlider').value = CONFIG.logoSize || 20;
    document.getElementById('logoSizeValue').textContent = CONFIG.logoSize || 20;
    document.getElementById('sizesModal').classList.add('active');
}

function closeSizesModal() {
    document.getElementById('sizesModal').classList.remove('active');
    saveSettings();
    showToast('✅ Tamaños guardados');
}

function updateTitleSize() {
    const val = document.getElementById('titleSizeSlider').value;
    CONFIG.titleSize = parseInt(val);
    document.getElementById('titleSizeValue').textContent = val;
}

function updateBottomSize() {
    const val = document.getElementById('bottomSizeSlider').value;
    CONFIG.bottomSize = parseInt(val);
    document.getElementById('bottomSizeValue').textContent = val;
}

function updateLogoSize() {
    const val = document.getElementById('logoSizeSlider').value;
    CONFIG.logoSize = parseInt(val);
    document.getElementById('logoSizeValue').textContent = val;
}

console.log('✅ Reportes Fotográficos v3.0 - Cargado correctamente');