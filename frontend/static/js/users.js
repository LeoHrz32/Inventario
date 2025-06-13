let currentPage = 1;
let totalPages = 1;
const categoriasPerPage = 5;

// Espera a que el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  // Inicialización paginación y búsqueda
  renderUsers(currentPage);
  document
    .getElementById("search-input")
    .addEventListener("input", searchUsers);
  document
    .getElementById("prev-page")
    .addEventListener("click", () => changePage(-1));
  document
    .getElementById("next-page")
    .addEventListener("click", () => changePage(1));

  // Modales y formularios
  handleUserModal();

  // Logout
  document.getElementById("logout-btn").addEventListener("click", logout);
});

async function fetchCategorias(page = 1) {
  try {
    const resp = await fetch(
      `http://10.1.1.89:8200/users_paginated?page=${page}&per_page=${categoriasPerPage}`
    );
    if (!resp.ok) throw new Error("Error al obtener los datos.");
    const data = await resp.json();
    totalPages = data.total_pages;
    return data.users;
  } catch (err) {
    console.error(err);
    document.querySelector(
      "#users-table tbody"
    ).innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error cargando usuarios</td></tr>`;
    return [];
  }
}

async function renderUsers(page) {
  const users = await fetchCategorias(page);
  const tbody = document.querySelector("#users-table tbody");
  tbody.innerHTML = "";

  users.forEach((u) => {
    const maskedPassword = "***********"; // Ocultar con asteriscos
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.username}</td>
      <td>${u.email}</td>
      <td>${maskedPassword}</td>
      <td class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-primary" onclick="editUser(${u.id})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${u.id})">
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
    renderUsers(currentPage);
  }
}

async function searchUsers() {
  const q = document.getElementById("search-input").value.trim();
  if (!q) return renderUsers(currentPage);
  try {
    const resp = await fetch(
      `http://10.1.1.89:8200/users_search?query=${encodeURIComponent(q)}`
    );
    if (!resp.ok) throw new Error();
    const data = await resp.json();
    const tbody = document.querySelector("#users-table tbody");
    tbody.innerHTML = "";
    data.users.forEach((u) => {
      const tr = document.createElement("tr");
      const maskedPassword = "***********"; // Ocultar con asteriscos
      tr.innerHTML = `
        <td>${u.username}</td>
        <td>${u.email}</td>
        <td>${maskedPassword}</td>
        <td class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary" onclick="editUser(${u.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${u.id})"><i class="fas fa-trash-alt"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    document.getElementById("page-info").textContent = "Resultados de búsqueda";
    document.getElementById("prev-page").disabled = true;
    document.getElementById("next-page").disabled = true;
  } catch (err) {
    console.error("Error buscando usuarios", err);
  }
}

function handleUserModal() {
  const createBtn = document.getElementById("create-btn");
  const userModal = new bootstrap.Modal(document.getElementById("userModal"));
  createBtn.addEventListener("click", () => userModal.show());

  const form = document.getElementById("user-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      str_name_user: document.getElementById("username").value,
      str_email: document.getElementById("email").value,
      str_password: document.getElementById("password").value,
    };
    try {
      const resp = await fetch("http://10.1.1.89:8200/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      userModal.hide();
      form.reset();
      Swal.fire({
        title: "¡Éxito!",
        text: data.message,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      }).then(() => renderUsers(currentPage));
    } catch {
      Swal.fire({
        title: "Error",
        text: "No se pudo registrar el usuario.",
        icon: "error",
      });
    }
  });
}

function editUser(id) {
  fetch(`http://10.1.1.89:8200/userById/${id}`)
    .then((r) => {
      if (!r.ok) throw new Error();
      return r.json();
    })
    .then((u) => {
      const modal = new bootstrap.Modal(
        document.getElementById("editUserModal")
      );
      document.getElementById("edit-user-id").value = id;
      document.getElementById("edit-username").value = u.username;
      document.getElementById("edit-email").value = u.email;
      document.getElementById("edit-password").value = u.password;
      modal.show();
      document.getElementById("edit-user-form").onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
          const resp = await fetch(`http://10.1.1.89:8200/usersUpdate/${id}`, {
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
          }).then(() => renderUsers(currentPage));
        } catch {
          Swal.fire({
            title: "Error",
            text: "No se pudo actualizar el usuario.",
            icon: "error",
          });
        }
      };
    })
    .catch((err) => console.error(err));
}

function deleteUser(id) {
  Swal.fire({
    title: "¿Estás seguro?",
    text: "No podrás revertir esta acción.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
  }).then((result) => {
    if (result.isConfirmed) {
      fetch(`/users/${id}`, { method: "DELETE" })
        .then((r) => {
          if (!r.ok) throw new Error();
          Swal.fire({
            title: "Eliminado",
            text: "Usuario eliminado.",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });
          renderUsers(currentPage);
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