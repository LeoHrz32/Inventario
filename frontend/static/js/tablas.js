// archivo: static/js/tablas.js

let paginaActual = 1;
let totalPaginas = 1;
const filasPorPagina = 5;

document.addEventListener("DOMContentLoaded", () => {
  initTabla();
});

function initTabla() {
  // Búsqueda
  document
    .getElementById("tabla-search-input")
    .addEventListener("input", () => buscarTablas());
  document
    .getElementById("search-btn")
    .addEventListener("click", () => buscarTablas());

  // Paginación
  document
    .getElementById("tabla-prev-page")
    .addEventListener("click", () => cambiarPagina(-1));
  document
    .getElementById("tabla-next-page")
    .addEventListener("click", () => cambiarPagina(1));

  // Modal Crear
  const modalCrear = new bootstrap.Modal(document.getElementById("tablaModal"));
  document.getElementById("create-tabla-btn").addEventListener("click", () => {
    document.getElementById("tabla-form").reset();
    document.getElementById("campos-container").innerHTML = "";
    modalCrear.show();
  });
  document
    .getElementById("add-campo-btn")
    .addEventListener("click", agregarCampo);
  document
    .getElementById("tabla-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      await crearTabla(modalCrear);
    });

  // Modal Editar
  const formEdit = document.getElementById("edit-tabla-form");
  if (formEdit) {
    formEdit.addEventListener("submit", async (e) => {
      e.preventDefault();
      const modalEditar = new bootstrap.Modal(
        document.getElementById("editTablaModal")
      );
      await actualizarTabla(modalEditar);
    });
  }

  // Carga inicial
  renderTablas(paginaActual);
}

function agregarCampo() {
  const container = document.getElementById("campos-container");
  const grupo = document.createElement("div");
  grupo.className = "input-group mb-2";
  grupo.innerHTML = `
    <input type="text" class="form-control nombre-campo" placeholder="Nombre del campo" required />
    <button class="btn btn-outline-danger" type="button" onclick="this.closest('div').remove()">
      <i class="fas fa-trash-alt"></i>
    </button>
  `;
  container.appendChild(grupo);
}

async function fetchTablas(page = 1) {
  try {
    const resp = await fetch(
      `/tablasPaginated?page=${page}&per_page=${filasPorPagina}`
    );
    if (!resp.ok) throw new Error("Error al obtener tablas");
    const data = await resp.json();
    totalPaginas = data.total_pages;
    return data.tablas;
  } catch (err) {
    console.error(err);
    mostrarErrorEnTabla("Error cargando tablas");
    return [];
  }
}

async function renderTablas(page) {
  const tablas = await fetchTablas(page);
  const tbody = document.querySelector("#tabla-table tbody");
  tbody.innerHTML = "";

  if (!tablas.length) {
    tbody.innerHTML = `<tr><td colspan="2" class="text-center">No hay tablas</td></tr>`;
  } else {
    tablas.forEach((nombre) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${nombre}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editTabla('${nombre}')">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteTabla('${nombre}')">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  actualizarPaginacion();
}

async function buscarTablas() {
  const q = document.getElementById("tabla-search-input").value.trim();
  if (!q) {
    paginaActual = 1;
    return renderTablas(paginaActual);
  }

  try {
    const resp = await fetch(`/tablaSearch?query=${encodeURIComponent(q)}`);
    if (!resp.ok) throw new Error("Error al buscar");
    const data = await resp.json();
    const tablas = data.tablas;
    const tbody = document.querySelector("#tabla-table tbody");
    tbody.innerHTML = "";

    if (!tablas.length) {
      tbody.innerHTML = `<tr><td colspan="2" class="text-center">Sin resultados</td></tr>`;
    } else {
      tablas.forEach((nombre) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${nombre}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary me-1" onclick="editTabla('${nombre}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteTabla('${nombre}')">
              <i class="fas fa-trash-alt"></i>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    document.getElementById("tabla-page-info").textContent = "Resultados";
    document.getElementById("tabla-prev-page").disabled = true;
    document.getElementById("tabla-next-page").disabled = true;
  } catch (err) {
    console.error("Error buscando tablas", err);
    mostrarErrorEnTabla("Error en búsqueda");
  }
}

function mostrarErrorEnTabla(mensaje) {
  const tbody = document.querySelector("#tabla-table tbody");
  tbody.innerHTML = `<tr><td colspan="2" class="text-center text-danger">${mensaje}</td></tr>`;
}

function actualizarPaginacion() {
  document.getElementById(
    "tabla-page-info"
  ).textContent = `Página ${paginaActual} de ${totalPaginas}`;
  document.getElementById("tabla-prev-page").disabled = paginaActual === 1;
  document.getElementById("tabla-next-page").disabled =
    paginaActual === totalPaginas;
}

function cambiarPagina(delta) {
  const nueva = paginaActual + delta;
  if (nueva < 1 || nueva > totalPaginas) return;
  paginaActual = nueva;
  document.getElementById("tabla-search-input").value = "";
  renderTablas(paginaActual);
}

async function crearTabla(modal) {
  const nombre = document.getElementById("nombre_tabla").value.trim();
  const campos = Array.from(document.querySelectorAll(".nombre-campo")).map(
    (input) => ({
      nombre: input.value.trim(),
    })
  );

  const nombres = campos.map((c) => c.nombre);
  if (!nombre || !nombres.length || new Set(nombres).size !== nombres.length) {
    return Swal.fire(
      "Error",
      "Debes ingresar nombre de tabla y campos únicos.",
      "error"
    );
  }

  try {
    const resp = await fetch(`/tablas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre_tabla: nombre, campos }),
    });
    if (!resp.ok) throw new Error();
    const { message } = await resp.json();
    modal.hide();
    document.getElementById("tabla-form").reset();
    document.getElementById("campos-container").innerHTML = "";
    Swal.fire({
      icon: "success",
      title: "¡Éxito!",
      text: message,
      timer: 2000,
      showConfirmButton: false,
    }).then(() => renderTablas(paginaActual));
  } catch {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo crear la tabla.",
    });
  }
}

// Modal Editar: GET /tablas/{tabla}/columnas
window.editTabla = async function (nombre) {
  document.getElementById("edit-tabla-id").value = nombre;
  document.getElementById("edit-nombre_tabla").value = nombre;

  const contActuales = document.getElementById("campos-actuales");
  const contNuevos = document.getElementById("campos-nuevos");
  contActuales.innerHTML = "";
  contNuevos.innerHTML = "";

  try {
    const resp = await fetch(`/${encodeURIComponent(nombre)}/columnas`);

    if (!resp.ok) throw new Error(`Status ${resp.status}`);
    const cols = await resp.json();
    console.log(resp);

    cols.forEach((col) => {
      const row = document.createElement("div");
      row.className = "col-12 d-flex align-items-center mb-2";
      row.innerHTML = `
        <input
          type="text"
          class="form-control me-2 campo-actual-editable"
          data-old-name="${col.name}"
          value="${col.name}"
          required
        >`;
      contActuales.appendChild(row);
    });

    new bootstrap.Modal(document.getElementById("editTablaModal")).show();
  } catch (err) {
    console.error("Error cargando columnas", err);
    Swal.fire(
      "Error",
      `No se pudieron cargar columnas: ${err.message}`,
      "error"
    );
  }
};

// PUT /tablas/tablasUpdate/{tabla}
async function actualizarTabla(modal) {
  const nombre = document.getElementById("edit-tabla-id").value;
  const nuevoNombre = document.getElementById("edit-nombre_tabla").value.trim();

  const camposAdd = Array.from(
    document.querySelectorAll("#campos-nuevos input")
  )
    .map((i) => i.value.trim())
    .filter((v) => v)
    .map((nombre) => ({ nombre }));

  const camposRename = Array.from(
    document.querySelectorAll(".campo-actual-editable")
  )
    .map((i) => ({
      antiguo: i.dataset.oldName,
      nuevo: i.value.trim(),
    }))
    .filter((r) => r.nuevo && r.nuevo !== r.antiguo);

  const payload = {
    nombre_tabla: nuevoNombre,
    campos_add: camposAdd,
    campos_drop: [], // <- importante para cumplir con el modelo
    campos_rename: camposRename,
  };

  try {
    const resp = await fetch(`/tablasUpdate/${encodeURIComponent(nombre)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error();
    const { message } = await resp.json();
    modal.hide();
    Swal.fire({
      icon: "success",
      title: "¡Actualizado!",
      text: message,
      timer: 2000,
      showConfirmButton: false,
    }).then(() => renderTablas(paginaActual));
  } catch (err) {
    console.error("Error actualizando tabla", err);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "No se pudo actualizar.",
    });
  }
}

// Añadir nuevos campos en el modal de edición
document.getElementById("btn-agregar-campo").addEventListener("click", () => {
  const cont = document.getElementById("campos-nuevos");
  const div = document.createElement("div");
  div.className = "col-12 d-flex align-items-center mb-2";
  div.innerHTML = `
    <input type="text" class="form-control me-2" placeholder="Nuevo campo" required>
    <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('div').remove()">
      <i class="fas fa-trash"></i>
    </button>`;
  cont.appendChild(div);
});

// DELETE /tablas/{tabla}
window.deleteTabla = function (nombre) {
  Swal.fire({
    icon: "warning",
    title: "¿Eliminar tabla?",
    text: "Esta acción no se puede deshacer.",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
  }).then(async (result) => {
    if (!result.isConfirmed) return;
    try {
      const resp = await fetch(`/tablas/${encodeURIComponent(nombre)}`, {
        method: "DELETE",
      });
      if (!resp.ok) throw new Error();
      Swal.fire({
        icon: "success",
        title: "Eliminado",
        text: "Tabla eliminada.",
        timer: 1500,
        showConfirmButton: false,
      });
      renderTablas(paginaActual);
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo eliminar.",
      });
    }
  });
};
