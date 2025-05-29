let currentPage = 1;
let totalPages = 1;
const categoriasPerPage = 5;

// Espera a que el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  // Inicialización paginación y búsqueda
  renderCategorias(currentPage);
  document
    .getElementById("search-input")
    .addEventListener("input", searchCategorias);
  document
    .getElementById("prev-page")
    .addEventListener("click", () => changePage(-1));
  document
    .getElementById("next-page")
    .addEventListener("click", () => changePage(1));

  // Modales y formularios
  handleCategoriaModal();

  // Logout
  document.getElementById("logout-btn").addEventListener("click", logout);
});

async function fetchCategorias(page = 1) {
  try {
    const resp = await fetch(
      `http://10.1.1.89:8100/categorias_paginated?page=${page}&per_page=${categoriasPerPage}`
    );
    if (!resp.ok) throw new Error("Error al obtener los datos.");
    const data = await resp.json();
    totalPages = data.total_pages;
    return data.categorias;
  } catch (err) {
    console.error(err);
    document.querySelector(
      "#categorias-table tbody"
    ).innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error cargando categorias</td></tr>`;
    return [];
  }
}

async function renderCategorias(page) {
  const categorias = await fetchCategorias(page);
  const tbody = document.querySelector("#categorias-table tbody");
  tbody.innerHTML = "";

  categorias.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.id}</td>
      <td>${c.nombre}</td>
      <td>${c.descripcion}</td>
      <td class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-primary" onclick="editCategoria(${c.id})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteCategoria(${c.id})">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById(
    "page-info"
  ).textContent = `Página ${currentPage} de ${totalPages}`;
  document.getElementById("prev-page").disabled = currentPage === 1;
  document.getElementById("next-page").disabled = currentPage === totalPages;
}

function changePage(direction) {
  if (
    (direction < 0 && currentPage > 1) ||
    (direction > 0 && currentPage < totalPages)
  ) {
    currentPage += direction;
    document.getElementById("search-input").value = "";
    renderCategorias(currentPage);
  }
}

async function searchCategorias() {
  const q = document.getElementById("search-input").value.trim();
  if (!q) return renderCategorias(currentPage);
  try {
    const resp = await fetch(
      `http://10.1.1.89:8100/categorias_search?query=${encodeURIComponent(q)}`
    );
    if (!resp.ok) throw new Error();
    const data = await resp.json();
    const tbody = document.querySelector("#categorias-table tbody");
    tbody.innerHTML = "";
    data.categorias.forEach((c) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.nombre}</td>
        <td>${c.descripcion}</td>
        <td class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary" onclick="editCategoria(${c.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteCategoria(${c.id})"><i class="fas fa-trash-alt"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    document.getElementById("page-info").textContent = "Resultados de búsqueda";
    document.getElementById("prev-page").disabled = true;
    document.getElementById("next-page").disabled = true;
  } catch (err) {
    console.error("Error buscando categorias", err);
  }
}

function handleCategoriaModal() {
  const createBtn = document.getElementById("create-btn");
  const categoriaModal = new bootstrap.Modal(document.getElementById("categoriaModal"));
  createBtn.addEventListener("click", () => categoriaModal.show()); 

  const form = document.getElementById("categoria-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      nombre: document.getElementById("nombre").value,
      descripcion: document.getElementById("descripcion").value
    };
    try {
      const resp = await fetch("http://10.1.1.89:8100/categorias/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      categoriaModal.hide();
      form.reset();
      Swal.fire({
        title: "¡Éxito!",
        text: data.message,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      }).then(() => renderCategorias(currentPage));
    } catch {
      Swal.fire({
        title: "Error",
        text: "No se pudo registrar la categoria.",
        icon: "error",
      });
    }
  });
}

function editCategoria(id) {
  fetch(`http://10.1.1.89:8100/categoriaById/${id}`)
    .then((r) => {
      if (!r.ok) throw new Error();
      return r.json();
    })
    .then((c) => {
      const modal = new bootstrap.Modal(
        document.getElementById("editCategoriaModal")
      );
      document.getElementById("edit-categoria-id").value = id;
      document.getElementById("edit-nombre").value = c.nombre;
      document.getElementById("edit-descripcion").value = c.descripcion;
      modal.show();
      document.getElementById("edit-categoria-form").onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
          const resp = await fetch(`http://10.1.1.89:8100/categoriasUpdate/${id}`, {
            method: "PUT",
            body: formData,
          });
          if (!resp.ok) throw new Error();
          const data = await resp.json();
          modal.hide();
          Swal.fire({
            title: "¡Éxito!",
            text: data.message,
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          }).then(() => renderCategorias(currentPage));
        } catch {
          Swal.fire({
            title: "Error",
            text: "No se pudo actualizar la categoria.",
            icon: "error",
          });
        }
      };
    })
    .catch((err) => console.error(err));
}

function deleteCategoria(id) {
  Swal.fire({
    title: "¿Estás seguro?",
    text: "No podrás revertir esta acción.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
  }).then((result) => {
    if (result.isConfirmed) {
      fetch(`/categorias/${id}`, { method: "DELETE" })
        .then((r) => {
          if (!r.ok) throw new Error();
          Swal.fire({
            title: "Eliminado",
            text: "Categoria eliminada.",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
          renderCategorias(currentPage);
        })
        .catch(() =>
          Swal.fire({
            title: "Error",
            text: "No se pudo eliminar.",
            icon: "error",
          })
        );
    }
  });
}

async function logout() {
  const r = await fetch("/logout", { method: "POST" });
  if (r.ok) window.location.href = "/";
}


