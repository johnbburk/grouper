<script lang="ts">
  export let showModal: boolean;
  export let title: string;

  function closeModal() {
    showModal = false;
  }
</script>

{#if showModal}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    on:click|self={closeModal}
  >
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">{title}</h2>
        <button
          class="text-gray-500 hover:text-gray-700"
          on:click={closeModal}
        >
          ✕
        </button>
      </div>
      <slot />
    </div>
  </div>
{/if} 