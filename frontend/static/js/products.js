let currentPage = 1;
let totalPages = 1;
const productsPerPage = 5;

document.addEventListener("DOMContentLoaded", () => {
  renderProducts(currentPage);

  const searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.addEventListener("input", searchProducts);

  document
    .getElementById("prev-page")
    ?.addEventListener("click", () => changePage(-1));
  document
    .getElementById("next-page")
    ?.addEventListener("click", () => changePage(1));

  handleProductModal();
  handleEditModal(); // veremos abajo

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);
});

// ─── 1) Cargar categorías en el <select id="categoria_id"> de CREAR ──────────────────────
async function loadCategoriaOptions(selectEl) {
  if (!selectEl || selectEl.tagName !== "SELECT") {
    console.warn("loadCategoriaOptions: selectEl no es un <select> válido");
    return;
  }
  selectEl.innerHTML = '<option value="">Cargando...</option>';
  try {
    const res = await fetch("http://10.1.1.89:8200/categorias_json");
    if (!res.ok) throw new Error("Error al obtener categorías");
    const cats = await res.json();

    selectEl.innerHTML = '<option value="">Seleccione una categoría</option>';
    // OJO: cat.id debe ser 1,2,3,4,5 para que coincida con camposPorCategoria
    cats.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat.id; // ej. 1, 2, 3…
      opt.textContent = cat.nombre;
      selectEl.appendChild(opt);
    });
  } catch (e) {
    console.error("Error cargando categorías", e);
    selectEl.innerHTML = '<option value="">Error al cargar</option>';
  }
}

// ─── 2) Filtrado de páginas, búsqueda y renderizado iguales ─────────────────────────────────
async function fetchProducts(page = 1) {
  try {
    const resp = await fetch(
      `http://10.1.1.89:8200/products_paginated?page=${page}&per_page=${productsPerPage}`
    );
    if (!resp.ok) throw new Error("Error al obtener los datos.");
    const data = await resp.json();
    totalPages = data.total_pages;
    return data.products;
  } catch (err) {
    console.error(err);
    const tbody = document.querySelector("#products-table tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="12" class="text-center text-danger">Error cargando productos</td></tr>`;
    }
    return [];
  }
}

async function renderProducts(page) {
  const products = await fetchProducts(page);
  const tbody = document.querySelector("#products-table tbody");
  if (!tbody) return;
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

  const pageInfo = document.getElementById("page-info");
  if (pageInfo) pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
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
      `http://10.1.1.89:8200/products_search?query=${encodeURIComponent(q)}`
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

// ─── 3) Modal de CREAR PRODUCTO ─────────────────────────────────────────────────────────────
function handleProductModal() {
  const createBtn = document.getElementById("create-btn");
  if (!createBtn) {
    console.warn("No se encontró el botón 'create-btn'");
    return;
  }

  const productModalEl = document.getElementById("productModal");
  const productModal = new bootstrap.Modal(productModalEl);

  createBtn.addEventListener("click", async () => {
    const categoriaSelect = document.getElementById("categoria_id");
    if (!categoriaSelect) {
      console.warn("No se encontró el select 'categoria_id'");
      return;
    }
    // 3.1 Cargar las categorías antes de mostrar el modal
    await loadCategoriaOptions(categoriaSelect);

    categoriaSelect.value = "";
    hideAllDynamicFields("create");

    // 3.2 Cuando cambie la categoría, muestro los campos que correspondan
    categoriaSelect.addEventListener("change", () =>
      handleCategoriaChange(categoriaSelect, "create")
    );
    productModal.show();
  });

  // 3.3 Al enviar el formulario “Crear”
  const formCreate = document.getElementById("product-form");
  formCreate.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 3.3.1 Forzar “N/A” solo en los que no sean numéricos
    const dynamicFields = formCreate.querySelectorAll("[data-dynamic]");
    const numericFields = [
      "pulgadas",
      "capacidad_ram",
      "capacidad_disco",
      "tonner_referencia",
    ];
    dynamicFields.forEach((field) => {
      const isVisible = field.offsetParent !== null;
      const name = field.getAttribute("name");
      if (!isVisible || field.value === "") {
        if (numericFields.includes(name)) {
          field.value = ""; // dejar vacío → backend recibe null si el modelo lo permite
        } else {
          field.value = "N/A";
        }
      }
    });

    const formData = new FormData(formCreate);
    try {
      const resp = await fetch("http://10.1.1.89:8200/products/", {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      productModal.hide();
      formCreate.reset();
      hideAllDynamicFields("create");
      Swal.fire({
        title: "¡Éxito!",
        text: data.message || "Producto registrado correctamente.",
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

// ─── 4) Modal de EDITAR PRODUCTO ────────────────────────────────────────────────────────────
function handleEditModal() {
  // No hay botón “editar” fijo; se lanza desde renderProducts → editProduct(id)
  // Aquí no cargamos categorías: solo mostramos el modal cuando editProduct() lo invoque.
}

// Esta función la llama el botón de cada fila: onclick="editProduct(123)"
async function editProduct(id) {
  try {
    const resp = await fetch(`http://10.1.1.89:8200/productById/${id}`);
    if (!resp.ok) throw new Error("No se pudo obtener el producto");
    const producto = await resp.json();

    // 4.1 Asigno al campo oculto y al readonly de categoría
    document.getElementById("edit-categoria_id").value = producto.categoria_id;
    document.getElementById("edit-categoria_nombre").value =
      producto.categoria_nombre;

    // 4.2 Muestro/oculto los campos según esa categoría
    handleCategoriaChangeSimulado(producto.categoria_id, "edit");

    // 4.3 Rellenar todos los inputs/selects visibles
    for (const [key, value] of Object.entries(producto)) {
      // Ejemplo: si key === "marca", hago #edit-marca.value = value
      const input = document.querySelector(
        `#edit-product-form [name="${key}"]`
      );
      if (input) input.value = value;
    }

    // 4.4 Muestro el modal de edición
    const editModalEl = document.getElementById("editProductModal");
    const editModal = new bootstrap.Modal(editModalEl);
    editModal.show();

    // 4.5 Preparo el submit de actualización (solo se ata una vez)
    const editForm = document.getElementById("edit-product-form");
    editForm.onsubmit = async (e) => {
      e.preventDefault();

      // 4.5.1 Forzar “N/A” o "" en edición
      const dynamicFields = editForm.querySelectorAll("[data-dynamic]");
      const numericFields = [
        "pulgadas",
        "capacidad_ram",
        "capacidad_disco",
        "tonner_referencia",
      ];
      dynamicFields.forEach((field) => {
        const isVisible = field.offsetParent !== null;
        const name = field.getAttribute("name");
        if (!isVisible || field.value === "") {
          if (numericFields.includes(name)) {
            field.value = "";
          } else {
            field.value = "N/A";
          }
        }
      });

      const formData = new FormData(editForm);
      try {
        const updateResp = await fetch(
          `http://10.1.1.89:8200/productsUpdate/${id}`,
          {
            method: "PUT",
            body: formData,
          }
        );
        if (!updateResp.ok) throw new Error();
        const data = await updateResp.json();

        editModal.hide();
        Swal.fire({
          title: "¡Actualizado!",
          text: data.message || "Producto actualizado correctamente.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        }).then(() => renderProducts(currentPage));
      } catch (err) {
        Swal.fire("Error", "No se pudo actualizar el producto.", "error");
      }
    };
  } catch (error) {
    console.error("Error al cargar el producto", error);
    Swal.fire("Error", "No se pudo cargar el producto para editar", "error");
  }
}

// ─── 5) Mostrar/ocultar campos dinámicos DENTRO de CREAR ─────────────────────────────────
function handleCategoriaChange(selectEl, formType = "create") {
  const categoriaId = selectEl.value; // “1”, “2”, “3”, …
  const camposPorCategoria = {
    1: [
      "nombre",
      "marca",
      "serial",
      "procesador",
      "capacidad_disco",
      "tipo_disco",
      "capacidad_ram",
      "sistema_operativo",
      "pertenencia",
      "modelo",
    ], // PORTÁTILES
    2: [
      "nombre",
      "marca",
      "serial",
      "procesador",
      "capacidad_disco",
      "tipo_disco",
      "capacidad_ram",
      "sistema_operativo",
      "pertenencia",
      "modelo",
    ], // TODO EN UNO
    3: ["nombre", "marca", "pulgadas", "serial", "pertenencia"], // MONITORES
    4: ["serial", "marca", "pulgadas", "tipo_tv", "pertenencia"], // TELEVISORES
    5: [
      "nombre",
      "marca",
      "serial",
      "tonner_referencia",
      "modelo",
      "Multifuncional",
      "tipo_impresion",
      "pertenencia",
    ], // IMPRESORAS
  };

  const todosLosCampos = [
    "nombre",
    "marca",
    "serial",
    "procesador",
    "capacidad_disco",
    "tipo_disco",
    "capacidad_ram",
    "sistema_operativo",
    "pertenencia",
    "modelo",
    "pulgadas",
    "tipo_tv",
    "tonner_referencia",
    "Multifuncional",
    "tipo_impresion",
  ];

  // Oculte todo primero
  todosLosCampos.forEach((campo) => {
    const div = document.getElementById(`${formType}-${campo}-group`);
    if (div) div.classList.add("d-none");
  });

  // Luego muestro solo los que correspondan a esa categoría
  const camposVisibles = camposPorCategoria[categoriaId] || [];
  camposVisibles.forEach((campo) => {
    const div = document.getElementById(`${formType}-${campo}-group`);
    if (div) div.classList.remove("d-none");
  });
}

// ─── 6) Mostrar/ocultar campos dinámicos DENTRO de EDITAR ─────────────────────────────────
function handleCategoriaChangeSimulado(categoriaId, formType = "edit") {
  const camposPorCategoria = {
    1: [
      "nombre",
      "marca",
      "serial",
      "procesador",
      "capacidad_disco",
      "tipo_disco",
      "capacidad_ram",
      "sistema_operativo",
      "pertenencia",
      "modelo",
    ], // PORTÁTILES
    2: [
      "nombre",
      "marca",
      "serial",
      "procesador",
      "capacidad_disco",
      "tipo_disco",
      "capacidad_ram",
      "sistema_operativo",
      "pertenencia",
      "modelo",
    ], // TODO EN UNO
    3: ["nombre", "marca", "pulgadas", "serial", "pertenencia"], // MONITORES
    4: ["serial", "marca", "pulgadas", "tipo_tv", "pertenencia"], // TELEVISORES
    5: [
      "nombre",
      "marca",
      "serial",
      "tonner_referencia",
      "modelo",
      "Multifuncional",
      "tipo_impresion",
      "pertenencia",
    ], // IMPRESORAS
  };

  const todosLosCampos = [
    "nombre",
    "marca",
    "serial",
    "procesador",
    "capacidad_disco",
    "tipo_disco",
    "capacidad_ram",
    "sistema_operativo",
    "pertenencia",
    "modelo",
    "pulgadas",
    "tipo_tv",
    "tonner_referencia",
    "Multifuncional",
    "tipo_impresion",
  ];

  // Oculte todo primero
  todosLosCampos.forEach((campo) => {
    const div = document.getElementById(`${formType}-${campo}-group`);
    if (div) div.classList.add("d-none");
  });

  // Luego muestro solo los correspondientes
  const camposVisibles = camposPorCategoria[categoriaId] || [];
  camposVisibles.forEach((campo) => {
    const div = document.getElementById(`${formType}-${campo}-group`);
    if (div) div.classList.remove("d-none");
  });
}

// ─── 7) Ocultar “create” fields al abrir modal ─────────────────────────────────────────────
function hideAllDynamicFields(formType = "create") {
  const todosLosCampos = [
    "nombre",
    "marca",
    "serial",
    "procesador",
    "capacidad_disco",
    "tipo_disco",
    "capacidad_ram",
    "sistema_operativo",
    "pertenencia",
    "modelo",
    "pulgadas",
    "tipo_tv",
    "tonner_referencia",
    "Multifuncional",
    "tipo_impresion",
  ];
  todosLosCampos.forEach((campo) => {
    const campoDiv = document.getElementById(`${formType}-${campo}-group`);
    if (campoDiv) campoDiv.classList.add("d-none");
  });
}

// ─── 8) Eliminar Producto ─────────────────────────────────────────────────────────────────
function deleteProduct(id) {
  Swal.fire({
    title: "¿Está seguro?",
    text: "Esta acción no se puede revertir",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const resp = await fetch(`http://10.1.1.89:8200/products/${id}`, {
          method: "DELETE",
        });
        if (!resp.ok) throw new Error();
        Swal.fire("Eliminado", "Producto eliminado correctamente.", "success");
        renderProducts(currentPage);
      } catch {
        Swal.fire("Error", "No se pudo eliminar el producto.", "error");
      }
    }
  });
}

function toggleFieldsByCategory(category) {
  // Ocultar todos los campos dinámicos y quitar "required"
  const allFields = document.querySelectorAll(".campo-dinamico");
  allFields.forEach((field) => {
    field.closest(".form-group").style.display = "none";
    field.removeAttribute("required");
  });

  // Mostrar y requerir solo los campos de la categoría seleccionada
  const visibleFields = document.querySelectorAll(`.campo-${category}`);
  visibleFields.forEach((field) => {
    field.closest(".form-group").style.display = "block";
    field.setAttribute("required", "required");
  });
}

// ─── 9) Cerrar Sesión ─────────────────────────────────────────────────────────────────────
async function logout() {
  const r = await fetch("/logout", { method: "POST" });
  if (r.ok) window.location.href = "/";
}
