// Lógica de interacción para la Galería de Arte

document.addEventListener('DOMContentLoaded', () => {
  const galleryGrid = document.getElementById('galleryGrid');
  const filterButtons = document.querySelectorAll('.btn-filter');
  const searchInput = document.getElementById('searchInput');
  const artModal = document.getElementById('artModal');

  let todosLosDibujos = [];
  let categoriaActual = 'all';

  // Variable de estado para el dibujo abierto actualmente en el modal
  let dibujoIdActual = null;

  // Variable para cancelar la escucha previa de comentarios en Firebase al cambiar de dibujo
  let desuscripcionComentarios = null;

  // --- CONTROL DE MODO ADMINISTRADOR (Vía foto de perfil) ---
  let esModoAdmin = false;
  let contadorClicsPerfil = 0;
  let temporizadorPerfil;

  const profileTrigger = document.getElementById('profileTrigger');
  const galleryTitle = document.getElementById('galleryTitle');

  // Guardamos el texto original exacto con sus espacios
  const textoOriginalTitle = galleryTitle ? galleryTitle.innerHTML : 'Mi Galería y Referencias de Personajes';

  if (profileTrigger) {
    profileTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      contadorClicsPerfil++;

      clearTimeout(temporizadorPerfil);
      temporizadorPerfil = setTimeout(() => {
        contadorClicsPerfil = 0;
      }, 1000);

      if (contadorClicsPerfil === 3) {
        esModoAdmin = !esModoAdmin;
        contadorClicsPerfil = 0;

        // Actualización inmediata del modal de descarga si está abierto de fondo
        const adminControls = document.getElementById('adminControls');
        if (adminControls) {
          adminControls.classList.toggle('d-none', !esModoAdmin);
        }

        if (esModoAdmin) {
          profileTrigger.classList.add('border-warning');
          
          if (galleryTitle) {
            // Reemplaza el span por un enlace estilizado como botón
            galleryTitle.innerHTML = `<a href="admin/" class="btn btn-outline-light btn-sm font-artistic fw-bold px-2 py-0 ms-2 shadow-sm" style="text-decoration: none;">⚙️ Panel Administrador</a>`;
            // Garantiza que el botón no se oculte en celulares al activar el modo admin
            galleryTitle.classList.remove('d-none');
          }
          alert('🔓 Modo Administrador Activado');
        } else {
          profileTrigger.classList.remove('border-warning');
          
          if (galleryTitle) {
            // Restaura el texto original exactamente como estaba
            galleryTitle.innerHTML = textoOriginalTitle;
            galleryTitle.classList.add('d-none', 'd-sm-inline');
          }
          alert('🔒 Modo Administrador Desactivado');
        }
      }
    });
  }

  // 1. Cargar datos desde el archivo JSON con parámetro anti-caché
  fetch('Atributos/json/dibujos.json?v=' + Date.now())
    .then(response => {
      if (!response.ok) throw new Error('Error al cargar dibujos.json');
      return response.json();
    })
    .then(data => {
      // Compatibilidad si el JSON es un array directo o un objeto con clave "dibujos"
      todosLosDibujos = Array.isArray(data) ? data : (data.dibujos || []);
      renderizarGaleria(todosLosDibujos);
    })
    .catch(error => {
      console.error('Error al obtener la galería:', error);
      if (galleryGrid) {
        galleryGrid.innerHTML = '<p class="text-white-50 text-center w-100 my-5">Error al cargar las ilustraciones.</p>';
      }
    });

  // 2. Renderizar las tarjetas de los dibujos en el grid
  function renderizarGaleria(lista) {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = '';

    if (lista.length === 0 && categoriaActual !== 'comision' && categoriaActual !== 'comisiones') {
      galleryGrid.innerHTML = '<p class="text-white-50 text-center w-100 my-5">No se encontraron ilustraciones en esta sección.</p>';
      return;
    }

    lista.forEach(dibujo => {
      const col = document.createElement('div');
      col.className = 'col-12 col-sm-6 col-md-4 col-lg-3 gallery-item';

      // Badge de comisión, boceto o categoría
      let badgeTag = `<span class="badge bg-dark text-white">${dibujo.categoria}</span>`;
      if (dibujo.comision) {
        badgeTag = `<span class="badge bg-dark text-white"><i class="bi bi-star-fill me-1"></i>Comisión</span>`;
      } else if (dibujo.es_concepto) {
        badgeTag = `<span class="badge bg-dark text-white"><i class="bi bi-lightbulb me-1"></i>Boceto / Concepto</span>`;
      }

      // Enlace dinámico a Lore si existe en los datos
      const botonLore = dibujo.lore_url && dibujo.lore_url.trim() !== '' 
        ? `<a href="${dibujo.lore_url}" target="_blank" class="btn btn-sm btn-outline-info w-100 mt-2 font-artistic" onclick="event.stopPropagation();">
             <i class="bi bi-book me-1"></i>Ver Lore
           </a>` 
        : '';

      col.innerHTML = `
        <div class="card h-100 bg-dark text-white border-secondary shadow-sm card-hover" 
             style="cursor: pointer;"
             data-bs-toggle="modal" 
             data-bs-target="#artModal"
             data-id="${dibujo.id}"
             data-title="${dibujo.titulo}"
             data-category="${dibujo.categoria}"
             data-comision="${dibujo.comision}"
             data-concepto="${dibujo.es_concepto}"
             data-date="${dibujo.fecha}"
             data-img="${dibujo.imagen}"
             data-description="${dibujo.descripcion}"
             data-lore="${dibujo.lore_url || ''}">
             
          <img src="${dibujo.imagen}" class="card-img-top protected-image" alt="${dibujo.titulo}" style="height: 220px; object-fit: cover;">
          
          <div class="card-body d-flex flex-column">
            <h5 class="card-title font-artistic h6 mb-1 text-truncate">${dibujo.titulo}</h5>
            <p class="card-text text-white-50 small flex-grow-1 text-truncate">${dibujo.descripcion}</p>
            
            <div class="d-flex justify-content-between align-items-center mt-2">
              ${badgeTag}
              <small class="text-white-50">${dibujo.fecha}</small>
            </div>
            
            ${botonLore}
          </div>
        </div>
      `;

      galleryGrid.appendChild(col);
    });
  }

  // 3. Filtrado por Botones de Categorías
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      categoriaActual = btn.dataset.filter;

      // Muestra/Oculta el botón inferior del sidebar segun el filtro
      const commBtnSidebar = document.getElementById('commissionSidebarBtn');
      if (commBtnSidebar) {
        if (categoriaActual === 'comision' || categoriaActual === 'comisiones') {
          commBtnSidebar.classList.remove('d-none');
        } else {
          commBtnSidebar.classList.add('d-none');
        }
      }

      aplicarFiltrosYBusqueda();
    });
  });

  // 4. Búsqueda en Tiempo Real
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      aplicarFiltrosYBusqueda();
    });
  }

  // Lógica combinada para filtro por categorías y término de búsqueda
  function aplicarFiltrosYBusqueda() {
    const termino = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const resultado = todosLosDibujos.filter(dibujo => {
      let cumpleFiltro = false;
      
      if (categoriaActual === 'all') {
        cumpleFiltro = true;
      } else if (categoriaActual === 'comision' || categoriaActual === 'comisiones') {
        cumpleFiltro = dibujo.comision === true;
      } else if (categoriaActual === 'concepto' || categoriaActual === 'conceptos') {
        cumpleFiltro = dibujo.es_concepto === true;
      } else {
        cumpleFiltro = dibujo.categoria === categoriaActual;
      }

      const coincideTitulo = dibujo.titulo ? dibujo.titulo.toLowerCase().includes(termino) : false;
      const coincideDescripcion = dibujo.descripcion ? dibujo.descripcion.toLowerCase().includes(termino) : false;
      const cumpleBusqueda = termino === '' || coincideTitulo || coincideDescripcion;

      return cumpleFiltro && cumpleBusqueda;
    });

    renderizarGaleria(resultado);
  }

  // 5. Gestión del Modal Visor (Lightbox)
  if (artModal) {
    artModal.addEventListener('show.bs.modal', event => {
      const card = event.relatedTarget;
      if (!card) return;

      dibujoIdActual = card.dataset.id;

      const modalTitle = document.getElementById('modalTitle');
      const modalCategory = document.getElementById('modalCategory');
      const modalDate = document.getElementById('modalDate');
      const modalImage = document.getElementById('modalImage');
      const modalDescription = document.getElementById('modalDescription') || document.getElementById('modalNotes');
      const modalDownload = document.getElementById('modalDownload');
      const modalLoreBtn = document.getElementById('modalLoreBtn');
      const adminControls = document.getElementById('adminControls');

      if (modalTitle) modalTitle.textContent = card.dataset.title;
      if (modalCategory) {
        if (card.dataset.comision === 'true') {
          modalCategory.textContent = 'Comisión';
          modalCategory.className = 'badge bg-dark text-white';
        } else if (card.dataset.concepto === 'true') {
          modalCategory.textContent = 'Boceto / Concepto';
          modalCategory.className = 'badge bg-dark text-white';
        } else {
          modalCategory.textContent = card.dataset.category;
          modalCategory.className = 'badge bg-dark text-white';
        }
      }
      if (modalDate) modalDate.textContent = card.dataset.date;
      if (modalImage) modalImage.src = card.dataset.img;
      if (modalDescription) modalDescription.textContent = card.dataset.description;
      if (modalDownload) modalDownload.href = card.dataset.img;

      // Visibilidad del botón de Lore
      if (modalLoreBtn) {
        if (card.dataset.lore && card.dataset.lore.trim() !== '') {
          modalLoreBtn.href = card.dataset.lore;
          modalLoreBtn.classList.remove('d-none');
        } else {
          modalLoreBtn.classList.add('d-none');
        }
      }

      // Visibilidad del botón de descarga si el modo admin está activo
      if (adminControls) {
        if (esModoAdmin) {
          adminControls.classList.remove('d-none');
        } else {
          adminControls.classList.add('d-none');
        }
      }

      // Cargar comentarios correspondientes con Firebase
      cargarComentariosFirebase(dibujoIdActual);
    });
  }

  // 6. Protección de Arte (Prevenir clic derecho y arrastrar imágenes)
  document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'IMG' || e.target.classList.contains('image-protection-overlay')) {
      e.preventDefault();
      return false;
    }
  });

  document.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
      return false;
    }
  });

  // --- 7. SISTEMA DE COMENTARIOS CON FIREBASE FIRESTORE ---

  function cargarComentariosFirebase(dibujoId) {
    const commentsList = document.getElementById('commentsList');
    if (!commentsList) return;

    // Si había una escucha activa de otro modal, la cancelamos primero
    if (desuscripcionComentarios) {
      desuscripcionComentarios();
    }

    if (!window.dbFirestore || !window.fsMethods) {
      commentsList.innerHTML = '<p class="text-white-50 text-center my-3">Conectando con el servidor de comentarios...</p>';
      return;
    }

    const { collection, query, where, onSnapshot } = window.fsMethods;

    // Consulta simple por dibujoId (evita requerir índices compuestos en Firebase)
    const q = query(
      collection(window.dbFirestore, 'comentarios'),
      where('dibujoId', '==', String(dibujoId))
    );

    // Escucha en tiempo real de Firestore
    desuscripcionComentarios = onSnapshot(q, (snapshot) => {
      commentsList.innerHTML = '';

      if (snapshot.empty) {
        commentsList.innerHTML = '<p class="text-white-50 small text-center my-3" id="noCommentsText">Sé el primero en comentar esta ilustración ✨</p>';
        return;
      }

      // Extraer y ordenar comentarios por fecha localmente
      const comentarios = [];
      snapshot.forEach((doc) => {
        comentarios.push(doc.data());
      });

      comentarios.sort((a, b) => {
        const fechaA = a.fecha && a.fecha.toDate ? a.fecha.toDate().getTime() : 0;
        const fechaB = b.fecha && b.fecha.toDate ? b.fecha.toDate().getTime() : 0;
        return fechaA - fechaB;
      });

      // Renderizar la lista
      comentarios.forEach((c) => {
        let fechaTexto = 'Hace un momento';
        if (c.fecha && c.fecha.toDate) {
          fechaTexto = c.fecha.toDate().toLocaleDateString();
        }

        const item = document.createElement('div');
        item.className = 'p-2 mb-2 bg-dark rounded border border-secondary text-break';
        item.innerHTML = `
          <div class="d-flex justify-content-between align-items-center mb-1">
            <strong class="font-artistic text-info small">${escapeHTML(c.autor || 'Anónimo')}</strong>
            <span class="text-white-50" style="font-size: 0.7rem;">${fechaTexto}</span>
          </div>
          <p class="mb-0 small text-white">${escapeHTML(c.texto || '')}</p>
        `;
        commentsList.appendChild(item);
      });

      commentsList.scrollTop = commentsList.scrollHeight;
    }, (error) => {
      console.error("Error al cargar comentarios de Firestore:", error);
      commentsList.innerHTML = '<p class="text-danger small text-center my-3">Error al cargar comentarios.</p>';
    });
  }

  // Enviar nuevo comentario a Firebase
  const commentForm = document.getElementById('commentForm');
  if (commentForm) {
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!dibujoIdActual) return;

      const autorInput = document.getElementById('commentAuthor');
      const textoInput = document.getElementById('commentText');

      if (!autorInput || !textoInput) return;

      const autor = autorInput.value.trim() || 'Anónimo';
      const texto = textoInput.value.trim();

      if (!texto) return;

      if (!window.dbFirestore || !window.fsMethods) {
        alert("⚠️ Firebase aún no ha terminado de cargar. Por favor reintenta en un momento.");
        return;
      }

      const { collection, addDoc, serverTimestamp } = window.fsMethods;

      try {
        await addDoc(collection(window.dbFirestore, 'comentarios'), {
          dibujoId: String(dibujoIdActual),
          autor: autor,
          texto: texto,
          fecha: serverTimestamp()
        });

        textoInput.value = ''; // Limpia únicamente el campo del texto
      } catch (err) {
        console.error("Error al enviar comentario a Firebase:", err);
        alert("⚠️ No se pudo enviar tu comentario.");
      }
    });
  }

  // --- COPIAR USUARIO DE DISCORD AL PORTAPAPELES ---
  const btnCopyDiscord = document.getElementById('btnCopyDiscord');
  const discordUserTag = document.getElementById('discordUserTag');

  if (btnCopyDiscord && discordUserTag) {
    btnCopyDiscord.addEventListener('click', () => {
      navigator.clipboard.writeText(discordUserTag.value).then(() => {
        const icon = btnCopyDiscord.querySelector('i');
        if (icon) {
          icon.className = 'bi bi-check-lg text-success';
          setTimeout(() => {
            icon.className = 'bi bi-copy';
          }, 2000);
        }
      });
    });
  }

  // Sanitizado básico anti-XSS
  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
});
