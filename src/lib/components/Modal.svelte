<script lang="ts">
  export let showModal: boolean;
  export let closeModal: () => void;

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }
</script>

{#if showModal}
  <section
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <button
      class="absolute inset-0 w-full h-full cursor-default"
      on:click={handleBackdropClick}
      on:keydown={handleKeydown}
      aria-label="Close modal"
    ></button>
    <div 
      class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative z-10"
      role="document"
    >
      <slot />
    </div>
  </section>
{/if} 