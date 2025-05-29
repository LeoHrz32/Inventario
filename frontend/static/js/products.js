let currentPage = 1;
let totalPages = 1;
const productsPerPage = 5;

// Espera a que el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  // Inicialización paginación y búsqueda
  renderProducts(currentPage);
  document
    .getElementById("search-input")
    .addEventListener("input", searchProducts);
  document
    .getElementById("prev-page")
    .addEventListener("click", () => changePage(-1));
  document
    .getElementById("next-page")
    .addEventListener("click", () => changePage(1));

  // Modales y formularios
  handleProductModal();

  // Logout
  document.getElementById("logout-btn").addEventListener("click", logout);
});

// Función para cargar opciones de categoría en un <select>
async function loadCategoriaOptions(selectEl, selectedId = "") {
  selectEl.innerHTML = '<option value="">Cargando...</option>';
  try {
    const res = await fetch("http://10.1.1.89:8100/categorias_json");
    if (!res.ok) throw new Error("Error al obtener categorías");
    const cats = await res.json();
    selectEl.innerHTML = '<option value="">Seleccione una categoría</option>';
    cats.forEach(cat => {
      const opt = new Option(cat.nombre, cat.id);
      selectEl.add(opt);
    });
    if (selectedId) selectEl.value = selectedId;
  } catch (e) {
    console.error("Error cargando categorías", e);
    selectEl.innerHTML = '<option value="">Error al cargar</option>';
  }
}

async function fetchProducts(page = 1) {
  try {
    const resp = await fetch(
      `http://10.1.1.89:8100/products_paginated?page=${page}&per_page=${productsPerPage}`
    );
    if (!resp.ok) throw new Error("Error al obtener los datos.");
    const data = await resp.json();
    totalPages = data.total_pages;
    return data.products;
  } catch (err) {
    console.error(err);
    document.querySelector(
      "#products-table tbody"
    ).innerHTML = `<tr><td colspan="12" class="text-center text-danger">Error cargando productos</td></tr>`;
    return [];
  }
}

async function renderProducts(page) {
  const products = await fetchProducts(page);
  const tbody = document.querySelector("#products-table tbody");
  tbody.innerHTML = "";

  products.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.categoria_nombre}</td>
      <td>${p.serial}</td>
      <td>${p.nombre}</td>
      <td>${p.marca}</td>
      <td>${p.pertenencia}</td>
      <td class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-primary" onclick="editProduct(${p.id})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${p.id})">
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
    renderProducts(currentPage);
  }
}

async function searchProducts() {
  const q = document.getElementById("search-input").value.trim();
  if (!q) return renderProducts(currentPage);
  try {
    const resp = await fetch(
      `http://10.1.1.89:8100/products_search?query=${encodeURIComponent(q)}`
    );
    if (!resp.ok) throw new Error();
    const data = await resp.json();
    const tbody = document.querySelector("#products-table tbody");
    tbody.innerHTML = "";
    data.products.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.categoria_nombre}</td>
        <td>${p.serial}</td>
        <td>${p.nombre}</td>
        <td>${p.marca}</td>
        <td>${p.pertenencia}</td>
        <td class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${p.id})"><i class="fas fa-trash-alt"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    document.getElementById("page-info").textContent = "Resultados de búsqueda";
    document.getElementById("prev-page").disabled = true;
    document.getElementById("next-page").disabled = true;
  } catch (err) {
    console.error("Error buscando productos", err);
  }
}

function handleProductModal() {
  const createBtn = document.getElementById("create-btn");
  const productModal = new bootstrap.Modal(
    document.getElementById("productModal")
  );
  
  // Al abrir modal de registrar, cargar categorías antes
  createBtn.addEventListener("click", async () => {
    await loadCategoriaOptions(
      document.getElementById("categoria_id")
    );
    productModal.show();
  });

  const form = document.getElementById("product-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    try {
      const resp = await fetch("http://10.1.1.89:8100/products/", {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      productModal.hide();
      form.reset();
      Swal.fire({
        title: "¡Éxito!",
        text: data.message,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      }).then(() => renderProducts(currentPage));
    } catch {
      Swal.fire({
        title: "Error",
        text: "No se pudo registrar el producto.",
        icon: "error",
      });
    }
  });
}

function editProduct(id) {
  fetch(`http://10.1.1.89:8100/productById/${id}`)
    .then((r) => {
      if (!r.ok) throw new Error();
      return r.json();
    })
    .then(async (p) => {
      const modal = new bootstrap.Modal(
        document.getElementById("editProductModal")
      );
      document.getElementById("edit-product-id").value = id;
      document.getElementById("edit-nombre").value = p.nombre;
      document.getElementById("edit-marca").value = p.marca;
      document.getElementById("edit-serial").value = p.serial;
      document.getElementById("edit-procesador").value = p.procesador;
      document.getElementById("edit-modelo").value = p.modelo;
      document.getElementById("edit-capacidad_ram").value = p.capacidad_ram;
      document.getElementById("edit-tipo_disco").value = p.tipo_disco;
      document.getElementById("edit-capacidad_disco").value = p.capacidad_disco;
      document.getElementById("edit-sistema_operativo").value =
        p.sistema_operativo;
      document.getElementById("edit-pertenencia").value = p.pertenencia;

      // Cargar categorías y seleccionar la actual
      await loadCategoriaOptions(
        document.getElementById("edit-categoria_id"),
        p.categoria_id
      );

      modal.show();

      document.getElementById("edit-product-form").onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
          const resp = await fetch(
            `http://10.1.1.89:8100/productsUpdate/${id}`,
            {
              method: "PUT",
              body: formData,
            }
          );
          if (!resp.ok) throw new Error();
          const data = await resp.json();
          modal.hide();
          Swal.fire({
            title: "¡Éxito!",
            text: data.message,
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          }).then(() => renderProducts(currentPage));
        } catch {
          Swal.fire({
            title: "Error",
            text: "No se pudo actualizar el producto.",
            icon: "error",
          });
        }
      };
    })
    .catch((err) => console.error(err));
}

function deleteProduct(id) {
  Swal.fire({
    title: "¿Estás seguro?",
    text: "No podrás revertir esta acción.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
  }).then((result) => {
    if (result.isConfirmed) {
      fetch(`http://10.1.1.89:8100/products/${id}`, { method: "DELETE" })
        .then((r) => {
          if (!r.ok) throw new Error();
          Swal.fire({
            title: "Eliminado",
            text: "Producto eliminado.",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
          renderProducts(currentPage);
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
