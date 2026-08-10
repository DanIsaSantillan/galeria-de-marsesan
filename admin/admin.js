document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('drawFileInput');
  const fileNameInput = document.getElementById('drawFileName');
  const previewContainer = document.getElementById('previewContainer');
  const imagePreview = document.getElementById('imagePreview');
  const categorySelect = document.getElementById('drawCategory');
  const folderPrefix = document.getElementById('folderPrefix');
  const adminDrawForm = document.getElementById('adminDrawForm');
  const adminGalleryGrid = document.getElementById('adminGalleryGrid');
  const modalFormTitle = document.getElementById('modalFormTitle');
  const btnConfigToken = document.getElementById('btnConfigToken');

  // CONFIGURACIÓN DE TU REPOSITORIO (⚠️ Ajusta estos dos datos con los tuyos)
  const GITHUB_USER = "TU_USUARIO_GITHUB"; 
  const GITHUB_REPO = "NOMBRE_DE_TU_REPOSITORIO";

  let misDibujos = [];
  let idEdicionActual = null;
  let archivoBase64 = null; // Guardará el archivo para subirlo a GitHub

  // Manejo del Token personal guardado en el navegador
  let ghToken = localStorage.getItem('gh_token_galeria') || '';

  if (btnConfigToken) {
    btnConfigToken.addEventListener('click', () => {
      const nuevoToken = prompt('Introduce tu Personal Access Token de GitHub:', ghToken);
      if (nuevoToken !== null) {
        ghToken = nuevoToken.trim();
        localStorage.setItem('gh_token_galeria', ghToken);
        alert('✨ Token guardado correctamente en tu navegador.');
      }
    });
  }

  // Cargar datos del JSON
  fetch('../Atributos/json/dibujos.json')
    .then(response => {
      if (!response.ok) throw new Error('Error al leer dibujos.json');
      return response.json();
    })
    .then(data => {
      misDibujos = Array.isArray(data) ? data : (data.dibujos || []);
      renderizarGridAdmin(misDibujos);
    })
    .catch(err => {
      console.warn('Nota sobre dibujos.json:', err);
    });

  // Detección de archivo
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const archivo = e.target.files[0];
      if (archivo) {
        if (fileNameInput) fileNameInput.value = archivo.name;
        const reader = new FileReader();
        reader.onload = (event) => {
          if (imagePreview && previewContainer) {
            imagePreview.src = event.target.result;
            previewContainer.classList.remove('d-none');
          }
          // Convertir a base64 para enviarlo a GitHub
          archivoBase64 = event.target.result.split(',')[1];
        };
        reader.readAsDataURL(archivo);
      }
    });
  }

  // Cambio dinámico de carpeta
  if (categorySelect && folderPrefix) {
    categorySelect.addEventListener('change', () => {
      actualizarPrefijoCarpeta(categorySelect.value);
    });
  }

  function actualizarPrefijoCarpeta(categoria) {
    if (!folderPrefix) return;
    if (categoria === 'digital') {
      folderPrefix.textContent = 'Atributos/Dibujos/DibujoDigital/';
    } else {
      folderPrefix.textContent = 'Atributos/Dibujos/DibujoTradicional/';
    }
  }

  function renderizarGridAdmin(lista) {
    if (!adminGalleryGrid) return;
    adminGalleryGrid.innerHTML = '';

    if (lista.length === 0) {
      adminGalleryGrid.innerHTML = '<p class="text-white-50 text-center w-100 py-4">No hay publicaciones registradas.</p>';
      return;
    }

    lista.forEach(dibujo => {
      const col = document.createElement('div');
      col.className = 'col-12 col-sm-6 col-md-4 col-lg-3';
      
      const rutaImg = dibujo.imagen.startsWith('../') ? dibujo.imagen : `../${dibujo.imagen}`;

      col.innerHTML = `
        <div class="card h-100 bg-dark text-white border-secondary shadow-sm card-hover" 
             style="cursor: pointer;"
             data-bs-toggle="modal" 
             data-bs-target="#uploadModal">
          <img src="${rutaImg}" class="card-img-top" alt="${dibujo.titulo}" style="height: 180px; object-fit: cover;">
          <div class="card-body p-2 d-flex flex-column justify-content-between">
            <h6 class="font-artistic mb-1 text-truncate">${dibujo.titulo}</h6>
            <small class="text-white-50 small">${dibujo.fecha}</small>
          </div>
        </div>
      `;

      col.querySelector('.card').addEventListener('click', () => {
        cargarDibujoEnModal(dibujo);
      });

      adminGalleryGrid.appendChild(col);
    });
  }

  function cargarDibujoEnModal(dibujo) {
    idEdicionActual = dibujo.id;
    archivoBase64 = null;
    if (modalFormTitle) modalFormTitle.textContent = 'Editar Ilustración';

    document.getElementById('drawTitle').value = dibujo.titulo || '';
    categorySelect.value = dibujo.categoria || 'digital';
    actualizarPrefijoCarpeta(dibujo.categoria);

    document.getElementById('drawDate').value = dibujo.fecha || '';

    const partesRuta = (dibujo.imagen || '').split('/');
    const nombreArchivo = partesRuta[partesRuta.length - 1];
    fileNameInput.value = nombreArchivo;

    document.getElementById('drawIsCommission').checked = !!dibujo.comision;
    document.getElementById('drawIsConcept').checked = !!dibujo.es_concepto;
    document.getElementById('drawDescription').value = dibujo.descripcion || '';
    document.getElementById('drawLoreUrl').value = dibujo.lore_url || '';

    const rutaImg = dibujo.imagen.startsWith('../') ? dibujo.imagen : `../${dibujo.imagen}`;
    if (imagePreview && previewContainer) {
      imagePreview.src = rutaImg;
      previewContainer.classList.remove('d-none');
    }

    let btnDelete = document.getElementById('btnDeleteDraw');
    if (!btnDelete && adminDrawForm) {
      btnDelete = document.createElement('button');
      btnDelete.type = 'button';
      btnDelete.id = 'btnDeleteDraw';
      btnDelete.className = 'btn btn-outline-danger w-100 font-artistic mt-2';
      btnDelete.textContent = 'Eliminar Ilustración';
      btnDelete.addEventListener('click', eliminarDibujoActual);
      adminDrawForm.appendChild(btnDelete);
    }
  }

  const btnNuevoDibujo = document.querySelector('[data-bs-target="#uploadModal"]');
  if (btnNuevoDibujo) {
    btnNuevoDibujo.addEventListener('click', () => {
      idEdicionActual = null;
      archivoBase64 = null;
      if (modalFormTitle) modalFormTitle.textContent = 'Subir Nueva Ilustración';
      if (adminDrawForm) adminDrawForm.reset();
      if (previewContainer) previewContainer.classList.add('d-none');
      actualizarPrefijoCarpeta(categorySelect.value);

      const btnDelete = document.getElementById('btnDeleteDraw');
      if (btnDelete) btnDelete.remove();
    });
  }

  function eliminarDibujoActual() {
    if (!idEdicionActual) return;
    if (confirm('¿Estás seguro de que deseas eliminar esta ilustración?')) {
      misDibujos = misDibujos.filter(d => String(d.id) !== String(idEdicionActual));
      renderizarGridAdmin(misDibujos);
      guardarCambiosEnGitHub("Eliminación de ilustración");

      const modalEl = document.getElementById('uploadModal');
      const bootstrapModal = bootstrap.Modal.getInstance(modalEl);
      if (bootstrapModal) bootstrapModal.hide();
    }
  }

  // Guardar / Actualizar
  if (adminDrawForm) {
    adminDrawForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!ghToken) {
        alert("⚠️ Necesitas configurar tu Token de GitHub primero haciendo clic en el botón 'Token' de la barra superior.");
        return;
      }

      const btnSave = document.getElementById('btnSaveDraw');
      btnSave.disabled = true;
      btnSave.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando en GitHub...';

      const titulo = document.getElementById('drawTitle').value;
      const categoria = categorySelect.value;
      const fecha = document.getElementById('drawDate').value;
      const nombreArchivo = fileNameInput.value;
      const esComision = document.getElementById('drawIsCommission').checked;
      const esConcepto = document.getElementById('drawIsConcept').checked;
      const descripcion = document.getElementById('drawDescription').value;
      const loreUrl = document.getElementById('drawLoreUrl').value;

      const rutaRelativa = `${folderPrefix.textContent}${nombreArchivo}`;

      try {
        // 1. Si seleccionaste una nueva imagen, la subimos a la carpeta de GitHub
        if (archivoBase64) {
          await subirArchivoAGitHub(rutaRelativa, archivoBase64, `Subida de imagen: ${nombreArchivo}`);
        }

        // 2. Actualizamos el arreglo local
        if (idEdicionActual !== null) {
          const index = misDibujos.findIndex(d => String(d.id) === String(idEdicionActual));
          if (index !== -1) {
            misDibujos[index] = {
              ...misDibujos[index],
              titulo,
              categoria,
              fecha,
              imagen: rutaRelativa,
              comision: esComision,
              es_concepto: esConcepto,
              descripcion,
              lore_url: loreUrl
            };
          }
        } else {
          const nuevoDibujo = {
            id: Date.now(), // ID numérico entero
            titulo,
            categoria,
            fecha,
            imagen: rutaRelativa,
            comision: esComision,
            es_concepto: esConcepto,
            descripcion,
            lore_url: loreUrl
          };
          misDibujos.unshift(nuevoDibujo);
        }

        // 3. Subimos el JSON actualizado a GitHub
        await guardarCambiosEnGitHub(`Actualización de dibujos.json: ${titulo}`);

        renderizarGridAdmin(misDibujos);
        adminDrawForm.reset();
        if (previewContainer) previewContainer.classList.add('d-none');

        alert("✨ ¡Publicación guardada exitosamente en GitHub!");

        const modalEl = document.getElementById('uploadModal');
        const bootstrapModal = bootstrap.Modal.getInstance(modalEl);
        if (bootstrapModal) bootstrapModal.hide();

      } catch (error) {
        console.error("Error al publicar:", error);
        alert("⚠️ Hubo un error al guardar en GitHub. Revisa la consola o verifica tu Token.");
      } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = '<i class="bi bi-cloud-upload me-1"></i> Guardar y Publicar en GitHub';
      }
    });
  }

  // --- FUNCIONES API GITHUB (Permiten guardar de verdad en tu repo) ---

  async function subirArchivoAGitHub(path, base64Content, commitMessage) {
    const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`;
    
    // Verificamos si la imagen ya existe para obtener su SHA (por si es edición)
    let sha = null;
    try {
      const resCheck = await fetch(url, { headers: { Authorization: `token ${ghToken}` } });
      if (resCheck.ok) {
        const dataCheck = await resCheck.json();
        sha = dataCheck.sha;
      }
    } catch (e) {}

    const body = {
      message: commitMessage,
      content: base64Content,
      branch: "main"
    };
    if (sha) body.sha = sha;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${ghToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error("Error al subir archivo a GitHub");
  }

  async function guardarCambiosEnGitHub(commitMessage) {
    const path = "Atributos/json/dibujos.json";
    const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`;

    // Obtener SHA actual del json
    const resCheck = await fetch(url, { headers: { Authorization: `token ${ghToken}` } });
    if (!resCheck.ok) throw new Error("No se pudo obtener el SHA de dibujos.json");
    const dataCheck = await resCheck.json();

    // Convertir el JSON local a Base64 con formato utf-8
    const jsonString = JSON.stringify(misDibujos, null, 2);
    const utf8Bytes = new TextEncoder().encode(jsonString);
    const base64Content = btoa(String.fromCharCode(...utf8Bytes));

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${ghToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: commitMessage,
        content: base64Content,
        sha: dataCheck.sha,
        branch: "main"
      })
    });

    if (!response.ok) throw new Error("Error al actualizar dibujos.json en GitHub");
  }
});