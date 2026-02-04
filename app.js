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
        
        // Intentar múltiples métodos de descarga para máxima compatibilidad
        await downloadPDFMultiMethod(pdf);
        
    } catch (error) {
        hideLoading();
        console.error('Error generando PDF:', error);
        showToast('❌ Error al generar el PDF');
    }
}

async function downloadPDFMultiMethod(pdf) {
    const fileName = currentReport.title.replace(/[^a-z0-9]/gi, '_') + '_' + Date.now() + '.pdf';
    const pdfBlob = pdf.output('blob');
    
    // Guardar referencia global
    window.currentPDFBlob = pdfBlob;
    window.currentPDFFileName = fileName;
    
    let downloadSuccess = false;
    
    // MÉTODO 1: File System Access API (Chrome/Edge moderno)
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: 'PDF Document',
                    accept: { 'application/pdf': ['.pdf'] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(pdfBlob);
            await writable.close();
            downloadSuccess = true;
            showToast('✅ PDF guardado exitosamente');
            showDownloadOptionsModal();
            return;
        } catch (e) {
            console.log('File System API no disponible:', e);
        }
    }
    
    // MÉTODO 2: Iframe con Blob URL (muy efectivo en APKs)
    try {
        const url = URL.createObjectURL(pdfBlob);
        
        // Crear iframe oculto para forzar descarga
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        
        // Intentar descarga desde el iframe
        setTimeout(() => {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const a = iframeDoc.createElement('a');
                a.href = url;
                a.download = fileName;
                iframeDoc.body.appendChild(a);
                a.click();
            } catch (e) {
                console.log('Descarga desde iframe falló:', e);
            }
        }, 100);
        
        // Método tradicional como backup
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        
        document.body.appendChild(a);
        
        // Múltiples intentos con diferentes timings
        a.click();
        setTimeout(() => a.click(), 100);
        setTimeout(() => a.click(), 300);
        setTimeout(() => a.click(), 500);
        
        // Limpiar después
        setTimeout(() => {
            try {
                document.body.removeChild(iframe);
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (e) {}
        }, 2000);
        
        downloadSuccess = true;
    } catch (e) {
        console.error('Método blob/iframe falló:', e);
    }
    
    // MÉTODO 3: Data URI directo
    if (!downloadSuccess) {
        try {
            const pdfData = pdf.output('dataurlstring');
            const a = document.createElement('a');
            a.href = pdfData;
            a.download = fileName;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => document.body.removeChild(a), 100);
            downloadSuccess = true;
        } catch (e) {
            console.error('Método data URI falló:', e);
        }
    }
    
    // MÉTODO 4: Abrir en nueva ventana (último recurso)
    if (!downloadSuccess) {
        try {
            const pdfDataUri = pdf.output('dataurlstring');
            window.open(pdfDataUri, '_blank');
        } catch (e) {
            console.error('Método nueva ventana falló:', e);
        }
    }
    
    // Mostrar modal de opciones siempre
    setTimeout(() => {
        showDownloadOptionsModal();
    }, 500);
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
// VISTA PREVIA PDF (Ya no se usa, pero se mantiene por compatibilidad)
// ===============================================

async function showPDFPreview(pdf) {
    // Esta función ahora solo llama al método multi-método
    await downloadPDFMultiMethod(pdf);
}

function showDownloadOptionsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'downloadOptionsModal';
    modal.innerHTML = `
        <div class="modal-content menu-modal">
            <div class="modal-header">
                <h2>📄 PDF Generado</h2>
                <button class="btn-close" onclick="closeDownloadOptions()">✕</button>
            </div>
            <div style="padding: 20px;">
                <p style="text-align: center; margin-bottom: 20px; color: var(--text-dark); font-weight: 500;">
                    ¿Qué deseas hacer con el PDF?
                </p>
                
                <button class="btn-primary" onclick="openPDFInNewTab()" style="margin-bottom: 10px; width: 100%;">
                    👁️ Ver PDF
                </button>
                
                <button class="btn-primary" onclick="sharePDF()" style="margin-bottom: 10px; width: 100%;">
                    📤 Compartir PDF
                </button>
                
                <button class="btn-primary" onclick="downloadPDFAgain()" style="margin-bottom: 10px; width: 100%;">
                    💾 Descargar de Nuevo
                </button>
                
                <button class="btn-secondary" onclick="savePDFToLocalStorage()" style="margin-bottom: 10px; width: 100%;">
                    💿 Guardar en App
                </button>
                
                <button class="btn-secondary" onclick="openDownloadsFolder()" style="margin-bottom: 10px; width: 100%;">
                    📁 Abrir Descargas
                </button>
                
                <button class="btn-secondary" onclick="closeDownloadOptions()" style="width: 100%;">
                    ✕ Cerrar
                </button>
                
                <div style="margin-top: 20px; padding: 15px; background: rgba(255,107,53,0.1); border-radius: 10px; border-left: 4px solid var(--primary-color);">
                    <p style="font-size: 13px; color: var(--text-dark); margin-bottom: 8px;">
                        <strong>⚠️ Si no se descargó automáticamente:</strong>
                    </p>
                    <p style="font-size: 12px; color: var(--text-light); margin-bottom: 5px;">
                        1. Toca "Ver PDF" para abrirlo<br>
                        2. Luego toca el ícono de descarga (⬇️) en el visor<br>
                        3. O usa "Compartir" para enviarlo por WhatsApp/Email
                    </p>
                    <p style="font-size: 11px; color: var(--text-light); margin-top: 10px;">
                        📌 Nombre: <code style="background: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 4px;">${window.currentPDFFileName}</code>
                    </p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function openPDFInNewTab() {
    try {
        if (!window.currentPDFBlob) {
            showToast('⚠️ PDF no disponible');
            return;
        }
        
        // Crear URL del blob
        const url = URL.createObjectURL(window.currentPDFBlob);
        
        // Abrir en nueva pestaña/ventana
        const newWindow = window.open(url, '_blank');
        
        if (newWindow) {
            showToast('✅ PDF abierto en nueva pestaña');
            
            // Desde ahí el usuario puede descargar manualmente
            setTimeout(() => {
                showToast('💡 Usa el botón de descarga del visor');
            }, 2000);
        } else {
            // Si el popup fue bloqueado, crear un iframe
            const iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.style.width = '100%';
            iframe.style.height = '80vh';
            iframe.style.border = 'none';
            
            // Crear modal para mostrar el PDF
            const pdfModal = document.createElement('div');
            pdfModal.className = 'modal active';
            pdfModal.innerHTML = `
                <div class="modal-content" style="max-width: 95%; height: 90vh; padding: 0;">
                    <div class="modal-header" style="padding: 15px;">
                        <h2>📄 ${window.currentPDFFileName}</h2>
                        <button class="btn-close" onclick="this.closest('.modal').remove()">✕</button>
                    </div>
                    <div style="height: calc(100% - 60px); overflow: auto;"></div>
                </div>
            `;
            pdfModal.querySelector('.modal-content > div:last-child').appendChild(iframe);
            document.body.appendChild(pdfModal);
            
            showToast('✅ PDF mostrado');
        }
        
        closeDownloadOptions();
        
    } catch (error) {
        console.error('Error abriendo PDF:', error);
        showToast('❌ Error al abrir el PDF');
    }
}

function savePDFToLocalStorage() {
    try {
        if (!window.currentPDFBlob) {
            showToast('⚠️ PDF no disponible');
            return;
        }
        
        // Convertir blob a base64
        const reader = new FileReader();
        reader.onloadend = function() {
            const base64data = reader.result;
            
            // Guardar en localStorage
            const savedPDFs = JSON.parse(localStorage.getItem('savedPDFs') || '[]');
            savedPDFs.push({
                name: window.currentPDFFileName,
                data: base64data,
                date: new Date().toISOString(),
                reportId: currentReport.id
            });
            
            // Mantener solo los últimos 5 PDFs para no llenar el storage
            if (savedPDFs.length > 5) {
                savedPDFs.shift();
            }
            
            localStorage.setItem('savedPDFs', JSON.stringify(savedPDFs));
            showToast('✅ PDF guardado en la aplicación');
            
            // Ofrecer abrir PDFs guardados
            setTimeout(() => {
                if (confirm('PDF guardado en la app. ¿Deseas ver los PDFs guardados?')) {
                    showSavedPDFsModal();
                }
            }, 500);
        };
        reader.readAsDataURL(window.currentPDFBlob);
        
        closeDownloadOptions();
    } catch (error) {
        console.error('Error guardando PDF:', error);
        showToast('❌ Error al guardar en la app');
    }
}

function showSavedPDFsModal() {
    const savedPDFs = JSON.parse(localStorage.getItem('savedPDFs') || '[]');
    
    if (savedPDFs.length === 0) {
        showToast('ℹ️ No hay PDFs guardados');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content menu-modal">
            <div class="modal-header">
                <h2>💿 PDFs Guardados</h2>
                <button class="btn-close" onclick="this.closest('.modal').remove()">✕</button>
            </div>
            <div style="padding: 20px;">
                ${savedPDFs.map((pdf, index) => `
                    <div style="background: var(--card-bg); padding: 15px; border-radius: 10px; margin-bottom: 10px; border: 1px solid var(--border);">
                        <p style="font-weight: 600; margin-bottom: 5px;">${pdf.name}</p>
                        <p style="font-size: 12px; color: var(--text-light); margin-bottom: 10px;">${new Date(pdf.date).toLocaleString()}</p>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn-primary" onclick="openSavedPDF(${index})" style="flex: 1; padding: 8px;">
                                👁️ Ver
                            </button>
                            <button class="btn-secondary" onclick="downloadSavedPDF(${index})" style="flex: 1; padding: 8px;">
                                💾 Descargar
                            </button>
                            <button class="btn-danger" onclick="deleteSavedPDF(${index})" style="padding: 8px;">
                                🗑️
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function openSavedPDF(index) {
    const savedPDFs = JSON.parse(localStorage.getItem('savedPDFs') || '[]');
    if (savedPDFs[index]) {
        window.open(savedPDFs[index].data, '_blank');
        showToast('✅ PDF abierto');
    }
}

function downloadSavedPDF(index) {
    const savedPDFs = JSON.parse(localStorage.getItem('savedPDFs') || '[]');
    if (savedPDFs[index]) {
        const a = document.createElement('a');
        a.href = savedPDFs[index].data;
        a.download = savedPDFs[index].name;
        a.click();
        showToast('💾 Descargando...');
    }
}

function deleteSavedPDF(index) {
    if (confirm('¿Eliminar este PDF guardado?')) {
        const savedPDFs = JSON.parse(localStorage.getItem('savedPDFs') || '[]');
        savedPDFs.splice(index, 1);
        localStorage.setItem('savedPDFs', JSON.stringify(savedPDFs));
        showToast('🗑️ PDF eliminado');
        
        // Cerrar y reabrir modal
        document.querySelector('.modal').remove();
        setTimeout(() => showSavedPDFsModal(), 100);
    }
}

function closeDownloadOptions() {
    const modal = document.getElementById('downloadOptionsModal');
    if (modal) {
        modal.remove();
    }
}

async function sharePDF() {
    try {
        if (!window.currentPDFBlob) {
            showToast('⚠️ PDF no disponible');
            return;
        }
        
        // Crear File del Blob
        const file = new File([window.currentPDFBlob], window.currentPDFFileName, {
            type: 'application/pdf'
        });
        
        // Verificar si Web Share API está disponible
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: currentReport.title,
                text: 'Reporte fotográfico generado'
            });
            showToast('✅ PDF compartido');
            closeDownloadOptions();
        } else {
            // Alternativa: descargar de nuevo
            showToast('ℹ️ Descargando PDF...');
            downloadPDFAgain();
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error compartiendo:', error);
            showToast('ℹ️ Descargando PDF...');
            downloadPDFAgain();
        }
    }
}

function openDownloadsFolder() {
    try {
        // Intentar abrir la carpeta de descargas
        // Método 1: Intent de Android (si está en WebView con permisos)
        if (window.Android && window.Android.openDownloads) {
            window.Android.openDownloads();
        } 
        // Método 2: URL de descargas (algunos navegadores)
        else if (navigator.userAgent.includes('Android')) {
            // Intentar abrir el gestor de archivos
            window.location.href = 'content://downloads/my_downloads';
            
            setTimeout(() => {
                showToast('📁 Busca en "Mis Archivos" → "Descargas"');
            }, 500);
        }
        // Método 3: Para navegadores de escritorio
        else {
            showToast('📁 Revisa tu carpeta de Descargas');
        }
        
        closeDownloadOptions();
    } catch (error) {
        showToast('📁 Busca en "Mis Archivos" → "Descargas"');
        closeDownloadOptions();
    }
}

function downloadPDFAgain() {
    if (!window.currentPDFBlob) {
        showToast('⚠️ PDF no disponible');
        return;
    }
    
    try {
        const url = URL.createObjectURL(window.currentPDFBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = window.currentPDFFileName;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        showToast('💾 Descargando PDF...');
    } catch (error) {
        console.error('Error descargando:', error);
        showToast('❌ Error al descargar');
    }
}

function closePDFPreview() {
    document.getElementById('pdfPreviewModal').classList.remove('active');
}

async function downloadPDFFromPreview() {
    if (!pdfInstance) return;
    
    try {
        const fileName = `${currentReport.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().getTime()}.pdf`;
        const pdfBlob = pdfInstance.output('blob');
        
        window.currentPDFBlob = pdfBlob;
        window.currentPDFFileName = fileName;
        
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        showToast('✅ PDF descargado');
        closePDFPreview();
        
        // Mostrar opciones
        setTimeout(() => {
            showDownloadOptionsModal();
        }, 500);
        
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