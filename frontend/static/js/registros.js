// dynamic-tables.js

document.addEventListener("DOMContentLoaded", () => {
  const selector     = document.getElementById("table-selector");
  const btnLoad      = document.getElementById("btn-load");
  const btnNew       = document.getElementById("btn-new");
  const searchInput  = document.getElementById("search-input");
  const tableWrapper = document.querySelector(".table-responsive");
  const table        = document.getElementById("data-table");
  const prevBtn      = document.getElementById("prev-page");
  const nextBtn      = document.getElementById("next-page");
  const pageInfo     = document.getElementById("page-info");
  const recordModalEl = document.getElementById("recordModal");
  const recordForm   = document.getElementById("record-form");
  const modalTitle   = document.getElementById("recordModalLabel");
  const modalBody    = document.getElementById("modal-body");
  const bsModal      = new bootstrap.Modal(recordModalEl);

  let schema = [];
  let records = [];
  let filtered = [];
  let currentPage = 1;
  const perPage = 5;

  tableWrapper.classList.add("d-none");
  btnNew.disabled = true;

  // ✅ CORREGIDA esta ruta:
  fetch('/registros/tablas-disponibles')
    .then(res => res.json())
    .then(list => list.forEach(t => selector.add(new Option(t, t))))
    .catch(err => console.error('Error cargando tablas:', err));

  btnLoad.addEventListener('click', async () => {
    const tableName = selector.value;
    if (!tableName) {
      selector.classList.add('is-invalid');
      return;
    }
    selector.classList.remove('is-invalid');
    currentPage = 1;
    btnNew.disabled = false;
    await loadTableInfo(tableName);
    tableWrapper.classList.remove("d-none");
  });

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase();
    filtered = records.filter(r =>
      Object.values(r).some(val => String(val).toLowerCase().includes(q))
    );
    currentPage = 1;
    renderTable();
  });

  prevBtn.addEventListener('click', () => changePage(-1));
  nextBtn.addEventListener('click', () => changePage(1));

  btnNew.addEventListener('click', () => {
    openModal('Nuevo registro', {});
  });

  async function loadTableInfo(tableName) {
    try {
      const [colsRes, recRes] = await Promise.all([
        fetch(`/${tableName}/columnas`),
        fetch(`/registros/${tableName}`)
      ]);
      schema = await colsRes.json();
      records = await recRes.json();
      filtered = [...records];
      renderTable();
    } catch (e) {
      console.error('Error cargando datos:', e);
    }
  }

  function renderTable() {
    const thead = table.querySelector('thead');
    const headerCells = schema.map(c => `<th>${c.name}</th>`).join('') + '<th>Acciones</th>';
    thead.innerHTML = `<tr>${headerCells}</tr>`;

    const tbody = table.querySelector('tbody');
    const start = (currentPage - 1) * perPage;
    const pageItems = filtered.slice(start, start + perPage);
    tbody.innerHTML = pageItems.map(r => {
      const cells = schema.map(c => `<td>${r[c.name] ?? ''}</td>`).join('');
      return `<tr data-id="${r.id}">${cells}
        <td class="d-flex flex-column flex-sm-row gap-2">
          <button class="btn btn-sm btn-outline-primary btn-edit"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-outline-danger btn-delete"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>`;
    }).join('');

    pageInfo.textContent = `Página ${currentPage} de ${Math.ceil(filtered.length / perPage)}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage >= Math.ceil(filtered.length / perPage);

    tbody.querySelectorAll('.btn-edit').forEach(btn =>
      btn.addEventListener('click', e => {
        const id = e.target.closest('tr').dataset.id;
        const rec = records.find(x => String(x.id) === id);
        openModal('Editar registro', rec);
      })
    );
    tbody.querySelectorAll('.btn-delete').forEach(btn =>
      btn.addEventListener('click', e => {
        const id = e.target.closest('tr').dataset.id;
        deleteRecord(selector.value, id);
      })
    );
  }

  function changePage(delta) {
    currentPage += delta;
    renderTable();
  }

  function openModal(title, record) {
    modalTitle.textContent = title;
    modalBody.innerHTML = '';
    schema.forEach(col => {
      const val = record[col.name] ?? '';
      const required = col.nullable ? '' : 'required';
      const readonly = (col.name === 'id' && title.startsWith('Editar')) ? 'readonly' : '';
      modalBody.insertAdjacentHTML('beforeend', `
        <div class="col-12 col-md-6">
          <label for="${col.name}" class="form-label">${col.name}</label>
          <input type="text" id="${col.name}" name="${col.name}" value="${val}"
                 class="form-control" ${required} ${readonly}>
          <div class="invalid-feedback">${col.name} ${required ? 'es obligatorio.' : ''}</div>
        </div>
      `);
    });

    recordForm.classList.remove('was-validated');
    recordForm.onsubmit = async e => {
      e.preventDefault();
      if (!recordForm.checkValidity()) {
        recordForm.classList.add('was-validated');
        return;
      }
      const formData = Object.fromEntries(new FormData(recordForm).entries());
      try {
        if (title.startsWith('Editar')) {
          await fetch(`/registros/${selector.value}/${formData.id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(formData)
          });
        } else {
          await fetch(`/registros/${selector.value}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(formData)
          });
        }
        bsModal.hide();
        await loadTableInfo(selector.value);
      } catch (err) {
        console.error('Error guardando:', err);
      }
    };

    bsModal.show();
  }

  function deleteRecord(tableName, id) {
    Swal.fire({
      title: '¿Eliminar registro?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar'
    }).then(res => {
      if (res.isConfirmed) {
        fetch(`/registros/${tableName}/${id}`, {method: 'DELETE'})
          .then(() => loadTableInfo(tableName))
          .catch(err => console.error('Error eliminando:', err));
      }
    });
  }
});
