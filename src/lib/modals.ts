// Conteúdo para: src/lib/modals.ts

// Exportamos cada função para que possam ser importadas em outras partes da aplicação.

export function showAlertModal(title: string, message: string) {
    const modalContainer = document.getElementById("alert-modal");
    if (!modalContainer) return;
    modalContainer.innerHTML = `
        <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div class="mt-3 text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <i class="fa-solid fa-circle-exclamation text-xl text-red-600"></i>
                </div>
                <h3 class="text-lg leading-6 font-medium text-gray-900 mt-2">${title}</h3>
                <div class="mt-2 px-7 py-3"><p class="text-sm text-gray-500">${message}</p></div>
                <div class="items-center px-4 py-3">
                    <button id="modal-close-alert-btn" class="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-600">Fechar</button>
                </div>
            </div>
        </div>`;
    modalContainer.classList.remove("hidden");
    modalContainer.querySelector("#modal-close-alert-btn")?.addEventListener('click', () => modalContainer.classList.add("hidden"));
}

export function showConfirmationModal(question: string, onConfirm: () => void) {
    const modalContainer = document.getElementById("confirmation-modal");
    if (!modalContainer) return;
    modalContainer.innerHTML = `
        <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div class="mt-3 text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                    <i class="fa-solid fa-triangle-exclamation text-xl text-yellow-600"></i>
                </div>
                <h3 class="text-lg leading-6 font-medium text-gray-900 mt-2">Confirmação</h3>
                <div class="mt-2 px-7 py-3"><p class="text-sm text-gray-500">${question}</p></div>
                <div class="flex justify-center px-4 py-3 gap-4">
                    <button id="modal-confirm-btn" class="px-6 py-2 bg-red-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-600">Confirmar</button>
                    <button id="modal-cancel-btn" class="px-6 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-300">Cancelar</button>
                </div>
            </div>
        </div>`;
    modalContainer.classList.remove("hidden");

    const closeModal = () => modalContainer.classList.add("hidden");

    modalContainer.querySelector("#modal-cancel-btn")?.addEventListener('click', closeModal);
    modalContainer.querySelector("#modal-confirm-btn")?.addEventListener('click', () => {
        closeModal();
        onConfirm();
    });
}
