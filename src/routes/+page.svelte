<script lang="ts">
  import type { PageData } from './$types';
  import Modal from '$lib/components/Modal.svelte';
  import AddClassForm from '$lib/components/AddClassForm.svelte';
  
  export let data: PageData;
  
  let showAddClassModal = false;
  let clearing = false;
  
  function openAddClassModal() {
    showAddClassModal = true;
  }
  
  function closeAddClassModal() {
    showAddClassModal = false;
  }

  async function handleClearDatabase() {
    if (!confirm('WARNING: This will permanently delete all classes, groups, and students. Are you sure?')) {
      return;
    }

    clearing = true;
    try {
      const response = await fetch('/api/admin/clear-database', {
        method: 'POST'
      });

      if (response.ok) {
        // Refresh the page to show empty state
        window.location.reload();
      } else {
        alert('Failed to clear database. Please try again.');
      }
    } catch (error) {
      console.error('Error clearing database:', error);
      alert('An error occurred while clearing the database.');
    } finally {
      clearing = false;
    }
  }
</script>

<div class="container mx-auto px-4 pb-4">
  <h1 class="text-2xl font-bold mb-4">My Classes</h1>
  
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
    {#each data.classes as class_}
      <div class="border rounded-lg hover:shadow-lg transition-shadow p-4">
        <h2 class="text-xl font-semibold mb-3">{class_.name}</h2>
        <div class="flex gap-2">
          <a 
            href="/class/{class_.id}/roster" 
            class="flex-1 text-center px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Roster
          </a>
          <a 
            href="/class/{class_.id}/groups" 
            class="flex-1 text-center px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Groups
          </a>
        </div>
      </div>
    {/each}
    
    <button
      class="p-4 border rounded-lg border-dashed hover:border-solid hover:bg-gray-50"
      on:click={openAddClassModal}
    >
      + Add New Class
    </button>
  </div>

  <!-- Admin Section -->
  <div class="border-t pt-8">
    <h2 class="text-xl font-bold mb-4 text-red-600">Admin</h2>
    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 class="font-medium text-red-800 mb-2">Danger Zone</h3>
      <p class="text-sm text-red-600 mb-4">
        These actions are irreversible. Please be careful.
      </p>
      <button
        class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        on:click={handleClearDatabase}
        disabled={clearing}
      >
        {#if clearing}
          <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
        {/if}
        {clearing ? 'Clearing Database...' : 'Clear Database'}
      </button>
    </div>
  </div>
</div>

<Modal
  showModal={showAddClassModal}
  title="Add New Class"
>
  <AddClassForm closeModal={closeAddClassModal} />
</Modal>
