<script lang="ts">
  export let showModal: boolean;
  export let closeModal: () => void;
</script>

{#if showModal}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    role="dialog"
    aria-modal="true"
    on:click|self={closeModal}
    on:keydown={e => e.key === 'Escape' && closeModal()}
    tabindex="-1"
  >
    <div 
      class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
      role="document"
    >
      <slot />
    </div>
  </div>
{/if} 